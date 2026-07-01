import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Instagram } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { resolveThemedImage } from '../lib/themedImage';

/** Full-screen "Launching Soon" splash shown while maintenance mode is on. */
export function ComingSoon() {
  const brand = useContent('brand');
  const m = useContent('maintenance');

  const logo = brand?.logoUrl ? resolveThemedImage(brand.logoUrl as any, 'dark') : '';
  const wa = (brand?.contact?.whatsapp || '').replace(/[^\d]/g, '');
  const ig = brand?.contact?.instagram || (brand?.social?.instagram ? `https://instagram.com/${brand.social.instagram}` : '');
  const headline = m?.headline || 'Launching Soon';
  const subtext = m?.subtext || 'Something special is being crafted.';

  return (
    <div className="min-h-screen bg-bg text-content flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* subtle gold glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.15]" style={{ background: 'radial-gradient(600px circle at 50% 30%, #c5a059, transparent 60%)' }} />

      <div className="relative z-raised flex flex-col items-center text-center max-w-xl">
        {logo ? (
          <img src={logo} alt={brand?.brandName || 'Grainood'} className="h-14 md:h-16 w-auto mb-10 object-contain" />
        ) : (
          <div className="text-2xl font-bold tracking-[0.3em] uppercase text-[#c5a059] mb-10">{brand?.brandName || 'GRAINOOD'}</div>
        )}

        <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-[#c5a059] mb-5">English Willow · Handcrafted</p>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase mb-6 text-balance">{headline}</h1>

        <p className="text-content/70 text-sm md:text-base leading-relaxed max-w-md mb-10">{subtext}</p>

        <div className="flex items-center gap-4">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 border border-[#c5a059]/40 text-[#c5a059] px-5 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c5a059] hover:text-bg transition-colors">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 border border-[#c5a059]/40 text-[#c5a059] px-5 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c5a059] hover:text-bg transition-colors">
              <Instagram size={14} /> Instagram
            </a>
          )}
        </div>
      </div>

      {/* Discreet team access */}
      <Link to="/login" className="absolute bottom-6 text-[9px] uppercase tracking-[0.3em] text-muted/50 hover:text-[#c5a059] transition-colors">
        Team login
      </Link>
    </div>
  );
}
