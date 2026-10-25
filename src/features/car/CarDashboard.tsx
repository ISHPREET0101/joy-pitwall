import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../../lib/db';
import { formatLapTime } from '../../lib/format';
import { lapStats, type LapStats } from '../../lib/calc';
import { useWeekend } from '../../components/Layout';
import { Card, Stat, EmptyState } from '../../components/ui';
import { Flag } from '../../components/FlagPicker';

export default function CarDashboard({ carId }: { carId: string }) {
  const { id: weekendId, weekend, driversByCar } = useWeekend();
  const drivers = driversByCar[carId] ?? [];

  const stints = useLiveQuery(() => db.stints.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const laps = useLiveQuery(() => db.laps.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const changes = useLiveQuery(() => db.setupChanges.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const tyres = useLiveQuery(() => db.tyres.where('carId').equals(carId).toArray(), [carId]) ?? [];

  const all = lapStats(laps);
  const fuel = stints.reduce((a, s) => a + (s.fuelAddedL ?? 0), 0);

  const perDriver = useMemo(() => {
    return drivers.map((d) => {
      const dl = laps.filter((l) =>
        stints.find((s) => s.id === l.stintId)?.driverId === d.id
      );
      return { driver: d, stats: lapStats(dl), laps: dl };
    });
  }, [drivers, laps, stints]);

  const chartData = useMemo(() => {
    const byLap = new Map<number, Record<string, number>>();
    for (const { driver, laps: dl } of perDriver) {
      for (const l of dl) {
        if (l.timeSec == null || l.isOut || l.isIn) continue;
        const row = byLap.get(l.lapNo) ?? {};
        row[driver.name || driver.id] = l.timeSec;
        byLap.set(l.lapNo, row);
      }
    }
    return Array.from(byLap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lapNo, vals]) => ({ lap: lapNo, ...vals }));
  }, [perDriver]);

  const driverColors = ['#d6fa3e', '#3ee1ff', '#ff9a3d', '#b18cff', '#ff4d5e', '#2fd575'];

  const recentChanges = changes.slice().sort((a, b) => b.ts - a.ts).slice(0, 5);
  const recentTyres = tyres.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Stints" value={stints.length} />
        <Stat label="Laps" value={all.count} accent="#3ee1ff" />
        <Stat label="Best lap" value={formatLapTime(all.best)} accent="#d6fa3e" />
        <Stat label="Avg (timed)" value={formatLapTime(all.avg)} />
        <Stat label="Consistency σ" value={all.sigma != null ? `${all.sigma.toFixed(3)}s` : '—'} accent="#b18cff" />
        <Stat label="Fuel added" value={`${fuel.toFixed(0)} L`} accent="#ff9a3d" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Lap-time trace" subtitle="Timed laps per driver (out/in laps excluded)">
          {chartData.length === 0 ? (
            <EmptyState title="No timed laps yet" hint="Log laps in the Stint & Lap Log tab and the trace appears here." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 12, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="#1e2937" strokeDasharray="3 3" />
                  <XAxis dataKey="lap" tick={{ fill: '#5f6f83', fontSize: 11 }} stroke="#1e2937" />
                  <YAxis
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    tick={{ fill: '#5f6f83', fontSize: 11 }}
                    tickFormatter={(v: number) => formatLapTime(v, 1)}
                    stroke="#1e2937"
                  />
                  <Tooltip
                    contentStyle={{ background: '#101722', border: '1px solid #2b3a4e', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#8fa0b4' }}
                    formatter={(v: number) => [formatLapTime(v), '']}
                  />
                  {perDriver.map((d, i) => (
                    <Line
                      key={d.driver.id}
                      type="monotone"
                      dataKey={d.driver.name || d.driver.id}
                      stroke={driverColors[i % driverColors.length]}
                      dot={false}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Drivers" subtitle="Weekend totals per driver">
          {perDriver.length === 0 ? (
            <p className="text-xs text-faint">No drivers assigned — add them in the garage.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="py-1.5 pr-2">Driver</th>
                  <th className="px-2 py-1.5 text-right">Laps</th>
                  <th className="px-2 py-1.5 text-right">Best</th>
                  <th className="px-2 py-1.5 text-right">Avg</th>
                  <th className="px-2 py-1.5 text-right">σ</th>
                </tr>
              </thead>
              <tbody>
                {perDriver.map(({ driver, stats }: { driver: { id: string; name: string; country: string }; stats: LapStats }) => (
                  <tr key={driver.id} className="border-b border-line/40">
                    <td className="flex items-center gap-1.5 py-1.5 pr-2">
                      <Flag code={driver.country} />
                      <span className="truncate">{driver.name || 'Unnamed'}</span>
                    </td>
                    <td className="num px-2 py-1.5 text-right text-dim">{stats.count}</td>
                    <td className="num px-2 py-1.5 text-right font-bold text-accent">{formatLapTime(stats.best)}</td>
                    <td className="num px-2 py-1.5 text-right text-dim">{formatLapTime(stats.avg)}</td>
                    <td className="num px-2 py-1.5 text-right text-purple">{stats.sigma != null ? stats.sigma.toFixed(3) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link to={`/w/${weekendId}/compare`} className="btn btn-ghost mt-3 !px-2 text-xs text-accent2">
            Full driver comparison →
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent setup changes">
          {recentChanges.length === 0 ? (
            <p className="text-xs text-faint">Nothing logged yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentChanges.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="num text-faint">{new Date(c.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-semibold">{c.item}</span>
                  <span className="num text-dim">{c.from} → {c.to}</span>
                  {c.resultDelta && <span className={`num ${parseFloat(c.resultDelta) < 0 ? 'text-green' : 'text-orange'}`}>{c.resultDelta}s</span>}
                  <span className="text-faint">· {c.sessionName}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Latest tyres" right={<Link to={`/w/${weekendId}/car/${carId}/tyres`} className="btn btn-ghost !px-2 text-xs">All →</Link>}>
          {recentTyres.length === 0 ? (
            <p className="text-xs text-faint">No tyre reports yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentTyres.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="num font-bold">{t.position}</span>
                  <span>{t.compound}</span>
                  {t.coldPressure != null && t.hotPressure != null && (
                    <span className="num text-dim">{t.coldPressure} → <span className="text-orange">{t.hotPressure}</span> psi</span>
                  )}
                  <span className={`chip ${t.graining === 'None' ? 'text-green' : t.graining === 'Heavy' ? 'text-red' : 'text-yellow'}`}>{t.graining}</span>
                  <span className="ml-auto text-faint">{t.sessionName}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
