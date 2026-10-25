import { useState } from 'react';
import { CloudRain, Thermometer, Wind, Plus } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { db } from '../../lib/db';
import { WEATHERS, GRIP_LEVELS } from '../../lib/types';
import { Card, Field, Input, Select, SectionTitle, Button } from '../../components/ui';
import { num } from '../../lib/format';

export default function ConditionsPage() {
  const { id, weekend } = useWeekend();
  const [logText, setLogText] = useState('');

  const set = (patch: Partial<typeof weekend>) => db.weekends.update(id, patch);
  const log = weekend.conditionsLog ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <Card
          title="Track conditions — live"
          subtitle="Shared by every car tab; update as the day develops"
          right={<Thermometer size={15} className="text-faint" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Air temp (°C)">
              <Input
                type="number" step="0.5" defaultValue={weekend.airTempC ?? ''}
                onBlur={(e) => set({ airTempC: num(e.target.value) })}
              />
            </Field>
            <Field label="Track temp (°C)">
              <Input
                type="number" step="0.5" defaultValue={weekend.trackTempC ?? ''}
                onBlur={(e) => set({ trackTempC: num(e.target.value) })}
              />
            </Field>
            <Field label="Wind">
              <Input
                defaultValue={weekend.wind ?? ''} placeholder="e.g. NE 8 km/h"
                onBlur={(e) => set({ wind: e.target.value })}
              />
            </Field>
            <Field label="Weather">
              <Select defaultValue={weekend.weather ?? 'Clear'} onChange={(e) => set({ weather: e.target.value })}>
                {WEATHERS.map((w) => <option key={w}>{w}</option>)}
              </Select>
            </Field>
            <Field label="Grip level">
              <Select defaultValue={weekend.grip ?? 'Green'} onChange={(e) => set({ grip: e.target.value })}>
                {GRIP_LEVELS.map((g) => <option key={g}>{g}</option>)}
              </Select>
            </Field>
            <Field label="Surface">
              <Select defaultValue={weekend.surface ?? 'Smooth'} onChange={(e) => set({ surface: e.target.value })}>
                {['Smooth', 'Abrasive', 'Bumpy', 'Dirty / off-line dust', 'Damp patches', 'Standing water'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Condition notes">
              <textarea
                className="field min-h-20 resize-y"
                placeholder="e.g. Dusty off the racing line into T1; expect rubber to come in after 15 min…"
                defaultValue={weekend.conditionsNotes ?? ''}
                onBlur={(e) => set({ conditionsNotes: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Conditions log" subtitle="Timestamped snapshots — useful for correlating setup changes with the track">
          <div className="flex gap-2">
            <Input
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="e.g. Cloud came over, track dropped 4°C, grip down"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && logText.trim()) {
                  await db.weekends.update(id, {
                    conditionsLog: [
                      { ts: Date.now(), air: weekend.airTempC, track: weekend.trackTempC, weather: weekend.weather, grip: weekend.grip, text: logText.trim() },
                      ...log,
                    ],
                  });
                  setLogText('');
                }
              }}
            />
            <Button
              variant="primary"
              disabled={!logText.trim()}
              onClick={async () => {
                await db.weekends.update(id, {
                  conditionsLog: [
                    { ts: Date.now(), air: weekend.airTempC, track: weekend.trackTempC, weather: weekend.weather, grip: weekend.grip, text: logText.trim() },
                    ...log,
                  ],
                });
                setLogText('');
              }}
            >
              <Plus size={14} /> Log
            </Button>
          </div>
          <div className="mt-3 space-y-1.5">
            {log.length === 0 && <p className="text-xs text-faint">No entries yet.</p>}
            {log.map((c, i) => (
              <div key={i} className="group flex items-start gap-3 rounded-lg border border-line bg-panel2/40 px-3 py-2 text-xs">
                <span className="num shrink-0 text-faint">
                  {new Date(c.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-[11px] text-dim">
                    {c.air != null && <span>Air {c.air}°C</span>}
                    {c.track != null && <span>Track {c.track}°C</span>}
                    {c.weather && <span>{c.weather}</span>}
                    {c.grip && <span>Grip: {c.grip}</span>}
                  </div>
                  {c.text && <div className="mt-0.5 text-ink">{c.text}</div>}
                </div>
                <button
                  className="btn btn-ghost ml-auto !p-1 opacity-0 group-hover:opacity-100"
                  onClick={() => db.weekends.update(id, { conditionsLog: log.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Quick reference" subtitle="What to watch at the track">
        <ul className="space-y-2.5 text-xs leading-relaxed text-dim">
          <li className="flex gap-2"><Thermometer size={14} className="mt-0.5 shrink-0 text-orange" /> Track temp swings of 10°C can move optimum pressures by ~0.2 bar — log a snapshot whenever the sky changes.</li>
          <li className="flex gap-2"><Wind size={14} className="mt-0.5 shrink-0 text-accent2" /> Wind direction changes hit downforce feel most in fast corners and the pit straight.</li>
          <li className="flex gap-2"><CloudRain size={14} className="mt-0.5 shrink-0 text-blue" /> Record grip transitions (damp → dry) so driver comments can be read against the track state.</li>
        </ul>
      </Card>
    </div>
  );
}
