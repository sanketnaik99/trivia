'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SocketClient } from '@/app/lib/websocket';
import { Participant } from '@/app/lib/types';
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
import { API_CONFIG } from '@/app/lib/config';
import dynamic from 'next/dynamic';

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
  // T055: Score fields from backend
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
  // T050: Include leaderboard in ROOM_STATE
  leaderboard?: LeaderboardEntry[];
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
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<RoundEndPayload | null>(null);
  const [needsPlayerInfo, setNeedsPlayerInfo] = useState(false); // Track if user needs to enter name
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [sessionLost, setSessionLost] = useState(false); // T077: Track permanent connection loss
  
  const wsRef = useRef<import('@/app/lib/websocket').SocketClient | null>(null);
  // Socket.IO handles reconnection internally; no manual timeout tracking needed
  const userInfoRef = useRef<{ userId: string; userName: string } | null>(null);
  const connectFnRef = useRef<(() => void) | null>(null);

  // T077: Handler to return home when session is lost
  const handleReturnHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Set page title (T115)
  useEffect(() => {
    document.title = `Room ${roomCode} | Trivia Room`;
  }, [roomCode]);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'ROOM_STATE':
        setRoom(message.payload);
        // Update playerId to match the server's participant ID
        // Find the participant that matches our userName
        if (userInfoRef.current) {
          const participant = message.payload.participants.find(
            (p) => p.name === userInfoRef.current?.userName
          );
          if (participant) {
            console.log('[Frontend] Updating playerId from ROOM_STATE', { 
              participantId: participant.id,
              userName: userInfoRef.current.userName 
            });
            setPlayerId(participant.id);
            sessionStorage.setItem('playerId', participant.id);
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
        // Hide countdown and transition to game view
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
        // Mark that we've submitted an answer (T076)
        setHasAnswered(true);
        break;
      
      case 'ANSWER_COUNT_UPDATE':
        // Update answered count (T077)
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
        // Transition to results state and store results
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
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!userInfoRef.current) return;
    
    const { userId, userName } = userInfoRef.current;
    try {
      const client = new SocketClient();
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

      // T077: Handle disconnect and reconnection events
      client.on('disconnect', () => {
        console.log('[Frontend] Socket disconnected');
        setConnectionStatus('reconnecting');
      });

      client.on('reconnect_attempt', (payload: unknown) => {
        const attempt = (payload as { attempt: number })?.attempt || 0;
        console.log('[Frontend] Reconnect attempt', attempt);
        setReconnectAttempts(attempt);
      });

      client.on('reconnect_failed', () => {
        console.error('[Frontend] Reconnection failed permanently');
        setConnectionStatus('disconnected');
        setSessionLost(true);
      });

      client.on('connection_error', () => {
        console.error('[Frontend] Connection error');
        setConnectionStatus('reconnecting');
      });

      client.connect().then(() => {
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        // Send JOIN event
        client.send('JOIN', { playerId: userId, playerName: userName, roomCode });
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

  // Store connectWebSocket in ref for use in callbacks
  useEffect(() => {
    connectFnRef.current = connectWebSocket;
  }, [connectWebSocket]);

  const handleReadyToggle = useCallback(() => {
    console.log('[Frontend] handleReadyToggle called', { 
      hasWsRef: !!wsRef.current, 
      hasRoom: !!room,
      playerId,
      roomParticipants: room?.participants.length 
    });
    
    if (!wsRef.current || !room) {
      console.log('[Frontend] Early return: missing wsRef or room');
      return;
    }

    const currentUser = room.participants.find((p) => p.id === playerId);
    if (!currentUser) {
      console.log('[Frontend] Early return: currentUser not found', { playerId, participants: room.participants.map(p => p.id) });
      return;
    }

    console.log('[Frontend] Ready button clicked', { 
      playerId, 
      currentReady: currentUser.isReady, 
      newReady: !currentUser.isReady,
      isConnected: wsRef.current.isConnected()
    });

    // Emit READY
    wsRef.current.send('READY', { isReady: !currentUser.isReady });
  }, [room, playerId]);

  const handleSubmitAnswer = useCallback((answer: string) => {
  if (!wsRef.current || !gameStartTime) return;

    // Calculate timestamp from round start (T075)
    const timestamp = Date.now() - gameStartTime;

    // Emit ANSWER
    wsRef.current.send('ANSWER', { answerText: answer, timestamp });
  }, [gameStartTime]);

  // T103: Handle ready up from results state
  const handleReadyForNextRound = useCallback(() => {
  if (!wsRef.current || !room) return;

    // Emit READY to begin next round
    wsRef.current.send('READY', { isReady: true });
  }, [room]);

  // T104 & T106: Handle leave room action
  const handleLeaveRoom = useCallback(() => {
    if (!wsRef.current) return;

    // Emit LEAVE and disconnect
    wsRef.current.send('LEAVE', {});
    wsRef.current.disconnect();

    // Clear session storage
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('playerName');

    // Navigate to home page
    router.push('/');
  }, [router]);

  // T061: Handle joining room when coming from shareable link
  const handleJoinRoomFromLink = async (name: string, _code: string) => {
    // Mark parameter as intentionally unused
    void _code;
    setIsJoining(true);
    setJoinError(null);
    
    try {
      // Generate and store player info
      const playerId = crypto.randomUUID();
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('playerName', name);
      
      // Update state
      setPlayerId(playerId);
      userInfoRef.current = { userId: playerId, userName: name };
      setNeedsPlayerInfo(false);
      
      // Connect to WebSocket
      connectWebSocket();
    } catch (err) {
      console.error('Error joining room:', err);
      setJoinError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    // T060: Validate room before joining
    const validateRoom = async () => {
      try {
        const apiBase = API_CONFIG.baseUrl.replace(/\/$/, '');
        const response = await fetch(`${apiBase}/api/room/${roomCode}/validate`);
        
        if (response.status === 404) {
          setError('Room not found. Please check the room code.');
          setConnectionStatus('disconnected');
          return;
        }
        
        if (!response.ok) {
          setError('Unable to validate room. Please try again.');
          setConnectionStatus('disconnected');
          return;
        }
        
        const validation = await response.json();
        
        // T062: Handle different validation states
        if (!validation.exists) {
          setError('Room not found. Please check the room code.');
          setConnectionStatus('disconnected');
          return;
        }
        
        if (!validation.canJoin) {
          if (validation.gameState === 'active') {
            setError('Game is already in progress. Please wait for the next round.');
          } else {
            setError('Unable to join room. It may be full or unavailable.');
          }
          setConnectionStatus('disconnected');
          return;
        }
        
        // Room is valid, proceed to get player info and connect
        const storedPlayerId = sessionStorage.getItem('playerId');
        const storedPlayerName = sessionStorage.getItem('playerName');

        if (!storedPlayerId || !storedPlayerName) {
          // T061: Show join form for shareable link access
          setNeedsPlayerInfo(true);
          setConnectionStatus('disconnected');
          return;
        }

        setPlayerId(storedPlayerId);
        userInfoRef.current = { userId: storedPlayerId, userName: storedPlayerName };

        // Connect to WebSocket
        connectWebSocket();
      } catch (err) {
        console.error('Error validating room:', err);
        setError('Unable to connect to room. Please try again.');
        setConnectionStatus('disconnected');
      }
    };
    
    validateRoom();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      // No manual reconnect timers to clear with Socket.IO
    };
  }, [roomCode, router, connectWebSocket]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {sessionLost && <SessionLostModal onGoHome={handleReturnHome} />}
        {/* T062, T066: Responsive error display for invalid rooms */}
        <div className="w-full max-w-md mx-auto">
          <ErrorDisplay message={error} onRetry={() => router.push('/')} />
        </div>
      </div>
    );
  }

  // Note: SessionLostModal render handled below in each return path

  // T061: Show join form when accessing via shareable link without credentials
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
        {/* Connection Status Indicator (T111) */}
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
                />
                {/* T054: Show leaderboard in lobby */}
                {room.leaderboard && room.leaderboard.length > 0 && (
                  <Leaderboard title="Leaderboard" leaderboard={room.leaderboard} />
                )}
              </div>
            )}

            {room.gameState === 'active' && room.currentQuestion && room.currentRound && (
              <div className="space-y-6">
                {/* Timer at the top (T074) */}
                <GameTimer
                  startTime={room.currentRound.startTime}
                  duration={room.currentRound.duration}
                />

                {/* Question or Waiting State */}
                {hasAnswered ? (
                  <WaitingState
                    answeredCount={room.currentRound.answeredCount}
                    totalCount={room.participants.length}
                  />
                ) : (
                  <GameQuestion
                    questionText={room.currentQuestion.text}
                    onSubmitAnswer={handleSubmitAnswer}
                    disabled={hasAnswered}
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
                    onReadyForNextRound={handleReadyForNextRound}
                    leaderboard={roundResults.leaderboard || room.leaderboard}
                  />
                </div>
                {/* T054: Show updated leaderboard in results */}
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
