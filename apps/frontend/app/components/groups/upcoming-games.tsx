"use client"
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useGroupScheduledGames, useStartScheduledGame } from '@/app/lib/api/queries/scheduledGames'
import { useAuth, useUser } from '@clerk/nextjs'

function formatDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString()
}

function buildGoogleLink(sg: any, frontendBase = window.location.origin) {
  const start = new Date(sg.startAt)
  const end = new Date(start.getTime() + (sg.durationMinutes || 30) * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '')
  const text = encodeURIComponent(sg.title || 'Trivia Game')
  const details = encodeURIComponent(sg.description || '')
  const location = encodeURIComponent(`${frontendBase}/groups/${sg.groupId}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${fmt(start)}/${fmt(end)}`
}

export function UpcomingGames({ groupId, isAdmin }: { groupId: string; isAdmin?: boolean }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { data, isLoading } = useGroupScheduledGames(groupId)
  const startMutation = useStartScheduledGame(groupId)

  const games = data?.games || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Games</CardTitle>
        <CardDescription>Scheduled games for this group</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div>Loading...</div>}
        {!isLoading && games.length === 0 && <div className="text-sm text-muted-foreground">No upcoming games</div>}
        {!isLoading && games.map((g: any) => (
          <div key={g.id} className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">{g.title}</div>
              <div className="text-sm text-muted-foreground">{formatDate(g.startAt)} • {g.durationMinutes}m • {g.status}</div>
            </div>
            <div className="flex items-center gap-2">
              {g.roomId ? (
                <a href={`/groups/${groupId}/rooms/${g.roomId}`} className="text-sm">
                  <Button variant="ghost">Join</Button>
                </a>
              ) : null}
              {/* Google link */}
              <a href={buildGoogleLink(g)} target="_blank" rel="noreferrer">
                <Button variant="outline">Add to Google</Button>
              </a>
              {/* Download ICS using backend endpoint */}
              <a href={`/groups/${groupId}/scheduled-games/${g.id}/ics`}>
                <Button variant="outline">Download .ics</Button>
              </a>
              {/* Start button for admins only */}
              {isAdmin ? (
                <Button onClick={() => startMutation.mutate(g.id)} disabled={g.status !== 'SCHEDULED' || startMutation.isPending}>Start</Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default UpcomingGames
