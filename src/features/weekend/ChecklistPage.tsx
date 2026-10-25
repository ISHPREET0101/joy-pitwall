import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { db, uid } from '../../lib/db';
import { fmtDayShort, fmtDate, toISODate } from '../../lib/format';
import { uniqueDays } from '../../lib/sessions';
import { Button, Card, EmptyState, Input, SectionTitle } from '../../components/ui';

const STANDARD_TEMPLATE: { category: string; text: string }[] = [
  { category: 'Car', text: 'Wheel torque check + tyre pressures logged (cold)' },
  { category: 'Car', text: 'Fuel cell filled to run plan' },
  { category: 'Car', text: 'Brake pads & discs thickness checked' },
  { category: 'Car', text: 'Telemetry SD card inserted, radio & bottle check' },
  { category: 'Car', text: 'Setup sheet photographed before leaving the garage' },
  { category: 'Garage', text: 'Tyre blankets at target temperature' },
  { category: 'Garage', text: 'Fuel rig grounded + fire extinguisher in place' },
  { category: 'Garage', text: 'Pit box clean — no loose items in the pit lane' },
  { category: 'Engineer', text: 'Run plan printed & briefed with drivers' },
  { category: 'Engineer', text: 'Timetable + flag procedure confirmed with team manager' },
  { category: 'Engineer', text: 'Radio check completed with every driver' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Car: '#d6fa3e',
  Garage: '#3ee1ff',
  Engineer: '#b18cff',
};

export default function ChecklistPage() {
  const { id, sessions } = useWeekend();
  const today = toISODate(new Date());
  const days = useMemo(() => {
    const d = uniqueDays(sessions);
    if (!d.includes(today)) d.unshift(today);
    return d.sort();
  }, [sessions, today]);
  const [day, setDay] = useState(today);
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState('Car');

  useEffect(() => {
    if (!days.includes(day)) setDay(days[0]);
  }, [days, day]);

  const items = useLiveQuery(
    () => db.checklists.where('[weekendId+day]').equals([id, day]).toArray(),
    [id, day]
  ) ?? [];
  const sorted = items.slice().sort((a, b) => a.order - b.order);
  const done = sorted.filter((i) => i.done).length;

  async function addItem(text: string, category: string) {
    if (!text.trim()) return;
    await db.checklists.add({
      id: uid(), weekendId: id, day, category, text: text.trim(), done: false, order: sorted.length,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              day === d ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line text-dim hover:text-ink'
            }`}
          >
            {fmtDayShort(d)} {fmtDate(d).split(',')[1]?.trim() ?? d}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            className="!py-1.5 !text-xs"
            onClick={async () => {
              if (window.confirm(`Reset all items for ${fmtDate(day)}?`)) {
                for (const i of sorted) await db.checklists.update(i.id, { done: false, doneAt: undefined });
              }
            }}
          >
            <RotateCcw size={13} /> Reset day
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card
          title="Pre-session checklist"
          subtitle={`${done}/${sorted.length} complete`}
          right={
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-panel3">
              <div className="h-full bg-accent transition-all" style={{ width: sorted.length ? `${(done / sorted.length) * 100}%` : 0 }} />
            </div>
          }
        >
          {sorted.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={18} />}
              title="Nothing on the list yet"
              hint="Add items manually or load the standard pre-session template."
              action={
                <Button
                  variant="primary"
                  onClick={async () => {
                    for (const t of STANDARD_TEMPLATE) await addItem(t.text, t.category);
                  }}
                >
                  <Sparkles size={14} /> Load standard template
                </Button>
              }
            />
          ) : (
            ['Car', 'Garage', 'Engineer'].map((cat) => {
              const list = sorted.filter((i) => i.category === cat);
              if (!list.length) return null;
              return (
                <div key={cat} className="mb-4 last:mb-1">
                  <SectionTitle>
                    <span style={{ color: CATEGORY_COLORS[cat] ?? '#94a3b8' }}>{cat}</span>
                  </SectionTitle>
                  <div className="space-y-1">
                    {list.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2.5 rounded-lg border border-line bg-panel2/40 px-3 py-2"
                      >
                        <button
                          onClick={() => db.checklists.update(item.id, { done: !item.done, doneAt: !item.done ? Date.now() : undefined })}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition ${
                            item.done ? 'border-accent bg-accent text-black' : 'border-line2 hover:border-accent/60'
                          }`}
                        >
                          {item.done && '✓'}
                        </button>
                        <span className={`flex-1 text-sm ${item.done ? 'text-faint line-through' : ''}`}>{item.text}</span>
                        <button
                          className="btn btn-ghost !p-1 opacity-0 group-hover:opacity-100 hover:!text-red"
                          onClick={() => db.checklists.delete(item.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
          <div className="mt-3 flex gap-2 border-t border-line pt-3">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { addItem(newText, newCat); setNewText(''); } }}
              placeholder="Add checklist item…"
            />
            <select className="field !w-28" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              <option>Car</option>
              <option>Garage</option>
              <option>Engineer</option>
            </select>
            <Button variant="primary" onClick={() => { addItem(newText, newCat); setNewText(''); }}>
              <Plus size={14} />
            </Button>
          </div>
        </Card>

        <Card title="Standard template" subtitle="One click to append all items for the selected day">
          <div className="space-y-1.5">
            {STANDARD_TEMPLATE.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-panel2/40 px-3 py-1.5 text-xs text-dim">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLORS[t.category] }} />
                {t.text}
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            className="mt-3 w-full"
            onClick={async () => {
              for (const t of STANDARD_TEMPLATE) await addItem(t.text, t.category);
            }}
          >
            <Sparkles size={14} /> Append all to {fmtDayShort(day)}
          </Button>
        </Card>
      </div>
    </div>
  );
}
