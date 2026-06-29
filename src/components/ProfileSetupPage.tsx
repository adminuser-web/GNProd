import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoldButton } from './GoldButton';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';
import { RevealSection } from './Reveal';
import { toast } from 'sonner';
import { COUNTRIES, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../data/locations';

function FloatingInput({ label, name, type = 'text', value, onChange, error, required = false }: any) {
  return (
    <div className="relative pt-6">
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder=" "
        className={clsx(
          "peer w-full bg-transparent border-b text-content pb-2 pt-2 focus:outline-none transition-colors placeholder-transparent",
          error ? "border-red-300 focus:border-red-500" : "border-[#c5a059]/40 focus:border-[#c5a059]"
        )}
      />
      <label 
        htmlFor={name}
        className={clsx(
          "absolute left-0 cursor-text transition-all tracking-wider uppercase text-sm",
          "peer-placeholder-shown:text-base peer-placeholder-shown:top-8",
          "peer-focus:top-2 peer-focus:text-xs",
          error ? "text-red-500 peer-focus:text-red-500" : "text-muted peer-focus:text-[#c5a059]",
          // Date inputs always show a native placeholder (dd/mm/yyyy), so keep the
          // label raised to avoid overlapping it.
          (type !== 'date' && !value && !error) ? "top-8 text-base" : "top-2 text-xs"
        )}
      >
        {label} {required && '*'}
      </label>
    </div>
  );
}

export function ProfileSetupPage({ isSetup = false }: { isSetup?: boolean }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    dob: profile?.dob || '',
    line1: profile?.address?.line1 || '',
    line2: profile?.address?.line2 || '',
    city: profile?.address?.city || '',
    state: profile?.address?.state || '',
    pincode: profile?.address?.pincode || '',
    country: profile?.address?.country || '',
    marketingConsent: profile?.marketingConsent ?? true
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isOtherCity, setIsOtherCity] = useState(false);

  useEffect(() => {
    document.title = isSetup ? "Complete Profile — Grainood" : "My Profile — Grainood";
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        line1: profile.address?.line1 || '',
        line2: profile.address?.line2 || '',
        city: profile.address?.city || '',
        state: profile.address?.stateCode || profile.address?.state || '',
        pincode: profile.address?.pincode || '',
        country: profile.address?.countryCode || profile.address?.country || '',
        marketingConsent: profile.marketingConsent ?? true
      });
    }
  }, [profile, isSetup]);

  // Check if saved city is not in dropdown for selected state
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const finalValue = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: finalValue };
      if (name === 'country') {
        updated.state = '';
        updated.city = '';
        setIsOtherCity(false);
      } else if (name === 'state') {
        updated.city = '';
        setIsOtherCity(false);
      } else if (name === 'city' && finalValue === 'Other') {
        updated.city = '';
        setIsOtherCity(true);
      }
      return updated;
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (formData.country === 'IN') {
        if (!/^\d{6}$/.test(formData.pincode)) {
          throw new Error("Invalid pincode for India. It must be 6 digits.");
        }
        const phoneDigits = formData.phone.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 12) {
           throw new Error("Invalid phone number for India.");
        }
      }

      const isComplete = Boolean(
        formData.fullName && 
        formData.phone && 
        formData.line1 && 
        formData.city && 
        formData.state && 
        formData.pincode && 
        formData.country
      );

      if (isSetup && !isComplete) {
        throw new Error("Please fill in all required fields.");
      }

      const countryName = COUNTRIES.find(c => c.code === formData.country)?.name || formData.country;
      const stateName = STATES_BY_COUNTRY[formData.country]?.find(s => s.code === formData.state)?.name || formData.state;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          dob: formData.dob || null,
          address: {
            line1: formData.line1,
            line2: formData.line2 || '',
            city: formData.city,
            stateCode: formData.state,
            state: stateName,
            pincode: formData.pincode,
            countryCode: formData.country,
            country: countryName
          },
          marketing_consent: formData.marketingConsent,
          profile_completed: isComplete,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.uid);
      if (updateError) throw updateError;

      if (isSetup) {
        toast.success("Profile setup complete!");
        navigate('/my-orders');
      } else {
        toast.success("Profile updated successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto">
        <RevealSection>
          <div className="mb-12">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-content mb-4">
              {isSetup ? 'Complete Your Profile' : 'My Profile'}
            </h1>
            <p className="text-muted tracking-wide text-sm font-light">
              {isSetup 
                ? 'Please provide your details below to continue. This information will be used to expedite your future checkout experiences.' 
                : 'Update your personal information and shipping details.'}
            </p>
          </div>

          {!isSetup && !profile?.profileCompleted && (
            <div className="mb-8 p-4 bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-bold uppercase tracking-widest flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Please complete your profile to enable seamless checkout.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12">
            
            <div className="bg-surface border border-[#c5a059]/10 p-8 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-8 pb-2 border-b border-[#c5a059]/20">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FloatingInput label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
                <FloatingInput label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
                <div className="md:col-span-2">
                  <FloatingInput label="Date of Birth (YYYY-MM-DD)" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="bg-surface border border-[#c5a059]/10 p-8 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-8 pb-2 border-b border-[#c5a059]/20">Address Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <FloatingInput label="Address Line 1" name="line1" value={formData.line1} onChange={handleChange} required />
                </div>
                <div className="md:col-span-2">
                  <FloatingInput label="Address Line 2 (Optional)" name="line2" value={formData.line2} onChange={handleChange} />
                </div>
                
                <div className="relative pt-6">
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-[#c5a059]/40 text-content pb-2 pt-2 focus:outline-none transition-colors focus:border-[#c5a059] text-base"
                    required
                  >
                    <option value="" disabled className="bg-bg text-muted">Select Country...</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code} className="bg-bg text-content">{c.name}</option>
                    ))}
                  </select>
                  <label className="absolute left-0 cursor-text transition-all tracking-wider text-xs pointer-events-none truncate uppercase top-2 text-muted focus:text-[#c5a059]">Country*</label>
                </div>

                <div className="relative pt-6">
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={!formData.country}
                    className="w-full bg-transparent border-b border-[#c5a059]/40 text-content pb-2 pt-2 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:border-[#c5a059] text-base"
                    required
                  >
                    <option value="" disabled className="bg-bg text-muted">Select State/Province...</option>
                    {(STATES_BY_COUNTRY[formData.country] || []).map(s => (
                      <option key={s.code} value={s.code} className="bg-bg text-content">{s.name}</option>
                    ))}
                  </select>
                  <label className="absolute left-0 cursor-text transition-all tracking-wider text-xs pointer-events-none truncate uppercase top-2 text-muted focus:text-[#c5a059]">State / Province*</label>
                </div>

                {!isOtherCity ? (
                  <div className="relative pt-6">
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={!formData.state}
                      className="w-full bg-transparent border-b border-[#c5a059]/40 text-content pb-2 pt-2 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:border-[#c5a059] text-base"
                      required
                    >
                      <option value="" disabled className="bg-bg text-muted">Select City...</option>
                      {(CITIES_BY_STATE[formData.state] || []).map(c => (
                        <option key={c} value={c} className="bg-bg text-content">{c}</option>
                      ))}
                      <option value="Other" className="bg-bg text-content">Other</option>
                    </select>
                    <label className="absolute left-0 cursor-text transition-all tracking-wider text-xs pointer-events-none truncate uppercase top-2 text-muted focus:text-[#c5a059]">City*</label>
                  </div>
                ) : (
                  <FloatingInput label="City" name="city" value={formData.city} onChange={handleChange} required />
                )}

                <FloatingInput label="PIN / ZIP Code" name="pincode" value={formData.pincode} onChange={handleChange} required />
              </div>
            </div>

            <div className="bg-surface border border-[#c5a059]/10 p-8 shadow-sm">
               <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex items-start pt-1">
                     <input 
                        type="checkbox" 
                        name="marketingConsent"
                        checked={formData.marketingConsent}
                        onChange={handleChange}
                        className="peer sr-only"
                     />
                     <div className="w-5 h-5 border border-[#c5a059]/50 peer-checked:bg-[#c5a059] peer-checked:border-[#c5a059] transition-all flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#1a1a1a] opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                     </div>
                  </div>
                  <div>
                     <p className="font-bold text-sm text-content tracking-wider uppercase group-hover:text-[#c5a059] transition-colors">Marketing Notifications</p>
                     <p className="text-xs text-muted mt-1 leading-relaxed">
                        I would like to receive news, special offers, and early access to drops via email.
                     </p>
                  </div>
               </label>
            </div>

            {errorMsg && (
              <div className="text-red-500 tracking-wider uppercase text-xs p-4 bg-red-500/10 border border-red-500/20">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="text-green-500 tracking-wider uppercase text-xs p-4 bg-green-500/10 border border-green-500/20">
                {successMsg}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <GoldButton 
                type="submit" 
                variant="solid" 
                className="px-8" 
                disabled={loading}
              >
                {loading ? 'Saving...' : isSetup ? 'Complete Setup' : 'Save Changes'}
              </GoldButton>
            </div>
          </form>
        </RevealSection>
      </div>
    </div>
  );
}
