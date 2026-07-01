import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, Table2 } from "lucide-react";
import { clsx } from "clsx";
import { getFixedAttributes } from "../features/products/attributes";

interface Props {
  open: boolean;
  onClose: () => void;
  series: any;
  activeSubId: string | null;
  /** Close + scroll to the full spec table on the page. */
  onViewSpecSheet: () => void;
}

// Key attributes to surface in the compare view, by canonical key preference.
const KEY_ATTR_PRIORITY = ["willow-grade", "weight", "weight-range", "sweet-spot", "profile", "spine"];

function keyAttrs(sub: any): { label: string; value: string }[] {
  const fixed = getFixedAttributes(sub);
  const picked: { label: string; value: string }[] = [];
  for (const key of KEY_ATTR_PRIORITY) {
    const a = fixed.find((x) => x.key === key);
    if (a?.fixedValue && !picked.some((p) => p.label === a.label)) {
      picked.push({ label: a.label, value: a.fixedValue });
    }
    if (picked.length >= 3) break;
  }
  // top up with any remaining fixed attrs if we found fewer than 3
  if (picked.length < 3) {
    for (const a of fixed) {
      if (a.fixedValue && !picked.some((p) => p.label === a.label)) picked.push({ label: a.label, value: a.fixedValue });
      if (picked.length >= 3) break;
    }
  }
  return picked;
}

export function CompareDrawer({ open, onClose, series, activeSubId, onViewSpecSheet }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const subs = (series?.subSeries || []).filter((s: any) => s.active !== false || s.id === activeSubId);

  return (
    <div className="fixed inset-0 z-modal" role="dialog" aria-modal="true" aria-label="Compare models">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className={clsx(
          "absolute bg-surface border-[#c5a059]/20 shadow-2xl flex flex-col",
          // Mobile: bottom slide-up sheet. Desktop: right side panel.
          "left-0 right-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t",
          "md:left-auto md:top-0 md:bottom-0 md:right-0 md:w-[460px] md:max-h-none md:rounded-none md:border-l md:border-t-0",
          "animate-page-entrance",
        )}
      >
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-[#c5a059]/10 shrink-0">
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-content">Compare {series?.name}</h2>
            <p className="text-[11px] text-muted mt-1 tracking-wide">Every model in this line, side by side.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-content transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 md:p-5 space-y-3">
          {subs.map((sub: any) => {
            const isActive = sub.slug === activeSubId || sub.id === activeSubId;
            const attrs = keyAttrs(sub);
            return (
              <div
                key={sub.id}
                className={clsx(
                  "border p-4 transition-colors",
                  isActive ? "border-[#c5a059] bg-[#c5a059]/5" : "border-[#c5a059]/15 bg-bg/40",
                )}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-wider uppercase text-content truncate">{sub.name}</h3>
                      {isActive && (
                        <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-[#c5a059] text-bg font-bold shrink-0">Viewing</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted uppercase tracking-widest mt-1">{sub.gradeLabel || sub.grade}</p>
                  </div>
                  <p className="text-premium-gold-text text-sm font-bold tracking-wider whitespace-nowrap">
                    ₹{(sub.basePrice || series.basePrice || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                {attrs.length > 0 && (
                  <dl className="mt-3 grid grid-cols-1 gap-1.5">
                    {attrs.map((a) => (
                      <div key={a.label} className="flex justify-between gap-4 text-[11px] border-b border-[#c5a059]/5 pb-1.5">
                        <dt className="text-muted uppercase tracking-widest text-[9px] pt-0.5">{a.label}</dt>
                        <dd className="text-content/80 text-right">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-4">
                  {isActive ? (
                    <button
                      onClick={onViewSpecSheet}
                      className="w-full flex items-center justify-center gap-2 border border-[#c5a059]/30 text-[#c5a059] py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c5a059]/10 transition-colors"
                    >
                      <Table2 size={13} /> See full spec sheet
                    </button>
                  ) : (
                    <Link
                      to={`/collection/${series.slug}/${sub.slug}`}
                      onClick={onClose}
                      className="w-full flex items-center justify-center gap-2 bg-[#c5a059] text-bg py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c5a059]/90 transition-colors"
                    >
                      View this bat <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
