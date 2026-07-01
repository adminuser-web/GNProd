import React, { useEffect } from 'react';
import { MapPin, Clock, Phone, Mail, Navigation, MessageCircle } from 'lucide-react';
import { RevealSection } from './Reveal';
import { useContent } from '../context/ContentContext';
import { osmEmbedUrl } from '../lib/mapEmbed';

export function LocateUsPage() {
  const brandContent = useContent('brand');

  useEffect(() => {
    document.title = `Locate Us — ${brandContent?.brandName || "Grainood"}`;
    window.scrollTo(0, 0);
  }, [brandContent]);

  const storeLocation = {
    address: brandContent?.store?.address || '12/42, F Type, 4th Main Road, Sidco Nagar, Villivakkam, Chennai-600049, Tamil Nadu',
    hours: brandContent?.store?.hours || 'Mon-Sat 10am-8pm',
    phone: brandContent?.contact?.phone || '+91 89395 68005',
    email: brandContent?.contact?.email || 'CONNECT@GRAINOOD.COM',
    mapsLink: brandContent?.store?.mapLink && brandContent.store.mapLink !== '#' ? brandContent.store.mapLink : 'https://maps.app.goo.gl/K2dtLjVPy32m8vEF8'
  };

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans xl:pt-20 pt-20">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12 md:py-24 relative z-raised">
        
        <RevealSection delay={0} className="mb-12 md:mb-20 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-content uppercase mb-6">
            Visit the <span className="text-[#c5a059]">{brandContent?.brandName || "Grainood"} Store</span>
          </h1>
          <p className="max-w-2xl mx-auto text-muted/80 text-sm tracking-widest leading-relaxed uppercase">
            Come feel the balance, test the pickup, and talk to our master crafters in person. Find your perfect match.
          </p>
        </RevealSection>

        <RevealSection delay={100} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          
          {/* Mobile-first: Map on top for small screens */}
          <div className="lg:order-2 h-[400px] lg:h-auto min-h-[400px] border border-[#c5a059]/20 p-2 bg-surface relative">
            <iframe
              title={`Map to ${brandContent?.brandName || 'Grainood'} store`}
              src={osmEmbedUrl()}
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'grayscale(100%) contrast(1.1)' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            ></iframe>
            <a
              href={storeLocation.mapsLink}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-bg/90 border border-[#c5a059]/40 text-[#c5a059] px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c5a059] hover:text-bg transition-colors shadow-lg"
            >
              <Navigation size={13} /> Open in Google Maps
            </a>
          </div>

          <div className="lg:order-1 space-y-10 order-1">
            <div className="bg-surface border border-[#c5a059]/20 p-8 md:p-12 relative overflow-hidden group hover:border-[#c5a059]/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#c5a059]"></div>
              
              <div className="space-y-10">
                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-[#c5a059]/30 flex items-center justify-center shrink-0 bg-[#c5a059]/5 text-[#c5a059]">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-content mb-3">Location</h3>
                    <p className="text-sm text-content/80 leading-relaxed font-mono tracking-wide whitespace-pre-line">
                      {storeLocation.address}
                    </p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-[#c5a059]/30 flex items-center justify-center shrink-0 bg-[#c5a059]/5 text-[#c5a059]">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-content mb-3">Hours</h3>
                    <p className="text-sm text-content/80 leading-relaxed font-mono tracking-wide whitespace-pre-line">
                      {storeLocation.hours}
                    </p>
                  </div>
                </div>

                {/* Contact Links */}
                <div className="flex items-start gap-4 group/contact">
                  <div className="w-10 h-10 border border-[#c5a059]/30 flex items-center justify-center shrink-0 bg-[#c5a059]/5 text-[#c5a059]">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-content mb-3">Contact</h3>
                    <div className="flex flex-col gap-2 font-mono tracking-wide">
                      <a href={`tel:${storeLocation.phone.replace(/\s+/g, '')}`} className="text-sm text-content/80 hover:text-[#c5a059] transition-colors flex items-center gap-2">
                        {storeLocation.phone}
                      </a>
                      <a href={`mailto:${storeLocation.email}`} className="text-sm text-content/80 hover:text-[#c5a059] transition-colors flex items-center gap-2">
                        {storeLocation.email}
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href={storeLocation.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#c5a059] text-bg hover:bg-premium-gold-text transition-colors h-14 flex items-center justify-center font-bold tracking-[0.3em] text-xs uppercase gap-3 px-6"
              >
                <Navigation size={18} />
                Get Directions
              </a>
              <a 
                href={`https://wa.me/${storeLocation.phone.replace(/\D/g, '')}?text=Hi`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors h-14 flex items-center justify-center font-bold tracking-[0.3em] text-xs uppercase gap-3 px-6"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>
            </div>

          </div>
        </RevealSection>
      </div>
    </div>
  );
}
