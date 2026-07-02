// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
  Copy,
} from "lucide-react";
import { RevealSection } from "../../Reveal";
import { GoldButton } from "../../GoldButton";
import { useProducts } from "../../../context/ProductsContext";
import { productService } from "../../../features/products/services/productService";
import {
  ProductSeries,
  ProductSubSeries,
} from "../../../features/products/types";
import { getAttributes, applySeriesDefaults, validateAttributes } from "../../../features/products/attributes";
import { buildDuplicateSubSeries } from "../../../features/products/duplicate";
import { FEATURES } from "../../../config/features";

import { AdminDetailsTab } from "./AdminDetailsTab";
import { AdminAttributesTab } from "./AdminAttributesTab";
import { AdminMediaTab } from "./AdminMediaTab";
import { AdminPricingTab } from "./AdminPricingTab";
import { AdminSeoTab } from "./AdminSeoTab";
import { 
  analyzeProductCompleteness, 
  generateSeoSuggestion, 
  generateDescriptionSuggestion, 
  generatePriceSuggestion 
} from "../../../features/aiSuggestions/aiService";

import { toast } from 'sonner';

function AiAssistantPanel({ series, subSeries, updateSubSeries }: { series: any, subSeries: any, updateSubSeries: (s: any) => void }) {
  const [working, setWorking] = useState(false);
  const [suggestion, setSuggestion] = useState<{type: string, data: any, message?: string} | null>(null);

  const handleReviewCompleteness = () => {
    setWorking(true);
    setTimeout(() => {
      const res = analyzeProductCompleteness(series, subSeries);
      setSuggestion({ type: 'completeness', data: res });
      setWorking(false);
    }, 600);
  };

  const handleSuggestDescription = () => {
    setWorking(true);
    setTimeout(() => {
      const desc = generateDescriptionSuggestion(subSeries.name || series.name, subSeries.gradeLabel || 'Standard');
      setSuggestion({ type: 'description', data: desc, message: "Suggested Description based on product tier." });
      setWorking(false);
    }, 800);
  };

  const handleSuggestSeo = () => {
    setWorking(true);
    setTimeout(() => {
      const seo = generateSeoSuggestion(`${series.name} ${subSeries.name}`, 'subseries');
      setSuggestion({ type: 'seo', data: seo, message: "Suggested SEO Title and Description" });
      setWorking(false);
    }, 700);
  };

  const handleSuggestPrice = () => {
    setWorking(true);
    setTimeout(() => {
      const p = generatePriceSuggestion(series.name, subSeries.grade || 'grade 3');
      setSuggestion({ type: 'price', data: p, message: "Suggested Price Range" });
      setWorking(false);
    }, 600);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const upd = { ...subSeries };
    if (suggestion.type === 'description') {
      upd.shortDescription = suggestion.data;
    } else if (suggestion.type === 'seo') {
      upd.seoTitle = suggestion.data.title;
      upd.seoDescription = suggestion.data.description;
    } else if (suggestion.type === 'price') {
      // Just applying min price for demo
      upd.basePrice = suggestion.data.min;
      upd.price = suggestion.data.min;
    }
    updateSubSeries(upd);
    setSuggestion(null);
    toast.success(`Applied ${suggestion.type} suggestion!`);
  };

  return (
    <div className="border border-line rounded-xl p-4">
      <div className="flex justify-between items-center mb-4 border-b border-line pb-2">
         <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#c5a059]" /> AI Workspace
         </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
         <button onClick={handleReviewCompleteness} disabled={working} className="text-[9px] uppercase tracking-wider text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/5 py-2 border border-line rounded-sm transition-colors text-center disabled:opacity-50">Review Setup</button>
         <button onClick={handleSuggestDescription} disabled={working} className="text-[9px] uppercase tracking-wider text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/5 py-2 border border-line rounded-sm transition-colors text-center disabled:opacity-50">Draft Desc</button>
         <button onClick={handleSuggestSeo} disabled={working} className="text-[9px] uppercase tracking-wider text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/5 py-2 border border-line rounded-sm transition-colors text-center disabled:opacity-50">Suggest SEO</button>
         <button onClick={handleSuggestPrice} disabled={working} className="text-[9px] uppercase tracking-wider text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/5 py-2 border border-line rounded-sm transition-colors text-center disabled:opacity-50">Price Check</button>
      </div>

      {working && (
        <div className="text-[10px] text-muted uppercase tracking-widest flex items-center gap-2 justify-center py-4 animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...
        </div>
      )}

      {suggestion && !working && (
        <div className="bg-bg border border-line rounded-sm p-3 relative mt-2 animate-fade-in">
           <button onClick={() => setSuggestion(null)} className="absolute top-1 right-2 text-muted hover:text-content text-xs">&times;</button>
           <p className="text-[9px] uppercase tracking-widest text-[#c5a059] mb-2 font-bold">{suggestion.message || 'AI Review Result'}</p>
           
           {suggestion.type === 'completeness' && (
             <div className="space-y-2">
               <p className="text-xs text-content">Score: {suggestion.data.score}/100</p>
               {suggestion.data.missing.length > 0 ? (
                 <ul className="text-[10px] text-muted space-y-1">
                   {suggestion.data.missing.map((m: string, i: number) => (
                     <li key={i} className="text-red-400">&bull; Missing: {m}</li>
                   ))}
                 </ul>
               ) : (
                 <p className="text-[10px] text-green-400">Perfectly configured!</p>
               )}
             </div>
           )}

           {suggestion.type === 'description' && (
             <p className="text-xs text-muted leading-relaxed italic border-l-2 border-[#c5a059]/50 pl-2 py-1">{suggestion.data}</p>
           )}

           {suggestion.type === 'seo' && (
             <div className="space-y-2">
               <p className="text-[10px]"><strong className="text-content">Title:</strong> {suggestion.data.title}</p>
               <p className="text-[10px] text-muted leading-relaxed"><strong className="text-content">Desc:</strong> {suggestion.data.description}</p>
             </div>
           )}

           {suggestion.type === 'price' && (
             <div className="space-y-2">
               <p className="text-[10px]"><strong className="text-content">Range:</strong> ₹{suggestion.data.min.toLocaleString('en-IN')} – ₹{suggestion.data.max.toLocaleString('en-IN')}</p>
               <p className="text-[10px] text-muted italic border-l-2 border-[#c5a059]/50 pl-2 py-1">{suggestion.data.reason}</p>
             </div>
           )}

           {['description', 'seo', 'price'].includes(suggestion.type) && (
             <button onClick={applySuggestion} className="w-full mt-3 bg-[#c5a059] text-bg py-2 text-[9px] uppercase tracking-widest font-bold hover:bg-premium-gold-text transition-colors rounded-sm">
               Apply Draft
             </button>
           )}
        </div>
      )}
    </div>
  );
}

