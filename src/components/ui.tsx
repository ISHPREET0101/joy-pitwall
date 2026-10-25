import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'default' | 'ghost' | 'danger';
export function Button({
  variant = 'default',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const v = { primary: 'btn-primary', default: 'btn-default', ghost: 'btn-ghost', danger: 'btn-danger' }[variant];
  return <button className={`btn btn-${v} ${className}`} {...props} />;
}

// ---------- Card ----------
export function Card({
  title,
  subtitle,
  right,
  className = '',
  bodyClass = '',
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  bodyClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`card fade-in ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-dim mt-0.5">{subtitle}</p>}
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={`px-4 pb-4 ${bodyClass}`}>{children}</div>
    </section>
  );
}

// ---------- Form primitives ----------
export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-dim">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field resize-y ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className ?? ''}`} />;
}

// ---------- Segmented control ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: {
  options: { id: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`inline-flex rounded-lg border border-line bg-bg/60 p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          title={o.title}
          onClick={() => onChange(o.id)}
          className={`rounded-[6px] font-semibold transition ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'} ${
            value === o.id ? 'bg-panel3 text-ink shadow-sm border border-line2' : 'text-dim hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Badge ----------
export function Badge({
  color = '#94a3b8',
  children,
  className = '',
  dot = false,
}: {
  color?: string;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`chip ${className}`}
      style={{ background: `${color}1f`, color, border: `1px solid ${color}55` }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: color }} />}
      {children}
    </span>
  );
}

// ---------- Modal ----------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => e.target === ref.current?.parentElement && onClose()}
      ref={ref}
    >
      <div
        className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto fade-in`}
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-panel2/95 backdrop-blur px-5 py-3.5 rounded-t-2xl">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost !p-1.5" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>
        )}
      </div>
    </div>
  );
}

// ---------- Tabs ----------
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: { id: T; label: React.ReactNode; badge?: React.ReactNode }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 overflow-x-auto border-b border-line ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition ${
            active === t.id
              ? 'border-accent text-accent'
              : 'border-transparent text-dim hover:text-ink'
          }`}
        >
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}

// ---------- Stat ----------
export function Stat({
  label,
  value,
  sub,
  accent,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-panel2/60 px-3.5 py-3 ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</div>
      <div className={`num mt-1 text-xl font-bold leading-none ${accent ? '' : 'text-ink'}`} style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-dim">{sub}</div>}
    </div>
  );
}

// ---------- Empty state ----------
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2/60 px-6 py-10 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <div className="font-semibold text-dim">{title}</div>
      {hint && <div className="max-w-sm text-xs text-faint">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------- Toggle ----------
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-dim hover:text-ink transition"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-accent' : 'bg-panel3 border border-line2'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? 'left-4.5' : 'left-0.5'
          }`}
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
      {label}
    </button>
  );
}

// ---------- Number stepper ----------
export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  decimals = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimals?: number;
}) {
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const dec = (v: number) => +v.toFixed(decimals);
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-bg/60">
      <button className="px-2.5 py-1.5 text-dim hover:bg-panel3 hover:text-ink" onClick={() => onChange(dec(clamp(value - step)))}>
        −
      </button>
      <span className="num min-w-14 text-center text-sm font-semibold">
        {value.toFixed(decimals)}
        {suffix ? <span className="ml-0.5 text-[10px] text-faint">{suffix}</span> : null}
      </span>
      <button className="px-2.5 py-1.5 text-dim hover:bg-panel3 hover:text-ink" onClick={() => onChange(dec(clamp(value + step)))}>
        +
      </button>
    </div>
  );
}

// ---------- Section title ----------
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-1 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
        <span className="h-3 w-1 rounded-full bg-accent" />
        {children}
      </h3>
      {right}
    </div>
  );
}
