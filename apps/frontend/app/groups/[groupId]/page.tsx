'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGroupDetail } from '@/app/lib/api/queries/groups';
import { useAuth, useUser } from '@clerk/nextjs';
import { Users } from 'lucide-react';
import { MemberList } from '@/app/components/member-list';
import { GenerateInviteModal } from '@/app/components/generate-invite-modal';
import { InviteList } from '@/app/components/invite-list';
import { ManageGroupModal } from '@/app/components/manage-group-modal';
import { CreateGroupRoomForm } from '@/app/components/create-group-room-form';
import { RecentActivity } from '@/app/components/recent-activity';
import { ActiveRooms } from '@/app/components/groups/active-rooms';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: groupDetail, isLoading, error } = useGroupDetail(params.groupId as string);
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const groupId = params.groupId as string;

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
            <CardDescription>{error.message || 'Failed to load group'}</CardDescription>
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

  if (!groupDetail) {
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

  const groupDetailData = groupDetail;
  const group = groupDetailData;
  const members = groupDetailData?.members || [];
  const userRole = groupDetailData?.userRole || 'MEMBER';
  const isAdmin = userRole === 'ADMIN';

  // Since React Query handles invalidation automatically, we don't need callback functions

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

            {/* Active Rooms */}
            <Card>
              <CardHeader>
                <CardTitle>Active Rooms</CardTitle>
                <CardDescription>
                  Currently active game rooms in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveRooms groupId={groupId} />
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
                <RecentActivity groupId={groupId} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <MemberList
              groupId={groupId}
              members={members.map(member => ({
                id: `${member.userId}-${groupId}`, // Generate a composite ID
                userId: member.userId,
                groupId,
                role: member.role,
                status: 'ACTIVE' as const,
                joinedAt: new Date(member.joinedAt),
                user: {
                  id: member.userId,
                  displayName: member.user.displayName,
                  avatarUrl: member.user.avatarUrl,
                },
              }))}
              currentUserRole={userRole}
              currentUserId={userId || ''}
            />

            {/* Active Invites - Only show to admins */}
            {isAdmin && (
              <InviteList
                groupId={groupId}
              />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <CreateGroupRoomForm
                  onRoomCreated={(roomCode, selectedGroupId) => {
                    // Store authenticated user info in sessionStorage for room page
                    if (user) {
                      sessionStorage.setItem('playerId', user.id);
                      sessionStorage.setItem('playerName', user.firstName || user.username || 'Anonymous');
                    }
                    // Navigate to the group room using the selected group ID
                    router.push(`/groups/${selectedGroupId}/rooms/${roomCode}`);
                  }}
                />
                <Link href={`/groups/${groupId}/leaderboard`}>
                  <Button variant="outline" className="w-full mb-2">
                    View Leaderboard
                  </Button>
                </Link>
                {isAdmin && (
                  <GenerateInviteModal
                    groupId={groupId}
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