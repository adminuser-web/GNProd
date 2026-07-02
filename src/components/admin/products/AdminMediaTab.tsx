// @ts-nocheck
import React, { useRef, useState } from "react";
import {

  ProductSubSeries,
} from "../../../features/products/types";
import { Upload, Trash2, Plus, Star, ArrowLeft, ArrowRight } from "lucide-react";
import { uploadToStorage } from "../../../lib/storage";
import { ImageUpload } from "../ImageUpload";

interface Props {
  series: Product;
  subSeries: ProductSubSeries;
  updateSubSeries: (subSeries: ProductSubSeries) => void;
}

export function AdminMediaTab({ series, subSeries, updateSubSeries }: Props) {
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const primary = subSeries.media?.primaryImage || "";
  const gallery = subSeries.media?.galleryImages || [];

  const updateMedia = (patch: Record<string, any>) => {
    updateSubSeries({
      ...subSeries,
      media: { ...subSeries.media, ...patch },
    });
  };

  const uploadFile = async (file: File) => {
    const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    return uploadToStorage(`products/${series.slug}/${subSeries.slug}/${fileId}`, file);
  };

  /** Append one or more images to the gallery in a single update. */
  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploadError("");
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadFile(f));
      updateMedia({ galleryImages: [...gallery, ...urls] });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (addInputRef.current) addInputRef.current.value = "";
    }
  };

  const handleReplacePrimary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setUploadError("Only image files are allowed.");
    setUploadError("");
    setReplacing(true);
    try {
      updateMedia({ primaryImage: await uploadFile(file) });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setReplacing(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  /** Promote a gallery tile to primary; the old primary takes its slot. */
  const makePrimary = (idx: number) => {
    const next = [...gallery];
    const chosen = next[idx];
    if (primary) next[idx] = primary;
    else next.splice(idx, 1);
    updateMedia({ primaryImage: chosen, galleryImages: next });
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= gallery.length) return;
    const next = [...gallery];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateMedia({ galleryImages: next });
  };

  const removeImage = (idx: number) => {
    const next = [...gallery];
    next.splice(idx, 1);
    updateMedia({ galleryImages: next });
  };

  const tileBtn =
    "w-7 h-7 rounded-sm flex items-center justify-center bg-bg/90 border border-line text-muted hover:text-[#c5a059] hover:border-[#c5a059]/50 disabled:opacity-30 transition-colors";

  return (
    <div className="animate-fade-in relative pb-10">
      <div className="border-b border-line pb-4 mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-content">Media Gallery</h2>
          <p className="text-xs text-muted mt-1">The primary image appears everywhere in the store; gallery tiles fill the product carousel in this order. Hover a tile for actions.</p>
        </div>
        {uploadError && (
          <p className="text-red-400 text-xs shrink-0">{uploadError}</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 max-w-5xl items-start">
        {/* PRIMARY — large 4:5 hero, gold-marked */}
        <div className="w-full lg:w-80 shrink-0 relative group rounded-xl border border-[#c5a059]/40 bg-bg overflow-hidden aspect-[4/5]">
          {primary ? (
            <>
              <img src={primary} alt="Primary" className="absolute inset-0 w-full h-full object-contain p-4" />
              <span className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest bg-[#c5a059] text-bg px-2 py-0.5 rounded-sm">Primary</span>
              <div className="absolute inset-x-0 bottom-0 p-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => replaceInputRef.current?.click()}
                  disabled={replacing}
                  className="text-[9px] font-bold uppercase tracking-widest bg-bg/90 border border-line px-3 py-1.5 rounded-sm text-content hover:text-[#c5a059] hover:border-[#c5a059]/50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Upload size={11} /> {replacing ? "Uploading…" : "Replace"}
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 p-3 flex items-center justify-center">
              <ImageUpload
                specKey="productPrimary"
                value=""
                onChange={(url) => updateMedia({ primaryImage: url })}
                storagePath={`products/${series.slug}/${subSeries.slug}`}
              />
            </div>
          )}
        </div>

        {/* GALLERY — tiles + add tile in one grid */}
        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {gallery.map((img, idx) => (
            <div key={idx} className="relative group rounded-xl border border-line bg-bg overflow-hidden aspect-square">
              <img src={img} alt={`Gallery ${idx + 1}`} className="absolute inset-0 w-full h-full object-contain p-2" />
              <span className="absolute top-1.5 left-1.5 text-[8px] text-muted bg-bg/80 px-1.5 py-0.5 rounded-sm font-mono">{idx + 2}</span>
              <div className="absolute inset-x-0 bottom-0 p-1.5 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Make primary" onClick={() => makePrimary(idx)} className={tileBtn}><Star size={12} /></button>
                <button title="Move earlier" disabled={idx === 0} onClick={() => moveImage(idx, -1)} className={tileBtn}><ArrowLeft size={12} /></button>
                <button title="Move later" disabled={idx === gallery.length - 1} onClick={() => moveImage(idx, 1)} className={tileBtn}><ArrowRight size={12} /></button>
                <button
                  title="Remove"
                  onClick={() => removeImage(idx)}
                  className="w-7 h-7 rounded-sm flex items-center justify-center bg-bg/90 border border-line text-muted hover:text-red-400 hover:border-red-500/50 transition-colors"
                ><Trash2 size={12} /></button>
              </div>
            </div>
          ))}

          <button
            onClick={() => addInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl border-2 border-dashed border-line hover:border-[#c5a059]/50 aspect-square flex flex-col items-center justify-center gap-2 text-muted hover:text-[#c5a059] transition-colors disabled:opacity-50"
          >
            <Plus size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 text-center">{uploading ? "Uploading…" : "Add images"}</span>
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted mt-4">
        Recommended: JPEG or WebP · 4:5 portrait (800×1000) · max 1MB each. Use <Star size={10} className="inline -mt-0.5" /> on a tile to make it the primary image — the current primary swaps into its place.
      </p>

      <input ref={addInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} />
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplacePrimary} />
    </div>
  );
}
