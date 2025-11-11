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
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function generateGoogleCalendarLink(sg: any) {
  const start = new Date(sg.startAt);
  const end = new Date(start.getTime() + (sg.durationMinutes || 30) * 60000);
  const fmt = (d: Date) => encodeURIComponent(d.toISOString().replace(/-|:|\.\d{3}/g, ''));
  const details = encodeURIComponent(sg.description || '');
  const text = encodeURIComponent(sg.title || 'Trivia Game');
  const location = encodeURIComponent(`${config.frontendBaseUrl}/groups/${sg.groupId}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${fmt(start)}/${fmt(end)}`;
}

function escapeIcsText(s: string) {
  return s.replace(/\\n/g, '\\n').replace(/,/g, '\\,');
}
