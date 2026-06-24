import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { BRAND } from '../types';
import { clsx } from 'clsx';
import { RevealSection } from './Reveal';
import { useAuth } from '../context/AuthContext';
import { GoldButton } from './GoldButton';

export function OrderConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [drawn, setDrawn] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Order Placed — Grainood";
    if (!loading && (!state || !state.orderId)) {
      if (user) {
        navigate('/my-orders');
      } else {
        navigate('/collection');
      }
    }
    
    // Trigger SVG draw animation
    setTimeout(() => setDrawn(true), 100);
  }, [state, navigate, user, loading]);

  if (loading || (!state || !state.orderId)) return null;

  const { orderId, receiptNumber, message, url } = state;

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans xl:pt-20 pt-20 flex flex-col items-center justify-center relative">
      <div className="max-w-2xl mx-auto px-4 text-center z-raised w-full relative">
        <RevealSection delay={0} className="flex flex-col items-center">
          {/* Animated SVG Checkmark */}
          <div className="w-24 h-24 rounded-full border border-[#c5a059]/30 flex items-center justify-center mb-10 overflow-hidden relative bg-surface shadow-sm">
            <svg className="w-12 h-12 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path 
                d="M5 13l4 4L19 7" 
                className="transition-all duration-1000 ease-in-out" 
                style={{ 
                  strokeDasharray: 30, 
                  strokeDashoffset: drawn ? 0 : 30 
                }} 
              />
            </svg>
            <div className={clsx("absolute inset-0 bg-[#c5a059]/10 transition-opacity duration-1000", drawn ? "opacity-100" : "opacity-0")} />
          </div>

          <p className="text-[#c5a059] font-bold text-[10px] tracking-[0.4em] uppercase mb-4">Order Successfully Placed</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-content uppercase mb-6">
            YOUR ORDER HAS BEEN RECEIVED
          </h1>
          <p className="text-muted/60 font-mono text-sm tracking-widest uppercase mb-12 border border-line px-4 py-2 inline-block">Order Ref: {receiptNumber ? `No. ${receiptNumber}` : orderId}</p>

          <div className="bg-surface/50 border border-[#c5a059]/20 p-8 md:p-12 mb-12 max-w-lg w-full">
            <h3 className="text-content font-bold tracking-[0.2em] text-sm uppercase mb-6 flex items-center justify-center gap-2">
              Next Steps <ArrowRight size={16} className="text-[#c5a059]" />
            </h3>
            <ol className="text-left space-y-6">
              <li className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center text-[10px] font-bold">1</span>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-content mb-1">We'll WhatsApp You</h4>
                  <p className="text-[11px] text-muted leading-relaxed">Our master crafters will message you on your provided WhatsApp number within 24h to re-confirm your specifications.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center text-[10px] font-bold">2</span>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-content mb-1">Make Payment</h4>
                  <p className="text-[11px] text-muted leading-relaxed">Once you are fully satisfied with the plan, we will share our UPI / Bank Details to secure the build.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center text-[10px] font-bold">3</span>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-content mb-1">Crafting Begins</h4>
                  <p className="text-[11px] text-muted leading-relaxed">Your order moves to the crafting block. You can track progress right from your account dashboard.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
            <GoldButton as={Link} to="/my-orders" variant="solid" className="w-full">
              TRACK MY ORDER
            </GoldButton>
            <GoldButton 
              as="a" 
              href={url}
              target="_blank"
              rel="noreferrer"
              variant="outline" 
              className="w-full"
            >
              MESSAGE US NOW
            </GoldButton>
          </div>
        </RevealSection>
      </div>
    </div>
  );
}
