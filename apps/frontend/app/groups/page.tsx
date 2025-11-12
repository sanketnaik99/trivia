'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateGroupForm } from '../components/create-group-form';
import { useGroups } from '@/app/lib/api/queries/groups';
import { useAuth } from '@clerk/nextjs';

export default function GroupsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: groupsResponse, isLoading } = useGroups();
  const { isSignedIn } = useAuth();

  const groups = groupsResponse?.groups || [];

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to view and manage your groups.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Groups</h1>
            <p className="text-muted-foreground">Manage your trivia groups and leaderboards</p>
          </div>
          <div className="flex gap-2">
            <Link href="/room">
              <Button variant="outline">Back to Rooms</Button>
            </Link>
            <Button onClick={() => setShowCreateForm(true)}>
              Create Group
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-8">
            <CreateGroupForm />
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first group to start playing trivia with friends and tracking leaderboards.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="truncate">{group.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      group.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.role}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {group.memberCount || 0} member{(group.memberCount || 0) !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/groups/${group.id}`}>
                    <Button className="w-full">
                      View Group
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}