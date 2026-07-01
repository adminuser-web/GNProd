// @ts-nocheck
import React, { useState } from "react";
import { ProductAttribute } from "../../../features/products/types";
import { attributeProvenance, validateAttributes } from "../../../features/products/attributes";
import { ChevronUp, ChevronDown, Plus, Trash2, Sparkles, GripVertical, AlertCircle } from "lucide-react";
import { ImageUpload } from "../ImageUpload";

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

interface Props {
  /** Resolved attribute list to edit. */
  attributes: ProductAttribute[];
  /** Persist the edited list. */
  onChange: (attributes: ProductAttribute[]) => void;
  /** Storage path for option swatch uploads. */
  storagePath: string;
  /** Series template — enables "From series default"/"Overridden" badges. */
  template?: ProductAttribute[];
  /** When present, shows an "Apply series defaults" button (gap-fill). */
  onApplyDefaults?: () => void;
}

// Canonical customizable presets (stable kebab keys — never rename). Used by
// the "Add from Library" picker so admins reuse the keys orders reference.
const CUSTOMIZABLE_LIBRARY: Array<Partial<ProductAttribute>> = [
  { key: "bat-size", label: "Bat Size", type: "single_select", required: true,
    options: [
      { id: "size-sh", label: "Short Handle (SH)", priceDelta: 0, available: true },
      { id: "size-lh", label: "Long Handle (LH)", priceDelta: 0, available: true },
      { id: "size-harrow", label: "Harrow", priceDelta: 0, available: true },
    ] },
  { key: "toe-shape", label: "Toe Shape", type: "single_select", required: true,
    options: [
      { id: "toe-round", label: "Standard Round", priceDelta: 0, available: true },
      { id: "toe-square", label: "Square Toe", priceDelta: 0, available: true },
      { id: "toe-duckbill", label: "Reinforced / Duck-Bill", priceDelta: 500, available: true },
    ] },
  { key: "grip-color", label: "Grip Colour", type: "single_select", required: true,
    options: [
      { id: "grip-white", label: "White", priceDelta: 0, colorHex: "#ffffff", available: true },
      { id: "grip-black", label: "Black", priceDelta: 0, colorHex: "#000000", available: true },
      { id: "grip-red", label: "Red", priceDelta: 0, colorHex: "#ff0000", available: true },
      { id: "grip-blue", label: "Blue", priceDelta: 0, colorHex: "#0000ff", available: true },
    ] },
  { key: "handle-shape", label: "Handle Shape", type: "single_select", required: true,
    options: [
      { id: "handle-round", label: "Round", priceDelta: 0, available: true },
      { id: "handle-semi", label: "Semi-Oval", priceDelta: 0, available: true },
      { id: "handle-oval", label: "Oval", priceDelta: 0, available: true },
    ] },
  { key: "handle-length", label: "Handle Length", type: "single_select", required: true,
    options: [
      { id: "handle-std", label: "Standard", priceDelta: 0, available: true },
      { id: "handle-short", label: "Short", priceDelta: 0, available: true },
      { id: "handle-long", label: "Long", priceDelta: 0, available: true },
    ] },
  { key: "weight-profile", label: "Weight Profile", type: "single_select", required: true,
    options: [
      { id: "weight-light", label: "Light (2lb 7oz - 2lb 9oz)", priceDelta: 250, available: true },
      { id: "weight-medium", label: "Medium (2lb 9oz - 2lb 11oz)", priceDelta: 0, available: true },
      { id: "weight-heavy", label: "Heavy (2lb 11oz+)", priceDelta: 250, available: true },
    ] },
  { key: "bat-profile", label: "Bat Profile", type: "single_select", required: true,
    options: [
      { id: "profile-full", label: "Full Profile", priceDelta: 1500, available: true },
      { id: "profile-mid", label: "Mid Profile", priceDelta: 0, available: true },
      { id: "profile-low", label: "Low Profile", priceDelta: 0, available: true },
    ] },
  { key: "edge-profile", label: "Edge Profile", type: "single_select", required: true,
    options: [
      { id: "edge-38", label: "Standard (38mm)", priceDelta: 0, available: true },
      { id: "edge-40", label: "Thick (40mm)", priceDelta: 750, available: true },
      { id: "edge-max", label: "Maximum (42mm+)", priceDelta: 1000, available: true },
    ] },
  { key: "sweet-spot", label: "Sweet-Spot Position", type: "single_select", required: true,
    options: [
      { id: "spot-low", label: "Low (Front-foot play)", priceDelta: 500, available: true },
      { id: "spot-mid", label: "Mid (All-round)", priceDelta: 0, available: true },
      { id: "spot-high", label: "High (Back-foot play)", priceDelta: 500, available: true },
    ] },
  { key: "finish", label: "Finish", type: "single_select", required: true,
    options: [
      { id: "finish-natural", label: "Natural Finish", priceDelta: 0, available: true },
      { id: "finish-polished", label: "Polished", priceDelta: 0, available: true },
      { id: "finish-waxed", label: "Waxed", priceDelta: 250, available: true },
    ] },
  { key: "engraving", label: "Personal Engraving", type: "text", required: false, maxLength: 12,
    validationRegex: "^[A-Za-z0-9 ]{0,12}$",
    options: [{ id: "engraving-yes", label: "Add Custom Engraving", priceDelta: 1500, available: true }] },
  { key: "pre-knocked", label: "Knocking-In", type: "toggle", required: false,
    options: [{ id: "knocked-yes", label: "Pre-knocked & oiled", priceDelta: 999, available: true }] },
  { key: "accessories", label: "Accessories", type: "toggle", required: false,
    options: [
      { id: "acc-scuff", label: "Anti-scuff Sheet", priceDelta: 250, available: true },
      { id: "acc-toe", label: "Extra Toe Guard", priceDelta: 150, available: true },
    ] },
];

