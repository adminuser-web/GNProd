// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { BRAND } from '../types';
import { RevealSection } from './Reveal';
import { useOrder } from '../context/OrderContext';
import { clsx } from 'clsx';
import { GoldButton } from './GoldButton';
import { LazyImage } from './LazyImage';
import { useProducts } from '../context/ProductsContext';
import { useProductConfigurator } from '../features/products/hooks/useProductConfigurator';
import { Skeleton, SkeletonTextLines } from './Skeleton';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { buildService } from '../features/builds/services/buildService';
import { SPEC_TO_CUSTOMIZATION_MAP, ALWAYS_FIXED_SPECS } from '../config/attributeMap';
import { EnquiryDrawer } from './EnquiryDrawer';
import { HowItWorks } from './HowItWorks';

export function ProductPage() {
  const { seriesSlug, subSeriesSlug, slug } = useParams<{ seriesSlug?: string, subSeriesSlug?: string, slug?: string }>();
  const { user } = useAuth();
  const { getBySlug, products, loading, error } = useProducts();
  const baseProduct = getBySlug(seriesSlug || slug || '');
  
  const [activeSubSeriesId, setActiveSubSeriesId] = useState<string | null>(subSeriesSlug || null);

  useEffect(() => {
    setActiveSubSeriesId(subSeriesSlug || null);
  }, [subSeriesSlug]);

  // If sub-series exist, mergedProduct acts as the configuration base
  const product = useMemo<any>(() => {
    if (!baseProduct) return undefined;
    const list = baseProduct.subSeries || [];
    if (list.length === 0) return baseProduct;
    
    // Fallback to first if not found
    const activeSub = list.find(s => s.slug === activeSubSeriesId || s.id === activeSubSeriesId) || list[0];
    
    // Merge specifics
    return {
      ...baseProduct,
      price: activeSub.basePrice || baseProduct.price,
      basePrice: activeSub.basePrice || baseProduct.basePrice,
      customizationGroups: activeSub.customizationGroups || baseProduct.customizationGroups,
      specs: activeSub.specs || baseProduct.specs,
      imageUrl: activeSub.media?.primaryImage || baseProduct.imageUrl,
      galleryImages: activeSub.media?.galleryImages || baseProduct.galleryImages,
      subSeriesName: activeSub.name,
      subSeriesGradeLabel: activeSub.gradeLabel || activeSub.grade,
      subSeriesGrade: activeSub.grade,
      activeSubSeriesId: activeSub.id,
      activeSubSeriesSlug: activeSub.slug,
      performanceMetrics: activeSub.performance || baseProduct.performanceMetrics,
      sku: activeSub.sku || baseProduct.sku,
      estimatedDeliveryDays: activeSub.estimatedDeliveryDays || baseProduct.estimatedDeliveryDays,
      warrantyMonths: activeSub.warrantyMonths || baseProduct.warrantyMonths,
      includedAccessories: activeSub.includedAccessories || baseProduct.includedAccessories,
      active: activeSub.active !== false && baseProduct.active !== false,
    };
  }, [baseProduct, activeSubSeriesId]);

  const { addToOrder } = useOrder();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Configuration state
  const { 
    selections, 
    toggleSelection: handleSelection, 
    selectedPairs, 
    selectedOptions: configuredSelectedOptions,
    selectedLabels, 
    missingGroups, 
    allRequiredSelected, 
    pricePerItem, 
    pricePerItemWithDiscount 
  } = useProductConfigurator(product);

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const [isMobileSpecsOpen, setIsMobileSpecsOpen] = useState(false);
  const [isSavingBuild, setIsSavingBuild] = useState(false);
  const [isEnquiryDrawerOpen, setIsEnquiryDrawerOpen] = useState(false);
  const [enquiryDrawerType, setEnquiryDrawerType] = useState<any>('product_enquiry');

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — Grainood`;
    }
  }, [product]);

  // Handle ?build= from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const buildParam = params.get('build');
    if (buildParam && product) {
      try {
         const decoded = JSON.parse(atob(buildParam));
         
         if (decoded.q) {
            // New format { s: [...], q: quantity }
            setQuantity(decoded.q);
            decoded.s.forEach((opt: any) => {
               const g = (product.customizationGroups || []).find((x: any) => x.id === opt.g);
               if (g) {
                  const val = opt.v || opt.o;
                  handleSelection(opt.g, val, g.type);
               }
            });
         } else {
            // Old format
            if (decoded._qty) {
               setQuantity(decoded._qty);
               delete decoded._qty;
            }
   
            for (const [groupId, val] of Object.entries(decoded)) {
               const g = (product.customizationGroups || []).find((x: any) => x.id === groupId);
               if (g) {
                  if (g.type === 'text') {
                     handleSelection(groupId, val as string, 'text');
                  } else {
                     const optionId = (val as any)?.id || val;
                     handleSelection(groupId, optionId as string, g.type);
                  }
               }
            }
         }
      } catch (e) {
         console.warn('Failed to parse build configuration from URL', e);
      }
    }
  }, [product?.id]); // Only run when product first loads

  const handleSaveBuild = async () => {
     if (!user) {
        toast.error("Please login to save your build.");
        return;
     }
     if (!product) return;
     
     if (!allRequiredSelected) {
        toast.error("Please complete all required selections before saving.");
        return;
     }

     setIsSavingBuild(true);
     try {
        const consultantRes = new URLSearchParams(window.location.search).get('consultant_input');
        const consultantReason = new URLSearchParams(window.location.search).get('consultant_reason');

        await buildService.saveBuild({
           userId: user.uid,
           seriesId: baseProduct?.id || product.id,
           seriesSlug: seriesSlug || baseProduct?.slug || '',
           seriesName: baseProduct?.name || product.name,
           subSeriesId: activeSubSeriesId || product.id,
           subSeriesSlug: activeSubSeriesId || baseProduct?.slug || '',
           subSeriesName: (product as any).subSeriesName || product.name,
           productSnapshot: product,
           selections: configuredSelectedOptions,
           engravingText: selections['engraving'],
           priceSnapshot: pricePerItemWithDiscount || product.price,
           consultantInput: consultantRes || undefined,
           consultantReason: consultantReason || undefined,
           status: 'Available'
        });
        toast.success("Build saved to your Garage.");
     } catch (err: any) {
        toast.error(`Error saving build: ${err.message}`);
     } finally {
        setIsSavingBuild(false);
     }
  };

  const handleShareBuild = () => {
    try {
      const payload = configuredSelectedOptions.map((opt: any) => ({
        g: opt.groupId,
        o: opt.optionId,
        v: opt.valueText
      }));
      const str = JSON.stringify({ s: payload, q: quantity });
      const encoded = btoa(str);
      const url = new URL(window.location.href);
      url.searchParams.set('build', encoded);
      navigator.clipboard.writeText(url.toString()).then(() => {
        toast.success("Build link copied.");
      }).catch((err) => {
        toast.error("Failed to copy link. Clipboard access might be restricted.");
        console.error(err);
      });
    } catch (err) {
      toast.error("Failed to generate sharing link.");
    }
  };

  // Reset state when product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    setIsAdded(false);
    setIsMobileSummaryOpen(false);
  }, [slug, product]);

  if (loading) {
    return (
      <div className="bg-bg min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/2">
            <Skeleton variant="product" className="w-full" />
          </div>
          <div className="w-full lg:w-1/2 lg:pl-12">
            <Skeleton variant="text" className="h-4 w-32 mb-6" />
            <Skeleton variant="text" className="h-10 w-3/4 mb-4" />
            <Skeleton variant="text" className="h-12 w-48 mb-8" />
            <SkeletonTextLines lines={6} className="mb-8" />
            
            <div className="space-y-6">
              <Skeleton variant="rectangular" className="h-24 w-full" />
              <Skeleton variant="rectangular" className="h-24 w-full" />
              <Skeleton variant="rectangular" className="h-14 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg min-h-screen pt-32 pb-20 px-4 text-center">
        <h2 className="text-2xl font-bold tracking-[0.2em] uppercase text-content mb-4">Error Loading Product</h2>
        <p className="text-muted tracking-widest uppercase text-sm mb-8">Please check your connection and try again.</p>
        <GoldButton as={Link} to="/collection" variant="outline">
          Return to Collection
        </GoldButton>
      </div>
    );
  }

  if (!product || product.active === false) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl font-bold tracking-[0.2em] text-content uppercase mb-6">PRODUCT UNAVAILABLE</h1>
        <p className="text-content/80 mb-10 tracking-widest text-sm uppercase">This product may have been discontinued or is currently offline.</p>
        <GoldButton as={Link} to="/collection" variant="outline">
          RETURN TO COLLECTION
        </GoldButton>
      </div>
    );
  }

  const allImages = [product.imageUrl, ...(product.galleryImages || [])];
  // Remove duplicates just in case
  const uniqueImages = allImages.filter((img, index) => allImages.indexOf(img) === index);
  const currentImage = uniqueImages[activeImageIndex];

  const handleImageChange = (index: number) => {
    if (index === activeImageIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setActiveImageIndex(index);
      setIsFading(false);
    }, 150); // half of 300ms transition
  };

  const handleAddToCart = () => {
    if (!allRequiredSelected) return;

    addToOrder({
      product,
      selections: configuredSelectedOptions,
      quantity,
      unitPrice: pricePerItemWithDiscount,
    });
    
    toast.success('Added to your build!');
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1200);
  };

  const totalPrice = pricePerItemWithDiscount * quantity;

  const whatsappMessage = `Hi Grainood, I'm interested in ordering:\n\n*${product.name}*\n${selectedLabels}\nQty: ${quantity}\nTotal: ₹${totalPrice.toLocaleString('en-IN')}\n\nPlease help me complete this order.`;
  const whatsappUrl = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const otherProducts = products.filter(p => p.id !== product.id);

  return (
    <div className="text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans pt-20">

      {/* Breadcrumbs */}
      <div className="bg-bg w-full">
        <div className="max-w-[1400px] mx-auto px-4 py-4 lg:py-6 relative z-raised">
          <nav className="flex flex-wrap items-center gap-2 text-[9px] md:text-[10px] tracking-widest uppercase font-bold text-muted">
            <Link to="/" className="hover:text-premium-gold-text transition-colors">Home</Link>
            <span className="text-[#c5a059]/50">/</span>
            <Link to="/collection" className="hover:text-premium-gold-text transition-colors">Collection</Link>
            {baseProduct && (
              <>
                <span className="text-[#c5a059]/50">/</span>
                <Link to={`/collection/${baseProduct.slug}`} className="hover:text-premium-gold-text transition-colors">{baseProduct.name}</Link>
              </>
            )}
            {product.subSeriesName ? (
              <>
                <span className="text-[#c5a059]/50">/</span>
                <span className="text-content/90">{product.subSeriesName}</span>
              </>
            ) : (
              <>
                {!baseProduct && <span className="text-[#c5a059]/50">/</span>}
                <span className="text-content/90">{product.name}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen relative">
        
        {/* LEFT COMPARTMENT - GALLERY */}
        <div className="lg:w-[55%] lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] flex flex-col pt-0 pb-4 md:p-8 lg:border-r border-[#c5a059]/20 order-1 lg:order-1 relative z-sticky-section transition-colors bg-surface/95">
          <div className="flex-1 w-full relative bg-elevated lg:rounded-xl border-y lg:border border-[#c5a059]/20 mb-4 group flex items-center justify-center min-h-[50vh] lg:min-h-0 overflow-hidden lg:overflow-visible">
             <div className="absolute inset-0 bg-surface/20 z-base pointer-events-none"></div>
             
             {/* Mobile Swipe / Desktop Fade Gallery */}
             <div className="hidden lg:flex w-full h-full relative items-center justify-center pointer-events-none">
               <LazyImage 
                 src={currentImage} 
                 alt={`${product.name} bat`} 
                 containerClassName={clsx("w-full h-full absolute inset-0 pointer-events-auto", isFading ? "opacity-0" : "opacity-90", "transition-opacity duration-300 ease-in-out")}
                 className="w-full h-full object-cover object-center max-h-[80vh] hover:scale-150 transition-transform duration-500 cursor-zoom-in origin-center" 
                 loading="eager"
                 decoding="sync"
                 optimizeWidth={800}
               />
             </div>

             <div className="flex lg:hidden w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none items-center">
                {uniqueImages.map((img, idx) => (
                  <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative flex items-center justify-center">
                     <LazyImage 
                       src={img} 
                       alt={`${product.name} bat ${idx + 1}`} 
                       containerClassName="w-full h-[50vh] pointer-events-auto"
                       className="w-full h-full object-cover object-center active:scale-150 transition-transform duration-300 transform-gpu" 
                       loading={idx === 0 ? "eager" : "lazy"}
                       decoding={idx === 0 ? "sync" : "async"}
                       optimizeWidth={800}
                     />
                  </div>
                ))}
             </div>

             {product.badge && (
                <div className="absolute top-4 lg:top-6 right-4 lg:right-6 z-raised">
                  <span className="px-3 py-1.5 lg:px-4 lg:py-2 bg-elevated/90 border border-[#c5a059]/50 text-premium-gold-text text-[9px] lg:text-[10px] font-bold tracking-[0.4em] uppercase shadow-[0_0_15px_rgba(197,160,89,0.3)]">
                    {product.badge}
                  </span>
                </div>
              )}
          </div>
          
          {/* Thumbnails (Desktop) & Dots (Mobile) */}
          {uniqueImages.length > 1 && (
            <>
              {/* Desktop Thumbnails */}
              <div className="hidden lg:flex gap-4 overflow-x-auto pb-2 scrollbar-none h-24 flex-shrink-0 px-4 md:px-0">
                {uniqueImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleImageChange(idx)}
                    className={clsx(
                      "w-20 h-full flex-shrink-0 overflow-hidden rounded-md border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]",
                      activeImageIndex === idx ? "border-[#c5a059] opacity-100" : "border-[#c5a059]/30 opacity-40 hover:opacity-100 hover:border-line"
                    )}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <LazyImage 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover grayscale opacity-80" 
                      loading="eager"
                      decoding="sync"
                      optimizeWidth={400}
                    />
                  </button>
                ))}
              </div>
              
              {/* Mobile Dots Note: the swipe is free-scroll, so dots are just visual indicators of quantity */}
              <div className="flex lg:hidden justify-center gap-2 mt-2 mb-4">
                 {uniqueImages.map((_, idx) => (
                   <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[#c5a059]/40"></div>
                 ))}
                 <span className="text-[9px] text-[#c5a059]/60 uppercase tracking-widest ml-2">Swipe to explore</span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COMPARTMENT - DETAILS & CONFIGURATION */}
        <div className="lg:w-[45%] p-6 md:p-12 lg:p-16 order-2 bg-transparent min-h-[calc(100vh-80px)] pb-32 lg:pb-16 flex flex-col justify-start relative z-raised">
          <div className="max-w-xl">
            <RevealSection delay={0}>
              {baseProduct?.slug !== 'immortal' && baseProduct?.subSeries && baseProduct.subSeries.length > 0 && (
                <div className="mb-6">
                  <div className="text-[10px] text-muted tracking-[0.2em] uppercase mb-4">
                    Product Line: <span className="text-[#c5a059] font-bold">{baseProduct?.name}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {baseProduct.subSeries.map((sub: any) => {
                      const isActive = sub.slug === activeSubSeriesId || sub.id === activeSubSeriesId;
                      return (
                        <Link 
                          key={sub.id} 
                          to={`/collection/${baseProduct.slug}/${sub.slug}${window.location.search}`}
                          className={clsx(
                            "p-3 lg:p-4 border text-left transition-all duration-300 relative flex flex-col justify-center min-h-[60px]",
                            isActive 
                              ? "border-[#c5a059] bg-[#c5a059]/10" 
                              : "border-[#c5a059]/20 bg-surface/30 hover:border-[#c5a059]/60",
                            sub.active === false && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            if (sub.active === false) e.preventDefault();
                          }}
                        >
                          <div className="flex justify-between items-center w-full">
                            <div>
                               <h4 className={clsx("text-xs md:text-sm tracking-widest font-bold uppercase", isActive ? "text-premium-gold-text" : "text-content")}>{sub.name}</h4>
                               <p className="text-[10px] text-muted mt-1 uppercase tracking-widest">{sub.gradeLabel || sub.grade}</p>
                            </div>
                            <div className="text-right">
                               <p className={clsx("text-sm transition-colors", isActive ? "text-premium-gold-text" : "text-content")}>₹{(sub.basePrice || baseProduct.basePrice).toLocaleString('en-IN')}</p>
                               {sub.active === false && <p className="text-[10px] text-red-500 uppercase tracking-widest">Unavailable</p>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {new URLSearchParams(window.location.search).get('consultant_input') && (
                <div className="mb-6 p-4 border border-blue-500/30 bg-blue-500/5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Recommended by AI Bat Consultant</span>
                  </div>
                  {new URLSearchParams(window.location.search).get('consultant_reason') && (
                    <p className="text-xs text-content/80 leading-relaxed italic border-l-2 border-blue-500/30 pl-3 py-1">
                      "{decodeURIComponent(new URLSearchParams(window.location.search).get('consultant_reason') || '')}"
                    </p>
                  )}
                </div>
              )}

              <div className="mb-2">
                <span className="text-premium-gold-text text-[10px] tracking-[0.4em] font-bold uppercase">{product.tier || (baseProduct?.slug === 'immortal' ? 'Premium Choice' : '')}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-content mb-4 text-balance hyphens-none w-full capitalize">{product.name}</h1>
              <p className="text-muted text-sm tracking-widest uppercase mb-8">{product.tagline}</p>
              
              {product.limitedEdition && product.maxAnnualUnits && (
                <div className="mb-8 p-3 border border-red-500/30 bg-red-500/5 inline-flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-[10px] text-red-400 font-bold tracking-widest uppercase">Limited Edition • Strictly {product.maxAnnualUnits} units per year</span>
                </div>
              )}

              
              <div className="mb-6 flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
                <div>
                  <div className="flex items-baseline gap-3">
                    <p className="text-3xl sm:text-4xl text-[#c5a059] font-bold tracking-wider">
                      From ₹{(product.price ?? 0).toLocaleString('en-IN')}
                    </p>
                    {product.price > product.basePrice && (
                      <p className="text-sm text-muted/50 line-through tracking-wider">
                        ₹{(product.price).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted/80 tracking-widest uppercase mt-2 font-medium">Final build price updates as you customize.</p>
                </div>
                {(product as any).subSeriesGrade && (
                  <div className="md:mb-[4px] px-3 py-1 border border-[#c5a059]/30 bg-surface/50 inline-block w-fit">
                    <span className="text-premium-gold-text text-[10px] font-bold tracking-[0.3em] uppercase">{(product as any).subSeriesGradeLabel || (product as any).subSeriesGrade}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 mb-8">
                {(product as any).badge || baseProduct?.badge ? (
                  <div className="px-3 py-1.5 border border-[#c5a059]/20 bg-[#c5a059]/5 inline-flex items-center">
                    <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">{(product as any).badge || baseProduct?.badge}</span>
                  </div>
                ) : null}
                {product.idealFor && (
                  <div className="px-3 py-1.5 border border-[#c5a059]/20 bg-[#c5a059]/5 inline-flex items-center">
                    <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">Best For: {product.idealFor}</span>
                  </div>
                )}
                {product.tier === 'Premium' && (
                  <div className="px-3 py-1.5 border border-[#c5a059]/20 bg-[#c5a059]/5 inline-flex items-center">
                    <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">Premium Choice</span>
                  </div>
                )}
                {baseProduct?.slug === 'immortal' && (
                  <div className="px-3 py-1.5 border border-[#c5a059]/20 bg-[#c5a059]/5 inline-flex items-center">
                    <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">Full Custom Build</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {product.estimatedDeliveryDays && (
                  <div className="p-3 border border-[#c5a059]/10 bg-surface/30 flex flex-col items-start gap-1">
                    <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">Delivery</span>
                    <span className="text-[11px] text-content uppercase">{product.estimatedDeliveryDays} Days</span>
                  </div>
                )}
                {product.warrantyMonths && (
                  <div className="p-3 border border-[#c5a059]/10 bg-surface/30 flex flex-col items-start gap-1">
                    <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">Warranty</span>
                    <span className="text-[11px] text-content uppercase">{product.warrantyMonths} Months</span>
                  </div>
                )}
                <div className="p-3 border border-[#c5a059]/10 bg-surface/30 flex flex-col items-start gap-1">
                  <span className="text-[9px] text-[#c5a059] font-bold tracking-widest uppercase">Status</span>
                  <span className="text-[11px] text-content uppercase">{product.active !== false ? 'Made to Order' : 'Unavailable'}</span>
                </div>
              </div>
              
              <div className="h-px w-full bg-line mb-8"></div>
              
              <div className="mb-12">
                <p className="text-content/80 text-base md:text-lg leading-relaxed font-light mb-6 whitespace-pre-line">
                  {product.longDescription || product.shortDescription || baseProduct?.longDescription || baseProduct?.shortDescription || (product as any).description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="bg-surface border border-[#c5a059]/20 p-5 shadow-sm">
                    <h3 className="text-[10px] text-premium-gold-text tracking-[0.3em] font-bold uppercase mb-3 text-center md:text-left">Why This Bat?</h3>
                    <ul className="space-y-2 text-xs text-content/70 tracking-wider">
                      {(product.idealFor || baseProduct?.idealFor) && (
                        <li><strong className="text-content">Best For:</strong> {Array.isArray(product.idealFor || baseProduct?.idealFor) ? ((product.idealFor || baseProduct?.idealFor) as unknown as any[]).join(', ') : (product.idealFor || baseProduct?.idealFor)}</li>
                      )}
                      {((product as any).playerLevel || (baseProduct as any)?.playerLevel) && (
                        <li><strong className="text-content">Level:</strong> {(product as any).playerLevel || (baseProduct as any)?.playerLevel}</li>
                      )}
                      {((product as any).playingStyle || (baseProduct as any)?.playingStyle) && (
                        <li><strong className="text-content">Style:</strong> {(product as any).playingStyle || (baseProduct as any)?.playingStyle}</li>
                      )}
                      {((product as any).specs?.sweetSpot || baseProduct?.specs?.sweetSpot) && (
                        <li><strong className="text-content">Sweet Spot:</strong> {(product as any).specs?.sweetSpot || baseProduct?.specs?.sweetSpot}</li>
                      )}
                      {((product as any).specs?.pickupFeel || baseProduct?.specs?.pickupFeel) && (
                        <li><strong className="text-content">Pickup:</strong> {(product as any).specs?.pickupFeel || baseProduct?.specs?.pickupFeel}</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-surface border border-[#c5a059]/20 p-5 shadow-sm">
                    <h3 className="text-[10px] text-premium-gold-text tracking-[0.3em] font-bold uppercase mb-3 text-center md:text-left">Included With Bat</h3>
                    <ul className="space-y-2 text-xs text-content/70 tracking-wider list-disc pl-4 marker:text-[#c5a059]">
                      {(product.includedAccessories || baseProduct?.includedAccessories || []).map((acc: string, idx: number) => (
                        <li key={idx}>{acc}</li>
                      ))}
                      {((product as any).specs?.preKnockedIncluded || baseProduct?.specs?.preKnockedIncluded) && (
                        <li>Pre-knocked & Oiled</li>
                      )}
                      {((product as any).specs?.toeProtection || baseProduct?.specs?.toeProtection) && (
                        <li>{(product as any).specs?.toeProtection || baseProduct?.specs?.toeProtection} Fitted</li>
                      )}
                      <li>Post-Purchase Support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* CONFIGURATION OPTIONS */}
            <div className="space-y-10">
              {(product.customizationGroups || []).filter(g => g.enabled !== false).map((group, gIdx) => {
                const selectedOptId = selections[group.id];

                return (
                  <RevealSection key={group.id} delay={100 + gIdx * 50} className={clsx("space-y-4", group.type === 'toggle' ? "pt-4 pb-4 border-y border-[#c5a059]/20" : "")}>
                    {group.type === 'toggle' ? (
                      group.options.map(opt => {
                        const isSelected = selectedOptId === opt.id;
                        return (
                          <label key={opt.id} className="flex items-center justify-between cursor-pointer group">
                            <div>
                  <h3 className="text-[#c5a059] text-[10px] font-bold tracking-widest uppercase mb-1">{opt.label}</h3>
                              {opt.priceDelta > 0 ? (
                                <p className="text-muted text-[11px] tracking-wide">+ ₹{opt.priceDelta.toLocaleString('en-IN')}</p>
                              ) : (
                                <p className="text-muted text-[11px] tracking-wide">Included</p>
                              )}
                            </div>
                            <div className="relative">
                              <input type="checkbox" className="sr-only focus-visible:outline-none" checked={isSelected} onChange={() => handleSelection(group.id, opt.id, group.type)} />
                              <div className={clsx("block w-12 h-6 rounded-full transition-colors group-focus-within:ring-2 group-focus-within:ring-[#c5a059] group-focus-within:ring-offset-2 group-focus-within:ring-offset-bg", isSelected ? "bg-[#c5a059]" : "bg-muted")}></div>
                              <div className={clsx("absolute left-1 top-1 bg-bg w-4 h-4 rounded-full transition-transform", isSelected ? "translate-x-6" : "")}></div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-[#c5a059] text-[10px] font-bold tracking-widest uppercase">
                            {group.label}
                            {group.required && <span className="text-[#c5a059]/60 ml-1">*</span>}
                          </h3>
                          {group.required && !selectedOptId && (
                            <span className="text-[9px] text-red-400 uppercase tracking-widest animate-pulse">Required</span>
                          )}
                        </div>
                        {group.type === 'select' && (
                          <div className={clsx("gap-4", group.options.some(o => o.imageUrl) ? "grid grid-cols-2 md:grid-cols-3" : (group.options.some(o => o.label.includes('(') || o.description) ? "grid grid-cols-2 sm:grid-cols-3" : "flex flex-wrap"))}>
                            {group.options.map((opt) => (
                              <button
                                key={opt.id}
                                disabled={opt.available === false}
                                onClick={() => handleSelection(group.id, opt.id, group.type)}
                                className={clsx(
                                  "relative border border-[#c5a059]/30 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]",
                                  opt.imageUrl ? "p-0 overflow-hidden flex flex-col hover:border-[#c5a059]" : "py-3 px-4 text-[11px] tracking-wider uppercase font-medium hover:border-[#c5a059]",
                                  selectedOptId === opt.id && (opt.imageUrl ? "ring-2 ring-[#c5a059] border-[#c5a059]" : "border-[#c5a059] bg-[#c5a059] text-bg"),
                                  opt.available === false && "!opacity-40 !cursor-not-allowed !hover:border-[#c5a059]/30"
                                )}
                              >
                                {opt.imageUrl ? (
                                  <>
                                    <div className="w-full aspect-[4/3] bg-surface flex justify-center items-center overflow-hidden border-b border-[#c5a059]/10">
                                      <LazyImage src={opt.imageUrl} alt={opt.label} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                                    </div>
                                    <div className="p-3 w-full flex-grow flex flex-col justify-center items-center bg-bg/50">
                                      <div className={clsx("text-[10px] font-bold tracking-widest uppercase", selectedOptId === opt.id ? "text-premium-gold-text" : "text-content")}>{opt.label}</div>
                                      <span className="block text-[9px] text-muted mt-1">{opt.priceDelta > 0 ? `+ ₹${opt.priceDelta.toLocaleString('en-IN')}` : 'Included'}</span>
                                      {opt.description && <span className="block text-[10px] text-muted mt-2 normal-case leading-tight">{opt.description}</span>}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col h-full justify-center items-center gap-1">
                                    {opt.label.includes('(') ? (
                                      <>
                                        <span>{opt.label.split('(')[0].trim()}</span>
                                        <span className="block text-[9px] opacity-70">({opt.label.split('(')[1]?.replace(')', '')})</span>
                                      </>
                                    ) : (
                                      <span>{opt.label}</span>
                                    )}
                                    <span className="block text-[9px] opacity-70">{opt.priceDelta > 0 ? `+ ₹${opt.priceDelta.toLocaleString('en-IN')}` : 'Included'}</span>
                                    {opt.description && <span className="block text-[10px] opacity-60 mt-1 normal-case leading-tight">{opt.description}</span>}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        {group.type === 'color' && (
                          <div className="flex gap-4">
                            {group.options.map((opt) => (
                              <button
                                key={opt.id}
                                disabled={opt.available === false}
                                onClick={() => handleSelection(group.id, opt.id, group.type)}
                                className={clsx(
                                  "w-10 h-10 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:ring-[#c5a059]",
                                  selectedOptId === opt.id ? "border-[#c5a059] scale-110" : "border-transparent hover:scale-105",
                                  opt.available === false && "!opacity-40 !cursor-not-allowed hover:!scale-100"
                                )}
                                style={{ backgroundColor: opt.colorHex || '#ccc' }}
                                aria-label={`Select ${opt.label}`}
                                title={`${opt.label}${opt.priceDelta > 0 ? ` (+₹${opt.priceDelta})` : ''}${opt.description ? ` - ${opt.description}` : ''}${opt.available === false ? " (Unavailable)" : ""}`}
                              />
                            ))}
                          </div>
                        )}
                        {group.type === 'text' && (
                          <div className="mt-2">
                            <input
                              type="text"
                              maxLength={group.maxLength || 12}
                              value={selections[group.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (group.validationRegex) {
                                  if (new RegExp(group.validationRegex).test(val) || val === '') {
                                    handleSelection(group.id, val, group.type);
                                  }
                                } else {
                                  const filteredVal = val.replace(/[^A-Za-z0-9 ]/g, '');
                                  handleSelection(group.id, filteredVal, group.type);
                                }
                              }}
                              className="w-full bg-surface border border-[#c5a059]/30 p-3 text-[13px] tracking-wider text-content uppercase focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]"
                              placeholder={`e.g. MS DHONI (Max ${group.maxLength || 12} chars)`}
                            />
                            <div className="flex justify-between items-center mt-2">
                              <p className="text-[10px] text-muted tracking-widest uppercase">
                                {group.options[0]?.priceDelta > 0 && `(+ ₹${group.options[0].priceDelta.toLocaleString('en-IN')}) `}
                                Only letters, numbers, and spaces.
                              </p>
                              <span className="text-[10px] text-muted tracking-widest">
                                {(selections[group.id] || '').length}/{group.maxLength || 12}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </RevealSection>
                );
              })}

              {/* Quantity */}
              <RevealSection delay={300} className="flex items-center gap-6">
                <h3 className="text-premium-gold-text text-[10px] font-bold tracking-[0.3em] uppercase w-24">Quantity</h3>
                <div className="flex items-center border border-[#c5a059]/40">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 text-content/80 hover:text-content transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-content font-medium text-sm">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(5, quantity + 1))}
                    className="p-3 text-content/80 hover:text-content transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                    disabled={quantity >= 5}
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </RevealSection>

              {/* Desktop CTA / Mobile Spacer */}
              <RevealSection delay={350} className="hidden lg:block pt-8 space-y-6">
                <div className="bg-surface/50 border border-[#c5a059]/20 p-6 space-y-4">
                  <h3 className="text-premium-gold-text text-[11px] tracking-[0.3em] font-bold uppercase mb-4 border-b border-[#c5a059]/20 pb-4">Your Build</h3>
                  
                  <div className="flex justify-between items-center text-[11px] tracking-wider uppercase text-content/80">
                    <span>{product.name} Base</span>
                    <span>₹{(product.price ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  
                  {selectedPairs.map(({group, opt, textValue}) => {
                    if (!opt) return null;
                    return (
                      <div key={group.id} className="flex justify-between items-start text-[11px] tracking-wider uppercase text-content/80 gap-4">
                        <span className="flex-1">{group.label}: <span className="text-content">{textValue ? `"${textValue}"` : opt.label}</span></span>
                        <span className="whitespace-nowrap">{opt.priceDelta > 0 ? `+ ₹${opt.priceDelta.toLocaleString('en-IN')}` : 'Included'}</span>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-[#c5a059]/20 pb-2 flex items-center justify-between">
                    <span className="text-sm font-bold tracking-widest uppercase text-content">Total {quantity > 1 && <span className="normal-case opacity-70 text-xs">(&times; {quantity})</span>}</span>
                    <span 
                      key={totalPrice}
                      className="text-xl text-premium-gold-text font-light tracking-wider animate-page-entrance"
                    >
                      ₹{totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-center text-[9px] text-[#c5a059]/80 uppercase tracking-widest mb-4">
                    Made to order after payment confirmation
                  </p>

                  {!allRequiredSelected && (
                    <div className="text-[10px] text-red-400/80 tracking-widest uppercase mb-4 text-center">
                      * Please select: {missingGroups.join(', ')}
                    </div>
                  )}

                  {/* Primary action — the one thing we want buyers to do */}
                  <div className="flex flex-col gap-2 w-full pt-2">
                    {isAdded ? (
                      <GoldButton
                        disabled
                        variant="solid"
                        className="w-full flex justify-center items-center gap-2"
                      >
                        <Check size={18} /> ADDED ✓
                      </GoldButton>
                    ) : (
                      <GoldButton
                        onClick={handleAddToCart}
                        variant="solid"
                        className="w-full"
                        disabled={!allRequiredSelected}
                      >
                        ADD TO CART
                      </GoldButton>
                    )}

                    <GoldButton
                      onClick={() => {
                        setEnquiryDrawerType('product_enquiry');
                        setIsEnquiryDrawerOpen(true);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      ENQUIRE ABOUT THIS BUILD
                    </GoldButton>

                    {(baseProduct?.slug === 'immortal' || baseProduct?.slug === 'eternal') && (
                      <GoldButton
                        onClick={() => {
                          setEnquiryDrawerType('cleft_selection');
                          setIsEnquiryDrawerOpen(true);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        REQUEST CLEFT SELECTION
                      </GoldButton>
                    )}
                  </div>

                  {/* Pay-later reassurance */}
                  <HowItWorks variant="compact" className="mt-4" />

                  {/* Secondary actions — subordinate to Add to Cart */}
                  <div className="flex items-center gap-1 w-full pt-3">
                    <button
                      onClick={handleSaveBuild}
                      disabled={isSavingBuild || !allRequiredSelected}
                      className="flex-1 py-2.5 text-[10px] tracking-[0.1em] md:tracking-widest uppercase text-muted hover:text-[#c5a059] transition-colors disabled:opacity-50"
                    >
                      {isSavingBuild ? 'SAVING…' : 'SAVE TO GARAGE'}
                    </button>
                    <span className="w-px h-4 bg-[#c5a059]/20" />
                    <button
                      onClick={handleShareBuild}
                      className="flex-1 py-2.5 text-[10px] tracking-[0.1em] md:tracking-widest uppercase text-muted hover:text-[#c5a059] transition-colors"
                    >
                      SHARE BUILD
                    </button>
                  </div>

                <div className="text-center mt-6 flex flex-col gap-2">
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-premium-gold-text text-[11px] tracking-[0.2em] uppercase transition-colors inline-block border-b border-transparent hover:border-[#c5a059] focus-visible:outline-none focus-visible:text-premium-gold-text">
                      CONFIRM SPECS ON WHATSAPP
                    </a>
                  </div>
                  <div className="text-center mt-4 border-t border-[#c5a059]/10 pt-4">
                    <Link to="/bat-consultant" className="text-content font-bold hover:text-premium-gold-text text-[11px] tracking-[0.2em] uppercase transition-colors inline-block border-b border-transparent hover:border-[#c5a059]">
                      Not sure? Try AI Bat Consultant
                    </Link>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32 space-y-24 md:space-y-32">
        {/* PERFORMANCE METER AND SPECS GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-16">
          <div className="lg:col-span-1 border border-[#c5a059]/10 bg-surface/30 rounded-2xl p-8 h-fit lg:sticky lg:top-24">
            <h3 className="text-content text-[11px] font-bold tracking-widest uppercase mb-8">Performance</h3>
            {product.performanceMetrics ? (
              <div className="space-y-6">
                {Object.entries(product.performanceMetrics).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] tracking-widest uppercase mb-2">
                      <span className="text-premium-gold-text">{key}</span>
                      <span className="text-muted">{value as number}/100</span>
                    </div>
                    <div className="h-1 bg-surface border border-[#c5a059]/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#c5a059] transition-all duration-1000 ease-out" style={{ width: `${value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Metrics unavailable</p>
            )}
            
            {product.estimatedDeliveryDays && (
              <div className="mt-12 pt-8 border-t border-[#c5a059]/20">
                <p className="text-[10px] text-muted tracking-widest uppercase mb-1">Estimated Dispatch</p>
                <p className="text-content text-[13px] tracking-wide font-medium">{product.estimatedDeliveryDays} Days</p>
              </div>
            )}
            {product.warrantyMonths && (
              <div className="mt-6">
                <p className="text-[10px] text-muted tracking-widest uppercase mb-1">Warranty</p>
                <p className="text-content text-[13px] tracking-wide font-medium">{product.warrantyMonths} Months</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6 lg:mb-10 cursor-pointer lg:cursor-auto" onClick={() => setIsMobileSpecsOpen(!isMobileSpecsOpen)}>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content text-left w-full text-balance hyphens-none">Technical Specifications</h2>
              <div className="lg:hidden text-content/70 p-2">
                {isMobileSpecsOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
            </div>
            
            <div className={clsx("transition-all duration-300 lg:block overflow-hidden", isMobileSpecsOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100")}>
              <RevealSection className="border-b border-[#c5a059]/20 py-6 mb-4">
                <div className="flex flex-col gap-2">
                  <span className="text-premium-gold-text text-[10px] tracking-[0.3em] uppercase">Included Accessories</span>
                  <span className="text-content/80 text-[14px] leading-relaxed font-light">
                    {product.includedAccessories && product.includedAccessories.length > 0 
                      ? product.includedAccessories.join(', ')
                      : "Premium Bat Cover, Scuff Sheet, Extra Grip, After-Sales Support"}
                  </span>
                </div>
              </RevealSection>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-12 gap-y-0">
                {(product as any).specs && Object.entries((product as any).specs)
                  .filter(([key, value]) => {
                    if (value === null || value === undefined || value === '') return false;
                    if (ALWAYS_FIXED_SPECS.includes(key)) return true;
                    const mappedGroup = SPEC_TO_CUSTOMIZATION_MAP[key];
                    if (mappedGroup && product.customizationGroups?.some((g: any) => g.id === mappedGroup && g.enabled !== false)) {
                      return false;
                    }
                    return true;
                  })
                  .map(([key, value], idx) => (
                  <RevealSection key={key} delay={idx * 50} className="border-b border-[#c5a059]/20 py-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-premium-gold-text text-[10px] tracking-[0.3em] uppercase">
                        {key === 'preKnockedIncluded' ? 'Pre-knocked' : key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-content/80 text-[14px] leading-relaxed font-light">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </span>
                    </div>
                  </RevealSection>
                ))}
              </div>
              
              {baseProduct?.subSeries && baseProduct.subSeries.length > 0 && (
                <div className="mt-16 pt-8 border-t border-[#c5a059]/20">
                  <h3 className="text-lg font-bold tracking-widest text-[#c5a059] uppercase mb-6">{baseProduct.name} Comparison</h3>
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#c5a059] scrollbar-track-transparent">
                    <table className="w-full text-left min-w-[600px] border-collapse">
                      <thead>
                        <tr className="border-b border-[#c5a059]/30">
                          <th className="py-3 px-4 text-[#c5a059] text-[10px] font-bold tracking-[0.2em] uppercase">Model</th>
                          <th className="py-3 px-4 text-[#c5a059] text-[10px] font-bold tracking-[0.2em] uppercase text-center">Grade</th>
                          <th className="py-3 px-4 text-[#c5a059] text-[10px] font-bold tracking-[0.2em] uppercase text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] tracking-wider text-content/80">
                        {baseProduct.subSeries.map((s: any) => (
                          <tr key={s.id} className={clsx("border-b border-[#c5a059]/10 hover:bg-surface/50", activeSubSeriesId === s.id && "bg-[#c5a059]/5")}>
                            <td className="py-3 px-4 uppercase font-bold text-content">{s.name}</td>
                            <td className="py-3 px-4 text-center uppercase">{s.gradeLabel || s.grade}</td>
                            <td className="py-3 px-4 text-right">₹{(s.basePrice || baseProduct.basePrice).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FEATURES STRIP */}
        {product.features && product.features.length > 0 && (
          <section>
            <RevealSection>
              <div className="bg-surface/90 border border-[#c5a059]/20 p-8 md:p-12 mb-20">
                 <h3 className="text-content text-[12px] font-bold tracking-[0.3em] uppercase mb-8 hidden md:block">Key Features</h3>
                 <div className="flex flex-col md:flex-row flex-wrap md:items-center gap-6 md:gap-12 text-content/80">
                   {product.features.map((feature, idx) => (
                     <div key={idx} className="flex items-center gap-4">
                       <div className="w-1 h-1 bg-[#c5a059] rotate-45 flex-shrink-0"></div>
                       <span className="text-[13px] tracking-wide uppercase">{feature}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </RevealSection>
          </section>
        )}
        
        {/* REVIEWS & TRUST BADGES */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-16 pb-20">
          <div className="lg:col-span-2 space-y-12">
            <RevealSection>
               <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-8">Player Reviews</h2>
               <div className="flex items-center gap-4 mb-10">
                 <div className="flex gap-1 text-[#c5a059]">
                   {[1,2,3,4,5].map(star => <svg key={star} className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                 </div>
                 <div className="text-content font-bold tracking-widest text-lg">4.9<span className="text-muted text-sm ml-2">/ 5.0 (24 Reviews)</span></div>
               </div>
               
               <div className="space-y-8">
                 {[
                   { name: "Rahul D.", text: "The balance on this bat is phenomenal. Customization was exactly to my specs and the pickup feels much lighter than the actual weight.", title: "Incredible Balance" },
                   { name: "James M.", text: "Beautiful piece of willow. The grains are perfectly straight and the ping is out of this world straight out of the box.", title: "Outstanding Ping" }
                 ].map((review, i) => (
                   <div key={i} className="border-l border-[#c5a059]/30 pl-6">
                     <div className="flex items-center gap-3 mb-2">
                       <span className="text-content font-bold text-sm tracking-wider">{review.name}</span>
                       <span className="text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 uppercase tracking-widest border border-green-500/20">Verified</span>
                     </div>
                     <span className="text-premium-gold-text text-sm font-medium tracking-wide block mb-2">{review.title}</span>
                     <p className="text-content/70 text-sm leading-relaxed font-light">{review.text}</p>
                   </div>
                 ))}
               </div>
            </RevealSection>
          </div>
          <div className="lg:col-span-1">
             <RevealSection delay={200} className="border border-[#c5a059]/20 bg-surface/30 p-8 space-y-8 h-full">
                <div>
                   <h3 className="text-premium-gold-text text-[10px] font-bold tracking-widest uppercase mb-2">Authentic Willow</h3>
                   <p className="text-content/70 text-xs leading-loose">Master-crafted from premium English Willow, hand-selected for performance.</p>
                </div>
                <div className="h-px bg-line w-full"></div>
                <div>
                   <h3 className="text-premium-gold-text text-[10px] font-bold tracking-widest uppercase mb-2">Secure Checkout</h3>
                   <p className="text-content/70 text-xs leading-loose">State-of-the-art encryption ensures your payment details and data are protected.</p>
                </div>
                <div className="h-px bg-line w-full"></div>
                <div>
                   <h3 className="text-premium-gold-text text-[10px] font-bold tracking-widest uppercase mb-2">Dedicated Support</h3>
                   <p className="text-content/70 text-xs leading-loose">Our bat consultants are available pre and post purchase for any guidance.</p>
                </div>
             </RevealSection>
          </div>
        </section>
        
        {/* THE REST OF THE FAMILY */}
        <section>
          <RevealSection>
            <div className="flex flex-col mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-6 text-center text-balance hyphens-none w-full">The Rest of the Family</h2>
              <div className="h-px w-24 bg-[#c5a059] mx-auto"></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {otherProducts.map((p, idx) => (
                <RevealSection key={p.id} delay={idx * 100}>
                  <Link to={`/collection/${p.slug}`} className="block hover-lift group border border-[#c5a059]/20 bg-surface/90 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c5a059]">
                    <div className="aspect-square relative overflow-hidden bg-elevated">
                      <div className="absolute inset-0 grayscale opacity-60 group-hover:opacity-90 group-hover:grayscale-0 transition-all duration-700 z-base">
                        <LazyImage 
                          src={p.imageUrl} 
                          alt={p.name} 
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          loading="lazy"
                          decoding="async"
                          optimizeWidth={400}
                        />
                      </div>
                      {p.isFlagship && (
                        <div className="absolute top-2 right-2 flex justify-end z-raised">
                           <div className="w-1.5 h-1.5 bg-[#c5a059] rounded-full shadow-[0_0_8px_#c5a059]"></div>
                        </div>
                      )}
                    </div>
                    <div className="p-5 text-center relative z-raised bg-transparent">
                      <h4 className="text-content font-bold tracking-[0.2em] uppercase text-sm mb-2">{p.name}</h4>
                      <p className="text-muted text-[10px] tracking-widest uppercase">₹{(p.price ?? 0).toLocaleString('en-IN')}</p>
                    </div>
                  </Link>
                </RevealSection>
              ))}
            </div>
          </RevealSection>
        </section>
      </div>

      {/* MOBILE STICKY CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-sticky-section bg-surface/95 border-t border-[#c5a059]/20">
        <div 
          className="bg-bg border-t border-[#c5a059]/30 shadow-lg flex flex-col transition-all duration-300 ease-in-out"
        >
          {/* Header / Toggle */}
          <button 
            onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)} 
            className="p-4 flex justify-between items-center w-full focus:outline-none"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="text-content text-xs font-bold uppercase tracking-widest">Your Build {!isMobileSummaryOpen && <span className="opacity-50 lowercase tracking-normal font-normal">({selectedPairs.filter(p => p.opt).length} items)</span>}</span>
              {!isMobileSummaryOpen && !allRequiredSelected && (
                 <span className="text-[9px] text-red-400 uppercase tracking-widest">* Missing {missingGroups.length} required</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span 
                key={totalPrice}
                className="text-premium-gold-text text-sm tracking-wider animate-page-entrance"
              >
                ₹{totalPrice.toLocaleString('en-IN')}
              </span>
              {isMobileSummaryOpen ? <ChevronDown size={18} className="text-content/70" /> : <ChevronUp size={18} className="text-content/70" />}
            </div>
          </button>
          
          {/* Expandable Content */}
          {isMobileSummaryOpen && (
             <div className="overflow-hidden">
               <div className="px-4 pb-2 max-h-[40vh] overflow-y-auto scrollbar-none border-t border-line/50">
                  <div className="py-4 space-y-3">
                    <div className="flex justify-between items-center text-[10px] tracking-wider uppercase text-content/80">
                      <span>{product.name} Base</span>
                      <span>₹{(product.price ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    {selectedPairs.map(({group, opt, textValue}) => {
                      if (!opt) return null;
                      return (
                        <div key={group.id} className="flex justify-between items-start text-[10px] tracking-wider uppercase text-content/80 gap-4 border-t border-line/30 pt-3">
                          <span className="flex-1">{group.label}: <span className="text-content">{textValue ? `"${textValue}"` : opt.label}</span></span>
                          <span className="whitespace-nowrap">{opt.priceDelta > 0 ? `+ ₹${opt.priceDelta.toLocaleString('en-IN')}` : 'Included'}</span>
                        </div>
                      );
                    })}
                    {!allRequiredSelected && (
                      <div className="text-[10px] text-red-400/80 tracking-widest uppercase mt-4 border-t border-line/30 pt-3">
                        * Please select: {missingGroups.join(', ')}
                      </div>
                    )}
                    <div className="text-center mt-6 border-t border-line/30 pt-4 flex flex-col gap-2">
                      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-content hover:text-premium-gold-text text-[10px] tracking-[0.2em] uppercase transition-colors inline-block border-b border-transparent hover:border-[#c5a059]">
                        CONFIRM SPECS ON WHATSAPP
                      </a>
                    </div>
                  </div>
               </div>
             </div>
          )}
          
          {/* Action Area */}
          <div className="p-4 pt-2 pb-safe border-t border-[#c5a059]/10">
            {isAdded ? (
              <GoldButton disabled variant="solid" className="w-full flex justify-center items-center gap-2 py-3">
                <Check size={18} /> ADDED ✓
              </GoldButton>
            ) : (
              <GoldButton onClick={handleAddToCart} disabled={!allRequiredSelected} variant="solid" className="w-full py-3">
                {allRequiredSelected ? "ADD TO CART" : "SELECT REQUIRED"}
              </GoldButton>
            )}
            
            <GoldButton
              onClick={() => {
                setIsMobileSummaryOpen(false);
                setIsEnquiryDrawerOpen(true);
              }}
              variant="outline"
              className="w-full mt-2 py-3"
            >
              ENQUIRE ABOUT THIS BUILD
            </GoldButton>
            
            <div className="flex gap-2 w-full pt-2">
              <button 
                onClick={handleSaveBuild}
                disabled={isSavingBuild || !allRequiredSelected}
                className="flex-1 py-3 text-[10px] tracking-widest uppercase border border-[#c5a059]/40 hover:bg-[#c5a059] hover:text-bg transition-colors disabled:opacity-50 text-content"
              >
                {isSavingBuild ? 'SAVING...' : 'SAVE TO GARAGE'}
              </button>
              <button 
                onClick={handleShareBuild}
                className="flex-1 py-3 text-[10px] tracking-widest uppercase border border-[#c5a059]/40 hover:bg-[#c5a059] hover:text-bg transition-colors text-content"
              >
                SHARE BUILD
              </button>
            </div>
          </div>
        </div>
      </div>

      <EnquiryDrawer 
        isOpen={isEnquiryDrawerOpen}
        onClose={() => setIsEnquiryDrawerOpen(false)}
        source="product_page"
        defaultType={enquiryDrawerType}
        productRef={{
          seriesId: baseProduct?.id || product.id,
          seriesSlug: baseProduct?.slug || slug || '',
          seriesName: baseProduct?.name || product.name,
          subSeriesId: activeSubSeriesId || undefined,
          subSeriesSlug: activeSubSeriesId || undefined,
          subSeriesName: (product as any).subSeriesName || undefined
        }}
      />
    </div>
  );
}
