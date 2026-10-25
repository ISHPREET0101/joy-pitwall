import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users } from 'lucide-react';
import { db } from '../../lib/db';
import type { Lap, Stint } from '../../lib/types';
import { lapStats, normalize } from '../../lib/calc';
import { formatLapTime } from '../../lib/format';
import { mergeSessionNames } from '../../lib/sessions';
import { useWeekend } from '../../components/Layout';
import { Card, EmptyState, Select, Stat } from '../../components/ui';
import { Flag } from '../../components/FlagPicker';

const COLORS = ['#d6fa3e', '#3ee1ff', '#ff9a3d', '#b18cff', '#ff4d5e', '#2fd575'];

export default function ComparePage() {
  const { id: weekendId, cars, driversByCar, sessions } = useWeekend();

  const [carFilter, setCarFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [wPace, setWPace] = useState(50);
  const [wConsistency, setWConsistency] = useState(30);
  const [wVolume, setWVolume] = useState(20);

  const carIds = (carFilter === 'all' ? cars.map((c) => c.id) : [carFilter]).filter(Boolean);

  const stints = useLiveQuery(
    () => (carIds.length ? db.stints.where('carId').anyOf(carIds).toArray() : Promise.resolve([] as Stint[])),
    [carIds.join('|')]
  ) ?? [];
  const laps = useLiveQuery(
    () => (carIds.length ? db.laps.where('carId').anyOf(carIds).toArray() : Promise.resolve([] as Lap[])),
    [carIds.join('|')]
  ) ?? [];

  const sessionNames = useMemo(
    () => mergeSessionNames(sessions, Array.from(new Set(stints.map((s) => s.sessionName)))),
    [sessions, stints]
  );

  const rows = useMemo(() => {
    const out: {
      driverId: string; name: string; country: string; carId: string; carNumber: string;
      stats: ReturnType<typeof lapStats>; lapsThis: typeof laps;
    }[] = [];
    for (const car of cars) {
      if (carFilter !== 'all' && car.id !== carFilter) continue;
      for (const driver of driversByCar[car.id] ?? []) {
        const driverLaps = laps.filter((l) => {
          if (l.carId !== car.id) return false;
          const stint = stints.find((s) => s.id === l.stintId);
          return stint?.driverId === driver.id && (sessionFilter === 'all' || stint?.sessionName === sessionFilter);
        });
        out.push({
          driverId: driver.id, name: driver.name || 'Unnamed', country: driver.country,
          carId: car.id, carNumber: car.number, stats: lapStats(driverLaps), lapsThis: driverLaps,
        });
      }
    }
    return out.filter((r) => r.stats.count > 0);
  }, [cars, driversByCar, laps, stints, carFilter, sessionFilter]);

  // Weighted score
  const scored = useMemo(() => {
    if (rows.length < 2) return rows.map((r) => ({ ...r, score: NaN }));
    const paceVals = rows.map((r) => (r.stats.avg ?? Infinity)); // pace = avg
    const consVals = rows.map((r) => (r.stats.sigma ?? Infinity));
    const volVals = rows.map((r) => r.stats.count);
    const total = wPace + wConsistency + wVolume || 1;
    const np = normalize(paceVals, true);
    const nc = normalize(consVals, true);
    const nv = normalize(volVals, false);
    return rows.map((r, i) => ({
      ...r,
      score: (np[i] * wPace + nc[i] * wConsistency + nv[i] * wVolume) / total * 100,
    }));
  }, [rows, wPace, wConsistency, wVolume]);

  const bestData = scored
    .filter((r) => r.stats.best != null)
    .sort((a, b) => (b.stats.best ?? 0) - (a.stats.best ?? 0))
    .map((r) => ({ name: `${r.name}`, best: r.stats.best!, car: r.carNumber }));

  if (cars.length === 0) {
    return <EmptyState title="No cars yet" hint="Add cars and drivers in the garage first." />;
  }

  return (
    <div className="space-y-4">
      <Card
        title="Driver comparison"
        subtitle="Performance and lap-time comparison with adjustable weighting"
        right={<Users size={15} className="text-faint" />}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-dim">Car</span>
            <Select value={carFilter} onChange={(e) => setCarFilter(e.target.value)} className="!w-44">
              <option value="all">All cars</option>
              {cars.map((c) => <option key={c.id} value={c.id}>#{c.number} — {c.class}</option>)}
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-dim">Session</span>
            <Select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className="!w-44">
              <option value="all">All sessions</option>
              {sessionNames.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-4">
            {([
              ['Pace', wPace, setWPace],
              ['Consistency', wConsistency, setWConsistency],
              ['Volume', wVolume, setWVolume],
            ] as const).map(([label, val, set]) => (
              <label key={label} className="text-xs text-dim">
                <span className="mb-1 flex justify-between gap-3">
                  <span>{label}</span>
                  <span className="num font-bold text-ink">{val}%</span>
                </span>
                <input type="range" min={0} max={100} step={5} value={val} onChange={(e) => set(+e.target.value)} className="w-28 accent-[#d6fa3e]" />
              </label>
            ))}
          </div>
        </div>
      </Card>

      {scored.length === 0 ? (
        <EmptyState title="No laps to compare" hint="Log laps in the stint log — comparison builds automatically." />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {scored
              .slice()
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((r, i) => (
                <Stat
                  key={r.driverId}
                  label={`P${i + 1} · #${r.carNumber}`}
                  value={isFinite(r.score) ? r.score.toFixed(0) : '—'}
                  sub={
                    <span className="flex items-center gap-1.5">
                      <Flag code={r.country} /> {r.name}
                    </span>
                  }
                  accent={COLORS[i % COLORS.length]}
                />
              ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <Card title="Best lap" subtitle="Lower = faster">
              {bestData.length === 0 ? (
                <p className="text-xs text-faint">No timed laps.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bestData} layout="vertical" margin={{ left: 30, right: 20 }}>
                      <CartesianGrid stroke="#1e2937" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={['dataMin - 0.3', 'dataMax + 0.3']} tick={{ fill: '#5f6f83', fontSize: 11 }} tickFormatter={(v: number) => formatLapTime(v, 1)} stroke="#1e2937" />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={90} stroke="#1e2937" />
                      <Tooltip
                        contentStyle={{ background: '#101722', border: '1px solid #2b3a4e', borderRadius: 10, fontSize: 12 }}
                        formatter={(v: number) => [formatLapTime(v), 'Best']}
                      />
                      <ReferenceLine x={Math.min(...bestData.map((d) => d.best))} stroke="#2fd575" strokeDasharray="4 4" />
                      {bestData.map((d, i) => (
                        <Bar key={d.name} dataKey="best" fill={COLORS[i % COLORS.length]} radius={[0, 6, 6, 0]} barSize={18} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Lap-time delta" subtitle="Timed-lap statistics vs session best">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
                      <th className="py-1.5 pr-2">Driver</th>
                      <th className="px-2 text-right">Car</th>
                      <th className="px-2 text-right">Laps</th>
                      <th className="px-2 text-right">Best</th>
                      <th className="px-2 text-right">Avg</th>
                      <th className="px-2 text-right">Best 5 avg</th>
                      <th className="px-2 text-right">σ</th>
                      <th className="px-2 text-right">Δ best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scored
                      .slice()
                      .sort((a, b) => (a.stats.best ?? 9e9) - (b.stats.best ?? 9e9))
                      .map((r) => {
                        const fastest = Math.min(...scored.map((x) => x.stats.best ?? 9e9));
                        const delta = r.stats.best != null ? r.stats.best - fastest : null;
                        return (
                          <tr key={r.driverId} className="border-b border-line/40">
                            <td className="flex items-center gap-1.5 py-1.5 pr-2">
                              <Flag code={r.country} /> {r.name}
                            </td>
                            <td className="num px-2 text-right text-dim">#{r.carNumber}</td>
                            <td className="num px-2 text-right text-dim">{r.stats.count}</td>
                            <td className="num px-2 text-right font-bold text-accent">{formatLapTime(r.stats.best)}</td>
                            <td className="num px-2 text-right text-dim">{formatLapTime(r.stats.avg)}</td>
                            <td className="num px-2 text-right text-dim">{formatLapTime(r.stats.best5Avg)}</td>
                            <td className="num px-2 text-right text-purple">{r.stats.sigma != null ? r.stats.sigma.toFixed(3) : '—'}</td>
                            <td className="num px-2 text-right font-semibold text-orange">
                              {delta != null ? (delta === 0 ? '—' : `+${delta.toFixed(3)}`) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
