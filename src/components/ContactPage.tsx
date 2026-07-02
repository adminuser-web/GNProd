// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mail, Instagram, Plus, Minus, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { RevealSection } from './Reveal';
import { osmEmbedUrl } from '../lib/mapEmbed';
import { clsx } from 'clsx';
import { GoldButton } from './GoldButton';
import { enquiryService } from '../features/enquiries/services/enquiryService';

const FAQS_FALLBACK = [
  {
    question: "What is your delivery time?",
    answer: "Every bat is made to order and meticulously hand-crafted. Please allow 4–6 weeks from order confirmation to delivery."
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship pan-India and internationally. Shipping costs and timelines vary depending on your location and will be confirmed when you place your order."
  },
  {
    question: "How do I pay for my order?",
    answer: "You pay securely at checkout using GPay, any UPI app, or a debit/credit card — all processed by Razorpay. Your order is confirmed the moment payment succeeds, and crafting begins right away."
  },
  {
    question: "How should I care for my new bat?",
    answer: "Keep it away from extreme heat and moisture. Use a light coat of raw linseed oil at the start of the season, and always ensure it is properly knocked in before match use. A bat care guide is included with every purchase."
  },
  {
    question: "Can I customize the weight and profile?",
    answer: "Absolutely. Especially for our premium grades like the Eternal and Immortal, we offer concierge fitting to customize weight, handle shape, grip, and specific profile requirements to suit your game."
  }
];

