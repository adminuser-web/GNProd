// @ts-nocheck
import React, { useState } from "react";
import {
  
  ProductSubSeries,
} from "../../../features/products/types";
import { Upload, Trash2, Plus, GripVertical } from "lucide-react";
import { uploadToStorage } from "../../../lib/storage";
import { ImageUpload } from "../ImageUpload";

interface Props {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (subSeries: ProductSubSeries) => void;
}

export function AdminMediaTab({ series, subSeries, updateSubSeries }: Props) {
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
    if (!file.type.startsWith("image/"))
      return setUploadError("Only image files are allowed.");

    const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    setUploadProgress((prev) => ({ ...prev, [progressKey]: 30 }));
    setUploadError("");

    (async () => {
      try {
        const downloadURL = await uploadToStorage(
          `products/${series.slug}/${subSeries.slug}/${fileId}`,
          file,
        );
        setter(downloadURL);
      } catch (error: any) {
        setUploadError(error.message || "Upload failed");
      } finally {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[progressKey];
          return next;
        });
      }
    })();
  };

  const updateMedia = (field: string, value: any) => {
    updateSubSeries({
      ...subSeries,
      media: { ...subSeries.media, [field]: value },
    });
  };

  const gallery = subSeries.media?.galleryImages || [];

  const moveImage = (index: number, direction: "up" | "down") => {
    const minIndex = 0;
    const maxIndex = gallery.length - 1;
    if (direction === "up" && index === minIndex) return;
    if (direction === "down" && index === maxIndex) return;

    const newG = [...gallery];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newG[index], newG[swapIndex]] = [newG[swapIndex], newG[index]];
    updateMedia("galleryImages", newG);
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      <div className="border-b border-[#c5a059]/10 pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest uppercase text-content">
          Media Gallery
        </h2>
        <p className="text-sm text-muted">Upload and manage visual assets.</p>
        {uploadError && (
          <p className="text-red-500 text-xs mt-2 uppercase tracking-widest">
            {uploadError}
          </p>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
            Primary Image <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted mb-4">
            This is the main image used throughout the store. It is required for
            the product to go live.
          </p>
          <ImageUpload
            specKey="productPrimary"
            value={subSeries.media?.primaryImage || ""}
            onChange={(url) => updateMedia("primaryImage", url)}
            storagePath={`products/${series.slug}/${subSeries.slug}`}
          />
        </div>

        <div className="pt-8 border-t border-[#c5a059]/10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                Gallery Images
              </label>
              <p className="text-xs text-muted">
                Additional images for the product carousel.
              </p>
            </div>
            
            {/* Using ImageUpload slightly differently here as a button to append to array.
                We'll hide the preview and just use the button style. */}
            <div className="w-64">
              <ImageUpload
                specKey="productGallery"
                value=""
                onChange={(url) => updateMedia("galleryImages", [...gallery, url])}
                storagePath={`products/${series.slug}/${subSeries.slug}`}
              />
            </div>
          </div>

          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gallery.map((img, idx) => (
                <div
                  key={idx}
                  className="bg-bg border border-[#c5a059]/20 relative group aspect-square flex flex-col"
                >
                  <div className="flex-1 p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={img}
                      alt={`Gallery ${idx}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="absolute inset-0 bg-[#111111]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => moveImage(idx, "up")}
                      disabled={idx === 0}
                      className="w-8 h-8 rounded-full bg-surface border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] hover:bg-[#c5a059] hover:text-bg disabled:opacity-30 transition-all font-bold text-lg"
                    >
                      &larr;
                    </button>
                    <button
                      onClick={() => {
                        const newG = [...gallery];
                        newG.splice(idx, 1);
                        updateMedia("galleryImages", newG);
                      }}
                      className="w-8 h-8 rounded-full bg-red-900/40 border border-red-500/50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => moveImage(idx, "down")}
                      disabled={idx === gallery.length - 1}
                      className="w-8 h-8 rounded-full bg-surface border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] hover:bg-[#c5a059] hover:text-bg disabled:opacity-30 transition-all font-bold text-lg"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-32 border-2 border-dashed border-[#c5a059]/10 flex items-center justify-center">
              <span className="text-[10px] uppercase tracking-widest text-muted">
                No gallery images uploaded
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
