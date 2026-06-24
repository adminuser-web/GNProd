import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemedImage } from '../types';
import { useThemedImage } from '../hooks/useThemedImage';

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  containerClassName?: string;
  src: ThemedImage;
  fallbackSrc?: ThemedImage;
  alt: string;
  className?: string;
  optimizeWidth?: number;
}

function getOptimizedUrl(url: string, width?: number) {
  if (!url || !width) return url;
  if (url.includes('unsplash.com')) {
    const urlObj = new URL(url);
    urlObj.searchParams.set('w', width.toString());
    return urlObj.toString();
  }
  // For other CDNs (like Shopify, Cloudinary) standard params could be added here later
  return url;
}

export function LazyImage({ className, containerClassName, alt, src, fallbackSrc, optimizeWidth, ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  
  const resolvedSrc = useThemedImage(src);
  const resolvedFallbackSrc = useThemedImage(fallbackSrc);

  React.useEffect(() => {
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalHeight === 0) {
        setHasError(true);
      } else {
        setIsLoaded(true);
      }
    }
  }, [resolvedSrc, resolvedFallbackSrc]);

  const currentSrc = getOptimizedUrl(hasError && resolvedFallbackSrc ? resolvedFallbackSrc : resolvedSrc, optimizeWidth);

  return (
    <div className={twMerge("relative overflow-hidden bg-elevated", containerClassName)}>
      {/* Shimmer Placeholder */}
      <div 
        className={clsx(
          "absolute inset-0 bg-gradient-to-r from-elevated via-surface to-elevated bg-[length:200%_100%] transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100 pointer-events-none animate-[shimmer_1.5s_infinite] motion-reduce:animate-none"
        )}
      />
      
      {/* Actual Image */}
      <img
        {...props}
        src={currentSrc || undefined}
        ref={imgRef}
        alt={alt}
        loading={props.loading || "lazy"}
        decoding={props.decoding || "async"}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError && fallbackSrc) {
            setHasError(true);
          }
        }}
        className={twMerge(
          "transition-opacity duration-700 ease-in-out max-w-full",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}
