import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../features/orders/services/orderService';
import { OrderRecord } from '../../types';
import { ArrowLeft, Truck, CheckCircle2, User, Package, Clock, Hammer, PackageCheck, CreditCard, ChevronDown } from 'lucide-react';
import { ticketService } from '../../features/support/services/ticketService';
import { mapLegacyStatus, stageIndex, STAGE_LABELS, STATUS_COLORS } from '../../lib/orderStatus';
import { buildStatusTimeline, formatDuration } from '../../lib/orderTimeline';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const fmtDateTime = (d: Date) =>
  `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;

/** Compact post-payment stage progress. */
function StageProgress({ stage }: { stage: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STAGE_LABELS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${i <= stage ? 'bg-[#c5a059]' : 'bg-[#c5a059]/20'}`} />
            <span className={`text-[8px] uppercase tracking-widest ${i <= stage ? 'text-[#c5a059] font-bold' : 'text-muted'}`}>{label}</span>
          </div>
          {i < STAGE_LABELS.length - 1 && <div className={`w-5 sm:w-8 h-px mb-4 ${i < stage ? 'bg-[#c5a059]' : 'bg-[#c5a059]/20'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Collapsible per-bucket status history — secondary info, tucked away by default. */
function StatusHistory({ order, now }: { order: any; now: number }) {
  const status = mapLegacyStatus(order.status || 'Processing');
  const cancelled = status === 'Cancelled';
  const delivered = status === 'Delivered';
  const timeline = buildStatusTimeline(order, now);
  if (!timeline.length) return null;
  const totalElapsed = now - timeline[0].start.getTime();

  return (
    <details className="group mt-5 pt-4 border-t border-[#c5a059]/10">
      <summary className="cursor-pointer list-none flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted hover:text-[#c5a059] transition-colors [&::-webkit-details-marker]:hidden">
        <span>Status history · {timeline.length} {timeline.length === 1 ? 'step' : 'steps'}</span>
        <span className="flex items-center gap-1.5 font-normal">
          Total {formatDuration(totalElapsed)}
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <ol className="relative mt-4">
        {timeline.map((s, i) => (
          <li key={i} className="relative pl-7 pb-4 last:pb-0">
            {i < timeline.length - 1 && <span className="absolute left-[5px] top-3.5 -bottom-1 w-px bg-[#c5a059]/20" />}
            <span className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2"
              style={{ borderColor: STATUS_COLORS[s.status], backgroundColor: s.isCurrent ? STATUS_COLORS[s.status] : 'transparent' }} />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-bold" style={{ color: STATUS_COLORS[s.status] }}>{s.status}</span>
                <span className="text-[10px] text-muted">{fmtDateTime(s.start)}</span>
              </div>
              <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 whitespace-nowrap ${s.isCurrent && !cancelled && !delivered ? 'bg-[#c5a059]/15 text-[#c5a059] font-bold' : 'text-muted'}`}>
                {s.isCurrent && !cancelled && !delivered ? `${formatDuration(s.durationMs)} · counting` : `${formatDuration(s.durationMs)} in bucket`}
              </span>
            </div>
            {s.note && <p className="text-[11px] text-muted/80 mt-1 leading-relaxed">{s.note}</p>}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-bg border border-[#c5a059]/20 text-xs px-3 py-2 focus:outline-none focus:border-[#c5a059] text-content" />
    </div>
  );
}

function SideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-[10px] text-muted uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-content text-right min-w-0">{children}</span>
    </div>
  );
}

