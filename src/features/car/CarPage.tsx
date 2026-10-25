import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, ClipboardList, Gauge, ListTree, StickyNote, Wrench } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { Tabs } from '../../components/ui';
import { Flag } from '../../components/FlagPicker';
import CarDashboard from './CarDashboard';
import StintLog from './StintLog';
import RunPlan from './RunPlan';
import SetupPage from './SetupPage';
import TyresPage from './TyresPage';
import { NotesPanel } from '../../components/NotesShared';

export type CarSub = 'dashboard' | 'log' | 'plan' | 'setup' | 'tyres' | 'notes';

const SUB_TABS: { id: CarSub; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Gauge size={13} /> },
  { id: 'log', label: 'Stint & Lap Log', icon: <ListTree size={13} /> },
  { id: 'plan', label: 'Run Plan', icon: <ClipboardList size={13} /> },
  { id: 'setup', label: 'Setup', icon: <Wrench size={13} /> },
  { id: 'tyres', label: 'Tyres', icon: <CalendarClock size={13} /> },
  { id: 'notes', label: 'Notes', icon: <StickyNote size={13} /> },
];

export default function CarPage() {
  const { id: weekendId, carId, sub } = useParams<{ id: string; carId: string; sub?: string }>();
  const navigate = useNavigate();
  const { cars, driversByCar, teamById } = useWeekend();

  const car = cars.find((c) => c.id === carId);
  useEffect(() => {
    if (!car && cars.length) navigate(`/w/${weekendId}/garage`, { replace: true });
  }, [car, cars.length, navigate, weekendId]);
  if (!car) return <div className="py-10 text-center text-dim">Car not found…</div>;

  const active: CarSub = (SUB_TABS.some((t) => t.id === sub) ? sub : 'dashboard') as CarSub;
  const team = teamById[car.teamId];
  const drivers = driversByCar[car.id] ?? [];

  return (
    <div className="space-y-4">
      {/* Car header */}
      <div className="card relative overflow-hidden p-4">
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: team?.color ?? '#5f6f83' }} />
        <div className="flex flex-wrap items-center gap-4 pl-2">
          <div
            className="num flex h-14 w-16 items-center justify-center rounded-xl border text-2xl font-black"
            style={{ borderColor: `${team?.color ?? '#5f6f83'}55`, background: `${team?.color ?? '#5f6f83'}14`, color: team?.color ?? '#e9eff7' }}
          >
            {car.number}
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">
              {team?.name ?? 'Unassigned'} <span className="text-dim">· {car.class || '—'}</span>
            </h2>
            <p className="text-xs text-dim">{car.chassis || 'No chassis set'}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {drivers.map((d) => (
                <span key={d.id} className="flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2 py-0.5 text-xs text-dim">
                  <Flag code={d.country} /> {d.name || 'Unnamed'} <span className="text-[10px] text-faint">{d.role}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={SUB_TABS.map((t) => ({ id: t.id, label: <span className="flex items-center gap-1.5">{t.icon}{t.label}</span> }))}
        active={active}
        onChange={(s) => navigate(`/w/${weekendId}/car/${carId}/${s}`)}
      />

      {active === 'dashboard' && <CarDashboard carId={carId!} />}
      {active === 'log' && <StintLog carId={carId!} />}
      {active === 'plan' && <RunPlan carId={carId!} />}
      {active === 'setup' && <SetupPage carId={carId!} />}
      {active === 'tyres' && <TyresPage carId={carId!} />}
      {active === 'notes' && (
        <NotesPanel weekendId={weekendId!} fixedCarId={carId} title={`${car.number} — notes`} />
      )}
    </div>
  );
}
