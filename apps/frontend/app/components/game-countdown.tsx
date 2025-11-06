'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface GameCountdownProps {
  onComplete: () => void;
}

export function GameCountdown({ onComplete }: GameCountdownProps) {
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-12 text-center">
          <div className="mb-6">
            <p className="text-xl text-muted-foreground mb-4">
              Game starting in...
            </p>
            <div key={count} className="text-8xl font-bold text-primary">
              {count}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Get ready!</p>
        </CardContent>
      </Card>
    </div>
  );
}
