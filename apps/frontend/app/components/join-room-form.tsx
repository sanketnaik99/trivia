'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface JoinRoomFormProps {
  onJoinRoom: (name: string, roomCode: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function JoinRoomForm({ onJoinRoom, isLoading = false, error }: JoinRoomFormProps) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && roomCode.trim()) {
      await onJoinRoom(name.trim(), roomCode.trim().toUpperCase());
    }
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Join a Room</CardTitle>
        <CardDescription>Enter a room code to join an existing game</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Join room form">
          <div className="space-y-2">
            <label htmlFor="join-name" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="join-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              disabled={isLoading}
              className="w-full"
              aria-describedby={error ? "join-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="join-code" className="text-sm font-medium">
              Room Code
            </label>
            <Input
              id="join-code"
              type="text"
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={handleRoomCodeChange}
              maxLength={6}
              required
              disabled={isLoading}
              className="w-full font-mono text-lg tracking-wider"
              aria-describedby={error ? "join-error" : undefined}
              aria-invalid={roomCode.length > 0 && roomCode.length !== 6}
            />
          </div>
          {error && (
            <p id="join-error" className="text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !name.trim() || roomCode.length !== 6}
            aria-busy={isLoading}
          >
            {isLoading ? 'Joining...' : 'Join Room'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
