'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateRoomFormProps {
  onCreateRoom: (name: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function CreateRoomForm({ onCreateRoom, isLoading = false, error }: CreateRoomFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onCreateRoom(name.trim());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create a Room</CardTitle>
        <CardDescription>Start a new trivia game and invite friends</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="create-name" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="create-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