const TYPES = [
  { id: "single_select", label: "Single Select" },
  { id: "multi_select", label: "Multi Select" },
  { id: "toggle", label: "Toggle" },
  { id: "text", label: "Text Input" },
];

const Checkbox = ({ checked, onChange, label }: any) => (
  <label className="flex items-center gap-2 cursor-pointer group/cb">
    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${checked ? "bg-[#c5a059] border-[#c5a059]" : "border-[#c5a059]/30 group-hover/cb:border-[#c5a059]/60"}`}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </div>
    <span className="text-xs uppercase tracking-widest text-content/80 font-bold">{label}</span>
    <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

export function AdminAttributesTab({ attributes, onChange, storagePath, template, onApplyDefaults }: Props) {
  const commit = (next: ProductAttribute[]) => {
    // renumber sortOrder to match display order
    onChange(next.map((a, i) => ({ ...a, sortOrder: i })));
  };

  const updateAttr = (idx: number, patch: Partial<ProductAttribute>) => {
    const next = [...attributes];
    next[idx] = { ...next[idx], ...patch };
    commit(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= attributes.length) return;
    const next = [...attributes];
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  };

  const remove = (idx: number) => {
    if (!confirm(`Remove attribute "${attributes[idx].label}"?`)) return;
    const next = [...attributes];
    next.splice(idx, 1);
    commit(next);
  };

  const addFixed = () => {
    commit([...attributes, {
      id: `fixed-${Date.now()}`, key: `attr-${Date.now()}`, label: "New Spec",
      mode: "fixed", sortOrder: attributes.length, active: true, fixedValue: "",
    }]);
  };

  const addCustom = () => {
    commit([...attributes, {
      id: `attr-${Date.now()}`, key: `attr-${Date.now()}`, label: "New Option Group",
      mode: "customizable", sortOrder: attributes.length, active: true,
      required: false, type: "single_select", options: [],
    }]);
  };

  const addFromLibrary = (key: string) => {
    const preset = CUSTOMIZABLE_LIBRARY.find((p) => p.key === key);
    if (!preset) return;
    if (attributes.some((a) => a.key === preset.key)) {
      alert(`"${preset.label}" is already added.`);
      return;
    }
    commit([...attributes, {
      id: preset.key!, key: preset.key!, label: preset.label!,
      mode: "customizable", sortOrder: attributes.length, active: true,
      required: preset.required ?? false, type: preset.type as any,
      options: JSON.parse(JSON.stringify(preset.options ?? [])),
      ...(preset.maxLength !== undefined ? { maxLength: preset.maxLength } : {}),
      ...(preset.validationRegex ? { validationRegex: preset.validationRegex } : {}),
    }]);
  };

  const updateOption = (attrIdx: number, optIdx: number, patch: any) => {
    const opts = [...(attributes[attrIdx].options || [])];
    opts[optIdx] = { ...opts[optIdx], ...patch };
    updateAttr(attrIdx, { options: opts });
  };

  const addOption = (attrIdx: number) => {
    const opts = [...(attributes[attrIdx].options || [])];
    opts.push({ id: `opt-${Date.now()}`, label: "New Option", priceDelta: 0, available: true } as any);
    updateAttr(attrIdx, { options: opts });
  };

  const removeOption = (attrIdx: number, optIdx: number) => {
    const opts = [...(attributes[attrIdx].options || [])];
    opts.splice(optIdx, 1);
    updateAttr(attrIdx, { options: opts });
  };

  const moveOption = (attrIdx: number, optIdx: number, dir: -1 | 1) => {
    const j = optIdx + dir;
    const opts = [...(attributes[attrIdx].options || [])];
    if (j < 0 || j >= opts.length) return;
    [opts[optIdx], opts[j]] = [opts[j], opts[optIdx]];
    updateAttr(attrIdx, { options: opts });
  };

  // --- Drag-and-drop reorder (desktop). Up/down buttons remain the keyboard +
  //     touch fallback, so mobile is never blocked. ---
  const [dragAttr, setDragAttr] = useState<number | null>(null);
  const [dragOpt, setDragOpt] = useState<{ attr: number; opt: number } | null>(null);

  const dropAttr = (to: number) => {
    if (dragAttr === null || dragAttr === to) return;
    commit(reorder(attributes, dragAttr, to));
    setDragAttr(null);
  };

  const dropOption = (attrIdx: number, to: number) => {
    if (!dragOpt || dragOpt.attr !== attrIdx || dragOpt.opt === to) return;
    updateAttr(attrIdx, { options: reorder(attributes[attrIdx].options || [], dragOpt.opt, to) });
    setDragOpt(null);
  };

  // Validation errors, grouped by attribute index for inline display.
  const errors = validateAttributes(attributes);
  const errorsByIndex = new Map<number, string[]>();
  errors.forEach((e) => errorsByIndex.set(e.index, [...(errorsByIndex.get(e.index) || []), e.message]));

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-[#c5a059]/10 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-content">Attributes</h2>
          <p className="text-sm text-muted">
            One list for both fixed specs (shown on the spec sheet) and customizable options (shown in the buy configurator).
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {onApplyDefaults && (
            <button onClick={onApplyDefaults} className="px-4 py-3 border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059]/10 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2" title="Add any missing attributes from the series template (added inactive)">
              <Sparkles size={14} /> Apply Series Defaults
            </button>
          )}
          <select
            value=""
            onChange={(e) => { if (e.target.value) { addFromLibrary(e.target.value); e.target.value = ""; } }}
            className="bg-bg border border-[#c5a059]/20 text-[10px] uppercase tracking-widest text-[#c5a059] p-3 focus:outline-none focus:border-[#c5a059] font-bold rounded-none appearance-none cursor-pointer"
          >
            <option value="">+ Add from Library…</option>
            {CUSTOMIZABLE_LIBRARY.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <button onClick={addFixed} className="px-4 py-3 border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
            <Plus size={14} /> Fixed Spec
          </button>
          <button onClick={addCustom} className="px-4 py-3 border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
            <Plus size={14} /> Custom Group
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-red-300 tracking-wide">
            <span className="font-bold uppercase tracking-widest text-[10px] text-red-400">{errors.length} issue{errors.length > 1 ? "s" : ""} to fix before saving</span>
            <ul className="mt-1 space-y-0.5 list-disc pl-4">
              {errors.map((e, i) => <li key={i}>{e.message}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {attributes.map((attr, idx) => {
          const rowErrors = errorsByIndex.get(idx);
          return (
          <div
            key={attr.id || idx}
            onDragOver={(e) => { if (dragAttr !== null) e.preventDefault(); }}
            onDrop={() => dropAttr(idx)}
            className={`bg-bg border ${rowErrors ? "border-red-500/50" : attr.active !== false ? "border-[#c5a059]/20" : "border-gray-500/20 opacity-70"} relative group/card ${dragAttr === idx ? "opacity-50" : ""}`}
          >
            {attr.active === false && (
              <div className="absolute top-0 right-0 bg-gray-500/20 text-gray-400 text-[8px] font-bold px-3 py-1 uppercase tracking-widest">Hidden</div>
            )}

            {/* Header row */}
            <div className="flex bg-surface p-4 border-b border-[#c5a059]/10 items-start gap-4">
              <div className="flex flex-col items-center gap-1 mt-1">
                <span
                  draggable
                  onDragStart={() => setDragAttr(idx)}
                  onDragEnd={() => setDragAttr(null)}
                  title="Drag to reorder"
                  className="cursor-grab active:cursor-grabbing text-muted/50 hover:text-[#c5a059]"
                ><GripVertical size={16} /></span>
                <button disabled={idx === 0} onClick={() => move(idx, -1)} className="text-muted hover:text-[#c5a059] disabled:opacity-30"><ChevronUp size={16} /></button>
                <button disabled={idx === attributes.length - 1} onClick={() => move(idx, 1)} className="text-muted hover:text-[#c5a059] disabled:opacity-30"><ChevronDown size={16} /></button>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">Label</label>
                  <input
                    type="text" value={attr.label}
                    onChange={(e) => updateAttr(idx, { label: e.target.value })}
                    className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] font-bold rounded-none"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[9px] text-muted/60 tracking-wider">key: {attr.key}</p>
                    {template && (() => {
                      const prov = attributeProvenance(attr, template);
                      if (prov === "series-default") return <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-[#c5a059]/10 text-[#c5a059] font-bold">From series default</span>;
                      if (prov === "overridden") return <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-amber-500/10 text-amber-400 font-bold">Overridden</span>;
                      return <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-white/5 text-muted font-bold">Product-specific</span>;
                    })()}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">Mode</label>
                  <div className="flex border border-[#c5a059]/20">
                    {["fixed", "customizable"].map((m) => (
                      <button key={m}
                        onClick={() => updateAttr(idx, m === "customizable"
                          ? { mode: "customizable", type: attr.type || "single_select", options: attr.options || [] }
                          : { mode: "fixed" })}
                        className={`flex-1 py-3 text-[9px] uppercase tracking-widest font-bold transition-colors ${attr.mode === m ? "bg-[#c5a059] text-bg" : "text-muted hover:text-content"}`}
                      >{m === "fixed" ? "Fixed" : "Custom"}</button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 h-full pb-2">
                  <Checkbox checked={attr.active !== false} onChange={(v: boolean) => updateAttr(idx, { active: v })} label="Live" />
                  <button onClick={() => remove(idx)} className="text-red-500 hover:text-white hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded ml-auto transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>

            {rowErrors && (
              <div className="px-4 py-2 pl-[4.5rem] bg-red-500/5 border-b border-red-500/20 flex items-start gap-2">
                <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                <ul className="text-[10px] text-red-300 space-y-0.5">{rowErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            )}

            {/* Fixed body */}
            {attr.mode === "fixed" && (
              <div className="p-4 pl-[4.5rem]">
                <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">Value (shown on spec sheet)</label>
                <input
                  type="text" value={attr.fixedValue || ""}
                  onChange={(e) => updateAttr(idx, { fixedValue: e.target.value })}
                  placeholder="e.g. 8-10 straight grains"
                  className="w-full md:w-2/3 bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] rounded-none"
                />
              </div>
            )}

            {/* Customizable body */}
            {attr.mode === "customizable" && (
              <>
                <div className="p-4 pl-[4.5rem] grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-[#c5a059]/10 bg-surface/40">
                  <div>
                    <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">Type</label>
                    <select value={attr.type || "single_select"} onChange={(e) => updateAttr(idx, { type: e.target.value })}
                      className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] rounded-none appearance-none">
                      {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end pb-3">
                    <Checkbox checked={!!attr.required} onChange={(v: boolean) => updateAttr(idx, { required: v })} label="Required" />
                  </div>
                  {attr.type === "text" && (
                    <div>
                      <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">Max Length</label>
                      <input type="number" value={attr.maxLength ?? 12}
                        onChange={(e) => updateAttr(idx, { maxLength: parseInt(e.target.value) || 0 })}
                        className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] rounded-none" />
                    </div>
                  )}
                </div>

                <div className="p-4 pl-[4.5rem]">
                  <div className="flex justify-between items-end mb-4">
                    <h5 className="text-[10px] text-muted uppercase tracking-widest font-bold">Options</h5>
                    <button onClick={() => addOption(idx)} className="text-[10px] text-[#c5a059] uppercase tracking-widest hover:text-content flex items-center gap-1 font-bold">
                      <Plus size={14} /> Add Option
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(attr.options || []).map((opt: any, optIdx: number) => (
                      <div
                        key={opt.id || optIdx}
                        onDragOver={(e) => { if (dragOpt && dragOpt.attr === idx) e.preventDefault(); }}
                        onDrop={() => dropOption(idx, optIdx)}
                        className={`flex flex-col lg:flex-row gap-4 p-4 border border-[#c5a059]/10 bg-surface/50 group/opt items-start ${dragOpt && dragOpt.attr === idx && dragOpt.opt === optIdx ? "opacity-50" : ""}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            draggable
                            onDragStart={() => setDragOpt({ attr: idx, opt: optIdx })}
                            onDragEnd={() => setDragOpt(null)}
                            title="Drag to reorder"
                            className="cursor-grab active:cursor-grabbing text-muted/40 hover:text-[#c5a059]"
                          ><GripVertical size={14} /></span>
                          <button disabled={optIdx === 0} onClick={() => moveOption(idx, optIdx, -1)} className="text-muted hover:text-[#c5a059] disabled:opacity-30"><ChevronUp size={14} /></button>
                          <button disabled={optIdx === (attr.options.length - 1)} onClick={() => moveOption(idx, optIdx, 1)} className="text-muted hover:text-[#c5a059] disabled:opacity-30"><ChevronDown size={14} /></button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                          <div>
                            <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Label</label>
                            <input type="text" value={opt.label} onChange={(e) => updateOption(idx, optIdx, { label: e.target.value })}
                              className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-2 focus:outline-none focus:border-[#c5a059] rounded-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Price Delta (+₹)</label>
                            <input type="number" value={opt.priceDelta}
                              onChange={(e) => updateOption(idx, optIdx, { priceDelta: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                              className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-2 focus:outline-none focus:border-[#c5a059] font-mono rounded-none" />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Description (Optional)</label>
                            <input type="text" value={opt.description || ""} onChange={(e) => updateOption(idx, optIdx, { description: e.target.value })}
                              className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-2 focus:outline-none focus:border-[#c5a059] rounded-none" />
                          </div>

                          <div className="lg:col-span-4 flex flex-wrap items-center gap-6 mt-2 pt-4 border-t border-[#c5a059]/10">
                            <div className="flex items-center gap-3">
                              <label className="text-[10px] text-muted uppercase tracking-widest">Colour</label>
                              <input type="color" value={opt.colorHex || "#ffffff"} onChange={(e) => updateOption(idx, optIdx, { colorHex: e.target.value })}
                                className="w-8 h-8 rounded shrink-0 cursor-pointer border border-[#c5a059]/40 bg-bg p-0" />
                            </div>
                            <ImageUpload
                              specKey="customizationSwatch"
                              value={opt.imageUrl || ""}
                              onChange={(url) => updateOption(idx, optIdx, { imageUrl: url })}
                              storagePath={storagePath}
                            />
                            <Checkbox checked={opt.available !== false} onChange={(v: boolean) => updateOption(idx, optIdx, { available: v })} label="Available" />
                            <button onClick={() => removeOption(idx, optIdx)} className="text-red-500 hover:text-white hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded ml-auto transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(attr.options || []).length === 0 && (
                      <p className="text-[10px] uppercase tracking-widest text-muted italic">No options added yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          );
        })}

        {attributes.length === 0 && (
          <div className="w-full h-32 border border-dashed border-[#c5a059]/20 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted">No attributes configured</span>
            <span className="text-[10px] uppercase tracking-widest text-muted/50">Add a fixed spec or a customizable group above</span>
          </div>
        )}
      </div>
    </div>
  );
}
