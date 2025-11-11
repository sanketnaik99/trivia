"use client"
import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useGroupScheduledGames, useStartScheduledGame } from '@/app/lib/api/queries/scheduledGames'
import { useAuth, useUser } from '@clerk/nextjs'
import { StartGameDialog } from '../start-game-dialog'

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
  const rrule = buildRRule(sg?.recurrence)
  const recurParam = rrule ? `&recur=${encodeURIComponent(`RRULE:${rrule}`)}` : ''
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${fmt(start)}/${fmt(end)}${recurParam}`
}

function buildRRule(recurrence: any): string | null {
  if (!recurrence) return null
  const type = String(recurrence.type || '').toUpperCase()
  if (!type || type === 'NONE' || type === 'ONE_TIME') return null
  const intervalNum = Number(recurrence.interval)
  const interval = Number.isFinite(intervalNum) && intervalNum > 0 ? intervalNum : 1
  const allowed = new Set(['DAILY','WEEKLY','MONTHLY','YEARLY'])
  const freq = allowed.has(type) ? type : 'WEEKLY'
  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`]
  if (Array.isArray(recurrence.byDay) && recurrence.byDay.length > 0) {
    const byday = recurrence.byDay
      .map((d: string) => String(d || '').toUpperCase().slice(0,2))
      .filter((d: string) => ['MO','TU','WE','TH','FR','SA','SU'].includes(d))
    if (byday.length > 0) parts.push(`BYDAY=${byday.join(',')}`)
  }
  if (Number.isFinite(recurrence.count) && recurrence.count > 0) {
    parts.push(`COUNT=${recurrence.count}`)
  } else if (recurrence.until) {
    const untilDate = new Date(recurrence.until)
    if (!isNaN(untilDate.getTime())) {
      const pad = (n: number) => String(n).padStart(2,'0')
      const toIcsDate = (d: Date) => d.getUTCFullYear() + pad(d.getUTCMonth()+1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'
      parts.push(`UNTIL=${toIcsDate(untilDate)}`)
    }
  }
  return parts.join(';')
}

function recurrenceLabel(rec: any): string | null {
  if (!rec || !rec.type || rec.type === 'NONE' || rec.type === 'ONE_TIME') return null
  const type = String(rec.type).toUpperCase()
  const map: Record<string, string> = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }
  const base = map[type]
  if (!base) return null
  const interval = Number(rec.interval) || 1
  const prefix = interval > 1 ? `Every ${interval} ` : 'Repeats '
  return `${prefix}${base}`
}

export function UpcomingGames({ groupId, isAdmin }: { groupId: string; isAdmin?: boolean }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { data, isLoading } = useGroupScheduledGames(groupId)
  const startMutation = useStartScheduledGame(groupId)
  const [startGameId, setStartGameId] = useState<string | null>(null)

  const games = data?.games || []

  return (
    <>
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
              <div className="text-sm text-muted-foreground">
                {formatDate(g.startAt)} • {g.durationMinutes}m • {g.status}
                {recurrenceLabel(g.recurrence) ? ` • ${recurrenceLabel(g.recurrence)}` : ''}
              </div>
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
              {isAdmin ? (
                <Button onClick={() => setStartGameId(g.id)} disabled={g.status !== 'SCHEDULED' || startMutation.isPending}>Start</Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

      <StartGameDialog
        open={!!startGameId}
        onOpenChange={(open) => !open && setStartGameId(null)}
        onStart={({ selectedCategory, feedbackMode }) => {
          if (startGameId) {
            startMutation.mutate({ id: startGameId, selectedCategory, feedbackMode })
            setStartGameId(null)
          }
        }}
        isLoading={startMutation.isPending}
        title="Start Scheduled Game"
        description="Select options before starting the game."
      />
    </>
  )
}

export default UpcomingGames
