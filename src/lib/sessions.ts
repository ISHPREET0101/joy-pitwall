import type { TimetableSession, SessionStatus } from './types';
import { parseClock, nowClockSeconds, toISODate } from './format';

export const STATUS_META: Record<SessionStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: '#5f6f83' },
  green: { label: 'Green', color: '#2fd575' },
  yellow: { label: 'Yellow', color: '#ffd23e' },
  red: { label: 'Red Flag', color: '#ff4d5e' },
  black: { label: 'Black Flag', color: '#9aa7b8' },
  chequered: { label: 'Chequered', color: '#3ee1ff' },
  cancelled: { label: 'Cancelled', color: '#ff9a3d' },
};

export function sortSessions(list: TimetableSession[]): TimetableSession[] {
  return list
    .slice()
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        (parseClock(a.start) ?? 0) - (parseClock(b.start) ?? 0) ||
        a.order - b.order
    );
}

export function uniqueDays(list: TimetableSession[]): string[] {
  return Array.from(new Set(list.map((s) => s.day))).sort();
}

export function findCurrentSession(sessions: TimetableSession[], now: Date = new Date()): TimetableSession | null {
  const day = toISODate(now);
  const t = nowClockSeconds(now);
  return (
    sortSessions(sessions.filter((s) => s.day === day)).find((s) => {
      const st = parseClock(s.start) ?? 0;
      const en = parseClock(s.end) ?? 86399;
      return t >= st && t < en;
    }) ?? null
  );
}

export function findNextSession(sessions: TimetableSession[], now: Date = new Date()): TimetableSession | null {
  const sorted = sortSessions(sessions);
  const day = toISODate(now);
  const t = nowClockSeconds(now);
  return (
    sorted.find((s) => s.day > day || (s.day === day && (parseClock(s.start) ?? 0) > t)) ?? null
  );
}

/** Distinct session names used anywhere (stints, plans…) or from timetable. */
export function mergeSessionNames(timetable: TimetableSession[], used: string[]): string[] {
  const set = new Set<string>();
  for (const s of timetable) set.add(s.name);
  for (const u of used) if (u) set.add(u);
  return Array.from(set);
}
