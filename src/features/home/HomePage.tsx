import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Flag, Plus, Trash2, Upload } from 'lucide-react';
import { db } from '../../lib/db';
import type { Weekend } from '../../lib/types';
import { createDemoWeekend } from '../../lib/seed';
import { importWeekendBackup } from '../../lib/backup';
import { deleteWeekendCascade } from '../../lib/db';
import { fmtDate } from '../../lib/format';
import { Badge, Button, Card, EmptyState } from '../../components/ui';
import { Clock } from '../../components/Clock';
import { Flag as FlagIcon } from '../../components/FlagPicker';
import { countryName } from '../../lib/countries';

export default function HomePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const weekends = useLiveQuery(() => db.weekends.toArray()) ?? [];
  const cars = useLiveQuery(() => db.cars.toArray()) ?? [];
  const [err, setErr] = useState('');

  const carCount = (w: Weekend) => cars.filter((c) => c.weekendId === w.id).length;

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const id = await importWeekendBackup(file);
      navigate(`/w/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="checkered-strip h-12 w-12 rounded-xl border border-line2" />
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              JOY <span className="text-accent">PITWALL</span>
            </h1>
            <p className="text-xs text-dim">Chief / Race Engineering suite — multi-team, multi-car weekends</p>
          </div>
        </div>
        <Clock size="md" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => navigate('/new')}>
          <Plus size={15} /> New weekend
        </Button>
        <Button onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Import backup
        </Button>
        <Button variant="ghost" onClick={async () => { const id = await createDemoWeekend(); navigate(`/w/${id}`); }}>
          <Flag size={15} /> Load demo weekend
        </Button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => handleImport(e.target.files?.[0])} />
      </div>
      {err && <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">{err}</div>}

      {weekends.length === 0 ? (
        <EmptyState
          icon={<FlagIcon code="gb" className="!h-6 !w-9" />}
          title="No weekends yet"
          hint="Create a new weekend to set up teams, cars and sessions — or load the demo weekend to explore the app with data."
          action={
            <Button variant="primary" onClick={() => navigate('/new')}>
              <Plus size={15} /> Create your first weekend
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {weekends
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((w) => (
              <div key={w.id} className="card hoverable group relative overflow-hidden p-4">
                <div className="absolute inset-y-0 left-0 w-1 bg-accent/70" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-bold">{w.name}</h2>
                      {w.round && <Badge color="#3ee1ff">{w.round}</Badge>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-dim">
                      <FlagIcon code={w.country} />
                      {w.venue} · {fmtDate(w.startDate)} → {fmtDate(w.endDate)}
                    </p>
                    <p className="mt-2 text-[11px] text-faint">
                      {carCount(w)} car{carCount(w) === 1 ? '' : 's'} configured
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="btn btn-ghost !p-2 opacity-0 transition group-hover:opacity-100 hover:!text-red"
                      title="Delete weekend"
                      onClick={async () => {
                        if (window.confirm(`Delete "${w.name}" and ALL its data? This cannot be undone.`)) {
                          await deleteWeekendCascade(w.id);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                    <Link to={`/w/${w.id}`} className="btn btn-default !px-2.5" title="Open">
                      <ChevronRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <Card className="mt-8" title="How it works">
        <ol className="grid gap-2 text-xs text-dim sm:grid-cols-3">
          <li className="rounded-lg border border-line bg-panel2/50 p-3">
            <span className="num mr-1 font-bold text-accent">1.</span>
            Create a weekend — upload the track map and set the circuit length.
          </li>
          <li className="rounded-lg border border-line bg-panel2/50 p-3">
            <span className="num mr-1 font-bold text-accent">2.</span>
            Build the timetable, add teams, cars and drivers in the garage.
          </li>
          <li className="rounded-lg border border-line bg-panel2/50 p-3">
            <span className="num mr-1 font-bold text-accent">3.</span>
            Log stints, fuel, setups and tyres per car — then compare and report.
          </li>
        </ol>
      </Card>
    </div>
  );
}
