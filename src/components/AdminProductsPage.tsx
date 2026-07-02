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
    <div className="pb-10">
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
        <RevealSection delay={100} className="bg-surface border border-red-500/20 p-16 text-center shadow-sm rounded-xl">
          <h3 className="text-xl font-bold tracking-[0.15em] uppercase mb-4 text-red-500">Error Loading Series</h3>
          <p className="text-muted mb-8 max-w-md mx-auto text-sm">{productsError?.message || checkError}</p>
          <GoldButton onClick={() => window.location.reload()} variant="outline">
            Retry Connection
          </GoldButton>
        </RevealSection>
      ) : products.length === 0 && !collectionEmpty ? (
        <div className="bg-surface border border-line rounded-xl">
          <EmptyState icon={Box} title="No series found" description="Seed the catalogue from the Danger Zone, or check your connection." />
        </div>
      ) : (
        <RevealSection delay={50}>
          <div className="rounded-xl border border-line overflow-hidden">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] font-bold text-muted bg-bg border-b border-line">
              <div className="col-span-5">Series</div>
              <div className="col-span-3">Grade</div>
              <div className="col-span-2 text-center">Variants</div>
              <div className="col-span-2 text-right">Completion</div>
            </div>

            <div className="divide-y divide-line">
              {products.map((p) => {
                const count = p.subSeries?.length || 0;
                const activeCount = p.subSeries?.filter(s => s.active)?.length || 0;
                const gradeLabel = p.gradeLabel || p.subSeries?.[0]?.gradeLabel || 'Grade 1';
                const gradeText = p.subSeries?.[0]?.specs?.willowGrade || `${gradeLabel} English Willow`;

                let totalFields = 0;
                let filledFields = 0;
                p.subSeries?.forEach(sub => {
                  totalFields += 12;
                  if (sub.name) filledFields++;
                  if (sub.slug) filledFields++;
                  if (sub.sku) filledFields++;
                  if (sub.gradeLabel || sub.grade) filledFields++;
                  if (typeof sub.basePrice === 'number' && sub.basePrice > 0) filledFields++;
                  if (sub.media?.primaryImage) filledFields++;
                  if (sub.shortDescription) filledFields++;
                  if (typeof sub.estimatedDeliveryDays === 'number') filledFields++;
                  if (typeof sub.warrantyMonths === 'number') filledFields++;
                  if (sub.specs && Object.keys(sub.specs).length > 5) filledFields++;
                  if (sub.performance && Object.keys(sub.performance).length > 2) filledFields++;
                  if (sub.customizationGroups && sub.customizationGroups.length > 0) filledFields++;
                });
                const completion = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

                return (
                  <Link key={p.id || p.slug} to={`/admin/products/${p.slug}`} className="block px-4 py-3 hover:bg-[#c5a059]/[0.04] transition-colors group">
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5 min-w-0 leading-tight">
                        <span className="block text-sm font-bold tracking-[0.15em] uppercase text-content group-hover:text-[#c5a059] transition-colors truncate">{p.name}</span>
                        {p.tagline && <span className="block text-[10px] text-muted truncate mt-0.5">{p.tagline}</span>}
                      </div>
                      <div className="col-span-3 min-w-0 leading-tight">
                        <span className="block text-xs text-content">{gradeLabel}</span>
                        <span className="block text-[10px] text-muted truncate mt-0.5">{gradeText}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-xs font-mono text-content">{activeCount}<span className="text-muted">/{count} active</span></span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-3">
                        <span className={`text-xs font-mono ${completion === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{completion}%</span>
                        <ChevronRight size={16} className="text-muted group-hover:text-[#c5a059] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div className="md:hidden space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold tracking-[0.15em] uppercase text-content truncate">{p.name}</span>
                        <span className={`text-xs font-mono shrink-0 ${completion === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{completion}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[10px] text-muted">
                        <span className="truncate">{gradeLabel} · {gradeText}</span>
                        <span className="shrink-0 font-mono">{activeCount}/{count} active</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </RevealSection>
      )}
    </div>
  );
}
