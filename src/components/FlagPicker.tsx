import { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES, countryName } from '../lib/countries';

export function Flag({ code, className = '' }: { code?: string; className?: string }) {
  if (!code) return <span className={`inline-block h-[1em] w-[1.35em] rounded-sm border border-line ${className}`} />;
  return <span className={`fi fi-${code.toLowerCase()} ${className}`} />;
}

export function FlagPicker({
  value,
  onChange,
  className = '',
}: {
  value?: string;
  onChange: (code: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle)
    );
  }, [q]);

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setQ(''); }}
        className="field flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm">
          <Flag code={value} />
          <span className={value ? '' : 'text-faint'}>{value ? countryName(value) : 'Country…'}</span>
        </span>
        <ChevronDown size={14} className="text-faint" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-64 overflow-hidden rounded-xl border border-line2 bg-panel2 shadow-2xl fade-in">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search size={13} className="text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {list.map((c) => (
              <button
                key={c.code}
                onClick={() => { onChange(c.code); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-panel3 ${
                  value === c.code ? 'text-accent' : 'text-ink'
                }`}
              >
                <Flag code={c.code} />
                {c.name}
              </button>
            ))}
            {!list.length && <div className="px-3 py-2 text-xs text-faint">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}
