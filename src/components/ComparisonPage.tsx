import React, { useEffect, useState } from 'react';
import { useProducts } from '../context/ProductsContext';
import { GoldButton } from './GoldButton';
import { RevealSection } from './Reveal';
import { Link } from 'react-router-dom';
import { Check, X, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { Product } from '../types';

export function ComparisonPage() {
  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState<'series' | 'subseries'>('series');

  useEffect(() => {
    document.title = "Compare Series — Grainood";
  }, []);

  if (!products || products.length === 0) {
    return <div className="min-h-screen pt-32 pb-20 px-4 text-center">Loading...</div>;
  }

  // Ensure products are sorted by sortOrder
  const sortedProducts = [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const extractSpec = (p: Product, spec: string) => {
    if (spec === 'price') return `From ₹${p.price?.toLocaleString()}`;
    if (spec === 'grade') return p.gradeLabel || p.grade || 'N/A';
    if (spec === 'weightRange') return p.weightRange || 'N/A';
    if (spec === 'grains') return p.grains || 'N/A';
    if (spec === 'performance.power') return p.performanceMetrics?.power || 'N/A';
    if (spec === 'performance.pickup') return p.performanceMetrics?.pickup || 'N/A';
    if (spec === 'customization') return p.customizationGroups ? `${p.customizationGroups.length} options` : 'Standard';
    return '';
  };

  const getSubSeriesGrid = () => {
    const allSubSeries: any[] = [];
    sortedProducts.forEach(p => {
       if (p.subSeries && p.subSeries.length > 0) {
          p.subSeries.forEach(s => {
             allSubSeries.push({ ...s, parentName: p.name });
          });
       }
    });

    if (allSubSeries.length === 0) {
       return <div className="text-center py-20 text-muted uppercase tracking-widest text-sm">No sub-series data available.</div>;
    }

    return (
       <div>
         <div className="md:hidden space-y-6">
           {allSubSeries.map((s) => (
             <div key={s.id} className="bg-surface border border-[#c5a059]/20 p-6 flex flex-col gap-2">
               <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#c5a059] block mb-1">{s.parentName}</span>
                    <h3 className="text-lg font-bold tracking-widest uppercase text-content">{s.name}</h3>
                  </div>
                  <span className="text-sm font-bold text-content">₹{s.basePrice?.toLocaleString()}</span>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-4 border-t border-[#c5a059]/10 pt-4 text-xs">
                 <div>
                   <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Willow Grade</span>
                   <span className="text-content">{s.grade || s.specs?.willowGrade || 'N/A'}</span>
                 </div>
                 <div>
                   <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Grains</span>
                   <span className="text-content">{s.specs?.grains || 'N/A'}</span>
                 </div>
                 <div>
                   <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Weight Range</span>
                   <span className="text-content">{s.specs?.weightRange || 'N/A'}</span>
                 </div>
                 <div>
                   <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Sweet Spot</span>
                   <span className="text-content">{s.specs?.sweetSpot || 'N/A'}</span>
                 </div>
                 <div className="col-span-2 pt-2 border-t border-[#c5a059]/10 mt-2">
                   <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Delivery</span>
                   <span className="text-content">{s.estimatedDeliveryDays} days</span>
                 </div>
               </div>
             </div>
           ))}
         </div>

         <div className="hidden md:block overflow-x-auto hide-scrollbar border border-[#c5a059]/20 bg-surface/30">
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                  <tr className="bg-bg border-b border-[#c5a059]/20 text-[10px] tracking-[0.2em] font-bold uppercase text-muted">
                     <th className="p-4 border-r border-[#c5a059]/10">Series</th>
                     <th className="p-4 border-r border-[#c5a059]/10">Model</th>
                     <th className="p-4 border-r border-[#c5a059]/10">Price</th>
                     <th className="p-4 border-r border-[#c5a059]/10">Willow Grade</th>
                     <th className="p-4 border-r border-[#c5a059]/10">Grains</th>
                     <th className="p-4 border-r border-[#c5a059]/10">Weight Range</th>
                     <th className="p-4 border-r border-[#c5a059]/10">Sweet Spot</th>
                     <th className="p-4">Delivery</th>
                  </tr>
               </thead>
               <tbody>
                  {allSubSeries.map((s, i) => (
                     <tr key={s.id} className={clsx("border-b border-[#c5a059]/5 hover:bg-[#c5a059]/5 transition-colors", i % 2 === 0 ? "bg-transparent" : "bg-bg/20")}>
                        <td className="p-4 border-r border-[#c5a059]/10 text-xs font-bold uppercase tracking-widest text-premium-gold-text">{s.parentName}</td>
                        <td className="p-4 border-r border-[#c5a059]/10 text-sm font-bold uppercase tracking-wider text-content">{s.name}</td>
                        <td className="p-4 border-r border-[#c5a059]/10 text-xs text-content">₹{s.basePrice?.toLocaleString()}</td>
                        <td className="p-4 border-r border-[#c5a059]/10 text-xs text-muted">{s.grade || s.specs?.willowGrade || 'N/A'}</td>
                        <td className="p-4 border-r border-[#c5a059]/10 text-xs text-muted">{s.specs?.grains || 'N/A'}</td>
                        <td className="p-4 border-r border-[#c5a059]/10 text-xs text-muted">{s.specs?.weightRange || 'N/A'}</td>
                        <td className="p-4 border-r border-[#c5a059]/10 text-xs text-muted">{s.specs?.sweetSpot || 'N/A'}</td>
                        <td className="p-4 text-xs text-muted">{s.estimatedDeliveryDays} days</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
       </div>
    );
  };

  return (
    <div className="bg-bg text-content min-h-screen font-sans pt-24 pb-20 selection:bg-[#c5a059] selection:text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        <Link to="/collection" className="inline-flex items-center text-[10px] tracking-widest uppercase text-muted hover:text-[#c5a059] transition-colors mb-8">
          <ArrowLeft className="w-3 h-3 mr-2" /> Back to Collection
        </Link>

        <RevealSection>
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-black tracking-[0.2em] uppercase text-content mb-4 px-2">Compare Models</h1>
            <div className="h-px w-24 bg-[#c5a059] mx-auto mb-6"></div>
            <p className="text-muted/80 text-sm md:text-base leading-relaxed tracking-wide max-w-2xl mx-auto">
              Find the perfect match for your batting style. Compare specifications, willow grades, and pickup profiles across our English Willow range.
            </p>
          </div>

          <div className="flex justify-center mb-10">
             <div className="flex bg-surface border border-[#c5a059]/20 p-1 rounded-sm">
                <button
                   onClick={() => setActiveTab('series')}
                   className={clsx(
                      "px-6 py-2 text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors rounded-sm",
                      activeTab === 'series' ? "bg-[#c5a059] text-bg" : "text-muted hover:text-content"
                   )}
                >
                   Series Overview
                </button>
                <button
                   onClick={() => setActiveTab('subseries')}
                   className={clsx(
                      "px-6 py-2 text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors rounded-sm",
                      activeTab === 'subseries' ? "bg-[#c5a059] text-bg" : "text-muted hover:text-content"
                   )}
                >
                   Detailed Models
                </button>
             </div>
          </div>
        </RevealSection>

        <RevealSection delay={100}>
           {activeTab === 'series' && (
             <div>
               {/* Desktop Table View */}
               <div className="hidden md:block overflow-x-auto hide-scrollbar border border-[#c5a059]/20 bg-surface/30">
                 <table className="w-full text-center border-collapse min-w-[900px]">
                   <thead>
                     <tr className="bg-bg">
                       <th className="p-6 border-b border-r border-[#c5a059]/20 text-left w-64 min-w-[200px]">
                         <span className="text-[10px] font-bold tracking-widest uppercase text-muted">Specifications</span>
                       </th>
                       {sortedProducts.map(p => (
                         <th key={p.id} className="p-6 border-b border-r last:border-r-0 border-[#c5a059]/20 w-48 align-bottom">
                           <div className="flex flex-col items-center gap-3">
                             {p.badge && (
                                <span className="px-2 py-0.5 bg-[#c5a059]/10 text-premium-gold-text text-[9px] font-bold tracking-widest uppercase border border-[#c5a059]/20">
                                   {p.badge}
                                </span>
                             )}
                             <h3 className="text-lg font-bold tracking-[0.2em] uppercase text-content">{p.name}</h3>
                             <p className="text-[9px] tracking-widest uppercase text-muted">{p.tier}</p>
                             <GoldButton as={Link} to={`/collection/${p.slug}`} className="mt-2 w-full text-[9px] py-2 px-0">
                               VIEW
                             </GoldButton>
                           </div>
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {[
                       { label: 'Starting Price', key: 'price' },
                       { label: 'Willow Grade', key: 'grade' },
                       { label: 'Grains', key: 'grains' },
                       { label: 'Weight Range', key: 'weightRange' },
                       { label: 'Power Rating (Max 100)', key: 'performance.power' },
                       { label: 'Pickup Rating (Max 100)', key: 'performance.pickup' },
                       { label: 'Customization Levels', key: 'customization' }
                     ].map((row, idx) => (
                       <tr key={row.key} className={clsx("border-b border-[#c5a059]/5 hover:bg-[#c5a059]/5 transition-colors", idx % 2 === 0 ? "bg-transparent" : "bg-bg/20")}>
                         <td className="p-4 px-6 border-r border-[#c5a059]/10 text-left text-xs font-bold tracking-widest uppercase text-muted">
                           {row.label}
                         </td>
                         {sortedProducts.map(p => (
                           <td key={p.id} className="p-4 border-r last:border-r-0 border-[#c5a059]/10 text-sm text-content/90">
                             {extractSpec(p, row.key)}
                           </td>
                         ))}
                       </tr>
                     ))}
                     {/* Ideal For Row */}
                     <tr>
                         <td className="p-4 px-6 border-r border-[#c5a059]/10 text-left text-xs font-bold tracking-widest uppercase text-muted bg-[#c5a059]/10">
                           Ideal For
                         </td>
                         {sortedProducts.map(p => (
                           <td key={p.id} className="p-4 border-r last:border-r-0 border-[#c5a059]/10 text-xs italic tracking-wide text-content/70 bg-[#c5a059]/5">
                             {p.idealFor}
                           </td>
                         ))}
                     </tr>
                   </tbody>
                 </table>
               </div>

               {/* Mobile Cards View */}
               <div className="md:hidden space-y-6">
                 {sortedProducts.map(p => (
                   <div key={p.id} className="bg-surface border border-[#c5a059]/20 flex flex-col p-6">
                      <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-[#c5a059]/10">
                         {p.badge && (
                            <span className="self-start px-2 py-0.5 bg-[#c5a059]/10 text-premium-gold-text text-[9px] font-bold tracking-widest uppercase border border-[#c5a059]/20 mb-2">
                               {p.badge}
                            </span>
                         )}
                         <h3 className="text-xl font-bold tracking-[0.2em] uppercase text-content">{p.name}</h3>
                         <p className="text-[10px] tracking-widest uppercase text-muted">{p.tier}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs mb-6">
                        {[
                          { label: 'Starting Price', key: 'price' },
                          { label: 'Willow Grade', key: 'grade' },
                          { label: 'Grains', key: 'grains' },
                          { label: 'Weight Range', key: 'weightRange' },
                          { label: 'Power (Max 100)', key: 'performance.power' },
                          { label: 'Pickup (Max 100)', key: 'performance.pickup' },
                          { label: 'Customization', key: 'customization' }
                        ].map(row => (
                           <div key={row.key} className="flex flex-col px-2 py-1 mb-1 border-b border-[#c5a059]/5 pb-2">
                             <span className="text-[9px] uppercase tracking-widest text-[#c5a059] mb-1 leading-tight">{row.label}</span>
                             <span className="text-content font-medium">{extractSpec(p, row.key)}</span>
                           </div>
                        ))}
                        <div className="flex flex-col px-2 py-1 col-span-2 mt-2 bg-[#c5a059]/5 p-3 border border-[#c5a059]/10">
                           <span className="text-[9px] uppercase tracking-widest text-[#c5a059] mb-1">Ideal For</span>
                           <span className="text-content italic font-medium">{p.idealFor}</span>
                        </div>
                      </div>
                      <GoldButton as={Link} to={`/collection/${p.slug}`} className="w-full text-center min-h-[44px]">
                        View Details
                      </GoldButton>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'subseries' && getSubSeriesGrid()}
        </RevealSection>

        <RevealSection delay={200} className="mt-16 bg-elevated border border-[#c5a059]/20 p-8 md:p-12 text-center max-w-4xl mx-auto">
           <h3 className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase text-content mb-4">Still Not Sure?</h3>
           <p className="text-content/80 text-sm leading-relaxed max-w-lg mx-auto mb-8 font-light">
             Our AI Bat Consultant analyzes your playing level, style, budget, and pitch preferences to recommend the perfect bat for your game.
           </p>
           <GoldButton as={Link} to="/bat-consultant" variant="solid" className="px-8 gap-3">
             START CONSULTATION
           </GoldButton>
        </RevealSection>
      </div>
    </div>
  );
}
