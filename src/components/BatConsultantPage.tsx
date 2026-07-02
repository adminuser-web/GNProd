import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useAuth } from '../context/AuthContext';
import { BatConsultantInput, consultBat, BatConsultantRecommendation, PlayerProfile, BattingStyle, PickupFeel, BudgetRange, CustomizationPreference } from '../features/consultant/consultantRules';
import { GoldButton } from './GoldButton';
import { RevealSection } from './Reveal';
import { clsx } from 'clsx';
import { ArrowRight, Download, Share2, MessageSquare, ChevronLeft, Save } from 'lucide-react';
import { BRAND } from '../types';
import { toast } from 'sonner';
import { EnquiryDrawer } from './EnquiryDrawer';
import { motion, AnimatePresence } from 'motion/react';
import { buildService } from '../features/builds/services/buildService';

// AI recommended setup (camelCase) → the app's kebab-case build selections.
const SETUP_KEYS: { field: keyof BatConsultantRecommendation['recommendedSetup']; groupId: string; groupLabel: string }[] = [
  { field: 'batSize', groupId: 'bat-size', groupLabel: 'Bat Size' },
  { field: 'weightProfile', groupId: 'weight-profile', groupLabel: 'Weight Profile' },
  { field: 'batProfile', groupId: 'bat-profile', groupLabel: 'Bat Profile' },
  { field: 'sweetSpot', groupId: 'sweet-spot', groupLabel: 'Sweet Spot' },
  { field: 'handleShape', groupId: 'handle-shape', groupLabel: 'Handle Shape' },
  { field: 'gripColor', groupId: 'grip-color', groupLabel: 'Grip Colour' },
];

