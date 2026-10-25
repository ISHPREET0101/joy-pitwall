import type { Lap } from './types';

// ---- Lap statistics ----

export interface LapStats {
  count: number; // all laps
  timed: number; // timed laps excluding out/in
  best?: number;
  avg?: number;
  median?: number;
  sigma?: number;
  best5Avg?: number;
  top25Avg?: number;
  totalTime: number;
}

export function lapStats(laps: Lap[]): LapStats {
  const all = laps.slice().sort((a, b) => a.lapNo - b.lapNo);
  const times = all
    .filter((l) => l.timeSec != null && !l.isOut && !l.isIn)
    .map((l) => l.timeSec!);
  const sorted = times.slice().sort((a, b) => a - b);
  const n = times.length;
  const sum = times.reduce((a, b) => a + b, 0);
  const best = sorted[0];
  const avg = n ? sum / n : undefined;
  const median = n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.ceil((n - 1) / 2)]) / 2 : undefined;
  const sigma = n > 1 ? Math.sqrt(times.reduce((a, b) => a + (b - avg!) ** 2, 0) / (n - 1)) : undefined;
  const best5 = sorted.slice(0, Math.min(5, n));
  const best5Avg = best5.length ? best5.reduce((a, b) => a + b, 0) / best5.length : undefined;
  const q = Math.max(1, Math.ceil(n * 0.25));
  const top25 = sorted.slice(0, q);
  const top25Avg = top25.length ? top25.reduce((a, b) => a + b, 0) / top25.length : undefined;
  return {
    count: all.length,
    timed: n,
    best,
    avg,
    median,
    sigma,
    best5Avg,
    top25Avg,
    totalTime: all.reduce((a, l) => a + (l.timeSec ?? 0), 0),
  };
}

/** Normalise 0..1 with min-max across values; lower-is-better optional. */
export function normalize(values: number[], lowerIsBetter = true): number[] {
  const finite = values.filter((v) => isFinite(v));
  if (finite.length === 0) return values.map(() => NaN);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;
  return values.map((v) => {
    if (!isFinite(v)) return NaN;
    if (range === 0) return 1;
    const t = (v - min) / range;
    return lowerIsBetter ? 1 - t : t;
  });
}

// ---- Fuel calculations ----

export interface FuelInput {
  trackLengthKm?: number; // lap distance
  lapTimeSec?: number;
  litersPerLap?: number;
  fuelDensityKgPerL?: number; // default 0.745
}

export interface FuelConversions {
  litersPerLap?: number;
  kgPerLap?: number;
  kmPerLiter?: number;
  litersPer100km?: number;
  kgPerHour?: number;
  litersPerHour?: number;
}

export function fuelConversions(i: FuelInput): FuelConversions {
  const lpl = i.litersPerLap;
  const out: FuelConversions = {};
  if (lpl && lpl > 0) {
    out.litersPerLap = lpl;
    out.kgPerLap = lpl * (i.fuelDensityKgPerL ?? 0.745);
    if (i.trackLengthKm && i.trackLengthKm > 0) {
      out.kmPerLiter = i.trackLengthKm / lpl;
      out.litersPer100km = (lpl / i.trackLengthKm) * 100;
    }
    if (i.lapTimeSec && i.lapTimeSec > 0) {
      out.litersPerHour = (lpl / i.lapTimeSec) * 3600;
      out.kgPerHour = out.litersPerHour * (i.fuelDensityKgPerL ?? 0.745);
    }
  }
  return out;
}

/** Fuel needed for N laps + safety margin %, in litres and kg. */
export function fuelForLaps(litersPerLap: number, laps: number, marginPct = 0): { liters: number; kg: number } {
  const liters = litersPerLap * laps * (1 + marginPct / 100);
  return { liters, kg: liters * 0.745 };
}

// ---- Tyre pressure ----

export const BAR_PER_PSI = 1 / 14.5038;
export const PSI_PER_BAR = 14.5038;

export interface PressureInput {
  coldPsi: number;
  hotPsi: number;
  targetHotPsi: number;
  nextTempDeltaC?: number; // expected track temp change
  barPerC?: number; // pressure gain per °C, default 0.02 psi/°C equivalent
}

/**
 * Returns recommended cold pressure adjustments.
 * Logic: if hot is above target, reduce cold by the overshoot (the gas already
 * built up more pressure than desired), optionally compensating for a
 * predicted track-temperature change.
 */
export function pressureAdvice(i: PressureInput) {
  const overshoot = i.hotPsi - i.targetHotPsi;
  const adjNow = -overshoot;
  const tempAdj = i.nextTempDeltaC ? -(i.nextTempDeltaC * (i.barPerC ?? 0.029)) : 0;
  return {
    overshoot,
    recommendedColdNow: i.coldPsi + adjNow,
    adjustmentNow: adjNow,
    tempAdjustment: tempAdj,
    recommendedColdNext: i.coldPsi + adjNow + tempAdj,
  };
}

// ---- Weight ----

export interface WeightInput {
  driverKg: number;
  gearKg: number; // helmet + suit + HANS etc
  carKgNoFuel: number;
  fuelLitres: number;
  fuelDensity?: number;
  minimumKg: number;
}

export function weightCalc(i: WeightInput) {
  const density = i.fuelDensity ?? 0.745;
  const fuelKg = i.fuelLitres * density;
  const total = i.carKgNoFuel + fuelKg + i.driverKg + i.gearKg;
  const ballast = Math.max(0, i.minimumKg - total);
  const overweight = Math.max(0, total - i.minimumKg);
  return { fuelKg, total, ballast, overweight, margin: total - i.minimumKg };
}

export const KG_PER_LB = 0.453592;
