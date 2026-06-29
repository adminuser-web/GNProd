// @ts-nocheck
import React, { useState } from "react";
import {
  Product,
  ProductSubSeries,
  CustomizationGroup,
} from "../../../features/products/types";
import { ChevronUp, ChevronDown, Plus, Trash2, Upload } from "lucide-react";
import { uploadToStorage } from "../../../lib/storage";
import { CUSTOMIZATION_TYPES } from "../../../config/productOptions";
import { ImageUpload } from "../ImageUpload";

const LIBRARY_GROUPS = [
  {
    id: "bat-size",
    label: "Bat Size",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "size-sh",
        label: "Short Handle (SH)",
        priceDelta: 0,
        available: true,
      },
      {
        id: "size-lh",
        label: "Long Handle (LH)",
        priceDelta: 0,
        available: true,
      },
      { id: "size-harrow", label: "Harrow", priceDelta: 0, available: true },
    ],
  },
  {
    id: "toe-shape",
    label: "Toe Shape",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "toe-round",
        label: "Standard Round",
        priceDelta: 0,
        available: true,
      },
      { id: "toe-square", label: "Square Toe", priceDelta: 0, available: true },
      {
        id: "toe-duckbill",
        label: "Reinforced / Duck-Bill",
        priceDelta: 500,
        available: true,
      },
    ],
  },
  {
    id: "grip-color",
    label: "Grip Colour",
    type: "color",
    required: true,
    enabled: true,
    options: [
      {
        id: "grip-white",
        label: "White",
        priceDelta: 0,
        colorHex: "#ffffff",
        available: true,
      },
      {
        id: "grip-black",
        label: "Black",
        priceDelta: 0,
        colorHex: "#000000",
        available: true,
      },
      {
        id: "grip-red",
        label: "Red",
        priceDelta: 0,
        colorHex: "#ff0000",
        available: true,
      },
      {
        id: "grip-blue",
        label: "Blue",
        priceDelta: 0,
        colorHex: "#0000ff",
        available: true,
      },
    ],
  },
  {
    id: "handle-shape",
    label: "Handle Shape",
    type: "select",
    required: true,
    enabled: true,
    options: [
      { id: "handle-round", label: "Round", priceDelta: 0, available: true },
      { id: "handle-semi", label: "Semi-Oval", priceDelta: 0, available: true },
      { id: "handle-oval", label: "Oval", priceDelta: 0, available: true },
    ],
  },
  {
    id: "weight-profile",
    label: "Weight Profile",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "weight-light",
        label: "Light (2lb 7oz - 2lb 9oz)",
        priceDelta: 250,
        available: true,
      },
      {
        id: "weight-medium",
        label: "Medium (2lb 9oz - 2lb 11oz)",
        priceDelta: 0,
        available: true,
      },
      {
        id: "weight-heavy",
        label: "Heavy (2lb 11oz+)",
        priceDelta: 250,
        available: true,
      },
    ],
  },
  {
    id: "edge-profile",
    label: "Edge Profile",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "edge-38",
        label: "Standard (38mm)",
        priceDelta: 0,
        available: true,
      },
      {
        id: "edge-40",
        label: "Thick (40mm)",
        priceDelta: 750,
        available: true,
      },
      {
        id: "edge-max",
        label: "Maximum (42mm+)",
        priceDelta: 1000,
        available: true,
      },
    ],
  },
  {
    id: "sweet-spot",
    label: "Sweet-Spot Position",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "spot-low",
        label: "Low (Front-foot play)",
        priceDelta: 500,
        available: true,
      },
      {
        id: "spot-mid",
        label: "Mid (All-round)",
        priceDelta: 0,
        available: true,
      },
      {
        id: "spot-high",
        label: "High (Back-foot play)",
        priceDelta: 500,
        available: true,
      },
    ],
  },
  {
    id: "engraving",
    label: "Personal Engraving",
    type: "text",
    maxLength: 12,
    validationRegex: "^[A-Za-z0-9 ]{0,12}$",
    required: false,
    enabled: true,
    options: [
      {
        id: "engraving-yes",
        label: "Add Custom Engraving",
        priceDelta: 1500,
        available: true,
      },
    ],
  },
  {
    id: "pre-knocked",
    label: "Knocking-In",
    type: "toggle",
    required: false,
    enabled: true,
    options: [
      {
        id: "knocked-yes",
        label: "Pre-knocked & oiled",
        priceDelta: 999,
        available: true,
      },
    ],
  },
  {
    id: "handle-length",
    label: "Handle Length",
    type: "select",
    required: true,
    enabled: true,
    options: [
      { id: "handle-std", label: "Standard", priceDelta: 0, available: true },
      { id: "handle-short", label: "Short", priceDelta: 0, available: true },
      { id: "handle-long", label: "Long", priceDelta: 0, available: true },
    ],
  },
  {
    id: "bat-profile",
    label: "Bat Profile",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "profile-full",
        label: "Full Profile (No Concaving)",
        priceDelta: 1500,
        available: true,
      },
      {
        id: "profile-mid",
        label: "Mid Profile",
        priceDelta: 0,
        available: true,
      },
      {
        id: "profile-low",
        label: "Low Profile",
        priceDelta: 0,
        available: true,
      },
    ],
  },
  {
    id: "finish",
    label: "Finish",
    type: "select",
    required: true,
    enabled: true,
    options: [
      {
        id: "finish-natural",
        label: "Natural Finish",
        priceDelta: 0,
        available: true,
      },
      {
        id: "finish-polished",
        label: "Polished",
        priceDelta: 0,
        available: true,
      },
      { id: "finish-waxed", label: "Waxed", priceDelta: 250, available: true },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    type: "toggle",
    required: false,
    enabled: true,
    options: [
      {
        id: "acc-scuff",
        label: "Anti-scuff Sheet",
        priceDelta: 250,
        available: true,
      },
      {
        id: "acc-toe",
        label: "Extra Toe Guard",
        priceDelta: 150,
        available: true,
      },
    ],
  },
];

