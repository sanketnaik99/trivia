'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApiClient } from '@/app/lib/api-client';
import { ApiResponse, Group, Membership, BackendApiResponse } from '@/app/lib/types';
import { useAuth } from '@clerk/nextjs';
import { Users, Calendar } from 'lucide-react';
import { MemberList } from '@/app/components/member-list';
import { GenerateInviteModal } from '@/app/components/generate-invite-modal';
import { InviteList } from '@/app/components/invite-list';
import { ManageGroupModal } from '@/app/components/manage-group-modal';

interface GroupDetailResponse {
  group: Group;
  membership: Membership;
  members: Membership[];
}

export default function GroupDetailPage() {
  const params = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();
  const { isSignedIn } = useAuth();

  const groupId = params.groupId as string;

  const loadGroup = useCallback(async () => {
    try {
      const response = await api.get(`/groups/${groupId}`) as ApiResponse<BackendApiResponse<GroupDetailResponse>>;
      if (response.error) {
        if (response.error.code === 'NOT_FOUND') {
          setError('Group not found');
        } else {
          setError(response.error.message);
        }
        return;
      }

      if (response.data?.data) {
        setGroup(response.data.data.group);
        setMembership(response.data.data.membership);
        setMembers(response.data.data.members);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  }, [api, groupId]);

  useEffect(() => {
    if (isSignedIn && groupId) {
      loadGroup();
    }
  }, [isSignedIn, groupId, loadGroup]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to view this group.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/groups">
              <Button>Back to Groups</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group || !membership) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Group Not Found</CardTitle>
            <CardDescription>
              The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/groups">
              <Button>Back to Groups</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = membership.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{group.name}</h1>
              <Badge variant="secondary">
                {group.privacy}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/groups">
              <Button variant="outline">Back to Groups</Button>
            </Link>
            {isAdmin && (
              <ManageGroupModal
                groupId={groupId}
                currentName={group.name}
                onGroupUpdated={loadGroup}
                onGroupDeleted={() => window.location.href = '/groups'}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Group Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{members.length}</div>
                    <div className="text-sm text-muted-foreground">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Games Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Total Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-sm text-muted-foreground">Avg. Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest games and achievements in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity yet</p>
                  <p className="text-sm">Start playing to see your group&apos;s activity here!</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <MemberList
              groupId={groupId}
              members={members}
              currentUserRole={membership.role}
              currentUserId={membership.userId}
              onMemberUpdate={loadGroup}
            />

            {/* Active Invites - Only show to admins */}
            {isAdmin && (
              <InviteList
                groupId={groupId}
                onInviteRevoked={loadGroup}
              />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" disabled>
                  Start New Game
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  View Leaderboard
                </Button>
                {isAdmin && (
                  <GenerateInviteModal
                    groupId={groupId}
                    onInviteGenerated={loadGroup}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}