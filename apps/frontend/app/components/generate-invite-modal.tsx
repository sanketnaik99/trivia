'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, ExternalLink, Share2 } from 'lucide-react';
import { useGenerateInvite } from '@/app/lib/api/queries/invites';

interface GenerateInviteModalProps {
  groupId: string;
}

interface GenerateInviteResponse {
  invite: {
    id: string;
    token: string;
    expiresAt: string;
  };
  inviteLink: string;
  inviteCode: string;
}

export function GenerateInviteModal({ groupId }: GenerateInviteModalProps) {
  const [open, setOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [inviteResult, setInviteResult] = useState<GenerateInviteResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const generateInviteMutation = useGenerateInvite();

  const handleGenerateInvite = () => {
    generateInviteMutation.mutate(
      {
        groupId,
        data: { expiresInDays: parseInt(expiresInDays) },
      },
      {
        onSuccess: (data) => {
          setInviteResult(data);
        },
      }
    );
  };

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareInvite = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: 'Join my trivia group!',
          url,
        });
      } catch (err) {
        // User cancelled share or error occurred
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copy
      await copyToClipboard(url, 'link');
    }
  };

  const resetModal = () => {
    setInviteResult(null);
    setCopiedLink(false);
    setCopiedCode(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetModal();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className='w-full'>
          <ExternalLink className="w-4 h-4 mr-2" />
          Generate Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Group Invite</DialogTitle>
          <DialogDescription>
            Create an invite link or code for new members to join your group.
          </DialogDescription>
        </DialogHeader>

        {!inviteResult ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expires">Expires in</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generateInviteMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {generateInviteMutation.error instanceof Error
                    ? generateInviteMutation.error.message
                    : 'Failed to generate invite'}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateInvite} disabled={generateInviteMutation.isPending}>
                {generateInviteMutation.isPending ? 'Generating...' : 'Generate Invite'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Invite generated successfully! Share the link or code below.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Invite Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={inviteResult.inviteLink}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(inviteResult.inviteLink, 'link')}
                    title="Copy link"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareInvite(inviteResult.inviteLink, 'Group Invite')}
                    title="Share link"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Invite Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={inviteResult.inviteCode}
                    readOnly
                    className="text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(inviteResult.inviteCode, 'code')}
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareInvite(inviteResult.inviteLink, 'Group Invite')}
                    title="Share invite"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Expires: {new Date(inviteResult.invite.expiresAt).toLocaleDateString()}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}