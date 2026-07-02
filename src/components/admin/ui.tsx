import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

/**
 * Shared admin UI kit.
 *
 * One visual language for the whole back office: calm dark + gold surfaces,
 * uppercase tracked labels, restrained borders. Extracted from the Content
 * Studio so every admin page reads the same. Tokens used: bg / surface /
 * content / muted / premium-gold-text and gold #c5a059.
 */

const GOLD = '#c5a059';

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-5 border-b border-[#c5a059]/10 pb-4">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase text-content">
          {eyebrow && <span className="text-[10px] tracking-[0.4em] text-premium-gold-text mr-3 align-middle">{eyebrow} /</span>}
          {title}
        </h1>
        {description && (
          <p className="text-[11px] text-muted tracking-widest uppercase mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section label (lighter than a page header)                          */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={clsx('text-[10px] font-bold uppercase tracking-widest text-[#c5a059]', className)}>
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ */
/* Card / Panel                                                        */
/* ------------------------------------------------------------------ */

export function Card({
  title,
  desc,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  desc?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={clsx('bg-surface border border-[#c5a059]/20 shadow-sm', className)}>
      {(title || actions) && (
        <div className="px-4 py-3 border-b border-[#c5a059]/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <SectionLabel>{title}</SectionLabel>}
            {desc && <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{desc}</p>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={clsx('p-4', bodyClassName)}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form field                                                          */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  help,
  value,
  onChange,
  type = 'text',
  textarea = false,
  rows = 3,
  placeholder,
}: {
  label: string;
  help?: string;
  value?: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors placeholder-muted/60"
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors placeholder-muted/60"
        />
      )}
      {help && <p className="text-[10px] text-muted mt-1 leading-relaxed">{help}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  subLabel,
  icon: Icon,
  alert = false,
  to,
}: {
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  icon: any;
  alert?: boolean;
  to?: string;
}) {
  const body = (
    <div
      className={clsx(
        'bg-surface border p-4 shadow-sm h-full transition-all flex flex-col justify-between',
        alert ? 'border-red-500/20 hover:border-red-500/40' : 'border-[#c5a059]/20 hover:border-[#c5a059]/40',
      )}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <span
            className={clsx(
              'text-[10px] uppercase tracking-widest',
              alert ? 'text-red-400' : 'text-muted',
              to && 'group-hover:text-premium-gold-text transition-colors',
            )}
          >
            {label}
          </span>
          {Icon && <Icon className={clsx('w-4 h-4 shrink-0', alert ? 'text-red-500' : 'text-[#c5a059]')} />}
        </div>
        <div className={clsx('text-xl md:text-2xl font-bold tracking-wider mb-1', alert ? 'text-red-500' : 'text-content')}>
          {value}
        </div>
      </div>
      {subLabel && (
        <div className="text-[10px] text-muted/80 uppercase tracking-widest mt-1.5 block">{subLabel}</div>
      )}
    </div>
  );
  if (to)
    return (
      <Link to={to} className="block h-full group min-h-[44px]">
        {body}
      </Link>
    );
  return body;
}

/* ------------------------------------------------------------------ */
/* Status pill                                                         */
/* ------------------------------------------------------------------ */

export function StatusPill({ label, color = GOLD }: { label: string; color?: string }) {
  return (
    <span
      className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm border shrink-0 whitespace-nowrap"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: any;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full border border-[#c5a059]/20 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-[#c5a059]/60" />
        </div>
      )}
      <p className="text-sm font-bold uppercase tracking-widest text-content">{title}</p>
      {description && <p className="text-xs text-muted tracking-wide mt-2 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Search input                                                        */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={clsx('relative', className)}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg border border-[#c5a059]/20 pl-10 pr-4 py-2 text-xs text-content focus:border-[#c5a059] focus:outline-none placeholder-muted uppercase tracking-widest transition-colors"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control (e.g. period / filter toggles)                    */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-surface border border-[#c5a059]/20 p-1 rounded-sm">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'px-3.5 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-sm',
            value === o.value ? 'bg-[#c5a059] text-bg' : 'text-muted hover:text-content',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
