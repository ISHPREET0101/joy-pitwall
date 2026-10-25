import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { fileToDataUrl } from '../lib/image';

export function ImageUpload({
  images,
  onChange,
  multiple = true,
  maxDim = 1600,
  label = 'Add images',
  compact = false,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
  maxDim?: number;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        urls.push(await fileToDataUrl(f, maxDim));
      }
      onChange(multiple ? [...images, ...urls] : urls.slice(0, 1));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed transition ${
          compact ? 'px-3 py-2' : 'px-4 py-6'
        } ${drag ? 'border-accent bg-accent/5' : 'border-line2/70 hover:border-accent/50 hover:bg-panel2/60'}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin text-dim" /> : <ImagePlus size={16} className="text-dim" />}
        <span className="text-xs text-dim">{busy ? 'Processing…' : label}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-line">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-md bg-black/70 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
