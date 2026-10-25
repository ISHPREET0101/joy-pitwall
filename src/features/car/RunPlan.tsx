import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { db, uid } from '../../lib/db';
import { COMPOUNDS } from '../../lib/types';
import { mergeSessionNames } from '../../lib/sessions';
import { lapStats } from '../../lib/calc';
import { num } from '../../lib/format';
import { useWeekend } from '../../components/Layout';
import { Button, Card, EmptyState, Select, Stat } from '../../components/ui';

export default function RunPlan({ carId }: { carId: string }) {
  const { id: weekendId, sessions, driversByCar } = useWeekend();
  const drivers = driversByCar[carId] ?? [];

  const plans = useLiveQuery(() => db.runPlans.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const stints = useLiveQuery(() => db.stints.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const laps = useLiveQuery(() => db.laps.where('carId').equals(carId).toArray(), [carId]) ?? [];

  const sessionNames = useMemo(
    () => mergeSessionNames(sessions, Array.from(new Set([...plans.map((p) => p.sessionName), ...stints.map((s) => s.sessionName)]))),
    [sessions, plans, stints]
  );
  const [sessionName, setSessionName] = useState('');
  const eff = sessionName || sessionNames[0] || 'Race';

  const planRows = plans.filter((p) => p.sessionName === eff).sort((a, b) => a.stintNo - b.stintNo);
  const actualStints = stints.filter((s) => s.sessionName === eff).sort((a, b) => a.createdAt - b.createdAt);

  const plannedLaps = planRows.reduce((a, p) => a + (p.plannedLaps || 0), 0);
  const plannedFuel = planRows.reduce((a, p) => a + (p.fuelL || 0), 0);
  const actualLaps = lapStats(laps.filter((l) => actualStints.some((s) => s.id === l.stintId))).count;
  const actualFuel = actualStints.reduce((a, s) => a + (s.fuelAddedL ?? 0), 0);

  async function addStint() {
    await db.runPlans.add({
      id: uid(), carId, sessionName: eff,
      stintNo: planRows.length + 1, plannedLaps: 10, fuelL: 20,
      compound: 'Medium', driverId: drivers[0]?.id,
    });
  }

  return (
    <div className="space-y-4">
      <Card bodyClass="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <ClipboardList size={15} className="text-accent" />
          <input
            className="field !w-64 font-semibold"
            list="plan-session-names"
            value={sessionName || (sessionNames[0] ?? '')}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Session…"
          />
          <datalist id="plan-session-names">
            {sessionNames.map((s) => <option key={s} value={s} />)}
          </datalist>
          <Button variant="primary" onClick={addStint}><Plus size={14} /> Add planned stint</Button>
          <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Planned laps" value={plannedLaps} />
            <Stat label="Planned fuel" value={`${plannedFuel.toFixed(0)} L`} accent="#ff9a3d" />
            <Stat label="Actual laps" value={actualLaps} accent="#3ee1ff" />
            <Stat
              label="Actual fuel"
              value={`${actualFuel.toFixed(0)} L`}
              sub={plannedFuel ? `${actualFuel >= plannedFuel ? '+' : ''}${(actualFuel - plannedFuel).toFixed(0)} L vs plan` : undefined}
              accent={plannedFuel && actualFuel > plannedFuel ? '#ff4d5e' : '#d6fa3e'}
            />
          </div>
        </div>
      </Card>

      {planRows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={20} />}
          title={`No run plan for "${eff}"`}
          hint="Plan stints before the session: laps, fuel and tyres per stint — then compare with what actually happened."
          action={<Button variant="primary" onClick={addStint}><Plus size={14} /> Add planned stint</Button>}
        />
      ) : (
        <Card bodyClass="pt-1">
          <div className="overflow-x-auto pt-2">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-2.5 py-1.5">Stint</th>
                  <th className="px-2.5 py-1.5">Driver</th>
                  <th className="px-2.5 py-1.5">Compound</th>
                  <th className="px-2.5 py-1.5">Planned laps</th>
                  <th className="px-2.5 py-1.5">Fuel (L)</th>
                  <th className="px-2.5 py-1.5">Notes</th>
                  <th className="px-2.5 py-1.5">Actual</th>
                  <th className="px-2.5 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {planRows.map((p) => {
                  const actual = actualStints[p.stintNo - 1];
                  const actualLapCount = actual ? laps.filter((l) => l.stintId === actual.id).length : undefined;
                  const dev = actualLapCount != null ? actualLapCount - (p.plannedLaps || 0) : undefined;
                  return (
                    <tr key={p.id} className="border-b border-line/50">
                      <td className="num px-2.5 py-1.5 font-bold text-accent">S{p.stintNo}</td>
                      <td className="px-2.5 py-1.5">
                        <Select className="!w-36 !py-1" value={p.driverId ?? ''} onChange={(e) => db.runPlans.update(p.id, { driverId: e.target.value || undefined })}>
                          <option value="">Driver…</option>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <Select className="!w-28 !py-1" value={p.compound} onChange={(e) => db.runPlans.update(p.id, { compound: e.target.value })}>
                          {COMPOUNDS.map((c) => <option key={c}>{c}</option>)}
                        </Select>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <input
                          key={`${p.id}-${p.plannedLaps}`}
                          className="field num !w-16 !py-1 text-right"
                          defaultValue={p.plannedLaps}
                          onBlur={(e) => db.runPlans.update(p.id, { plannedLaps: Math.round(num(e.target.value) ?? 0) })}
                        />
                      </td>
                      <td className="px-2.5 py-1.5">
                        <input
                          key={`${p.id}-${p.fuelL}`}
                          className="field num !w-20 !py-1 text-right"
                          defaultValue={p.fuelL}
                          onBlur={(e) => db.runPlans.update(p.id, { fuelL: num(e.target.value) ?? 0 })}
                        />
                      </td>
                      <td className="px-2.5 py-1.5">
                        <input
                          className="field !w-full min-w-32 !border-transparent !bg-transparent !py-1 text-xs hover:!border-line"
                          defaultValue={p.notes ?? ''}
                          placeholder="—"
                          onBlur={(e) => db.runPlans.update(p.id, { notes: e.target.value || undefined })}
                        />
                      </td>
                      <td className="px-2.5 py-1.5 text-xs">
                        {actualLapCount != null ? (
                          <span className={dev === 0 ? 'text-green' : dev != null && Math.abs(dev) > 2 ? 'text-orange' : 'text-dim'}>
                            {actualLapCount} laps{dev != null && dev !== 0 ? ` (${dev! > 0 ? '+' : ''}${dev})` : ''}
                            {actual?.fuelAddedL != null ? ` · ${actual.fuelAddedL} L` : ''}
                          </span>
                        ) : (
                          <span className="text-faint">not run</span>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 text-right">
                        <button className="btn btn-ghost !p-1 hover:!text-red" onClick={() => db.runPlans.delete(p.id)}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="px-2.5 py-2 text-xs text-dim" colSpan={3}>Total planned</td>
                  <td className="num px-2.5 py-2">{plannedLaps}</td>
                  <td className="num px-2.5 py-2 text-orange">{plannedFuel.toFixed(0)} L</td>
                  <td className="px-2.5 py-2" colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
