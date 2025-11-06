'use client';

import { Participant } from '@/app/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ParticipantCardProps {
  participant: Participant;
  isCurrentUser: boolean;
}

export function ParticipantCard({ participant, isCurrentUser }: ParticipantCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300 ease-in-out',
        isCurrentUser && 'ring-2 ring-primary',
        participant.isReady && 'bg-accent/10 text-accent-foreground scale-[1.02]'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate flex items-center gap-2">
              <span className="truncate">{participant.name}</span>
              {participant.isGroupMember !== undefined && (
                <span
                  className={cn('w-2 h-2 rounded-full shrink-0', participant.isGroupMember ? 'bg-accent' : 'bg-muted')}
                  title={participant.isGroupMember ? 'Group member' : 'Guest'}
                  aria-hidden
                />
              )}
              {/* T052: Show score next to name */}
              {typeof participant.score === 'number' && (
                <Badge variant="secondary" className="shrink-0">
                  {participant.score} pt{participant.score === 1 ? '' : 's'}
                </Badge>
              )}
            </p>
            {isCurrentUser && (
              <Badge variant="secondary" className="mt-1">
                You
              </Badge>
            )}
          </div>
          {participant.isReady && (
            <Badge variant="default" className="ml-2 bg-accent/10 text-accent-foreground">
              Ready
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
