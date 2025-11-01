'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateRoomForm } from './components/create-room-form';
import { JoinRoomForm } from './components/join-room-form';

export default function Home() {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async (name: string) => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/room/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create room');
      }

      const data = await response.json();
      
      // Store player info in sessionStorage
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', name);
      
      // Navigate to room
      router.push(`/room/${data.roomCode}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (name: string, roomCode: string) => {
    setIsJoining(true);
    setJoinError(null);

    try {
      // Validate room exists
      const validateResponse = await fetch(`/api/room/${roomCode}`);
      if (!validateResponse.ok) {
        const error = await validateResponse.json();
        throw new Error(error.error || 'Room not found');
      }

      // Join room
      const joinResponse = await fetch(`/api/room/${roomCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!joinResponse.ok) {
        const error = await joinResponse.json();
        throw new Error(error.error || 'Failed to join room');
      }

      const data = await joinResponse.json();
      
      // Store player info in sessionStorage
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', name);
      
      // Navigate to room
      router.push(`/room/${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <main className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Trivia Room</h1>
          <p className="text-muted-foreground">Create or join a room to start playing!</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CreateRoomForm
            onCreateRoom={handleCreateRoom}
            isLoading={isCreating}
            error={createError}
          />
          
          <JoinRoomForm
            onJoinRoom={handleJoinRoom}
            isLoading={isJoining}
            error={joinError}
          />
        </div>
      </main>
    </div>
  );
}
