'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { SocketClient } from '@/app/lib/websocket';
import { Participant } from '@/app/lib/types';
import { Leaderboard, type LeaderboardEntry } from '@/app/components/leaderboard';
import { RoomLobby } from '@/app/components/room-lobby';
import { GameCountdown } from '@/app/components/game-countdown';
import { GameQuestion } from '@/app/components/game-question';
import { GameTimer } from '@/app/components/game-timer';
import { WaitingState } from '@/app/components/waiting-state';
import { Loading } from '@/app/components/loading';
import { ErrorDisplay } from '@/app/components/error-display';
import { SessionLostModal } from '@/app/components/session-lost-modal';
import dynamic from 'next/dynamic';
import { apiClient } from '@/app/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { useUser, useAuth } from '@clerk/nextjs';

const RoundResults = dynamic(() => import('@/app/components/round-results'), { ssr: false });

type ConnectionStatusType = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type ServerMessage =
  | { type: 'ROOM_STATE'; payload: RoomState }
  | { type: 'PLAYER_JOINED'; payload: { participant: Participant } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string; playerName: string } }
  | { type: 'PLAYER_READY'; payload: { playerId: string; isReady: boolean } }
  | { type: 'GAME_START'; payload: { question: { id: string; text: string }; startTime: number; duration: number } }
  | { type: 'ANSWER_SUBMITTED'; payload: { answerText: string; timestamp: number } }
  | { type: 'ANSWER_COUNT_UPDATE'; payload: { answeredCount: number; totalCount: number } }
  | { type: 'ROUND_END'; payload: RoundEndPayload }
  | { type: 'ERROR'; payload: { code: string; message: string } };

interface ResultEntry {
  participantId: string;
  participantName: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
  scoreChange?: number;
  newScore?: number;
}

interface RoundEndPayload {
  correctAnswer: string;
  acceptedAnswers: string[];
  winnerId: string | null;
  winnerName?: string | null;
  winnerScore?: number | null;
  results: ResultEntry[];
  leaderboard?: LeaderboardEntry[];
  commentary?: string;
}

interface CurrentRound {
  startTime: number;
  duration: number;
  answeredCount: number;
}

interface RoomState {
  roomCode: string;
  gameState: 'lobby' | 'active' | 'results';
  participants: Participant[];
  currentQuestion: { id: string; text: string } | null;
  currentRound: CurrentRound | null;
  leaderboard?: LeaderboardEntry[];
  groupId: string;
  groupName: string;
  selectedCategory?: string | null;
  feedbackMode?: 'supportive' | 'neutral' | 'roast';
  lastRoundResults?: RoundEndPayload | null;
}

