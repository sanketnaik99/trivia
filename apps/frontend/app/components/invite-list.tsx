'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { useApiClient } from '@/app/lib/api-client';
import { ApiResponse, BackendApiResponse } from '@/app/lib/types';

interface Invite {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  status: string;
  creator: {
    id: string;
    displayName: string;
  };
}

interface InviteListProps {
  groupId: string;
  onInviteRevoked: () => void;
}

export function InviteList({ groupId, onInviteRevoked }: InviteListProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const api = useApiClient();

  const loadInvites = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/invites?status=ACTIVE`) as ApiResponse<BackendApiResponse<Invite[]>>;
      if (response.error) {
        throw new Error(response.error.message);
      }

      const backendData = response.data as BackendApiResponse<Invite[]>;
      setInvites(backendData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setIsLoading(false);
    }
  }, [api, groupId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      const response = await api.delete(`/groups/${groupId}/invites/${inviteId}`) as ApiResponse<BackendApiResponse<null>>;
      if (response.error) {
        throw new Error(response.error.message);
      }

      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
      onInviteRevoked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getInviteLink = (token: string) => {
    return `${window.location.origin}/groups/invite/${token}`;
  };

  const getInviteCode = (token: string) => {
    return token;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getExpiryInfo = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs <= 0) {
      return { text: 'Expired', urgent: true };
    } else if (diffHours < 24) {
      return { text: `Expires in ${Math.ceil(diffHours)} hour${Math.ceil(diffHours) !== 1 ? 's' : ''}`, urgent: true };
    } else if (diffDays < 3) {
      return { text: `Expires in ${Math.ceil(diffDays)} day${Math.ceil(diffDays) !== 1 ? 's' : ''}`, urgent: true };
    } else {
      return { text: `Expires in ${Math.ceil(diffDays)} days`, urgent: false };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Invites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading invites...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Invites</CardTitle>
        <CardDescription>
          Manage pending invitations to your group
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active invites</p>
            <p className="text-sm">Generate an invite to start adding members!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <div key={invite.id} className={`border rounded-lg p-4 ${getExpiryInfo(invite.expiresAt).urgent && !isExpired(invite.expiresAt) ? 'border-orange-200 bg-orange-50' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={invite.status === 'ACTIVE' && !isExpired(invite.expiresAt) ? "secondary" : "destructive"}>
                        {isExpired(invite.expiresAt) ? "Expired" : invite.status === 'ACTIVE' ? "Active" : invite.status}
                      </Badge>
                      {getExpiryInfo(invite.expiresAt).urgent && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          {getExpiryInfo(invite.expiresAt).text}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Created by {invite.creator.displayName}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revokingId === invite.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke this invite? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Invite Link</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 text-xs bg-muted px-2 py-1 rounded text-muted-foreground break-all">
                        {getInviteLink(invite.token)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getInviteLink(invite.token), invite.token)}
                      >
                        {copiedToken === invite.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Invite Code</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono">
                        {getInviteCode(invite.token)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getInviteCode(invite.token), invite.token)}
                      >
                        {copiedToken === invite.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}