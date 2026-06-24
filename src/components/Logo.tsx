import React from 'react';

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 225 130" 
      fill="currentColor" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Grainood Logo"
      role="img"
    >
      <path d="M 35 110 L 100 110 L 100 60 L 60 60 L 60 75 L 75 75 L 75 85 L 56 85 L 45 65 L 56 45 L 100 45 L 100 20 L 35 20 L 9 65 Z" />
      <path d="M 110 110 L 110 20 L 135 20 L 165 72 L 165 20 L 190 20 L 216 65 L 190 110 L 165 110 L 135 58 L 135 110 Z" />
    </svg>
  );
}
