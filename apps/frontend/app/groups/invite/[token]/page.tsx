'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { API_CONFIG } from '@/app/lib/config';
import { BackendApiResponse } from '@/app/lib/types';
import { useAuth } from '@clerk/nextjs';
import { useAcceptInvite } from '@/app/lib/api/queries/invites';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';

interface InviteInfo {
  group: {
    id: string;
    name: string;
    description?: string;
    privacy: string;
  };
  invite: {
    id: string;
    expiresAt: string;
    createdBy: {
      firstName: string;
      lastName: string;
    };
  };
  isMember: boolean;
  isExpired: boolean;
}


export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const acceptInviteMutation = useAcceptInvite();

  const token = params.token as string;


  const loadInviteInfo = useCallback(async () => {
    try {
      const apiBase = API_CONFIG.baseUrl.replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/groups/invite/${token}`);
      const data = await response.json();
      if (data?.error) {
        if (data.error.code === 'NOT_FOUND') {
          setError('Invalid or expired invite link');
        } else {
          setError(data.error.message);
        }
        return;
      }
      const backendData = data.data as BackendApiResponse<InviteInfo>;
      setInviteInfo(backendData.data!);
    } catch {
      setError('Failed to load invite information');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      // Redirect to sign in with return URL
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    loadInviteInfo();
  }, [isLoaded, isSignedIn, token, router, loadInviteInfo]);

  const handleAcceptInvite = () => {
    if (!inviteInfo) return;

    acceptInviteMutation.mutate(token, {
      onSuccess: () => {
        setSuccess(true);
        // Redirect to group page after a short delay
        setTimeout(() => {
          router.push(`/groups/${inviteInfo.group.id}`);
        }, 2000);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to accept invite');
      },
    });
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to accept this group invitation.
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
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p>Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Invalid Invite
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/groups">
              <Button className="w-full">Browse Groups</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Welcome to the Group!
            </CardTitle>
            <CardDescription>
              You have successfully joined {inviteInfo?.group.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to the group page...
            </p>
            <Link href={`/groups/${inviteInfo?.group.id}`}>
              <Button className="w-full">Go to Group</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteInfo) {
    return null;
  }

  const { group, invite, isMember, isExpired } = inviteInfo;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Invitation
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a trivia group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
            <div className="flex justify-center mb-2">
              <Badge variant="secondary">{group.privacy}</Badge>
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Invited by: {invite.createdBy.firstName} {invite.createdBy.lastName}</p>
            <p>Expires: {new Date(invite.expiresAt).toLocaleDateString()}</p>
          </div>

          {isExpired && (
            <Alert variant="destructive">
              <AlertDescription>
                This invite has expired and can no longer be accepted.
              </AlertDescription>
            </Alert>
          )}

          {isMember && (
            <Alert>
              <AlertDescription>
                You are already a member of this group.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Link href="/groups" className="flex-1">
              <Button variant="outline" className="w-full">
                Browse Groups
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={handleAcceptInvite}
              disabled={isExpired || isMember || acceptInviteMutation.isPending}
            >
              {acceptInviteMutation.isPending ? 'Joining...' : 'Accept Invite'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}