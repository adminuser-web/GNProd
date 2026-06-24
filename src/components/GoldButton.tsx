import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType | string;
  to?: string;
  href?: string;
  target?: string;
  rel?: string;
  variant?: 'solid' | 'outline';
  className?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  [key: string]: any;
}

export function GoldButton({
  as: Component = 'button',
  variant = 'outline',
  className,
  isLoading,
  children,
  disabled,
  ...props
}: GoldButtonProps) {
  const baseClasses = "inline-flex justify-center items-center gap-2 px-10 py-5 text-[12px] font-bold tracking-[0.3em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-95 motion-reduce:transition-none disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    // Both variants reach the same hover state, but start differently
    solid: "bg-[#c5a059] text-[#1a1a1a] border border-[#c5a059] hover:bg-[#e6c882] hover:border-[#e6c882]",
    outline: "bg-transparent text-[#c5a059] border border-[#c5a059] hover:bg-[#c5a059] hover:text-[#1a1a1a]"
  };

  return (
    <Component 
      className={twMerge(baseClasses, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props as any}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </Component>
  );
}
