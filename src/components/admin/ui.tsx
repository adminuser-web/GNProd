import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

/**
 * Shared admin UI kit — ops-console edition.
 *
 * Chrome is neutral: hairline `border-line` dividers and whitespace instead
 * of boxes. Gold (#c5a059) is a signal, not decoration — money, primary
 * actions, attention counts, active states. Tokens: bg / surface / content /
 * muted / line / premium-gold-text.
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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-5 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-bold tracking-wide text-content">
          {eyebrow && <span className="text-muted font-normal text-sm">{eyebrow} / </span>}
          {title}
        </h1>
        {description && <p className="text-xs text-muted mt-1">{description}</p>}
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
    <h3 className={clsx('text-[10px] font-bold uppercase tracking-widest text-muted', className)}>
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
    <div className={clsx('bg-surface/40 border border-line rounded-xl', className)}>
      {(title || actions) && (
        <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
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
          className="w-full bg-bg border border-line px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors placeholder-muted/60 rounded-sm"
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg border border-line px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors placeholder-muted/60 rounded-sm"
        />
      )}
      {help && <p className="text-[10px] text-muted mt-1 leading-relaxed">{help}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat — boxless number, label below                                  */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  subLabel,
  icon: Icon,
  alert = false,
  accent = false,
  to,
}: {
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  icon?: any;
  alert?: boolean;
  accent?: boolean;
  to?: string;
}) {
  const body = (
    <div className="h-full flex flex-col py-1 min-w-0">
      <div
        className={clsx(
          'text-xl md:text-2xl font-bold tracking-wide truncate',
          alert ? 'text-red-500' : accent ? 'text-premium-gold-text' : 'text-content',
        )}
      >
        {value}
      </div>
      <div className={clsx('flex items-center gap-1.5 text-[11px] mt-1', alert ? 'text-red-400' : 'text-muted', to && 'group-hover:text-content transition-colors')}>
        {label}
        {Icon && <Icon className="w-3.5 h-3.5 opacity-50 shrink-0" />}
      </div>
      {subLabel && <div className="text-[10px] text-muted/70 mt-0.5">{subLabel}</div>}
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
        <div className="w-12 h-12 rounded-full border border-line flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-muted" />
        </div>
      )}
      <p className="text-sm font-bold tracking-wide text-content">{title}</p>
      {description && <p className="text-xs text-muted mt-2 max-w-sm">{description}</p>}
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
        className="w-full bg-bg border border-line pl-10 pr-4 py-2 text-xs text-content focus:border-[#c5a059] focus:outline-none placeholder-muted transition-colors rounded-sm"
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
    <div className="flex bg-surface/50 border border-line p-1 rounded-sm">
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
