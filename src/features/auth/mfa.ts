import { supabase } from '../../lib/supabase';

/**
 * TOTP (authenticator-app) MFA helpers around supabase.auth.mfa.
 *
 * Supabase MFA is app-driven: enabling TOTP in the dashboard does nothing until
 * the app enrolls a factor and challenges it. Flow:
 *   1. enrollTotp() -> show QR + secret -> user scans in their app
 *   2. activateFactor(factorId, code) -> verifies -> factor becomes "verified"
 *   3. on next login, isMfaRequired() is true -> verifyLoginCode(code) elevates
 *      the session from aal1 -> aal2.
 */

export interface EnrollResult {
  factorId: string;
  qrCode: string; // SVG data-URI to render in an <img>
  secret: string; // manual-entry key
  uri: string;
}

/** True when the current (already password-authenticated) session must step up to MFA. */
export async function isMfaRequired(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
}

/** Does this user already have a verified TOTP factor? */
export async function hasVerifiedFactor(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.listFactors();
  return !!data?.totp?.some((f) => f.status === 'verified');
}

export async function listVerifiedFactors() {
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).filter((f) => f.status === 'verified');
}

/** Begin enrollment — returns the QR + secret to display. */
export async function enrollTotp(): Promise<EnrollResult> {
  // Clean up any half-finished (unverified) factors first so re-enrolling works.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const f of existing?.all ?? []) {
    if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `authenticator-${Date.now()}` });
  if (error || !data) throw new Error(error?.message || 'Could not start MFA enrolment');
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
}

/** Verify the code shown by the authenticator to finish enrolment. */
export async function activateFactor(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr || !challenge) throw new Error(cErr?.message || 'Could not create challenge');
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (error) throw new Error(error.message || 'Invalid code');
}

/** At login: challenge the user's verified TOTP factor and verify the entered code. */
export async function verifyLoginCode(code: string): Promise<void> {
  const factors = await listVerifiedFactors();
  const factor = factors[0];
  if (!factor) throw new Error('No authenticator is set up for this account');
  await activateFactor(factor.id, code); // same challenge+verify path elevates to aal2
}

export async function removeFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}
