'use client';

import { Participant } from '@/app/lib/types';
import { ParticipantCard } from '@/app/components/participant-card';
import { RoomCodeDisplay } from '@/app/components/room-code-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RoomLobbyProps {
  roomCode: string;
  participants: Participant[];
  currentUserId: string;
  onReadyToggle?: () => void;
  onLeaveRoom?: () => void;
  groupId?: string;
  groupName?: string;
}

export function RoomLobby({ roomCode, participants, currentUserId, onReadyToggle, onLeaveRoom, groupId, groupName }: RoomLobbyProps) {
  // Only consider active, connected participants for ready checks
  const activePlayers = participants.filter((p) => p.role !== 'spectator' && p.connectionStatus === 'connected');
  const readyCount = activePlayers.filter((p) => p.isReady).length;
  const totalCount = activePlayers.length;
  const allReady = totalCount > 0 && readyCount === totalCount && totalCount > 1;
  const currentUser = participants.find((p) => p.id === currentUserId);
  const isReady = currentUser?.isReady || false;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      <RoomCodeDisplay roomCode={roomCode} groupId={groupId} />

      {groupId && groupName && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <span className="font-medium">Group Room:</span>
              <span className="font-semibold">{groupName}</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Points earned in this game will count toward the {groupName} leaderboard.
            </p>
          </CardContent>
        </Card>
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
              onClick={() => {
                console.log('[RoomLobby] Ready button clicked, calling onReadyToggle');
                onReadyToggle?.();
              }}
              variant={isReady ? 'outline' : 'default'}
              className="w-full min-h-11 text-lg"
              size="lg"
            >
              {isReady ? 'Not Ready' : 'Ready to Play'}
            </Button>
            
            {/* T101: Leave Room button */}
            {onLeaveRoom && (
              <Button
                onClick={onLeaveRoom}
                variant="ghost"
                className="w-full sm:w-auto"
                size="sm"
              >
                Leave Room
              </Button>
            )}
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
