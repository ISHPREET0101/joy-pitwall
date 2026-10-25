import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, ChevronRight, ClipboardList, CloudSun, Flag, Hash } from 'lucide-react';
import { useWeekend, carSortKey } from '../../components/Layout';
import { db } from '../../lib/db';
import { useNow } from '../../lib/hooks';
import { toISODate, fmtClock, parseClock, nowClockSeconds, fmtDuration, formatLapTime, fmtDate } from '../../lib/format';
import { findCurrentSession, findNextSession, STATUS_META } from '../../lib/sessions';
import type { SessionStatus } from '../../lib/types';
import { Badge, Button, Card, Stat } from '../../components/ui';
import { Clock } from '../../components/Clock';
import { Flag as FlagIcon } from '../../components/FlagPicker';
import { lapStats } from '../../lib/calc';

const QUICK_FLAGS: SessionStatus[] = ['green', 'yellow', 'red', 'black', 'chequered'];

export default function OverviewPage() {
  const { id, weekend, sessions, cars, driversByCar, teamById } = useWeekend();
  const now = useNow(1000);
  const today = toISODate(now);

  const current = findCurrentSession(sessions, now);
  const next = findNextSession(sessions, now);

  const stints = useLiveQuery(async () => {
    if (!cars.length) return [];
    const ids = cars.map((c) => c.id);
    return db.stints.where('carId').anyOf(ids).toArray();
  }, [cars.map((c) => c.id).join('|')]) ?? [];
  const laps = useLiveQuery(async () => {
    if (!cars.length) return [];
    const ids = cars.map((c) => c.id);
    return db.laps.where('carId').anyOf(ids).toArray();
  }, [cars.map((c) => c.id).join('|')]) ?? [];

  const checklist = useLiveQuery(
    () => db.checklists.where('[weekendId+day]').equals([id, today]).toArray(),
    [id, today]
  ) ?? [];
  const chkDone = checklist.filter((c) => c.done).length;

  const latestNote = useLiveQuery(
    async () => {
      const n = await db.notes.where('weekendId').equals(id).toArray();
      return n.sort((a, b) => b.createdAt - a.createdAt)[0];
    },
    [id]
  );

  const activeSessionName = current?.name ?? next?.name ?? '—';

  return (
    <div className="space-y-4">
      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
        <Card bodyClass="flex flex-col items-center justify-center py-6">
          <Clock size="lg" />
          <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-faint">Local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        </Card>

        <Card title="Race control" subtitle={activeSessionName} bodyClass="pt-1">
          {current ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full live-dot" style={{ background: STATUS_META[current.status].color }} />
                <span className="text-sm font-semibold">{current.name}</span>
                <span className="num text-xs text-dim">{current.start}–{current.end}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FLAGS.map((f) => (
                  <button
                    key={f}
                    onClick={() => db.sessions.update(current.id, { status: f })}
                    className="btn !px-3 !py-1.5 text-xs font-bold"
                    style={{
                      background: current.status === f ? STATUS_META[f].color : `${STATUS_META[f].color}18`,
                      color: current.status === f ? '#0a0d05' : STATUS_META[f].color,
                      border: `1px solid ${STATUS_META[f].color}55`,
                    }}
                  >
                    {STATUS_META[f].label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-faint">
                Ends at <span className="num">{current.end}</span> — {fmtDuration(Math.max(0, (parseClock(current.end) ?? 0) - nowClockSeconds(now)))} remaining
              </div>
            </>
          ) : next ? (
            <div>
              <div className="mb-2 text-xs text-dim">No session live right now. Next up:</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{next.name}</span>
                <Badge color={STATUS_META[next.status].color}>{STATUS_META[next.status].label}</Badge>
              </div>
              <div className="num mt-1 text-sm text-accent">
                {next.day === today ? 'Today' : fmtDate(next.day)} {next.start} · in{' '}
                {fmtDuration(
                  Math.max(
                    0,
                    (Math.round((new Date(next.day + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000) * 86400) +
                      (parseClock(next.start) ?? 0) -
                      nowClockSeconds(now)
                  )
                )}
              </div>
              <Link to="timetable" className="btn btn-ghost mt-3 !px-2 text-xs">
                Open timetable <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="text-xs text-dim">
              No sessions in the timetable yet.{' '}
              <Link to="timetable" className="text-accent hover:underline">Add sessions →</Link>
            </div>
          )}
        </Card>

        <Card
          title="Conditions"
          subtitle={weekend.venue}
          right={<CloudSun size={15} className="text-faint" />}
          bodyClass="grid grid-cols-2 gap-2 pt-1"
        >
          <Stat label="Air" value={weekend.airTempC != null ? `${weekend.airTempC}°C` : '—'} />
          <Stat label="Track" value={weekend.trackTempC != null ? `${weekend.trackTempC}°C` : '—'} accent="#ff9a3d" />
          <Stat label="Weather" value={weekend.weather ?? '—'} />
          <Stat label="Grip" value={weekend.grip ?? '—'} accent="#3ee1ff" />
          <Link to="conditions" className="btn btn-ghost col-span-2 !px-2 text-xs">
            Edit conditions <ChevronRight size={14} />
          </Link>
        </Card>
      </div>

      {/* Cars */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
            <span className="h-3 w-1 rounded-full bg-accent" /> Cars on the weekend
          </h3>
          <Link to="garage" className="btn btn-ghost !px-2 text-xs">Garage <ChevronRight size={14} /></Link>
        </div>
        {cars.length === 0 ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 py-2">
              <p className="text-sm text-dim">No cars yet — set up your teams, cars and drivers first.</p>
              <Link to="garage" className="btn btn-primary">Open garage</Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cars.slice().sort((a, b) => carSortKey(a) - carSortKey(b)).map((car) => {
              const carLaps = laps.filter((l) => l.carId === car.id);
              const s = lapStats(carLaps);
              const carStints = stints.filter((x) => x.carId === car.id);
              const fuel = carStints.reduce((a, x) => a + (x.fuelAddedL ?? 0), 0);
              const team = teamById[car.teamId];
              return (
                <Link key={car.id} to={`car/${car.id}`} className="card hoverable relative overflow-hidden p-4">
                  <div className="absolute inset-y-0 left-0 w-1" style={{ background: team?.color ?? '#5f6f83' }} />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="num flex h-10 w-12 items-center justify-center rounded-lg border border-line2 bg-panel2 text-lg font-black" style={{ color: team?.color }}>
                        {car.number}
                      </span>
                      <div>
                        <div className="text-sm font-bold">{car.class || 'Car'}</div>
                        <div className="text-[11px] text-dim">{team?.name} · {car.chassis}</div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-faint" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(driversByCar[car.id] ?? []).map((d) => (
                      <span key={d.id} className="flex items-center gap-1 rounded-md bg-panel2 px-1.5 py-0.5 text-[11px] text-dim">
                        <FlagIcon code={d.country} /> {d.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat label="Laps" value={s.count} />
                    <Stat label="Best" value={<span className="text-base">{formatLapTime(s.best)}</span>} accent="#d6fa3e" />
                    <Stat label="Fuel" value={`${fuel.toFixed(0)} L`} accent="#ff9a3d" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Pre-session checklist — today"
          subtitle={`${chkDone}/${checklist.length} complete`}
          right={<ClipboardList size={15} className="text-faint" />}
        >
          {checklist.length === 0 ? (
            <div className="text-xs text-dim">
              Nothing scheduled for today. <Link to="checklists" className="text-accent hover:underline">Build the checklist →</Link>
            </div>
          ) : (
            <>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-panel3">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${checklist.length ? (chkDone / checklist.length) * 100 : 0}%` }} />
              </div>
              <div className="space-y-1">
                {checklist.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => db.checklists.update(c.id, { done: !c.done, doneAt: !c.done ? Date.now() : undefined })}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-white/[0.03]"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${c.done ? 'border-accent bg-accent text-black' : 'border-line2'}`}>
                      {c.done && '✓'}
                    </span>
                    <span className={c.done ? 'text-faint line-through' : 'text-dim'}>{c.text}</span>
                  </button>
                ))}
              </div>
              {checklist.length > 5 && (
                <Link to="checklists" className="btn btn-ghost mt-2 !px-2 text-xs">All {checklist.length} items <ChevronRight size={13} /></Link>
              )}
            </>
          )}
        </Card>

        <Card title="Latest note" right={<Link to="notes" className="btn btn-ghost !px-2 text-xs">All notes <ChevronRight size={13} /></Link>}>
          {latestNote ? (
            <div className="text-xs">
              <div className="mb-1 flex items-center gap-2">
                <Badge color={latestNote.author === 'Driver' ? '#3ee1ff' : '#d6fa3e'}>{latestNote.author}</Badge>
                <span className="text-faint">{new Date(latestNote.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-dim leading-relaxed">{latestNote.text}</p>
            </div>
          ) : (
            <div className="text-xs text-dim">No notes yet.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
