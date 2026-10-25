import { useMemo, useState } from 'react';
import { Fuel, Scale, Thermometer } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { Card, Field, Input, Segmented, Select, Stat, Badge } from '../../components/ui';
import {
  fuelConversions, fuelForLaps, pressureAdvice, weightCalc,
  PSI_PER_BAR, BAR_PER_PSI, KG_PER_LB,
} from '../../lib/calc';
import { formatLapTime, num, parseLapTime } from '../../lib/format';

export default function CalculatorsPage() {
  const { weekend } = useWeekend();
  return (
    <div className="space-y-4">
      <FuelCalculator defaultTrackKm={weekend.trackLengthKm} maxFuelL={weekend.maxFuelL} />
      <div className="grid gap-4 xl:grid-cols-2">
        <TyrePressureCalculator />
        <WeightCalculator />
      </div>
    </div>
  );
}

function FuelCalculator({ defaultTrackKm, maxFuelL }: { defaultTrackKm?: number; maxFuelL?: number }) {
  const [trackKm, setTrackKm] = useState(defaultTrackKm?.toString() ?? '');
  const [lapTimeStr, setLapTimeStr] = useState('');
  const [mode, setMode] = useState<'lpl' | 'kml' | 'kgpl'>('lpl');
  const [raw, setRaw] = useState('');
  const [density, setDensity] = useState('0.745');
  const [planLaps, setPlanLaps] = useState('');
  const [margin, setMargin] = useState('5');
  const [sessionMin, setSessionMin] = useState('');
  const [fuelAvail, setFuelAvail] = useState('');

  const lapTime = parseLapTime(lapTimeStr);
  const track = num(trackKm);
  const d = num(density) ?? 0.745;

  const litersPerLap = useMemo(() => {
    const r = num(raw);
    if (r == null || r <= 0) return undefined;
    if (mode === 'lpl') return r;
    if (mode === 'kgpl') return r / d;
    // km/L
    if (track && track > 0) return track / r;
    return undefined;
  }, [raw, mode, track, d]);

  const conv = fuelConversions({ trackLengthKm: track, lapTimeSec: lapTime ?? undefined, litersPerLap, fuelDensityKgPerL: d });
  const plan = num(planLaps);
  const marg = num(margin) ?? 0;
  const planned = litersPerLap && plan ? fuelForLaps(litersPerLap, plan, marg) : undefined;
  const sessionLaps = lapTime && num(sessionMin) ? Math.floor((num(sessionMin)! * 60) / lapTime) : undefined;
  const sessionFuel = litersPerLap && sessionLaps ? fuelForLaps(litersPerLap, sessionLaps, marg) : undefined;
  const availLaps = litersPerLap && num(fuelAvail) ? Math.floor(num(fuelAvail)! / litersPerLap) : undefined;
  const availTime = lapTime && availLaps ? availLaps * lapTime : undefined;
  const overMax = maxFuelL && planned && planned.liters > maxFuelL;

  return (
    <Card
      title="Fuel calculator"
      subtitle="Convert between L/lap · kg/lap · km/L and plan stint fuel"
      right={<Fuel size={15} className="text-orange" />}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Track length (km)">
          <Input value={trackKm} onChange={(e) => setTrackKm(e.target.value)} placeholder="4.657" />
        </Field>
        <Field label="Lap time" hint="e.g. 1:42.3">
          <Input value={lapTimeStr} onChange={(e) => setLapTimeStr(e.target.value)} placeholder="1:42.3" />
        </Field>
        <Field label="Fuel density (kg/L)">
          <Input value={density} onChange={(e) => setDensity(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Segmented
            options={[
              { id: 'lpl', label: 'L/lap' },
              { id: 'kgpl', label: 'kg/lap' },
              { id: 'kml', label: 'km/L' },
            ]}
            value={mode}
            onChange={setMode}
            className="w-full [&>button]:flex-1"
          />
        </div>
        <Field label={mode === 'lpl' ? 'Litres per lap' : mode === 'kgpl' ? 'Kilograms per lap' : 'Kilometres per litre'} className="md:col-span-2">
          <Input value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={mode === 'kml' ? 'e.g. 2.4' : 'e.g. 2.15'} />
        </Field>
        {lapTime != null && (
          <div className="flex items-end text-xs text-dim md:col-span-2">
            Lap time: <span className="num ml-1.5 font-bold text-ink">{formatLapTime(lapTime)}</span>
          </div>
        )}
      </div>

      {conv.litersPerLap ? (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat label="L / lap" value={conv.litersPerLap.toFixed(2)} accent="#ff9a3d" />
          <Stat label="kg / lap" value={conv.kgPerLap!.toFixed(2)} />
          {conv.kmPerLiter != null && <Stat label="km / L" value={conv.kmPerLiter.toFixed(2)} />}
          {conv.litersPer100km != null && <Stat label="L / 100km" value={conv.litersPer100km.toFixed(1)} />}
          {conv.litersPerHour != null && <Stat label="L / hour" value={conv.litersPerHour.toFixed(1)} accent="#d6fa3e" />}
        </div>
      ) : (
        <p className="mt-3 text-xs text-faint">Enter a consumption figure above to get all conversions.</p>
      )}

      <div className="mt-4 grid gap-3 rounded-xl border border-line bg-panel2/40 p-3 md:grid-cols-4">
        <Field label="Stint / race laps">
          <Input value={planLaps} onChange={(e) => setPlanLaps(e.target.value)} placeholder="e.g. 22" />
        </Field>
        <Field label="Safety margin (%)">
          <Input value={margin} onChange={(e) => setMargin(e.target.value)} />
        </Field>
        <Field label="Session length (min)" hint="Estimates laps possible">
          <Input value={sessionMin} onChange={(e) => setSessionMin(e.target.value)} placeholder="e.g. 60" />
        </Field>
        <Field label="Fuel available (L)">
          <Input value={fuelAvail} onChange={(e) => setFuelAvail(e.target.value)} placeholder="e.g. 100" />
        </Field>
      </div>

      {(planned || sessionLaps || availLaps) && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {planned && (
            <Stat
              label={`Fuel for ${plan} laps`}
              value={`${planned.liters.toFixed(1)} L`}
              sub={`${planned.kg.toFixed(1)} kg · +${marg}% margin`}
              accent={overMax ? '#ff4d5e' : '#ff9a3d'}
            />
          )}
          {overMax && <Badge color="#ff4d5e">Exceeds max fuel ({maxFuelL} L)</Badge>}
          {sessionLaps && (
            <Stat
              label={`${sessionMin} min session`}
              value={`≈ ${sessionLaps} laps`}
              sub={sessionFuel ? `${sessionFuel.liters.toFixed(1)} L needed` : undefined}
              accent="#3ee1ff"
            />
          )}
          {availLaps && (
            <Stat
              label={`${fuelAvail} L gives`}
              value={`≈ ${availLaps} laps`}
              sub={availTime ? formatLapTime(availTime, 0) + ' running' : undefined}
              accent="#d6fa3e"
            />
          )}
        </div>
      )}
    </Card>
  );
}

function TyrePressureCalculator() {
  const [unit, setUnit] = useState<'psi' | 'bar'>('psi');
  const [cold, setCold] = useState('');
  const [hot, setHot] = useState('');
  const [targetHot, setTargetHot] = useState('');
  const [tempDelta, setTempDelta] = useState('');
  const k = 0.029; // psi per °C — typical gas law response for ~2.2 bar tyres

  const toPsi = (v: string) => {
    const n = num(v);
    if (n == null) return undefined;
    return unit === 'psi' ? n : n * PSI_PER_BAR;
  };
  const fmtP = (psi: number) => (unit === 'psi' ? psi.toFixed(1) : (psi * BAR_PER_PSI).toFixed(2));

  const c = toPsi(cold), h = toPsi(hot), t = toPsi(targetHot);
  const valid = c != null && h != null && t != null;
  const advice = valid ? pressureAdvice({ coldPsi: c!, hotPsi: h!, targetHotPsi: t!, nextTempDeltaC: num(tempDelta), barPerC: k }) : undefined;
  const hotDelta = valid ? h! - c! : undefined;

  return (
    <Card
      title="Tyre pressure — cold ↔ hot"
      subtitle="Work back from measured hot pressures to the next cold setting"
      right={<Thermometer size={15} className="text-accent2" />}
    >
      <div className="mb-3 flex justify-end">
        <Segmented
          options={[{ id: 'psi', label: 'psi' }, { id: 'bar', label: 'bar' }]}
          value={unit}
          onChange={setUnit}
          size="sm"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Current cold (${unit})`}>
          <Input value={cold} onChange={(e) => setCold(e.target.value)} placeholder="22.5" />
        </Field>
        <Field label={`Measured hot (${unit})`}>
          <Input value={hot} onChange={(e) => setHot(e.target.value)} placeholder="27.8" />
        </Field>
        <Field label={`Target hot (${unit})`} hint="Your known-good window, e.g. 28.0">
          <Input value={targetHot} onChange={(e) => setTargetHot(e.target.value)} placeholder="28.0" />
        </Field>
        <Field label="Track temp change next session (°C)" hint="+ hotter / − cooler">
          <Input value={tempDelta} onChange={(e) => setTempDelta(e.target.value)} placeholder="e.g. -5" />
        </Field>
      </div>

      {advice ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Stat
            label="Adjust cold by"
            value={`${advice.adjustmentNow > 0 ? '+' : ''}${fmtP(advice.adjustmentNow)} ${unit}`}
            sub={`Hot ran ${fmtP(advice.overshoot)} ${advice.overshoot >= 0 ? 'above' : 'below'} target`}
            accent={Math.abs(advice.adjustmentNow) < 0.3 ? '#2fd575' : '#ffd23e'}
          />
          <Stat
            label="Set cold now"
            value={`${fmtP(advice.recommendedColdNow)} ${unit}`}
            accent="#d6fa3e"
          />
          <Stat
            label="Cold for next session"
            value={`${fmtP(advice.recommendedColdNext)} ${unit}`}
            sub={num(tempDelta) != null ? `incl. ${num(tempDelta)}°C track delta` : 'no temp delta set'}
            accent="#3ee1ff"
          />
          {hotDelta != null && (
            <div className="rounded-lg border border-line bg-panel2/40 px-3 py-2 text-xs text-dim sm:col-span-3">
              Pressure build-up cold → hot: <span className="num font-bold text-ink">+{fmtP(hotDelta)} {unit}</span>.
              Rule of thumb: ~1% of absolute pressure per 10°C — if your build-up is far from that, check for
              rim leaks or blanket temperature error.
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-faint">Enter cold, measured hot and target hot to get the adjustment.</p>
      )}
    </Card>
  );
}

function WeightCalculator() {
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [driver, setDriver] = useState('');
  const [gear, setGear] = useState('8.5');
  const [car, setCar] = useState('');
  const [fuelL, setFuelL] = useState('');
  const [density, setDensity] = useState('0.745');
  const [minW, setMinW] = useState('');

  const toKg = (v: string) => {
    const n = num(v);
    if (n == null) return undefined;
    return unit === 'kg' ? n : n * KG_PER_LB;
  };
  const fmtKg = (kg: number) => (unit === 'kg' ? kg.toFixed(1) : (kg / KG_PER_LB).toFixed(1));

  const res = useMemo(() => {
    const dk = toKg(driver), gk = toKg(gear), ck = toKg(car), mk = toKg(minW), fl = num(fuelL), dn = num(density) ?? 0.745;
    if (dk == null || ck == null || mk == null) return undefined;
    return weightCalc({ driverKg: dk, gearKg: gk ?? 0, carKgNoFuel: ck, fuelLitres: fl ?? 0, fuelDensity: dn, minimumKg: mk });
  }, [driver, gear, car, fuelL, minW, density, unit]);

  return (
    <Card
      title="Driver & ballast weight"
      subtitle="Driver + gear + fuel vs minimum weight"
      right={<Scale size={15} className="text-purple" />}
    >
      <div className="mb-3 flex items-center justify-between">
        <Segmented
          options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]}
          value={unit}
          onChange={setUnit}
          size="sm"
        />
        {res && (
          <Badge color={res.ballast > 0.5 ? '#ffd23e' : '#2fd575'}>
            {res.ballast > 0.5 ? `Add ${fmtKg(res.ballast)} kg ballast` : 'At or above minimum'}
          </Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`Driver weight (${unit})`}>
          <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="75" />
        </Field>
        <Field label={`Gear: helmet + suit + HANS (${unit})`}>
          <Input value={gear} onChange={(e) => setGear(e.target.value)} />
        </Field>
        <Field label={`Car weight, no fuel (${unit})`}>
          <Input value={car} onChange={(e) => setCar(e.target.value)} placeholder="1150" />
        </Field>
        <Field label="Fuel on board (L)">
          <Input value={fuelL} onChange={(e) => setFuelL(e.target.value)} placeholder="30" />
        </Field>
        <Field label="Fuel density (kg/L)">
          <Input value={density} onChange={(e) => setDensity(e.target.value)} />
        </Field>
        <Field label={`Minimum weight (${unit})`}>
          <Input value={minW} onChange={(e) => setMinW(e.target.value)} placeholder="1240" />
        </Field>
      </div>
      {res && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Fuel mass" value={`${fmtKg(res.fuelKg)} ${unit === 'kg' ? 'kg' : 'lb'}`} accent="#ff9a3d" />
          <Stat label="Total weight" value={`${fmtKg(res.total)}`} sub="car + fuel + driver + gear" accent="#d6fa3e" />
          <Stat label="Ballast to add" value={fmtKg(res.ballast)} accent={res.ballast > 0 ? '#ffd23e' : '#2fd575'} />
          <Stat label="Margin vs min" value={`${res.margin >= 0 ? '+' : ''}${fmtKg(res.margin)}`} accent={res.margin >= 0 ? '#2fd575' : '#ff4d5e'} />
        </div>
      )}
    </Card>
  );
}
