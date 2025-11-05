'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateRoomForm } from './components/create-room-form';
import { JoinRoomForm } from './components/join-room-form';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from './lib/api/client';

export default function Home() {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  function generatePlayerId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // React Query mutation for creating a room
  const createRoomMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.post('/room/create', { hostName: name });
      if (!response.data || !response.data.code) {
        throw new Error(response.data?.error || 'Failed to create room');
      }
      return response.data;
    },
  });

  const handleCreateRoom = async (name: string) => {
    setCreateError(null);
    try {
      const data = await createRoomMutation.mutateAsync(name);
      // Store player info in sessionStorage
      const playerId = generatePlayerId();
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('playerName', name);
      // Navigate to room
      router.push(`/room/${data.code}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create room');
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
            isLoading={createRoomMutation.isPending}
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
