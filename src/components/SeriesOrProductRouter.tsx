import React, { lazy } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { Skeleton, SkeletonTextLines } from './Skeleton';

const ProductPage = lazy(() => import('./ProductPage').then(m => ({ default: m.ProductPage })));
const SeriesPage = lazy(() => import('./SeriesPage').then(m => ({ default: m.SeriesPage })));

export function SeriesOrProductRouter() {
  const { seriesSlug } = useParams<{ seriesSlug: string }>();
  const { getBySlug, loading } = useProducts();
  
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
            <SkeletonTextLines lines={4} className="mb-8" />
            <Skeleton variant="rectangular" className="h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const series = getBySlug(seriesSlug || '');
  
  if (!series || series.active === false) {
    return <Navigate to="/collection" replace />;
  }

  if (!series.subSeries || series.subSeries.length === 0) {
    // Configurator for Immortal
    return <ProductPage />;
  }

  return <SeriesPage series={series} />;
}
