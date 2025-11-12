'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Eye } from 'lucide-react';

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCode: string;
  groupId: string;
  participantCount: number;
  maxActivePlayers?: number;
  gameState: string;
}

export function JoinRoomDialog({
  open,
  onOpenChange,
  roomCode,
  groupId,
  participantCount,
  maxActivePlayers = 8,
  gameState,
}: JoinRoomDialogProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'active' | 'spectator'>('active');
  
  const isFull = participantCount >= maxActivePlayers;
  const isGameActive = gameState === 'active';

  const handleJoin = () => {
    // Store preference in localStorage for the join handler to use
    localStorage.setItem(`room_${roomCode}_preferredRole`, selectedRole);
    router.push(`/groups/${groupId}/rooms/${roomCode}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Room {roomCode}</DialogTitle>
          <DialogDescription>
            Choose how you want to join this room
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedRole}
          onValueChange={(value: string) => setSelectedRole(value as 'active' | 'spectator')}
          className="space-y-4"
        >
          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem
              value="active"
              id="active"
              disabled={isFull || isGameActive}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor="active"
                className={`flex items-center gap-2 font-medium ${
                  isFull || isGameActive ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Users className="h-4 w-4" />
                Join as Participant
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Play the game, answer questions, and compete for points.
                {isFull && (
                  <span className="block text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Participant slots full ({participantCount}/{maxActivePlayers})
                  </span>
                )}
                {isGameActive && !isFull && (
                  <span className="block text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Game in progress - you'll join as spectator and can play in the next round
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="spectator" id="spectator" className="mt-1" />
            <div className="flex-1">
              <Label
                htmlFor="spectator"
                className="flex items-center gap-2 font-medium cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                Watch as Spectator
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Watch the game and see all questions and results. You can switch to participant mode between rounds.
              </p>
            </div>
          </div>
        </RadioGroup>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin}>
            {selectedRole === 'active' ? 'Join Game' : 'Start Watching'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
