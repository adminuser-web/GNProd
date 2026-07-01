// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
} from "lucide-react";
import { RevealSection } from "../../Reveal";
import { GoldButton } from "../../GoldButton";
import { useProducts } from "../../../context/ProductsContext";
import { productService } from "../../../features/products/services/productService";
import {
  ProductSeries,
  ProductSubSeries,
} from "../../../features/products/types";
import { getAttributes, applySeriesDefaults } from "../../../features/products/attributes";
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
    <div className="bg-surface border border-purple-500/30 p-4 mt-6">
      <div className="flex justify-between items-center mb-4 border-b border-purple-500/20 pb-2">
         <h3 className="text-[10px] uppercase tracking-widest font-bold text-purple-400 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> AI Workspace
         </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
         <button onClick={handleReviewCompleteness} disabled={working} className="text-[9px] uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 py-2 border border-purple-500/30 transition-colors text-center disabled:opacity-50">Review Setup</button>
         <button onClick={handleSuggestDescription} disabled={working} className="text-[9px] uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 py-2 border border-purple-500/30 transition-colors text-center disabled:opacity-50">Draft Desc</button>
         <button onClick={handleSuggestSeo} disabled={working} className="text-[9px] uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 py-2 border border-purple-500/30 transition-colors text-center disabled:opacity-50">Suggest SEO</button>
         <button onClick={handleSuggestPrice} disabled={working} className="text-[9px] uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 py-2 border border-purple-500/30 transition-colors text-center disabled:opacity-50">Price Check</button>
      </div>

      {working && (
        <div className="text-[10px] text-purple-400 uppercase tracking-widest flex items-center gap-2 justify-center py-4 animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...
        </div>
      )}

      {suggestion && !working && (
        <div className="bg-bg border border-purple-500/30 p-3 relative mt-2 animate-fade-in">
           <button onClick={() => setSuggestion(null)} className="absolute top-1 right-2 text-muted hover:text-content text-xs">&times;</button>
           <p className="text-[9px] uppercase tracking-widest text-purple-400 mb-2 font-bold">{suggestion.message || 'AI Review Result'}</p>
           
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
             <p className="text-xs text-muted leading-relaxed italic border-l-2 border-purple-500/50 pl-2 py-1">{suggestion.data}</p>
           )}

           {suggestion.type === 'seo' && (
             <div className="space-y-2">
               <p className="text-[10px]"><strong className="text-purple-300">Title:</strong> {suggestion.data.title}</p>
               <p className="text-[10px] text-muted leading-relaxed"><strong className="text-purple-300">Desc:</strong> {suggestion.data.description}</p>
             </div>
           )}

           {suggestion.type === 'price' && (
             <div className="space-y-2">
               <p className="text-[10px]"><strong className="text-purple-300">Range:</strong> ₹{suggestion.data.min.toLocaleString('en-IN')} – ₹{suggestion.data.max.toLocaleString('en-IN')}</p>
               <p className="text-[10px] text-muted italic border-l-2 border-purple-500/50 pl-2 py-1">{suggestion.data.reason}</p>
             </div>
           )}

           {['description', 'seo', 'price'].includes(suggestion.type) && (
             <button onClick={applySuggestion} className="w-full mt-3 bg-purple-500 text-bg py-2 text-[9px] uppercase tracking-widest font-bold hover:bg-purple-400 transition-colors">
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

  useEffect(() => {
    if (originalSubSeries && !activeSubSeries) {
      setActiveSubSeries(JSON.parse(JSON.stringify(originalSubSeries)));
    }
  }, [originalSubSeries]);

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

  return (
    <div className="pb-24 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-toast bg-[#111111] border border-green-500/30 px-6 py-4 flex items-center gap-3 shadow-2xl animate-fade-in text-green-400 font-bold uppercase tracking-widest text-[10px]">
          <CheckCircle2 size={16} /> Product Saved ✓
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-sticky-section bg-bg border-b border-[#c5a059]/10 pt-4 pb-4 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Link
              to={`/admin/products/${series.slug}`}
              className="text-muted hover:text-[#c5a059] flex items-center gap-1 text-[10px] uppercase tracking-widest transition-colors mb-4 w-max"
            >
              <ArrowLeft size={12} /> Back to {series.name}
            </Link>
            <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-muted mb-2">
              <Link to="/admin/products" className="hover:text-content">
                Products
              </Link>
              <ChevronRight size={10} />
              <Link
                to={`/admin/products/${series.slug}`}
                className="hover:text-content"
              >
                {series.name}
              </Link>
              <ChevronRight size={10} />
              <span className="text-[#c5a059]">{activeSubSeries.name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content flex items-center gap-4">
              Editing: {series.name} — {activeSubSeries.name}
              {hasUnsavedChanges && (
                <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded-sm flex items-center gap-1">
                  <AlertCircle size={12} /> Unsaved Changes
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to={`/products/${series.slug}`} 
              target="_blank"
              className="text-[10px] tracking-widest uppercase font-bold text-[#c5a059] hover:text-white transition-colors border border-[#c5a059] px-4 py-3 bg-[#c5a059]/5 hover:bg-[#c5a059]/20"
            >
               Preview Page
            </Link>
            <GoldButton
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              variant="solid"
              className="px-8 py-3 text-[10px]"
            >
              {saving ? "Saving..." : "Save Product"}
            </GoldButton>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4 sticky top-[140px]">
          <div className="bg-surface border border-[#c5a059]/10 p-2 flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-left px-4 py-3 text-[10px] tracking-widest uppercase transition-colors ${activeTab === tab.id ? "bg-[#c5a059]/10 text-[#c5a059] font-bold border-l-2 border-[#c5a059]" : "text-muted hover:text-content hover:bg-[#c5a059]/5"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-surface border border-[#c5a059]/10 p-4">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-content">Completion</h3>
                <span className={`text-[10px] font-mono tracking-wider ${completionScore === 100 ? 'text-green-500' : 'text-amber-500'}`}>{completionScore}%</span>
             </div>
             <div className="w-full bg-bg h-1 mb-4">
                <div className={`h-full ${completionScore === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${completionScore}%` }}></div>
             </div>
             
             {missingFields.length > 0 && (
               <>
                 <p className="text-[9px] uppercase tracking-widest text-red-400 font-bold mb-2">Missing Fields:</p>
                 <ul className="space-y-1">
                   {missingFields.map((field) => (
                     <li key={field} className="text-[10px] text-muted flex items-start gap-1">
                       <span className="text-red-500">&bull;</span> {field}
                     </li>
                   ))}
                 </ul>
               </>
             )}
             {missingFields.length === 0 && (
               <p className="text-[10px] text-green-500 uppercase tracking-widest text-center mt-2">Ready to publish</p>
             )}
          </div>
          
          <AiAssistantPanel series={series} subSeries={activeSubSeries} updateSubSeries={updateSubSeries} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-surface border border-[#c5a059]/10 p-6 md:p-8 shadow-sm">
          {activeTab === "details" && (
            <AdminDetailsTab
              series={series}
              subSeries={activeSubSeries}
              updateSubSeries={updateSubSeries}
            />
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
            <AdminPricingTab
              series={series}
              subSeries={activeSubSeries}
              updateSubSeries={updateSubSeries}
            />
          )}
          {activeTab === "seo" && (
            <AdminSeoTab
              series={series}
              subSeries={activeSubSeries}
              updateSubSeries={updateSubSeries}
            />
          )}
        </div>
      </div>
    </div>
  );
}
