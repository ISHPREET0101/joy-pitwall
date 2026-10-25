import { useState } from 'react';
import { Maximize2, MapPin, X } from 'lucide-react';
import { useWeekend } from '../../components/Layout';
import { db } from '../../lib/db';
import { Card, Field, Input } from '../../components/ui';
import { ImageUpload } from '../../components/ImageUpload';
import { num } from '../../lib/format';

export default function TrackMapPage() {
  const { id, weekend } = useWeekend();
  const [full, setFull] = useState(false);

  const map = weekend.trackMap;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card
          title="Circuit map"
          subtitle={weekend.venue}
          right={
            map && (
              <button className="btn btn-ghost !p-2" title="Fullscreen" onClick={() => setFull(true)}>
                <Maximize2 size={15} />
              </button>
            )
          }
        >
          {map ? (
            <button
              onClick={() => setFull(true)}
              className="block w-full overflow-hidden rounded-xl border border-line"
              title="Click to enlarge"
            >
              <img src={map} alt="Track map" className="max-h-[70vh] w-full bg-panel2 object-contain" />
            </button>
          ) : (
            <ImageUpload
              images={[]}
              multiple={false}
              maxDim={2000}
              label="Upload the track map for this round"
              onChange={(imgs) => imgs[0] && db.weekends.update(id, { trackMap: imgs[0] })}
            />
          )}
          {map && (
            <div className="mt-3">
              <ImageUpload
                images={[]}
                multiple={false}
                compact
                maxDim={2000}
                label="Replace map"
                onChange={(imgs) => imgs[0] && db.weekends.update(id, { trackMap: imgs[0] })}
              />
            </div>
          )}
        </Card>

        <Card title="Circuit data">
          <div className="space-y-3">
            <Field label="Track length (km)" hint="Feeds fuel calculators and run plans">
              <Input
                type="number"
                step="0.001"
                defaultValue={weekend.trackLengthKm ?? ''}
                onBlur={(e) => db.weekends.update(id, { trackLengthKm: num(e.target.value) })}
              />
            </Field>
            <div className="rounded-xl border border-line bg-panel2/50 p-3 text-xs leading-relaxed text-dim">
              <MapPin size={13} className="mb-1 inline text-accent" /> Tip: keep the map of every round
              here — pit entry, exit and marshalling posts stay visible on your pitwall all weekend.
            </div>
          </div>
        </Card>
      </div>

      {full && map && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{weekend.venue} — track map</span>
            <button className="btn btn-ghost !p-2" onClick={() => setFull(false)}>
              <X size={16} />
            </button>
          </div>
          <img src={map} alt="Track map" className="min-h-0 w-full flex-1 rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
