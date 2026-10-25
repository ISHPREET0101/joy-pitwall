import { useWeekend } from '../../components/Layout';
import { db } from '../../lib/db';
import { Card, Field, Input, SectionTitle, Toggle } from '../../components/ui';
import { num } from '../../lib/format';

export default function RulesPage() {
  const { id, weekend } = useWeekend();
  const set = (patch: Partial<typeof weekend>) => db.weekends.update(id, patch);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card title="Sporting rules" subtitle="Anything the teams must follow this weekend">
          <textarea
            className="field min-h-56 resize-y leading-relaxed"
            placeholder={'e.g.\n• Max 2 drivers per car per race\n• Driver change only in the designated pit box\n• Refuelling permitted during pit stops with the engine off\n• Max stint length 65 min'}
            defaultValue={weekend.rules}
            onBlur={(e) => set({ rules: e.target.value })}
          />
        </Card>
        <Card title="Regulations / technical" subtitle="Technical & procedural notes, BOP, penalties…">
          <textarea
            className="field min-h-56 resize-y leading-relaxed"
            placeholder={'e.g.\n• Minimum weight 1240 kg incl. driver\n• Tyre allocation: 6 sets dry, 4 wet\n• Ride height may not be changed after scrutineering'}
            defaultValue={weekend.regulations}
            onBlur={(e) => set({ regulations: e.target.value })}
          />
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Key limits" subtitle="The numbers you check before every stop">
          <div className="space-y-3">
            <Field label="Max fuel (L)">
              <Input
                type="number" step="1" defaultValue={weekend.maxFuelL ?? ''}
                onBlur={(e) => set({ maxFuelL: num(e.target.value) })}
              />
            </Field>
            <Field label="Tyre sets">
              <Input
                defaultValue={weekend.tyreSets ?? ''} placeholder="e.g. 6 dry + 4 wet"
                onBlur={(e) => set({ tyreSets: e.target.value })}
              />
            </Field>
            <div className="rounded-lg border border-line bg-panel2/40 px-3 py-2.5">
              <Toggle
                checked={!!weekend.refuelAllowed}
                onChange={(v) => set({ refuelAllowed: v })}
                label="Refuelling allowed during pit stops"
              />
            </div>
          </div>
        </Card>

        <SectionTitle>Reminders</SectionTitle>
        <div className="rounded-xl border border-line bg-panel2/40 p-4 text-xs leading-relaxed text-dim">
          These rules appear on the Reports printout, and the max-fuel value pre-fills the fuel calculator
          in the Common Area. Keep them current after the drivers' briefing.
        </div>
      </div>
    </div>
  );
}
