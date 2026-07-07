import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useAuth } from '../context/AuthContext';
import {
  BatConsultantInput, consultBat, BatConsultantRecommendation,
  consultByStats, StatsRecommendation, StatsFollowUp,
} from '../features/consultant/consultantRules';
import { deriveBattingDNA, BattingDNA } from '../features/consultant/battingProfile';
import { GoldButton } from './GoldButton';
import { RevealSection } from './Reveal';
import { clsx } from 'clsx';
import { ArrowRight, Share2, MessageSquare, ChevronLeft, Save, BarChart3, ListChecks, Trophy } from 'lucide-react';
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

type Mode = 'quiz' | 'stats';

const STAT_FIELDS: { key: string; label: string; ph: string }[] = [
  { key: 'matches', label: 'Matches', ph: 'e.g. 177' },
  { key: 'innings', label: 'Innings', ph: 'e.g. 122' },
  { key: 'runs', label: 'Runs', ph: 'e.g. 1031' },
  { key: 'average', label: 'Average', ph: 'e.g. 10.5' },
  { key: 'strikeRate', label: 'Strike Rate', ph: 'e.g. 84.7' },
  { key: 'highScore', label: 'High Score', ph: 'e.g. 38' },
  { key: 'fours', label: 'Fours (4s)', ph: 'e.g. 101' },
  { key: 'sixes', label: 'Sixes (6s)', ph: 'e.g. 28' },
  { key: 'fifties', label: '50s', ph: 'e.g. 0' },
  { key: 'hundreds', label: '100s', ph: 'e.g. 0' },
  { key: 'ducks', label: 'Ducks', ph: 'e.g. 22' },
];

const emptyStats = (): Record<string, string> =>
  STAT_FIELDS.reduce((a, f) => ({ ...a, [f.key]: '' }), { ballType: 'leather' } as Record<string, string>);

const DNA_AXES: { key: keyof Pick<BattingDNA, 'aggression' | 'power' | 'consistency' | 'experience'>; label: string }[] = [
  { key: 'aggression', label: 'Aggression' },
  { key: 'power', label: 'Power' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'experience', label: 'Experience' },
];