export function BatConsultantPage() {
  const { products: activeProducts } = useProducts();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BatConsultantRecommendation | null>(null);
  const [isEnquiryDrawerOpen, setIsEnquiryDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [input, setInput] = useState<BatConsultantInput>({
    playerProfile: 'Club Cricketer',
    battingStyle: 'Balanced All-Round Game',
    pickupFeel: 'Balanced Pickup',
    budgetRange: '₹25,000 – ₹40,000',
    customizationPreference: 'Some customization'
  });

  const goNext = () => setStep(step + 1);
  const goBack = () => setStep(step - 1);

  const handleSelect = (field: keyof BatConsultantInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyze = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const rec = consultBat(input, activeProducts);
      setResult(rec);
      setIsProcessing(false);
      setStep(10); // Result step
    }, 1500); // Simulate engine processing delay
  };

  const renderOptions = (field: keyof BatConsultantInput, options: string[]) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => handleSelect(field, opt)}
            className={clsx(
              "p-6 border text-left transition-all duration-300",
              input[field] === opt 
                ? "border-[#c5a059] bg-[#c5a059]/10 shadow-[0_0_20px_rgba(197,160,89,0.15)]" 
                : "border-[#c5a059]/30 hover:border-[#c5a059]/60 hover:bg-surface"
            )}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-content tracking-wider uppercase text-sm">{opt}</span>
              <div className={clsx("w-3 h-3 rounded-full border", input[field] === opt ? "border-[#c5a059] bg-[#c5a059]" : "border-muted")} />
            </div>
          </button>
        ))}
      </div>
    );
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const msg = `Hi Grainood, I used the AI Bat Consultant and got recommended: ${result.seriesName} ${result.subSeriesName ? result.subSeriesName : ''}. I want help finalizing my bat.`;
    const url = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    if (!result) return;
    
    // In a real app we might encode params in URL, here we just share current URL
    const url = window.location.href;
    
    if (navigator.share) {
      try {
         await navigator.share({
           title: 'My Match - Grainood Bat Consultant',
           text: `I got recommended the ${result.seriesName} ${result.subSeriesName || ''}. Check out the consultant!`,
           url: url
         });
         toast.success("Shared successfully");
      } catch (err) {
         console.error(err);
      }
    } else {
       navigator.clipboard.writeText(url).then(() => {
         toast.success("Link copied to clipboard");
       }).catch((err) => {
         toast.error("Failed to copy link. Clipboard access might be restricted.");
         console.error(err);
       });
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/bat-consultant' } });
      toast.error("Please sign in to save your recommendation");
      return;
    }
    if (!result || saving) return;
    setSaving(true);
    try {
      const selections = SETUP_KEYS
        .filter(({ field }) => result.recommendedSetup?.[field])
        .map(({ field, groupId, groupLabel }) => ({
          groupId, groupLabel,
          optionLabel: String(result.recommendedSetup![field]),
          type: 'single_select' as const,
          priceDelta: 0,
        }));

      await buildService.saveBuild({
        userId: user.uid,
        name: `AI Pick — ${result.subSeriesName || result.seriesName}`,
        seriesId: result.seriesSlug,
        seriesSlug: result.seriesSlug,
        seriesName: result.seriesName,
        subSeriesId: result.subSeriesSlug || result.seriesSlug,
        subSeriesSlug: result.subSeriesSlug || result.seriesSlug,
        subSeriesName: result.subSeriesName || result.seriesName,
        productSnapshot: { gradeLabel: result.gradeLabel, price: result.price },
        selections,
        priceSnapshot: { basePrice: result.price ?? 0, customizationTotal: 0, total: result.price ?? 0, currency: 'INR' },
        source: 'ai_consultant',
      } as any);

      toast.success('Saved to your Garage.', {
        action: { label: 'View', onClick: () => navigate('/my-builds') },
      });
    } catch (e: any) {
      console.error('saveBuild failed', e);
      toast.error('Could not save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 10 && result) {
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen">
        <RevealSection className="max-w-4xl mx-auto">
          <div className="text-center mb-12 border-b border-[#c5a059]/20 pb-12">
            <h1 className="text-4xl font-bold tracking-tight text-content mb-4 text-center md:text-left">Your Custom Recommendation</h1>
            <p className="text-muted tracking-wide">Analysis Complete. Confidence Match: <span className="text-[#c5a059] font-bold">{result.confidence}%</span></p>
          </div>

          <div className="bg-surface border border-[#c5a059]/20 p-8 md:p-12 shadow-sm relative overflow-hidden group mb-8">
            <div className="absolute top-0 right-0 p-6 text-[100px] leading-none text-[#c5a059]/5 select-none font-bold">#1</div>
            <div className="relative z-raised flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-[#c5a059] text-xs font-bold uppercase tracking-[0.2em] mb-2">Primary Recommendation</h3>
                  <h2 className="text-3xl font-bold text-content uppercase tracking-wider">{result.seriesName}</h2>
                  {result.subSeriesName && (
                    <h4 className="text-xl text-content/80 mt-1 uppercase tracking-wide">{result.subSeriesName}</h4>
                  )}
                  {result.price !== undefined && (
                     <p className="text-sm font-mono mt-2 text-[#c5a059]">Starting from ₹{(result.price ?? 0).toLocaleString('en-IN')}</p>
                  )}
                </div>
                
                <p className="text-muted leading-relaxed italic border-l-2 border-[#c5a059] pl-4">
                  "{result.reason}"
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-bg border border-[#c5a059]/10 p-4">
                     <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Weight Profile</p>
                     <p className="text-sm text-content font-bold">{result.recommendedSetup.weightProfile}</p>
                  </div>
                  <div className="bg-bg border border-[#c5a059]/10 p-4">
                     <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Sweet Spot</p>
                     <p className="text-sm text-content font-bold">{result.recommendedSetup.sweetSpot}</p>
                  </div>
                  <div className="bg-bg border border-[#c5a059]/10 p-4">
                     <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Handle Shape</p>
                     <p className="text-sm text-content font-bold">{result.recommendedSetup.handleShape}</p>
                  </div>
                  <div className="bg-bg border border-[#c5a059]/10 p-4">
                     <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Bat Profile</p>
                     <p className="text-sm text-content font-bold">{result.recommendedSetup.batProfile}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted italic mt-4 text-center md:text-left">Recommendation is based on your playing level, batting style, pickup preference, budget, and customization needs.</p>

                <div className="pt-6">
                   {/* Create URL with default query parameters to guide configuration */}
                   <GoldButton as={Link} to={`/collection/${result.seriesSlug}/${result.subSeriesSlug || ''}?from=consultant&weight=${encodeURIComponent(result.recommendedSetup.weightProfile || '')}&spot=${encodeURIComponent(result.recommendedSetup.sweetSpot || '')}`} variant="solid" className="w-full justify-center">
                     View Recommended Bat <ArrowRight size={16} className="ml-2" />
                   </GoldButton>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-[0.2em] mb-4 text-center md:text-left">Alternative Option</h3>
              {result.alternatives.length > 0 ? (
                <div className="border border-[#c5a059]/20 p-6 flex flex-col bg-surface hover:bg-surface/80 transition-colors h-full justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="text-content font-bold uppercase tracking-wider">{result.alternatives[0].seriesName}</h4>
                       <Link to={`/collection/${result.alternatives[0].seriesSlug}/${result.alternatives[0].subSeriesSlug || ''}`} className="text-[#c5a059] hover:text-content">
                         <ArrowRight size={20} />
                       </Link>
                    </div>
                    {result.alternatives[0].subSeriesName && (
                       <p className="text-xs text-[#c5a059] font-bold uppercase mb-2">{result.alternatives[0].subSeriesName}</p>
                    )}
                    <p className="text-xs text-muted leading-relaxed">{result.alternatives[0].reason}</p>
                  </div>
                </div>
              ) : (
                <div className="border border-line/50 p-6 text-center text-muted text-sm h-full flex flex-col justify-center">No viable alternatives found matching your specific criteria.</div>
              )}
            </div>
            
            <div className="flex flex-col justify-center gap-4">
              <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-3 w-full border border-[#c5a059]/40 py-4 text-sm font-bold tracking-widest uppercase hover:bg-[#c5a059]/10 transition-colors text-content disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving…' : 'Save Recommendation'}
              </button>
              <button onClick={handleShare} className="flex items-center justify-center gap-3 w-full border border-[#c5a059]/40 py-4 text-sm font-bold tracking-widest uppercase hover:bg-[#c5a059]/10 transition-colors text-content">
                <Share2 size={16} /> Share Result
              </button>
            </div>
          </div>

          <div className="bg-[#2563D0]/10 border border-[#2563D0]/30 p-8 flex flex-col items-center justify-between gap-6">
            <div className="text-center">
              <h3 className="text-content font-bold tracking-widest uppercase text-lg mb-2">Need a human touch?</h3>
              <p className="text-muted text-sm max-w-lg mx-auto">Our master bat makers are available via WhatsApp or email to review this recommendation and fine-tune your exact specifications.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
              <GoldButton variant="solid" className="flex-shrink-0 justify-center" onClick={() => setIsEnquiryDrawerOpen(true)}>
                 Ask Grainood Expert
              </GoldButton>
              <GoldButton variant="outline" className="flex-shrink-0 justify-center" onClick={handleWhatsApp}>
                 <MessageSquare size={16} className="mr-2" /> WhatsApp Inquiry
              </GoldButton>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <button onClick={() => setStep(0)} className="text-muted hover:text-[#c5a059] text-xs font-bold uppercase tracking-widest border-b border-transparent hover:border-[#c5a059] pb-1 transition-all">Start Over</button>
          </div>

        </RevealSection>

        <EnquiryDrawer 
          isOpen={isEnquiryDrawerOpen}
          onClose={() => setIsEnquiryDrawerOpen(false)}
          source="ai_consultant"
          defaultType="pro_consultation"
          productRef={result ? {
            seriesSlug: result.seriesSlug,
            seriesName: result.seriesName,
            subSeriesSlug: result.subSeriesSlug,
            subSeriesName: result.subSeriesName
          } : undefined}
        />
      </div>
    );
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center">
         <div className="text-center max-w-md">
            <div className="w-16 h-16 border-4 border-[#c5a059]/20 border-t-[#c5a059] rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 animate-pulse">Analyzing Data</h2>
            <p className="text-muted tracking-wide text-sm font-light">
              Running our model to find your perfect English Willow match.
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <RevealSection>

          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
               <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-content mb-4">Find Your Perfect Grainood Bat</h1>
               <p className="text-muted tracking-wide text-sm mb-12 max-w-lg mx-auto leading-relaxed">
                 Answer 5 quick questions and we’ll suggest the right English Willow bat for your game. 
               </p>
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <GoldButton variant="solid" onClick={() => setStep(1)} className="px-8 justify-center">
                    Start Consultant <ArrowRight size={16} className="ml-2" />
                  </GoldButton>
                  <GoldButton variant="outline" as={Link} to="/collection" className="px-8 justify-center">
                    Browse Collection
                  </GoldButton>
               </div>
            </div>
          )}

          {step > 0 && step < 6 && (
            <>
              <div className="flex justify-between items-center mb-8">
                {step > 1 ? (
                  <button onClick={goBack} className="text-muted hover:text-[#c5a059] flex items-center gap-2 text-xs uppercase tracking-widest font-bold">
                    <ChevronLeft size={16} /> Back
                  </button>
                ) : (
                  <button onClick={() => setStep(0)} className="text-muted hover:text-[#c5a059] flex items-center gap-2 text-xs uppercase tracking-widest font-bold">
                    <ChevronLeft size={16} /> Cancel
                  </button>
                )}
                <div className="text-[10px] text-muted uppercase tracking-[0.2em]">Step <span className="text-[#c5a059] font-bold">{step}</span> of 5</div>
              </div>
              <div className="w-full bg-[#c5a059]/10 h-1 mb-12 relative overflow-hidden">
                <div 
                   className="absolute top-0 left-0 h-full bg-[#c5a059] transition-all duration-500 ease-out" 
                   style={{ width: `${(step / 5) * 100}%` }} 
                />
              </div>

              <div className="min-h-[400px] overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-full">
                      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 text-center md:text-left">What best describes the player?</h2>
                      <p className="text-muted tracking-wide text-sm text-center md:text-left">Helps us determine the product tier.</p>
                      {renderOptions('playerProfile', [
                        'Beginner / Casual Player', 
                        'Club Cricketer', 
                        'League / Tournament Player', 
                        'Advanced / Serious Player', 
                        'Professional / Premium Buyer'
                      ])}
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-full">
                      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 text-center md:text-left">How do you usually bat?</h2>
                      <p className="text-muted tracking-wide text-sm text-center md:text-left">Determines performance priority and profile recommendation.</p>
                      {renderOptions('battingStyle', [
                        'Timing & Stroke Play', 
                        'Power Hitting', 
                        'Balanced All-Round Game', 
                        'Defensive / Control Focus',
                        'Front-foot Dominant'
                      ])}
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-full">
                      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 text-center md:text-left">How should the bat feel in your hands?</h2>
                      <p className="text-muted tracking-wide text-sm text-center md:text-left">Determines weight profile and ranking.</p>
                      {renderOptions('pickupFeel', [
                        'Light Pickup', 
                        'Balanced Pickup', 
                        'Powerful / Slightly Heavy', 
                        'Not Sure'
                      ])}
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div key="step-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-full">
                      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 text-center md:text-left">What budget range are you comfortable with?</h2>
                      <p className="text-muted tracking-wide text-sm text-center md:text-left">Prevents recommending a bat far outside your budget.</p>
                      {renderOptions('budgetRange', [
                        'Under ₹15,000', 
                        '₹15,000 – ₹25,000', 
                        '₹25,000 – ₹40,000', 
                        '₹40,000 – ₹60,000',
                        '₹60,000+ / Best Available'
                      ])}
                    </motion.div>
                  )}

                  {step === 5 && (
                    <motion.div key="step-5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-full">
                      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 text-center md:text-left">How much control do you want over the bat build?</h2>
                      <p className="text-muted tracking-wide text-sm text-center md:text-left">Determines whether to recommend simple series or premium configurable ones.</p>
                      {renderOptions('customizationPreference', [
                        'Basic setup is enough', 
                        'Some customization', 
                        'Full custom build', 
                        'I want expert help choosing'
                      ])}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-12 flex justify-end">
                 {step < 5 ? (
                   <GoldButton variant="outline" onClick={goNext}>
                     Next Step <ArrowRight size={16} className="ml-2" />
                   </GoldButton>
                 ) : (
                   <GoldButton variant="solid" onClick={handleAnalyze} className="px-12 py-4 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
                     Get Recommendation
                   </GoldButton>
                 )}
              </div>
            </>
          )}

        </RevealSection>
      </div>
    </div>
  );
}
