// @ts-nocheck
import React from "react";
import {
  
  ProductSubSeries,
} from "../../../features/products/types";

interface Props {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (subSeries: ProductSubSeries) => void;
}

export function AdminPricingTab({ subSeries, updateSubSeries }: Props) {
  const updateField = (field: keyof ProductSubSeries, value: any) => {
    updateSubSeries({ ...subSeries, [field]: value });
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      <div className="border-b border-line pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest uppercase text-content">
          Pricing & Delivery
        </h2>
        <p className="text-sm text-muted">
          Configure base price, comparison price, and fulfillment details.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h5 className="text-[10px] text-muted uppercase tracking-widest block border-b border-line pb-2 mb-4 font-bold">
            Pricing Configuration
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                Base Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={subSeries.basePrice || 0}
                onChange={(e) =>
                  updateField("basePrice", Number(e.target.value))
                }
                className="w-full bg-bg border border-line text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                Compare At Price (₹)
              </label>
              <input
                type="number"
                value={subSeries.compareAtPrice || ""}
                onChange={(e) =>
                  updateField(
                    "compareAtPrice",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full bg-bg border border-line text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none font-mono"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted mt-4 leading-relaxed bg-[#c5a059]/5 p-3 border-l-2 border-[#c5a059]">
            The <strong>Base Price</strong> is the starting price, excluding any
            customization options. If a <strong>Compare At Price</strong> is set
            and is higher than the base price, a strike-through discount will be
            displayed to customers automatically.
          </p>
        </div>

        <div>
          <h5 className="text-[10px] text-muted uppercase tracking-widest block border-b border-line pb-2 mb-4 font-bold mt-8">
            Fulfillment & Promises
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                Est. Delivery (Days)
              </label>
              <input
                type="number"
                value={subSeries.estimatedDeliveryDays || ""}
                onChange={(e) =>
                  updateField("estimatedDeliveryDays", Number(e.target.value))
                }
                className="w-full bg-bg border border-line text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none"
                placeholder="e.g. 14"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest mb-2 block">
                Warranty (Months)
              </label>
              <input
                type="number"
                value={subSeries.warrantyMonths || ""}
                onChange={(e) =>
                  updateField("warrantyMonths", Number(e.target.value))
                }
                className="w-full bg-bg border border-line text-sm text-content p-3 focus:outline-none focus:border-[#c5a059] transition-colors rounded-none"
                placeholder="e.g. 12"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
