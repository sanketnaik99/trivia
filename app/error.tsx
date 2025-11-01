'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-destructive">Something went wrong!</h2>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again.
          </p>
          {error.message && (
            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={reset} variant="default" className="w-full">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="w-full"
          >
            Go to home
          </Button>
        </div>
      </Card>
    </div>
  );
}
