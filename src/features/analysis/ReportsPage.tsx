import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Printer } from 'lucide-react';
import { db } from '../../lib/db';
import { lapStats } from '../../lib/calc';
import { formatLapTime, fmtDate, fmtDateLong } from '../../lib/format';
import { sortSessions, STATUS_META } from '../../lib/sessions';
import { useWeekend } from '../../components/Layout';
import { Badge, Button, Card } from '../../components/ui';
import { Flag } from '../../components/FlagPicker';
import { exportWeekendBackup } from '../../lib/backup';

export default function ReportsPage() {
  const { id, weekend, sessions, cars, driversByCar, teamById } = useWeekend();

  const stints = useLiveQuery(async () => {
    const ids = cars.map((c) => c.id);
    return ids.length ? db.stints.where('carId').anyOf(ids).toArray() : [];
  }, [cars.map((c) => c.id).join('|')]) ?? [];
  const laps = useLiveQuery(async () => {
    const ids = cars.map((c) => c.id);
    return ids.length ? db.laps.where('carId').anyOf(ids).toArray() : [];
  }, [cars.map((c) => c.id).join('|')]) ?? [];
  const changes = useLiveQuery(async () => {
    const ids = cars.map((c) => c.id);
    return ids.length ? db.setupChanges.where('carId').anyOf(ids).toArray() : [];
  }, [cars.map((c) => c.id).join('|')]) ?? [];
  const tyres = useLiveQuery(async () => {
    const ids = cars.map((c) => c.id);
    return ids.length ? db.tyres.where('carId').anyOf(ids).toArray() : [];
  }, [cars.map((c) => c.id).join('|')]) ?? [];
  const notes = useLiveQuery(
    () => db.notes.where('weekendId').equals(id).toArray(),
    [id]
  ) ?? [];

  const sortedSessions = sortSessions(sessions);
  const notesSorted = notes.slice().sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-dim">Print the weekend debrief or export a backup file you can import on any other device.</p>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}><Printer size={14} /> Print report</Button>
          <Button variant="primary" onClick={() => exportWeekendBackup(id)}><Download size={14} /> Export backup (JSON)</Button>
        </div>
      </div>

      <div className="print-area space-y-4">
        {/* Header */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <img src="./icon.svg" alt="" className="h-8 w-8" />
                <h1 className="text-xl font-black">JOY PITWALL — Weekend Report</h1>
              </div>
              <p className="mt-1 text-sm font-semibold">{weekend.name} {weekend.round ? `· ${weekend.round}` : ''}</p>
              <p className="text-xs text-dim">
                {weekend.venue}
                {weekend.trackLengthKm ? ` · ${weekend.trackLengthKm} km` : ''} · {fmtDateLong(weekend.startDate)} → {fmtDate(weekend.endDate)}
              </p>
            </div>
            <div className="text-right text-xs text-dim">
              <div>Air {weekend.airTempC ?? '—'}°C · Track {weekend.trackTempC ?? '—'}°C · {weekend.weather ?? '—'}</div>
              <div>Grip: {weekend.grip ?? '—'} · Surface: {weekend.surface ?? '—'}</div>
              <div>Generated {new Date().toLocaleString()}</div>
            </div>
          </div>
        </Card>

        {/* Timetable */}
        <Card title="Timetable & flags">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
                <th className="py-1.5 pr-2">Day</th>
                <th className="px-2">Session</th>
                <th className="px-2">Time</th>
                <th className="px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((s) => (
                <tr key={s.id} className="border-b border-line/40">
                  <td className="py-1.5 pr-2 text-dim">{fmtDate(s.day)}</td>
                  <td className="px-2 font-semibold">{s.name}{s.category ? <span className="text-faint"> · {s.category}</span> : null}</td>
                  <td className="num px-2 text-dim">{s.start}–{s.end}</td>
                  <td className="px-2"><Badge color={STATUS_META[s.status].color}>{STATUS_META[s.status].label}</Badge></td>
                </tr>
              ))}
              {sortedSessions.length === 0 && <tr><td colSpan={4} className="py-2 text-xs text-faint">No sessions.</td></tr>}
            </tbody>
          </table>
        </Card>

        {/* Per car */}
        {cars.map((car) => {
          const carStints = stints.filter((s) => s.carId === car.id).sort((a, b) => a.createdAt - b.createdAt);
          const carLaps = laps.filter((l) => l.carId === car.id);
          const stats = lapStats(carLaps);
          const fuel = carStints.reduce((a, s) => a + (s.fuelAddedL ?? 0), 0);
          const carChanges = changes.filter((c) => c.carId === car.id).sort((a, b) => a.ts - b.ts);
          const carTyres = tyres.filter((t) => t.carId === car.id);
          return (
            <Card key={car.id} title={`Car #${car.number} — ${teamById[car.teamId]?.name ?? ''} (${car.class || '—'})`} subtitle={car.chassis}>
              <div className="mb-3 flex flex-wrap gap-3">
                <span className="text-xs text-dim">
                  Drivers:{' '}
                  {(driversByCar[car.id] ?? []).map((d, i) => (
                    <span key={d.id} className="ml-1.5 inline-flex items-center gap-1">
                      {i > 0 && '·'} <Flag code={d.country} /> {d.name}
                    </span>
                  ))}
                </span>
                <span className="num text-xs text-dim">Laps <b className="text-ink">{stats.count}</b></span>
                <span className="num text-xs text-dim">Best <b className="text-accent">{formatLapTime(stats.best)}</b></span>
                <span className="num text-xs text-dim">Avg <b className="text-ink">{formatLapTime(stats.avg)}</b></span>
                <span className="num text-xs text-dim">σ <b className="text-ink">{stats.sigma != null ? stats.sigma.toFixed(3) : '—'}</b></span>
                <span className="num text-xs text-dim">Fuel <b className="text-orange">{fuel.toFixed(0)} L</b></span>
              </div>

              {carStints.length > 0 && (
                <table className="mb-3 w-full text-xs">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
                      <th className="py-1 pr-2">Stint</th>
                      <th className="px-2">Driver</th>
                      <th className="px-2">Tyre</th>
                      <th className="px-2">Clock</th>
                      <th className="px-2 text-right">Laps</th>
                      <th className="px-2 text-right">Fuel</th>
                      <th className="px-2 text-right">Best</th>
                      <th className="px-2 text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carStints.map((s, i) => {
                      const sl = carLaps.filter((l) => l.stintId === s.id);
                      const ss = lapStats(sl);
                      const driver = (driversByCar[car.id] ?? []).find((d) => d.id === s.driverId);
                      return (
                        <tr key={s.id} className="border-b border-line/30">
                          <td className="num py-1 pr-2 text-dim">S{i + 1}</td>
                          <td className="px-2">{driver?.name ?? '—'}</td>
                          <td className="px-2">{s.compound ?? '—'}</td>
                          <td className="num px-2 text-dim">{s.startClock ?? '—'}–{s.endClock ?? '—'}</td>
                          <td className="num px-2 text-right">{ss.count}</td>
                          <td className="num px-2 text-right">{s.fuelAddedL ?? '—'}</td>
                          <td className="num px-2 text-right">{formatLapTime(ss.best)}</td>
                          <td className="num px-2 text-right">{formatLapTime(ss.avg)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {carChanges.length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-faint">Setup & part changes</h4>
                  {carChanges.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-2 py-0.5 text-xs">
                      <span className="text-faint">{new Date(c.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-semibold">{c.item}</span>
                      <span className="num text-dim">{c.from} → {c.to}</span>
                      <span className="text-faint">({c.type} · {c.sessionName} · w{c.weight})</span>
                      {c.resultDelta && <span className="num font-semibold">{c.resultDelta}s</span>}
                      {c.notes && <span className="text-faint">— {c.notes}</span>}
                    </div>
                  ))}
                </div>
              )}

              {carTyres.length > 0 && (
                <div>
                  <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-faint">Tyre reports ({carTyres.length})</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
                    {carTyres.map((t) => (
                      <span key={t.id}>
                        <b className="text-ink">{t.position}</b> {t.compound} · {t.coldPressure ?? '—'}→{t.hotPressure ?? '—'} psi · {t.graining}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Notes digest */}
        {notesSorted.length > 0 && (
          <Card title="Notes digest">
            {notesSorted.map((n) => (
              <div key={n.id} className="border-b border-line/30 py-1.5 text-xs last:border-0">
                <span className="mr-2 text-faint">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`mr-2 font-semibold ${n.author === 'Driver' ? 'text-accent2' : 'text-accent'}`}>{n.author}</span>
                {n.sessionName && <span className="mr-2 text-faint">[{n.sessionName}]</span>}
                <span>{n.text}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