function AccordionItem({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) {
  return (
    <div className="border-b border-[#c5a059]/20 py-6">
      <button 
        className="w-full flex justify-between items-center text-left focus:outline-none group"
        onClick={onClick}
      >
        <h3 className="text-content text-[12px] font-bold tracking-[0.2em] uppercase transition-colors group-hover:text-premium-gold-text pr-8">{question}</h3>
        <div className="text-[#c5a059] flex-shrink-0 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      <div 
        className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-content/80 text-sm leading-relaxed tracking-wider font-light pb-2 whitespace-pre-line">
          {answer}
        </p>
      </div>
    </div>
  );
}

function FloatingInput({ label, name, type = 'text', value, onChange, required = false }: any) {
  return (
    <div className="relative pt-6">
      <input
        type={type}
        name={name}
        id={`contact-${name}`}
        value={value}
        onChange={onChange}
        required={required}
        placeholder=" "
        className="peer w-full bg-transparent border-b text-content pb-2 pt-2 focus:outline-none transition-colors placeholder-transparent border-[#c5a059]/40 focus:border-[#c5a059]"
      />
      <label 
        htmlFor={`contact-${name}`}
        className={clsx(
          "absolute left-0 cursor-text transition-all tracking-wider uppercase text-sm text-muted peer-focus:text-premium-gold-text",
          "peer-placeholder-shown:text-base peer-placeholder-shown:top-8",
          "peer-focus:top-2 peer-focus:text-xs",
          !value ? "top-8 text-base" : "top-2 text-xs"
        )}
      >
        {label}
      </label>
    </div>
  );
}

export function ContactPage() {
  const locationState = useLocation().state as { section?: string } | null;
  const locationRef = useRef<HTMLDivElement>(null);
  const brandContent = useContent('brand');
  const contactContent = useContent('contact');

  useEffect(() => {
    document.title = `Contact — ${brandContent?.brandName || "Grainood"}`;
    if (locationState?.section === 'location' && locationRef.current) {
      setTimeout(() => {
        locationRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [locationState, brandContent]);

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const whatsappPhone = brandContent?.contact?.whatsapp || brandContent?.contact?.phone || '+918939568005';
  const whatsappCleaned = whatsappPhone.replace(/\D/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await enquiryService.submitEnquiry({
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        message: formData.message,
        type: 'general',
        source: 'contact'
      });
    } catch {
      // Sanitized: no PII / no provider internals in logs.
      console.error('enquiry_submit_failed');
    }
    
    const message = `ENQUIRY from ${formData.name} (${formData.phone} / ${formData.email}):\n\n${formData.message}`;
    const url = `https://wa.me/${whatsappCleaned}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    setIsSubmitted(true);
    setFormData({ name: '', email: '', phone: '', message: '' });
    
    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  };

  return (
    <div className="text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans xl:pt-20 pt-20">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative z-raised">
        <div className="text-center animate-fade-up mb-20">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] md:tracking-[0.25em] text-content uppercase mb-6 text-balance hyphens-none px-2 w-full text-center">
            {contactContent?.heading || <>TALK TO THE <span className="metallic-text">WORKSHOP</span></>}
          </h1>
          <p className="text-muted text-sm tracking-[0.3em] uppercase">
            {contactContent?.intro || "We're here to talk cricket."}
          </p>
        </div>

        {/* CONTACT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
          {/* WhatsApp */}
          <RevealSection delay={0}>
            <div className="bg-surface/90 border border-[#c5a059]/20 hover:border-[#c5a059] transition-all duration-500 p-10 flex flex-col items-center text-center group hover-lift h-full">
              <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center text-[#c5a059] mb-8 group-hover:scale-110 transition-transform duration-500">
                <MessageCircle size={24} />
              </div>
              <h2 className="text-content font-bold tracking-[0.2em] uppercase text-sm mb-4">WhatsApp</h2>
              <p className="text-content/80 font-light tracking-widest text-lg mb-10 group-hover:text-content transition-colors">{whatsappPhone}</p>
              <GoldButton 
                as="a"
                href={`https://wa.me/${whatsappCleaned}?text=Hi`}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                className="mt-auto w-full"
              >
                START A CHAT
              </GoldButton>
            </div>
          </RevealSection>

          {/* Email */}
          <RevealSection delay={150}>
            <div className="bg-surface/90 border border-[#c5a059]/20 hover:border-[#c5a059] transition-all duration-500 p-10 flex flex-col items-center text-center group hover-lift h-full">
              <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center text-[#c5a059] mb-8 group-hover:scale-110 transition-transform duration-500">
                <Mail size={24} />
              </div>
              <h2 className="text-content font-bold tracking-[0.2em] uppercase text-sm mb-4">Email</h2>
              <p className="text-content/80 font-light tracking-widest text-lg mb-10 group-hover:text-content transition-colors break-all">{brandContent?.contact?.email || 'CONNECT@GRAINOOD.COM'}</p>
              <GoldButton 
                as="a"
                href={`mailto:${brandContent?.contact?.email || 'CONNECT@GRAINOOD.COM'}`}
                variant="outline"
                className="mt-auto w-full"
              >
                WRITE TO US
              </GoldButton>
            </div>
          </RevealSection>

          {/* Instagram */}
          <RevealSection delay={300}>
            <div className="bg-surface/90 border border-[#c5a059]/20 hover:border-[#c5a059] transition-all duration-500 p-10 flex flex-col items-center text-center group hover-lift h-full">
              <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center text-[#c5a059] mb-8 group-hover:scale-110 transition-transform duration-500">
                <Instagram size={24} />
              </div>
              <h2 className="text-content font-bold tracking-[0.2em] uppercase text-sm mb-4">Instagram</h2>
              <p className="text-content/80 font-light tracking-widest text-lg mb-10 group-hover:text-content transition-colors">@{brandContent?.social?.instagram || 'grainood'}</p>
              <GoldButton 
                as="a"
                href={`https://instagram.com/${brandContent?.social?.instagram?.replace('@','') || 'grainood'}`}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                className="mt-auto w-full"
              >
                FOLLOW THE CRAFT
              </GoldButton>
            </div>
          </RevealSection>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 mb-32">
          {/* ENQUIRY FORM */}
          <RevealSection delay={0}>
            <div className="bg-surface/90 border border-[#c5a059]/20 p-8 md:p-12 relative overflow-hidden">
              {isSubmitted ? (
                <div className="absolute inset-0 bg-surface/95 flex flex-col items-center justify-center text-center p-8 z-raised animate-fade-in">
                  <div className="w-16 h-16 rounded-full border border-[#c5a059] flex items-center justify-center text-[#c5a059] mb-6 shadow-sm">
                    <Check size={32} />
                  </div>
                  <h3 className="text-content font-bold tracking-[0.2em] uppercase mb-4">Message Sent</h3>
                  <p className="text-muted text-xs tracking-widest uppercase mb-8">Opening WhatsApp to continue...</p>
                </div>
              ) : null}

              <h2 className="text-2xl md:text-4xl font-bold tracking-[0.2em] uppercase text-content mb-10">SEND AN ENQUIRY</h2>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <FloatingInput label="Your Name*" name="name" value={formData.name} onChange={handleChange} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <FloatingInput label="Email Address*" type="email" name="email" value={formData.email} onChange={handleChange} required />
                  <FloatingInput label="Phone Number*" type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                </div>
                
                <div className="relative pt-6">
                  <textarea
                    name="message"
                    id="contact-message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder=" "
                    rows={4}
                    className="peer w-full bg-transparent border-b border-[#c5a059]/40 text-content pb-2 pt-2 focus:outline-none focus:border-[#c5a059] transition-colors resize-none placeholder-transparent"
                  ></textarea>
                  <label 
                    htmlFor="contact-message"
                    className={clsx(
                      "absolute left-0 text-muted text-sm tracking-wider transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-8 peer-focus:top-2 peer-focus:text-xs peer-focus:text-premium-gold-text uppercase",
                      formData.message ? "top-2 text-xs" : ""
                    )}
                  >
                    Your Message*
                  </label>
                </div>
                
                <GoldButton 
                  type="submit" 
                  variant="solid"
                  className="w-full mt-4"
                >
                  SEND MESSAGE
                </GoldButton>
              </form>
            </div>
          </RevealSection>

          {/* FAQs */}
          <RevealSection delay={200}>
            <div className="pt-2">
              <h2 className="text-2xl md:text-4xl font-bold tracking-[0.2em] uppercase text-content mb-10">FREQUENTLY ASKED</h2>
              <div className="border-t border-[#c5a059]/20">
                {(contactContent?.faqs?.length ? contactContent.faqs : FAQS_FALLBACK).map((faq: any, index: number) => (
                  <AccordionItem 
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openFaq === index}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  />
                ))}
              </div>
            </div>
          </RevealSection>
        </div>

        {/* LOCATE US */}
        <RevealSection delay={0}>
          <div ref={locationRef} id="location" className="border border-[#c5a059]/20 p-8 md:p-12 mb-32 relative overflow-hidden bg-surface/50">
             <h2 className="text-2xl md:text-4xl font-bold tracking-[0.2em] uppercase text-content mb-10">LOCATE US</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-[#c5a059] font-bold text-xl uppercase tracking-widest mb-4">Store</h3>
                  <p className="text-content/80 mb-6 max-w-sm text-sm leading-loose whitespace-pre-line">
                    {brandContent?.store?.address || '12/42, F Type, 4th Main Road, Sidco Nagar, Villivakkam, Chennai-600049, Tamil Nadu'}
                  </p>
                  <p className="text-content/80 text-sm leading-loose mb-8 font-mono bg-bg py-2 px-4 inline-block border border-line whitespace-pre-line">
                    <strong className="text-[#c5a059] uppercase tracking-widest text-[10px]">Hours:</strong> {brandContent?.store?.hours || 'Mon-Sat 10am-8pm'}
                  </p>
                  <br />
                  <GoldButton as="a" href={brandContent?.store?.mapLink && brandContent.store.mapLink !== '#' ? brandContent.store.mapLink : "https://maps.google.com/?q=13.0847951,80.2443419"} target="_blank" variant="outline">
                     GET DIRECTIONS
                  </GoldButton>
                </div>
                <div className="aspect-video w-full bg-bg border border-[#c5a059]/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[#c5a059]/10 pointer-events-none z-raised group-hover:bg-transparent transition-colors duration-500"></div>
                    <iframe
                      title="Map to Grainood store"
                      src={osmEmbedUrl()}
                      width="100%"
                      height="100%"
                      style={{border:0}}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="opacity-80 grayscale contrast-125 mix-blend-luminosity hover:opacity-100 hover:grayscale-0 hover:mix-blend-normal transition-all duration-700"
                    />
                </div>
             </div>
          </div>
        </RevealSection>

      </div>
    </div>
  );
}