interface Props {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (subSeries: ProductSubSeries) => void;
}

export function AdminCustomizationsTab({
  series,
  subSeries,
  updateSubSeries,
}: Props) {
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [uploadError, setUploadError] = useState("");

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    progressKey: string,
    setter: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    setUploadProgress((prev) => ({ ...prev, [progressKey]: 30 }));

    (async () => {
      try {
        const downloadURL = await uploadToStorage(
          `products/${series.slug}/${subSeries.slug}/${fileId}`,
          file,
        );
        setter(downloadURL);
      } catch (err: any) {
        setUploadError(err.message || "Upload failed");
      } finally {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[progressKey];
          return next;
        });
      }
    })();
  };

  const updateGroups = (newGroups: CustomizationGroup[]) => {
    updateSubSeries({ ...subSeries, customizationGroups: newGroups });
  };

  const groups = subSeries.customizationGroups || [];

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      <div className="flex justify-between items-end border-b border-[#c5a059]/10 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-content">
            Customizations
          </h2>
          <p className="text-sm text-muted">
            Add customization options specific to this product.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <select
            className="bg-bg border border-[#c5a059]/20 text-[10px] uppercase tracking-widest text-[#c5a059] p-3 focus:outline-none focus:border-[#c5a059] transition-colors font-bold rounded-none appearance-none cursor-pointer"
            onChange={(e) => {
              if (!e.target.value) return;
              const libGrp = LIBRARY_GROUPS.find(
                (g) => g.id === e.target.value,
              );
              if (libGrp) {
                const tg = [...groups];
                tg.push(JSON.parse(JSON.stringify(libGrp)));
                updateGroups(tg);
              }
              e.target.value = "";
            }}
          >
            <option value="">+ Add from Library...</option>
            {LIBRARY_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const newGru = [...groups];
              newGru.push({
                id: `group-${Date.now()}`,
                label: "New Group",
                type: "select",
                required: false,
                enabled: true,
                options: [],
              } as any);
              updateGroups(newGru);
            }}
            className="px-6 py-3 border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10 hover:border-[#c5a059] cursor-pointer text-[10px] uppercase tracking-widest transition-colors font-bold flex items-center gap-2"
          >
            <Plus size={14} /> Custom Group
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="text-red-500 text-xs mb-4 uppercase tracking-widest">
          {uploadError}
        </p>
      )}

      <div className="space-y-6">
        {groups.map((group, groupIdx) => (
          <div
            key={groupIdx}
            className={`bg-bg border ${group.enabled !== false ? "border-[#c5a059]/20" : "border-gray-500/20 opacity-70"} p-0 relative transition-all group/card`}
          >
            {!group.enabled && (
              <div className="absolute top-0 right-0 bg-gray-500/20 text-gray-400 text-[8px] font-bold px-3 py-1 uppercase tracking-widest z-raised">
                Hidden from Store
              </div>
            )}

            <div className="flex bg-surface p-4 border-b border-[#c5a059]/10 items-start gap-4">
              <div className="flex flex-col gap-1 mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button
                  disabled={groupIdx === 0}
                  onClick={() => {
                    const tg = [...groups];
                    [tg[groupIdx - 1], tg[groupIdx]] = [
                      tg[groupIdx],
                      tg[groupIdx - 1],
                    ];
                    updateGroups(tg);
                  }}
                  className="text-muted hover:text-[#c5a059] disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  disabled={groupIdx === groups.length - 1}
                  onClick={() => {
                    const tg = [...groups];
                    [tg[groupIdx], tg[groupIdx + 1]] = [
                      tg[groupIdx + 1],
                      tg[groupIdx],
                    ];
                    updateGroups(tg);
                  }}
                  className="text-muted hover:text-[#c5a059] disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                    Group Label
                  </label>
                  <input
                    type="text"
                    value={group.label}
                    onChange={(e) => {
                      const tg = [...groups];
                      tg[groupIdx] = { ...tg[groupIdx], label: e.target.value };
                      updateGroups(tg);
                    }}
                    className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                    Type
                  </label>
                  <select
                    value={group.type || "select"}
                    onChange={(e) => {
                      const tg = [...groups];
                      tg[groupIdx] = {
                        ...tg[groupIdx],
                        type: e.target.value as any,
                      };
                      updateGroups(tg);
                    }}
                    className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none appearance-none"
                  >
                    {CUSTOMIZATION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="text-[10px] text-muted uppercase tracking-widest block invisible">
                    Actions
                  </label>
                  <div className="flex items-center gap-4 h-full">
                    <label className="flex items-center gap-3 cursor-pointer group/req">
                      <div
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                          group.required
                            ? "bg-[#c5a059] border-[#c5a059]"
                            : "border-[#c5a059]/30 group-hover/req:border-[#c5a059]/60"
                        }`}
                      >
                        {group.required && (
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
                      <span className="text-xs uppercase tracking-widest text-content/80 group-hover/req:text-content font-bold">
                        Required
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group/live ml-4">
                      <div
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                          group.enabled !== false
                            ? "bg-[#c5a059] border-[#c5a059]"
                            : "border-[#c5a059]/30 group-hover/live:border-[#c5a059]/60"
                        }`}
                      >
                        {group.enabled !== false && (
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
                      <span className="text-xs uppercase tracking-widest text-content/80 group-hover/live:text-content font-bold">
                        Live
                      </span>
                    </label>

                    <button
                      onClick={() => {
                        if (confirm(`Remove group "${group.label}"?`)) {
                          const tg = [...groups];
                          tg.splice(groupIdx, 1);
                          updateGroups(tg);
                        }
                      }}
                      className="text-red-500 hover:text-white hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded ml-auto transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {group.type === "text" && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface/50 border-b border-[#c5a059]/10">
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                    Max Length
                  </label>
                  <input
                    type="number"
                    value={group.maxLength || 0}
                    onChange={(e) => {
                      const tg = [...groups];
                      tg[groupIdx] = {
                        ...tg[groupIdx],
                        maxLength: parseInt(e.target.value) || 0,
                      };
                      updateGroups(tg);
                    }}
                    className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                    Validation Regex
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ^[a-zA-Z0-9 ]+$"
                    value={group.validationRegex || ""}
                    onChange={(e) => {
                      const tg = [...groups];
                      tg[groupIdx] = {
                        ...tg[groupIdx],
                        validationRegex: e.target.value,
                      };
                      updateGroups(tg);
                    }}
                    className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none font-mono"
                  />
                </div>
              </div>
            )}

            <div className="p-4 pl-[4.5rem]">
              <div className="flex justify-between items-end mb-4">
                <h5 className="text-[10px] text-muted uppercase tracking-widest font-bold">
                  Options
                </h5>
                <button
                  onClick={() => {
                    const tg = [...groups];
                    const newOpts = [...tg[groupIdx].options];
                    newOpts.push({
                      id: `opt-${Date.now()}`,
                      label: "New Option",
                      priceDelta: 0,
                      available: true,
                      colorHex: group.type === "color" ? "#ffffff" : undefined,
                    } as any);
                    tg[groupIdx] = { ...tg[groupIdx], options: newOpts };
                    updateGroups(tg);
                  }}
                  className="text-[10px] text-[#c5a059] uppercase tracking-widest hover:text-content flex items-center gap-1 font-bold transition-colors"
                >
                  <Plus size={14} /> Add Option
                </button>
              </div>

              <div className="space-y-3">
                {group.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="flex flex-col lg:flex-row gap-4 p-4 border border-[#c5a059]/10 bg-surface/50 group/opt relative items-start"
                  >
                    <div className="flex flex-col gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                      <button
                        disabled={optIdx === 0}
                        onClick={() => {
                          const tg = [...groups];
                          const newOpts = [...tg[groupIdx].options];
                          [newOpts[optIdx - 1], newOpts[optIdx]] = [
                            newOpts[optIdx],
                            newOpts[optIdx - 1],
                          ];
                          tg[groupIdx] = { ...tg[groupIdx], options: newOpts };
                          updateGroups(tg);
                        }}
                        className="text-muted hover:text-[#c5a059] disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        disabled={optIdx === group.options.length - 1}
                        onClick={() => {
                          const tg = [...groups];
                          const newOpts = [...tg[groupIdx].options];
                          [newOpts[optIdx], newOpts[optIdx + 1]] = [
                            newOpts[optIdx + 1],
                            newOpts[optIdx],
                          ];
                          tg[groupIdx] = { ...tg[groupIdx], options: newOpts };
                          updateGroups(tg);
                        }}
                        className="text-muted hover:text-[#c5a059] disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                      <div>
                        <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">
                          Label
                        </label>
                        <input
                          type="text"
                          placeholder="Label"
                          value={opt.label}
                          onChange={(e) => {
                            const tg = [...groups];
                            const newOpts = [...tg[groupIdx].options];
                            newOpts[optIdx] = {
                              ...newOpts[optIdx],
                              label: e.target.value,
                            };
                            tg[groupIdx] = {
                              ...tg[groupIdx],
                              options: newOpts,
                            };
                            updateGroups(tg);
                          }}
                          className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-2 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">
                          Price Delta (+₹)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={opt.priceDelta}
                          onChange={(e) => {
                            const val = e.target.value;
                            const tg = [...groups];
                            const newOpts = [...tg[groupIdx].options];
                            newOpts[optIdx] = {
                              ...newOpts[optIdx],
                              priceDelta: val === "" ? 0 : parseInt(val),
                            };
                            tg[groupIdx] = {
                              ...tg[groupIdx],
                              options: newOpts,
                            };
                            updateGroups(tg);
                          }}
                          className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-2 focus:outline-none focus:border-[#c5a059] font-mono transition-colors rounded-none"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Short detail..."
                          value={opt.description || ""}
                          onChange={(e) => {
                            const tg = [...groups];
                            const newOpts = [...tg[groupIdx].options];
                            newOpts[optIdx] = {
                              ...newOpts[optIdx],
                              description: e.target.value,
                            };
                            tg[groupIdx] = {
                              ...tg[groupIdx],
                              options: newOpts,
                            };
                            updateGroups(tg);
                          }}
                          className="w-full bg-bg border border-[#c5a059]/20 text-sm text-content p-2 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none"
                        />
                      </div>

                      {(group.type === "color" || group.type === "select") && (
                        <div className="lg:col-span-4 flex items-center gap-6 mt-2 pt-4 border-t border-[#c5a059]/10">
                          {group.type === "color" && (
                            <div className="flex items-center gap-3">
                              <label className="text-[10px] text-muted uppercase tracking-widest">
                                Hex
                              </label>
                              <input
                                type="color"
                                value={opt.colorHex || "#ffffff"}
                                onChange={(e) => {
                                  const tg = [...groups];
                                  const newOpts = [...tg[groupIdx].options];
                                  newOpts[optIdx] = {
                                    ...newOpts[optIdx],
                                    colorHex: e.target.value,
                                  };
                                  tg[groupIdx] = {
                                    ...tg[groupIdx],
                                    options: newOpts,
                                  };
                                  updateGroups(tg);
                                }}
                                className="w-8 h-8 rounded shrink-0 cursor-pointer border border-[#c5a059]/40 bg-bg p-0"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <ImageUpload
                               specKey="customizationSwatch"
                               value={opt.imageUrl || ""}
                               onChange={(url) => {
                                  const tg = [...groups];
                                  const newOpts = [...tg[groupIdx].options];
                                  newOpts[optIdx] = {
                                    ...newOpts[optIdx],
                                    imageUrl: url,
                                  };
                                  tg[groupIdx] = {
                                    ...tg[groupIdx],
                                    options: newOpts,
                                  };
                                  updateGroups(tg);
                               }}
                               storagePath={`products/${series.slug}/${subSeries.slug}/swatches`}
                             />
                          </div>

                          <label className="flex items-center gap-3 cursor-pointer group/optlive ml-auto">
                            <div
                              className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                                opt.available !== false
                                  ? "bg-[#c5a059] border-[#c5a059]"
                                  : "border-[#c5a059]/30 group-hover/optlive:border-[#c5a059]/60"
                              }`}
                            >
                              {opt.available !== false && (
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
                            <span className="text-xs uppercase tracking-widest text-content/80 group-hover/optlive:text-content">
                              Available
                            </span>
                          </label>
                          <button
                            onClick={() => {
                              const tg = [...groups];
                              const newOpts = [...tg[groupIdx].options];
                              newOpts.splice(optIdx, 1);
                              tg[groupIdx] = {
                                ...tg[groupIdx],
                                options: newOpts,
                              };
                              updateGroups(tg);
                            }}
                            className="text-red-500 hover:text-white hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {group.type !== "color" && group.type !== "select" && (
                        <div className="lg:col-span-4 flex items-center justify-end gap-6 mt-2 pt-4 border-t border-[#c5a059]/10">
                          <label className="flex items-center gap-3 cursor-pointer group/optlive">
                            <div
                              className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                                opt.available !== false
                                  ? "bg-[#c5a059] border-[#c5a059]"
                                  : "border-[#c5a059]/30 group-hover/optlive:border-[#c5a059]/60"
                              }`}
                            >
                              {opt.available !== false && (
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
                            <span className="text-xs uppercase tracking-widest text-content/80 group-hover/optlive:text-content">
                              Available
                            </span>
                          </label>
                          <button
                            onClick={() => {
                              const tg = [...groups];
                              const newOpts = [...tg[groupIdx].options];
                              newOpts.splice(optIdx, 1);
                              tg[groupIdx] = {
                                ...tg[groupIdx],
                                options: newOpts,
                              };
                              updateGroups(tg);
                            }}
                            className="text-red-500 hover:text-white hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {group.options.length === 0 && (
                  <p className="text-[10px] uppercase tracking-widest text-muted italic">
                    No options added yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="w-full h-32 border border-dashed border-[#c5a059]/20 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted">
              No custom options configured
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted/50">
              Add a group from the library or create a custom one
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
