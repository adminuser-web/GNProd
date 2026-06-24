// @ts-nocheck
import React from "react";
import {
  
  ProductSubSeries,
} from "../../../features/products/types";
import { 
  WEIGHT_BANDS,
  PROFILES,
  SWEET_SPOTS,
  EDGE_OPTIONS,
  SPINE_OPTIONS,
  HANDLE_TYPES,
  FINISHES 
} from "../../../config/productOptions";
import { SPEC_TO_CUSTOMIZATION_MAP } from "../../../config/attributeMap";
import { Link } from "react-router-dom";

interface Props {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (subSeries: ProductSubSeries) => void;
}

export function AdminSpecsTab({ series, subSeries, updateSubSeries }: Props) {
  const updateSpec = (field: string, value: any) => {
    updateSubSeries({
      ...subSeries,
      specs: {
        ...subSeries.specs,
        [field]: value,
      },
    });
  };

  const isManagedByCustomization = (specKey: string) => {
    const groupId = SPEC_TO_CUSTOMIZATION_MAP[specKey];
    if (!groupId) return false;
    return subSeries.customizationGroups?.some(g => g.id === groupId && g.enabled !== false);
  };

  const ManagedNote = ({ groupId }: { groupId: string }) => (
    <div className="w-full bg-surface/50 border border-[#c5a059]/10 p-3 text-xs text-muted flex items-center justify-between">
      <span>Managed in Customizations</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-[#c5a059]/10 pb-4 mb-6">
        <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-content">
          Specifications
        </h2>
        <p className="text-sm text-muted">
          Technical bat specifications and physical dimensions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Willow Grade (Read-only)
          </label>
          <div className="w-full bg-bg/50 border border-transparent p-3 text-sm text-muted cursor-not-allowed">
            {(series as any).grade ||
              (series as any).gradeLabel ||
              (series as any).willowGrade ||
              subSeries.specs?.willowGrade ||
              subSeries.gradeLabel ||
              "Not Specified"}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Grains (Free Text)
          </label>
          <input
            type="text"
            value={subSeries.specs?.grainRange || ""}
            onChange={(e) => updateSpec("grainRange", e.target.value)}
            className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            placeholder="e.g. 8-10 straight, distinct grains"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Weight Range
          </label>
          {isManagedByCustomization('weightRange') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['weightRange']} />
          ) : (
            <select
              value={subSeries.specs?.weightRange || ""}
              onChange={(e) => updateSpec("weightRange", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Weight...</option>
              {WEIGHT_BANDS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Profile
          </label>
          {isManagedByCustomization('profile') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['profile']} />
          ) : (
            <select
              value={subSeries.specs?.profile || ""}
              onChange={(e) => updateSpec("profile", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Profile...</option>
              {PROFILES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Sweet Spot
          </label>
          {isManagedByCustomization('sweetSpot') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['sweetSpot']} />
          ) : (
            <select
              value={subSeries.specs?.sweetSpot || ""}
              onChange={(e) => updateSpec("sweetSpot", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Sweet Spot...</option>
              {SWEET_SPOTS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Edges
          </label>
          {isManagedByCustomization('edges') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['edges']} />
          ) : (
            <select
              value={subSeries.specs?.edgeThickness || ""}
              onChange={(e) => updateSpec("edgeThickness", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Edges...</option>
              {EDGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Spine
          </label>
          {isManagedByCustomization('spine') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['spine']} />
          ) : (
            <select
              value={subSeries.specs?.spineHeight || ""}
              onChange={(e) => updateSpec("spineHeight", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Spine...</option>
              {SPINE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Handle
          </label>
          {isManagedByCustomization('handle') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['handle']} />
          ) : (
            <select
              value={subSeries.specs?.handleShape || ""}
              onChange={(e) => updateSpec("handleShape", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Handle...</option>
              {HANDLE_TYPES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Finish
          </label>
          {isManagedByCustomization('finish') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['finish']} />
          ) : (
            <select
              value={subSeries.specs?.finish || ""}
              onChange={(e) => updateSpec("finish", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Finish...</option>
              {FINISHES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Toe 
          </label>
          {isManagedByCustomization('toeProtection') ? (
             <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['toeProtection']} />
          ) : (
            <select
              value={subSeries.specs?.toeProfile || ""}
              onChange={(e) => updateSpec("toeProfile", e.target.value)}
              className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors appearance-none rounded-none"
            >
              <option value="">Select Toe Type...</option>
              <option value="Square">Square</option>
              <option value="Semi-Square">Semi-Square</option>
              <option value="Round">Round</option>
              <option value="Protective Shield Fitted">Protective Shield Fitted</option>
            </select>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[#c5a059]/10">
        {isManagedByCustomization('preKnockedIncluded') ? (
           <ManagedNote groupId={SPEC_TO_CUSTOMIZATION_MAP['preKnockedIncluded']} />
        ) : (
          <label className="flex items-center gap-3 cursor-pointer group w-max">
            <div
              className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                subSeries.specs?.knockedInStatus === "yes"
                  ? "bg-[#c5a059] border-[#c5a059]"
                  : "border-[#c5a059]/30 group-hover:border-[#c5a059]/60"
              }`}
            >
              {subSeries.specs?.knockedInStatus === "yes" && (
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
            <div className="flex flex-col">
              <span className="text-sm font-bold text-content/80 group-hover:text-content tracking-wider uppercase">
                Pre-knocked Included
              </span>
              <span className="text-[10px] text-muted">
                Is this bat fully knocked and match-ready by default?
              </span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
