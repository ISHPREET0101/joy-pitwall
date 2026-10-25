import { db, uid } from './db';
import type {
  Weekend, TimetableSession, Team, Car, Driver, Stint, Lap, RunPlanStint,
  SetupItem, SetupEntry, SetupChange, Note, TyreReport, ChecklistItem,
} from './types';
import { downloadBlob } from './image';

interface Backup {
  app: 'joy-pitwall';
  version: 1;
  exportedAt: number;
  data: {
    weekend: Weekend;
    sessions: TimetableSession[];
    teams: Team[];
    cars: Car[];
    drivers: Driver[];
    stints: Stint[];
    laps: Lap[];
    runPlans: RunPlanStint[];
    setupItems: SetupItem[];
    setupEntries: SetupEntry[];
    setupChanges: SetupChange[];
    notes: Note[];
    tyres: TyreReport[];
    checklists: ChecklistItem[];
  };
}

export async function exportWeekendBackup(weekendId: string) {
  const weekend = await db.weekends.get(weekendId);
  if (!weekend) throw new Error('Weekend not found');
  const cars = await db.cars.where('weekendId').equals(weekendId).toArray();
  const carIds = cars.map((c) => c.id);
  const stints = await db.stints.where('carId').anyOf(carIds).toArray();
  const stintIds = stints.map((s) => s.id);
  const backup: Backup = {
    app: 'joy-pitwall',
    version: 1,
    exportedAt: Date.now(),
    data: {
      weekend,
      sessions: await db.sessions.where('weekendId').equals(weekendId).toArray(),
      teams: await db.teams.where('weekendId').equals(weekendId).toArray(),
      cars,
      drivers: await db.drivers.where('carId').anyOf(carIds).toArray(),
      stints,
      laps: await db.laps.where('stintId').anyOf(stintIds).toArray(),
      runPlans: await db.runPlans.where('carId').anyOf(carIds).toArray(),
      setupItems: await db.setupItems.where('carId').anyOf(carIds).toArray(),
      setupEntries: await db.setupEntries.where('carId').anyOf(carIds).toArray(),
      setupChanges: await db.setupChanges.where('carId').anyOf(carIds).toArray(),
      notes: await db.notes.where('weekendId').equals(weekendId).toArray(),
      tyres: await db.tyres.where('carId').anyOf(carIds).toArray(),
      checklists: await db.checklists.where('weekendId').equals(weekendId).toArray(),
    },
  };
  const safe = weekend.name.replace(/[^\w-]+/g, '_');
  downloadBlob(`JOY_${safe}_backup.json`, JSON.stringify(backup, null, 2));
}

/** Import a backup as a NEW weekend (ids remapped to avoid collisions). */
export async function importWeekendBackup(file: File): Promise<string> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Backup;
  if (parsed.app !== 'joy-pitwall' || !parsed.data?.weekend) {
    throw new Error('Not a JOY Pitwall backup file');
  }
  const d = parsed.data;
  const newWeekendId = uid();

  const newCarId = new Map<string, string>();
  for (const c of d.cars) newCarId.set(c.id, uid());
  const newStintId = new Map<string, string>();
  for (const s of d.stints) newStintId.set(s.id, uid());
  const newDriverId = new Map<string, string>();
  for (const dr of d.drivers) newDriverId.set(dr.id, uid());

  const remapCar = (carId: string) => newCarId.get(carId) ?? carId;
  const remapDriver = (id?: string) => (id ? newDriverId.get(id) : undefined);
  const remapStint = (id: string) => newStintId.get(id) ?? id;

  await db.transaction('rw', db.tables, async () => {
    await db.weekends.add({ ...d.weekend, id: newWeekendId, createdAt: Date.now() });
    for (const s of d.sessions) {
      await db.sessions.add({ ...s, id: uid(), weekendId: newWeekendId });
    }
    for (const t of d.teams) {
      await db.teams.add({ ...t, id: uid(), weekendId: newWeekendId });
    }
    for (const c of d.cars) {
      await db.cars.add({ ...c, id: newCarId.get(c.id)!, weekendId: newWeekendId });
    }
    for (const dr of d.drivers) {
      await db.drivers.add({ ...dr, id: newDriverId.get(dr.id)!, carId: remapCar(dr.carId) });
    }
    for (const s of d.stints) {
      await db.stints.add({
        ...s,
        id: newStintId.get(s.id)!,
        carId: remapCar(s.carId),
        driverId: remapDriver(s.driverId),
      });
    }
    for (const l of d.laps) {
      await db.laps.add({ ...l, id: uid(), stintId: remapStint(l.stintId), carId: remapCar(l.carId) });
    }
    for (const r of d.runPlans) {
      await db.runPlans.add({ ...r, id: uid(), carId: remapCar(r.carId), driverId: remapDriver(r.driverId) });
    }
    for (const r of d.setupItems) {
      await db.setupItems.add({ ...r, id: uid(), carId: remapCar(r.carId) });
    }
    for (const r of d.setupEntries) {
      await db.setupEntries.add({ ...r, id: uid(), carId: remapCar(r.carId) });
    }
    for (const r of d.setupChanges) {
      await db.setupChanges.add({ ...r, id: uid(), carId: remapCar(r.carId) });
    }
    for (const n of d.notes) {
      await db.notes.add({
        ...n,
        id: uid(),
        weekendId: newWeekendId,
        carId: n.carId ? remapCar(n.carId) : undefined,
        driverId: remapDriver(n.driverId),
      });
    }
    for (const t of d.tyres) {
      await db.tyres.add({ ...t, id: uid(), carId: remapCar(t.carId) });
    }
    for (const c of d.checklists) {
      await db.checklists.add({ ...c, id: uid(), weekendId: newWeekendId });
    }
  });
  return newWeekendId;
}
