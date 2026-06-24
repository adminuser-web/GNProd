import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { RevealSection, useScrollReveal } from './Reveal';
import { GoldButton } from './GoldButton';
import { LazyImage } from './LazyImage';

function AnimatedCounter({ end, duration = 1500, label, suffix = "" }: { end: number, duration?: number, label: string, suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useScrollReveal();
  
  useEffect(() => {
    if (inView) {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [inView, end, duration]);

  return (
    <div ref={ref} className="flex flex-col items-center p-6 bg-elevated border border-[#c5a059]/20">
      <div className="text-4xl md:text-5xl font-light text-[#c5a059] tracking-wider mb-4">
        {count}{suffix}
      </div>
      <div className="text-muted text-[10px] tracking-[0.3em] uppercase text-center">{label}</div>
    </div>
  );
}

function TestimonialRotator({ testimonials }: { testimonials: any[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!testimonials || testimonials.length === 0) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials?.length]);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <div className="relative h-64 md:h-48 max-w-4xl mx-auto flex items-center justify-center">
      {testimonials.map((t, i) => (
        <div 
          key={i} 
          className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-1000 ${i === index ? 'opacity-100 z-raised' : 'opacity-0 z-base'}`}
        >
          <div className="text-[#c5a059] text-6xl font-serif leading-none h-8 mb-4 opacity-40">"</div>
          <p className="text-content text-xl md:text-2xl font-light italic leading-relaxed mb-8">
            {t.text}
          </p>
          <p className="text-muted text-[11px] font-bold tracking-[0.3em] uppercase">
            — {t.name}
          </p>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { title: "Cleft Selection", text: "Only the top 5% of English willow makes the cut. Hand-picked for straight, unblemished grains." },
  { title: "Air Drying", text: "Clefts are naturally air-dried for 12 months, allowing moisture to escape slowly for pure resonance." },
  { title: "Hand Pressing", text: "Each face is rolled with calculating pressure, maximizing the ping while ensuring lasting durability." },
  { title: "Shaping", text: "Traditional draw knives remove exact ribbons of wood, finding the supreme balance point and pickup." },
  { title: "Finishing", text: "Sanded to perfection, bone-rubbed, and oiled. An absolute masterpiece ready to dominate." }
];

export function PhilosophyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const philosophyContent = useContent('philosophy');
  const reviewsContent = useContent('reviews');

  useEffect(() => {
    document.title = "Philosophy — Grainood";

    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Total height that can be scrolled through the element
        const totalHeight = rect.height;
        const scrolled = (windowHeight / 2) - rect.top; // Progress relative to center of screen
        const boundedProgress = Math.max(0, Math.min(1, scrolled / totalHeight));
        setScrollProgress(boundedProgress);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans xl:pt-20 pt-20">

      {/* 1. HERO */}
      <section className="relative h-[60vh] flex items-center justify-center text-center overflow-hidden border-b border-[#c5a059]/20">
        <div className="absolute inset-0 bg-bg/60 z-raised"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none z-base">
          <LazyImage 
            src="/handmade-mastery.webp" 
            fallbackSrc="https://images.unsplash.com/photo-1531061919934-297d022b7dcc?auto=format&fit=crop&q=80&w=1600&h=900"
            alt="Grainood Workshop" 
            containerClassName="w-full h-full bg-bg"
            className="w-full h-full object-cover grayscale"
            loading="eager"
            decoding="sync"
            optimizeWidth={1600}
          />
        </div>
        <div className="relative z-sticky-section animate-fade-up px-4">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-light tracking-[0.1em] md:tracking-[0.25em] text-content uppercase mb-6 leading-tight text-balance hyphens-none px-2 w-full text-center">
            {philosophyContent?.heading || <>WOOD. <span className="metallic-text font-bold">GRAIN.</span> OBSESSION.</>}
          </h1>
        </div>
      </section>

      {/* 2. STORY */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 md:gap-24">
          <div className="hidden md:flex items-center">
            <div className="font-bold tracking-[0.4em] text-premium-gold-text text-[10px] transform -rotate-90 whitespace-nowrap opacity-50 uppercase">
              EST. 1988 — INDIA
            </div>
            <div className="w-px h-64 bg-gradient-to-b from-[#c5a059] to-transparent ml-8"></div>
          </div>
          <RevealSection delay={100} className="flex-1 space-y-8 text-content/80 font-light text-sm md:text-base leading-relaxed tracking-wide">
            {philosophyContent?.copy ? (
              <div className="whitespace-pre-line text-xl md:text-2xl text-content font-normal mb-12 tracking-wide leading-relaxed">
                {philosophyContent.copy}
              </div>
            ) : (
              <>
                <p className="text-xl md:text-2xl text-content font-normal mb-12 tracking-wide leading-relaxed">
                  We don't manufacture bats. We craft weapons for the elegant destroyer. Every piece of willow holds a century of tradition, and our obsession is bringing its full potential into your hands.
                </p>
                <p>
                  It begins in the dense copses of England, where only the most premium, untainted Salix Alba Caerulea (English Willow) is harvested. We hand-select our clefts in person, rejecting ninety-five percent of what we see. We demand perfectly straight, unblemished grains that promise unparalleled structural integrity and explosive power.
                </p>
                <p>
                  Once back in our artisan workshop in India, time becomes our greatest tool. Our clefts are naturally air-dried for twelve agonizing months, never kiln-forced. This agonizingly slow process ensures the wood retains its natural moisture balance, resulting in a bat that doesn't just play well, but plays flawlessly for seasons to come.
                </p>
                <p>
                  The transformation from raw timber to a Grainood bat is entirely analog. Using centuries-old traditional techniques, our master craftsmen wield draw knives and spoke shaves, shaping the profile by eye and feel alone. Every bat is individually pressed to maximize ping, bone-rubbed to seal the porous surface, and balanced to absolute perfection. When it leaves our workshop, it is more than sports equipment—it is a legacy.
                </p>
              </>
            )}
          </RevealSection>
        </div>
      </section>

      {/* 3. THE PROCESS */}
      <section className="py-20 md:py-28 bg-surface/90 border-y border-[#c5a059]/20 px-4 sm:px-6 lg:px-8 overflow-hidden" ref={containerRef}>
        <RevealSection className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-2xl md:text-4xl font-bold tracking-[0.2em] uppercase text-content mb-4 text-balance hyphens-none w-full">THE PROCESS</h2>
            <div className="h-px w-24 bg-[#c5a059] mx-auto"></div>
          </div>

          <div className="relative">
            {/* Horizontal Timeline Line (Desktop) */}
            <div className="hidden md:block absolute top-[28px] left-0 w-full h-px bg-line z-base">
              <div 
                className="absolute top-0 left-0 h-full bg-[#c5a059] origin-left"
                style={{ width: '100%', transform: `scaleX(${scrollProgress})`, transition: 'transform 0.1s ease-out' }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-6 relative z-raised">
              {STEPS.map((step, i) => (
                <RevealSection key={i} delay={i * 150} className="flex flex-col items-center md:items-start text-center md:text-left relative group">
                  <div className="w-14 h-14 rounded-full bg-surface border border-[#c5a059] flex items-center justify-center text-[#c5a059] font-bold text-lg mb-8 group-hover:scale-110 group-hover:bg-[#c5a059] group-hover:text-bg transition-all duration-300">
                    0{i + 1}
                  </div>
                  <h3 className="text-content text-[12px] font-bold tracking-[0.2em] uppercase mb-4">{step.title}</h3>
                  <p className="text-muted text-[11px] leading-relaxed tracking-wider">
                    {step.text}
                  </p>
                </RevealSection>
              ))}
            </div>
          </div>
        </RevealSection>
      </section>

      {/* 4. NUMBERS STRIP */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          <AnimatedCounter end={38} label="Years of Craft" />
          <AnimatedCounter end={5} label="Exclusive Series" />
          <AnimatedCounter end={15} suffix="+" label="Grains on Flagship" />
          <AnimatedCounter end={50} label="Immortals per Year" />
        </div>
      </section>

      {/* 5. TESTIMONIALS */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t border-[#c5a059]/20 bg-surface/90">
        <RevealSection>
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold tracking-[0.2em] uppercase text-content mb-4 text-balance hyphens-none w-full">THE VERDICT</h2>
            <div className="h-px w-24 bg-[#c5a059] mx-auto"></div>
          </div>
          <TestimonialRotator testimonials={reviewsContent?.reviews || []} />
        </RevealSection>
      </section>

      {/* 6. CTA */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <RevealSection>
          <h2 className="text-3xl md:text-5xl font-light tracking-[0.15em] md:tracking-[0.2em] text-content uppercase mb-12 text-balance hyphens-none px-2 w-full text-center">
            Hold one. <br className="md:hidden" /> <span className="font-bold">You'll understand.</span>
          </h2>
          <GoldButton 
            as={Link}
            to="/collection"
            variant="solid"
          >
            EXPLORE THE COLLECTION
          </GoldButton>
        </RevealSection>
      </section>

    </div>
  );
}
