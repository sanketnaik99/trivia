'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface SessionLostModalProps {
  onGoHome: () => void;
}

/**
 * T077: Modal displayed when server connection is permanently lost
 * Shows when reconnection fails or server restarts
 */
export function SessionLostModal({ onGoHome }: SessionLostModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">Session Lost</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Connection to the server was lost and could not be restored. 
            Your game session has ended.
          </p>
          <p className="text-sm text-muted-foreground">
            This can happen if:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>The server was restarted</li>
            <li>The room timed out due to inactivity</li>
            <li>Your network connection was interrupted</li>
          </ul>
          <Button onClick={onGoHome} className="w-full">
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
