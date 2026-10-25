import { useNow } from '../lib/hooks';

/** Big live local clock — always visible in the header. */
export function Clock({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const now = useNow(200);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (size === 'lg') {
    return (
      <div className="text-center">
        <div className="num text-5xl font-bold leading-none tracking-tight">
          {hh}:{mm}
          <span className="ml-1 align-baseline text-2xl font-semibold text-accent">{ss}</span>
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-dim">{date}</div>
      </div>
    );
  }
  return (
    <div className="text-right leading-tight">
      <div className="num text-lg font-bold">
        {hh}:{mm}
        <span className="ml-0.5 text-[11px] font-semibold text-accent">{ss}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-dim">{date}</div>
    </div>
  );
}