export default function GroupRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isSignedIn, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();
  const groupId = (params.groupId as string);
  const roomCode = (params.code as string).toUpperCase();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('connecting');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [roundResults, setRoundResults] = useState<RoundEndPayload | null>(null);
  const [sessionLost, setSessionLost] = useState(false);

  const wsRef = useRef<import('@/app/lib/websocket').SocketClient | null>(null);
  const userInfoRef = useRef<{ userId: string; userName: string } | null>(null);
  const connectFnRef = useRef<(() => void) | null>(null);

  // Handler to return home when session is lost
  const handleReturnHome = useCallback(() => {
    router.push('/room');
  }, [router]);

  // Set page title
  useEffect(() => {
    document.title = `Group Room ${roomCode} | Trivia Room`;
  }, [roomCode]);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'ROOM_STATE':
        console.log('[GroupRoom] Received ROOM_STATE', {
          roomCode: message.payload.roomCode,
          gameState: message.payload.gameState,
          participantCount: message.payload.participants.length,
          participants: message.payload.participants.map(p => ({ id: p.id, userId: p.userId, name: p.name }))
        });
        setRoom(message.payload);
        // Hydrate roundResults from lastRoundResults when joining during results phase
        if (message.payload.gameState === 'results' && !roundResults && message.payload.lastRoundResults) {
          setRoundResults(message.payload.lastRoundResults);
        }
        // For group rooms, find participant by userId match
        if (userInfoRef.current && message.payload.participants) {
          const participant = message.payload.participants.find(
            (p) => p.userId === userInfoRef.current?.userId
          );
          if (participant) {
            console.log('[GroupRoom] Setting playerId from ROOM_STATE', {
              participantId: participant.id,
              userId: userInfoRef.current.userId,
              participantName: participant.name
            });
            setPlayerId(participant.id);
          } else {
            console.warn('[GroupRoom] Could not find participant in ROOM_STATE', {
              userId: userInfoRef.current.userId,
              participants: message.payload.participants.map(p => ({ id: p.id, userId: p.userId, name: p.name }))
            });
          }
        }
        break;

      case 'PLAYER_JOINED':
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          return {
            ...prevRoom,
            participants: [...prevRoom.participants, message.payload.participant],
          };
        });
        break;

      case 'PLAYER_LEFT':
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          return {
            ...prevRoom,
            participants: prevRoom.participants.filter(
              (p) => p.id !== message.payload.playerId
            ),
          };
        });
        break;

      case 'PLAYER_READY':
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          const updatedParticipants = prevRoom.participants.map((p) =>
            p.id === message.payload.playerId
              ? { ...p, isReady: message.payload.isReady }
              : p
          );

          // Check if all players are ready and trigger countdown
          const allReady = updatedParticipants.every((p) => p.isReady);
          const enoughPlayers = updatedParticipants.length >= 2;

          if (allReady && enoughPlayers && message.payload.isReady) {
            setShowCountdown(true);
          } else {
            setShowCountdown(false);
          }

          return {
            ...prevRoom,
            participants: updatedParticipants,
          };
        });
        break;

      case 'GAME_START':
        setShowCountdown(false);
        setHasAnswered(false);
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          return {
            ...prevRoom,
            gameState: 'active',
            currentQuestion: message.payload.question,
            currentRound: {
              startTime: message.payload.startTime,
              duration: message.payload.duration,
              answeredCount: 0,
            },
          };
        });
        break;

      case 'ANSWER_SUBMITTED':
        setHasAnswered(true);
        break;

      case 'ANSWER_COUNT_UPDATE':
        setRoom((prevRoom) => {
          if (!prevRoom || !prevRoom.currentRound) return prevRoom;
          return {
            ...prevRoom,
            currentRound: {
              ...prevRoom.currentRound,
              answeredCount: message.payload.answeredCount,
            },
          };
        });
        break;

      case 'ROUND_END':
        setRoundResults(message.payload);
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          return {
            ...prevRoom,
            gameState: 'results',
          };
        });
        break;

      case 'ERROR':
        console.error('Server error:', message.payload);
        setRuntimeError(message.payload.message);
        break;
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!userInfoRef.current || !isSignedIn || !user) return;

    const { userId, userName } = userInfoRef.current;
    try {
      // Get auth token for group rooms
      const token = await getToken();
      const authOptions = { auth: { token } };

      const client = new SocketClient({ options: authOptions });
      wsRef.current = client;

      client.on('ROOM_STATE', (payload: unknown) => handleMessage({ type: 'ROOM_STATE', payload } as ServerMessage));
      client.on('PLAYER_JOINED', (payload: unknown) => handleMessage({ type: 'PLAYER_JOINED', payload } as ServerMessage));
      client.on('PLAYER_LEFT', (payload: unknown) => handleMessage({ type: 'PLAYER_LEFT', payload } as ServerMessage));
      client.on('PLAYER_READY', (payload: unknown) => handleMessage({ type: 'PLAYER_READY', payload } as ServerMessage));
      client.on('GAME_START', (payload: unknown) => handleMessage({ type: 'GAME_START', payload } as ServerMessage));
      client.on('ANSWER_SUBMITTED', (payload: unknown) => handleMessage({ type: 'ANSWER_SUBMITTED', payload } as ServerMessage));
      client.on('ANSWER_COUNT_UPDATE', (payload: unknown) => handleMessage({ type: 'ANSWER_COUNT_UPDATE', payload } as ServerMessage));
      client.on('ROUND_END', (payload: unknown) => handleMessage({ type: 'ROUND_END', payload } as ServerMessage));
      client.on('ERROR', (payload: unknown) => handleMessage({ type: 'ERROR', payload } as ServerMessage));

      client.on('disconnect', () => {
        console.log('[GroupRoom] Socket disconnected');
        setConnectionStatus('reconnecting');
      });

      client.on('reconnect_attempt', (payload: unknown) => {
        const attempt = (payload as { attempt: number })?.attempt || 0;
        console.log('[GroupRoom] Reconnect attempt', attempt);
        setReconnectAttempts(attempt);
      });

      client.on('reconnect_failed', () => {
        console.error('[GroupRoom] Reconnection failed permanently');
        setConnectionStatus('disconnected');
        setSessionLost(true);
      });

      client.on('connection_error', () => {
        console.error('[GroupRoom] Connection error');
        setConnectionStatus('reconnecting');
      });

      client.connect().then(() => {
        console.log('[GroupRoom] WebSocket connected, sending JOIN', { userId, userName, roomCode });
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        // Get preferredRole from localStorage (set by join dialog)
        const preferredRole = localStorage.getItem(`room_${roomCode}_preferredRole`) as 'active' | 'spectator' | null;
        client.send('JOIN', { userId, playerId: userId, playerName: userName, roomCode, preferredRole: preferredRole || undefined });
        // Clean up localStorage after use
        if (preferredRole) {
          localStorage.removeItem(`room_${roomCode}_preferredRole`);
        }
      }).catch((err: unknown) => {
        console.error('Socket.IO connect error:', err);
        setConnectionStatus('disconnected');
      });

    } catch (err) {
      console.error('Failed to create Socket.IO client:', err);
      setRuntimeError('Failed to connect to room');
      setConnectionStatus('disconnected');
    }
  }, [roomCode, handleMessage, getToken, isSignedIn, user]);

  // Store connectWebSocket in ref for use in callbacks
  useEffect(() => {
    connectFnRef.current = connectWebSocket;
  }, [connectWebSocket]);

  const handleReadyToggle = useCallback(() => {
    console.log('[GroupRoom] handleReadyToggle called', {
      hasWsRef: !!wsRef.current,
      hasRoom: !!room,
      playerId,
      roomParticipants: room?.participants.length
    });

    if (!wsRef.current || !room) {
      console.log('[GroupRoom] Early return: missing wsRef or room');
      return;
    }

    const currentUser = room.participants.find((p) => p.id === playerId);
    if (!currentUser) {
      console.log('[GroupRoom] Early return: currentUser not found', { playerId, participants: room.participants.map(p => p.id) });
      return;
    }

    console.log('[GroupRoom] Ready button clicked', {
      playerId,
      currentReady: currentUser.isReady,
      newReady: !currentUser.isReady,
      isConnected: wsRef.current.isConnected()
    });

    wsRef.current.send('READY', { isReady: !currentUser.isReady });
  }, [room, playerId]);

  const handleSubmitAnswer = useCallback((answer: string) => {
    if (!wsRef.current) return;

    wsRef.current.send('ANSWER', { answerText: answer });
  }, []);

  const handleReadyForNextRound = useCallback(() => {
    if (!wsRef.current || !room) return;
    wsRef.current.send('READY', { isReady: true });
  }, [room]);

  const handleJoinAsParticipant = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.send('CHANGE_ROLE_PREFERENCE', { preferredRole: 'active' });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.send('LEAVE', {});
    wsRef.current.disconnect();
    router.push('/room');
  }, [router]);

  // Validate room and check group membership
  const { data: validation, isLoading: isValidating, error: validationError } = useQuery({
    queryKey: ['group-room-validate', roomCode, groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/room/${roomCode}/validate`);
      return response.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Check group membership
  const { data: groupMembership, isLoading: isCheckingMembership } = useQuery({
    queryKey: ['group-membership', groupId],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient.get(`/groups/${groupId}/membership`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    },
    enabled: !!groupId && isSignedIn,
    retry: false,
  });

  // Determine error state and connection readiness
  const { errorMessage, canConnect } = useMemo(() => {
    if (!isUserLoaded) return { errorMessage: null, canConnect: false };

    if (!isSignedIn || !user) {
      return { errorMessage: 'Authentication required for group rooms', canConnect: false };
    }

    if (groupMembership && !groupMembership.data?.isMember) {
      return { errorMessage: 'You are not a member of this group', canConnect: false };
    }

    if (validationError) {
      return { errorMessage: 'Unable to connect to room. Please try again.', canConnect: false };
    }

    if (validation && !validation.exists) {
      return { errorMessage: 'Room not found. Please check the room code.', canConnect: false };
    }

    // If room is active, allow joining as spectator (do not block)
    if (validation && !validation.canJoin && validation.gameState !== 'active') {
      return { errorMessage: 'Unable to join room. It may be full or unavailable.', canConnect: false };
    }

    if (validation && validation.groupId !== groupId) {
      return { errorMessage: 'This room does not belong to the specified group', canConnect: false };
    }

    const canJoinNow = !!validation && (validation.canJoin || validation.gameState === 'active');
    const ready = isSignedIn && user && groupMembership?.data?.isMember && validation?.exists && canJoinNow && validation?.groupId === groupId;
    return { errorMessage: null, canConnect: ready };
  }, [isUserLoaded, isSignedIn, user, groupMembership, validation, validationError, groupId]);

  // Set up user info when ready to connect
  useEffect(() => {
    if (canConnect && !userInfoRef.current) {
      const playerName = user!.fullName || user!.firstName || user!.username || user!.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Anonymous';
      userInfoRef.current = { userId: user!.id, userName: playerName };
    }
  }, [canConnect, user]);

  // Connect websocket when user info is ready
  useEffect(() => {
    if (userInfoRef.current && !wsRef.current && canConnect && !errorMessage && connectFnRef.current) {
      // Use a timeout to avoid calling during render
      const timer = setTimeout(() => {
        connectFnRef.current!();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [canConnect, errorMessage]);

  if (errorMessage || runtimeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {sessionLost && <SessionLostModal onGoHome={handleReturnHome} />}
        <div className="w-full max-w-md mx-auto">
          <ErrorDisplay message={errorMessage || runtimeError!} onRetry={() => router.push('/room')} />
        </div>
      </div>
    );
  }

  // Show loading while validating
  if (!isUserLoaded || isValidating || isCheckingMembership || connectionStatus === 'connecting' || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loading message="Connecting to group room..." />
      </div>
    );
  }

  const currentUser = room?.participants.find((p) => p.id === playerId) || null;

  return (
    <div className="min-h-screen bg-background p-4">
      {sessionLost && <SessionLostModal onGoHome={handleReturnHome} />}
      <div className="max-w-4xl mx-auto">
        {/* Connection Status Indicator */}
        <div className="mb-4 flex items-center justify-center">
          {connectionStatus === 'connected' && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              Connected to {room.groupName}
            </div>
          )}
          {connectionStatus === 'reconnecting' && (
            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></span>
              Reconnecting...{reconnectAttempts > 0 && ` (Attempt ${reconnectAttempts})`}
            </div>
          )}
          {connectionStatus === 'disconnected' && (
            <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Disconnected
            </div>
          )}
        </div>

        {showCountdown ? (
          <GameCountdown onComplete={() => setShowCountdown(false)} />
        ) : (
          <>
            {room.gameState === 'lobby' && (
              <div className="space-y-6">
                <RoomLobby
                  roomCode={roomCode}
                  participants={room.participants}
                  currentUserId={playerId}
                  onReadyToggle={handleReadyToggle}
                  onLeaveRoom={handleLeaveRoom}
                  groupId={room.groupId}
                  groupName={room.groupName}
                />
                {room.leaderboard && room.leaderboard.length > 0 && (
                  <Leaderboard title="Group Leaderboard" leaderboard={room.leaderboard} />
                )}
              </div>
            )}

            {room.gameState === 'active' && room.currentQuestion && room.currentRound && (
              <div className="space-y-6">
                <GameTimer
                  startTime={room.currentRound.startTime}
                  duration={room.currentRound.duration}
                />

                {hasAnswered ? (
                  <WaitingState
                    answeredCount={room.currentRound.answeredCount}
                    totalCount={room.participants.filter(p => p.role === 'active').length}
                  />
                ) : currentUser?.role === 'spectator' ? (
                  <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-center text-gray-700 dark:text-gray-300">
                      <h3 className="text-lg font-semibold">You are spectating</h3>
                      <p className="mt-2">Watching the game — spectators cannot submit answers. You can request to participate in the next round.</p>
                    </div>
                  </div>
                ) : (
                  <GameQuestion
                    questionText={room.currentQuestion.text}
                    onSubmitAnswer={handleSubmitAnswer}
                    disabled={hasAnswered || !currentUser || currentUser.connectionStatus !== 'connected'}
                    category={room.selectedCategory}
                    feedbackMode={room.feedbackMode}
                  />
                )}
              </div>
            )}

            {room.gameState === 'results' && roundResults && (
              <div className="space-y-6 p-4">
                <div className="text-center">
                    <RoundResults
                      correctAnswer={roundResults.correctAnswer}
                      acceptedAnswers={roundResults.acceptedAnswers}
                      winnerId={roundResults.winnerId}
                      results={roundResults.results}
                      currentUserId={playerId}
                      participants={room.participants}
                      onReadyForNextRound={currentUser?.role === 'active' ? handleReadyForNextRound : undefined}
                      onJoinAsParticipant={currentUser?.role === 'spectator' ? handleJoinAsParticipant : undefined}
                      currentUserRole={currentUser?.role}
                      leaderboard={roundResults.leaderboard || room.leaderboard}
                      groupId={room.groupId}
                      commentary={roundResults.commentary}
                    />
                </div>
                {(roundResults.leaderboard || room.leaderboard) && (
                  <Leaderboard
                    title="Updated Group Leaderboard"
                    leaderboard={(roundResults.leaderboard || room.leaderboard)!}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}