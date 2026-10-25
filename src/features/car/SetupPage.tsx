import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Lock, LockOpen, Plus, Trash2, Wrench } from 'lucide-react';
import { db, uid } from '../../lib/db';
import type { SetupChangeType } from '../../lib/types';
import { mergeSessionNames } from '../../lib/sessions';
import { useWeekend } from '../../components/Layout';
import { Badge, Button, Card, EmptyState, Input, Select, Stat } from '../../components/ui';

const CHANGE_TYPES: SetupChangeType[] = ['Suspension', 'Aero', 'Part', 'Other'];

export default function SetupPage({ carId }: { carId: string }) {
  const { id: weekendId, sessions, driversByCar } = useWeekend();
  const drivers = driversByCar[carId] ?? [];

  const items = useLiveQuery(() => db.setupItems.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const entries = useLiveQuery(() => db.setupEntries.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const changes = useLiveQuery(
    () => db.setupChanges.where('carId').equals(carId).toArray(),
    [carId]
  ) ?? [];
  const stints = useLiveQuery(() => db.stints.where('carId').equals(carId).toArray(), [carId]) ?? [];

  const sessionNames = useMemo(
    () => mergeSessionNames(sessions, stints.map((s) => s.sessionName)),
    [sessions, stints]
  );

  const itemsSorted = items.slice().sort((a, b) => a.order - b.order);
  const changesSorted = changes.slice().sort((a, b) => b.ts - a.ts);

  const entryFor = (itemId: string, sessionName: string) =>
    entries.find((e) => e.itemId === itemId && e.sessionName === sessionName);

  async function setEntry(itemId: string, sessionName: string, value: string) {
    const key = `${itemId}::${sessionName}`;
    const existing = entries.find((e) => e.id === key);
    if (existing) {
      await db.setupEntries.update(key, { value });
    } else {
      await db.setupEntries.add({ id: key, carId, itemId, sessionName, value });
    }
  }

  async function addItem() {
    await db.setupItems.add({
      id: uid(), carId, name: 'New setting', unit: '',
      weight: 3, locked: false, order: itemsSorted.length,
    });
  }

  return (
    <div className="space-y-4">
      {/* Setup sheet */}
      <Card
        title="Setup sheet"
        subtitle="Values per session — lock (grey out) settings that must not change, weight what matters for comparison"
        right={<Wrench size={15} className="text-faint" />}
        bodyClass="pt-2"
      >
        {itemsSorted.length === 0 ? (
          <EmptyState
            title="No setup items yet"
            hint="Add settings like wing clicks, ARB, camber, pressures…"
            action={<Button variant="primary" onClick={addItem}><Plus size={14} /> Add first item</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wider text-faint">
                  <th className="min-w-44 px-2.5 py-1.5 text-left">Setting</th>
                  <th className="px-2 py-1.5 text-left">Unit</th>
                  <th className="px-2 py-1.5 text-center" title="Importance weight">Wt</th>
                  {sessionNames.map((s) => (
                    <th key={s} className="min-w-24 px-2 py-1.5 text-center">{s}</th>
                  ))}
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {itemsSorted.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-line/50 ${item.locked ? 'opacity-45' : ''}`}
                  >
                    <td className="px-2.5 py-1">
                      <input
                        className="field !border-transparent !bg-transparent !px-1 !py-0.5 font-semibold hover:!border-line"
                        value={item.name}
                        onChange={(e) => db.setupItems.update(item.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="field !w-20 !border-transparent !bg-transparent !px-1 !py-0.5 text-xs text-dim hover:!border-line"
                        value={item.unit ?? ''}
                        placeholder="unit"
                        onChange={(e) => db.setupItems.update(item.id, { unit: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <select
                        className="field num !w-14 !px-1 !py-0.5 text-center text-xs"
                        value={item.weight}
                        onChange={(e) => db.setupItems.update(item.id, { weight: +e.target.value })}
                        title="Weight 1 (low) — 5 (critical)"
                      >
                        {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </td>
                    {sessionNames.map((s) => {
                      const entry = entryFor(item.id, s);
                      return (
                        <td key={s} className="px-2 py-1">
                          <input
                            key={`${entry?.id}-${entry?.value ?? ''}`}
                            className="field num !py-0.5 text-center"
                            disabled={item.locked}
                            defaultValue={entry?.value ?? ''}
                            placeholder="—"
                            onBlur={(e) => setEntry(item.id, s, e.target.value.trim())}
                          />
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <button
                        className="btn btn-ghost !p-1.5"
                        title={item.locked ? 'Unlock setting' : 'Lock (grey out) setting'}
                        onClick={() => db.setupItems.update(item.id, { locked: !item.locked })}
                      >
                        {item.locked ? <Lock size={13} className="text-yellow" /> : <LockOpen size={13} className="text-faint" />}
                      </button>
                      <button className="btn btn-ghost !p-1.5 hover:!text-red" onClick={() => db.setupItems.delete(item.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button className="mt-3" onClick={addItem}><Plus size={14} /> Add setup item</Button>
          </div>
        )}
      </Card>

      {/* Changes log */}
      <ChangeLog carId={carId} changes={changesSorted} sessionNames={sessionNames} driverCount={drivers.length} />
    </div>
  );
}

function ChangeLog({
  carId, changes, sessionNames, driverCount,
}: {
  carId: string;
  changes: {
    id: string; ts: number; sessionName: string; type: SetupChangeType;
    item: string; from: string; to: string; weight: number; resultDelta?: string; notes?: string;
  }[];
  sessionNames: string[];
  driverCount: number;
}) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({
    sessionName: sessionNames[0] ?? '', type: 'Suspension' as SetupChangeType,
    item: '', from: '', to: '', weight: 3, resultDelta: '', notes: '',
  });

  async function submit() {
    if (!f.item.trim()) return;
    await db.setupChanges.add({ id: uid(), carId, ts: Date.now(), ...f, item: f.item.trim() });
    setAdding(false);
    setF((s) => ({ ...s, item: '', from: '', to: '', resultDelta: '', notes: '' }));
  }

  const highWeight = changes.filter((c) => c.weight >= 4).length;

  return (
    <Card
      title="Changes log"
      subtitle="Suspension & part changes with weight and lap-time result"
      right={
        <div className="flex items-center gap-2">
          {changes.length > 0 && <Badge color="#ffd23e">{highWeight} high-weight</Badge>}
          <Button variant="primary" onClick={() => setAdding(true)}><Plus size={14} /> Log change</Button>
        </div>
      }
      bodyClass="pt-2"
    >
      {changes.length === 0 ? (
        <p className="pb-1 text-xs text-faint">No changes logged yet — record every suspension or part change with the lap-time delta it produced.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Changes" value={changes.length} />
            <Stat label="Suspension" value={changes.filter((c) => c.type === 'Suspension').length} accent="#3ee1ff" />
            <Stat label="Parts" value={changes.filter((c) => c.type === 'Part').length} accent="#ff9a3d" />
            <Stat
              label="Best result"
              value={
                (() => {
                  const withDelta = changes
                    .map((c) => parseFloat(c.resultDelta ?? ''))
                    .filter((v) => isFinite(v));
                  return withDelta.length ? `${Math.min(...withDelta).toFixed(2)}s` : '—';
                })()
              }
              accent="#d6fa3e"
            />
          </div>
          <div className="space-y-1.5">
            {changes.map((c) => (
              <div key={c.id} className="group flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel2/40 px-3 py-2 text-xs">
                <span className="num text-faint">{new Date(c.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <Badge color={c.type === 'Suspension' ? '#3ee1ff' : c.type === 'Aero' ? '#b18cff' : c.type === 'Part' ? '#ff9a3d' : '#94a3b8'}>
                  {c.type}
                </Badge>
                <span className="font-semibold">{c.item}</span>
                <span className="num text-dim">{c.from || '—'} → <span className="font-bold text-ink">{c.to || '—'}</span></span>
                <span className="text-faint">· {c.sessionName}</span>
                <span className="chip" style={{ background: 'rgba(214,250,62,0.1)', color: '#d6fa3e', border: '1px solid rgba(214,250,62,0.3)' }}>
                  w{c.weight}
                </span>
                {c.resultDelta && (
                  <span className={`num font-bold ${parseFloat(c.resultDelta) < 0 ? 'text-green' : 'text-orange'}`}>
                    {c.resultDelta}s
                  </span>
                )}
                {c.notes && <span className="text-faint">— {c.notes}</span>}
                <button className="btn btn-ghost ml-auto !p-1 opacity-0 group-hover:opacity-100 hover:!text-red" onClick={() => db.setupChanges.delete(c.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {adding && (
        <div className="mt-3 grid gap-2 rounded-xl border border-line2/60 bg-panel2/60 p-3 sm:grid-cols-4">
          <Input list="cl-sessions" value={f.sessionName} onChange={(e) => setF({ ...f, sessionName: e.target.value })} placeholder="Session" />
          <datalist id="cl-sessions">{sessionNames.map((s) => <option key={s} value={s} />)}</datalist>
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as SetupChangeType })}>
            {CHANGE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Input value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} placeholder="Item (e.g. Front ARB)" />
          <Select value={String(f.weight)} onChange={(e) => setF({ ...f, weight: +e.target.value })} title="Weight">
            {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>Weight {w}</option>)}
          </Select>
          <Input value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="From" />
          <Input value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="To" />
          <Input value={f.resultDelta} onChange={(e) => setF({ ...f, resultDelta: e.target.value })} placeholder="Lap delta (e.g. -0.3)" />
          <div className="flex gap-2">
            <Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Notes" className="flex-1" />
            <Button variant="primary" onClick={submit} disabled={!f.item.trim()}>Save</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>✕</Button>
          </div>
        </div>
      )}
      {driverCount > 1 && (
        <p className="mt-2 text-[11px] text-faint">Tip: log the driver comment that triggered the change as a note on the Notes tab.</p>
      )}
    </Card>
  );
}
