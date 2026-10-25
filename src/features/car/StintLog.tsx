import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Fuel, Plus, Timer, Trash2 } from 'lucide-react';
import { db, uid } from '../../lib/db';
import type { Lap, Stint } from '../../lib/types';
import { COMPOUNDS } from '../../lib/types';
import { mergeSessionNames } from '../../lib/sessions';
import {
  parseLapTime, formatLapTime, parseClock, fmtClock, fmtDuration, num,
} from '../../lib/format';
import { lapStats } from '../../lib/calc';
import { useWeekend } from '../../components/Layout';
import { Badge, Button, Card, EmptyState, Input, Select, Stat } from '../../components/ui';
import { Flag } from '../../components/FlagPicker';

export default function StintLog({ carId }: { carId: string }) {
  const { id: weekendId, sessions, driversByCar } = useWeekend();
  const drivers = driversByCar[carId] ?? [];

  const stints = useLiveQuery(
    () => db.stints.where('carId').equals(carId).toArray(),
    [carId]
  ) ?? [];
  const laps = useLiveQuery(
    () => db.laps.where('carId').equals(carId).toArray(),
    [carId]
  ) ?? [];

  const sessionNames = useMemo(
    () => mergeSessionNames(sessions, stints.map((s) => s.sessionName)),
    [sessions, stints]
  );
  const [sessionName, setSessionName] = useState('');

  const effSession = sessionName || sessionNames[0] || 'Session 1';
  const sessionStints = stints
    .filter((s) => s.sessionName === effSession)
    .sort((a, b) => a.createdAt - b.createdAt);
  const sessionLaps = laps.filter((l) => sessionStints.some((s) => s.id === l.stintId));

  const totals = lapStats(sessionLaps);
  const totalFuel = sessionStints.reduce((a, s) => a + (s.fuelAddedL ?? 0), 0);

  async function addStint() {
    await db.stints.add({
      id: uid(),
      carId,
      sessionName: effSession,
      driverId: drivers[0]?.id,
      compound: 'Medium',
      createdAt: Date.now(),
    });
  }

  return (
    <div className="space-y-4">
      {/* Session picker + totals */}
      <Card bodyClass="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Timer size={15} className="text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-dim">Session</span>
          </div>
          <div>
            <input
              className="field !w-64 font-semibold"
              list="session-names"
              value={sessionName || (sessionNames[0] ?? '')}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. Free Practice"
            />
            <datalist id="session-names">
              {sessionNames.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <Button onClick={addStint} variant="primary">
            <Plus size={14} /> New stint
          </Button>
          <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Laps" value={totals.count} />
            <Stat label="Best" value={formatLapTime(totals.best)} accent="#d6fa3e" />
            <Stat label="Avg (timed)" value={formatLapTime(totals.avg)} accent="#3ee1ff" />
            <Stat label="Fuel added" value={`${totalFuel.toFixed(0)} L`} accent="#ff9a3d" />
          </div>
        </div>
      </Card>

      {sessionStints.length === 0 ? (
        <EmptyState
          icon={<Fuel size={20} />}
          title={`No stints logged for "${effSession}"`}
          hint="Add a stint, then log laps as the car runs — out lap, timed laps, in lap, fuel added."
          action={<Button variant="primary" onClick={addStint}><Plus size={14} /> New stint</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sessionStints.map((stint, idx) => (
            <StintCard
              key={stint.id}
              stint={stint}
              index={idx}
              nextStint={sessionStints[idx + 1]}
              allLaps={laps.filter((l) => l.stintId === stint.id).sort((a, b) => a.lapNo - b.lapNo)}
              drivers={drivers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StintCard({
  stint, index, nextStint, allLaps, drivers,
}: {
  stint: Stint;
  index: number;
  nextStint?: Stint;
  allLaps: Lap[];
  drivers: { id: string; name: string; country: string }[];
}) {
  const [quick, setQuick] = useState('');
  const [badInput, setBadInput] = useState(false);
  const stats = lapStats(allLaps);
  const fuelLap = stint.fuelAddedL && stats.count ? stint.fuelAddedL / stats.count : undefined;

  const pitSec = useMemo(() => {
    if (!nextStint) return undefined;
    const end = parseClock(stint.endClock);
    const start = parseClock(nextStint.startClock);
    if (end == null || start == null) return undefined;
    let d = start - end;
    if (d < 0) d += 86400; // crossed midnight
    return d;
  }, [stint.endClock, nextStint]);

  async function addLap(raw: string) {
    if (!raw.trim()) return;
    const t = parseLapTime(raw);
    if (t == null) {
      setBadInput(true);
      return;
    }
    setBadInput(false);
    const lapNo = allLaps.length ? Math.max(...allLaps.map((l) => l.lapNo)) + 1 : 1;
    await db.laps.add({
      id: uid(),
      stintId: stint.id,
      carId: stint.carId,
      lapNo,
      timeSec: t,
      isOut: allLaps.length === 0,
      createdAt: Date.now(),
    });
    setQuick('');
  }

  return (
    <div className="card overflow-hidden">
      {/* Stint header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel2/50 px-3.5 py-2.5">
        <span className="num rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">S{index + 1}</span>
        <Select
          className="!w-44 !py-1"
          value={stint.driverId ?? ''}
          onChange={(e) => db.stints.update(stint.id, { driverId: e.target.value || undefined })}
        >
          <option value="">Driver…</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select
          className="!w-32 !py-1"
          value={stint.compound ?? ''}
          onChange={(e) => db.stints.update(stint.id, { compound: e.target.value })}
        >
          <option value="">Compound…</option>
          {COMPOUNDS.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <div className="flex items-center gap-1">
          <Fuel size={13} className="text-orange" />
          <input
            className="field num !w-20 !py-1 text-right"
            defaultValue={stint.fuelAddedL ?? ''}
            placeholder="Fuel L"
            onBlur={(e) => db.stints.update(stint.id, { fuelAddedL: num(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-1 text-[11px] text-faint">
          out
          <input
            className="field num !w-20 !py-1 text-center"
            defaultValue={stint.startClock ?? ''}
            placeholder="HH:mm:ss"
            onBlur={(e) => db.stints.update(stint.id, { startClock: e.target.value || undefined })}
          />
          in
          <input
            className="field num !w-20 !py-1 text-center"
            defaultValue={stint.endClock ?? ''}
            placeholder="HH:mm:ss"
            onBlur={(e) => db.stints.update(stint.id, { endClock: e.target.value || undefined })}
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px]">
          <Badge color="#94a3b8">{stats.count} laps</Badge>
          <Badge color="#d6fa3e">best {formatLapTime(stats.best)}</Badge>
          <Badge color="#3ee1ff">avg {formatLapTime(stats.avg)}</Badge>
          {fuelLap != null && <Badge color="#ff9a3d">{fuelLap.toFixed(2)} L/lap</Badge>}
          {pitSec != null && <Badge color="#b18cff">pit {fmtDuration(pitSec)}</Badge>}
          <button
            className="btn btn-ghost !p-1.5 hover:!text-red"
            title="Delete stint"
            onClick={() =>
              window.confirm('Delete this stint and all its laps?') &&
              db.transaction('rw', db.laps, db.stints, async () => {
                await db.laps.where('stintId').equals(stint.id).delete();
                await db.stints.delete(stint.id);
              })
            }
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Laps table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
              <th className="px-3 py-1.5 font-semibold">Lap</th>
              <th className="px-3 py-1.5 font-semibold">Time</th>
              <th className="px-3 py-1.5 font-semibold">Type</th>
              <th className="px-3 py-1.5 font-semibold">Note</th>
              <th className="px-3 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {allLaps.map((lap) => {
              const delta = stats.best != null && lap.timeSec != null && !lap.isOut && !lap.isIn ? lap.timeSec - stats.best : undefined;
              return (
                <tr key={lap.id} className="group border-b border-line/50 hover:bg-white/[0.02]">
                  <td className="num px-3 py-1 text-dim">{lap.lapNo}</td>
                  <td className="px-3 py-1">
                    <input
                      key={`${lap.id}-${lap.timeSec}`}
                      className={`field num !w-24 !px-2 !py-0.5 text-right ${badInput ? '!border-red' : ''}`}
                      defaultValue={lap.timeSec != null ? formatLapTime(lap.timeSec) : ''}
                      placeholder="m:ss.mmm"
                      onBlur={(e) => {
                        const t = e.target.value.trim() ? parseLapTime(e.target.value) : undefined;
                        if (e.target.value.trim() && t == null) { setBadInput(true); return; }
                        setBadInput(false);
                        db.laps.update(lap.id, { timeSec: t ?? undefined });
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => db.laps.update(lap.id, { isOut: !lap.isOut })}
                        className={`chip !px-1.5 ${lap.isOut ? '!bg-accent2/20 !text-accent2 !border-accent2/50' : 'text-faint border border-line hover:text-dim'}`}
                        title="Out lap"
                      >
                        OUT
                      </button>
                      <button
                        onClick={() => db.laps.update(lap.id, { isIn: !lap.isIn })}
                        className={`chip !px-1.5 ${lap.isIn ? '!bg-purple/20 !text-purple !border-purple/50' : 'text-faint border border-line hover:text-dim'}`}
                        title="In lap"
                      >
                        IN
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-1">
                    <input
                      className="field !w-full min-w-32 !border-transparent !bg-transparent !px-2 !py-0.5 text-xs hover:!border-line"
                      defaultValue={lap.notes ?? ''}
                      placeholder="—"
                      onBlur={(e) => db.laps.update(lap.id, { notes: e.target.value || undefined })}
                    />
                  </td>
                  <td className="px-3 py-1 text-right">
                    {delta != null && (
                      <span className={`num mr-2 text-[11px] ${delta <= 0.5 ? 'text-green' : 'text-faint'}`}>
                        {delta === 0 ? 'BEST' : `+${delta.toFixed(3)}`}
                      </span>
                    )}
                    <button
                      className="btn btn-ghost !p-1 opacity-0 group-hover:opacity-100 hover:!text-red"
                      onClick={() => db.laps.delete(lap.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick add */}
      <div className="flex items-center gap-2 border-t border-line bg-panel2/30 px-3.5 py-2">
        <Plus size={14} className="text-faint" />
        <input
          className="field num !w-36"
          value={quick}
          onChange={(e) => { setQuick(e.target.value); setBadInput(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') addLap(quick); }}
          placeholder="1:42.35 — Enter"
          style={badInput ? { borderColor: '#ff4d5e' } : undefined}
        />
        <span className="text-[11px] text-faint">
          lap {allLaps.length ? Math.max(...allLaps.map((l) => l.lapNo)) + 1 : 1}
          {stint.fuelAddedL ? ` · ~${((stint.fuelAddedL / Math.max(1, allLaps.length)) ).toFixed(2)} L/lap` : ''}
        </span>
        {stint.startClock && (
          <span className="num ml-auto text-[11px] text-faint">
            stint {fmtClock(parseClock(stint.startClock) ?? 0)} → {stint.endClock ? fmtClock(parseClock(stint.endClock) ?? 0) : '…'}
          </span>
        )}
      </div>

      {/* Driver hint */}
      {drivers.length > 1 && stint.driverId && (
        <div className="flex items-center gap-1.5 px-3.5 pb-2 text-[11px] text-faint">
          Driving: {drivers.find((d) => d.id === stint.driverId)?.name ?? '—'}
          <Flag code={drivers.find((d) => d.id === stint.driverId)?.country} />
        </div>
      )}
    </div>
  );
}
