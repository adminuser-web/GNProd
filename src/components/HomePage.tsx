import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { BRAND } from '../types';
import { Reveal, useParallax } from './Reveal';
import { GoldButton } from './GoldButton';
import { LazyImage } from './LazyImage';
import { ScrimImage } from './ScrimImage';
import { useProducts } from '../context/ProductsContext';
import { useContent } from '../context/ContentContext';

export function HomePage() {
  const content = useContent('home');
  const brandContent = useContent('brand');
  const reviewsContent = useContent('reviews');
  const philosophyContent = useContent('philosophy');
  
  const { products } = useProducts();
  const parallaxRef = useParallax(0.15, 40);

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    document.title = `${brandContent?.brandName || "Grainood"} — ${brandContent?.tagline || "Handcrafted Cricket Bats from India"}`;
  }, [brandContent]);

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `ENQUIRY from ${formData.name} (${formData.email}):\n\n${formData.message}`;
    const url = `https://wa.me/${brandContent?.contact?.whatsapp?.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setFormData({ name: '', email: '', message: '' });
  };

  const scrollToCollection = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };

  const heroHeadlineParts = content?.hero?.headline?.split('PERFORMANCE') || [];

  return (
    <div className="text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white overflow-hidden font-sans">
      
      {/* HERO SECTION */}
      <section className="relative h-[100svh] flex flex-col justify-end pb-32 items-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background layer */}
        <div className="absolute inset-0 z-base bg-bg">
          {content?.hero?.videoUrl ? (
            <>
              <video 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-full object-cover hidden md:block"
              >
                <source src={content.hero.videoUrl} type="video/mp4" />
              </video>
              <div 
                className="absolute inset-0 pointer-events-none hidden md:block" 
                style={{ background: 'linear-gradient(to top, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.55) 40%, rgba(8,8,10,0.2) 75%, rgba(8,8,10,0.1) 100%)' }}
              />
            </>
          ) : null}
          <ScrimImage 
            src={content?.hero?.bgImageUrl || (content?.hero as any)?.image} 
            placeholderSrc="/hero-bat.webp"
            alt="Hero Background"
            className={`absolute inset-0 w-full h-full ${content?.hero?.videoUrl ? 'md:hidden' : ''}`}
            scrim="linear-gradient(to top, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.55) 40%, rgba(8,8,10,0.2) 75%, rgba(8,8,10,0.1) 100%)"
            priority={true}
          />
        </div>

        {/* Content */}
        <Reveal className="relative z-raised max-w-5xl mx-auto flex flex-col items-center animate-fade-up">
          <p 
            className="text-[#c5a059] text-xs font-bold tracking-widest mb-4 uppercase"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {brandContent?.brandName} — Handcrafted in India
          </p>
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 text-balance hyphens-none px-4 w-full uppercase"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {heroHeadlineParts.length > 1 ? (
              <>
                {heroHeadlineParts[0].charAt(0).toUpperCase() + heroHeadlineParts[0].slice(1).toLowerCase()}
                <span className="text-[#c5a059]">Performance</span>
                {heroHeadlineParts[1].toLowerCase()}
              </>
            ) : content?.hero?.headline}
          </h1>
          <p 
            className="text-white/90 text-[16px] md:text-xl leading-relaxed max-w-2xl mx-auto font-light mb-12"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {content?.hero?.subheadline || "Premium English Willow cricket bats shaped for pickup, balance, power, and serious run-making."}
          </p>
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full sm:w-auto">
            <GoldButton
              as={Link}
              to="/bat-consultant"
              variant="solid" 
              className="w-full md:w-auto px-8 gap-3"
            >
              FIND YOUR BAT
            </GoldButton>
            <GoldButton 
              as={Link}
              to={content?.hero?.primaryCtaLink || "/collection"}
              variant="outline"
              className="w-full md:w-auto"
            >
              EXPLORE COLLECTION
            </GoldButton>
          </div>
          
          {/* TRUST ROW */}
          <div className="mt-16 pt-8 border-t border-white/10 w-full max-w-4xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-4 text-white/70 text-xs sm:text-sm uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
              English Willow Only
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
              Handcrafted Profiles
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
              AI Bat Consultant
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
              Save & Share Build
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
              Order Support
            </span>
          </div>
        </Reveal>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-raised transition-transform hover:-translate-y-2">
          <button 
            onClick={scrollToCollection} 
            className="text-muted hover:text-[#c5a059] transition-colors p-4 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
            aria-label="Scroll down"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </section>

      {/* STORY BAND (Parallax) */}
      <section className="relative overflow-hidden py-32 md:py-48 bg-bg border-y border-line">
        <div className="absolute inset-0 z-0 opacity-20">
          <div ref={parallaxRef} className="w-full h-[150%] -mt-[25%]">
            <ScrimImage 
              src={content?.sections?.[0]?.image} 
              placeholderSrc="/handmade-mastery.webp"
              alt="Story Background"
              className="w-full h-full"
              imageClassName="grayscale scale-105"
            />
          </div>
        </div>
        <div className="relative z-raised max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-6 text-balance uppercase">
              {philosophyContent?.heading || "PERFORMANCE ENGINEERED"}
            </h2>
            <div className="h-px w-16 bg-[#c5a059] mx-auto mb-8 opacity-40" />
            <p className="text-content/80 text-lg md:text-2xl leading-relaxed mx-auto font-light mb-12">
              {philosophyContent?.copy || "Crafted from the finest hand-selected English willow. Each Grainood bat is hand-pressed and sculpted to perfection."}
            </p>
            <GoldButton as={Link} to="/about" variant="outline">
              OUR PHILOSOPHY
            </GoldButton>
          </Reveal>
        </div>
      </section>

      {/* COLLECTION SECTION */}
      <section id="collection" className="py-24 md:py-32 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16 md:mb-24 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-6 text-balance uppercase">
              {content?.featured?.heading || "THE COLLECTION"}
            </h2>
            <p className="text-content/80 leading-relaxed text-lg md:text-xl mx-auto max-w-2xl font-light">
              {content?.featured?.copy || "The Grainood series — re-engineered for greater balance, stiffness, and control. Made to handle express pace and punishing spin with equal precision."}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={index * 100} className="group cursor-pointer">
                <Link to={`/collection/${product.slug}`} className="block h-full transition-all duration-500 py-6 relative outline-none hover:-translate-y-1">
                  {product.isFlagship && (
                    <div className="absolute top-8 right-0 z-sticky-section">
                      <span className="px-3 py-1 bg-elevated/90 border border-[#c5a059]/20 text-[#c5a059] text-[10px] font-bold tracking-widest uppercase">
                        Flagship
                      </span>
                    </div>
                  )}
                  <div className="aspect-[3/4] w-full relative mb-8 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent z-raised" />
                    <div className="absolute inset-0 pb-6 pt-6 px-4 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity duration-700">
                      <LazyImage
                        src={product.imageUrl}
                        alt={product.name}
                        containerClassName="h-full bg-transparent"
                        className="w-auto h-full object-contain group-hover:scale-105 transition-transform duration-700 drop-shadow-md"
                        optimizeWidth={400}
                      />
                    </div>
                  </div>
                  <div className="text-center relative z-sticky-section">
                    <p className="text-[#c5a059] text-[10px] tracking-widest mb-2 font-semibold uppercase">{product.tier}</p>
                    <h3 className="text-lg md:text-xl font-medium text-content tracking-tight mb-2 capitalize whitespace-nowrap">{product.name}</h3>
                    <p className="text-muted text-xs tracking-wide">From ₹{(product.price ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          
          <Reveal delay={300} className="mt-20 flex justify-center">
            <GoldButton as={Link} to="/collection" variant="outline">
              VIEW FULL COLLECTION
            </GoldButton>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIAL STRIP */}
      {reviewsContent?.reviews && reviewsContent.reviews.length > 0 && (
        <section className="py-24 md:py-32 bg-surface/50 border-y border-line">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <Reveal>
              <div className="flex justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-[#c5a059]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-16 text-balance hyphens-none">
                Trusted by Club & Pro Players
              </h2>
            </Reveal>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {reviewsContent.reviews.slice(0, 3).map((testimonial, i) => (
                <Reveal key={i} delay={i * 150} className="text-center px-4">
                  <p className="text-content/90 text-lg md:text-xl font-light italic leading-relaxed mb-6">
                    "{testimonial.text}"
                  </p>
                  <p className="text-muted text-xs font-semibold tracking-widest uppercase">
                    {testimonial.name}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER-ISH GET IN TOUCH */}
      <section className="py-24 md:py-32 bg-transparent">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
          <Reveal delay={100} className="w-full">
            <div className="bg-surface border border-line rounded-2xl p-8 md:p-12 mb-16 text-center shadow-sm shadow-black/5">
               <h3 className="text-2xl font-bold tracking-tight text-content mb-4 uppercase">Visit Our Store</h3>
               <p className="text-content/80 text-base leading-relaxed max-w-lg mx-auto font-light mb-8">
                 {brandContent?.store?.address || "Address"}
               </p>
               <GoldButton
                 as={Link}
                 to="/locate-us"
                 variant="outline"
               >
                 GET DIRECTIONS
               </GoldButton>
            </div>

            <form onSubmit={handleEnquirySubmit} className="space-y-4 text-left max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="sr-only" htmlFor="name">Name</label>
                  <input 
                    type="text" 
                    id="name"
                    placeholder="Your Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-surface/50 border border-line rounded-lg text-content px-5 py-4 focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-colors"
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor="email">Email</label>
                  <input 
                    type="email" 
                    id="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-surface/50 border border-line rounded-lg text-content px-5 py-4 focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="sr-only" htmlFor="message">Message</label>
                <textarea 
                  id="message"
                  placeholder="How can we craft your perfect bat?"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-surface/50 border border-line rounded-lg text-content px-5 py-4 focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-colors resize-none"
                />
              </div>
              <GoldButton 
                type="submit"
                variant="solid"
                className="w-full mt-2"
              >
                Send Enquiry
              </GoldButton>
            </form>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

