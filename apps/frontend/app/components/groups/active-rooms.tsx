import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useGroupActiveRooms } from '@/app/lib/api/queries/groups'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ActiveRoomsProps {
  groupId: string
}

export function ActiveRooms({ groupId }: ActiveRoomsProps) {
  const router = useRouter()
  const { data, isLoading } = useGroupActiveRooms(groupId)

  if (isLoading) return null

  if (!data || data.rooms.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Active Rooms</h3>
      <div className="space-y-4">
        {data.rooms.map((room) => (
          <Alert key={room.code} variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Room {room.code}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p>Players: {room.participantCount}/8</p>
                <p>Status: {room.gameState}</p>
              </div>
              {room.gameState !== 'active' && (
                <Button onClick={() => router.push(`/groups/${groupId}/rooms/${room.code}`)}>
                  Join Room
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  )
}