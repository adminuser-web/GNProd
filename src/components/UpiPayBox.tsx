import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Smartphone, MessageCircle, ShieldCheck } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { buildUpiUri, hasUpiConfigured } from '../lib/upi';
import { BRAND } from '../types';

/**
 * Customer-facing UPI payment box (gateway-free, manual confirmation).
 * Shows the amount, a "Pay via UPI" deep-link (mobile), a scannable QR
 * (desktop), and a "I've paid" WhatsApp hand-off. No keys, no card data.
 */
export function UpiPayBox({ order }: { order: any }) {
  const brand = useContent('brand');
  const [copied, setCopied] = useState(false);

  const amount = order?.totalPrice ?? order?.pricing?.total ?? order?.grandTotal ?? 0;
  const ref = order?.receiptNumber || order?.id || '';
  const upiId = brand?.payments?.upiId || '';
  const payeeName = brand?.payments?.upiPayeeName || brand?.brandName || 'Grainood';
  const waNumber = (brand?.contact?.whatsapp || BRAND.whatsappNumber || '').replace(/\D/g, '');

  const upiUri = buildUpiUri({ payeeVpa: upiId, payeeName, amount, note: `Order ${ref}` });

  const waMessage = encodeURIComponent(
    `Hi, I've paid ₹${Math.round(amount).toLocaleString('en-IN')} for order ${ref} via UPI.\nUPI reference (UTR): `,
  );
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : '';

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  // Not configured yet → graceful fallback so the page never looks broken.
  if (!hasUpiConfigured(upiId)) {
    return (
      <div className="bg-surface border border-[#c5a059]/20 shadow-sm p-6 md:p-8">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-content mb-3">Complete your payment</h2>
        <p className="text-sm text-muted leading-relaxed">
          Our team will share secure payment details with you on WhatsApp to complete this order.
        </p>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-bg bg-[#c5a059] px-5 py-3 hover:bg-premium-gold-text transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-[#c5a059]/30 shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-content">Pay via UPI</h2>
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
          <ShieldCheck className="w-3 h-3" /> Secure · direct to bank
        </span>
      </div>
      <p className="text-[11px] text-muted tracking-wide mb-6">No card details needed. Pay any UPI app — GPay, PhonePe, Paytm, BHIM.</p>

      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* QR for desktop / scanning */}
        <div className="mx-auto sm:mx-0 text-center">
          <div className="bg-white p-3 inline-block rounded-sm">
            <QRCodeSVG value={upiUri} size={168} bgColor="#ffffff" fgColor="#111111" level="M" />
          </div>
          <p className="text-[9px] text-muted uppercase tracking-widest mt-2">Scan to pay</p>
        </div>

        {/* Details + actions */}
        <div className="flex-1 w-full space-y-5">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Amount</p>
            <p className="text-2xl font-bold text-[#c5a059] tracking-wider">₹{Math.round(amount).toLocaleString('en-IN')}</p>
          </div>

          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Pay to this UPI ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content font-mono truncate">{upiId}</code>
              <button
                onClick={copyUpi}
                className="shrink-0 inline-flex items-center gap-1.5 border border-[#c5a059]/30 px-3 py-2 text-[10px] uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-1.5">Reference: <span className="text-content font-mono">Order {ref}</span></p>
          </div>

          {/* Mobile: open UPI app directly */}
          <a
            href={upiUri}
            className="sm:hidden w-full inline-flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-bg bg-[#c5a059] px-5 py-3 hover:bg-premium-gold-text transition-colors"
          >
            <Smartphone className="w-4 h-4" /> Open UPI app to pay
          </a>
        </div>
      </div>

      {/* After paying */}
      <div className="mt-7 pt-5 border-t border-[#c5a059]/10">
        <p className="text-[11px] text-muted leading-relaxed mb-3">
          After paying, share your UPI reference so we can confirm and start crafting your bat.
        </p>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-content border border-[#c5a059]/40 px-5 py-3 hover:bg-[#c5a059] hover:text-bg transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> I've paid — share reference
          </a>
        )}
      </div>
    </div>
  );
}
