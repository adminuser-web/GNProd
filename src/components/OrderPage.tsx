import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { GoldButton } from './GoldButton';
import { LazyImage } from './LazyImage';
import { supabase } from '../lib/supabase';
import { loadRazorpay } from '../lib/razorpayClient';
import { ChevronDown, ChevronUp, Trash2, Plus, Minus, ShieldCheck, Lock, Hammer } from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../data/locations';
import { HowItWorks } from './HowItWorks';

export function OrderPage() {
  const { state: { items }, itemsWithPricing, grandTotal, subtotal, clearOrder, discountCode, setDiscountCode, codeStatus, discountsApplied, removeFromOrder: removeItem, updateQuantity: setQuantity } = useOrder();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    country: '',
    state: '',
    city: '',
    pincode: '',
    address: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const [isOtherCity, setIsOtherCity] = useState(false);

  useEffect(() => {
    document.title = "Order Details — Grainood";
    if (items.length === 0) {
      navigate('/collection');
    }
  }, [items, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.fullName || '',
        phone: prev.phone || profile.phone || '',
        email: prev.email || profile.email || user?.email || '',
        country: prev.country || profile.address?.countryCode || profile.address?.country || 'IN',
        state: prev.state || profile.address?.stateCode || profile.address?.state || '',
        city: prev.city || profile.address?.city || '',
        pincode: prev.pincode || profile.address?.pincode || '',
        address: prev.address || profile.address?.line1 || ''
      }));
    } else if (user) {
      setFormData(prev => ({ ...prev, email: prev.email || user.email || '' }));
    }
  }, [profile, user]);

  useEffect(() => {
    if (formData.state && CITIES_BY_STATE[formData.state]) {
      const cities = CITIES_BY_STATE[formData.state];
      if (formData.city && !cities.includes(formData.city)) {
        setIsOtherCity(true);
      }
    } else {
      setIsOtherCity(true);
    }
  }, [formData.state, formData.city]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'country') {
        updated.state = '';
        updated.city = '';
        setIsOtherCity(false);
      } else if (name === 'state') {
        updated.city = '';
        setIsOtherCity(false);
      } else if (name === 'city' && value === 'Other') {
        updated.city = '';
        setIsOtherCity(true);
      }
      return updated;
    });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone required';
    } else if (formData.country === 'IN') {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 12) {
        newErrors.phone = 'Valid phone required';
      }
    }
    
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.country.trim()) newErrors.country = 'Country required';
    if (!formData.state.trim()) newErrors.state = 'State required';
    if (!formData.city.trim()) newErrors.city = 'City required';
    
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode required';
    } else if (formData.country === 'IN' && !/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = '6-digit Pincode required';
    }
    
    if (!formData.address.trim()) newErrors.address = 'Delivery address required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please complete the required details.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Guests check out without an explicit login — a silent anonymous session
      // gives the order an owner (so it shows in "My Orders").
      let uid = user?.uid;
      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data?.user) throw new Error('GUEST_AUTH_UNAVAILABLE');
        uid = data.user.id;
      }

      const Razorpay = await loadRazorpay();
      if (!Razorpay) throw new Error('GATEWAY_LOAD_FAILED');

      const countryName = COUNTRIES.find(c => c.code === formData.country)?.name || formData.country;
      const stateName = STATES_BY_COUNTRY[formData.country]?.find(s => s.code === formData.state)?.name || formData.state;

      // The server recomputes the amount from these — never trusts the browser.
      const items = itemsWithPricing.map(item => {
        const selections: Record<string, string> = {};
        const selectionLabels: { label: string; value: string; priceDelta: number }[] = [];
        item.selections.forEach((s: any) => {
          selections[s.groupId] = s.type === 'text' && s.valueText ? s.valueText : s.optionId;
          selectionLabels.push({
            label: s.groupLabel,
            value: s.type === 'text' && s.valueText ? s.valueText : s.optionLabel,
            priceDelta: s.priceDelta || 0,
          });
        });
        return {
          productId: (item.product as any).activeSubSeriesId || item.product.id,
          seriesSlug: item.product.slug,
          productName: item.product.name + (item.product.subSeriesName ? ` - ${item.product.subSeriesName}` : ''),
          selections,
          selectionLabels,
          quantity: item.quantity,
        };
      });

      const shipping = {
        name: formData.name, email: formData.email, phone: formData.phone,
        country: countryName, state: stateName, city: formData.city,
        pincode: formData.pincode, address: formData.address, notes: formData.notes,
      };

      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: { items, discountCode: discountCode || undefined, expectedTotal: grandTotal, shipping },
      });

      if (error || !data?.ok) {
        const code = (data as any)?.error;
        if (code === 'price_changed') setSubmitError('Prices have updated — please review your cart and try again.');
        else if (code === 'not_configured') setSubmitError('Payments are being set up. Please try again shortly.');
        else setSubmitError('Could not start payment. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const { orderId, razorpayOrderId, amount, currency, keyId, prefill } = data as any;

      const rzp = new Razorpay({
        key: keyId,
        order_id: razorpayOrderId,
        amount,
        currency,
        name: 'Grainood',
        description: `Handcrafted English Willow — Order ${orderId}`,
        prefill: { name: prefill?.name, email: prefill?.email, contact: prefill?.contact },
        notes: { orderId },
        theme: { color: '#c5a059' },
        handler: async (resp: any) => {
          const { data: v, error: ve } = await supabase.functions.invoke('razorpay-verify', {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          });
          clearOrder();
          if (ve || !v?.ok) {
            // Payment captured but our verify hiccuped — the webhook reconciles.
            toast.success('Payment received — confirming your order…');
            navigate('/my-orders');
            return;
          }
          navigate('/order/confirmed', { state: { orderId, email: formData.email, paid: true } });
        },
        modal: { ondismiss: () => setIsSubmitting(false) },
      });
      rzp.on('payment.failed', (r: any) => {
        setSubmitError(r?.error?.description || 'Payment failed or was cancelled. Please try again.');
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (error: any) {
      if (error?.message === 'GUEST_AUTH_UNAVAILABLE') {
        setSubmitError("Guest checkout is temporarily unavailable. Please sign in to continue.");
      } else if (error?.message === 'GATEWAY_LOAD_FAILED') {
        setSubmitError("Couldn't load the secure payment window. Check your connection and retry.");
      } else {
        setSubmitError("Something went wrong starting payment. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-bg text-content/80 min-h-screen selection:bg-[#c5a059] selection:text-white font-sans xl:pt-20 pt-20 pb-32 lg:pb-0">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 md:py-16 relative z-raised">
        
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-8 lg:mb-16">
          Checkout
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 xl:gap-24 relative">
          
          {/* LEFT: FORM OR LOGIN PROMPT */}
          <div className="xl:col-span-7 space-y-12 pb-12 xl:pb-24">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-16">

                {!user && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#c5a059]/5 border border-[#c5a059]/20 px-4 py-3 -mb-8">
                    <p className="text-[11px] text-content/80 tracking-wide">Checking out as a guest — no account needed.</p>
                    <Link to="/login" state={{ from: '/order' }} className="text-[11px] font-bold uppercase tracking-widest text-[#c5a059] hover:underline">
                      Sign in to prefill
                    </Link>
                  </div>
                )}

                {/* How it works */}
                <HowItWorks />

                {/* Contact Section */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <span className="w-6 h-6 rounded-full bg-[#c5a059] text-bg flex items-center justify-center text-[10px] font-bold">1</span>
                    <h2 className="text-content text-xl font-bold tracking-tight">Contact Details</h2>
                  </div>
                  
                  {(!profile?.phone || !profile?.fullName) && (
                    <div className="mb-6 p-4 bg-[#c5a059]/5 border border-[#c5a059]/20 text-[12px] text-content/80">
                      Please complete your contact details below to proceed.
                    </div>
                  )}

                  <div className="space-y-6 md:space-y-8 pl-0 md:pl-10">
                    <FloatingInput label="Email Address*" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <FloatingInput label="Full Name*" name="name" value={formData.name} onChange={handleChange} error={errors.name} />
                      <FloatingInput label="Phone (WhatsApp)*" name="phone" type="tel" value={formData.phone} onChange={handleChange} error={errors.phone} />
                    </div>
                  </div>
                </section>

                {/* Shipping Section */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <span className="w-6 h-6 rounded-full bg-[#c5a059] text-bg flex items-center justify-center text-[10px] font-bold">2</span>
                    <h2 className="text-content text-lg font-bold tracking-[0.2em] uppercase">Delivery Address</h2>
                  </div>

                  <div className="space-y-6 md:space-y-8 pl-0 md:pl-10">
                    <FloatingInput label="Street Address / Area*" name="address" value={formData.address} onChange={handleChange} error={errors.address} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="relative pt-6">
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          className={clsx(
                            "w-full bg-transparent border-b text-content pb-2 pt-2 focus:outline-none transition-colors text-sm",
                            errors.country ? "border-red-400 focus:border-red-500" : "border-[#c5a059]/40 focus:border-[#c5a059]"
                          )}
                        >
                          <option value="" disabled className="bg-bg text-muted">Select Country...</option>
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code} className="bg-bg text-content">{c.name}</option>
                          ))}
                        </select>
                        <label className={clsx("absolute left-0 cursor-text transition-all tracking-wider text-[10px] pointer-events-none truncate uppercase top-2", errors.country ? "text-red-400" : "text-muted/70")}>Country*</label>
                        {errors.country && <span className="absolute -bottom-5 left-0 text-[9px] text-red-400 tracking-widest uppercase">{errors.country}</span>}
                      </div>

                      <div className="relative pt-6">
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          disabled={!formData.country}
                          className={clsx(
                            "w-full bg-transparent border-b text-content pb-2 pt-2 focus:outline-none transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-50",
                            errors.state ? "border-red-400 focus:border-red-500" : "border-[#c5a059]/40 focus:border-[#c5a059]"
                          )}
                        >
                          <option value="" disabled className="bg-bg text-muted">Select State/Province...</option>
                          {(STATES_BY_COUNTRY[formData.country] || []).map(s => (
                            <option key={s.code} value={s.code} className="bg-bg text-content">{s.name}</option>
                          ))}
                        </select>
                        <label className={clsx("absolute left-0 cursor-text transition-all tracking-wider text-[10px] pointer-events-none truncate uppercase top-2", errors.state ? "text-red-400" : "text-muted/70")}>State / Province*</label>
                        {errors.state && <span className="absolute -bottom-5 left-0 text-[9px] text-red-400 tracking-widest uppercase">{errors.state}</span>}
                      </div>
                      
                      {!isOtherCity ? (
                        <div className="relative pt-6">
                          <select
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            disabled={!formData.state}
                            className={clsx(
                              "w-full bg-transparent border-b text-content pb-2 pt-2 focus:outline-none transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-50",
                              errors.city ? "border-red-400 focus:border-red-500" : "border-[#c5a059]/40 focus:border-[#c5a059]"
                            )}
                            required
                          >
                            <option value="" disabled className="bg-bg text-muted">Select City...</option>
                            {(CITIES_BY_STATE[formData.state] || []).map(c => (
                              <option key={c} value={c} className="bg-bg text-content">{c}</option>
                            ))}
                            <option value="Other" className="bg-bg text-content">Other</option>
                          </select>
                          <label className={clsx("absolute left-0 cursor-text transition-all tracking-wider text-[10px] pointer-events-none truncate uppercase top-2", errors.city ? "text-red-400" : "text-muted/70")}>City*</label>
                          {errors.city && <span className="absolute -bottom-5 left-0 text-[9px] text-red-400 tracking-widest uppercase">{errors.city}</span>}
                        </div>
                      ) : (
                        <FloatingInput label="City*" name="city" value={formData.city} onChange={handleChange} error={errors.city} />
                      )}

                      <FloatingInput label="Pincode / ZIP*" name="pincode" value={formData.pincode} onChange={handleChange} error={errors.pincode} />
                    </div>

                    <div className="relative pt-6">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder=" "
                        rows={3}
                        className="peer w-full bg-transparent border-b border-[#c5a059]/40 text-content pb-2 pt-2 focus:outline-none focus:border-[#c5a059] transition-colors resize-none placeholder-transparent"
                      ></textarea>
                      <label className="absolute left-0 top-2 text-[#c5a059]/60 text-sm tracking-wider transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-8 peer-focus:top-2 peer-focus:text-xs peer-focus:text-premium-gold-text uppercase">
                        Order Notes (Optional)
                      </label>
                    </div>
                  </div>
                </section>

              </form>

            {/* Desktop Trust Row */}
            <div className="hidden xl:grid grid-cols-3 gap-8 pt-12 border-t border-[#c5a059]/20">
               <div className="flex items-start gap-4">
                 <ShieldCheck size={24} className="text-[#c5a059] shrink-0" />
                 <div>
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-content mb-1">Authentic Quality</h4>
                   <p className="text-[10px] text-muted leading-relaxed">Handcrafted directly in our workshop with genuine materials.</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <Lock size={24} className="text-[#c5a059] shrink-0" />
                 <div>
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-content mb-1">Safe Checkout</h4>
                   <p className="text-[10px] text-muted leading-relaxed">Encrypted payment via Razorpay — UPI, GPay, or card. We never see your card details.</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <Hammer size={24} className="text-[#c5a059] shrink-0" />
                 <div>
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-content mb-1">Master Craftsmanship</h4>
                   <p className="text-[10px] text-muted leading-relaxed">Each bat is individually shaped and balanced for maximum performance.</p>
                 </div>
               </div>
            </div>
          </div>

          {/* RIGHT / BOTTOM: STICKY SUMMARY */}
          <div className={clsx(
            "xl:col-span-5 relative xl:block",
            "fixed inset-x-0 bottom-0 z-sticky-section bg-bg border-t border-[#c5a059]/40 xl:border-none xl:bg-transparent xl:relative xl:z-auto transition-transform duration-300",
            !isMobileSummaryOpen && "translate-y-[calc(100%-80px)] xl:translate-y-0"
          )}>
            <div className="xl:sticky xl:top-[120px] bg-surface xl:bg-surface/50 border border-[#c5a059]/20 xl:border-none p-0 xl:p-8 flex flex-col h-[85vh] xl:h-auto max-h-[800px]">
              
              {/* Mobile Handle / Toggle */}
              <button 
                onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
                className="xl:hidden flex items-center justify-between p-4 h-[80px] w-full border-b border-[#c5a059]/10 bg-bg/95  shrink-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-content">Order Total</span>
                  <span className="text-[14px] text-[#c5a059] tracking-widest">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] tracking-widest text-muted uppercase">
                  {isMobileSummaryOpen ? 'Close' : 'View Summary'}
                  {isMobileSummaryOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
              </button>

              <div className="flex-1 overflow-y-auto p-6 xl:p-0 custom-scrollbar">
                <h2 className="hidden xl:block text-content text-lg font-bold tracking-[0.2em] uppercase mb-8 pb-4 border-b border-[#c5a059]/20">Review Order</h2>
                
                <div className="space-y-6 border-b border-[#c5a059]/20 pb-8">
                  {itemsWithPricing.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-20 bg-elevated border border-[#c5a059]/20 flex-shrink-0 flex items-center justify-center p-1">
                        <LazyImage 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          containerClassName="w-full h-full"
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="text-content font-bold tracking-[0.1em] text-xs uppercase leading-snug">
                            {item.product.name}
                            <span className="block text-[#c5a059]/80 text-[10px] mt-1">{item.product.subSeriesName}</span>
                          </h3>
                          <span className="text-[#c5a059] text-[11px] font-mono tracking-widest whitespace-nowrap mt-0.5">₹{(item.pricingResult.total * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          {item.selections.map((s, idx) => (
                            <div key={idx} className="text-[10px] tracking-wider uppercase text-muted/80 leading-relaxed break-words">
                               <span className="text-content/60">{s.groupLabel}:</span> {s.type === 'text' && s.valueText ? s.valueText : s.optionLabel}
                               {(s.priceDelta && s.priceDelta > 0) ? <span className="text-[#c5a059]/60 ml-1">(+₹{s.priceDelta})</span> : null}
                            </div>
                          ))}
                        </div>

                        {/* Edit Inline Controls */}
                        <div className="flex items-center gap-4 py-2 border-t border-line/30 mt-2">
                           <div className="flex items-center border border-[#c5a059]/20 bg-elevated">
                             <button onClick={() => setQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-1.5 text-muted hover:text-content hover:bg-[#c5a059]/10 transition-colors"><Minus size={12} /></button>
                             <span className="w-6 text-center text-[10px] font-mono">{item.quantity}</span>
                             <button onClick={() => setQuantity(item.id, item.quantity + 1)} className="p-1.5 text-muted hover:text-content hover:bg-[#c5a059]/10 transition-colors"><Plus size={12} /></button>
                           </div>
                           <button onClick={() => removeItem(item.id)} className="text-[10px] uppercase tracking-widest text-[#c5a059]/60 hover:text-red-400 flex items-center gap-1 transition-colors">
                              <Trash2 size={12} /> Remove
                           </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 py-8 border-b border-[#c5a059]/20">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Discount Code" 
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="flex-1 bg-elevated border border-[#c5a059]/20 text-content px-4 py-3 uppercase tracking-wider text-xs focus:outline-none focus:border-[#c5a059]"
                    />
                    <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-bg bg-[#c5a059] px-6 py-2 hover:bg-[#d8cda2] transition-colors">Apply</button>
                  </div>

                  {codeStatus === 'checking' && (
                    <p className="text-[10px] uppercase tracking-widest text-muted">Checking code…</p>
                  )}
                  {codeStatus === 'valid' && (
                    <p className="text-[10px] uppercase tracking-widest text-[#c5a059]">✓ Code applied</p>
                  )}
                  {codeStatus === 'invalid' && (
                    <p className="text-[10px] uppercase tracking-widest text-red-400">Invalid or expired code</p>
                  )}

                  <div className="flex justify-between text-content/80 text-[11px] tracking-widest uppercase mt-6">
                    <span>Base Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discountsApplied && discountsApplied.map((d, i) => (
                    <div key={i} className="flex justify-between text-[#c5a059] text-[11px] tracking-widest uppercase">
                      <span>{d.label}</span>
                      <span>- ₹{d.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-content text-sm tracking-widest uppercase pt-4">
                    <span>Total Amount</span>
                    <span className="text-[#c5a059]">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* INFO BOX */}
                <div className="mt-8 bg-[#c5a059]/5 border border-[#c5a059]/20 p-4 rounded-sm mb-8 xl:mb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[#c5a059] text-[10px] font-bold tracking-[0.2em] uppercase">SECURE PAYMENT</h3>
                    <span className="text-[9px] uppercase tracking-widest text-content/60 border border-[#c5a059]/20 px-2 py-0.5 whitespace-nowrap">UPI · GPay · Card</span>
                  </div>
                  <p className="text-content/80 text-[10px] leading-relaxed tracking-wider">
                    Pay securely via GPay, any UPI app, or card. Your order is confirmed the moment payment succeeds and crafting begins. All payments are encrypted and processed by Razorpay.
                  </p>
                  <p className="text-[#c5a059]/70 text-[10px] tracking-wider mt-3 font-semibold uppercase">
                    Estimated Delivery: 10-15 working days
                  </p>
                </div>
                
                {/* Mobile Extra Space for Sticky Button */}
                <div className="h-24 xl:hidden"></div>
              </div>

              {/* Sticky Submit action in block */}
              <div className="p-4 xl:p-0 xl:mt-8 bg-surface/95 xl:bg-transparent  border-t border-[#c5a059]/10 xl:border-none absolute xl:relative bottom-0 left-0 right-0 z-raised">
                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-4 text-[10px] leading-relaxed tracking-widest uppercase text-center w-full">
                    {submitError}
                  </div>
                )}

                <GoldButton
                  as="button"
                  type="submit"
                  form="checkout-form"
                  isLoading={isSubmitting}
                  variant="solid"
                  onClick={() => {
                      setIsMobileSummaryOpen(false);
                  }}
                  className="w-full"
                >
                  PAY ₹{grandTotal.toLocaleString('en-IN')} & PLACE ORDER
                </GoldButton>
                <p className="text-[9px] text-muted text-center tracking-widest uppercase mt-3">Secure payment via UPI · GPay · Card — powered by Razorpay</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function FloatingInput({ label, name, type = 'text', value, onChange, error }: any) {
  return (
    <div className="relative pt-6 max-w-full">
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        className={clsx(
          "peer w-full bg-transparent border-b text-content pb-3 pt-2 focus:outline-none transition-colors placeholder-transparent text-sm",
          error ? "border-red-400 focus:border-red-500" : "border-[#c5a059]/40 focus:border-[#c5a059]"
        )}
      />
      <label 
        htmlFor={name}
        className={clsx(
          "absolute left-0 cursor-text transition-all tracking-wider text-sm pointer-events-none truncate max-w-full",
          "peer-placeholder-shown:text-sm peer-placeholder-shown:top-8",
          "peer-focus:top-2 peer-focus:text-[10px]",
          error ? "text-red-400 peer-focus:text-red-400" : "text-muted/70 peer-focus:text-[#c5a059]",
          (!value && !error) ? "top-8 text-sm" : "top-2 text-[10px]"
        )}
      >
        {label}
      </label>
      {error && <span className="absolute -bottom-5 left-0 text-[9px] text-red-400 tracking-widest uppercase">{error}</span>}
    </div>
  );
}

