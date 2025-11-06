'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface GameTimerProps {
  startTime: number;
  duration: number;
  onTimeExpired?: () => void;
}

export function GameTimer({ startTime, duration, onTimeExpired }: GameTimerProps) {
  // Calculate initial time remaining based on server time
  const calculateTimeRemaining = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    return remaining;
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining);

  useEffect(() => {
    // Update every 100ms for smooth countdown
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onTimeExpired?.();
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, duration]);

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage (0-100)
  const progressPercentage = Math.max(0, Math.min(100, (timeRemaining / duration) * 100));

  // Note: use design tokens for colors so theme (light/dark) remains consistent.
  // We keep the progress fill as the accent color and use tokenized text colors.

  return (
    <Card className="w-full max-w-2xl mx-auto p-4 md:p-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm md:text-base font-medium text-muted-foreground">
            Time Remaining
          </span>
          <span className="text-2xl md:text-3xl font-bold text-card-foreground">
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Progress bar (uses tokenized colors so dark/light are handled centrally) */}
        <div className="w-full bg-muted/30 rounded-full h-3 md:h-4 overflow-hidden">
          <div
            className="h-full transition-all duration-200 ease-linear bg-accent"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {timeRemaining === 0 && (
          <p className="text-center text-sm md:text-base text-accent-foreground font-semibold">
            Time&apos;s up!
          </p>
        )}
      </div>
    </Card>
  );
}
