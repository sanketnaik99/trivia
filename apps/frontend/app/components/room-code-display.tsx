'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RoomCodeDisplayProps {
  roomCode: string;
}

export function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  // T063: Construct shareable URL
  const shareableUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/room/${roomCode}`
    : `/room/${roomCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  return (
    <Card className="bg-linear-to-r from-primary/10 to-primary/5">
      <CardContent className="p-6">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Room Code</p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-4xl sm:text-5xl font-bold tracking-wider font-mono">
              {roomCode}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="mt-2"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          {/* T063: Display shareable URL */}
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono break-all">
            {shareableUrl}
          </div>
          <p className="text-xs text-muted-foreground">
            Share this code or URL with friends to join the game
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
