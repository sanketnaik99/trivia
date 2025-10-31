'use client';

import { Participant } from '@/app/lib/types';
import { ParticipantCard } from '@/app/components/participant-card';
import { RoomCodeDisplay } from '@/app/components/room-code-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RoomLobbyProps {
  roomCode: string;
  participants: Participant[];
  currentUserId: string;
}

export function RoomLobby({ roomCode, participants, currentUserId }: RoomLobbyProps) {
  const readyCount = participants.filter((p) => p.isReady).length;
  const totalCount = participants.length;
  const allReady = readyCount === totalCount && totalCount > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      <RoomCodeDisplay roomCode={roomCode} />

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
