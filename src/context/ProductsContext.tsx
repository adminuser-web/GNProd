import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, PUBLISHED_PRODUCTS } from '../types';
import { productService } from '../features/products/services/productService';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: Error | null;
  getBySlug: (slug: string) => Product | undefined;
  refresh: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PUBLISHED_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedProducts = await productService.fetchProducts();
      
      if (fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
      } else {
        // Fall back to hardcoded if collection is empty
        setProducts(PUBLISHED_PRODUCTS);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      // Fall back in case of error
      setProducts(PUBLISHED_PRODUCTS);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getBySlug = (slug: string) => {
    return products.find(p => p.slug === slug);
  };

  return (
    <ProductsContext.Provider value={{ products, loading, error, getBySlug, refresh: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}
