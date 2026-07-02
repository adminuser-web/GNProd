import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter, X, SearchX } from 'lucide-react';
import { clsx } from 'clsx';
import { useProducts } from '../context/ProductsContext';
import { Reveal } from './Reveal';
import { LazyImage } from './LazyImage';
import { GoldButton } from './GoldButton';
import { Skeleton, SkeletonTextLines } from './Skeleton';
import { EmptyState } from './EmptyState';
import { getCustomizableAttributes } from '../features/products/attributes';

export function CollectionPage() {
  const { products: PUBLISHED_PRODUCTS, loading, error } = useProducts();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    budget: 'all',
    playingLevel: 'all',
    battingStyle: 'all',
    pickupFeel: 'all',
    customizationLevel: 'all'
  });

  useEffect(() => {
    document.title = "The Collection — Grainood";
  }, []);

  const filteredProducts = useMemo(() => {
    if (!PUBLISHED_PRODUCTS) return [];
    const filtered = PUBLISHED_PRODUCTS.filter(series => {
      if (series.active === false) return false;
      let startingPrice = series.price || 0;
      if (series.subSeries && series.subSeries.length > 0) {
         startingPrice = Math.min(...series.subSeries.map(s => s.basePrice || 9999999));
      }

      // Budget
      if (filters.budget !== 'all') {
        if (filters.budget === 'under-20k' && startingPrice > 20000) return false;
        if (filters.budget === '20k-40k' && (startingPrice < 20000 || startingPrice > 40000)) return false;
        if (filters.budget === '40k-plus' && startingPrice < 40000) return false;
      }

      // Level
      if (filters.playingLevel !== 'all') {
         if (filters.playingLevel === 'beginner' && series.slug !== 'debutant') return false;
         if (filters.playingLevel === 'intermediate' && !['millennium', 'legend'].includes(series.slug)) return false;
         if (filters.playingLevel === 'pro' && !['eternal', 'immortal'].includes(series.slug)) return false;
      }

      // Style
      if (filters.battingStyle !== 'all') {
         if (filters.battingStyle === 'aggressive' && !['eternal', 'millennium'].includes(series.slug)) return false;
         if (filters.battingStyle === 'all-round' && !['debutant', 'legend', 'immortal'].includes(series.slug)) return false;
      }

      // Pickup Feel
      if (filters.pickupFeel !== 'all') {
         if (filters.pickupFeel === 'light' && !['legend', 'debutant'].includes(series.slug)) return false;
         if (filters.pickupFeel === 'balanced' && !['millennium', 'eternal', 'immortal'].includes(series.slug)) return false;
      }

      // Customization
      if (filters.customizationLevel !== 'all') {
        const optionCount = getCustomizableAttributes(series).length;
        if (filters.customizationLevel === 'basic' && optionCount > 5) return false;
        if (filters.customizationLevel === 'advanced' && optionCount <= 5) return false;
      }

      return true;
    });

    // Sort tiles by premium order (e.g., Debutant -> Millennium -> Eternal -> Legend -> Immortal)
    // assuming sortOrder maps to this correctly based on existing data
    return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [PUBLISHED_PRODUCTS, filters]);

  if (loading) {
    return (
      <div className="bg-bg text-content/80 min-h-screen font-sans pt-20 pb-20">
        <div className="text-center py-16 px-4">
          <Skeleton variant="text" className="h-10 w-64 mx-auto mb-4" />
          <Skeleton variant="text" className="h-px w-24 mx-auto mb-8" />
          <Skeleton variant="text" className="h-4 w-48 mx-auto mb-6" />
        </div>
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-12 lg:gap-24">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 border border-[#c5a059]/10 bg-surface/30 rounded-2xl overflow-hidden p-8">
              <Skeleton variant="product" className="w-full lg:w-1/2" />
              <div className="w-full lg:w-1/2">
                <Skeleton variant="text" className="h-4 w-24 mb-4" />
                <Skeleton variant="text" className="h-10 w-3/4 mb-4" />
                <SkeletonTextLines lines={3} className="mb-6" />
                <Skeleton variant="text" className="h-12 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !PUBLISHED_PRODUCTS || PUBLISHED_PRODUCTS.length === 0) {
    return (
      <div className="bg-bg min-h-screen pt-32 pb-20 px-4 flex items-center justify-center">
        <EmptyState 
          icon={<SearchX size={32} />}
          title="Error Loading Collection"
          description="Please check your connection and try again."
          actionText="Return Home"
          actionLink="/"
        />
      </div>
    );
  }

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-bg font-sans pt-20 pb-20">
      <div className="text-center py-24 md:py-32 px-6 lg:px-8 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-content tracking-tight mb-6 uppercase">The Collection</h1>
        <p className="text-content/80 text-lg md:text-xl leading-relaxed mx-auto font-light mb-10">Discover our handcrafted range. Need help choosing?</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <GoldButton as={Link} to="/bat-consultant" variant="outline" className="inline-flex gap-3">
            AI BAT CONSULTANT
          </GoldButton>
          <button 
             onClick={() => setFiltersOpen(!filtersOpen)}
             className="px-6 py-4 border border-[#c5a059]/30 text-content flex items-center gap-2 hover:bg-[#c5a059]/10 transition-colors text-[10px] tracking-widest uppercase font-bold"
          >
             <Filter size={14} /> Filters
          </button>
        </div>

        {/* Filter Bar */}
        {filtersOpen && (
           <div className="max-w-4xl mx-auto mt-8 p-6 border border-[#c5a059]/20 bg-surface/50 text-left relative z-raised">
              <button onClick={() => setFiltersOpen(false)} className="absolute top-4 right-4 text-muted hover:text-content">
                 <X size={16} />
              </button>
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#c5a059] mb-4">Filter Collection</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 <div>
                    <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Budget</label>
                    <select 
                       value={filters.budget} 
                       onChange={(e) => setFilters({ ...filters, budget: e.target.value })}
                       className="w-full bg-bg border border-[#c5a059]/30 p-2 text-xs text-content focus:outline-none focus:border-[#c5a059]"
                    >
                       <option value="all">All Budgets</option>
                       <option value="under-20k">Under ₹20,000</option>
                       <option value="20k-40k">₹20,000 - ₹40,000</option>
                       <option value="40k-plus">Over ₹40,000</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Level</label>
                    <select 
                       value={filters.playingLevel} 
                       onChange={(e) => setFilters({ ...filters, playingLevel: e.target.value })}
                       className="w-full bg-bg border border-[#c5a059]/30 p-2 text-xs text-content focus:outline-none focus:border-[#c5a059]"
                    >
                       <option value="all">All Levels</option>
                       <option value="beginner">Beginner / Club</option>
                       <option value="intermediate">Intermediate / League</option>
                       <option value="pro">Pro / International</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Style</label>
                    <select 
                       value={filters.battingStyle} 
                       onChange={(e) => setFilters({ ...filters, battingStyle: e.target.value })}
                       className="w-full bg-bg border border-[#c5a059]/30 p-2 text-xs text-content focus:outline-none focus:border-[#c5a059]"
                    >
                       <option value="all">All Styles</option>
                       <option value="all-round">All-Round</option>
                       <option value="aggressive">Aggressive / Power</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Pickup Feel</label>
                    <select 
                       value={filters.pickupFeel} 
                       onChange={(e) => setFilters({ ...filters, pickupFeel: e.target.value })}
                       className="w-full bg-bg border border-[#c5a059]/30 p-2 text-xs text-content focus:outline-none focus:border-[#c5a059]"
                    >
                       <option value="all">All Profiles</option>
                       <option value="light">Featherlight</option>
                       <option value="balanced">Balanced / Solid</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">Customization</label>
                    <select 
                       value={filters.customizationLevel} 
                       onChange={(e) => setFilters({ ...filters, customizationLevel: e.target.value })}
                       className="w-full bg-bg border border-[#c5a059]/30 p-2 text-xs text-content focus:outline-none focus:border-[#c5a059]"
                    >
                       <option value="all">All Options</option>
                       <option value="basic">Standard Choices</option>
                       <option value="advanced">Full Bespoke</option>
                    </select>
                 </div>
              </div>
           </div>
        )}
      </div>
      
      <div className="max-w-[1400px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.length === 0 && (
           <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 text-muted tracking-widest uppercase text-sm">No models match your filters.</div>
        )}
        {filteredProducts.map((series, idx) => {
          // Calculate starting price based on sub-series min price, fallback to series.price
          let startingPrice = series.price;
          if (series.subSeries && series.subSeries.length > 0) {
            startingPrice = Math.min(...series.subSeries.map(s => s.basePrice || 9999999));
          }

          // Badge labels — primary is the descriptive tag; secondary only shows
          // when it's genuinely different (avoids the same badge appearing twice).
          const primaryTag =
            series.slug === 'debutant' ? 'Best for Beginners' :
            series.slug === 'millennium' ? 'Club Match Ready' :
            series.slug === 'legend' ? 'Best Pickup' :
            series.slug === 'eternal' ? 'Power Hitter Choice' :
            series.slug === 'immortal' ? 'Pro Reserve' :
            (series.isFlagship ? 'Premium Choice' : 'New Arrival');
          const norm = (s?: string) => (s || '').trim().toLowerCase();
          const secondaryTag =
            series.badge && norm(series.badge) !== norm(primaryTag) ? series.badge :
            (series.isFlagship && !/premium|flagship|reserve|pro/i.test(primaryTag) ? 'Flagship' : null);

          return (
            <Reveal key={series.id} delay={idx * 150} className="h-full">
              <Link to={`/collection/${series.slug}`} className="block h-full outline-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded-3xl">
                <div className="relative h-full flex flex-col rounded-3xl border border-[#c5a059]/25 group-hover:border-[#c5a059]/70 p-6 md:p-8 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_16px_48px_-16px_rgba(197,160,89,0.4)]">

                  <div className="flex justify-between gap-2 mb-4">
                    <span className="px-3 py-1 border border-[#c5a059]/30 text-[#c5a059] text-[9px] md:text-[10px] font-bold tracking-widest uppercase">
                      {primaryTag}
                    </span>
                    {secondaryTag && (
                      <span className="px-3 py-1 border border-[#c5a059]/30 text-content text-[9px] md:text-[10px] font-bold tracking-widest uppercase">
                        {secondaryTag}
                      </span>
                    )}
                  </div>

                  <div className="aspect-[4/5] w-full relative flex items-center justify-center mb-6 px-4">
                    <LazyImage
                      src={series.imageUrl}
                      alt={series.name}
                      containerClassName="h-full bg-transparent"
                      className="w-auto h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-md"
                      optimizeWidth={500}
                    />
                  </div>

                  <div className="text-center mt-auto">
                    <span className="text-[#c5a059] text-[10px] tracking-[0.2em] font-bold uppercase">
                      {series.gradeLabel || series.grade || 'Pro Elite'}
                    </span>
                    <h2 className="text-2xl lg:text-3xl font-extrabold uppercase tracking-tight text-content mt-2 mb-3">
                      {series.name}
                    </h2>
                    <p className="text-muted text-sm leading-snug mb-6 max-w-sm mx-auto font-light">
                      {series.slug === 'debutant' && 'Entry-level Grade 4 English Willow for beginners and casual players.'}
                      {series.slug === 'millennium' && 'Reliable match-use English Willow for regular club cricketers.'}
                      {series.slug === 'legend' && 'Pickup-focused premium English Willow for timing and control.'}
                      {series.slug === 'eternal' && 'Power-focused premium bat for serious aggressive players.'}
                      {series.slug === 'immortal' && 'Flagship pro-reserve build for elite/premium buyers.'}
                      {!['debutant', 'millennium', 'legend', 'eternal', 'immortal'].includes(series.slug) && series.tagline}
                    </p>
                    <div className="text-lg md:text-xl font-bold tracking-widest mb-6 text-content">
                      From ₹{startingPrice?.toLocaleString('en-IN')}
                    </div>
                    <div className="w-full py-4 tracking-[0.25em] text-[10px] font-bold flex items-center justify-center gap-2 border border-[#c5a059]/40 text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-bg transition-colors duration-300">
                      VIEW RANGE
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
