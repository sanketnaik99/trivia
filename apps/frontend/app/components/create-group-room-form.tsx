'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// Switch removed; not used anymore
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuestionCategories } from '@/app/lib/api/queries/questions';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import SocketClient from '@/app/lib/websocket';

interface CreateGroupRoomFormProps {
  onRoomCreated?: (roomCode: string, groupId: string) => void;
  groupId: string;
}

interface RoomCreatedData {
  code: string;
  room: unknown;
}

export function CreateGroupRoomForm({ onRoomCreated, groupId }: CreateGroupRoomFormProps) {
  const { getToken, isSignedIn } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'supportive' | 'neutral' | 'roast'>('neutral');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const socketClientRef = useRef<SocketClient | null>(null);

  useEffect(() => {
  if (!isOpen || !isSignedIn) return;

  // Initialize socket client when modal opens
    const initializeSocket = async () => {
      try {
        console.log('Initializing socket, isSignedIn:', isSignedIn);
        const token = await getToken();
        console.log('Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null/undefined');
        
        if (!token) {
          console.error('No auth token available for socket connection');
          return;
        }

        const client = new SocketClient({
          options: {
            auth: { token },
            query: { token },
            extraHeaders: {
              Authorization: `Bearer ${token}`
            }
          }
        });
        socketClientRef.current = client;

        // Connect to socket
        await client.connect();
        console.log('Socket connected successfully');

        // Listen for room creation response
        client.on('ROOM_CREATED', (data: unknown) => {
          const roomData = data as RoomCreatedData;
          console.log('Room created:', roomData);
          if (roomData.code) {
            setIsCreating(false);
            setIsOpen(false);
            onRoomCreated?.(roomData.code, groupId);
          }
        });

        // Also listen for ERROR events
        client.on('ERROR', (error: unknown) => {
          console.error('Socket error:', error);
          setIsCreating(false);
        });

      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setIsCreating(false);
      }
    };

    initializeSocket();

    // categories are fetched via react-query (see below)

    return () => {
      if (socketClientRef.current) {
        socketClientRef.current.disconnect();
        socketClientRef.current = null;
      }
    };
  }, [isOpen, onRoomCreated, getToken, isSignedIn, groupId]);

  // React Query hook for categories (moved to lib folder)
  const { data: categories = [], isLoading: loadingCategories } = useQuestionCategories(Boolean(isOpen && isSignedIn));

  const handleCreateRoom = async () => {
    if (!groupId || !socketClientRef.current) return;

    setIsCreating(true);
    try {
      socketClientRef.current.send('room:create', { groupId, selectedCategory, feedbackMode });
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
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                <Select value={selectedCategory ?? "__any__"} onValueChange={(v) => setSelectedCategory(v === '__any__' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCategories ? 'Loading...' : 'Mixed / Any'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Mixed / Any</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.category} value={c.category}>{c.category} ({c.count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="feedbackMode" className="text-sm font-medium">AI feedback mode</Label>
                <Select value={feedbackMode} onValueChange={(v) => setFeedbackMode(v as 'supportive' | 'neutral' | 'roast')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Neutral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Supportive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="roast">Roast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRoom} disabled={!groupId || isCreating}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}