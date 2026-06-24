import React, { useEffect, useRef, useState } from 'react';

export function useInView(options: { once?: boolean; threshold?: number; rootMargin?: string } = {}) {
  const { once = true, threshold = 0.15, rootMargin = '0px 0px -50px 0px' } = options;
  const ref = useRef<any>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once && ref.current) observer.unobserve(ref.current);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);

  return { ref, inView };
}

// Keeping this for backwards compatibility if needed, but we'll export Reveal main component
export function useScrollReveal() {
  return useInView({ once: true });
}

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: React.ElementType;
}

export const Reveal: React.FC<RevealProps> = ({ children, className = "", delay = 0, as: Component = "div" }) => {
  const { ref, inView } = useInView({ once: true });
  
  return (
    <Component 
      ref={ref} 
      className={`motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-out motion-safe:fill-mode-forwards ${inView ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-4'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
};

export const RevealSection = Reveal;

export function useParallax(speed: number = 0.5, clamp: number = 20) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768; // disabled on small screens
    if (isReducedMotion || isMobile) return;

    let rafId: number;

    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      
      const distance = centerY - viewportCenter;
      let y = distance * speed;
      
      if (y > clamp) y = clamp;
      if (y < -clamp) y = -clamp;

      rafId = requestAnimationFrame(() => {
         if (ref.current) {
            ref.current.style.transform = `translateY(${y}px)`;
         }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [speed, clamp]);

  return ref;
}
