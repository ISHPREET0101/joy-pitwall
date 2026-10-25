import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import { createWeekend } from '../../lib/db';
import { Button, Card, Field, Input, Select } from '../../components/ui';
import { ImageUpload } from '../../components/ImageUpload';
import { FlagPicker } from '../../components/FlagPicker';
import { COUNTRIES } from '../../lib/countries';
import { toISODate } from '../../lib/format';

export default function NewWeekendPage() {
  const navigate = useNavigate();
  const today = toISODate(new Date());
  const [name, setName] = useState('');
  const [round, setRound] = useState('');
  const [venue, setVenue] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [trackLengthKm, setTrackLengthKm] = useState('');
  const [trackMap, setTrackMap] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const valid = name.trim() && venue.trim();

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const id = await createWeekend({
        name: name.trim(),
        round: round.trim(),
        venue: venue.trim(),
        country,
        startDate,
        endDate,
        trackLengthKm: trackLengthKm ? parseFloat(trackLengthKm) : undefined,
        trackMap: trackMap[0],
      });
      navigate(`/w/${id}/garage`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <button className="btn btn-ghost mb-4 !px-2" onClick={() => navigate('/')}>
        <ArrowLeft size={15} /> Back
      </button>
      <h1 className="text-xl font-black tracking-tight">Create a new weekend</h1>
      <p className="mb-5 text-xs text-dim">Set up the event basics and the track map — you'll add teams and cars next.</p>

      <Card title="Event" className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Event name *" className="sm:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. International GT Open" autoFocus />
          </Field>
          <Field label="Round">
            <Input value={round} onChange={(e) => setRound(e.target.value)} placeholder="e.g. R4" />
          </Field>
          <Field label="Venue *">
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Circuit de Barcelona-Catalunya" />
          </Field>
          <Field label="Country">
            <FlagPicker value={country || undefined} onChange={setCountry} />
          </Field>
          <Field label="Track length (km)" hint="Used by the fuel calculators">
            <Input type="number" step="0.001" value={trackLengthKm} onChange={(e) => setTrackLengthKm(e.target.value)} placeholder="4.657" />
          </Field>
          <Field label="First day">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Last day">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card
        title="Track map"
        subtitle="Upload the circuit map for this round — viewable from the Common Area"
        className="mb-5"
        right={<MapIcon size={15} className="text-faint" />}
      >
        <ImageUpload images={trackMap} onChange={setTrackMap} multiple={false} maxDim={2000} label="Drop the track map here or click to browse" />
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" disabled={!valid || busy} onClick={submit}>
          {busy ? 'Creating…' : 'Create weekend & open garage'}
        </Button>
      </div>
    </div>
  );
}
