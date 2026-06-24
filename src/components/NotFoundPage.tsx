import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RevealSection } from './Reveal';
import { GoldButton } from './GoldButton';

export function NotFoundPage() {
  useEffect(() => {
    document.title = "404 Not Found — Grainood";
  }, []);

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans flex flex-col items-center justify-center text-center px-4 relative">
            
      <RevealSection delay={0} className="relative z-raised flex flex-col items-center">
        <div className="text-[120px] md:text-[200px] font-black leading-none text-transparent opacity-20 select-none mb-4" style={{ WebkitTextStroke: '2px #c5a059' }}>
          404
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-content uppercase mb-6">
          This delivery went <br className="md:hidden" /> down leg side.
        </h1>
        <p className="text-muted text-sm tracking-widest uppercase mb-12">
          The page you are looking for does not exist.
        </p>
        <GoldButton 
          as={Link}
          to="/"
          variant="outline"
        >
          RETURN TO PAVILION
        </GoldButton>
      </RevealSection>
    </div>
  );
}
