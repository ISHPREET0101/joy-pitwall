import Dexie, { type Table } from 'dexie';
import type {
  Weekend,
  TimetableSession,
  Team,
  Car,
  Driver,
  Stint,
  Lap,
  RunPlanStint,
  SetupItem,
  SetupEntry,
  SetupChange,
  Note,
  TyreReport,
  ChecklistItem,
} from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class JoyDB extends Dexie {
  weekends!: Table<Weekend, string>;
  sessions!: Table<TimetableSession, string>;
  teams!: Table<Team, string>;
  cars!: Table<Car, string>;
  drivers!: Table<Driver, string>;
  stints!: Table<Stint, string>;
  laps!: Table<Lap, string>;
  runPlans!: Table<RunPlanStint, string>;
  setupItems!: Table<SetupItem, string>;
  setupEntries!: Table<SetupEntry, string>;
  setupChanges!: Table<SetupChange, string>;
  notes!: Table<Note, string>;
  tyres!: Table<TyreReport, string>;
  checklists!: Table<ChecklistItem, string>;

  constructor() {
    super('joy-pitwall');
    this.version(1).stores({
      weekends: 'id',
      sessions: 'id, weekendId, [weekendId+day]',
      teams: 'id, weekendId',
      cars: 'id, weekendId, teamId',
      drivers: 'id, carId',
      stints: 'id, carId, [carId+sessionName]',
      laps: 'id, stintId, carId',
      runPlans: 'id, carId, [carId+sessionName]',
      setupItems: 'id, carId',
      setupEntries: 'id, carId, itemId',
      setupChanges: 'id, carId',
      notes: 'id, weekendId, carId',
      tyres: 'id, carId',
      checklists: 'id, weekendId, [weekendId+day]',
    });
  }
}

export const db = new JoyDB();

/** Create a weekend with sensible defaults and return its id. */
export async function createWeekend(data: {
  name: string;
  round: string;
  venue: string;
  country: string;
  startDate: string;
  endDate: string;
  trackLengthKm?: number;
  trackMap?: string;
}): Promise<string> {
  const id = uid();
  const weekend: Weekend = {
    id,
    name: data.name,
    round: data.round,
    venue: data.venue,
    country: data.country,
    startDate: data.startDate,
    endDate: data.endDate,
    trackLengthKm: data.trackLengthKm,
    trackMap: data.trackMap,
    conditionsLog: [],
    rules: '',
    regulations: '',
    refuelAllowed: true,
    createdAt: Date.now(),
  };
  await db.weekends.add(weekend);
  return id;
}

export const TEAM_COLORS = [
  '#d6fa3e', '#3ee1ff', '#ff4d5e', '#ffd23e', '#4d8dff',
  '#ff9a3d', '#b18cff', '#2fd575', '#ff6fb5', '#5ce8d5',
];

export async function deleteWeekendCascade(weekendId: string) {
  await db.transaction('rw', db.tables, async () => {
    const cars = await db.cars.where('weekendId').equals(weekendId).toArray();
    const carIds = cars.map((c) => c.id);
    for (const carId of carIds) {
      const stints = await db.stints.where('carId').equals(carId).toArray();
      const stintIds = stints.map((s) => s.id);
      await db.laps.where('carId').equals(carId).delete();
      await db.runPlans.where('carId').equals(carId).delete();
      await db.setupItems.where('carId').equals(carId).delete();
      await db.setupEntries.where('carId').equals(carId).delete();
      await db.setupChanges.where('carId').equals(carId).delete();
      await db.tyres.where('carId').equals(carId).delete();
      await db.drivers.where('carId').equals(carId).delete();
      await db.stints.bulkDelete(stintIds);
    }
    await db.cars.where('weekendId').equals(weekendId).delete();
    await db.teams.where('weekendId').equals(weekendId).delete();
    await db.sessions.where('weekendId').equals(weekendId).delete();
    await db.notes.where('weekendId').equals(weekendId).delete();
    await db.checklists.where('weekendId').equals(weekendId).delete();
    await db.weekends.delete(weekendId);
  });
}
