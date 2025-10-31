'use client';

import { useState } from 'react';
import { Participant } from '@/app/lib/types';
import { ParticipantCard } from '@/app/components/participant-card';
import { RoomCodeDisplay } from '@/app/components/room-code-display';
import { SlotMachine } from '@/app/components/slot-machine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RoomLobbyProps {
  roomCode: string;
  participants: Participant[];
  currentUserId: string;
  onReadyToggle?: () => void;
}

export function RoomLobby({ roomCode, participants, currentUserId, onReadyToggle }: RoomLobbyProps) {
  const [showSlotMachine, setShowSlotMachine] = useState(false);
  const readyCount = participants.filter((p) => p.isReady).length;
  const totalCount = participants.length;
  const allReady = readyCount === totalCount && totalCount > 1;
  const currentUser = participants.find((p) => p.id === currentUserId);
  const isReady = currentUser?.isReady || false;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      <RoomCodeDisplay roomCode={roomCode} />

      {/* Slot Machine */}
      {showSlotMachine && (
        <SlotMachine onClose={() => setShowSlotMachine(false)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Players in Lobby</span>
            <span className="text-sm font-normal text-muted-foreground">
              {readyCount}/{totalCount} ready
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allReady && totalCount > 1 && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center font-medium">
              All players ready! Game starting soon...
            </div>
          )}
          
          <div className="mb-4 space-y-2">
            <Button
              onClick={onReadyToggle}
              variant={isReady ? 'outline' : 'default'}
              className="w-full min-h-11 text-lg"
              size="lg"
            >
              {isReady ? 'Not Ready' : 'Ready to Play'}
            </Button>
            <Button
              onClick={() => setShowSlotMachine(!showSlotMachine)}
              variant="secondary"
              className="w-full min-h-11 text-lg"
              size="lg"
            >
              {showSlotMachine ? '🎰 Close Slot Machine' : '🎰 Play Slot Machine'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isCurrentUser={participant.id === currentUserId}
              />
            ))}
          </div>
          {participants.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Waiting for players to join...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
