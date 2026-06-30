// UPI deep-link helpers — gateway-free collection.
//
// A UPI "intent" URI opens the customer's UPI app (GPay/PhonePe/Paytm/BHIM)
// pre-filled with the payee, amount and a note. It's just a string — no API,
// no keys, no third party. The same string encodes into the QR for desktop.

export interface UpiParams {
  /** Payee VPA / UPI ID, e.g. grainood@okhdfc */
  payeeVpa: string;
  /** Payee display name shown in the UPI app */
  payeeName: string;
  /** Amount in INR (rupees, not paise) */
  amount: number;
  /** Transaction note — we put the order number here for reconciliation */
  note?: string;
}

/** Build a `upi://pay?...` intent URI. Returns '' if no payee VPA is configured. */
export function buildUpiUri({ payeeVpa, payeeName, amount, note }: UpiParams): string {
  if (!payeeVpa) return '';
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName || 'Grainood',
    am: (Math.round((amount || 0) * 100) / 100).toFixed(2),
    cu: 'INR',
  });
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}

/** True when a usable UPI id is configured. */
export function hasUpiConfigured(payeeVpa?: string): boolean {
  return !!payeeVpa && /.+@.+/.test(payeeVpa);
}
