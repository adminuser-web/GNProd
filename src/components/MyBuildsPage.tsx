// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSavedBuilds } from '../features/builds/hooks/useSavedBuilds';
import { buildService } from '../features/builds/services/buildService';
import { RevealSection } from './Reveal';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink, AlertTriangle, Hammer, ShoppingBag } from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useOrder } from '../context/OrderContext';
import { SavedBuild } from '../features/builds/types';
import { usePricingConfig } from '../features/products/hooks/usePricingConfig';
import { computePrice } from '../lib/pricing';
import { Skeleton, SkeletonTextLines } from './Skeleton';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner';
import { EnquiryDrawer } from './EnquiryDrawer';
import { LazyImage } from './LazyImage';

export function MyBuildsPage() {
  const { user, loading: authLoading } = useAuth();
  const { builds, loading, error, setBuilds } = useSavedBuilds(user?.uid || undefined);
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addToOrder, openDrawer } = useOrder();
  const { rules: globalRules, codes: globalCodes } = usePricingConfig();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enquiryBuildId, setEnquiryBuildId] = useState<string | null>(null);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center md:text-left">
            <Skeleton variant="text" className="h-3 w-24 mb-3 mx-auto md:mx-0" />
            <Skeleton variant="text" className="h-8 w-64 mx-auto md:mx-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-surface border border-[#c5a059]/10 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <Skeleton variant="text" className="h-5 w-40 mb-2" />
                    <Skeleton variant="text" className="h-3 w-32" />
                  </div>
                  <Skeleton variant="circular" className="h-8 w-8" />
                </div>
                <div className="flex gap-4 mb-6">
                  <Skeleton variant="rectangular" className="h-28 w-20" />
                  <SkeletonTextLines lines={4} className="flex-1" />
                </div>
                <Skeleton variant="text" className="h-8 w-32 mb-6" />
                <Skeleton variant="rectangular" className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-bg text-content px-4 text-center">
        <h2 className="text-xl font-bold tracking-[0.2em] uppercase mb-4">Please Login</h2>
        <p className="text-muted text-sm uppercase tracking-widest mb-8">You need to be logged in to view your saved builds.</p>
        <button onClick={() => navigate('/login')} className="px-8 py-3 text-xs font-bold uppercase tracking-widest bg-[#c5a059] text-bg hover:bg-[#d4af37] transition-colors">
          Login
        </button>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this saved build?")) return;
    setDeletingId(id);
    try {
      await buildService.deleteBuild(id);
      setBuilds(builds.filter(b => b.id !== id));
      toast.success("Build deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete build');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadBuild = (build: SavedBuild) => {
     let encoded = "";
     if (Array.isArray(build.selections)) {
       const payload = build.selections.map((opt: any) => ({
         g: opt.groupId,
         o: opt.optionId,
         v: opt.valueText
       }));
       encoded = btoa(JSON.stringify({ s: payload, q: 1 }));
     } else {
       encoded = btoa(JSON.stringify(build.selections));
     }
     navigate(`/collection/${build.seriesSlug}/${build.subSeriesSlug || build.seriesSlug}?build=${encoded}`);
  };

  const handleAddToCart = (build: SavedBuild, mergedProduct: any, price: number) => {
     if (!Array.isArray(build.selections)) {
        toast.error("Build must be loaded first to convert format.");
        return handleLoadBuild(build);
     }
     
     addToOrder({
        product: mergedProduct,
        selections: build.selections, // Already OrderItemSelection[] format now
        quantity: 1,
        unitPrice: price
     });
     toast.success("Added to cart!");
     openDrawer();
  };

  const handleShare = (build: SavedBuild) => {
    let encoded = "";
    if (Array.isArray(build.selections)) {
       const payload = build.selections.map((opt: any) => ({
         g: opt.groupId,
         o: opt.optionId,
         v: opt.valueText
       }));
       encoded = btoa(JSON.stringify({ s: payload, q: 1 }));
    } else {
       encoded = btoa(JSON.stringify(build.selections));
    }
    const url = `${window.location.origin}/collection/${build.seriesSlug}/${build.subSeriesSlug || build.seriesSlug}?build=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Build link copied to clipboard");
    }).catch((err) => {
      toast.error("Failed to copy link. Clipboard access might be restricted.");
      console.error(err);
    });
  };

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
            <div className="mb-12 text-center md:text-left">
              <p className="text-[11px] tracking-[0.4em] uppercase text-premium-gold-text mb-3 block">My Garage</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content">My Saved Builds</h1>
            </div>
        </RevealSection>

        {error ? (
           <EmptyState 
             icon={<AlertTriangle size={32} />}
             title="Loading Error"
             description={error}
             actionText="Retry"
             onAction={() => window.location.reload()}
           />
        ) : builds.length === 0 ? (
           <EmptyState 
             icon={<Hammer size={32} />}
             title="No saved builds yet."
             description="Configure a bat or use the AI Bat Consultant to create your first build."
             actionText="Try AI Bat Consultant"
             actionLink="/bat-consultant"
           />
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {builds.map((build, idx) => {
                 const date = build.createdAt?.toDate ? build.createdAt.toDate() : new Date(build.createdAt);
                 const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                 
                 // Get product image from context
                 const series = products.find((p: any) => p.slug === build.seriesSlug);
                 const subSeries = series?.subSeries?.find(s => s.slug === build.subSeriesSlug || s.id === build.subSeriesSlug);
                 const imgUrl = subSeries?.media?.primaryImage || series?.imageUrl || '';
                 
                 const isActive = series?.active !== false && subSeries?.active !== false;
                 
                 // Calculate true current price if available
                 let currentTotal = 0;
                 let mergedProduct: any = null;
                 if (series) {
                    const baseProduct = series;
                    mergedProduct = subSeries ? {
                       ...baseProduct,
                       price: subSeries.basePrice || baseProduct.price,
                       basePrice: subSeries.basePrice || baseProduct.basePrice,
                       customizationGroups: subSeries.customizationGroups || baseProduct.customizationGroups,
                    } : baseProduct;
                    const selMap: Record<string, string> = {};
                    if (Array.isArray(build.selections)) {
                       build.selections.forEach((opt: any) => {
                         selMap[opt.groupId] = opt.type === 'text' && opt.valueText ? opt.valueText : (opt.optionId || opt.valueText);
                       });
                    } else {
                       Object.entries(build.selections || {}).forEach(([k, v]) => {
                          if (k !== '_qty') selMap[k] = (v as any)?.id || (v as string);
                       });
                    }
                    const pricingResult = computePrice(mergedProduct as any, selMap, { rules: globalRules, availableCodes: globalCodes });
                    currentTotal = pricingResult.total;
                 }
                 
                 const savedPrice = build.priceSnapshot || (build as any).estimatedPrice;
                 const hasPriceChanged = currentTotal > 0 && Math.abs(currentTotal - savedPrice) > 5;

                 return (
                    <RevealSection key={build.id} delay={100 + (idx * 50)}>
                       <div className="bg-surface border border-[#c5a059]/20 p-6 flex flex-col h-full hover:border-[#c5a059]/40 transition-colors relative">
                          {!isActive && (
                             <div className="absolute top-0 right-0 bg-red-900/50 text-red-100 text-[10px] px-3 py-1 font-bold tracking-widest uppercase flex items-center gap-2">
                               <AlertTriangle className="w-3 h-3" />
                               Currently Unavailable
                             </div>
                          )}
                          <div className="flex justify-between items-start mb-4 mt-2">
                             <div>
                                <h3 className="text-lg font-bold tracking-widest text-content uppercase">{build.seriesName || (build as any).productName}</h3>
                                {build.subSeriesName && build.subSeriesName !== (build.seriesName || (build as any).productName) && (
                                  <p className="text-[11px] font-bold tracking-widest text-premium-gold-text mb-1 uppercase">{build.subSeriesName}</p>
                                )}
                                <p className="text-[10px] uppercase tracking-widest text-muted mt-1">Saved on {dateStr}</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleDelete(build.id!)} disabled={deletingId === build.id} className="text-muted hover:text-red-500 transition-colors p-3 focus:outline-none" title="Delete Build">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>

                          <div className="flex gap-4 mb-4 flex-1">
                             {imgUrl && (
                                <div className="w-20 h-28 shrink-0 bg-white/5">
                                   <LazyImage src={imgUrl} alt={build.seriesName || (build as any).productName} className="w-full h-full object-cover mix-blend-screen" />
                                </div>
                             )}
                             <div className="flex-1 w-full bg-bg p-3 border border-[#c5a059]/10 text-xs text-muted custom-scrollbar overflow-y-auto max-h-32">
                                <ul className="space-y-1">
                                    {Array.isArray(build.selections) ? build.selections.map((opt: any) => {
                                       return (
                                          <li key={opt.groupId} className="flex gap-2 text-[11px] mb-1">
                                             <span className="tracking-widest text-[#c5a059] font-bold uppercase">{opt.groupLabel || opt.groupId}:</span>
                                             <span className="uppercase tracking-wide text-content">
                                                {opt.groupId === 'engraving' || opt.type === 'text' ? (opt.valueText ? `"${opt.valueText}"` : 'None') : opt.optionLabel}
                                             </span>
                                          </li>
                                       );
                                    }) : Object.entries(build.selections || {}).map(([key, val]) => {
                                      if (key === '_qty') return null;
                                      if (key === 'engraving') return <li key={key}><span className="uppercase tracking-widest text-content font-bold">Engraving:</span> <span className="italic">{val as string}</span></li>;
                                      return (
                                         <li key={key}>
                                            <span className="uppercase tracking-widest text-content font-bold">{key.replace('-', ' ')}:</span> {typeof val === 'string' ? val : (val as any).name || 'Selected'}
                                         </li>
                                      )
                                   })}
                                </ul>
                             </div>
                          </div>
                          
                          <div className="flex justify-between items-end mb-6">
                            <div>
                               <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Estimated Price</p>
                               <div className="flex items-center gap-3">
                                 {hasPriceChanged ? (
                                    <>
                                       <div className="flex flex-col">
                                          <p className="text-xl text-[#c5a059] font-bold">₹{currentTotal?.toLocaleString('en-IN')}</p>
                                          <span className="text-[9px] text-[#c5a059] uppercase tracking-widest animate-pulse">Price Changed</span>
                                       </div>
                                       <div className="flex flex-col items-center justify-center pt-1">
                                          <p className="text-xs text-muted line-through" title="Saved Price">₹{savedPrice?.toLocaleString('en-IN')}</p>
                                       </div>
                                    </>
                                 ) : (
                                    <p className="text-xl text-[#c5a059] font-bold">₹{savedPrice?.toLocaleString('en-IN')}</p>
                                 )}
                               </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                             <div className="flex gap-3">
                                <button onClick={() => {
                                  if (!isActive || !mergedProduct) return toast.error('This product is no longer available.');
                                  handleAddToCart(build, mergedProduct, currentTotal || savedPrice);
                                }} className="flex-1 min-h-[44px] bg-[#c5a059] text-xs font-bold uppercase tracking-widest text-[#2a2a2a] hover:bg-[#d4af37] transition-colors flex justify-center items-center">
                                   Buy Now
                                </button>
                                <button onClick={() => handleLoadBuild(build)} className="flex-1 min-h-[44px] border border-[#c5a059]/40 text-[10px] font-bold uppercase tracking-widest text-content hover:bg-[#c5a059]/10 transition-colors flex justify-center items-center">
                                   Load Build
                                </button>
                             </div>
                             <button onClick={() => handleShare(build)} className="w-full min-h-[44px] border border-line text-[10px] font-bold uppercase tracking-widest text-muted hover:text-content hover:border-[#c5a059]/30 transition-colors flex justify-center items-center gap-2">
                                <ExternalLink className="w-3 h-3" /> Share Build
                             </button>
                             <button onClick={() => setEnquiryBuildId(build.id!)} className="w-full min-h-[44px] text-[10px] uppercase tracking-widest text-premium-gold-text underline hover:text-[#d4af37] transition-colors flex justify-center items-center">
                                Need Help Choosing?
                             </button>
                          </div>
                       </div>
                    </RevealSection>
                 )
              })}
           </div>
        )}
      </div>

      <EnquiryDrawer 
        isOpen={!!enquiryBuildId}
        onClose={() => setEnquiryBuildId(null)}
        source="garage"
        defaultType="product_enquiry"
        productRef={(() => {
          const build = builds.find(b => b.id === enquiryBuildId);
          if (!build) return undefined;
          return {
            seriesId: build.seriesId,
            seriesSlug: build.seriesSlug,
            seriesName: build.seriesName,
            subSeriesId: build.subSeriesId,
            subSeriesSlug: build.subSeriesSlug,
            subSeriesName: build.subSeriesName
          };
        })()}
        description="Share your custom build with our experts to get advice on the configuration or request additional customizations."
      />
    </div>
  );
}
