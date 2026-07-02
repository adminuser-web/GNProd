// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Edit2, Trash2, Plus, ArrowLeft, Upload, X, Copy } from 'lucide-react';
import { RevealSection } from '../../Reveal';
import { GoldButton } from '../../GoldButton';
import { useProducts } from '../../../context/ProductsContext';
import { productService } from '../../../features/products/services/productService';
import { ProductSubSeries, ProductSeries } from '../../../features/products/types';
import { Product } from '../../../types';
import { uploadToStorage } from '../../../lib/storage';
import { toast } from 'sonner';

import { ImageUpload } from '../ImageUpload';
import { UploadSpecKey } from '../../../config/uploadSpecs';
import { AdminAttributesTab } from './AdminAttributesTab';
import { getAttributes, applySeriesDefaults, deriveAttributes } from '../../../features/products/attributes';
import { buildDuplicateSubSeries } from '../../../features/products/duplicate';

export function AdminSeriesDetailPage() {
  const { seriesSlug } = useParams<{ seriesSlug: string }>();
  const navigate = useNavigate();
  const { products, refresh, loading } = useProducts();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'attributes'>('products');

  // New product modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number | ''>('');
  const [newProductImage, setNewProductImage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');

  const series = products.find(p => p.slug === seriesSlug);
  const [formData, setFormData] = useState<Product | null>(null);

  useEffect(() => {
    if (series) {
      setFormData(series);
      document.title = `${series.name} Series — Admin`;
    }
  }, [series]);

  if (loading || !formData) return (
    <div className="flex justify-center items-center py-24">
      <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const handleSaveSettings = async () => {
    if (!formData) return;
    setSaving(true);
    try {
      await productService.updateProduct(formData.slug, formData);
      await refresh();
      toast.success("Series settings saved.");
    } catch (e: any) {
      toast.error(`Error saving: ${e.message}`);
    }
    setSaving(false);
  };

  const updateField = (field: any, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  let gradeLabel = formData.gradeLabel || formData.willowGrade || formData.grade || formData.tier || 'Grade 1';

  const subSeriesList = formData.subSeries || [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setUploadError('Only image files are allowed.');
    
    const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    setUploadProgress(30);
    setUploadError('');

    (async () => {
      try {
        const downloadURL = await uploadToStorage(`products/${formData.slug}/${fileId}`, file);
        setNewProductImage(downloadURL);
      } catch (error: any) {
        setUploadError(error.message || 'Upload failed');
      } finally {
        setUploadProgress(null);
      }
    })();
  };

  const generateSku = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase();
    const newNum = (subSeriesList.length + 1).toString().padStart(3, '0');
    return `${prefix}-${newNum}`;
  };

  const ensureUniqueSlug = (baseSlug: string) => {
    let newSlug = baseSlug;
    let counter = 2;
    while (subSeriesList.some(s => s.slug === newSlug)) {
      newSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    return newSlug;
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return toast.error("Product name is required.");
    if (newProductPrice === '' || isNaN(newProductPrice) || newProductPrice <= 0) return toast.error("Base price must be a valid number greater than 0.");
    if (!newProductImage.trim()) return toast.error("Primary image is required.");
    
    setSaving(true);
    
    const baseSlug = newProductName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newSlug = ensureUniqueSlug(baseSlug);
    const newId = `${formData.slug}-${newSlug}`;

    const seedSpecs = {
      willowGrade: gradeLabel,
      grains: '',
      weightRange: '2.8-2.10',
      profile: 'Mid',
      edges: '38mm',
      spine: '62mm',
      handle: 'Short Handle',
      sweetSpot: 'Mid',
      finish: 'Natural',
      pressing: 'Standard',
      pickupFeel: 'Light',
      toeProtection: 'Rubber Guard',
      preKnockedIncluded: false
    };

    // Seed the new sub-series from the series template: start with default fixed
    // specs, then gap-fill the full template (active state inherited, since a
    // brand-new sub-series is a draft until published).
    const seededAttributes = applySeriesDefaults(
      deriveAttributes({ specs: seedSpecs }),
      formData.attributes || [],
      { activateAdded: true },
    ).attributes.map((a, i) => ({ ...a, sortOrder: i }));

    const newSub: ProductSubSeries = {
      id: newId,
      slug: newSlug,
      name: newProductName.trim(),
      sku: generateSku(),
      active: false,
      sortOrder: (subSeriesList.length + 1) * 10,
      grade: formData.grade || formData.willowGrade || formData.tier || gradeLabel,
      gradeLabel: gradeLabel,
      basePrice: Number(newProductPrice),
      tagline: '',
      shortDescription: formData.description?.toString() || '',
      longDescription: formData.description?.toString() || '',
      idealFor: [],
      playerLevel: 'Professional',
      playingStyle: 'All-round',
      estimatedDeliveryDays: formData.estimatedDeliveryDays || 14,
      warrantyMonths: formData.warrantyMonths || 12,
      includedAccessories: formData.includedAccessories || ['Bat Cover'],
      attributes: seededAttributes,
      specs: seedSpecs,
      media: {
        primaryImage: newProductImage
      },
      performance: {
        power: 80, pickup: 80, balance: 80, control: 80
      }
    };
    
    const newList = [...subSeriesList, newSub];
    try {
      await productService.updateProduct(formData.slug, { subSeries: newList });
      await refresh();
      setIsAddModalOpen(false);
      navigate(`/admin/products/${formData.slug}/${newSlug}`);
    } catch (err: any) {
      toast.error(`Error creating product: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const canGoLive = (sub: ProductSubSeries) => {
    return !!sub.name && (typeof sub.basePrice === 'number' && sub.basePrice > 0) && !!sub.media?.primaryImage;
  };

  const handleToggleSubSeriesActive = async (sub: ProductSubSeries) => {
    if (!sub.active && !canGoLive(sub)) return; // Protection

    const updatedSub = { ...sub, active: !sub.active };
    const newList = subSeriesList.map(s => s.id === sub.id ? updatedSub : s);
    try {
      await productService.updateProduct(formData.slug, { subSeries: newList });
      await refresh();
      toast.success("Status updated.");
    } catch (e: any) {
      toast.error(`Error changing status: ${e.message}`);
    }
  };

  const handleDuplicateSubSeries = async (sub: ProductSubSeries) => {
    if (!confirm(`Duplicate "${sub.name}"? The copy reuses the same images and starts as a draft you can edit.`)) return;
    const dup = buildDuplicateSubSeries(sub, {
      seriesSlug: formData.slug,
      existingSlugs: subSeriesList.map(s => s.slug),
      existingSkus: subSeriesList.map(s => s.sku).filter(Boolean),
    });
    setSaving(true);
    try {
      await productService.updateProduct(formData.slug, { subSeries: [...subSeriesList, dup] });
      await refresh();
      toast.success(`Duplicated as "${dup.name}" (draft).`);
      navigate(`/admin/products/${formData.slug}/${dup.slug}`);
    } catch (e: any) {
      toast.error(`Error duplicating: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubSeries = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const newList = subSeriesList.filter(s => s.id !== id);
    try {
      await productService.updateProduct(formData.slug, { subSeries: newList });
      await refresh();
      toast.success("Sub-series deleted.");
    } catch (e: any) {
      toast.error(`Error deleting: ${e.message}`);
    }
  };

  return (
    <div className="pb-24 relative">
      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-bg/80 ">
          <div className="bg-surface border border-line rounded-xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-content transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="p-6 border-b border-line block">
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-content">
                Add a product to {formData.name}
              </h2>
            </div>
            
            <form onSubmit={handleCreateProductSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Product Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                  className="w-full bg-bg border border-line rounded-sm p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors"
                  placeholder={`e.g. ${formData.name} Pro`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Base Price (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newProductPrice}
                  onChange={e => setNewProductPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-bg border border-line rounded-sm p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors"
                  placeholder="e.g. 19999"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Primary Image <span className="text-red-500">*</span></label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    required
                    value={newProductImage} 
                    onChange={e => setNewProductImage(e.target.value)} 
                    className="flex-1 bg-bg border border-line rounded-sm p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors" 
                    placeholder="https://..."
                  />
                  <label className="shrink-0 h-[46px] px-4 text-[#c5a059] hover:text-content hover:bg-[#c5a059]/10 cursor-pointer border border-line flex items-center justify-center bg-bg relative transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    {uploadProgress !== null ? <span className="text-[10px] tracking-widest uppercase">{Math.round(uploadProgress)}%</span> : <Upload size={16} />}
                  </label>
                </div>
                {uploadError && <p className="text-red-500 text-[10px] mt-1">{uploadError}</p>}
                {newProductImage && (
                  <div className="mt-3 w-16 h-16 bg-bg border border-line p-1 flex items-center justify-center">
                    <img src={newProductImage} alt="Preview" className="h-full object-contain" />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Willow Grade (Inherited)</label>
                <div className="w-full bg-bg/50 border border-transparent p-3 text-sm text-muted cursor-not-allowed">
                  {gradeLabel}
                </div>
              </div>

              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 text-[10px] uppercase tracking-widest text-muted hover:text-content transition-colors font-bold border border-transparent"
                >
                  Cancel
                </button>
                <GoldButton type="submit" disabled={saving || uploadProgress !== null} className="px-8 py-3 text-[10px]">
                  {saving ? 'Creating...' : 'Create & Edit'}
                </GoldButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-sticky-section bg-bg flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-5 border-b border-line pt-2 pb-3">
         <div className="min-w-0">
            <nav className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-muted mb-1.5">
               <Link to="/admin/products" className="hover:text-content flex items-center gap-1 transition-colors"><ArrowLeft size={11} /> Products</Link>
               <ChevronRight size={10} />
               <span className="text-content">{formData.name}</span>
            </nav>
            <h1 className="text-lg md:text-xl font-bold tracking-wide text-content">
               {formData.name} <span className="text-sm text-muted font-normal">· {gradeLabel}</span>
            </h1>
         </div>
         <div className="flex items-center gap-2 shrink-0 flex-wrap">
             <Link
               to={`/collection/${formData.slug}`}
               target="_blank"
               className="text-[10px] tracking-widest uppercase font-bold text-muted hover:text-[#c5a059] border border-line hover:border-[#c5a059]/50 px-4 py-2 rounded-sm transition-colors"
             >
               Preview
             </Link>
             <GoldButton onClick={handleSaveSettings} disabled={saving} variant="solid" className="px-5 py-2 text-[10px]">
                {saving ? 'Saving…' : 'Save Series'}
             </GoldButton>
         </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line mb-5 flex gap-1 overflow-x-auto hide-scrollbar">
        {[
          { id: 'products', label: `Products (${subSeriesList.length})` },
          { id: 'settings', label: 'Settings' },
          { id: 'attributes', label: 'Default Attributes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative px-3.5 pb-2.5 pt-1 text-[10px] tracking-widest uppercase font-bold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#c5a059]' : 'text-muted hover:text-content'}`}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a059]" aria-hidden />}
          </button>
        ))}
      </div>

      {/* PRODUCTS */}
      {activeTab === 'products' && (
        <div className="rounded-xl border border-line overflow-hidden">
          <div className="px-4 py-2.5 bg-bg border-b border-line flex justify-between items-center">
             <h2 className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted">Products ({subSeriesList.length})</h2>
             {formData.slug !== 'immortal' && (
               <button
                 onClick={() => {
                   setNewProductName('');
                   setNewProductPrice('');
                   setNewProductImage('');
                   setIsAddModalOpen(true);
                 }}
                 className="text-[10px] text-[#c5a059] uppercase tracking-widest hover:text-content flex items-center gap-1 font-bold transition-colors"
               >
                  <Plus size={13} /> Add Product
               </button>
             )}
          </div>
          <div className="divide-y divide-line">
            {subSeriesList.map(sub => {
              const resolvableForLive = canGoLive(sub);
              return (
              <div key={sub.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-4 hover:bg-[#c5a059]/[0.04] transition-colors group">
                 {/* Thumbnail */}
                 <div className="w-12 h-12 shrink-0 bg-bg flex items-center justify-center p-1.5 border border-line rounded-sm self-start md:self-auto">
                    <img src={sub.media?.primaryImage || formData.imageUrl || '/product-bat.webp'} alt={sub.name} className="h-full object-contain" />
                 </div>
                 {/* Info */}
                 <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold tracking-wider text-content truncate uppercase">{sub.name || 'UNNAMED PRODUCT'}</h4>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[10px] tracking-widest uppercase text-muted font-mono">{sub.sku || 'NO-SKU'}</span>
                       <span className="text-[10px] text-muted">&bull;</span>
                       <span className="text-[10px] font-mono tracking-wider text-content/80">₹{sub.basePrice?.toLocaleString('en-IN') || 0}</span>
                    </div>
                 </div>
                 {/* Actions & Status */}
                 <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleSubSeriesActive(sub)}
                          disabled={!sub.active && !resolvableForLive}
                          className={`text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-sm transition-all focus:outline-none
                            ${sub.active
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : resolvableForLive
                                ? 'bg-red-500/10 text-red-400 hover:bg-green-500/10 hover:text-green-400'
                                : 'bg-bg/50 text-muted/50 cursor-not-allowed border border-line'}`}
                        >
                           {sub.active ? 'Live' : 'Draft'}
                        </button>
                        <Link
                           to={`/admin/products/${formData.slug}/${sub.slug || sub.id}`}
                           className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/10 border border-line transition-colors"
                        >
                           <Edit2 size={14} />
                        </Link>
                        <button
                           onClick={() => handleDuplicateSubSeries(sub)}
                           disabled={saving}
                           title="Duplicate (reuses images, starts as draft)"
                           className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/10 border border-line transition-colors disabled:opacity-40"
                        >
                           <Copy size={14} />
                        </button>
                        <button
                           onClick={() => handleDeleteSubSeries(sub.id, sub.name)}
                           className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 border border-line transition-colors"
                        >
                           <Trash2 size={14} />
                        </button>
                    </div>
                    {/* Go-Live Checklist */}
                    {!sub.active && !resolvableForLive && (
                       <div className="bg-bg/50 border border-red-500/10 p-2 text-[9px] mt-2 rounded-sm w-full md:w-auto md:min-w-[140px]">
                          <p className="text-red-400/80 uppercase tracking-widest font-bold mb-1.5">To Publish:</p>
                          <ul className="text-muted/70 space-y-1 pl-1">
                             <li className={`flex gap-1.5 items-center ${sub.name ? 'line-through opacity-40 text-content' : ''}`}>
                               <div className={`w-1 h-1 rounded-full ${sub.name ? 'bg-[#c5a059]' : 'bg-red-500/50'}`}></div> Name
                             </li>
                             <li className={`flex gap-1.5 items-center ${(typeof sub.basePrice === 'number' && sub.basePrice > 0) ? 'line-through opacity-40 text-content' : ''}`}>
                               <div className={`w-1 h-1 rounded-full ${(typeof sub.basePrice === 'number' && sub.basePrice > 0) ? 'bg-[#c5a059]' : 'bg-red-500/50'}`}></div> Price
                             </li>
                             <li className={`flex gap-1.5 items-center ${sub.media?.primaryImage ? 'line-through opacity-40 text-content' : ''}`}>
                               <div className={`w-1 h-1 rounded-full ${sub.media?.primaryImage ? 'bg-[#c5a059]' : 'bg-red-500/50'}`}></div> Image
                             </li>
                          </ul>
                       </div>
                    )}
                 </div>
              </div>
            )})}
            {subSeriesList.length === 0 && (
               <div className="p-12 text-center text-muted tracking-widest text-[10px] uppercase">
                 No products found in this series.
               </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
             <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Series Tagline</label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={e => updateField('tagline', e.target.value)}
                className="w-full bg-bg border border-line rounded-sm p-3 text-xs text-content focus:border-[#c5a059] focus:outline-none transition-colors"
                placeholder="e.g. Built for the Grind"
              />
             </div>

             <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Sort Order</label>
              <input
                type="number"
                value={formData.sortOrder || 0}
                onChange={e => updateField('sortOrder', parseInt(e.target.value))}
                className="w-full bg-bg border border-line rounded-sm p-3 text-xs text-content focus:border-[#c5a059] focus:outline-none transition-colors"
              />
             </div>

             <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Description</label>
              <textarea
                value={typeof formData.description === 'string' ? formData.description : formData.description?.join('\n') || ''}
                onChange={e => updateField('description', e.target.value)}
                rows={4}
                className="w-full bg-bg border border-line rounded-sm p-3 text-xs text-content focus:border-[#c5a059] focus:outline-none transition-colors"
              />
             </div>

             <div className="pt-4 border-t border-line">
                <h3 className="text-[10px] uppercase tracking-widest text-muted mb-4 font-bold">SEO Defaults</h3>
                <div className="space-y-4">
                   <div>
                      <label className="block text-[9px] uppercase tracking-widest text-muted/70 mb-1">SEO Title</label>
                      <input
                        type="text"
                        value={formData.seoTitle || ''}
                        onChange={e => updateField('seoTitle', e.target.value)}
                        className="w-full bg-bg border border-line rounded-sm p-2 text-xs text-content focus:border-[#c5a059] focus:outline-none transition-colors"
                      />
                   </div>
                   <div>
                      <label className="block text-[9px] uppercase tracking-widest text-muted/70 mb-1">SEO Description</label>
                      <textarea
                        value={formData.seoDescription || ''}
                        onChange={e => updateField('seoDescription', e.target.value)}
                        rows={3}
                        className="w-full bg-bg border border-line rounded-sm p-2 text-xs text-content focus:border-[#c5a059] focus:outline-none transition-colors"
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-5">
             <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Primary Image URL / Thumbnail</label>
              <ImageUpload
                 specKey="seriesTile"
                 value={formData.imageUrl || ''}
                 onChange={(url) => updateField('imageUrl', url)}
                 storagePath={`products/${formData.slug}`}
              />
             </div>

             <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Hero Image (Series Banner)</label>
              <ImageUpload
                 specKey="heroImage"
                 value={formData.heroImage || ''}
                 onChange={(url) => updateField('heroImage', url)}
                 storagePath={`products/${formData.slug}`}
              />
             </div>
          </div>
        </div>
      )}

      {/* DEFAULT ATTRIBUTES (series template) */}
      {activeTab === 'attributes' && (
        <div>
          <p className="text-xs text-muted mb-5 max-w-2xl">
            The standard attribute set for {formData.name}. New products are seeded from this template;
            existing products can pull in any missing ones via <span className="text-[#c5a059]">Apply Series Defaults</span> on their editor (added inactive, never overwriting).
          </p>
          <AdminAttributesTab
            attributes={getAttributes(formData)}
            onChange={(attrs) => updateField('attributes', attrs)}
            storagePath={`products/${formData.slug}/template/swatches`}
          />
        </div>
      )}
    </div>
  );
}
