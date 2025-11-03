'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAcceptInviteCode } from '@/app/lib/api/queries/invites';
import { Users, ArrowRight, AlertCircle } from 'lucide-react';

interface JoinWithCodeFormProps {
  onSuccess?: () => void;
}

interface AcceptCodeResponse {
  membership: {
    id: string;
    role: string;
  };
  group: {
    id: string;
    name: string;
  };
}

export function JoinWithCodeForm({ onSuccess }: JoinWithCodeFormProps) {
  const [code, setCode] = useState('');
  const [success, setSuccess] = useState<AcceptCodeResponse | null>(null);
  const router = useRouter();

  const acceptInviteCodeMutation = useAcceptInviteCode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      return;
    }

    if (code.length !== 6) {
      return;
    }

    acceptInviteCodeMutation.mutate(code.toUpperCase(), {
      onSuccess: (data) => {
        setSuccess(data);
        if (onSuccess) {
          onSuccess();
        }
        // Redirect to group page after a short delay
        setTimeout(() => {
          router.push(`/groups/${data.group.id}`);
        }, 2000);
      },
    });
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters and convert to uppercase
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setCode(cleanValue);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Welcome to the group!</CardTitle>
          <CardDescription>
            You have successfully joined <strong>{success.group.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            Redirecting you to the group page...
          </p>
          <Button
            className="w-full mt-4"
            onClick={() => router.push(`/groups/${success.group.id}`)}
          >
            Go to Group
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Join Group with Code
        </CardTitle>
        <CardDescription>
          Enter a 6-character invite code to join a trivia group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Invite Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="ABC123"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              maxLength={6}
              className="text-center text-lg font-mono tracking-wider"
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-character code (letters and numbers only)
            </p>
          </div>

          {acceptInviteCodeMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {acceptInviteCodeMutation.error instanceof Error
                  ? acceptInviteCodeMutation.error.message
                  : 'Failed to join group'}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={acceptInviteCodeMutation.isPending || code.length !== 6}
          >
            {acceptInviteCodeMutation.isPending ? 'Joining...' : 'Join Group'}
            {!acceptInviteCodeMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}