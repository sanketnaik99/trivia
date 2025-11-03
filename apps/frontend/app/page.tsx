'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateRoomForm } from './components/create-room-form';
import { JoinRoomForm } from './components/join-room-form';
import { API_CONFIG } from './lib/config';

export default function Home() {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  function generatePlayerId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const handleCreateRoom = async (name: string) => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const apiBase = API_CONFIG.baseUrl.replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostName: name }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create room');
      }

      const data: { code: string; url: string } = await response.json();
      
      // Store player info in sessionStorage
      const playerId = generatePlayerId();
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('playerName', name);
      
      // Navigate to room
      router.push(`/room/${data.code}`);
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
      // Generate player locally and navigate; Socket.IO will handle validation on join
      const playerId = generatePlayerId();
      sessionStorage.setItem('playerId', playerId);
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
          <h1 className="text-4xl font-bold mb-2">Trivia</h1>
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
