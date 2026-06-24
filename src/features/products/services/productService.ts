import { collection, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Product } from '../../../types';
import { seedProducts as seedLibProducts } from '../../../lib/seedProducts';
import { PUBLISHED_PRODUCTS } from '../../../types';
import { auditService } from '../../audit/services/auditService';

export const productService = {
  async fetchProducts(): Promise<Product[]> {
    const q = query(collection(db, 'products'), orderBy('sortOrder'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      let products = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        subSeries: doc.data().subSeries || []
      })) as Product[];

      // General deduplication based on slug
      const slugsSeen = new Set<string>();
      const trueDuplicates: Product[] = [];
      const distinctProducts: Product[] = [];
      
      for (const p of products) {
        if (slugsSeen.has(p.slug)) {
          trueDuplicates.push(p);
        } else {
          slugsSeen.add(p.slug);
          distinctProducts.push(p);
        }
      }
      
      products = distinctProducts;

      if (trueDuplicates.length > 0) {
        // Fire and forget delete using deleteDoc
        import('firebase/firestore').then(({ deleteDoc }) => {
          trueDuplicates.forEach(dup => {
            deleteDoc(doc(db, 'products', dup.id)).catch(err => {
              console.error(`Failed to delete duplicate product ${dup.id}:`, err);
            });
          });
        });
      }

      // Migration for old customization group IDs
      const KEY_MAP: Record<string, string> = {
        batSize: 'bat-size',
        toeShape: 'toe-shape',
        gripColor: 'grip-color',
        gripColour: 'grip-color',
        handleShape: 'handle-shape',
        weightProfile: 'weight-profile',
        edgeProfile: 'edge-profile',
        sweetSpot: 'sweet-spot',
        preKnocked: 'pre-knocked'
      };

      for (const product of products) {
        let needsUpdate = false;
        
        // Customization migration
        if (product.customizationGroups) {
          product.customizationGroups.forEach(group => {
            if (KEY_MAP[group.id]) {
              group.id = KEY_MAP[group.id];
              needsUpdate = true;
            }
          });
        }

        // SubSeries migration
        if (!product.subSeries || product.subSeries.length === 0) {
          const defaultProduct = PUBLISHED_PRODUCTS.find(p => p.slug === product.slug);
          if (defaultProduct && defaultProduct.subSeries && defaultProduct.subSeries.length > 0) {
            product.subSeries = defaultProduct.subSeries;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          // Fire and forget migration self-heal; not an admin edit, so don't audit.
          productService.updateProduct(product.slug, product, { audit: false }).catch(err => {
            console.error(`Failed to migrate product ${product.slug}:`, err);
          });
        }
      }

      return products;
    }
    
    return [];
  },

  async isCollectionEmpty(): Promise<boolean> {
    const snap = await getDocs(collection(db, 'products'));
    return snap.empty;
  },

  async updateProduct(slug: keyof Product | string, productData: Partial<Product>, opts?: { audit?: boolean }): Promise<void> {
    const cleanData = JSON.parse(JSON.stringify(productData));
    await setDoc(doc(db, 'products', slug as string), cleanData, { merge: true });
    // Skip auditing the fetch-time self-heal; audit only real admin saves.
    if (opts?.audit !== false) {
      await auditService.writeAudit({
        action: 'product_updated',
        entityType: 'product',
        entityId: slug as string,
        after: { fields: Object.keys(productData || {}) },
      });
    }
  },

  async seedProducts(force = false): Promise<void> {
    await seedLibProducts(force);
  }
};

