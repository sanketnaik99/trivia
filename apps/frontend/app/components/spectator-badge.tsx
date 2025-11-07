"use client";

import { Badge } from '@/components/ui/badge';

interface SpectatorBadgeProps {
  className?: string;
}

export function SpectatorBadge({ className }: SpectatorBadgeProps) {
  return (
    <Badge variant="outline" className={className}>
      Spectator
    </Badge>
  );
}

export default SpectatorBadge;
