import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StickyNote, Trash2 } from 'lucide-react';
import { db, uid } from '../lib/db';
import type { Note, Stint } from '../lib/types';
import { mergeSessionNames } from '../lib/sessions';
import { Button, EmptyState, Input, Modal, Segmented, Select, TextArea } from './ui';
import { ImageUpload } from './ImageUpload';
import { Flag } from './FlagPicker';
import { useWeekend } from './Layout';
import type { Driver } from '../lib/types';

/** Composer + list shared by the Common Area notes page and each car's notes tab. */
export function NotesPanel({
  weekendId,
  fixedCarId,
  title,
  defaultAuthor = 'Engineer',
}: {
  weekendId: string;
  fixedCarId?: string;
  title?: string;
  defaultAuthor?: 'Engineer' | 'Driver';
}) {
  const { sessions, cars, driversByCar } = useWeekend();
  const [composing, setComposing] = useState(false);
  const [author, setAuthor] = useState<'Engineer' | 'Driver'>(defaultAuthor);
  const [carId, setCarId] = useState(fixedCarId ?? '');
  const [driverId, setDriverId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const usedNames = useLiveQuery(async () => {
    const cars = await db.cars.where('weekendId').equals(weekendId).toArray();
    const carIds = cars.map((c) => c.id);
    const [stints, allNotes] = await Promise.all([
      carIds.length ? db.stints.where('carId').anyOf(carIds).toArray() : Promise.resolve([] as Stint[]),
      db.notes.where('weekendId').equals(weekendId).toArray(),
    ]);
    return Array.from(
      new Set([...stints.map((s) => s.sessionName), ...allNotes.map((n) => n.sessionName ?? '')])
    ).filter(Boolean);
  }, [weekendId]) ?? [];
  const sessionOptions = useMemo(() => mergeSessionNames(sessions, usedNames), [sessions, usedNames]);

  const notes = useLiveQuery(async () => {
    const all = await db.notes.where('weekendId').equals(weekendId).toArray();
    const filtered = fixedCarId ? all.filter((n) => n.carId === fixedCarId) : all;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [weekendId, fixedCarId]) ?? [];

  async function submit() {
    if (!text.trim()) return;
    const note: Note = {
      id: uid(),
      weekendId,
      carId: carId || undefined,
      sessionName: sessionName || undefined,
      author,
      driverId: author === 'Driver' ? driverId || undefined : undefined,
      text: text.trim(),
      images,
      createdAt: Date.now(),
    };
    await db.notes.add(note);
    setText('');
    setImages([]);
    setSessionName('');
    setComposing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
          <span className="h-3 w-1 rounded-full bg-accent" /> {title ?? 'Notes'}
        </h3>
        <Button variant="primary" onClick={() => setComposing(true)}>
          <StickyNote size={14} /> Add note
        </Button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={18} />}
          title="No notes yet"
          hint="Driver comments, your own engineering notes and photos — all timestamped for the report."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const car = cars.find((c) => c.id === n.carId);
            const driver = n.driverId ? Object.values(driversByCar).flat().find((d: Driver) => d.id === n.driverId) : undefined;
            return (
              <div key={n.id} className="card group p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className="chip"
                    style={{
                      background: n.author === 'Driver' ? 'rgba(62,225,255,0.12)' : 'rgba(214,250,62,0.12)',
                      color: n.author === 'Driver' ? '#3ee1ff' : '#d6fa3e',
                      border: `1px solid ${n.author === 'Driver' ? 'rgba(62,225,255,0.4)' : 'rgba(214,250,62,0.4)'}`,
                    }}
                  >
                    {n.author}
                  </span>
                  {driver && (
                    <span className="flex items-center gap-1 text-dim">
                      <Flag code={driver.country} /> {driver.name}
                    </span>
                  )}
                  {car && <span className="num text-dim">#{car.number}</span>}
                  {n.sessionName && <span className="text-faint">· {n.sessionName}</span>}
                  <span className="ml-auto text-faint">{new Date(n.createdAt).toLocaleString()}</span>
                  <button
                    className="btn btn-ghost !p-1 opacity-0 group-hover:opacity-100 hover:!text-red"
                    onClick={() => db.notes.delete(n.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.text}</p>
                {n.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="h-24 w-36 cursor-zoom-in rounded-lg border border-line object-cover"
                        onClick={() => window.open(src, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="Add note"
        footer={
          <>
            <Button onClick={() => setComposing(false)}>Cancel</Button>
            <Button variant="primary" disabled={!text.trim()} onClick={submit}>
              Save note
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Segmented
            options={[
              { id: 'Engineer', label: 'Engineer (me)' },
              { id: 'Driver', label: 'Driver' },
            ]}
            value={author}
            onChange={setAuthor}
          />
          {!fixedCarId && (
            <div className="grid grid-cols-2 gap-3">
              <Select value={carId} onChange={(e) => { setCarId(e.target.value); setDriverId(''); }}>
                <option value="">No specific car</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>#{c.number} — {c.class}</option>
                ))}
              </Select>
              {author === 'Driver' && (
                <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                  <option value="">Which driver?</option>
                  {(driversByCar[carId] ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              )}
            </div>
          )}
          {fixedCarId && author === 'Driver' && (
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Which driver?</option>
              {(driversByCar[fixedCarId] ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          )}
          <Select value={sessionName} onChange={(e) => setSessionName(e.target.value)}>
            <option value="">No session (general)</option>
            {sessionOptions.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={author === 'Driver' ? 'Driver comment…' : 'Engineering note…'}
            autoFocus
          />
          <ImageUpload images={images} onChange={setImages} label="Attach photos (tyres, damage, setups…)" maxDim={1200} />
        </div>
      </Modal>
    </div>
  );
}

/** Thin wrapper for the common area. */
export function CommonNotes() {
  const { id } = useWeekend();
  const [q, setQ] = useState('');
  return (
    <div>
      <div className="mb-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter notes…" className="max-w-xs" />
      </div>
      {q ? <FilteredNotes weekendId={id} q={q} /> : <NotesPanel weekendId={id} />}
    </div>
  );
}

function FilteredNotes({ weekendId, q }: { weekendId: string; q: string }) {
  const notes = useLiveQuery(async () => {
    const all = await db.notes.where('weekendId').equals(weekendId).toArray();
    return all.filter((n) => n.text.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt);
  }, [weekendId, q]) ?? [];
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <div key={n.id} className="card p-3.5">
          <div className="mb-1 text-[11px] text-faint">
            {n.author} · {new Date(n.createdAt).toLocaleString()}
          </div>
          <p className="whitespace-pre-wrap text-sm">{n.text}</p>
        </div>
      ))}
    </div>
  );
}
