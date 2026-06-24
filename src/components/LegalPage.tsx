import React, { useEffect } from 'react';
import { RevealSection } from './Reveal';

export interface LegalSection {
  heading: string;
  content: string[];
}

interface LegalPageProps {
  title: string;
  kicker: string;
  sections?: LegalSection[];
  body?: string;
}

export function LegalPage({ title, kicker, sections, body }: LegalPageProps) {
  useEffect(() => {
    document.title = `${title} — Grainood`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans xl:pt-20 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-raised">
        <RevealSection delay={0} className="mb-20 text-center md:text-left">
          <span className="text-premium-gold-text text-[10px] font-bold tracking-[0.4em] uppercase block mb-6">{kicker}</span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.25em] text-content uppercase">{title}</h1>
        </RevealSection>

        {body ? (
          <RevealSection delay={100} className="pt-8 border-t border-[#c5a059]/20">
             <div className="text-content/80 font-light text-sm md:text-base leading-relaxed tracking-wide whitespace-pre-line">
               {body}
             </div>
          </RevealSection>
        ) : sections ? (
          <div className="space-y-16">
            {sections.map((section, index) => (
              <RevealSection key={index} delay={100 + (index * 50)} className="pt-8 border-t border-[#c5a059]/20">
                <h2 className="text-content text-lg font-bold tracking-[0.2em] uppercase mb-6">{section.heading}</h2>
                <div className="space-y-6">
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className="text-content/80 font-light text-sm md:text-base leading-relaxed tracking-wide">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </RevealSection>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
