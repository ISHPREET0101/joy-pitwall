import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Thermometer, Trash2 } from 'lucide-react';
import { db, uid } from '../../lib/db';
import type { TyreReport } from '../../lib/types';
import { COMPOUNDS, TYRE_POSITIONS } from '../../lib/types';
import { mergeSessionNames } from '../../lib/sessions';
import { num } from '../../lib/format';
import { useWeekend } from '../../components/Layout';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Segmented, Select, TextArea } from '../../components/ui';
import { ImageUpload } from '../../components/ImageUpload';

const GRAIN_COLOR: Record<TyreReport['graining'], string> = {
  None: '#2fd575',
  Light: '#ffd23e',
  Medium: '#ff9a3d',
  Heavy: '#ff4d5e',
};

export default function TyresPage({ carId }: { carId: string }) {
  const { id: weekendId, sessions, weekend } = useWeekend();
  const reports = useLiveQuery(() => db.tyres.where('carId').equals(carId).toArray(), [carId]) ?? [];
  const stints = useLiveQuery(() => db.stints.where('carId').equals(carId).toArray(), [carId]) ?? [];

  const sessionNames = useMemo(
    () => mergeSessionNames(sessions, stints.map((s) => s.sessionName)),
    [sessions, stints]
  );
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({
    sessionName: sessionNames[0] ?? '', position: 'RL', compound: 'Medium',
    coldPressure: '', hotPressure: '', hotTempC: '', graining: 'None' as TyreReport['graining'],
    notes: '', images: [] as string[],
  });
  const [zoom, setZoom] = useState<string | null>(null);

  async function submit() {
    await db.tyres.add({
      id: uid(), carId, sessionName: f.sessionName,
      position: f.position, compound: f.compound,
      coldPressure: num(f.coldPressure), hotPressure: num(f.hotPressure), hotTempC: num(f.hotTempC),
      graining: f.graining, images: f.images, notes: f.notes || undefined,
      createdAt: Date.now(),
    });
    setAdding(false);
    setF((s) => ({ ...s, notes: '', images: [] }));
  }

  const sorted = reports.slice().sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-dim">
          Photograph each tyre after the run, log cold/hot pressures and graining.
          {weekend.tyreSets ? <> Allocation: <span className="font-semibold text-ink">{weekend.tyreSets}</span>.</> : null}
        </p>
        <Button variant="primary" onClick={() => setAdding(true)}><Plus size={14} /> Tyre report</Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Thermometer size={20} />}
          title="No tyre reports yet"
          hint="After each stint, log pressures and take photos — graining patterns tell you if pressures and camber are right."
          action={<Button variant="primary" onClick={() => setAdding(true)}><Plus size={14} /> Add tyre report</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((r) => (
            <div key={r.id} className="card group p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="num rounded-md border border-line2 bg-panel2 px-2 py-0.5 text-sm font-black">{r.position}</span>
                <span className="text-sm font-semibold">{r.compound}</span>
                <Badge color={GRAIN_COLOR[r.graining]}>{r.graining === 'None' ? 'no graining' : r.graining}</Badge>
                <span className="ml-auto text-[10px] text-faint">{r.sessionName}</span>
                <button
                  className="btn btn-ghost !p-1 opacity-0 group-hover:opacity-100 hover:!text-red"
                  onClick={() => db.tyres.delete(r.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg bg-panel2/60 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-faint">Cold</div>
                  <div className="num text-sm font-bold">{r.coldPressure != null ? `${r.coldPressure} psi` : '—'}</div>
                </div>
                <div className="rounded-lg bg-panel2/60 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-faint">Hot</div>
                  <div className="num text-sm font-bold text-orange">{r.hotPressure != null ? `${r.hotPressure} psi` : '—'}</div>
                </div>
                <div className="rounded-lg bg-panel2/60 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-faint">Δ / Temp</div>
                  <div className="num text-sm font-bold text-accent2">
                    {r.coldPressure != null && r.hotPressure != null ? `+${(r.hotPressure - r.coldPressure).toFixed(1)}` : '—'}
                    {r.hotTempC != null ? <span className="text-faint"> · {r.hotTempC}°</span> : null}
                  </div>
                </div>
              </div>
              {r.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Tyre"
                      className="h-16 w-24 cursor-zoom-in rounded-md border border-line object-cover"
                      onClick={() => setZoom(src)}
                    />
                  ))}
                </div>
              )}
              {r.notes && <p className="mt-2 text-xs leading-relaxed text-dim">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New tyre report"
        footer={<><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Save report</Button></>}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Session">
              <Input list="tyre-sessions" value={f.sessionName} onChange={(e) => setF({ ...f, sessionName: e.target.value })} />
              <datalist id="tyre-sessions">{sessionNames.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Compound">
              <Select value={f.compound} onChange={(e) => setF({ ...f, compound: e.target.value })}>
                {COMPOUNDS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Position">
            <Segmented
              options={TYRE_POSITIONS.map((p) => ({ id: p, label: p }))}
              value={f.position}
              onChange={(p) => setF({ ...f, position: p })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cold (psi)">
              <Input type="number" step="0.1" value={f.coldPressure} onChange={(e) => setF({ ...f, coldPressure: e.target.value })} />
            </Field>
            <Field label="Hot (psi)">
              <Input type="number" step="0.1" value={f.hotPressure} onChange={(e) => setF({ ...f, hotPressure: e.target.value })} />
            </Field>
            <Field label="Hot temp (°C)">
              <Input type="number" value={f.hotTempC} onChange={(e) => setF({ ...f, hotTempC: e.target.value })} />
            </Field>
          </div>
          <Field label="Graining">
            <Segmented
              options={(Object.keys(GRAIN_COLOR) as TyreReport['graining'][]).map((g) => ({ id: g, label: g }))}
              value={f.graining}
              onChange={(g) => setF({ ...f, graining: g })}
            />
          </Field>
          <ImageUpload images={f.images} onChange={(imgs) => setF({ ...f, images: imgs })} maxDim={1200} label="Tyre photos (surface, shoulder, graining)" />
          <TextArea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Observations — wear pattern, cuts, blistering…" />
        </div>
      </Modal>

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
