import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'card' | 'product';
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = "bg-[#c5a059]/10 animate-pulse motion-reduce:animate-none relative overflow-hidden";
  
  const variants = {
    rectangular: "rounded-sm",
    circular: "rounded-full",
    text: "rounded-sm h-4 w-3/4",
    card: "rounded-sm h-48",
    product: "rounded-sm h-[400px]"
  };

  return (
    <div className={clsx(baseClasses, variants[variant], className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] motion-reduce:animate-none bg-gradient-to-r from-transparent via-[#c5a059]/5 to-transparent border-t border-b border-[#c5a059]/5" />
    </div>
  );
}

export function SkeletonTextLines({ lines = 3, className }: { lines?: number, className?: string }) {
  return (
    <div className={clsx("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          className={clsx(
            "h-3",
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )} 
        />
      ))}
    </div>
  );
}
