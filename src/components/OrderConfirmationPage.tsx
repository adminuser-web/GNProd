import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
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

  const { orderId, email } = state;

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

          <p className="text-[#c5a059] font-bold text-[10px] tracking-[0.4em] uppercase mb-4">Payment Successful</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-content uppercase mb-6">
            YOUR ORDER IS CONFIRMED
          </h1>
          <p className="text-muted/60 font-mono text-sm tracking-widest uppercase mb-6 border border-line px-4 py-2 inline-block">Order Ref: {orderId}</p>

          {email && (
            <p className="flex items-center justify-center gap-2 text-muted text-[12px] tracking-wide mb-12">
              <Mail size={14} className="text-[#c5a059]" /> A confirmation has been emailed to <span className="text-content/90">{email}</span>
            </p>
          )}

          <div className="bg-surface/50 border border-[#c5a059]/20 p-8 md:p-12 mb-12 max-w-lg w-full">
            <h3 className="text-content font-bold tracking-[0.2em] text-sm uppercase mb-6 flex items-center justify-center gap-2">
              What Happens Next <ArrowRight size={16} className="text-[#c5a059]" />
            </h3>
            <ol className="text-left space-y-6">
              <li className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center text-[10px] font-bold">1</span>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-content mb-1">Payment Received</h4>
                  <p className="text-[11px] text-muted leading-relaxed">Your payment is confirmed and secured. A receipt and confirmation are on their way to your email.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center text-[10px] font-bold">2</span>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-content mb-1">Crafting Begins</h4>
                  <p className="text-[11px] text-muted leading-relaxed">Our master crafters begin hand-shaping your bat. We'll reach out on WhatsApp if we need to confirm any detail.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center text-[10px] font-bold">3</span>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-content mb-1">Track & Delivery</h4>
                  <p className="text-[11px] text-muted leading-relaxed">Track progress anytime with your order number and email. Estimated delivery is 10–15 working days.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
            <GoldButton as={Link} to={`/track?order=${encodeURIComponent(orderId)}`} variant="solid" className="w-full">
              TRACK MY ORDER
            </GoldButton>
            <GoldButton as={Link} to="/collection" variant="outline" className="w-full">
              CONTINUE SHOPPING
            </GoldButton>
          </div>
        </RevealSection>
      </div>
    </div>
  );
}
