import React, { useState, useRef, useEffect } from 'react';
import { ThemedImage } from '../types';
import { useThemedImage } from '../hooks/useThemedImage';

export interface ScrimImageProps {
  src?: ThemedImage;
  placeholderSrc?: ThemedImage;
  alt: string;
  className?: string; // Appended to the wrapper
  imageClassName?: string; // Appended to the image
  scrim?: string; // CSS background value for the scrim, e.g. "linear-gradient(to top, rgba(10,10,10,0.9), transparent)"
  priority?: boolean;
}

export function ScrimImage({ 
  src, 
  placeholderSrc, 
  alt, 
  className = "", 
  imageClassName = "", 
  scrim = "linear-gradient(to top, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.35) 55%, rgba(8,8,10,0.1) 100%)",
  priority = false
}: ScrimImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const resolvedSrc = useThemedImage(src);
  const resolvedPlaceholderSrc = useThemedImage(placeholderSrc);
  
  const imageSrc = resolvedSrc || resolvedPlaceholderSrc;

  useEffect(() => {
    // If the image is loaded from cache before React attaches onLoad, set loaded to true.
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [imageSrc]);

  // We use bg-bg as fallback loading color which matches the dark theme.
  return (
    <div className={`relative overflow-hidden bg-bg ${className}`}>
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...(priority ? { fetchPriority: "high" } : {})}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
        />
      )}
      {scrim && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ background: scrim }}
        />
      )}
    </div>
  );
}

