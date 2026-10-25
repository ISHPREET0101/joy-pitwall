// ---- Time / lap-time formatting & parsing helpers ----

/** Parse "1:23.456", "01:23.4", "83.45", "83" -> seconds (float). */
export function parseLapTime(s: string | undefined | null): number | null {
  if (!s) return null;
  const str = s.trim().replace(',', '.');
  if (!str) return null;
  const m = str.match(/^(?:(\d+):)(\d{1,2}(?:\.\d+)?)$|^(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  if (m[1] !== undefined) {
    const min = parseInt(m[1], 10);
    const sec = parseFloat(m[2]);
    if (sec >= 60) return null;
    return min * 60 + sec;
  }
  const v = parseFloat(m[3]);
  return isFinite(v) ? v : null;
}

/** 83.456 -> "1:23.456"; 42.318 -> "42.318" */
export function formatLapTime(t: number | undefined | null, decimals = 3): string {
  if (t == null || !isFinite(t)) return '—';
  const sign = t < 0 ? '-' : '';
  const v = Math.abs(t);
  const min = Math.floor(v / 60);
  const sec = v - min * 60;
  if (min > 0) {
    return `${sign}${min}:${sec.toFixed(decimals).padStart(decimals + 3, '0')}`;
  }
  return `${sign}${sec.toFixed(decimals)}`;
}

/** Signed delta seconds -> "+0.345" / "-0.123" */
export function formatDelta(t: number | undefined | null, decimals = 3): string {
  if (t == null || !isFinite(t)) return '—';
  const s = t > 0 ? '+' : t < 0 ? '-' : '±';
  return `${s}${Math.abs(t).toFixed(decimals)}`;
}

export function parseClock(s: string | undefined | null): number | null {
  // "HH:mm" or "HH:mm:ss" -> seconds since midnight
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = +m[1], mm = +m[2], ss = m[3] ? +m[3] : 0;
  if (h > 23 || mm > 59 || ss > 59) return null;
  return h * 3600 + mm * 60 + ss;
}

export function nowClockSeconds(d: Date = new Date()): number {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

/** seconds since midnight -> "HH:mm:ss" */
export function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/** seconds -> "1h 23m" / "45m 12s" / "12s" */
export function fmtDuration(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtDateLong(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtDayShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function num(v: string | number | undefined | null): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : undefined;
}

export function plural(n: number, one: string, many?: string): string {
  return n === 1 ? one : (many ?? one + 's');
}
