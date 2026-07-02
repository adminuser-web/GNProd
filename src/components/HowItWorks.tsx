import React from 'react';
import { clsx } from 'clsx';
import { ClipboardCheck, ShieldCheck, Hammer } from 'lucide-react';

/**
 * "How buying works" explainer for the pay-at-checkout model. Shown on the
 * product page, cart drawer, and checkout.
 *
 *  - variant="full"    -> 3 cards (product page, checkout)
 *  - variant="compact" -> tight inline row (cart drawer)
 */

const STEPS = [
  { icon: ClipboardCheck, title: 'Configure & add to cart', desc: 'Customise your bat and review the total.' },
  { icon: ShieldCheck, title: 'Pay securely', desc: 'GPay, any UPI app, or card — encrypted.' },
  { icon: Hammer, title: 'We craft & ship', desc: 'Hand-made to order and delivered to you.' },
];

export function HowItWorks({ variant = 'full', className }: { variant?: 'full' | 'compact'; className?: string }) {
  if (variant === 'compact') {
    return (
      <div className={clsx('border border-[#c5a059]/20 bg-[#c5a059]/5 p-3', className)}>
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.title}>
              <div className="flex flex-col items-center text-center flex-1 gap-1">
                <s.icon className="w-4 h-4 text-[#c5a059]" />
                <span className="text-[8.5px] leading-tight uppercase tracking-wider text-content/80">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && <span className="text-[#c5a059]/30 text-xs shrink-0">→</span>}
            </React.Fragment>
          ))}
        </div>
        <p className="text-[9px] text-center text-muted tracking-wider mt-2">Secure payment at checkout.</p>
      </div>
    );
  }

  return (
    <div className={clsx('border border-[#c5a059]/20 bg-[#c5a059]/5 p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059]">How buying works</h3>
        <span className="text-[9px] uppercase tracking-widest text-content/60 border border-[#c5a059]/20 px-2 py-0.5 whitespace-nowrap">
          UPI · GPay · Card
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex sm:flex-col items-start sm:items-center gap-3 sm:text-center">
            <div className="w-9 h-9 rounded-full border border-[#c5a059]/30 bg-bg flex items-center justify-center shrink-0 relative">
              <s.icon className="w-4 h-4 text-[#c5a059]" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#c5a059] text-bg text-[9px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-content">{s.title}</p>
              <p className="text-[10px] text-muted leading-relaxed mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
