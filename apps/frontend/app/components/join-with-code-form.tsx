'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApiClient } from '@/app/lib/api-client';
import { ApiResponse, BackendApiResponse } from '@/app/lib/types';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AcceptCodeResponse | null>(null);
  const router = useRouter();
  const api = useApiClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    if (code.length !== 6) {
      setError('Invite code must be 6 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/invites/accept-code', {
        code: code.toUpperCase(),
      }) as ApiResponse<BackendApiResponse<AcceptCodeResponse>>;

      if (response.error) {
        throw new Error(response.error.message);
      }

      const backendData = response.data as BackendApiResponse<AcceptCodeResponse>;
      setSuccess(backendData.data!);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to group page after a short delay
      setTimeout(() => {
        router.push(`/groups/${backendData.data!.group.id}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters and convert to uppercase
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setCode(cleanValue);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
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

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? 'Joining...' : 'Join Group'}
            {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}