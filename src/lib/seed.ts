import { db, uid, createWeekend, TEAM_COLORS } from './db';
import type { Lap, Stint } from './types';
import { toISODate } from './format';

/** Build a fully populated demo weekend so the app can be explored instantly. */
export async function createDemoWeekend(): Promise<string> {
  const today = new Date();
  const day = (offset: number) => toISODate(new Date(today.getTime() + offset * 86400000));

  const weekendId = await createWeekend({
    name: 'Demo Weekend — Barcelona',
    round: 'R4',
    venue: 'Circuit de Barcelona-Catalunya',
    country: 'ES',
    startDate: day(-1),
    endDate: day(1),
    trackLengthKm: 4.657,
  });
  await db.weekends.update(weekendId, {
    airTempC: 24,
    trackTempC: 41,
    weather: 'Clear',
    wind: 'NE 8 km/h',
    grip: 'Rubbered in',
    surface: 'Abrasive',
    conditionsNotes: 'High track temps expected all weekend — watch rear tyre wear on the long right handers.',
    rules: 'Max 2 drivers per car per race. Driver change in pit box only. Refuelling permitted during pit stops.',
    regulations: 'Chapter 12 — Technical: minimum weight 1240 kg including driver. Tyre allocation: 6 sets dry.',
    maxFuelL: 120,
    refuelAllowed: true,
    tyreSets: '6 dry + 4 wet',
  });

  const wk = weekendId;
  const mkSession = (d: string, name: string, start: string, end: string, category: string, status: 'scheduled' | 'green' | 'chequered' = 'scheduled', order: number) =>
    ({ id: uid(), weekendId: wk, day: d, name, start, end, category, status, order });

  await db.sessions.bulkAdd([
    mkSession(day(-1), 'Collective Test 1', '09:00', '12:00', 'Practice', 'chequered', 1),
    mkSession(day(-1), 'Collective Test 2', '14:00', '17:00', 'Practice', 'chequered', 2),
    mkSession(day(0), 'Free Practice', '09:30', '10:30', 'Practice', 'chequered', 3),
    mkSession(day(0), 'Qualifying', '13:10', '13:50', 'Qualifying', 'green', 4),
    mkSession(day(1), 'Warm Up', '09:00', '09:20', 'Practice', 'scheduled', 5),
    mkSession(day(1), 'Race', '12:40', '14:40', 'Race', 'scheduled', 6),
  ]);

  // Teams & cars
  const teamA = uid(), teamB = uid();
  await db.teams.bulkAdd([
    { id: teamA, weekendId: wk, name: 'Apex Racing', color: TEAM_COLORS[1] },
    { id: teamB, weekendId: wk, name: 'Vector Motorsport', color: TEAM_COLORS[2] },
  ]);
  const car1 = uid(), car2 = uid(), car3 = uid();
  await db.cars.bulkAdd([
    { id: car1, weekendId: wk, teamId: teamA, number: '17', chassis: 'GT3-EVO #014', class: 'GT3' },
    { id: car2, weekendId: wk, teamId: teamA, number: '18', chassis: 'GT3-EVO #021', class: 'GT3' },
    { id: car3, weekendId: wk, teamId: teamB, number: '07', chassis: 'GT4 #008', class: 'GT4' },
  ]);
  const d1 = uid(), d2 = uid(), d3 = uid(), d4 = uid(), d5 = uid();
  await db.drivers.bulkAdd([
    { id: d1, carId: car1, name: 'M. Rossi', country: 'IT', role: 'Driver' },
    { id: d2, carId: car1, name: 'J. Virtanen', country: 'FI', role: 'Driver' },
    { id: d3, carId: car2, name: 'A. Chen', country: 'SG', role: 'Driver' },
    { id: d4, carId: car2, name: 'L. Moreau', country: 'FR', role: 'Driver' },
    { id: d5, carId: car3, name: 'T. Bauer', country: 'DE', role: 'Driver' },
  ]);

  // A finished stint for car 17
  const stintId = uid();
  const stint: Stint = {
    id: stintId,
    carId: car1,
    sessionName: 'Free Practice',
    driverId: d1,
    compound: 'Medium',
    fuelAddedL: 30,
    startClock: '09:32:10',
    endClock: '09:51:44',
    notes: 'Systems check, aero ran low downforce',
    createdAt: Date.now() - 3600_000,
  };
  await db.stints.add(stint);
  const baseSec = 101.8;
  const laps: Lap[] = [];
  laps.push({ id: uid(), stintId, carId: car1, lapNo: 1, isOut: true, notes: 'Installation', createdAt: Date.now() - 3600_000 });
  for (let i = 0; i < 8; i++) {
    laps.push({
      id: uid(),
      stintId,
      carId: car1,
      lapNo: i + 2,
      timeSec: +(baseSec + (Math.random() * 1.2 - 0.5) + i * 0.05).toFixed(3),
      isIn: i === 7,
      notes: i === 7 ? 'In lap' : undefined,
      createdAt: Date.now() - 3600_000 + i * 1000,
    });
  }
  await db.laps.bulkAdd(laps);

  // Run plan
  await db.runPlans.bulkAdd([
    { id: uid(), carId: car1, sessionName: 'Qualifying', stintNo: 1, plannedLaps: 6, fuelL: 12, compound: 'Soft', driverId: d1, notes: 'Low fuel run' },
    { id: uid(), carId: car1, sessionName: 'Qualifying', stintNo: 2, plannedLaps: 5, fuelL: 10, compound: 'Soft', driverId: d2, notes: 'Second set' },
    { id: uid(), carId: car1, sessionName: 'Race', stintNo: 1, plannedLaps: 22, fuelL: 95, compound: 'Medium', driverId: d1, notes: 'Full tank' },
    { id: uid(), carId: car1, sessionName: 'Race', stintNo: 2, plannedLaps: 20, fuelL: 88, compound: 'Medium', driverId: d2, notes: 'To the flag' },
  ]);

  // Setup sheet
  const items = [
    { name: 'Front wing', unit: 'clicks', weight: 5 },
    { name: 'Rear wing', unit: 'clicks', weight: 5 },
    { name: 'Front ARB', unit: 'blades', weight: 4 },
    { name: 'Rear ARB', unit: 'blades', weight: 4 },
    { name: 'Front camber', unit: '°', weight: 3 },
    { name: 'Rear camber', unit: '°', weight: 3 },
    { name: 'Front toe', unit: 'mm', weight: 2 },
    { name: 'Tyre pressure FL/FR', unit: 'psi', weight: 4 },
    { name: 'Tyre pressure RL/RR', unit: 'psi', weight: 4 },
  ];
  await db.setupItems.bulkAdd(
    items.map((it, i) => ({
      id: uid(), carId: car1, name: it.name, unit: it.unit,
      weight: it.weight, locked: i === 5, order: i,
    }))
  );

  await db.setupChanges.bulkAdd([
    { id: uid(), carId: car1, ts: Date.now() - 7200_000, sessionName: 'Collective Test 2', type: 'Aero', item: 'Rear wing', from: '4', to: '6', weight: 5, resultDelta: '-0.28', notes: 'More rear for balance' },
    { id: uid(), carId: car1, ts: Date.now() - 5400_000, sessionName: 'Free Practice', type: 'Suspension', item: 'Front ARB', from: '2', to: '3', weight: 4, resultDelta: '+0.05', notes: 'Slightly too stiff' },
  ]);

  // Tyre reports
  await db.tyres.bulkAdd([
    { id: uid(), carId: car1, sessionName: 'Free Practice', position: 'RL', compound: 'Medium', coldPressure: 22.5, hotPressure: 27.8, hotTempC: 88, graining: 'Light', images: [], notes: 'Graining outer shoulder from T5/T9', createdAt: Date.now() - 1800_000 },
    { id: uid(), carId: car1, sessionName: 'Free Practice', position: 'RR', compound: 'Medium', coldPressure: 22.5, hotPressure: 28.6, hotTempC: 94, graining: 'None', images: [], notes: '', createdAt: Date.now() - 1790_000 },
  ]);

  // Notes
  await db.notes.bulkAdd([
    { id: uid(), weekendId: wk, carId: car1, sessionName: 'Free Practice', author: 'Driver', driverId: d1, text: 'Car is loose on entry into T5, needs more front. Understeer in the long right of T9 with fuel on board.', images: [], createdAt: Date.now() - 2000_000 },
    { id: uid(), weekendId: wk, carId: car1, sessionName: 'Free Practice', author: 'Engineer', text: 'Plan: +1 click rear wing, drop 0.2 bar rear cold pressures. Check brakes temps after long run.', images: [], createdAt: Date.now() - 1500_000 },
    { id: uid(), weekendId: wk, sessionName: 'Qualifying', author: 'Engineer', text: 'Track open, green flag. Qualifying started on time.', images: [], createdAt: Date.now() - 600_000 },
  ]);

  // Checklist
  const chk = [
    { category: 'Car', text: 'Torque all wheels, log pressures', done: true },
    { category: 'Car', text: 'Fuel sample + cell filled to plan', done: true },
    { category: 'Car', text: 'Telemetry download / SD cards in', done: true },
    { category: 'Garage', text: 'Tyre blankets on target temps', done: false },
    { category: 'Garage', text: 'Pit box: fuel gear, fire extinguisher, spill kit', done: false },
    { category: 'Engineer', text: 'Run plan printed & briefed to drivers', done: false },
    { category: 'Engineer', text: 'Radio check with all drivers', done: false },
  ];
  await db.checklists.bulkAdd(
    chk.map((c, i) => ({ id: uid(), weekendId: wk, day: day(0), category: c.category, text: c.text, done: c.done, order: i }))
  );

  return weekendId;
}
