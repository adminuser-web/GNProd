import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoldButton } from './GoldButton';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { enrollTotp, activateFactor, listVerifiedFactors, removeFactor, EnrollResult } from '../features/auth/mfa';

/**
 * Account security — enrol / remove TOTP (authenticator-app) MFA.
 * Reachable at /security by any signed-in user (recommended for admins).
 */
export function SecurityPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [enroll, setEnroll] = useState<EnrollResult | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'Security — Grainood'; }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/security' }, replace: true });
  }, [user, authLoading, navigate]);

  const refresh = async () => {
    const factors = await listVerifiedFactors();
    setEnabled(factors.length > 0);
    setFactorId(factors[0]?.id || '');
    setChecking(false);
  };
  useEffect(() => { if (user) refresh(); }, [user]);

  const startEnroll = async () => {
    setBusy(true);
    try { setEnroll(await enrollTotp()); }
    catch (e: any) { toast.error(e?.message || 'Could not start enrolment'); }
    finally { setBusy(false); }
  };

  const finishEnroll = async () => {
    if (!enroll) return;
    setBusy(true);
    try {
      await activateFactor(enroll.factorId, code);
      toast.success('Two-factor authentication is now on');
      setEnroll(null); setCode('');
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Invalid code'); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    if (!factorId) return;
    setBusy(true);
    try { await removeFactor(factorId); toast.success('MFA removed'); await refresh(); }
    catch (e: any) { toast.error(e?.message || 'Could not remove'); }
    finally { setBusy(false); }
  };

  if (authLoading || !user || checking) {
    return <div className="min-h-screen bg-bg pt-32 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#c5a059] border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-24 px-4">
      <div className="max-w-lg mx-auto">
        <p className="text-[11px] tracking-[0.4em] uppercase text-premium-gold-text mb-2">Account</p>
        <h1 className="text-3xl font-bold tracking-tight mb-8">Security</h1>

        <div className="bg-surface border border-[#c5a059]/15 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            {enabled ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-yellow-500" />}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest">Two-Factor Authentication</h2>
              <p className="text-xs text-muted mt-0.5">{enabled ? 'Enabled — a code is required at sign-in.' : 'Not enabled.'}</p>
            </div>
          </div>

          {enabled && (
            <GoldButton variant="outline" className="mt-2" onClick={disable} isLoading={busy}>Remove MFA</GoldButton>
          )}

          {!enabled && !enroll && (
            <>
              <p className="text-xs text-muted leading-relaxed mb-5">Protect your account with an authenticator app (Google Authenticator, Authy, 1Password). You'll enter a 6-digit code each time you sign in.</p>
              <GoldButton variant="solid" onClick={startEnroll} isLoading={busy}>Enable MFA</GoldButton>
            </>
          )}

          {enroll && (
            <div className="space-y-5">
              <p className="text-xs text-muted leading-relaxed">1. Scan this QR code in your authenticator app (or enter the key manually).</p>
              <div className="bg-white p-3 inline-block rounded-sm">
                {/* qr_code is an SVG data-URI from Supabase */}
                <img src={enroll.qrCode} alt="MFA QR code" className="w-44 h-44" />
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Manual key</p>
                <code className="text-xs text-content font-mono break-all bg-bg border border-[#c5a059]/20 px-2 py-1 inline-block">{enroll.secret}</code>
              </div>
              <p className="text-xs text-muted leading-relaxed">2. Enter the 6-digit code it shows:</p>
              <input
                inputMode="numeric" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-bg border border-[#c5a059]/30 text-center text-2xl tracking-[0.4em] py-3 focus:outline-none focus:border-[#c5a059]"
              />
              <div className="flex gap-3">
                <GoldButton variant="outline" className="flex-1" onClick={() => { setEnroll(null); setCode(''); }}>Cancel</GoldButton>
                <GoldButton variant="solid" className="flex-1" onClick={finishEnroll} isLoading={busy} disabled={code.length < 6}>Verify & Enable</GoldButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
