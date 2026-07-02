// Redaction utility for console output.
//
// A single pure function `scrubArg` that masks PII (names, emails, phones,
// addresses, DOB, pincodes) and secrets (JWTs, API keys, bearer tokens, long
// hex secrets) from anything about to be logged. Used by the global console
// guard (see consoleGuard.ts) so no individual `console.*` call site has to
// remember to redact. Must never throw — a logger that crashes is worse than a
// leaky one, so everything is wrapped defensively.

const MAX_DEPTH = 5;
const MAX_ARRAY = 50;
const MAX_STRING = 4000;

/** Object keys whose *value* is always sensitive and gets fully redacted. */
const NAME_KEYS = new Set([
  'name', 'fullname', 'firstname', 'lastname', 'customername',
  'username', 'contactname', 'recipientname', 'shippingname',
]);

const SENSITIVE_TOKENS = [
  'phone', 'mobile', 'whatsapp', 'email', 'address', 'line1', 'line2',
  'street', 'pincode', 'postalcode', 'zipcode', 'dob', 'dateofbirth',
  'password', 'passwd', 'secret', 'token', 'apikey', 'authorization',
  'bearer', 'servicerole', 'anonkey', 'cvv', 'otp', 'ssn',
  'creditcard', 'cardnumber',
];

export function isSensitiveKey(key: string): boolean {
  const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (NAME_KEYS.has(norm)) return true;
  return SENSITIVE_TOKENS.some((t) => norm.includes(t));
}

// ── String masking ──────────────────────────────────────────────────────────
const JWT_RE = /eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g;
const KEY_RE = /\b(?:sb|sk|pk|rk|re|whsec)_[A-Za-z0-9_-]{6,}/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]{6,}/gi;
const HEX_SECRET_RE = /\b[0-9a-f]{32,}\b/gi;
const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// A run of 9+ "phone-like" characters (digits, spaces, dashes, leading +).
const PHONE_RE = /\+?\d(?:[\d\s-]{7,})\d/g;

function maskPhone(match: string): string {
  const digits = match.replace(/\D/g, '');
  if (digits.length < 9) return match; // too short to be a phone — leave it
  const last2 = digits.slice(-2);
  return `${'•'.repeat(Math.max(0, digits.length - 2))}${last2}`;
}

export function maskString(input: string): string {
  let s = input.length > MAX_STRING ? input.slice(0, MAX_STRING) + '…' : input;
  s = s
    .replace(JWT_RE, '[redacted-jwt]')
    .replace(KEY_RE, '[redacted-key]')
    .replace(BEARER_RE, 'Bearer [redacted]')
    .replace(HEX_SECRET_RE, '[redacted-secret]')
    .replace(EMAIL_RE, (_m, first) => `${first}***@***`)
    .replace(PHONE_RE, maskPhone);
  return s;
}

// ── Deep value scrubbing ─────────────────────────────────────────────────────
function scrub(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value == null) return value;

  const t = typeof value;
  if (t === 'string') return maskString(value as string);
  if (t === 'number' || t === 'boolean' || t === 'bigint') return value;
  if (t === 'function') return '[fn]';
  if (t === 'symbol') return value.toString();

  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskString(value.message || ''),
    };
  }

  if (depth >= MAX_DEPTH) return '[…]';

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    const out = value.slice(0, MAX_ARRAY).map((v) => scrub(v, depth + 1, seen));
    if (value.length > MAX_ARRAY) out.push(`…+${value.length - MAX_ARRAY} more`);
    return out;
  }

  if (t === 'object') {
    if (seen.has(value as object)) return '[circular]';
    seen.add(value as object);
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src)) {
      out[key] = isSensitiveKey(key) ? '[redacted]' : scrub(src[key], depth + 1, seen);
    }
    return out;
  }

  return String(value);
}

/** Scrub a single console argument. Never throws. */
export function scrubArg(arg: unknown): unknown {
  try {
    return scrub(arg, 0, new WeakSet());
  } catch {
    return '[unloggable]';
  }
}
