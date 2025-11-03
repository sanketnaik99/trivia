'use client';

'use client';

import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Crown, UserMinus, UserPlus, LogOut } from 'lucide-react';
import { useRemoveMember, usePromoteMember, useLeaveGroup } from '@/app/lib/api/queries/memberships';

interface Membership {
  id: string;
  userId: string;
  groupId: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'LEFT' | 'REMOVED';
  joinedAt: Date;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface MemberListProps {
  groupId: string;
  members: Membership[];
  currentUserRole: 'ADMIN' | 'MEMBER';
  currentUserId: string;
}

export function MemberList({ groupId, members, currentUserRole, currentUserId }: MemberListProps) {
  const removeMemberMutation = useRemoveMember();
  const promoteMemberMutation = usePromoteMember();
  const leaveGroupMutation = useLeaveGroup();

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMemberMutation.mutateAsync({ groupId, userId });
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handlePromoteMember = async (userId: string) => {
    try {
      await promoteMemberMutation.mutateAsync({ groupId, userId });
    } catch (error) {
      console.error('Failed to promote member:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroupMutation.mutateAsync(groupId);
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const isCurrentUser = (userId: string) => userId === currentUserId;
  const canManageMembers = currentUserRole === 'ADMIN';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Members ({members.length})
        </CardTitle>
        <CardDescription>
          Group members and their roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="p-3 border rounded-lg space-y-2">
              {/* First row: User name */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  {member.user?.avatarUrl && (
                    <Image
                      src={member.user.avatarUrl}
                      alt={member.user.displayName || 'User avatar'}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover rounded-full"
                    />
                  )}
                  <AvatarFallback>
                    {member.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {member.user?.displayName || member.userId || 'Unknown User'}
                  {isCurrentUser(member.userId) && (
                    <span className="text-sm text-muted-foreground ml-1">(You)</span>
                  )}
                </span>
                {member.role === 'ADMIN' && (
                  <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                )}
              </div>

              {/* Second row: Role and joined date */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'} className="shrink-0">
                    {member.role}
                  </Badge>
                  <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Third row: Actions (right-aligned) */}
              <div className="flex justify-end">
                {/* Admin actions */}
                {canManageMembers && !isCurrentUser(member.userId) && (
                  <div className="flex gap-1">
                    {member.role === 'MEMBER' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={promoteMemberMutation.isPending}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Promote Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to promote {member.user?.displayName} to admin?
                              They will have full control over the group.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePromoteMember(member.userId)}
                            >
                              Promote
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.user?.displayName} from the group?
                            They will need a new invite to rejoin.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  </div>
                )}

                {/* Leave group action (for current user) */}
                {isCurrentUser(member.userId) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={leaveGroupMutation.isPending}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave this group? You can only rejoin with a new invite.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveGroup}>
                          Leave Group
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}