export function AdminProductEditorPage() {
  const { seriesSlug, productSlug } = useParams<{
    seriesSlug: string;
    productSlug: string;
  }>();
  const { products, refresh, loading } = useProducts();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const series = products.find((p) => p.slug === seriesSlug);
  const originalSubSeries = series?.subSeries?.find(
    (s) => s.slug === productSlug || s.id === productSlug,
  );

  const [activeSubSeries, setActiveSubSeries] =
    useState<ProductSubSeries | null>(null);

  const [activeTab, setActiveTab] = useState<
    "details" | "attributes" | "media" | "pricing" | "seo"
  >("details");
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAi, setShowAi] = useState(false);

  // Load (or reload, when navigating to a different sub-series such as after a
  // duplicate) the editable copy. Keyed on the resolved id so a save→refresh
  // (same id, new object identity) never clobbers in-progress edits.
  useEffect(() => {
    if (originalSubSeries && originalSubSeries.id !== activeSubSeries?.id) {
      setActiveSubSeries(JSON.parse(JSON.stringify(originalSubSeries)));
    }
  }, [originalSubSeries?.id]);

  useEffect(() => {
    if (series && activeSubSeries) {
      document.title = `Editing: ${series.name} — ${activeSubSeries.name} | Admin`;
    }
  }, [series, activeSubSeries]);

  useEffect(() => {
    if (activeSubSeries && originalSubSeries) {
      const isChanged =
        JSON.stringify(activeSubSeries) !== JSON.stringify(originalSubSeries);
      setHasUnsavedChanges(isChanged);
    }
  }, [activeSubSeries, originalSubSeries]);

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading || !series || !activeSubSeries)
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  const updateSubSeries = (updated: ProductSubSeries) => {
    setActiveSubSeries(updated);
  };

  const handleDuplicate = async () => {
    if (!series || !activeSubSeries) return;
    if (hasUnsavedChanges) {
      toast.error("Save your changes before duplicating.");
      return;
    }
    if (!confirm(`Duplicate "${activeSubSeries.name}"? The copy reuses the same images and starts as a draft.`)) return;
    const dup = buildDuplicateSubSeries(activeSubSeries, {
      seriesSlug: series.slug,
      existingSlugs: (series.subSeries || []).map((s) => s.slug),
      existingSkus: (series.subSeries || []).map((s) => s.sku).filter(Boolean),
    });
    setSaving(true);
    try {
      await productService.updateProduct(series.slug, { subSeries: [...(series.subSeries || []), dup] });
      await refresh();
      toast.success(`Duplicated as "${dup.name}" (draft).`);
      navigate(`/admin/products/${series.slug}/${dup.slug}`);
    } catch (e: any) {
      toast.error(`Error duplicating: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!series || !activeSubSeries) return;
    setSaving(true);
    let validationError = "";

    if (
      typeof activeSubSeries.basePrice !== "number" ||
      isNaN(activeSubSeries.basePrice)
    ) {
      validationError = "Base Price must be a valid number.";
    }

    if (!validationError) {
      const attrErrors = validateAttributes(getAttributes(activeSubSeries));
      if (attrErrors.length) {
        validationError = `Fix ${attrErrors.length} attribute issue(s) in the Attributes tab before saving.`;
      }
    }

    // Slug and SKU validation across the entire products list
    if (!validationError) {
       for (const p of products) {
         for (const s of (p.subSeries || [])) {
           if (s.id !== activeSubSeries.id) {
             if (s.slug === activeSubSeries.slug && p.id === series.id) {
               validationError = `Slug '${activeSubSeries.slug}' is already used by another product in this series.`;
               break;
             }
             if (activeSubSeries.sku && s.sku === activeSubSeries.sku) {
               validationError = `SKU '${activeSubSeries.sku}' is already in use.`;
               break;
             }
           }
         }
       }
    }

    if (validationError) {
      toast.error(validationError);
      setSaving(false);
      return;
    }

    try {
      const newList = (series.subSeries || []).map((s) =>
        s.id === activeSubSeries.id ? activeSubSeries : s,
      );
      await productService.updateProduct(series.slug, { subSeries: newList });
      await refresh();
      setHasUnsavedChanges(false);
      toast.success("Product changes saved successfully!");
    } catch (e: any) {
      toast.error(`Error saving: ${e.message}`);
    }
    setSaving(false);
  };

  const tabs = [
    { id: "details", label: "Details" },
    { id: "attributes", label: "Attributes" },
    { id: "media", label: "Media Gallery" },
    { id: "pricing", label: "Pricing" },
    { id: "seo", label: "SEO" },
  ];

  const getMissingFields = () => {
    const missing = [];
    if (!activeSubSeries.name) missing.push("Name");
    if (!activeSubSeries.slug) missing.push("Slug");
    if (!activeSubSeries.sku) missing.push("SKU");
    if (!activeSubSeries.gradeLabel && !activeSubSeries.grade) missing.push("Grade");
    if (typeof activeSubSeries.basePrice !== 'number' || activeSubSeries.basePrice <= 0) missing.push("Base Price");
    if (!activeSubSeries.media?.primaryImage) missing.push("Primary Image");
    if (!activeSubSeries.shortDescription) missing.push("Short Description");
    if (typeof activeSubSeries.estimatedDeliveryDays !== 'number') missing.push("Delivery Estimate");
    if (typeof activeSubSeries.warrantyMonths !== 'number') missing.push("Warranty Months");
    const attrs = getAttributes(activeSubSeries);
    if (attrs.filter((a: any) => a.mode === 'fixed').length < 6) missing.push("Specs");
    if (!activeSubSeries.performance || Object.keys(activeSubSeries.performance || {}).length < 3) missing.push("Performance Scores");
    if (attrs.filter((a: any) => a.mode === 'customizable').length === 0) missing.push("Customization Groups");
    return missing;
  };

  const missingFields = getMissingFields();
  const completionScore = Math.round(((12 - missingFields.length) / 12) * 100);
  const attrErrors = validateAttributes(getAttributes(activeSubSeries));

  return (
    <div className="pb-24 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-toast bg-[#111111] border border-green-500/30 px-6 py-4 flex items-center gap-3 shadow-2xl animate-fade-in text-green-400 font-bold uppercase tracking-widest text-[10px]">
          <CheckCircle2 size={16} /> Product Saved ✓
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-sticky-section bg-bg border-b border-line pt-3 pb-3 mb-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="min-w-0">
            <nav className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-muted mb-1.5 flex-wrap">
              <Link to="/admin/products" className="hover:text-content transition-colors">Products</Link>
              <ChevronRight size={10} />
              <Link to={`/admin/products/${series.slug}`} className="hover:text-content transition-colors flex items-center gap-1"><ArrowLeft size={11} /> {series.name}</Link>
              <ChevronRight size={10} />
              <span className="text-content">{activeSubSeries.name}</span>
            </nav>
            <h1 className="text-lg md:text-xl font-bold tracking-wide text-content flex items-center gap-3 flex-wrap">
              {activeSubSeries.name}
              <span className="text-sm text-muted font-normal">· {series.name}</span>
              {hasUnsavedChanges && attrErrors.length === 0 && (
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded-sm flex items-center gap-1">
                  <AlertCircle size={12} /> Unsaved changes
                </span>
              )}
              {attrErrors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("attributes")}
                  className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-sm flex items-center gap-1 hover:bg-red-500/20"
                  title="Go to Attributes tab"
                >
                  <AlertCircle size={12} /> {attrErrors.length} attribute issue{attrErrors.length > 1 ? "s" : ""}
                </button>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              to={`/collection/${series.slug}/${activeSubSeries.slug}`}
              target="_blank"
              className="text-[10px] tracking-widest uppercase font-bold text-muted hover:text-[#c5a059] border border-line hover:border-[#c5a059]/50 px-4 py-2 rounded-sm transition-colors"
            >
               Preview
            </Link>
            <button
              onClick={handleDuplicate}
              disabled={saving || hasUnsavedChanges}
              title={hasUnsavedChanges ? "Save your changes first" : "Duplicate this product (reuses images, starts as draft)"}
              className="text-[10px] tracking-widest uppercase font-bold text-muted hover:text-[#c5a059] border border-line hover:border-[#c5a059]/50 px-4 py-2 rounded-sm transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy size={12} /> Duplicate
            </button>
            <GoldButton
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges || attrErrors.length > 0}
              variant="solid"
              className="px-5 py-2 text-[10px]"
            >
              {saving ? "Saving…" : attrErrors.length > 0 ? "Fix Issues to Save" : "Save Product"}
            </GoldButton>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-line mb-5 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-3.5 pb-2.5 pt-1 text-[10px] tracking-widest uppercase font-bold whitespace-nowrap transition-colors ${activeTab === tab.id ? "text-[#c5a059]" : "text-muted hover:text-content"}`}
            >
              {tab.label}
              {tab.id === "attributes" && attrErrors.length > 0 && <span className="absolute -top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />}
              {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a059]" aria-hidden />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2 shrink-0">
          <button
            onClick={() => setShowChecklist((v) => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-sm border transition-colors ${completionScore === 100 ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"}`}
            title={completionScore === 100 ? "All set — ready to publish" : "Show what's missing"}
          >
            {completionScore}%{completionScore === 100 ? " · Ready" : ` · ${missingFields.length} missing`}
          </button>
          <button
            onClick={() => setShowAi((v) => !v)}
            className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1.5 rounded-sm border transition-colors ${showAi ? "border-[#c5a059]/50 text-[#c5a059] bg-[#c5a059]/10" : "border-line text-muted hover:text-[#c5a059] hover:border-[#c5a059]/50"}`}
            title="AI workspace"
          >
            <Sparkles size={12} /> AI
          </button>
        </div>
      </div>

      {showChecklist && (
        <div className="mb-5 border border-line rounded-xl p-4 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Completion</h3>
            <span className={`text-[10px] font-mono ${completionScore === 100 ? "text-emerald-500" : "text-amber-500"}`}>{completionScore}%</span>
          </div>
          <div className="w-full bg-surface h-1 mb-3 rounded-full overflow-hidden">
            <div className={`h-full ${completionScore === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${completionScore}%` }}></div>
          </div>
          {missingFields.length > 0 ? (
            <ul className="space-y-1">
              {missingFields.map((field) => (
                <li key={field} className="text-[11px] text-muted flex items-start gap-1.5">
                  <span className="text-amber-500">&bull;</span> {field}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-emerald-500">Ready to publish — every field is filled in.</p>
          )}
        </div>
      )}

      {showAi && (
        <div className="mb-5 max-w-md">
          <AiAssistantPanel series={series} subSeries={activeSubSeries} updateSubSeries={updateSubSeries} />
        </div>
      )}

      {/* Content — full width */}
      <div className="min-w-0">
        {activeTab === "details" && (
          <div className="max-w-4xl">
            <AdminDetailsTab
              series={series}
              subSeries={activeSubSeries}
              updateSubSeries={updateSubSeries}
            />
          </div>
        )}
        {activeTab === "attributes" && (
          <AdminAttributesTab
            attributes={getAttributes(activeSubSeries)}
            onChange={(attrs) => updateSubSeries({ ...activeSubSeries, attributes: attrs })}
            storagePath={`products/${series.slug}/${activeSubSeries.slug}/swatches`}
            template={series.attributes}
            onApplyDefaults={() => {
              const { attributes, added } = applySeriesDefaults(
                getAttributes(activeSubSeries),
                series.attributes,
              );
              if (!added.length) {
                toast("Already up to date with series defaults.");
                return;
              }
              updateSubSeries({ ...activeSubSeries, attributes });
              toast.success(`Added ${added.length} attribute(s) from series defaults (inactive — enable per option).`);
            }}
          />
        )}
        {activeTab === "media" && (
          <AdminMediaTab
            series={series}
            subSeries={activeSubSeries}
            updateSubSeries={updateSubSeries}
          />
        )}
        {activeTab === "pricing" && (
          <div className="max-w-4xl">
            <AdminPricingTab
              series={series}
              subSeries={activeSubSeries}
              updateSubSeries={updateSubSeries}
            />
          </div>
        )}
        {activeTab === "seo" && (
          <div className="max-w-4xl">
            <AdminSeoTab
              series={series}
              subSeries={activeSubSeries}
              updateSubSeries={updateSubSeries}
            />
          </div>
        )}
      </div>
    </div>
  );
}
