// ---- Core data model for JOY Pitwall ----

export type SessionStatus =
  | 'scheduled'
  | 'green'
  | 'yellow'
  | 'red'
  | 'black'
  | 'chequered'
  | 'cancelled';

export const SESSION_STATUSES: { id: SessionStatus; label: string }[] = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'green', label: 'Green' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'red', label: 'Red Flag' },
  { id: 'black', label: 'Black Flag' },
  { id: 'chequered', label: 'Chequered' },
  { id: 'cancelled', label: 'Cancelled' },
];

export interface ConditionSnapshot {
  ts: number;
  air?: number;
  track?: number;
  weather?: string;
  grip?: string;
  text?: string;
}

export interface Weekend {
  id: string;
  name: string;
  round: string;
  venue: string;
  country: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  trackLengthKm?: number;
  trackMap?: string; // data URL
  // Track conditions (live, editable)
  airTempC?: number;
  trackTempC?: number;
  weather?: string;
  wind?: string;
  grip?: string;
  surface?: string;
  conditionsNotes?: string;
  conditionsLog: ConditionSnapshot[];
  rules: string;
  regulations: string;
  maxFuelL?: number;
  refuelAllowed?: boolean;
  tyreSets?: string;
  createdAt: number;
}

export interface TimetableSession {
  id: string;
  weekendId: string;
  day: string; // yyyy-mm-dd
  name: string;
  category?: string;
  start: string; // HH:mm
  end: string; // HH:mm
  status: SessionStatus;
  notes?: string;
  order: number;
}

export interface Team {
  id: string;
  weekendId: string;
  name: string;
  color: string; // hex
}

export interface Car {
  id: string;
  weekendId: string;
  teamId: string;
  number: string;
  chassis: string;
  class: string;
}

export interface Driver {
  id: string;
  carId: string;
  name: string;
  country: string; // ISO alpha-2, uppercase
  role: string; // Driver | Reserve | Rookie
}

export interface Stint {
  id: string;
  carId: string;
  sessionName: string;
  driverId?: string;
  compound?: string;
  fuelAddedL?: number;
  startClock?: string; // HH:mm:ss
  endClock?: string; // HH:mm:ss
  notes?: string;
  createdAt: number;
}

export interface Lap {
  id: string;
  stintId: string;
  carId: string;
  lapNo: number;
  timeSec?: number;
  isOut?: boolean;
  isIn?: boolean;
  notes?: string;
  createdAt: number;
}

export interface RunPlanStint {
  id: string;
  carId: string;
  sessionName: string;
  stintNo: number;
  plannedLaps: number;
  fuelL: number;
  compound: string;
  driverId?: string;
  notes?: string;
}

export interface SetupItem {
  id: string;
  carId: string;
  name: string;
  unit?: string;
  weight: number; // 1..5 importance
  locked: boolean; // greyed out
  order: number;
}

export interface SetupEntry {
  id: string; // `${itemId}::${sessionName}`
  carId: string;
  itemId: string;
  sessionName: string;
  value: string;
}

export type SetupChangeType = 'Suspension' | 'Aero' | 'Part' | 'Other';

export interface SetupChange {
  id: string;
  carId: string;
  ts: number;
  sessionName: string;
  type: SetupChangeType;
  item: string;
  from: string;
  to: string;
  weight: number; // 1..5
  resultDelta?: string; // e.g. "-0.3s"
  notes?: string;
}

export interface Note {
  id: string;
  weekendId: string;
  carId?: string;
  sessionName?: string;
  author: 'Engineer' | 'Driver';
  driverId?: string;
  text: string;
  images: string[];
  createdAt: number;
}

export interface TyreReport {
  id: string;
  carId: string;
  sessionName: string;
  position: string; // FL FR RL RR
  compound: string;
  coldPressure?: number; // psi
  hotPressure?: number; // psi
  hotTempC?: number;
  graining: 'None' | 'Light' | 'Medium' | 'Heavy';
  images: string[];
  notes?: string;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  weekendId: string;
  day: string; // yyyy-mm-dd
  category: string;
  text: string;
  done: boolean;
  doneAt?: number;
  order: number;
}

export const TYRE_POSITIONS = ['FL', 'FR', 'RL', 'RR'] as const;
export const COMPOUNDS = ['Soft', 'Medium', 'Hard', 'Wet', 'Intermediate', 'Other'] as const;
export const CAR_CLASSES = ['GT3', 'GT4', 'LMP2', 'LMP3', 'Hypercar', 'TCR', 'Proto', 'Other'] as const;
export const GRIP_LEVELS = ['Green', 'Lightly rubbered', 'Rubbered in', 'Oily', 'Damp', 'Wet'] as const;
export const WEATHERS = ['Clear', 'Cloudy', 'Overcast', 'Light rain', 'Rain', 'Thunderstorm', 'Fog'] as const;