export function AdminOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const [delivery, setDelivery] = useState({ partnerName: '', trackingNumber: '', trackingUrl: '', dispatchDate: '', expectedDelivery: '' });
  const [saving, setSaving] = useState(false);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = orderService.subscribeToOrder(id, (o: any) => {
      setOrder(o);
      if (o?.shipment) {
        setDelivery({
          partnerName: o.shipment.courierName || '',
          trackingNumber: o.shipment.trackingNumber || '',
          trackingUrl: o.shipment.trackingUrl || '',
          dispatchDate: (o.shipment.dispatchDate || '').slice(0, 10),
          expectedDelivery: (o.shipment.estimatedDeliveryAt || '').slice(0, 10),
        });
      }
      setLoading(false);
    });
    ticketService.getTicketCountByOrder(id).then(setTicketsCount).catch(() => {});
    return () => unsub();
  }, [id, user]);

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#c5a059] border-t-transparent animate-spin" /></div>;
  if (!order) return <div className="p-8"><h2 className="text-xl">Order not found</h2></div>;

  const status = mapLegacyStatus(order.status || 'Processing');
  const stage = stageIndex(order.status || 'Processing');
  const cancelled = status === 'Cancelled';
  const delivered = status === 'Delivered';
  const paid = order.payment?.status === 'confirmed';
  const refunded = order.payment?.status === 'refunded' || !!(order as any).refund?.status;

  const cust = (order as any).customerInfo || order.shippingDetails || {};
  const total = (order as any).totalPrice ?? (order as any).pricing?.total ?? (order as any).grandTotal ?? 0;
  const shortId = order.receiptNumber || (order.id || '').slice(0, 16);
  const rzpPaymentId = (order.payment as any)?.razorpayPaymentId;
  const currentBucket = buildStatusTimeline(order, now).slice(-1)[0];

  // Re-fetch after a mutation so the UI updates without a manual refresh
  // (belt-and-suspenders alongside the realtime subscription).
  const refresh = async () => {
    if (!id) return;
    const o = await orderService.getOrder(id);
    if (o) setOrder(o);
  };

  const setStatus = async (next: any, note: string, ok: string) => {
    if (!id) return;
    setSaving(true);
    try { await orderService.updateOrderStatus(id, next, user?.email || 'Admin', note); toast.success(ok); await refresh(); }
    catch (e: any) { toast.error('Could not update: ' + (e?.message || 'error')); }
    finally { setSaving(false); }
  };

  const handleMarkShipped = async () => {
    if (!id) return;
    if (!delivery.partnerName.trim()) { toast.error('Enter the delivery partner name'); return; }
    setSaving(true);
    try {
      await orderService.updateShipment(id, {
        courierName: delivery.partnerName, trackingNumber: delivery.trackingNumber,
        trackingUrl: delivery.trackingUrl, dispatchDate: delivery.dispatchDate || null,
        estimatedDeliveryAt: delivery.expectedDelivery || null,
      });
      if (status !== 'Shipped') await orderService.updateOrderStatus(id, 'Shipped', user?.email || 'Admin', 'Dispatched to customer');
      toast.success('Delivery details saved · order marked Shipped');
      await refresh();
    } catch (e: any) { toast.error('Could not update: ' + (e?.message || 'error')); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) { toast.error('Enter a cancellation reason'); return; }
    setCancelSaving(true);
    try {
      if (paid && !refunded) {
        const { data, error } = await supabase.functions.invoke('razorpay-refund', { body: { orderId: id } });
        if (error || !(data as any)?.ok) {
          toast.error('Refund failed: ' + ((data as any)?.error || error?.message || 'unknown') + ' — order NOT cancelled.');
          setCancelSaving(false);
          return;
        }
      }
      await orderService.cancelOrder(id, cancelReason, user?.email || 'Admin');
      toast.success(paid && !refunded ? 'Order cancelled & refund initiated' : 'Order cancelled');
      setShowCancel(false); setCancelReason('');
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Could not cancel'); }
    finally { setCancelSaving(false); }
  };

  const card = 'bg-surface border border-[#c5a059]/20 rounded-xl p-5';

  return (
    <div className="max-w-6xl space-y-5">
      <Link to="/admin/orders" className="text-[10px] uppercase tracking-widest hover:text-[#c5a059] flex items-center transition-colors">
        <ArrowLeft className="w-3 h-3 mr-2" /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase">Order {shortId}</h1>
          <p className="text-xs text-muted mt-1">{cust.name || 'Customer'} · <span className="text-[#c5a059] font-bold">{inr(total)}</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 border rounded-sm" style={{ color: STATUS_COLORS[status], borderColor: `${STATUS_COLORS[status]}40`, backgroundColor: `${STATUS_COLORS[status]}10` }}>{status}</span>
          {!delivered && !cancelled && (
            <button onClick={() => setShowCancel(true)} className="text-[10px] uppercase tracking-widest border border-red-500/30 text-red-400 px-3 py-1.5 rounded-sm hover:bg-red-500/10 transition-colors">Cancel{paid ? ' + Refund' : ''}</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* MAIN COLUMN — status + next action + items */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status card: current state, progress, contextual action, collapsible history */}
          <div className={card}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                <div>
                  <div className="text-base font-bold tracking-widest uppercase" style={{ color: STATUS_COLORS[status] }}>{status}</div>
                  <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                    {cancelled ? 'Order cancelled' : delivered ? 'Complete — no further changes' : (
                      <><Clock className="w-3 h-3" /> In this status for <span className="text-content font-bold">{formatDuration(currentBucket?.durationMs || 0)}</span></>
                    )}
                  </div>
                </div>
              </div>
              {!cancelled && <StageProgress stage={stage} />}
            </div>

            {cancelled && (
              <div className="mt-5 pt-5 border-t border-red-500/20">
                <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">Cancellation reason</p>
                <p className="text-sm text-content">{order.cancellation?.reason || '—'}</p>
                {(order as any).refund?.status && (
                  <p className="text-[11px] text-emerald-500 mt-2">Refund {(order as any).refund.status} · {inr((order as any).refund.amount)} · ref {(order as any).refund.id}</p>
                )}
              </div>
            )}

            {/* Contextual stage action (online lifecycle) */}
            {!cancelled && (
              <div className="mt-5 pt-5 border-t border-[#c5a059]/10">
                {status === 'Awaiting Payment' && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-muted leading-relaxed">The customer hasn't completed payment. Paid orders move to <strong className="text-content">Processing</strong> automatically via Razorpay — nothing to do here. Cancel it if it was abandoned.</p>
                  </div>
                )}

                {status === 'Processing' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-[#c5a059] flex items-center gap-2"><Hammer className="w-4 h-4" /> Step 1 · Crafting</h3>
                    <p className="text-xs text-muted leading-relaxed">Payment received. When the bat is finished and ready to pack, mark it ready for shipment.</p>
                    <button disabled={saving} onClick={() => setStatus('Ready for Shipment', 'Bat crafted — ready to ship', 'Marked Ready for Shipment')} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 px-4 py-2.5 rounded-sm hover:bg-[#c5a059] hover:text-bg transition-colors disabled:opacity-50">
                      <PackageCheck className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Mark Ready for Shipment'}
                    </button>
                  </div>
                )}

                {status === 'Ready for Shipment' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-[#c5a059] flex items-center gap-2"><Truck className="w-4 h-4" /> Step 2 · Dispatch</h3>
                    <p className="text-xs text-muted leading-relaxed">Assign the delivery partner and tracking link (the customer sees these), then mark it shipped.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Delivery partner *" value={delivery.partnerName} onChange={(v: string) => setDelivery({ ...delivery, partnerName: v })} placeholder="e.g. Bluedart" />
                      <Field label="Tracking number" value={delivery.trackingNumber} onChange={(v: string) => setDelivery({ ...delivery, trackingNumber: v })} />
                      <Field label="Dispatch date" type="date" value={delivery.dispatchDate} onChange={(v: string) => setDelivery({ ...delivery, dispatchDate: v })} />
                      <Field label="Expected delivery" type="date" value={delivery.expectedDelivery} onChange={(v: string) => setDelivery({ ...delivery, expectedDelivery: v })} />
                      <div className="sm:col-span-2"><Field label="Tracking link (URL)" type="url" value={delivery.trackingUrl} onChange={(v: string) => setDelivery({ ...delivery, trackingUrl: v })} placeholder="https://…" /></div>
                    </div>
                    <button disabled={saving} onClick={handleMarkShipped} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#c5a059] text-bg px-4 py-2.5 rounded-sm hover:bg-premium-gold-text transition-colors disabled:opacity-50">
                      <Truck className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save details & Mark Shipped'}
                    </button>
                  </div>
                )}

                {status === 'Shipped' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-[#c5a059] flex items-center gap-2"><Truck className="w-4 h-4" /> Step 3 · In transit</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Partner</p><p className="text-content text-xs">{delivery.partnerName || '—'}</p></div>
                      <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Tracking</p><p className="text-content text-xs font-mono break-all">{delivery.trackingNumber || '—'}</p></div>
                      <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Dispatched</p><p className="text-content text-xs">{delivery.dispatchDate || '—'}</p></div>
                      <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Expected</p><p className="text-content text-xs">{delivery.expectedDelivery || '—'}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button disabled={saving} onClick={handleMarkShipped} className="text-[10px] uppercase tracking-widest border border-[#c5a059]/40 text-[#c5a059] px-4 py-2.5 rounded-sm hover:bg-[#c5a059]/10 transition-colors disabled:opacity-50">Update details</button>
                      <button disabled={saving} onClick={() => setStatus('Delivered', 'Delivered to customer', 'Order marked Delivered')} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/40 px-4 py-2.5 rounded-sm hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                      </button>
                    </div>
                  </div>
                )}

                {status === 'Delivered' && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="text-xs text-muted">This order is complete and locked — no further changes.</p>
                  </div>
                )}
              </div>
            )}

            <StatusHistory order={order} now={now} />
          </div>

          {/* Items */}
          <div className={card}>
            <h3 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-[#c5a059]" /> Items</h3>
            <div className="divide-y divide-[#c5a059]/10">
              {(order.items || []).map((it: any, i: number) => (
                <div key={i} className="flex justify-between py-2 text-xs">
                  <span className="text-content">{it.quantity || 1}× {it.productName || it.product?.name || 'Custom bat'}</span>
                  <span className="text-muted font-mono">{inr(it.lineTotal ?? (it.unitPrice || it.price || 0) * (it.quantity || 1))}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 mt-2 border-t border-[#c5a059]/20 text-sm font-bold">
              <span className="text-content uppercase tracking-widest">Total</span><span className="text-[#c5a059]">{inr(total)}</span>
            </div>
          </div>
        </div>

        {/* SIDEBAR — payment + customer */}
        <aside className="space-y-5">
          <div className={card}>
            <h3 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 mb-4"><CreditCard className="w-4 h-4 text-[#c5a059]" /> Payment</h3>
            <div className="space-y-2.5">
              <SideRow label="Status">
                <span className={refunded ? 'text-red-400 font-bold' : paid ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                  {refunded ? 'Refunded' : paid ? 'Confirmed' : 'Pending'}
                </span>
              </SideRow>
              <SideRow label="Amount">{inr(order.payment?.paidAmount || total)}</SideRow>
              <SideRow label="Method">{paid || refunded ? 'Razorpay' : '—'}</SideRow>
              {rzpPaymentId && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Payment ID</p>
                  <p className="text-content font-mono text-[11px] break-all">{rzpPaymentId}</p>
                </div>
              )}
            </div>
            {(order as any).refund?.status && (
              <p className="text-[11px] text-red-400 mt-3 pt-3 border-t border-[#c5a059]/10">Refund {(order as any).refund.status} · {inr((order as any).refund.amount)} · ref {(order as any).refund.id}</p>
            )}
          </div>

          <div className={card}>
            <h3 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 mb-4"><User className="w-4 h-4 text-[#c5a059]" /> Customer</h3>
            <div className="space-y-1.5 text-xs">
              <p className="text-content font-bold text-sm">{cust.name || 'N/A'}</p>
              <p className="text-muted break-all">{cust.email || '—'}</p>
              <p className="text-muted font-mono">{cust.phone || '—'}</p>
              {cust.address && <p className="text-muted leading-relaxed pt-1">{cust.address}{cust.city ? `, ${cust.city}` : ''}{cust.pincode ? ` ${cust.pincode}` : ''}</p>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link to="/admin/customers" state={{ userId: order.userId || '' }} className="text-[10px] text-[#c5a059] font-bold uppercase tracking-widest border border-[#c5a059]/30 px-3 py-2 rounded-sm hover:bg-[#c5a059]/10">Customer 360</Link>
              <Link to={`/admin/support?orderId=${order.id}`} className="text-[10px] text-[#c5a059] font-bold uppercase tracking-widest border border-[#c5a059]/30 px-3 py-2 rounded-sm hover:bg-[#c5a059]/10">Support ({ticketsCount})</Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/90" onClick={() => setShowCancel(false)} />
          <div className="relative bg-surface border border-red-500/30 shadow-2xl w-full max-w-md p-6">
            <h3 className="text-sm font-bold tracking-widest uppercase text-red-400 mb-2">Cancel order {shortId}</h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              {paid && !refunded
                ? 'This will issue a FULL refund to the customer via Razorpay and mark the order cancelled. This cannot be undone.'
                : 'This will mark the order cancelled. This cannot be undone.'}
            </p>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="Reason (shown to the customer)…"
              className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-red-400 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-content px-4 py-2.5 hover:bg-[#c5a059]/10 transition-colors">Keep order</button>
              <button disabled={cancelSaving} onClick={handleCancel} className="flex-1 text-[10px] uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/40 px-4 py-2.5 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
                {cancelSaving ? 'Processing…' : (paid && !refunded ? 'Cancel & Refund' : 'Cancel order')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
