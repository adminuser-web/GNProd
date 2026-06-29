import { supabase } from '../../../lib/supabase';
import { Product, PUBLISHED_PRODUCTS } from '../../../types';
import { auditService } from '../../audit/services/auditService';

// The catalog is stored as documents: one row per series, with the full nested
// Product object in `data` (matches the app's model).
export const productService = {
  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    // Ignore rows without a `data` document (e.g. pre-migration schema) so the
    // context falls back to bundled products instead of rendering broken objects.
    return (data ?? [])
      .filter((r: any) => r.data && typeof r.data === 'object')
      .map((r: any) => ({ ...(r.data as Product), id: r.id }));
  },

  async updateProduct(slug: string, productData: Partial<Product>, opts?: { audit?: boolean }): Promise<void> {
    // Editors send partial updates (e.g. { subSeries }); merge into the existing
    // document so other fields are preserved.
    const { data: existing } = await supabase
      .from('products')
      .select('data')
      .eq('id', slug)
      .maybeSingle();

    const merged: any = { ...(existing?.data ?? {}), ...productData, slug };

    const { error } = await supabase.from('products').upsert({
      id: slug,
      slug,
      sort_order: merged.sortOrder ?? 0,
      data: merged,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    if (opts?.audit !== false) {
      await auditService.writeAudit({
        action: 'product_updated',
        entityType: 'product',
        entityId: slug,
        after: { fields: Object.keys(productData || {}) },
      });
    }
  },

  async isCollectionEmpty(): Promise<boolean> {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return (count ?? 0) === 0;
  },

  /** Seed the catalog from the bundled defaults (admin-only via RLS). */
  async seedProducts(force = false): Promise<void> {
    if (!force) {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });
      if ((count ?? 0) > 0) return;
    }
    const rows = (PUBLISHED_PRODUCTS as any[]).map((p) => ({
      id: p.slug,
      slug: p.slug,
      sort_order: p.sortOrder ?? 0,
      data: p,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('products').upsert(rows);
    if (error) throw error;
  },
};
