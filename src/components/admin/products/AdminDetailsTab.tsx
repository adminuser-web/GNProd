// @ts-nocheck
import React from "react";
import {
  
  ProductSubSeries,
} from "../../../features/products/types";
import {
  BADGES,
  PLAYER_LEVELS,
  PLAYING_STYLES,
  ACCESSORIES
} from "../../../config/productOptions";
import { getPlayerFit, StyleTag } from "../../../features/consultant/playerFit";

const FIT_AXES: { key: 'power' | 'control' | 'pickup' | 'balance'; label: string; hint: string }[] = [
  { key: 'power', label: 'Power', hint: 'Punch / six-hitting' },
  { key: 'control', label: 'Control', hint: 'Placement / precision' },
  { key: 'pickup', label: 'Pickup', hint: 'How light it feels' },
  { key: 'balance', label: 'Balance', hint: 'Overall poise' },
];
const STYLE_TAGS: { id: StyleTag; label: string }[] = [
  { id: 'aggressive', label: 'Power Hitter' },
  { id: 'all-rounder', label: 'All-Rounder' },
  { id: 'touch', label: 'Touch / Timing' },
  { id: 'defensive', label: 'Defensive / Anchor' },
];

interface AdminDetailsTabProps {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (updated: ProductSubSeries) => void;
}

