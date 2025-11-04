'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroups } from '@/app/lib/api/queries/groups';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import SocketClient from '@/app/lib/websocket';

interface CreateGroupRoomFormProps {
  onRoomCreated?: (roomCode: string) => void;
}

interface RoomCreatedData {
  code: string;
  room: unknown;
}

export function CreateGroupRoomForm({ onRoomCreated }: CreateGroupRoomFormProps) {
  const { data: groupsResponse, isLoading } = useGroups();
  const { getToken } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const socketClientRef = useRef<SocketClient | null>(null);

  const userGroups = groupsResponse?.groups || [];

  useEffect(() => {
    if (!isOpen) return;

    // Initialize socket client when modal opens
    const initializeSocket = async () => {
      try {
        const token = await getToken();
        const client = new SocketClient({
          options: {
            auth: { token }
          }
        });
        socketClientRef.current = client;

        // Connect to socket
        await client.connect();

        // Listen for room creation response
        client.on('ROOM_CREATED', (data: unknown) => {
          const roomData = data as RoomCreatedData;
          console.log('Room created:', roomData);
          if (roomData.code) {
            setIsCreating(false);
            setIsOpen(false);
            onRoomCreated?.(roomData.code);
          }
        });
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initializeSocket();

    return () => {
      if (socketClientRef.current) {
        socketClientRef.current.disconnect();
        socketClientRef.current = null;
      }
    };
  }, [isOpen, onRoomCreated, getToken]);

  const handleCreateRoom = async () => {
    if (!selectedGroupId || !socketClientRef.current) return;

    setIsCreating(true);
    try {
      // Send room:create event with groupId
      socketClientRef.current.send('room:create', { groupId: selectedGroupId });
    } catch (error) {
      console.error('Failed to create room:', error);
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Start New Game</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group Trivia Room</DialogTitle>
          <DialogDescription>
            Create a trivia room for your group. Points earned will count toward the group leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading groups...</span>
            </div>
          ) : userGroups.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              You are not a member of any groups. Join or create a group first.
            </p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">Select Group</label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group for this room" />
                  </SelectTrigger>
                  <SelectContent>
                    {userGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!selectedGroupId || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Room'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}