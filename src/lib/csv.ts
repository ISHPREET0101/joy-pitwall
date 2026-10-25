import type { TimetableSession } from './types';
import { uid } from './db';
import { downloadBlob } from './image';

/** Parse CSV text -> rows of cells (handles quoted cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim()); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

export interface CsvSessionRow { day: string; name: string; start: string; end: string; category?: string }

/**
 * Import a timetable CSV. Accepted headers (any order, case-insensitive):
 * day/date, session/name, start, end, category/type
 * Day accepts yyyy-mm-dd or dd/mm or "Saturday".
 */
export function csvToSessions(text: string): { rows: CsvSessionRow[]; errors: string[] } {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const out: CsvSessionRow[] = [];
  if (!rows.length) return { rows: out, errors: ['File is empty'] };
  const header = rows[0].map((h) => h.toLowerCase());
  const find = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const iDay = find('day', 'date');
  const iName = find('session', 'name');
  const iStart = find('start');
  const iEnd = find('end');
  const iCat = find('category', 'type', 'class');
  if (iName === -1 || iStart === -1) {
    // no header? assume day,name,start,end
    for (const r of rows) {
      if (r.length >= 3) out.push({ day: r[0], name: r[1], start: r[2], end: r[3] ?? r[2] });
    }
    return { rows: out, errors };
  }
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = r[iName];
    const start = r[iStart];
    if (!name || !start) { errors.push(`Row ${i + 1}: missing name or start`); continue; }
    out.push({
      day: iDay >= 0 ? r[iDay] : '',
      name,
      start,
      end: iEnd >= 0 ? r[iEnd] : start,
      category: iCat >= 0 ? r[iCat] : undefined,
    });
  }
  return { rows: out, errors };
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export function resolveDay(raw: string, weekendDays: string[], fallback: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // dd/mm or d/m
  const m = v.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.]\d{2,4})?$/);
  if (m) {
    const year = new Date().getFullYear();
    const d = new Date(year, +m[2] - 1, +m[1]);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return iso;
  }
  const dayIdx = DAYS.findIndex((d) => v.startsWith(d.slice(0, 3)));
  if (dayIdx >= 0) {
    const hit = weekendDays.find((iso) => new Date(iso + 'T00:00:00').getDay() === dayIdx);
    if (hit) return hit;
  }
  return fallback;
}

export function sessionsToCsv(sessions: TimetableSession[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ['day,session,start,end,category,status'];
  for (const s of sessions) {
    lines.push([s.day, esc(s.name), s.start, s.end, s.category ?? '', s.status].join(','));
  }
  return lines.join('\n');
}

export function downloadTimetableCsv(sessions: TimetableSession[], filename: string) {
  downloadBlob(filename, sessionsToCsv(sessions), 'text/csv');
}
