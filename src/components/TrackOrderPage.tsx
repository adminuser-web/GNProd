import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, PackageCheck, AlertCircle, Truck, CircleCheck, Circle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GoldButton } from './GoldButton';
import { RevealSection } from './Reveal';
import { clsx } from 'clsx';
import { STAGE_FLOW, STAGE_LABELS, stageIndex, mapLegacyStatus } from '../lib/orderStatus';

interface TrackedOrder {
  shortId: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string | null;
  customerFirstName: string | null;
  items: { name: string; qty: number; lineTotal?: number; image: string | null }[];
  timeline: { status: string; timestamp: string; note: string | null }[];
  shipment: { carrier: string | null; trackingNumber: string | null; trackingUrl: string | null } | null;
  cancellation: { reason: string | null } | null;
}

export function TrackOrderPage() {
  const [params, setParams] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrder | null>(null);

  useEffect(() => {
    document.title = 'Track Your Order — Grainood';
  }, []);

  const lookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = orderId.trim();
    const mail = email.trim();
    if (!id || !mail) {
      setError('Enter your order number and the email used at checkout.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('track-order', {
        body: { orderId: id, email: mail },
      });
      if (fnError || !data?.ok) {
        setError("We couldn't find an order matching that number and email. Please double-check both.");
        return;
      }
      setResult(data.order as TrackedOrder);
      setParams({ order: id }, { replace: true });
    } catch {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const mapped = result ? mapLegacyStatus(result.status) : null;
  const cancelled = mapped === 'Cancelled';
  const currentStage = result ? stageIndex(result.status) : -1;
  const isPaid = result?.paymentStatus === 'confirmed';

  const esc = (s: string) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

  const downloadReceipt = () => {
    if (!result) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const date = result.createdAt ? new Date(result.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const rows = result.items.map((it) =>
      `<tr><td>${it.qty}&times; ${esc(it.name)}</td><td style="text-align:right">${it.lineTotal ? inr(it.lineTotal) : ''}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(result.shortId)}</title>
      <style>body{font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:32px auto;padding:0 24px}
      h1{letter-spacing:6px;color:#c5a059;font-size:22px;margin:0}.muted{color:#8a8276;font-size:12px}
      table{width:100%;border-collapse:collapse;margin:18px 0}td{padding:10px 0;border-bottom:1px solid #eee;font-size:14px}
      .total td{border:0;font-weight:bold;font-size:16px;padding-top:14px}.paid{display:inline-block;margin-top:8px;color:#0a7d3b;border:1px solid #0a7d3b;padding:3px 10px;border-radius:4px;font-size:11px;letter-spacing:2px;text-transform:uppercase}</style>
      </head><body>
      <h1>GRAINOOD</h1><p class="muted">Handcrafted English Willow · Payment Receipt</p>
      <p style="margin:16px 0 0"><strong>Receipt No.</strong> ${esc(result.shortId)}<br><span class="muted">${date}</span><br><span class="paid">Paid</span></p>
      <table>${rows}<tr class="total"><td>Total Paid</td><td style="text-align:right">${inr(result.total)}</td></tr></table>
      <p class="muted">Paid securely online via Razorpay. Thank you for choosing Grainood.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <p className="text-[#c5a059] font-bold text-[10px] tracking-[0.4em] uppercase mb-4 text-center">Order Status</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-4 text-center">Track Your Order</h1>
          <p className="text-muted text-sm text-center mb-10 max-w-md mx-auto">
            Enter your order number and the email you used at checkout — no account needed.
          </p>
        </RevealSection>

        <RevealSection delay={80}>
          <form onSubmit={lookup} className="bg-surface border border-[#c5a059]/15 p-6 md:p-8 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Order Number</label>
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. GRN-20260702-AB12 or 12345678"
                className="w-full bg-elevated border border-[#c5a059]/20 text-content px-4 py-3 text-sm tracking-wide focus:outline-none focus:border-[#c5a059]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-elevated border border-[#c5a059]/20 text-content px-4 py-3 text-sm tracking-wide focus:outline-none focus:border-[#c5a059]"
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/25 px-3 py-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}
            <GoldButton as="button" type="submit" variant="solid" isLoading={loading} className="w-full">
              <span className="inline-flex items-center gap-2"><Search size={14} /> Track Order</span>
            </GoldButton>
          </form>
        </RevealSection>

        {result && (
          <RevealSection delay={60}>
            <div className="mt-8 bg-surface border border-[#c5a059]/15 p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#c5a059]/15 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Order</p>
                  <p className="font-bold tracking-widest text-content">No. {result.shortId}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={clsx(
                    'text-[10px] px-3 py-1.5 uppercase tracking-widest border font-bold',
                    cancelled ? 'border-red-500/30 text-red-400 bg-red-500/10'
                      : 'border-[#c5a059]/30 text-[#c5a059] bg-[#c5a059]/10',
                  )}>
                    {result.status}
                  </span>
                  {isPaid && (
                    <button onClick={downloadReceipt} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#c5a059] hover:underline">
                      <Download size={13} /> Receipt
                    </button>
                  )}
                </div>
              </div>

              {cancelled ? (
                <div className="flex items-start gap-3 text-sm text-red-400 bg-red-500/5 border border-red-500/20 p-4 mb-6">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-widest text-[11px] mb-1">Order Cancelled</p>
                    {result.cancellation?.reason && <p className="text-content/70 text-[13px]">{result.cancellation.reason}</p>}
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    {STAGE_FLOW.map((_, i) => {
                      const done = i <= currentStage;
                      const isLast = i === STAGE_FLOW.length - 1;
                      return (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center gap-2 shrink-0">
                            {i === STAGE_FLOW.length - 1 ? (
                              done ? <PackageCheck size={20} className="text-[#c5a059]" /> : <Circle size={20} className="text-muted/40" />
                            ) : i === 2 && done ? (
                              <Truck size={20} className="text-[#c5a059]" />
                            ) : done ? (
                              <CircleCheck size={20} className="text-[#c5a059]" />
                            ) : (
                              <Circle size={20} className="text-muted/40" />
                            )}
                            <span className={clsx('text-[9px] uppercase tracking-widest', done ? 'text-content' : 'text-muted/50')}>
                              {STAGE_LABELS[i]}
                            </span>
                          </div>
                          {!isLast && (
                            <div className={clsx('flex-1 h-px mx-1', i < currentStage ? 'bg-[#c5a059]' : 'bg-line/50')} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3 pb-6 border-b border-[#c5a059]/15">
                {result.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-[#c5a059] font-mono text-xs">{it.qty}×</span>
                    <span className="text-content/90 tracking-wide">{it.name}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-sm">
                  <span className="text-muted uppercase tracking-widest text-[11px] font-bold">Total</span>
                  <span className="text-[#c5a059] font-bold">₹{result.total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Shipment */}
              {result.shipment?.trackingNumber && (
                <div className="mt-6 bg-[#c5a059]/5 border border-[#c5a059]/20 p-4 text-[13px]">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-2 font-bold">Shipment</p>
                  <p className="text-content/80">
                    {result.shipment.carrier ? `${result.shipment.carrier} · ` : ''}
                    {result.shipment.trackingNumber}
                  </p>
                  {result.shipment.trackingUrl && (
                    <a href={result.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-[#c5a059] hover:underline text-[12px] mt-1 inline-block">
                      Track shipment →
                    </a>
                  )}
                </div>
              )}

              {/* Timeline */}
              {result.timeline.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-4 font-bold">History</p>
                  <ol className="space-y-4">
                    {[...result.timeline].reverse().map((t, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={clsx('w-2 h-2 rounded-full mt-1.5', i === 0 ? 'bg-[#c5a059]' : 'bg-muted/40')} />
                          {i < result.timeline.length - 1 && <span className="flex-1 w-px bg-line/40 my-1" />}
                        </div>
                        <div className="pb-1">
                          <p className={clsx('text-[13px]', i === 0 ? 'text-content font-semibold' : 'text-content/70')}>{t.status}</p>
                          {t.timestamp && (
                            <p className="text-[11px] text-muted">
                              {new Date(t.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {t.note && <p className="text-[12px] text-muted/80 mt-0.5">{t.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="mt-8 text-[12px] text-muted text-center">
                Questions about your order? <Link to="/contact" className="text-[#c5a059] hover:underline">Contact us</Link>.
              </p>
            </div>
          </RevealSection>
        )}
      </div>
    </div>
  );
}
