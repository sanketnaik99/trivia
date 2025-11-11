"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
// Using native datetime-local input now
import { useCreateScheduledGame } from '@/app/lib/api/queries/scheduledGames'

interface Props {
  groupId: string
}

export function CreateScheduledGameModal({ groupId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startLocal, setStartLocal] = useState('')
  const [duration, setDuration] = useState('30')
  const [frequency, setFrequency] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE')
  const [interval, setInterval] = useState('1')

  const createMutation = useCreateScheduledGame(groupId)

  const reset = () => {
    setTitle('')
    setDescription('')
    setStartLocal('')
    setDuration('30')
    setFrequency('NONE')
    setInterval('1')
  }

  const handleOpenChange = (val: boolean) => {
    setOpen(val)
    if (val) {
      // default to current local date/time in datetime-local format
      setStartLocal((s) => s || (() => {
        const d = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      })())
    } else {
      reset()
    }
  }

  const handleCreate = () => {
    const iso = startLocal ? new Date(startLocal).toISOString() : new Date().toISOString()
    const intVal = parseInt(interval, 10)
    const recurrence = frequency !== 'NONE' ? { type: frequency, interval: Number.isFinite(intVal) && intVal > 0 ? intVal : 1 } : null

    createMutation.mutate(
      { title, description, startAt: iso, durationMinutes: parseInt(duration, 10), recurrence },
      {
        onSuccess: () => {
          // Reset form then close so freshly opened modal is clean
          reset()
          setOpen(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Scheduled Game</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Scheduled Game</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="sg-title">Title</Label>
            <Input id="sg-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name this event" />
          </div>

          <div>
            <Label htmlFor="sg-desc">Description</Label>
            <Textarea id="sg-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div>
            <Label htmlFor="sg-start">Start</Label>
            <Input id="sg-start" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="sg-duration">Duration (minutes)</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="45">45</SelectItem>
                <SelectItem value="60">60</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sg-frequency">Repeats</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Does not repeat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Does not repeat</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency !== 'NONE' && (
            <div>
              <Label htmlFor="sg-interval">Repeat every</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sg-interval"
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value.replace(/[^0-9]/g, '') || '1')}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{frequency.toLowerCase().slice(0, -2) + (frequency.toLowerCase().endsWith('ly') ? '' : '')} interval(s)</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); setOpen(false) }}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createMutation.isPending ||
                  !title ||
                  !startLocal ||
                  (frequency !== 'NONE' && (!interval || parseInt(interval, 10) < 1))
                }
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateScheduledGameModal
