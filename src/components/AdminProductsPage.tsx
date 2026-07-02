import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, ChevronRight } from 'lucide-react';
import { RevealSection } from './Reveal';
import { GoldButton } from './GoldButton';
import { useProducts } from '../context/ProductsContext';
import { productService } from '../features/products/services/productService';
import { toast } from 'sonner';
import { PageHeader, EmptyState } from './admin/ui';

export function AdminProductsPage() {
  const { products, refresh, loading: productsLoading, error: productsError } = useProducts();
  const [checkingEmpty, setCheckingEmpty] = useState(true);
  const [collectionEmpty, setCollectionEmpty] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Products Master — Admin";
  }, []);

  useEffect(() => {
    const checkCollection = async () => {
      setCheckError(null);
      try {
        const isEmpty = await productService.isCollectionEmpty();
        setCollectionEmpty(isEmpty);
      } catch (e: any) {
        console.error("Error checking products collection:", e);
        setCheckError(`Failed to check if collection is empty: ${e.message}`);
      }
      setCheckingEmpty(false);
    };
    checkCollection();
  }, []);

  const handleSeed = async () => {
    const confirmText = window.prompt("Type 'RESET PRODUCTS' to confirm destructive seed:");
    if (confirmText !== "RESET PRODUCTS") {
      toast.error("Seed cancelled.");
      return;
    }
    try {
      await productService.seedProducts(true);
      await refresh();
      setCollectionEmpty(false);
      toast.success('Seeded successfully with new Series Model!');
    } catch (e: any) {
      toast.error(`Error seeding: ${e.message}`);
    }
  };

  if (checkingEmpty) return null;

  return (
    <div className="pb-16">
      <RevealSection>
        <PageHeader eyebrow="Catalogue" title="Series Architecture" description="The Grainood collection — English Willow only." />
        {import.meta.env.MODE !== 'production' && (
          <details className="-mt-2 mb-5 group">
            <summary className="text-[10px] text-red-500 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              Danger Zone
            </summary>
            <div className="pt-4 mt-2 border-t border-red-500/20">
              <GoldButton onClick={handleSeed} variant="outline" className="px-4 py-2 text-[10px] border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                Reset & Seed Series DB
              </GoldButton>
              <p className="text-[9px] text-red-400/80 mt-2 uppercase tracking-widest">This will destroy all current catalogue data.</p>
            </div>
          </details>
        )}
      </RevealSection>

      {productsLoading && !collectionEmpty ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : productsError || checkError ? (
        <RevealSection delay={100} className="bg-surface border border-red-500/20 p-16 text-center shadow-sm">
          <h3 className="text-xl font-bold tracking-[0.15em] uppercase mb-4 text-red-500">Error Loading Series</h3>
          <p className="text-muted mb-8 max-w-md mx-auto text-sm">{productsError?.message || checkError}</p>
          <GoldButton onClick={() => window.location.reload()} variant="outline">
            Retry Connection
          </GoldButton>
        </RevealSection>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, i) => {
            const count = p.subSeries?.length || 0;
            const activeCount = p.subSeries?.filter(s => s.active)?.length || 0;
            let gradeLabel = p.gradeLabel || p.subSeries?.[0]?.gradeLabel || 'Grade 1';
            let gradeText = p.subSeries?.[0]?.specs?.willowGrade || `${gradeLabel} English Willow`;

            let totalSubSeriesFields = 0;
            let filledSubSeriesFields = 0;
            
            p.subSeries?.forEach(sub => {
               totalSubSeriesFields += 12;
               if (sub.name) filledSubSeriesFields++;
               if (sub.slug) filledSubSeriesFields++;
               if (sub.sku) filledSubSeriesFields++;
               if (sub.gradeLabel || sub.grade) filledSubSeriesFields++;
               if (typeof sub.basePrice === 'number' && sub.basePrice > 0) filledSubSeriesFields++;
               if (sub.media?.primaryImage) filledSubSeriesFields++;
               if (sub.shortDescription) filledSubSeriesFields++;
               if (typeof sub.estimatedDeliveryDays === 'number') filledSubSeriesFields++;
               if (typeof sub.warrantyMonths === 'number') filledSubSeriesFields++;
               if (sub.specs && Object.keys(sub.specs).length > 5) filledSubSeriesFields++;
               if (sub.performance && Object.keys(sub.performance).length > 2) filledSubSeriesFields++;
               if (sub.customizationGroups && sub.customizationGroups.length > 0) filledSubSeriesFields++;
            });

            const completionScore = totalSubSeriesFields > 0 ? Math.round((filledSubSeriesFields / totalSubSeriesFields) * 100) : 0;


            return (
              <RevealSection key={p.id || p.slug} delay={i * 100}>
                <Link to={`/admin/products/${p.slug}`} className="block group h-full">
                  <div className="bg-surface border border-[#c5a059]/10 p-4 shadow-sm group-hover:border-[#c5a059]/30 transition-colors h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold tracking-[0.2em] uppercase text-content text-lg mb-1">{p.name}</h3>
                        <span className="text-[10px] text-muted tracking-widest uppercase">{p.tagline}</span>
                      </div>
                      <Box size={20} className="text-[#c5a059]/50 group-hover:text-[#c5a059] transition-colors" />
                    </div>

                    <div className="mb-4">
                       <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold tracking-widest text-[#c5a059] uppercase">{gradeLabel}</p>
                          {totalSubSeriesFields > 0 && (
                            <span className={`text-[10px] tracking-widest font-mono ${completionScore === 100 ? 'text-green-500' : 'text-amber-500'}`}>
                              SCORE {completionScore}%
                            </span>
                          )}
                       </div>
                       <p className="text-[10px] text-muted tracking-wide mt-1">{gradeText}</p>
                    </div>

                    <div className="mt-auto flex justify-between items-end">
                       <div>
                         <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Products</p>
                         <p className="text-sm font-bold tracking-wider text-content">{count} variants</p>
                         <p className="text-[10px] text-content/70 tracking-widest uppercase mt-1">{activeCount} Active / {count} Total</p>
                       </div>
                       <ChevronRight size={20} className="text-muted group-hover:text-[#c5a059] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              </RevealSection>
            );
          })}
          {products.length === 0 && !collectionEmpty && (
            <div className="col-span-full bg-surface border border-[#c5a059]/20">
              <EmptyState icon={Box} title="No series found" description="Seed the catalogue from the Danger Zone, or check your connection." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
