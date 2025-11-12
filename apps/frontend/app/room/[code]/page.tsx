'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SocketClient } from '@/app/lib/websocket';
import { Participant, ConnectionStatus } from '@/app/lib/types';
import { Leaderboard, type LeaderboardEntry } from '@/app/components/leaderboard';
import { RoomLobby } from '@/app/components/room-lobby';
import { JoinRoomForm } from '@/app/components/join-room-form';
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

const RoundResults = dynamic(() => import('@/app/components/round-results'), { ssr: false });

type ConnectionStatusType = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type ServerMessage =
  | { type: 'ROOM_STATE'; payload: RoomState }
  | { type: 'PLAYER_JOINED'; payload: { participant: Participant } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string; playerName: string } }
  | { type: 'PARTICIPANT_LEFT'; payload: { playerId: string; playerName?: string; connectionStatus: ConnectionStatus | 'left' } }
  | { type: 'PLAYER_READY'; payload: { playerId: string; isReady: boolean } }
  | { type: 'GAME_START'; payload: { question: { id: string; text: string }; startTime: number; duration: number } }
  | { type: 'ANSWER_SUBMITTED'; payload: { answerText: string; timestamp: number } }
  | { type: 'ANSWER_COUNT_UPDATE'; payload: { answeredCount: number; totalCount: number } }
  | { type: 'ROUND_END'; payload: RoundEndPayload }
  | { type: 'RECONNECTED'; payload: { participantId: string } }
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
  selectedCategory?: string | null;
  feedbackMode?: 'supportive' | 'neutral' | 'roast';
  lastRoundResults?: RoundEndPayload | null;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string).toUpperCase();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnectToast, setReconnectToast] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<RoundEndPayload | null>(null);
  const [needsPlayerInfo, setNeedsPlayerInfo] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);

  const wsRef = useRef<import('@/app/lib/websocket').SocketClient | null>(null);
  const userInfoRef = useRef<{ userId: string; userName: string } | null>(null);
  const connectFnRef = useRef<(() => void) | null>(null);

  const handleReturnHome = useCallback(() => {
    router.push('/room');
  }, [router]);

  useEffect(() => {
    document.title = `Room ${roomCode} | Trivia Room`;
  }, [roomCode]);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'ROOM_STATE':
        console.log('[Room] Received ROOM_STATE', {
          roomCode: message.payload.roomCode,
          gameState: message.payload.gameState,
          participantCount: message.payload.participants.length
        });
        // Detect promotion from spectator -> active for current user and show toast
        setRoom((prevRoom) => {
          try {
            const newRoom = message.payload as RoomState;
            if (prevRoom && playerId) {
              const prevP = prevRoom.participants.find(p => p.id === playerId);
              const newP = newRoom.participants.find(p => p.id === playerId);
              if (prevP && newP && prevP.role === 'spectator' && newP.role === 'active') {
                setReconnectToast('You were promoted to an active player!');
                window.setTimeout(() => setReconnectToast(null), 3500);
              }
            }
          } catch {
            // ignore
          }
          return message.payload as RoomState;
        });
        // Hydrate roundResults from lastRoundResults when joining during results phase
        if (message.payload.gameState === 'results' && !roundResults && message.payload.lastRoundResults) {
          setRoundResults(message.payload.lastRoundResults);
        }
        // For anonymous rooms, find participant by name match since backend generates new ID
        if (userInfoRef.current) {
          const participant = message.payload.participants.find(
            (p) => p.name === userInfoRef.current?.userName
          );
            if (participant) {
            console.log('[Room] Setting playerId from ROOM_STATE', {
              participantId: participant.id,
              participantName: participant.name,
              userName: userInfoRef.current.userName
            });
            setPlayerId(participant.id);
            localStorage.setItem('playerId', participant.id);
          } else {
            console.warn('[Room] Could not find participant in ROOM_STATE by name', {
              userName: userInfoRef.current.userName,
              participants: message.payload.participants.map(p => ({ id: p.id, name: p.name }))
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

      case 'PARTICIPANT_LEFT': {
        // payload.connectionStatus === 'left' means the participant intentionally left and should be removed.
        const payload = message.payload as { playerId: string; playerName?: string; connectionStatus: ConnectionStatus | 'left' };
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          if (payload.connectionStatus === 'left') {
            return {
              ...prevRoom,
              participants: prevRoom.participants.filter((p) => p.id !== payload.playerId),
            };
          }

          // Otherwise mark participant as disconnected/reconnecting but keep them in the list
          const updated = prevRoom.participants.map((p) =>
            p.id === payload.playerId ? { ...p, connectionStatus: payload.connectionStatus as ConnectionStatus } : p
          );
          return { ...prevRoom, participants: updated };
        });
        // Also check if the remaining active+connected players are all ready and should start countdown
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          const participantsAfter = prevRoom.participants.filter((p) => p.id !== payload.playerId || payload.connectionStatus !== 'left');
          const activeConnected = participantsAfter.filter((p) => p.role !== 'spectator' && p.connectionStatus === 'connected');
          const allReady = activeConnected.length > 0 && activeConnected.every((p) => p.isReady);
          const enoughPlayers = activeConnected.length >= 2;
          if (allReady && enoughPlayers) setShowCountdown(true);
          return prevRoom;
        });
        break;
      }

      case 'RECONNECTED': {
        const participantId = (message.payload as { participantId: string }).participantId;
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          const updated = prevRoom.participants.map((p) =>
            p.id === participantId ? { ...p, connectionStatus: 'connected' as ConnectionStatus } : p
          );
          // Show a short toast mentioning who reconnected (if we can find the name)
          const reconnectedParticipant = prevRoom.participants.find((p) => p.id === participantId);
          if (reconnectedParticipant) {
            setReconnectToast(`${reconnectedParticipant.name} reconnected`);
            window.setTimeout(() => setReconnectToast(null), 3500);
          }
          return { ...prevRoom, participants: updated };
        });
        break;
      }

      case 'PLAYER_READY':
        setRoom((prevRoom) => {
          if (!prevRoom) return prevRoom;
          const updatedParticipants = prevRoom.participants.map((p) =>
            p.id === message.payload.playerId
              ? { ...p, isReady: message.payload.isReady }
              : p
          );

          // Only consider active, connected participants for ready checks
          const activeConnected = updatedParticipants.filter((p) => p.role !== 'spectator' && p.connectionStatus === 'connected');
          const allReady = activeConnected.length > 0 && activeConnected.every((p) => p.isReady);
          const enoughPlayers = activeConnected.length >= 2;

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
        setGameStartTime(message.payload.startTime);
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
        setError(message.payload.message);
        break;
    }
  }, [playerId]);

  const connectWebSocket = useCallback(() => {
    if (!userInfoRef.current) return;
    if (wsRef.current && wsRef.current.isConnected()) return;

    const { userId, userName } = userInfoRef.current;
    try {
      const client = new SocketClient();
      wsRef.current = client;

      client.on('ROOM_STATE', (payload: unknown) => handleMessage({ type: 'ROOM_STATE', payload } as ServerMessage));
    client.on('PLAYER_JOINED', (payload: unknown) => handleMessage({ type: 'PLAYER_JOINED', payload } as ServerMessage));
    client.on('PLAYER_LEFT', (payload: unknown) => handleMessage({ type: 'PLAYER_LEFT', payload } as ServerMessage));
    // New event name used by server: PARTICIPANT_LEFT (disconnected vs left)
    client.on('PARTICIPANT_LEFT', (payload: unknown) => handleMessage({ type: 'PARTICIPANT_LEFT', payload } as ServerMessage));
    client.on('RECONNECTED', (payload: unknown) => handleMessage({ type: 'RECONNECTED', payload } as ServerMessage));
      client.on('PLAYER_READY', (payload: unknown) => handleMessage({ type: 'PLAYER_READY', payload } as ServerMessage));
      client.on('GAME_START', (payload: unknown) => handleMessage({ type: 'GAME_START', payload } as ServerMessage));
      client.on('ANSWER_SUBMITTED', (payload: unknown) => handleMessage({ type: 'ANSWER_SUBMITTED', payload } as ServerMessage));
      client.on('ANSWER_COUNT_UPDATE', (payload: unknown) => handleMessage({ type: 'ANSWER_COUNT_UPDATE', payload } as ServerMessage));
      client.on('ROUND_END', (payload: unknown) => handleMessage({ type: 'ROUND_END', payload } as ServerMessage));
      client.on('ERROR', (payload: unknown) => handleMessage({ type: 'ERROR', payload } as ServerMessage));

      client.on('disconnect', () => {
        console.log('[Room] Socket disconnected');
        setConnectionStatus('reconnecting');
      });

      client.on('reconnect_attempt', (payload: unknown) => {
        const attempt = (payload as { attempt: number })?.attempt || 0;
        console.log('[Room] Reconnect attempt', attempt);
        setReconnectAttempts(attempt);
      });

      client.on('reconnect_failed', () => {
        console.error('[Room] Reconnection failed permanently');
        setConnectionStatus('disconnected');
        setSessionLost(true);
      });

      client.on('connection_error', () => {
        console.error('[Room] Connection error');
        setConnectionStatus('reconnecting');
      });

      client.connect().then(() => {
        console.log('[Room] WebSocket connected, sending JOIN', { userId, userName, roomCode });
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
      setError('Failed to connect to room');
      setConnectionStatus('disconnected');
    }
  }, [roomCode, handleMessage]);

  useEffect(() => {
    connectFnRef.current = connectWebSocket;
  }, [connectWebSocket]);

  const handleReadyToggle = useCallback(() => {
    console.log('[Room] handleReadyToggle called', {
      hasWsRef: !!wsRef.current,
      hasRoom: !!room,
      playerId,
      roomParticipants: room?.participants.length
    });

    if (!wsRef.current || !room) {
      console.log('[Room] Early return: missing wsRef or room');
      return;
    }

    const currentUser = room.participants.find((p) => p.id === playerId);
    if (!currentUser) {
      console.log('[Room] Early return: currentUser not found', { playerId, participants: room.participants.map(p => p.id) });
      return;
    }

    console.log('[Room] Ready button clicked', {
      playerId,
      currentReady: currentUser.isReady,
      newReady: !currentUser.isReady,
      isConnected: wsRef.current.isConnected()
    });

    wsRef.current.send('READY', { isReady: !currentUser.isReady });
  }, [room, playerId]);

  const handleSubmitAnswer = useCallback((answer: string) => {
    if (!wsRef.current || !gameStartTime) return;
    const timestamp = Date.now() - gameStartTime;
    wsRef.current.send('ANSWER', { answerText: answer, timestamp });
  }, [gameStartTime]);

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
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    router.push('/room');
  }, [router]);

  const handleJoinRoomFromLink = async (name: string, _code: string) => {
    void _code;
    if (hasAttemptedConnection) return;

    setIsJoining(true);
    setJoinError(null);

    try {
  const playerId = crypto.randomUUID();
  localStorage.setItem('playerId', playerId);
  localStorage.setItem('playerName', name);

      userInfoRef.current = { userId: playerId, userName: name };
      setNeedsPlayerInfo(false);
      setHasAttemptedConnection(true);

      connectWebSocket();
    } catch (err) {
      console.error('Error joining room:', err);
      setJoinError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const { data: validation, isLoading: isValidating, error: validationError } = useQuery({
    queryKey: ['room-validate', roomCode],
    queryFn: async () => {
      const response = await apiClient.get(`/room/${roomCode}/validate`);
      return response.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isValidating) return;
    if (hasAttemptedConnection) return;

    if (validationError) {
      setError('Unable to connect to room. Please try again.');
      setConnectionStatus('disconnected');
      return;
    }
    if (!validation) return;
    if (!validation.exists) {
      setError('Room not found. Please check the room code.');
      setConnectionStatus('disconnected');
      return;
    }
    // If room is active, allow joining as spectator (do not block)
    if (!validation.canJoin && validation.gameState !== 'active') {
      setError('Unable to join room. It may be full or unavailable.');
      setConnectionStatus('disconnected');
      return;
    }

    // Check if we have stored session data
  const storedPlayerId = localStorage.getItem('playerId');
  const storedPlayerName = localStorage.getItem('playerName');

    if (!storedPlayerId || !storedPlayerName) {
      setNeedsPlayerInfo(true);
      setConnectionStatus('disconnected');
      return;
    }

    userInfoRef.current = { userId: storedPlayerId, userName: storedPlayerName };
    setHasAttemptedConnection(true);
  }, [isValidating, validation, validationError, hasAttemptedConnection]);

  useEffect(() => {
    if (!hasAttemptedConnection || !userInfoRef.current) return;
    if (wsRef.current && wsRef.current.isConnected()) return;

    connectWebSocket();
  }, [hasAttemptedConnection, connectWebSocket]);

  const currentUser = room?.participants.find((p) => p.id === playerId) || null;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {sessionLost && <SessionLostModal onGoHome={handleReturnHome} />}
        <div className="w-full max-w-md mx-auto">
          <ErrorDisplay message={error} onRetry={() => router.push('/room')} />
        </div>
      </div>
    );
  }

  if (needsPlayerInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {sessionLost && <SessionLostModal onGoHome={handleReturnHome} />}
        <div className="w-full max-w-md mx-auto space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Join Room</h1>
            <p className="text-muted-foreground">Enter your name to join room <span className="font-mono font-semibold">{roomCode}</span></p>
          </div>
          <JoinRoomForm
            onJoinRoom={handleJoinRoomFromLink}
            isLoading={isJoining}
            error={joinError}
            prefilledRoomCode={roomCode}
          />
        </div>
      </div>
    );
  }

  if (connectionStatus === 'connecting' || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loading message="Connecting to room..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {sessionLost && <SessionLostModal onGoHome={handleReturnHome} />}
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-center">
          {connectionStatus === 'connected' && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              Connected
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
        {reconnectToast && (
          <div className="mb-4 flex items-center justify-center">
            <div className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm">
              {reconnectToast}
            </div>
          </div>
        )}

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
                  groupId={undefined}
                  groupName={undefined}
                  selectedCategory={room.selectedCategory}
                  feedbackMode={room.feedbackMode}
                />
                {room.leaderboard && room.leaderboard.length > 0 && (
                  <Leaderboard title="Leaderboard" leaderboard={room.leaderboard} />
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
                    totalCount={room.participants.filter((p) => p.role !== 'spectator' && p.connectionStatus === 'connected').length}
                  />
                ) : (
                  // If current user is a spectator, show a spectator notice instead of the answer box
                  currentUser && currentUser.role === 'spectator' ? (
                    <div className="w-full max-w-2xl mx-auto p-6 md:p-8">
                      <div className="text-center text-gray-700 dark:text-gray-300">
                        <h3 className="text-lg font-semibold">You are spectating</h3>
                        <p className="mt-2">This game is in progress — spectators cannot submit answers. Wait until the next round to participate.</p>
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
                  )
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
                      groupId={undefined}
                    />
                </div>
                {(roundResults.leaderboard || room.leaderboard) && (
                  <Leaderboard
                    title="Updated Leaderboard"
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
