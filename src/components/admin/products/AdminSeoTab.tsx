// @ts-nocheck
import React from "react";
import {
  
  ProductSubSeries,
} from "../../../features/products/types";

interface AdminSeoTabProps {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (updated: ProductSubSeries) => void;
}

export function AdminSeoTab({ subSeries, updateSubSeries }: AdminSeoTabProps) {
  const handleChange = (field: keyof ProductSubSeries, value: any) => {
    updateSubSeries({ ...subSeries, [field]: value });
  };

  const handleKeywordsChange = (value: string) => {
    const keywords = value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);
    handleChange("seoKeywords", keywords);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-[#c5a059]/10 pb-4 mb-6">
        <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-content">
          SEO Settings
        </h2>
        <p className="text-sm text-muted">
          Search engine optimization for {subSeries.name}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            SEO Title
          </label>
          <input
            type="text"
            value={(subSeries as any).seoTitle || ""}
            onChange={(e) => handleChange("seoTitle", e.target.value)}
            className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            placeholder={`e.g. ${subSeries.name} | Premium English Willow Cricket Bat`}
            maxLength={60}
          />
          <p className="text-[10px] text-muted mt-1 text-right">
            {((subSeries as any).seoTitle || "").length}/60
          </p>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Meta Description
          </label>
          <textarea
            value={(subSeries as any).seoDescription || ""}
            onChange={(e) => handleChange("seoDescription", e.target.value)}
            className="w-full h-24 bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            placeholder="Brief description for search engines..."
            maxLength={160}
          />
          <p className="text-[10px] text-muted mt-1 text-right">
            {((subSeries as any).seoDescription || "").length}/160
          </p>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Focus Keywords
          </label>
          <input
            type="text"
            value={(subSeries.seoKeywords || []).join(", ")}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors rounded-none"
            placeholder="comma, separated, keywords"
          />
          <p className="text-[10px] text-muted mt-1">
            Used for internal search tracking and meta keywords.
          </p>
        </div>
      </div>

      {/* Search Engine Preview */}
      <div className="pt-8 border-t border-[#c5a059]/10">
        <h3 className="text-[10px] uppercase tracking-widest text-muted mb-4 font-bold">
          Search Preview
        </h3>
        <div className="bg-white p-4 rounded-md font-sans max-w-xl">
          <div className="text-[#1a0dab] text-xl truncate hover:underline cursor-pointer">
            {((subSeries as any).seoTitle) || `${subSeries.name} | Blank V`}
          </div>
          <div className="text-[#006621] text-sm truncate">
            https://blankv.com/shop/{subSeries.slug}
          </div>
          <div className="text-[#545454] text-sm mt-1 line-clamp-2">
            {((subSeries as any).seoDescription) ||
              subSeries.shortDescription ||
              "No description provided. Search engines will generate a snippet from page content."}
          </div>
        </div>
      </div>
    </div>
  );
}
