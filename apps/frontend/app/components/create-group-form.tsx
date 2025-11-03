'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiClient } from '@/app/lib/api-client';
import { ApiResponse, CreateGroupResponse } from '@/app/lib/types';
import { useRouter } from 'next/navigation';

export function CreateGroupForm() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const api = useApiClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/groups', { name: name.trim() });
      if (response.error) {
        throw new Error(response.error.message);
      }
      // Backend returns { success: true, data: { group, membership } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backendData = (response.data as any)?.data;
      if (backendData?.group?.id) {
        router.push(`/groups/${backendData.group.id}`);
      } else {
        throw new Error('Invalid response: missing group ID');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New Group</CardTitle>
        <CardDescription>
          Create a group to play trivia with friends and track leaderboards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Group Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Creating...' : 'Create Group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}