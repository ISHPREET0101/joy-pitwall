import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Flag, Plus, Trash2, Upload } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { db, uid } from '../../lib/db';
import type { SessionStatus, TimetableSession } from '../../lib/types';
import { SESSION_STATUSES } from '../../lib/types';
import { sortSessions, uniqueDays, findCurrentSession, STATUS_META } from '../../lib/sessions';
import { parseClock, fmtClock, fmtDate, fmtDayShort, nowClockSeconds, toISODate } from '../../lib/format';
import { csvToSessions, resolveDay, downloadTimetableCsv } from '../../lib/csv';
import { useNow } from '../../lib/hooks';
import { Badge, Button, Card, Input, SectionTitle } from '../../components/ui';

const QUICK_FLAGS: SessionStatus[] = ['scheduled', 'green', 'yellow', 'red', 'black', 'chequered', 'cancelled'];

export default function TimetablePage() {
  const { id, sessions } = useWeekend();
  const now = useNow(1000);
  const today = toISODate(now);
  const days = useMemo(() => {
    const d = uniqueDays(sessions);
    return d.length ? d : [today];
  }, [sessions, today]);
  const [day, setDay] = useState<string>(days[0]);
  useEffect(() => {
    if (!days.includes(day)) setDay(days[0]);
  }, [days, day]);

  const csvRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string>('');

  const daySessions = sortSessions(sessions.filter((s) => s.day === day));
  const current = findCurrentSession(sessions, now);
  // Race control targets an operator-picked session, defaulting to the live one
  const [rcId, setRcId] = useState('');
  const rcSession = sessions.find((s) => s.id === rcId) ?? current;

  async function addSession(d: string) {
    const order = sessions.filter((s) => s.day === d).length;
    await db.sessions.add({
      id: uid(), weekendId: id, day: d, name: 'New session',
      start: '10:00', end: '11:00', status: 'scheduled', order,
    });
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const { rows, errors } = csvToSessions(text);
    if (!rows.length) {
      setImportMsg(`Nothing imported. ${errors[0] ?? ''}`);
      return;
    }
    let n = 0;
    let order = sessions.length;
    for (const r of rows) {
      const d = resolveDay(r.day, days, day);
      await db.sessions.add({
        id: uid(), weekendId: id, day: d, name: r.name,
        start: parseClock(r.start) != null ? r.start : '10:00',
        end: parseClock(r.end) != null ? r.end : '11:00',
        status: 'scheduled', category: r.category, order: order++,
      });
      n++;
    }
    setImportMsg(`Imported ${n} session${n === 1 ? '' : 's'}${errors.length ? ` · ${errors.length} rows skipped` : ''}`);
    if (csvRef.current) csvRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      {/* Race control */}
      <Card
        title="Race control"
        subtitle="Set the live flag state for any session — shown across the app"
        right={<Flag size={15} className="text-faint" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="field !w-auto min-w-48"
            value={rcSession?.id ?? ''}
            onChange={(e) => setRcId(e.target.value)}
          >
            <option value="" disabled>Pick session…</option>
            {sortSessions(sessions).map((s) => (
              <option key={s.id} value={s.id}>
                {s.day === today ? 'Today' : fmtDayShort(s.day)} {s.start} — {s.name}
                {current?.id === s.id ? ' (live)' : ''}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FLAGS.map((f) => {
              const active = rcSession && rcSession.status === f;
              return (
                <button
                  key={f}
                  disabled={!rcSession}
                  onClick={() => rcSession && db.sessions.update(rcSession.id, { status: f })}
                  className="btn !px-3 !py-1.5 text-xs font-bold"
                  style={{
                    background: active ? STATUS_META[f].color : `${STATUS_META[f].color}18`,
                    color: active ? '#0a0d05' : STATUS_META[f].color,
                    border: `1px solid ${STATUS_META[f].color}55`,
                  }}
                >
                  {STATUS_META[f].label}
                </button>
              );
            })}
          </div>
          {rcSession && (
            <span className="num ml-auto text-xs text-dim">
              {rcSession.day === today ? 'Today' : rcSession.day} {rcSession.start}–{rcSession.end}
              {current?.id === rcSession.id && (
                <> · {Math.floor((nowClockSeconds(now) - (parseClock(current.start) ?? 0)) / 60)} min elapsed</>
              )}
            </span>
          )}
        </div>
      </Card>

      {/* Day tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {days.map((d) => {
          const count = sessions.filter((s) => s.day === d).length;
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                day === d ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line text-dim hover:text-ink'
              }`}
            >
              {fmtDayShort(d)} {fmtDate(d).split(',')[1]?.trim() ?? d}
              {isToday && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
              <span className="num ml-1.5 text-faint">{count}</span>
            </button>
          );
        })}
        <button
          className="btn btn-ghost !px-2 text-xs"
          title="Add another day"
          onClick={async () => {
            const last = days[days.length - 1];
            const nd = toISODate(new Date(new Date(last + 'T00:00:00').getTime() + 86400000));
            await addSession(nd);
            setDay(nd);
          }}
        >
          <Plus size={13} /> day
        </button>
        <div className="ml-auto flex items-center gap-2">
          {importMsg && <span className="text-[11px] text-dim">{importMsg}</span>}
          <Button onClick={() => csvRef.current?.click()} className="!py-1.5 !text-xs">
            <Upload size={13} /> Import CSV
          </Button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => importCsv(e.target.files?.[0])}
          />
          <Button
            onClick={() => downloadTimetableCsv(sortSessions(sessions), 'timetable.csv')}
            className="!py-1.5 !text-xs"
          >
            <Download size={13} /> Export
          </Button>
        </div>
      </div>

      {/* Sessions */}
      <Card bodyClass="pt-1">
        {daySessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-dim">
            No sessions on this day.
            <button className="btn btn-primary ml-3 !py-1.5 !text-xs" onClick={() => addSession(day)}>
              <Plus size={13} /> Add session
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 pt-2">
            {daySessions.map((s) => {
              const meta = STATUS_META[s.status];
              const isCurrent = current?.id === s.id;
              const startSec = parseClock(s.start) ?? 0;
              const endSec = parseClock(s.end) ?? 0;
              const nowSec = nowClockSeconds(now);
              const done = nowSec >= endSec;
              return (
                <div
                  key={s.id}
                  className={`group relative flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                    isCurrent ? 'border-accent/30 bg-accent/[0.04]' : 'border-line bg-panel2/40 hover:border-line2'
                  }`}
                >
                  {isCurrent && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                  <div className="num flex w-36 shrink-0 items-center gap-1 text-xs">
                    <input
                      className="field !w-14 !px-1.5 !py-1 text-center"
                      value={s.start}
                      onChange={(e) => db.sessions.update(s.id, { start: e.target.value })}
                    />
                    <span className="text-faint">–</span>
                    <input
                      className="field !w-14 !px-1.5 !py-1 text-center"
                      value={s.end}
                      onChange={(e) => db.sessions.update(s.id, { end: e.target.value })}
                    />
                  </div>
                  <input
                    className="field !w-auto min-w-40 flex-1 !py-1 font-semibold"
                    value={s.name}
                    onChange={(e) => db.sessions.update(s.id, { name: e.target.value })}
                  />
                  <input
                    className="field !w-28 !py-1 text-xs"
                    value={s.category ?? ''}
                    placeholder="Category"
                    onChange={(e) => db.sessions.update(s.id, { category: e.target.value })}
                  />
                  <select
                    className="field !w-32 !py-1 text-xs font-semibold"
                    style={{ color: meta.color, borderColor: `${meta.color}44` }}
                    value={s.status}
                    onChange={(e) => db.sessions.update(s.id, { status: e.target.value as SessionStatus })}
                  >
                    {SESSION_STATUSES.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                  {isCurrent && <Badge color="#d6fa3e" dot>Live</Badge>}
                  {done && !isCurrent && s.status !== 'chequered' && s.status !== 'cancelled' && (
                    <span className="text-[10px] uppercase tracking-wide text-faint">ended</span>
                  )}
                  <button
                    className="btn btn-ghost !p-1.5 opacity-0 transition group-hover:opacity-100 hover:!text-red"
                    title="Delete session"
                    onClick={() => window.confirm(`Delete "${s.name}"?`) && db.sessions.delete(s.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 border-t border-line pt-3">
          <Button variant="primary" onClick={() => addSession(day)}>
            <Plus size={14} /> Add session
          </Button>
        </div>
      </Card>

      <SectionTitle>CSV format</SectionTitle>
      <p className="text-xs text-faint">
        Columns: <span className="num text-dim">day, session, start, end, category</span> — day accepts{' '}
        <span className="num">yyyy-mm-dd</span>, <span className="num">dd/mm</span> or a weekday name like{' '}
        <span className="num">Saturday</span>. Times are 24h <span className="num">HH:mm</span>.
      </p>
    </div>
  );
}
