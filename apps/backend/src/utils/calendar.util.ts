import { config } from '../config/env';

export function generateIcsForScheduledGame(sg: any) {
  // Minimal ICS generator — consumers can download and import into calendars
  const start = new Date(sg.startAt);
  const end = new Date(start.getTime() + (sg.durationMinutes || 30) * 60000);
  const uid = `sg-${sg.id}@${config.frontendBaseUrl.replace(/^https?:\/\//, '')}`;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const toIcsDate = (d: Date) => {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//trivia-app//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(sg.title)}`,
    `DESCRIPTION:${escapeIcsText(sg.description || '')}`,
    `URL:${config.frontendBaseUrl}/groups/${sg.groupId}`,
  ];

  const rrule = buildRRule(sg?.recurrence);
  if (rrule) {
    lines.push(`RRULE:${rrule}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

export function generateGoogleCalendarLink(sg: any) {
  const start = new Date(sg.startAt);
  const end = new Date(start.getTime() + (sg.durationMinutes || 30) * 60000);
  const fmt = (d: Date) => encodeURIComponent(d.toISOString().replace(/-|:|\.\d{3}/g, ''));
  const details = encodeURIComponent(sg.description || '');
  const text = encodeURIComponent(sg.title || 'Trivia Game');
  const location = encodeURIComponent(`${config.frontendBaseUrl}/groups/${sg.groupId}`);
  const rrule = buildRRule(sg?.recurrence);
  const recurParam = rrule ? `&recur=${encodeURIComponent(`RRULE:${rrule}`)}` : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${fmt(start)}/${fmt(end)}${recurParam}`;
}

function escapeIcsText(s: string) {
  return s.replace(/\\n/g, '\\n').replace(/,/g, '\\,');
}

function buildRRule(recurrence: any): string | null {
  if (!recurrence) return null;
  const type = String(recurrence.type || '').toUpperCase();
  if (!type || type === 'NONE' || type === 'ONE_TIME') return null;
  const intervalNum = Number(recurrence.interval);
  const interval = Number.isFinite(intervalNum) && intervalNum > 0 ? intervalNum : 1;

  const allowed = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
  const freq = allowed.has(type) ? type : 'WEEKLY';

  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`];

  if (Array.isArray(recurrence.byDay) && recurrence.byDay.length > 0) {
    const byday = recurrence.byDay
      .map((d: string) => String(d || '').toUpperCase().slice(0, 2))
      .filter((d: string) => ['MO','TU','WE','TH','FR','SA','SU'].includes(d));
    if (byday.length > 0) parts.push(`BYDAY=${byday.join(',')}`);
  }

  if (Number.isFinite(recurrence.count) && recurrence.count > 0) {
    parts.push(`COUNT=${recurrence.count}`);
  } else if (recurrence.until) {
    const untilDate = new Date(recurrence.until);
    if (!isNaN(untilDate.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const toIcsDate = (d: Date) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
      parts.push(`UNTIL=${toIcsDate(untilDate)}`);
    }
  }

  return parts.join(';');
}
