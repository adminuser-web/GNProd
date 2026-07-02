import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { BRAND } from '../types';
import { MapPin, Clock, Phone, ArrowRight, ShieldCheck, Hammer, Lock, PackageSearch } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useTheme } from '../context/ThemeContext';
import { resolveThemedImage } from '../lib/themedImage';

export function Footer() {
  const brandContent = useContent('brand');
  const footerContent = useContent('footer');
  const { theme } = useTheme();
  const logoSrc = resolveThemedImage(brandContent?.logoUrl as any, theme);

  return (
    <footer className="bg-surface text-content/80 pt-16 pb-8 border-t border-[#c5a059]/20 print-hide">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12">
          
          {/* Col 1: Brand & Contact Block */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              {logoSrc ? (
                <img src={logoSrc} alt={brandContent?.brandName || 'GRAINOOD'} className="h-10 w-auto object-contain" />
              ) : (
                <Logo className="h-10 text-[#c5a059]" />
              )}
              <h3 className="text-content text-2xl font-bold tracking-widest uppercase">{brandContent?.brandName || "GRAINOOD"}</h3>
            </div>
            <p className="mb-8 max-w-sm text-muted text-[13px] leading-relaxed font-light">
              {brandContent?.tagline || "Handcrafted English willow cricket bats. Engineered for absolute dominance."}
            </p>
            
            {/* Contact Block */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-[#c5a059] mt-0.5" />
                <div className="text-[12px] text-muted leading-relaxed whitespace-pre-line">
                  {brandContent?.store?.address}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-[#c5a059]" />
                <span className="text-[12px] text-muted">{brandContent?.store?.hours}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[#c5a059]" />
                <a href={`https://wa.me/${brandContent?.contact?.whatsapp?.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-premium-gold-text hover:underline tracking-wider">
                  {brandContent?.contact?.phone} (Tap to call/WhatsApp)
                </a>
              </div>
              <div className="flex items-center gap-3">
                <PackageSearch size={16} className="text-[#c5a059]" />
                <Link to="/track" className="text-[12px] text-premium-gold-text hover:underline tracking-wider">
                  Track your order
                </Link>
              </div>
            </div>

            <div className="max-w-sm mt-8 border border-[#c5a059]/20 p-4 bg-bg flex items-center justify-between group hover:border-[#c5a059]/50 transition-colors">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">Need Buying Advice?</p>
                <p className="text-[10px] text-muted">Chat with our experts on WhatsApp</p>
              </div>
              <a 
                href={`https://wa.me/${brandContent?.contact?.whatsapp?.replace(/\D/g,'')}?text=Hi Grainood, I need help choosing a bat`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-transparent border border-[#c5a059] text-premium-gold-text h-10 w-10 flex items-center justify-center hover:bg-[#c5a059] hover:text-bg transition-colors"
              >
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
          
          {/* Dynamic Columns */}
          {footerContent?.columns?.map((col: any, idx: number) => (
            <div key={idx}>
              <h4 className="text-content text-[11px] font-bold tracking-widest mb-6 uppercase">{col.title}</h4>
              <ul className="space-y-4 text-[11px] tracking-wider text-muted uppercase">
                {col.links?.map((link: any, linkIdx: number) => (
                  <li key={linkIdx}>
                    {link.url.startsWith('http') ? (
                      <a href={link.url} target="_blank" rel="noreferrer" className="hover:text-[#c5a059] transition-colors">{link.label}</a>
                    ) : (
                      <Link to={link.url} className="hover:text-[#c5a059] transition-colors">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* End Dynamic Columns */}

        </div>

        {/* Trust Row */}
        <div className="mt-16 pt-8 border-t border-[#c5a059]/10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Hammer className="text-[#c5a059]" size={24} />
            <h5 className="text-[10px] font-bold tracking-widest uppercase text-content">Handcrafted English Willow</h5>
            <p className="text-[10px] text-muted max-w-[200px]">Meticulously shaped from the finest grade willow for optimum performance.</p>
          </div>
          <div className="flex flex-col items-center md:items-start gap-2">
            <ShieldCheck className="text-[#c5a059]" size={24} />
            <h5 className="text-[10px] font-bold tracking-widest uppercase text-content">Made-To-Order Precision</h5>
            <p className="text-[10px] text-muted max-w-[200px]">Customized edge profiles and sweet spots to match your play style.</p>
          </div>
          <div className="flex flex-col items-center md:items-start gap-2">
            <Lock className="text-[#c5a059]" size={24} />
            <h5 className="text-[10px] font-bold tracking-widest uppercase text-content">Secure Checkout</h5>
            <p className="text-[10px] text-muted max-w-[200px]">Encrypted transactions and reliable shipping with full tracking capabilities.</p>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-[#c5a059]/10 flex flex-col md:flex-row justify-between items-center text-[9px] tracking-[0.3em] uppercase text-content/60 gap-4">
          <p className="order-last my-2 md:my-0">{(footerContent?.bottomCopy || '© GRAINOOD CRICKET. ALL RIGHTS RESERVED.').replace(/(©\s*)\d{4}/, `$1${new Date().getFullYear()}`)}</p>
          <div className="space-x-4">
            <span>HANDCRAFTED IN INDIA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