export function AdminDetailsTab({
  series,
  subSeries,
  updateSubSeries,
}: AdminDetailsTabProps) {
  const handleChange = (field: keyof ProductSubSeries, value: any) => {
    updateSubSeries({ ...subSeries, [field]: value });
  };

  const handleArrayChange = (
    field: keyof ProductSubSeries,
    index: number,
    value: string,
  ) => {
    const arr = [...((subSeries[field] as string[]) || [])];
    arr[index] = value;
    handleChange(field, arr);
  };

  const addToArray = (field: keyof ProductSubSeries) => {
    const arr = [...((subSeries[field] as string[]) || []), ""];
    handleChange(field, arr);
  };

  const removeFromArray = (field: keyof ProductSubSeries, index: number) => {
    const arr = [...((subSeries[field] as string[]) || [])];
    arr.splice(index, 1);
    handleChange(field, arr);
  };

  // Player Fit — the signature the AI consultant matches a batsman against.
  const fit = getPlayerFit(subSeries, series);
  const updateFit = (patch: Partial<typeof fit>) => {
    handleChange('playerFit' as any, { ...fit, ...patch });
  };
  const toggleStyleTag = (tag: StyleTag) => {
    const has = fit.styleTags.includes(tag);
    updateFit({ styleTags: has ? fit.styleTags.filter((t) => t !== tag) : [...fit.styleTags, tag] });
  };

  const toggleAccessory = (accessoryId: string) => {
    const current = subSeries.includedAccessories || [];
    if (current.includes(accessoryId)) {
      handleChange(
        "includedAccessories",
        current.filter((a) => a !== accessoryId),
      );
    } else {
      handleChange("includedAccessories", [...current, accessoryId]);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-line pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest uppercase text-content">
          Core Details
        </h2>
        <p className="text-sm text-muted">
          Basic information about this specific product variant.
        </p>
      </div>

      {/* Availability / stock gate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-line rounded-lg p-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Availability</p>
          <p className="text-sm text-content">
            {subSeries.outOfStock ? 'Out of stock — customers can view but not order this bat.' : 'In stock — available to order.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleChange('outOfStock', !subSeries.outOfStock)}
          className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-sm border transition-colors ${
            subSeries.outOfStock
              ? 'border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
          }`}
        >
          {subSeries.outOfStock ? 'Out of Stock' : 'In Stock'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
              SKU
            </label>
            <input
              type="text"
              value={subSeries.sku || ""}
              onChange={(e) => handleChange("sku", e.target.value)}
              className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
              placeholder="e.g. DEB-001"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
              URL Slug
            </label>
            <input
              type="text"
              value={subSeries.slug || ""}
              onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
              placeholder="e.g. pro-edition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Product Name
          </label>
          <input
            type="text"
            value={subSeries.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            placeholder="e.g. Master Series Pro"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Series Grade (Read-only)
          </label>
          <div className="w-full bg-bg/50 border border-transparent p-3 text-sm text-muted cursor-not-allowed">
            {series.grade ||
              series.gradeLabel ||
              series.tier ||
              subSeries.gradeLabel ||
              subSeries.grade ||
              "Not Specified"}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Base Price (₹)
          </label>
          <input
            type="number"
            value={subSeries.basePrice || 0}
            onChange={(e) => handleChange("basePrice", Number(e.target.value))}
            className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Compare-At Price (₹) (Optional)
          </label>
          <input
            type="number"
            value={subSeries.compareAtPrice || ""}
            onChange={(e) =>
              handleChange(
                "compareAtPrice",
                e.target.value ? Number(e.target.value) : null,
              )
            }
            className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            placeholder="Showing a higher price creates a 'sale' effect"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Visual Badge
          </label>
          <select
            value={subSeries.badge || ""}
            onChange={(e) => handleChange("badge", e.target.value)}
            className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none appearance-none"
          >
            <option value="">None</option>
            {BADGES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Player Level
          </label>
          <select
            value={subSeries.playerLevel || ""}
            onChange={(e) => handleChange("playerLevel", e.target.value)}
            className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none appearance-none"
          >
            <option value="">Select Level...</option>
            {PLAYER_LEVELS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Playing Style
          </label>
          <select
            value={subSeries.playingStyle || ""}
            onChange={(e) => handleChange("playingStyle", e.target.value)}
            className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none appearance-none"
          >
            <option value="">Select Style...</option>
            {PLAYING_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
              Est. Delivery (Days)
            </label>
            <input
              type="number"
              value={subSeries.estimatedDeliveryDays || ""}
              onChange={(e) =>
                handleChange("estimatedDeliveryDays", Number(e.target.value))
              }
              className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
              Warranty (Months)
            </label>
            <input
              type="number"
              value={subSeries.warrantyMonths || ""}
              onChange={(e) =>
                handleChange("warrantyMonths", Number(e.target.value))
              }
              className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-line">
        <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
          Short Description
        </label>
        <textarea
          value={subSeries.shortDescription || ""}
          onChange={(e) => handleChange("shortDescription", e.target.value)}
          className="w-full h-20 bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
          placeholder="Brief summary used in cards..."
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
          Long Description
        </label>
        <textarea
          value={
            Array.isArray(subSeries.longDescription)
              ? subSeries.longDescription.join("\n\n")
              : subSeries.longDescription || ""
          }
          onChange={(e) => handleChange("longDescription", e.target.value)}
          className="w-full h-40 bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
          placeholder="Detailed description, use double newlines for paragraphs..."
        />
      </div>

      <div className="pt-4 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-4">
            Included Accessories
          </label>
          <div className="space-y-3">
            {ACCESSORIES.map((acc) => (
              <label
                key={acc.id}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={(e) => { e.preventDefault(); toggleAccessory(acc.id); }}
              >
                <div
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                    (subSeries.includedAccessories || []).includes(acc.id)
                      ? "bg-[#c5a059] border-[#c5a059]"
                      : "border-[#c5a059]/30 group-hover:border-[#c5a059]/60"
                  }`}
                >
                  {(subSeries.includedAccessories || []).includes(acc.id) && (
                    <svg
                      width="10"
                      height="8"
                      viewBox="0 0 10 8"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#111111"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-content/80 group-hover:text-content">
                  {acc.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-[10px] uppercase tracking-widest text-muted">
              Ideal For
            </label>
            <button
              onClick={() => addToArray("idealFor")}
              className="text-[10px] text-[#c5a059] hover:text-[#c5a059]/80 uppercase tracking-widest"
            >
              + Add Bullet
            </button>
          </div>
          <div className="space-y-2">
            {(subSeries.idealFor || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]/50 shrink-0" />
                <input
                  type="text"
                  value={item}
                  onChange={(e) =>
                    handleArrayChange("idealFor", idx, e.target.value)
                  }
                  className="flex-1 bg-bg border border-line p-2 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
                />
                <button
                  onClick={() => removeFromArray("idealFor", idx)}
                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
            {(!subSeries.idealFor || subSeries.idealFor.length === 0) && (
              <p className="text-xs text-muted italic">No "Ideal For" items.</p>
            )}
          </div>
        </div>
      </div>

      {/* Player Fit — powers the AI Bat Consultant's stats-based matching. */}
      <div className="pt-6 border-t border-line">
        <div className="mb-5">
          <h2 className="text-sm font-bold tracking-widest uppercase text-content flex items-center gap-2">
            Player Fit
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-2 py-0.5 rounded-sm">AI Consultant</span>
          </h2>
          <p className="text-sm text-muted">
            How this bat scores on each axis (0–10) and who it suits. The consultant matches a batsman's stats against these values.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          {FIT_AXES.map((axis) => (
            <div key={axis.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted">
                  {axis.label} <span className="text-muted/60 normal-case tracking-normal">· {axis.hint}</span>
                </label>
                <span className="text-sm font-bold text-[#c5a059] tabular-nums w-8 text-right">{fit[axis.key].toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={fit[axis.key]}
                onChange={(e) => updateFit({ [axis.key]: Number(e.target.value) } as any)}
                className="w-full accent-[#c5a059] cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-3">Suits These Players</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((t) => {
                const on = fit.styleTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleStyleTag(t.id)}
                    className={`text-[11px] font-bold uppercase tracking-widest px-3 py-2 border rounded-sm transition-colors ${
                      on
                        ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]'
                        : 'border-line text-muted hover:border-[#c5a059]/50'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-3">
              Ideal Strike-Rate Range
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={fit.idealStrikeRate.min}
                onChange={(e) => updateFit({ idealStrikeRate: { ...fit.idealStrikeRate, min: Number(e.target.value) } })}
                className="w-24 bg-bg border border-line p-2.5 text-sm text-content focus:border-[#c5a059] focus:outline-none"
              />
              <span className="text-muted text-sm">to</span>
              <input
                type="number"
                value={fit.idealStrikeRate.max}
                onChange={(e) => updateFit({ idealStrikeRate: { ...fit.idealStrikeRate, max: Number(e.target.value) } })}
                className="w-24 bg-bg border border-line p-2.5 text-sm text-content focus:border-[#c5a059] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-muted mt-2">Batsmen scoring in this SR band match this bat best.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