function DNACard({ dna }: { dna: BattingDNA }) {
  return (
    <div className="bg-bg border border-[#c5a059]/20 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={14} className="text-[#c5a059]" />
        <h3 className="text-[#c5a059] text-[10px] font-bold uppercase tracking-[0.2em]">Your Batting DNA</h3>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-content uppercase tracking-wide mb-1">{dna.archetype}</h2>
      <p className="text-sm text-muted leading-relaxed mb-6">{dna.summary}</p>
      <div className="space-y-3.5">
        {DNA_AXES.map(({ key, label }) => {
          const v = dna[key];
          return (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[11px] uppercase tracking-widest text-content/80">{label}</span>
                <span className="text-xs font-bold text-[#c5a059] tabular-nums">{v.toFixed(1)}<span className="text-muted/50">/10</span></span>
              </div>
              <div className="h-2 bg-[#c5a059]/10 overflow-hidden rounded-full">
                <div className="h-full bg-[#c5a059] rounded-full transition-all duration-700" style={{ width: `${v * 10}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FitRing({ score }: { score: number }) {
  const r = 30, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-[#c5a059]/15" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="#c5a059" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-content tabular-nums leading-none">{score}<span className="text-sm">%</span></span>
        <span className="text-[8px] uppercase tracking-widest text-muted mt-0.5">Bat Fit</span>
      </div>
    </div>
  );
}

function FitBreakdown({ rows }: { rows: StatsRecommendation['fitBreakdown'] }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[10px] uppercase tracking-widest mb-1">
            <span className="text-content/80">{r.label}</span>
            <span className="text-muted">you need <b className="text-content">{r.need}</b> · bat <b className="text-[#c5a059]">{r.bat}</b></span>
          </div>
          <div className="relative h-1.5 bg-[#c5a059]/10 rounded-full">
            <div className="absolute h-full bg-[#c5a059]/40 rounded-full" style={{ width: `${r.bat * 10}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-content" style={{ left: `${r.need * 10}%` }} title="Your need" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BatConsultantPage() {
  const { products: activeProducts } = useProducts();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BatConsultantRecommendation | StatsRecommendation | null>(null);
  const [isEnquiryDrawerOpen, setIsEnquiryDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [input, setInput] = useState<BatConsultantInput>({
    playerProfile: 'Club Cricketer',
    battingStyle: 'Balanced All-Round Game',
    pickupFeel: 'Balanced Pickup',
    budgetRange: '₹25,000 – ₹40,000',
    customizationPreference: 'Some customization',
  });

  const [stats, setStats] = useState<Record<string, string>>(emptyStats());
  const [followUp, setFollowUp] = useState<StatsFollowUp>({ budgetRange: '₹25,000 – ₹40,000', pickupFeel: 'Balanced Pickup' });

  const goNext = () => setStep(step + 1);
  const goBack = () => setStep(step - 1);
  const reset = () => { setMode(null); setStep(0); setResult(null); setStats(emptyStats()); };

  const handleSelect = (field: keyof BatConsultantInput, value: string) => setInput((p) => ({ ...p, [field]: value }));
  const isStatsResult = (r: any): r is StatsRecommendation => !!r && 'battingDNA' in r;

  const runQuiz = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setResult(consultBat(input, activeProducts));
      setIsProcessing(false);
      setStep(10);
    }, 1200);
  };

  const runStats = () => {
    const parsed: any = { ballType: stats.ballType || 'leather' };
    for (const f of STAT_FIELDS) parsed[f.key] = stats[f.key] === '' ? 0 : Number(stats[f.key]);
    const dna = deriveBattingDNA(parsed);
    setIsProcessing(true);
    setTimeout(() => {
      const rec = consultByStats(dna, followUp, activeProducts);
      setResult(rec);
      setIsProcessing(false);
      setStep(10);
    }, 1400);
  };

  const statsReady = () => {
    const sr = Number(stats.strikeRate);
    const hasScoring = Number(stats.runs) > 0 || Number(stats.average) > 0;
    return sr > 0 && hasScoring && (Number(stats.fours) > 0 || Number(stats.sixes) > 0);
  };

  const renderOptions = (field: 'budgetRange' | 'pickupFeel', options: string[], value: string, onSelect: (v: string) => void) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={clsx(
            'p-6 border text-left transition-all duration-300',
            value === opt
              ? 'border-[#c5a059] bg-[#c5a059]/10 shadow-[0_0_20px_rgba(197,160,89,0.15)]'
              : 'border-[#c5a059]/30 hover:border-[#c5a059]/60 hover:bg-surface'
          )}
        >
          <div className="flex justify-between items-center">
            <span className="font-bold text-content tracking-wider uppercase text-sm">{opt}</span>
            <div className={clsx('w-3 h-3 rounded-full border', value === opt ? 'border-[#c5a059] bg-[#c5a059]' : 'border-muted')} />
          </div>
        </button>
      ))}
    </div>
  );

  const handleWhatsApp = () => {
    if (!result) return;
    const msg = `Hi Grainood, I used the AI Bat Consultant and got recommended: ${result.seriesName} ${result.subSeriesName || ''}. I want help finalizing my bat.`;
    window.open(`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShare = async () => {
    if (!result) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Match - Grainood Bat Consultant', text: `I got recommended the ${result.seriesName} ${result.subSeriesName || ''}.`, url });
        toast.success('Shared successfully');
      } catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard')).catch((err) => { toast.error('Failed to copy link.'); console.error(err); });
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/bat-consultant' } });
      toast.error('Please sign in to save your recommendation');
      return;
    }
    if (!result || saving) return;
    setSaving(true);
    try {
      const selections = SETUP_KEYS
        .filter(({ field }) => result.recommendedSetup?.[field])
        .map(({ field, groupId, groupLabel }) => ({ groupId, groupLabel, optionLabel: String(result.recommendedSetup![field]), type: 'single_select' as const, priceDelta: 0 }));
      await buildService.saveBuild({
        userId: user.uid,
        name: `AI Pick — ${result.subSeriesName || result.seriesName}`,
        seriesId: result.seriesSlug, seriesSlug: result.seriesSlug, seriesName: result.seriesName,
        subSeriesId: result.subSeriesSlug || result.seriesSlug, subSeriesSlug: result.subSeriesSlug || result.seriesSlug, subSeriesName: result.subSeriesName || result.seriesName,
        productSnapshot: { gradeLabel: result.gradeLabel, price: result.price },
        selections, priceSnapshot: result.price ?? 0, source: 'ai_consultant',
      } as any);
      toast.success('Saved to your Garage.', { action: { label: 'View', onClick: () => navigate('/my-builds') } });
    } catch (e: any) {
      console.error('saveBuild failed', e);
      toast.error('Could not save — please try again.');
    } finally { setSaving(false); }
  };

  // ---------------------------------------------------------------- RESULT ---
  if (step === 10 && result) {
    const statsRec = isStatsResult(result) ? result : null;
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen">
        <RevealSection className="max-w-4xl mx-auto">
          <div className="text-center mb-10 border-b border-[#c5a059]/20 pb-10">
            <h1 className="text-4xl font-bold tracking-tight text-content mb-3">Your Custom Recommendation</h1>
            <p className="text-muted tracking-wide">
              {statsRec ? 'Matched to your batting stats.' : 'Analysis Complete.'} {statsRec ? 'Bat Fit' : 'Confidence Match'}: <span className="text-[#c5a059] font-bold">{statsRec ? statsRec.fitScore : result.confidence}%</span>
            </p>
          </div>

          {statsRec && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <DNACard dna={statsRec.battingDNA} />
              <div className="bg-bg border border-[#c5a059]/20 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks size={14} className="text-[#c5a059]" />
                  <h3 className="text-[#c5a059] text-[10px] font-bold uppercase tracking-[0.2em]">Why This Bat Fits</h3>
                </div>
                <div className="flex items-center gap-5 mb-5">
                  <FitRing score={statsRec.fitScore} />
                  <p className="text-sm text-muted leading-relaxed">The bar shows each strength of this bat; the marker is what your game needs. Closer means a better fit.</p>
                </div>
                <FitBreakdown rows={statsRec.fitBreakdown} />
              </div>
            </div>
          )}

          <div className="bg-surface border border-[#c5a059]/20 p-8 md:p-12 shadow-sm relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 p-6 text-[100px] leading-none text-[#c5a059]/5 select-none font-bold">#1</div>
            <div className="relative z-raised flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={14} className="text-[#c5a059]" />
                  <h3 className="text-[#c5a059] text-xs font-bold uppercase tracking-[0.2em]">Primary Recommendation</h3>
                </div>
                <h2 className="text-3xl font-bold text-content uppercase tracking-wider">{result.seriesName}</h2>
                {result.subSeriesName && <h4 className="text-xl text-content/80 mt-1 uppercase tracking-wide">{result.subSeriesName}</h4>}
                {result.price !== undefined && <p className="text-sm font-mono mt-2 text-[#c5a059]">Starting from ₹{(result.price ?? 0).toLocaleString('en-IN')}</p>}
              </div>

              <p className="text-muted leading-relaxed italic border-l-2 border-[#c5a059] pl-4">"{result.reason}"</p>

              {result.matchHighlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.matchHighlights.map((h) => (
                    <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/20 px-3 py-1.5">{h}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {([['Weight Profile', 'weightProfile'], ['Sweet Spot', 'sweetSpot'], ['Handle Shape', 'handleShape'], ['Bat Profile', 'batProfile']] as const).map(([label, key]) => (
                  <div key={key} className="bg-bg border border-[#c5a059]/10 p-4">
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm text-content font-bold">{result.recommendedSetup[key]}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <GoldButton as={Link} to={`/collection/${result.seriesSlug}/${result.subSeriesSlug || ''}?from=consultant&weight=${encodeURIComponent(result.recommendedSetup.weightProfile || '')}&spot=${encodeURIComponent(result.recommendedSetup.sweetSpot || '')}`} variant="solid" className="w-full justify-center">
                  View Recommended Bat <ArrowRight size={16} className="ml-2" />
                </GoldButton>
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
                      <Link to={`/collection/${result.alternatives[0].seriesSlug}/${result.alternatives[0].subSeriesSlug || ''}`} className="text-[#c5a059] hover:text-content"><ArrowRight size={20} /></Link>
                    </div>
                    {result.alternatives[0].subSeriesName && <p className="text-xs text-[#c5a059] font-bold uppercase mb-2">{result.alternatives[0].subSeriesName}</p>}
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
              <p className="text-muted text-sm max-w-lg mx-auto">Our master bat makers can review this recommendation and fine-tune your exact specifications.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
              <GoldButton variant="solid" className="flex-shrink-0 justify-center" onClick={() => setIsEnquiryDrawerOpen(true)}>Ask Grainood Expert</GoldButton>
              <GoldButton variant="outline" className="flex-shrink-0 justify-center" onClick={handleWhatsApp}><MessageSquare size={16} className="mr-2" /> WhatsApp Inquiry</GoldButton>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button onClick={reset} className="text-muted hover:text-[#c5a059] text-xs font-bold uppercase tracking-widest border-b border-transparent hover:border-[#c5a059] pb-1 transition-all">Start Over</button>
          </div>
        </RevealSection>

        <EnquiryDrawer
          isOpen={isEnquiryDrawerOpen}
          onClose={() => setIsEnquiryDrawerOpen(false)}
          source="ai_consultant"
          defaultType="pro_consultation"
          productRef={result ? { seriesSlug: result.seriesSlug, seriesName: result.seriesName, subSeriesSlug: result.subSeriesSlug, subSeriesName: result.subSeriesName } : undefined}
        />
      </div>
    );
  }

  // ------------------------------------------------------------ PROCESSING ---
  if (isProcessing) {
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-[#c5a059]/20 border-t-[#c5a059] rounded-full animate-spin mx-auto mb-8" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4 animate-pulse">{mode === 'stats' ? 'Reading Your Game' : 'Analyzing Data'}</h2>
          <p className="text-muted tracking-wide text-sm font-light">{mode === 'stats' ? 'Building your Batting DNA and finding your best English Willow match.' : 'Running our model to find your perfect English Willow match.'}</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ ENTRY (0) ---
  if (step === 0) {
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-content mb-4">Find Your Perfect Grainood Bat</h1>
              <p className="text-muted tracking-wide text-sm max-w-lg mx-auto leading-relaxed">Two ways in. Have your batting stats handy? Get a stats-matched pick with a Bat Fit score. Otherwise answer a few quick questions.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => { setMode('stats'); setStep(1); }} className="group text-left border-2 border-[#c5a059]/40 hover:border-[#c5a059] p-8 transition-all hover:bg-[#c5a059]/5 relative overflow-hidden">
                <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-2 py-1">Recommended</span>
                <BarChart3 className="text-[#c5a059] mb-4" size={28} />
                <h3 className="text-xl font-bold text-content uppercase tracking-wider mb-2">Match by my stats</h3>
                <p className="text-sm text-muted leading-relaxed mb-4">Enter your batting numbers (from CricHeroes or any scorebook). We build your Batting DNA and rate how well each bat fits.</p>
                <span className="text-[#c5a059] text-sm font-bold uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">Start <ArrowRight size={16} /></span>
              </button>
              <button onClick={() => { setMode('quiz'); setStep(1); }} className="group text-left border-2 border-[#c5a059]/20 hover:border-[#c5a059]/60 p-8 transition-all hover:bg-surface">
                <ListChecks className="text-[#c5a059] mb-4" size={28} />
                <h3 className="text-xl font-bold text-content uppercase tracking-wider mb-2">Answer 5 quick questions</h3>
                <p className="text-sm text-muted leading-relaxed mb-4">No stats needed. Tell us your level, style, feel and budget, and we'll suggest the right bat.</p>
                <span className="text-[#c5a059] text-sm font-bold uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">Start <ArrowRight size={16} /></span>
              </button>
            </div>
            <div className="text-center mt-8">
              <Link to="/collection" className="text-muted hover:text-[#c5a059] text-xs font-bold uppercase tracking-widest">or browse the full collection</Link>
            </div>
          </RevealSection>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------- STATS FLOW ---
  if (mode === 'stats') {
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <div className="flex justify-between items-center mb-8">
              <button onClick={step > 1 ? goBack : reset} className="text-muted hover:text-[#c5a059] flex items-center gap-2 text-xs uppercase tracking-widest font-bold"><ChevronLeft size={16} /> {step > 1 ? 'Back' : 'Cancel'}</button>
              <div className="text-[10px] text-muted uppercase tracking-[0.2em]">Step <span className="text-[#c5a059] font-bold">{step}</span> of 2</div>
            </div>
            <div className="w-full bg-[#c5a059]/10 h-1 mb-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-[#c5a059] transition-all duration-500 ease-out" style={{ width: `${(step / 2) * 100}%` }} />
            </div>

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-3">Enter your batting stats</h2>
                <p className="text-muted text-sm mb-6">Copy the numbers from your CricHeroes profile (or any scorebook). Strike rate, boundaries and one of runs/average are enough — leave the rest blank if you don't have them.</p>

                <div className="flex gap-3 mb-8">
                  {(['leather', 'tennis'] as const).map((bt) => (
                    <button key={bt} onClick={() => setStats((s) => ({ ...s, ballType: bt }))} className={clsx('px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors', stats.ballType === bt ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'border-line text-muted hover:border-[#c5a059]/50')}>{bt} ball</button>
                  ))}
                </div>
                {stats.ballType === 'tennis' && (
                  <p className="text-xs text-amber-500 border border-amber-500/30 bg-amber-500/5 p-3 mb-6">Heads up: Grainood crafts English Willow bats for leather-ball cricket. We'll still read your game, but for a tennis-ball bat our expert can guide you directly.</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {STAT_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">{f.label}</label>
                      <input inputMode="decimal" value={stats[f.key]} onChange={(e) => setStats((s) => ({ ...s, [f.key]: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder={f.ph}
                        className="w-full bg-bg border border-line p-3 text-sm text-content focus:border-[#c5a059] focus:outline-none transition-colors" />
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex justify-end">
                  <GoldButton variant="outline" onClick={goNext} disabled={!statsReady()} className={clsx(!statsReady() && 'opacity-40 pointer-events-none')}>Next Step <ArrowRight size={16} className="ml-2" /></GoldButton>
                </div>
                {!statsReady() && <p className="text-[11px] text-muted italic mt-3 text-right">Enter at least strike rate, boundaries, and runs or average.</p>}
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-3">Two quick preferences</h2>
                <p className="text-muted text-sm">Your stats tell us the game; these tell us the feel and budget.</p>

                <div className="mt-8">
                  <p className="text-[11px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">How should the bat feel?</p>
                  {renderOptions('pickupFeel', ['Light Pickup', 'Balanced Pickup', 'Powerful / Slightly Heavy', 'Not Sure'], followUp.pickupFeel, (v) => setFollowUp((f) => ({ ...f, pickupFeel: v as any })))}
                </div>
                <div className="mt-10">
                  <p className="text-[11px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">Your budget range</p>
                  {renderOptions('budgetRange', ['Under ₹15,000', '₹15,000 – ₹25,000', '₹25,000 – ₹40,000', '₹40,000 – ₹60,000', '₹60,000+ / Best Available'], followUp.budgetRange, (v) => setFollowUp((f) => ({ ...f, budgetRange: v as any })))}
                </div>

                <div className="mt-12 flex justify-end">
                  <GoldButton variant="solid" onClick={runStats} className="px-12 py-4 shadow-[0_0_20px_rgba(197,160,89,0.2)]">Get My Match</GoldButton>
                </div>
              </div>
            )}
          </RevealSection>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------- QUIZ FLOW ---
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <RevealSection>
          <div className="flex justify-between items-center mb-8">
            <button onClick={step > 1 ? goBack : reset} className="text-muted hover:text-[#c5a059] flex items-center gap-2 text-xs uppercase tracking-widest font-bold"><ChevronLeft size={16} /> {step > 1 ? 'Back' : 'Cancel'}</button>
            <div className="text-[10px] text-muted uppercase tracking-[0.2em]">Step <span className="text-[#c5a059] font-bold">{step}</span> of 5</div>
          </div>
          <div className="w-full bg-[#c5a059]/10 h-1 mb-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[#c5a059] transition-all duration-500 ease-out" style={{ width: `${(step / 5) * 100}%` }} />
          </div>

          <div className="min-h-[400px] overflow-hidden relative">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="q1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4">What best describes the player?</h2>
                  <p className="text-muted text-sm">Helps us determine the product tier.</p>
                  {renderOptions('budgetRange' as any, ['Beginner / Casual Player', 'Club Cricketer', 'League / Tournament Player', 'Advanced / Serious Player', 'Professional / Premium Buyer'], input.playerProfile, (v) => handleSelect('playerProfile', v))}
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="q2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4">How do you usually bat?</h2>
                  <p className="text-muted text-sm">Determines performance priority and profile.</p>
                  {renderOptions('budgetRange' as any, ['Timing & Stroke Play', 'Power Hitting', 'Balanced All-Round Game', 'Defensive / Control Focus', 'Front-foot Dominant'], input.battingStyle, (v) => handleSelect('battingStyle', v))}
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="q3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4">How should the bat feel in your hands?</h2>
                  <p className="text-muted text-sm">Determines weight profile and ranking.</p>
                  {renderOptions('budgetRange' as any, ['Light Pickup', 'Balanced Pickup', 'Powerful / Slightly Heavy', 'Not Sure'], input.pickupFeel, (v) => handleSelect('pickupFeel', v))}
                </motion.div>
              )}
              {step === 4 && (
                <motion.div key="q4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4">What budget range are you comfortable with?</h2>
                  <p className="text-muted text-sm">Prevents recommending a bat far outside your budget.</p>
                  {renderOptions('budgetRange', ['Under ₹15,000', '₹15,000 – ₹25,000', '₹25,000 – ₹40,000', '₹40,000 – ₹60,000', '₹60,000+ / Best Available'], input.budgetRange, (v) => handleSelect('budgetRange', v))}
                </motion.div>
              )}
              {step === 5 && (
                <motion.div key="q5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-4">How much control do you want over the build?</h2>
                  <p className="text-muted text-sm">Determines whether to recommend simple or premium configurable series.</p>
                  {renderOptions('budgetRange' as any, ['Basic setup is enough', 'Some customization', 'Full custom build', 'I want expert help choosing'], input.customizationPreference, (v) => handleSelect('customizationPreference', v))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-12 flex justify-end">
            {step < 5 ? (
              <GoldButton variant="outline" onClick={goNext}>Next Step <ArrowRight size={16} className="ml-2" /></GoldButton>
            ) : (
              <GoldButton variant="solid" onClick={runQuiz} className="px-12 py-4 shadow-[0_0_20px_rgba(197,160,89,0.2)]">Get Recommendation</GoldButton>
            )}
          </div>
        </RevealSection>
      </div>
    </div>
  );
}
