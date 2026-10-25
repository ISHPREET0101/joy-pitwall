import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft, CalendarClock, CheckSquare, FileBarChart, Flag, Gauge, Hash,
  LayoutDashboard, ListChecks, Map as MapIcon, Menu, ScrollText, StickyNote,
  ThermometerSun, Users, Warehouse, Wrench, X,
} from 'lucide-react';
import { db, type JoyDB } from '../lib/db';
import type { Weekend, TimetableSession, Team, Car, Driver } from '../lib/types';
import { findCurrentSession, findNextSession, sortSessions, STATUS_META } from '../lib/sessions';
import { useNow } from '../lib/hooks';
import { Clock } from './Clock';
import { Badge } from './ui';
import { useUI } from '../store/ui';
import { fmtDuration, parseClock } from '../lib/format';

export interface WeekendCtxData {
  id: string;
  weekend: Weekend;
  sessions: TimetableSession[];
  teams: Team[];
  cars: Car[];
  drivers: Driver[];
  driversByCar: Record<string, Driver[]>;
  teamById: Record<string, Team>;
}

const WeekendContext = createContext<WeekendCtxData | null>(null);
export function useWeekend(): WeekendCtxData {
  const ctx = useContext(WeekendContext);
  if (!ctx) throw new Error('useWeekend must be used inside WeekendLayout');
  return ctx;
}

