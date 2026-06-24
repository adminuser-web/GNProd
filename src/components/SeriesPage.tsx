// @ts-nocheck
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Product, ProductSubSeries } from '../features/products/types';
import { Reveal } from './Reveal';
import { ScrimImage } from './ScrimImage';
import { GoldButton } from './GoldButton';

export function SeriesPage({ series }: { series: Product }) {
  useEffect(() => {
    document.title = `${series.name} Collection — Grainood`;
  }, [series]);

  const subSeriesList = series.subSeries || [];
  
  // Sort subSeries by sortOrder and filter active
  const sortedSubSeries = [...subSeriesList]
    .filter(sub => sub.active !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans pt-20">
      
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 py-4 relative z-raised">
        <nav className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[9px] md:text-[10px] tracking-widest uppercase font-bold text-muted">
          <Link to="/" className="hover:text-premium-gold-text transition-colors">Home</Link>
          <span className="text-[#c5a059]/50">/</span>
          <Link to="/collection" className="hover:text-premium-gold-text transition-colors">Collection</Link>
          <span className="text-[#c5a059]/50">/</span>
          <span className="text-content/90">{series.name}</span>
        </nav>
      </div>

      {/* Series Hero header */}
      <section className="relative min-h-[60vh] md:min-h-[70vh] flex flex-col justify-end px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 z-base bg-bg">
          <ScrimImage 
             src={series.heroImage || (series.galleryImages && series.galleryImages.length > 0 ? series.galleryImages[0] : series.imageUrl)}
             placeholderSrc="/handmade-mastery.webp"
             alt={series.name}
             className="w-full h-full"
             scrim="linear-gradient(to top, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.6) 40%, rgba(8,8,10,0.2) 75%, rgba(8,8,10,0.1) 100%)"
             priority={true}
          />
        </div>
        <Reveal className="relative z-raised max-w-4xl mx-auto flex flex-col items-center text-center">
          <span 
             className="text-[#c5a059] text-[10px] tracking-[0.2em] font-bold uppercase mb-4"
             style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {series.gradeLabel || series.grade || 'Pro Elite'}
          </span>
          <h1 
             className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-widest mb-6 uppercase"
             style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {series.name}
          </h1>
          <p 
             className="text-white/90 text-sm md:text-base tracking-widest uppercase mb-8 max-w-2xl font-semibold leading-relaxed"
             style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {series.slug === 'debutant' && 'Entry-level Grade 4 English Willow for beginners and casual players.'}
            {series.slug === 'millennium' && 'Reliable match-use English Willow for regular club cricketers.'}
            {series.slug === 'legend' && 'Pickup-focused premium English Willow for timing and control.'}
            {series.slug === 'eternal' && 'Power-focused premium bat for serious aggressive players.'}
            {series.slug === 'immortal' && 'Flagship pro-reserve build for elite/premium buyers.'}
            {!['debutant', 'millennium', 'legend', 'eternal', 'immortal'].includes(series.slug) && series.tagline}
          </p>
          <p 
             className="text-white/70 max-w-2xl text-sm leading-relaxed mb-6 font-light font-sans"
             style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {series.shortDescription || (Array.isArray(series.longDescription) ? series.longDescription[0] : series.longDescription) || series.description}
          </p>
        </Reveal>
      </section>

      {sortedSubSeries.length === 1 && series.slug === 'immortal' ? (
         <section className="py-24 text-center border-t border-line">
            <Reveal>
              <h2 className="text-xl md:text-2xl tracking-widest uppercase mb-8 text-content font-bold">The Pinnacle Collection</h2>
              <GoldButton 
                as={Link} 
                to={`/collection/${series.slug}/${sortedSubSeries[0].slug}`}
                variant="solid" 
                className="px-12 py-5"
              >
                PROCEED TO IMMORTAL
              </GoldButton>
            </Reveal>
         </section>
      ) : (
      <>
      {/* Which one is right for you? cards */}
      <section className="py-20 px-4 max-w-[1400px] mx-auto w-full">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-6 text-balance uppercase w-full">Which {series.name} is right for you?</h2>
          <div className="h-px w-24 bg-[#c5a059] mx-auto opacity-30"></div>
        </Reveal>

        <Reveal className="flex justify-center mb-16">
          <GoldButton 
            as={Link} 
            to="/bat-consultant"
            variant="outline" 
            className="text-[10px] tracking-widest px-8"
          >
            NOT SURE? USE AI CONSULTANT
          </GoldButton>
        </Reveal>

        <div className="flex flex-row md:justify-center gap-6 lg:gap-8 pb-8 overflow-x-auto snap-x snap-mandatory scrollbar-none items-stretch px-4">
          {sortedSubSeries.map((sub, idx) => (
            <Reveal key={sub.id} delay={idx * 100} className="flex-1 min-w-[300px] max-w-[350px] snap-center flex">
              <div className="flex flex-col w-full bg-surface border border-[#c5a059]/20 hover:border-[#c5a059]/50 transition-colors duration-300 rounded-[20px] overflow-hidden group shadow-sm shadow-[#c5a059]/5 relative h-full">
                
                {/* Image hero for sub-series */}
                <div className="w-full h-[300px] relative overflow-hidden bg-bg">
                  {sub.badge && (
                    <div className="absolute top-4 right-4 z-raised">
                      <span className="px-3 py-1 bg-black/40 backdrop-blur-sm border border-[#c5a059]/30 text-white text-[9px] font-bold tracking-widest uppercase shadow-sm">
                        {sub.badge}
                      </span>
                    </div>
                  )}
                  <ScrimImage 
                     src={sub.media?.primaryImage}
                     placeholderSrc="/handmade-mastery.webp"
                     alt={sub.name}
                     className="w-full h-full"
                     imageClassName="group-hover:scale-105 transition-transform duration-700 ease-out object-contain"
                     scrim="linear-gradient(to top, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.6) 40%, rgba(8,8,10,0.2) 75%, rgba(8,8,10,0.1) 100%)"
                  />
                  
                  <div className="absolute bottom-6 left-0 right-0 text-center px-4 z-raised">
                     <h3 
                       className="text-2xl font-black tracking-widest text-white uppercase mb-1"
                       style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
                     >
                       {sub.name}
                     </h3>
                     <span 
                       className="text-[#c5a059] text-[9px] tracking-[0.2em] font-bold uppercase drop-shadow-md"
                       style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
                     >
                       {sub.gradeLabel || sub.grade}
                     </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1 text-center bg-surface">
                  <div className="text-xl font-light text-content mb-6 tracking-wider">
                    From ₹{sub.basePrice.toLocaleString('en-IN')}
                  </div>
                  
                  {/* 3 Key Spec Highlights */}
                  <div className="grid grid-cols-3 gap-2 mb-8 text-[10px] tracking-widest uppercase text-muted">
                    <div className="flex flex-col items-center">
                       <span className="text-[#c5a059] font-bold mb-1">Sweet Spot</span>
                       <span className="text-center leading-tight">{sub.specs?.sweetSpot || (series as any).sweetSpot || 'Mid'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-[#c5a059] font-bold mb-1">Pickup</span>
                       <span className="text-center leading-tight">{sub.specs?.pickupFeel || (series as any).pickupFeel || 'Balanced'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-[#c5a059] font-bold mb-1">Willow</span>
                       <span className="text-center leading-tight">Grade {sub.specs?.willowGrade || (series as any).willowGrade || '1'}</span>
                    </div>
                  </div>
                  
                  <GoldButton 
                    as={Link} 
                    to={`/collection/${series.slug}/${sub.slug}`}
                    variant="outline" 
                    className="w-full mt-auto py-4 text-[10px] tracking-[0.25em] font-bold flex items-center justify-center gap-2"
                  >
                    SELECT
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </GoldButton>
                </div>
                
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-24 px-4 border-t border-[#c5a059]/10 bg-surface/30">
        <Reveal className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-content uppercase">Compare Specs</h3>
          </div>
          
          <div className="hidden md:block overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-[#c5a059] scrollbar-track-transparent">
            <table className="w-full text-left min-w-[700px] border-collapse mx-auto">
              <thead>
                <tr className="border-b border-[#c5a059]/30">
                  <th className="sticky left-0 z-sticky-section bg-surface/80 py-4 px-4 text-[#c5a059] text-[11px] font-bold tracking-[0.3em] uppercase w-48 align-top border-r border-[#c5a059]/20 shadow-[1px_0_4px_rgba(0,0,0,0.1)]">Feature</th>
                  {sortedSubSeries.map((sub) => (
                    <th key={sub.id} className="py-4 px-4 align-top w-48 text-center bg-surface/10">
                      <div className="text-[12px] font-bold tracking-[0.1em] text-content uppercase">{sub.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[12px] tracking-wider text-content/80">
                <SpecRow label="Willow Grade" items={sortedSubSeries} extractor={s => s.specs?.willowGrade || s.gradeLabel || s.grade} />
                <SpecRow label="Grains" items={sortedSubSeries} extractor={s => s.specs?.grains || (series as any).grains || '-'} />
                <SpecRow label="Edge Profile" items={sortedSubSeries} extractor={s => s.specs?.edges || (series as any).edges || '-'} />
                <SpecRow label="Profile/Spine" items={sortedSubSeries} extractor={s => s.specs?.spine || s.specs?.profile || (series as any).spine || '-'} />
                <SpecRow label="Sweet Spot" items={sortedSubSeries} extractor={s => s.specs?.sweetSpot || (series as any).sweetSpot || '-'} />
                <SpecRow label="Weight" items={sortedSubSeries} extractor={s => s.specs?.weightRange || (series as any).weightRange || '-'} />
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion/Stack for Compare */}
          <div className="md:hidden space-y-6 max-w-sm mx-auto">
             {sortedSubSeries.map((sub) => (
                <div key={`m-${sub.id}`} className="bg-surface border border-[#c5a059]/20 p-6 rounded-[20px] relative">
                   <h4 className="text-xl font-bold tracking-tight text-content mb-4 text-center uppercase">{sub.name}</h4>
                   <div className="grid grid-cols-2 gap-4 text-xs font-light">
                     <div className="border-b border-line pb-2">
                       <span className="block text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Willow Grade</span>
                       <span className="text-content font-medium">{sub.specs?.willowGrade || sub.gradeLabel || sub.grade || '-'}</span>
                     </div>
                     <div className="border-b border-line pb-2">
                       <span className="block text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Grains</span>
                       <span className="text-content font-medium">{sub.specs?.grains || (series as any).grains || '-'}</span>
                     </div>
                     <div className="border-b border-line pb-2">
                       <span className="block text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Edge Profile</span>
                       <span className="text-content font-medium">{sub.specs?.edges || (series as any).edges || '-'}</span>
                     </div>
                     <div className="border-b border-line pb-2">
                       <span className="block text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Profile/Spine</span>
                       <span className="text-content font-medium">{sub.specs?.spine || sub.specs?.profile || (series as any).spine || '-'}</span>
                     </div>
                     <div className="border-b border-line pb-2">
                       <span className="block text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Sweet Spot</span>
                       <span className="text-content font-medium">{sub.specs?.sweetSpot || (series as any).sweetSpot || '-'}</span>
                     </div>
                     <div className="border-b border-line pb-2">
                       <span className="block text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Weight Range</span>
                       <span className="text-content font-medium">{sub.specs?.weightRange || (series as any).weightRange || '-'}</span>
                     </div>
                   </div>
                </div>
             ))}
          </div>
        </Reveal>
      </section>
      </>
      )}
    </div>
  );
}

function SpecRow({ label, items, extractor }: { label: string, items: ProductSubSeries[], extractor: (item: ProductSubSeries) => any }) {
  return (
    <tr className="border-b border-line transition-colors hover:bg-surface/30">
      <td className="sticky left-0 z-raised bg-surface/80 py-5 px-4 font-bold tracking-[0.1em] text-[11px] uppercase text-content border-r border-[#c5a059]/20 shadow-[1px_0_4px_rgba(0,0,0,0.1)]">
        {label}
      </td>
      {items.map((item) => (
        <td key={item.id} className="py-5 px-4 font-light text-[12px] leading-relaxed text-center">
          {extractor(item)}
        </td>
      ))}
    </tr>
  );
}
