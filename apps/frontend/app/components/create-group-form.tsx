'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateGroup } from '@/app/lib/api/queries/groups';
import { useRouter } from 'next/navigation';

export function CreateGroupForm() {
  const [name, setName] = useState('');
  const createGroupMutation = useCreateGroup();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createGroupMutation.mutateAsync({ name: name.trim() });
      if (result.group?.id) {
        router.push(`/groups/${result.group.id}`);
      } else {
        throw new Error('Invalid response: missing group ID');
      }
    } catch (err) {
      // Error handling is done by React Query
      console.error('Failed to create group:', err);
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

          {createGroupMutation.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {createGroupMutation.error.message || 'Failed to create group'}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={createGroupMutation.isPending || !name.trim()}
          >
            {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}