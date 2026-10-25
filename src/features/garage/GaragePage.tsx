import { useState } from 'react';
import { Hash, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { db, uid, TEAM_COLORS } from '../../lib/db';
import { Button, EmptyState, Input, Modal, Field } from '../../components/ui';
import { FlagPicker, Flag } from '../../components/FlagPicker';

export default function GaragePage() {
  const { id, teams, cars, driversByCar } = useWeekend();
  const [adding, setAdding] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);

  const teamsSorted = teams.slice().sort((a, b) => a.name.localeCompare(b.name));
  const nextColor = TEAM_COLORS[teams.length % TEAM_COLORS.length];

  async function addTeam() {
    if (!teamName.trim()) return;
    await db.teams.add({ id: uid(), weekendId: id, name: teamName.trim(), color: teamColor });
    setTeamName('');
    setTeamColor(TEAM_COLORS[(teams.length + 1) % TEAM_COLORS.length]);
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <WarehouseIcon /> Garage & Teams
          </h2>
          <p className="text-xs text-dim">Set up every team, car and driver for this weekend. Each car gets its own tab in the sidebar.</p>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add team
        </Button>
      </div>

      {teamsSorted.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No teams yet"
          hint="Create your first team, then add its cars — competition number, chassis and drivers."
          action={<Button variant="primary" onClick={() => setAdding(true)}><Plus size={14} /> Add team</Button>}
        />
      ) : (
        teamsSorted.map((team) => {
          const teamCars = cars.filter((c) => c.teamId === team.id);
          return (
            <div key={team.id} className="card overflow-hidden">
              <div className="h-1 w-full" style={{ background: team.color }} />
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: team.color }} />
                  <input
                    className="field !w-auto min-w-44 !border-transparent !bg-transparent !px-1 text-base font-bold hover:!border-line focus:!border-accent/60"
                    value={team.name}
                    onChange={(e) => db.teams.update(team.id, { name: e.target.value })}
                  />
                  <div className="flex gap-1">
                    {TEAM_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => db.teams.update(team.id, { color: c })}
                        className={`h-4 w-4 rounded-full transition ${team.color === c ? 'ring-2 ring-white/70' : 'opacity-50 hover:opacity-100'}`}
                        style={{ background: c }}
                        title="Team colour"
                      />
                    ))}
                  </div>
                  <button
                    className="btn btn-ghost ml-auto !p-2 hover:!text-red"
                    title="Delete team"
                    onClick={async () => {
                      if (!window.confirm(`Delete team "${team.name}" and all its cars?`)) return;
                      for (const c of teamCars) await deleteCarCascade(c.id);
                      await db.teams.delete(team.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  {teamCars.length === 0 && (
                    <p className="rounded-lg border border-dashed border-line2/60 px-3 py-3 text-center text-xs text-faint">
                      No cars in this team yet.
                    </p>
                  )}
                  {teamCars.map((car) => (
                    <CarRow key={car.id} car={car} />
                  ))}
                  <Button onClick={async () => {
                    await db.cars.add({ id: uid(), weekendId: id, teamId: team.id, number: String(nextFreeNumber(cars)), chassis: '', class: '' });
                  }}>
                    <Plus size={13} /> Add car
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add team"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" disabled={!teamName.trim()} onClick={addTeam}>Create team</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Team name">
            <Input autoFocus value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Apex Racing" onKeyDown={(e) => e.key === 'Enter' && addTeam()} />
          </Field>
          <Field label="Colour">
            <div className="flex gap-1.5">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTeamColor(c)}
                  className={`h-7 w-7 rounded-lg transition ${teamColor === c ? 'ring-2 ring-white/70' : 'opacity-60 hover:opacity-100'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function WarehouseIcon() {
  return <Users size={16} className="text-accent" />;
}

function nextFreeNumber(cars: { number: string }[]): number {
  const used = new Set(cars.map((c) => parseInt(c.number, 10)).filter((n) => isFinite(n)));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

async function deleteCarCascade(carId: string) {
  const stints = await db.stints.where('carId').equals(carId).toArray();
  await db.transaction('rw', db.tables, async () => {
    await db.laps.where('carId').equals(carId).delete();
    await db.runPlans.where('carId').equals(carId).delete();
    await db.setupItems.where('carId').equals(carId).delete();
    await db.setupEntries.where('carId').equals(carId).delete();
    await db.setupChanges.where('carId').equals(carId).delete();
    await db.tyres.where('carId').equals(carId).delete();
    await db.drivers.where('carId').equals(carId).delete();
    await db.stints.bulkDelete(stints.map((s) => s.id));
    await db.cars.delete(carId);
  });
}

function CarRow({ car }: { car: import('../../lib/types').Car }) {
  const { driversByCar, cars } = useWeekend();
  const [confirmDel, setConfirmDel] = useState(false);
  const drivers = driversByCar[car.id] ?? [];

  return (
    <div className="rounded-xl border border-line bg-panel2/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
          <Hash size={11} /> Car
        </span>
        <input
          className="field num !w-16 !px-2 text-center font-black"
          value={car.number}
          onChange={(e) => db.cars.update(car.id, { number: e.target.value })}
          placeholder="No."
        />
        <input
          className="field !w-52 !py-1.5"
          value={car.chassis}
          onChange={(e) => db.cars.update(car.id, { chassis: e.target.value })}
          placeholder="Chassis (e.g. GT3-EVO #014)"
        />
        <select
          className="field !w-36 !py-1.5"
          value={car.class}
          onChange={(e) => db.cars.update(car.id, { class: e.target.value })}
        >
          <option value="">Class…</option>
          {(['GT3', 'GT4', 'LMP2', 'LMP3', 'Hypercar', 'TCR', 'Proto', 'Other'] as const).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1">
          {confirmDel ? (
            <>
              <button
                className="btn btn-danger !py-1 !text-[11px]"
                onClick={async () => {
                  await deleteCarCascade(car.id);
                  setConfirmDel(false);
                }}
              >
                Delete car + data
              </button>
              <button className="btn btn-ghost !py-1 !text-[11px]" onClick={() => setConfirmDel(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-ghost !p-2 hover:!text-red" title="Delete car" onClick={() => setConfirmDel(true)}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Drivers */}
      <div className="mt-2.5 space-y-1.5">
        {drivers.map((d) => (
          <div key={d.id} className="group flex items-center gap-2 rounded-lg border border-line bg-bg/40 px-2.5 py-1.5">
            <UserPlus size={12} className="text-faint" />
            <input
              className="field !w-44 !border-transparent !bg-transparent !px-1 !py-0.5 text-sm hover:!border-line"
              value={d.name}
              onChange={(e) => db.drivers.update(d.id, { name: e.target.value })}
              placeholder="Driver name"
            />
            <FlagPicker
              className="!w-44"
              value={d.country || undefined}
              onChange={(code) => db.drivers.update(d.id, { country: code })}
            />
            <select
              className="field !w-28 !py-1 text-xs"
              value={d.role}
              onChange={(e) => db.drivers.update(d.id, { role: e.target.value })}
            >
              <option>Driver</option>
              <option>Reserve</option>
              <option>Rookie</option>
            </select>
            <button className="btn btn-ghost ml-auto !p-1 opacity-0 group-hover:opacity-100 hover:!text-red" onClick={() => db.drivers.delete(d.id)}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          className="btn btn-ghost !px-2 !text-xs text-dim"
          onClick={() => db.drivers.add({ id: uid(), carId: car.id, name: '', country: '', role: 'Driver' })}
        >
          <Plus size={12} /> Add driver
        </button>
      </div>
      {drivers.length === 0 && cars.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-faint">
          <Flag code={undefined} /> Add at least one driver per car — multiple drivers per car are supported.
        </p>
      )}
    </div>
  );
}
