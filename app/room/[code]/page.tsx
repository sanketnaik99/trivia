'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Participant } from '@/app/lib/types';
import { RoomLobby } from '@/app/components/room-lobby';
import { GameCountdown } from '@/app/components/game-countdown';
import { GameQuestion } from '@/app/components/game-question';
import { GameTimer } from '@/app/components/game-timer';
import { WaitingState } from '@/app/components/waiting-state';
import { Loading } from '@/app/components/loading';
import { ErrorDisplay } from '@/app/components/error-display';
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
}

interface RoundEndPayload {
  correctAnswer: string;
  acceptedAnswers: string[];
  winnerId: string | null;
  results: ResultEntry[];
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userInfoRef = useRef<{ userId: string; userName: string } | null>(null);
  const connectFnRef = useRef<(() => void) | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'ROOM_STATE':
        setRoom(message.payload);
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
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';
    const websocketUrl = `${wsUrl}?room=${roomCode}`;

    try {
      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setReconnectAttempts(0);

        // Send JOIN message
        ws.send(JSON.stringify({
          type: 'JOIN',
          payload: {
            playerId: userId,
            playerName: userName,
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnectionStatus('disconnected');
        
        // Attempt reconnection if not at max attempts
        setReconnectAttempts((prev) => {
          const newAttempts = prev + 1;
          if (newAttempts <= MAX_RECONNECT_ATTEMPTS) {
            setConnectionStatus('reconnecting');
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Reconnecting... Attempt ${newAttempts}`);
              connectFnRef.current?.();
            }, RECONNECT_DELAY * newAttempts);
          } else {
            setError('Connection lost. Please refresh the page to reconnect.');
          }
          return newAttempts;
        });
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to room');
      setConnectionStatus('disconnected');
    }
  }, [roomCode, handleMessage, MAX_RECONNECT_ATTEMPTS, RECONNECT_DELAY]);

  // Store connectWebSocket in ref for use in callbacks
  useEffect(() => {
    connectFnRef.current = connectWebSocket;
  }, [connectWebSocket]);

  const handleReadyToggle = useCallback(() => {
    if (!wsRef.current || !room) return;

    const currentUser = room.participants.find((p) => p.id === playerId);
    if (!currentUser) return;

    // Send READY message to toggle ready state
    wsRef.current.send(JSON.stringify({
      type: 'READY',
      payload: {
        isReady: !currentUser.isReady,
      },
    }));
  }, [room, playerId]);

  const handleSubmitAnswer = useCallback((answer: string) => {
    if (!wsRef.current || !gameStartTime) return;

    // Calculate timestamp from round start (T075)
    const timestamp = Date.now() - gameStartTime;

    // Send ANSWER message
    wsRef.current.send(JSON.stringify({
      type: 'ANSWER',
      payload: {
        answerText: answer,
        timestamp,
      },
    }));
  }, [gameStartTime]);

  useEffect(() => {
    // Get player info from sessionStorage
    const storedPlayerId = sessionStorage.getItem('playerId');
    const storedPlayerName = sessionStorage.getItem('playerName');

    if (!storedPlayerId || !storedPlayerName) {
      router.push('/');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerId(storedPlayerId);
    userInfoRef.current = { userId: storedPlayerId, userName: storedPlayerName };

    // Connect to WebSocket
    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [roomCode, router, connectWebSocket]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorDisplay message={error} onRetry={() => router.push('/')} />
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
      <div className="max-w-4xl mx-auto">
        {connectionStatus === 'reconnecting' && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-center">
            Reconnecting... (Attempt {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})
          </div>
        )}
        
        {showCountdown ? (
          <GameCountdown onComplete={() => setShowCountdown(false)} />
        ) : (
          <>
            {room.gameState === 'lobby' && (
              <RoomLobby
                roomCode={roomCode}
                participants={room.participants}
                currentUserId={playerId}
                onReadyToggle={handleReadyToggle}
              />
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
              <div className="text-center p-4">
                <RoundResults
                  correctAnswer={roundResults.correctAnswer}
                  acceptedAnswers={roundResults.acceptedAnswers}
                  winnerId={roundResults.winnerId}
                  results={roundResults.results}
                  currentUserId={playerId}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
