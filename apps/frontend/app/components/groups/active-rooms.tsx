'use client';

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useGroupActiveRooms } from '@/app/lib/api/queries/groups'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { JoinRoomDialog } from '@/app/components/join-room-dialog'
import { useAuth } from '@clerk/nextjs'
import { SocketClient } from '@/app/lib/websocket'
import { API_CONFIG } from '@/app/lib/config'
import { useQueryClient } from '@tanstack/react-query'

interface ActiveRoomsProps {
  groupId: string
}

interface RoomStateChangedPayload {
  roomCode: string
  gameState: string
  participantCount: number
}

export function ActiveRooms({ groupId }: ActiveRoomsProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading } = useGroupActiveRooms(groupId)
  const [selectedRoom, setSelectedRoom] = useState<{
    code: string
    participantCount: number
    gameState: string
    maxActivePlayers: number
  } | null>(null)

  // Socket connection for real-time updates
  useEffect(() => {
    let socket: SocketClient | null = null

    const connectSocket = async () => {
      try {
        const token = await getToken()
        if (!token) {
          console.log('[ActiveRooms] No auth token available, skipping socket connection')
          return
        }

        console.log('[ActiveRooms] Creating socket connection for group:', groupId)
        socket = new SocketClient({
          url: API_CONFIG.socketUrl,
          options: {
            auth: { token },
          },
        })

        await socket.connect()

        console.log('[ActiveRooms] Socket connected, joining group:', groupId)

        // Listen for room state changes BEFORE joining the group
        socket.on('ROOM_STATE_CHANGED', (payload: unknown) => {
          const stateChange = payload as RoomStateChangedPayload
          console.log('[ActiveRooms] ROOM_STATE_CHANGED received:', stateChange)
          
          // Update the cached data directly for instant UI updates
          queryClient.setQueryData(
            ['groups', groupId, 'rooms'],
            (oldData: { rooms: Array<{ code: string; participantCount: number; gameState: string }> } | undefined) => {
              if (!oldData) return oldData

              const roomExists = oldData.rooms.some(r => r.code === stateChange.roomCode)
              
              if (roomExists) {
                // Update existing room
                return {
                  ...oldData,
                  rooms: oldData.rooms.map(room =>
                    room.code === stateChange.roomCode
                      ? {
                          ...room,
                          gameState: stateChange.gameState,
                          participantCount: stateChange.participantCount,
                        }
                      : room
                  ),
                }
              } else {
                // Add new room
                return {
                  ...oldData,
                  rooms: [
                    ...oldData.rooms,
                    {
                      code: stateChange.roomCode,
                      gameState: stateChange.gameState,
                      participantCount: stateChange.participantCount,
                    },
                  ],
                }
              }
            }
          )
        })

        // Join the group channel to receive room updates (after setting up listener)
        console.log('[ActiveRooms] Sending JOIN_GROUP event for group:', groupId)
        socket.send('JOIN_GROUP', { groupId })
      } catch (error) {
        console.error('[ActiveRooms] Socket connection error:', error)
      }
    }

    connectSocket()
  }, [groupId, getToken, queryClient])

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
              <Button
                onClick={() =>
                  setSelectedRoom({
                    code: room.code,
                    participantCount: room.participantCount,
                    gameState: room.gameState,
                    maxActivePlayers: 8,
                  })
                }
              >
                Join Room
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {selectedRoom && (
        <JoinRoomDialog
          open={!!selectedRoom}
          onOpenChange={(open) => !open && setSelectedRoom(null)}
          roomCode={selectedRoom.code}
          groupId={groupId}
          participantCount={selectedRoom.participantCount}
          maxActivePlayers={selectedRoom.maxActivePlayers}
          gameState={selectedRoom.gameState}
        />
      )}
    </div>
  )
}