export function carSortKey(c: Car): number {
  const n = parseInt(c.number, 10);
  return isFinite(n) ? n : 9999;
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  to, icon, label, end = false, dot,
}: {
  to: string; icon: React.ReactNode; label: React.ReactNode; end?: boolean; dot?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition ${
          isActive ? 'bg-accent/10 text-accent border border-accent/20' : 'text-dim hover:bg-white/[0.04] hover:text-ink border border-transparent'
        }`
      }
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="truncate">{label}</span>
      {dot && <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
    </NavLink>
  );
}

export function WeekendLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setLastWeekend = useUI((s) => s.setLastWeekend);
  const [drawer, setDrawer] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    if (id) setLastWeekend(id);
  }, [id, setLastWeekend]);
  useEffect(() => setDrawer(false), [id]);

  const loaded = useLiveQuery(async () => {
    if (!id) return 'missing';
    const w = await db.weekends.get(id);
    return w ? 'ok' : 'missing';
  }, [id]);

  const weekend = useLiveQuery(() => (id ? db.weekends.get(id) : undefined), [id]);
  const sessions = useLiveQuery(
    () => (id ? db.sessions.where('weekendId').equals(id).toArray() : Promise.resolve([] as TimetableSession[])),
    [id]
  ) ?? [];
  const teams = useLiveQuery(
    () => (id ? db.teams.where('weekendId').equals(id).toArray() : Promise.resolve([] as Team[])),
    [id]
  ) ?? [];
  const cars = useLiveQuery(
    () => (id ? db.cars.where('weekendId').equals(id).toArray() : Promise.resolve([] as Car[])),
    [id]
  ) ?? [];

  const carIds = cars.map((c) => c.id);
  const drivers = useLiveQuery(
    () => (carIds.length ? db.drivers.where('carId').anyOf(carIds).toArray() : Promise.resolve([] as Driver[])),
    [carIds.join('|')]
  ) ?? [];

  if (loaded === 'missing') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-dim">That weekend no longer exists.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back to garage</button>
      </div>
    );
  }
  if (!weekend) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="num animate-pulse text-dim">Loading weekend…</div>
      </div>
    );
  }

  const sortedSessions = sortSessions(sessions);
  const carsSorted = cars.slice().sort((a, b) => carSortKey(a) - carSortKey(b));
  const driversByCar: Record<string, Driver[]> = {};
  for (const d of drivers) {
    (driversByCar[d.carId] ??= []).push(d);
  }
  const teamById: Record<string, Team> = {};
  for (const t of teams) teamById[t.id] = t;

  const ctx: WeekendCtxData = {
    id: id!,
    weekend,
    sessions: sortedSessions,
    teams,
    cars: carsSorted,
    drivers,
    driversByCar,
    teamById,
  };

  const current = findCurrentSession(sortedSessions, now);
  const next = findNextSession(sortedSessions, now);

  const sidebar = (
    <SidebarContent ctx={ctx} carsSorted={carsSorted} teamById={teamById} onNavigate={() => setDrawer(false)} />
  );

  return (
    <WeekendContext.Provider value={ctx}>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-panel/60 px-3 py-4 backdrop-blur lg:flex">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 overflow-y-auto border-r border-line bg-panel px-3 py-4">
              <button className="btn btn-ghost mb-2 !px-2" onClick={() => setDrawer(false)}>
                <X size={16} /> Close
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
              <button className="btn btn-ghost !px-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Menu">
                <Menu size={18} />
              </button>
              <button className="btn btn-ghost !px-2" onClick={() => navigate('/')} title="All weekends">
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-bold">{weekend.name}</h1>
                  {weekend.round && <Badge color="#3ee1ff">{weekend.round}</Badge>}
                </div>
                <div className="truncate text-[11px] text-dim">
                  {weekend.venue}
                  {weekend.trackLengthKm ? ` · ${weekend.trackLengthKm} km` : ''}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="hidden items-center gap-2 sm:flex">
                  {current ? (
                    <span className="flex items-center gap-2 rounded-lg border border-line bg-panel2/70 px-2.5 py-1.5">
                      <span className="h-2 w-2 rounded-full live-dot" style={{ background: STATUS_META[current.status].color }} />
                      <span className="text-xs font-semibold">{current.name}</span>
                      <Badge color={STATUS_META[current.status].color}>{STATUS_META[current.status].label}</Badge>
                    </span>
                  ) : next ? (
                    <span className="hidden rounded-lg border border-line bg-panel2/70 px-2.5 py-1.5 text-xs text-dim md:block">
                      Next: <span className="font-semibold text-ink">{next.name}</span> in{' '}
                      <span className="num font-semibold text-accent">
                        {fmtDuration(
                          (parseClock(next.start) ?? 0) -
                            (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) +
                            (next.day > new Date().toISOString().slice(0, 10) ? 86400 : 0)
                        )}
                      </span>
                    </span>
                  ) : null}
                </div>
                <Clock />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </WeekendContext.Provider>
  );
}

function SidebarContent({
  ctx, carsSorted, teamById, onNavigate,
}: {
  ctx: WeekendCtxData;
  carsSorted: Car[];
  teamById: Record<string, Team>;
  onNavigate: () => void;
}) {
  const base = `/w/${ctx.id}`;
  return (
    <nav onClick={onNavigate}>
      <div className="mb-5 px-3">
        <div className="flex items-center gap-2">
          <img src="./icon.svg" alt="" className="h-7 w-7" />
          <div>
            <div className="text-[13px] font-black tracking-tight">JOY PITWALL</div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-faint">Race Engineering</div>
          </div>
        </div>
      </div>

      <NavSection title="Weekend">
        <NavItem to={base} end icon={<LayoutDashboard size={15} />} label="Overview" />
      </NavSection>

      <NavSection title="Common Area">
        <NavItem to={`${base}/timetable`} icon={<CalendarClock size={15} />} label="Timetable" />
        <NavItem to={`${base}/map`} icon={<MapIcon size={15} />} label="Track Map" />
        <NavItem to={`${base}/conditions`} icon={<ThermometerSun size={15} />} label="Conditions" />
        <NavItem to={`${base}/rules`} icon={<ScrollText size={15} />} label="Rules & Regs" />
        <NavItem to={`${base}/checklists`} icon={<ListChecks size={15} />} label="Checklists" />
        <NavItem to={`${base}/calcs`} icon={<Gauge size={15} />} label="Calculators" />
        <NavItem to={`${base}/notes`} icon={<StickyNote size={15} />} label="Notes" />
      </NavSection>

      <NavSection title="Cars">
        <NavItem to={`${base}/garage`} icon={<Warehouse size={15} />} label="Garage & Teams" />
        {carsSorted.map((c) => (
          <NavItem
            key={c.id}
            to={`${base}/car/${c.id}`}
            icon={<Hash size={15} />}
            label={c.number}
            dot={teamById[c.teamId]?.color}
          />
        ))}
        {!carsSorted.length && (
          <div className="px-3 py-1 text-[11px] text-faint">Add cars in the garage</div>
        )}
      </NavSection>

      <NavSection title="Analysis">
        <NavItem to={`${base}/compare`} icon={<Users size={15} />} label="Driver Compare" />
        <NavItem to={`${base}/reports`} icon={<FileBarChart size={15} />} label="Reports" />
      </NavSection>

      <div className="mt-8 border-t border-line px-3 pt-3 text-[10px] text-faint">
        All data stored locally on this device.
      </div>
    </nav>
  );
}
