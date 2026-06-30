import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../features/orders/services/orderService';
import { OrderRecord } from '../../types';
import { ArrowLeft, Mail, Upload, X, ExternalLink, Copy, Check, Truck, CheckCircle2, Ban, User, Package } from 'lucide-react';
import { ticketService } from '../../features/support/services/ticketService';
import { mapLegacyStatus, stageIndex, STAGE_LABELS, STATUS_COLORS } from '../../lib/orderStatus';
import { useContent } from '../../context/ContentContext';
import { buildOrderEmail, buildGmailComposeUrl, OrderEmailTemplate } from '../../features/orders/emailTemplates';
import { uploadPrivate, getSignedUrl, PAYMENT_PROOFS_BUCKET } from '../../lib/storage';
import { toast } from 'sonner';

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function Stepper({ stage, cancelled }: { stage: number; cancelled: boolean }) {
  if (cancelled) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <Ban className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Order Cancelled</span>
      </div>
    );
  }
  return (
    <div className="flex items-center w-full">
      {STAGE_LABELS.map((label, i) => {
        const done = i <= stage;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${done ? 'bg-[#c5a059] text-bg border-[#c5a059]' : 'bg-bg text-muted border-[#c5a059]/30'}`}>
                {i < stage ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[9px] uppercase tracking-widest ${done ? 'text-[#c5a059] font-bold' : 'text-muted'}`}>{label}</span>
            </div>
            {i < STAGE_LABELS.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-5 ${i < stage ? 'bg-[#c5a059]' : 'bg-[#c5a059]/20'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
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

export function AdminOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const brand = useContent('brand');

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentRef, setPaymentRef] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState('');

  // Delivery form
  const [delivery, setDelivery] = useState({ partnerName: '', trackingNumber: '', trackingUrl: '', dispatchDate: '', expectedDelivery: '' });
  const [shipSaving, setShipSaving] = useState(false);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<OrderEmailTemplate>('payment_request');
  const [paymentLink, setPaymentLink] = useState('');
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = orderService.subscribeToOrder(id, (o: any) => {
      setOrder(o);
      if (o?.payment) {
        setPaymentMethod(o.payment.method || 'upi');
        setPaymentRef(o.payment.reference || '');
        setPaidAmount(o.payment.paidAmount ? String(o.payment.paidAmount) : '');
      }
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

  const status = mapLegacyStatus(order.status || 'Order Placed');
  const stage = stageIndex(order.status || 'Order Placed');
  const cancelled = status === 'Cancelled';
  const delivered = status === 'Delivered';
  const paid = order.payment?.status === 'confirmed';

  const cust = (order as any).customerInfo || order.shippingDetails || {};
  const total = (order as any).totalPrice ?? (order as any).pricing?.total ?? (order as any).grandTotal ?? 0;
  const shortId = order.receiptNumber || (order.id || '').slice(0, 16);

  // ---- Email (Gmail draft) ----
  const openEmailModal = (tpl: OrderEmailTemplate) => {
    setEmailTemplate(tpl); setPaymentLink(''); setPopupBlocked(false); setCopied(false); setShowEmailModal(true);
  };
  const buildDraft = () => {
    const summary = { customerName: cust.name || 'there', shortId, items: order.items || [], total };
    const { subject, body } = buildOrderEmail(emailTemplate, summary, {
      paymentLink: emailTemplate === 'payment_request' ? paymentLink : undefined,
      brandName: brand?.brandName || 'Grainood',
    });
    return { to: cust.email || '', subject, body };
  };
  const handleOpenGmail = async () => {
    if (!id) return;
    if (emailTemplate === 'payment_request') {
      let ok = false; try { ok = new URL(paymentLink).protocol === 'https:'; } catch { ok = false; }
      if (!ok) { toast.error('Enter a valid https payment link'); return; }
    }
    const draft = buildDraft();
    if (!draft.to) { toast.error('This order has no customer email on file.'); return; }
    const sendFrom = brand?.orderEmailFrom || 'adminuser@grainood.com';
    const win = window.open(buildGmailComposeUrl({ sendFrom, to: draft.to, subject: draft.subject, body: draft.body }), '_blank');
    if (!win) { setPopupBlocked(true); toast.error('Pop-up blocked — copy the draft below.'); return; }
    try { await orderService.markEmailPrepared(id, emailTemplate); } catch { /* non-blocking */ }
    toast.success('Gmail draft opened — review and send.');
    setShowEmailModal(false);
  };
  const copyDraft = async () => {
    const d = buildDraft();
    try { await navigator.clipboard.writeText(`Subject: ${d.subject}\n\n${d.body}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error('Could not copy.'); }
  };

  // ---- Payment confirm (proof optional) → Processing ----
  const handleConfirmPayment = async (file?: File | null) => {
    if (!id) return;
    file ? setProofUploading(true) : setPaymentSaving(true);
    try {
      let proofPath = order.payment?.proofPath;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        proofPath = `${id}/${Date.now()}-${safe}`;
        await uploadPrivate(PAYMENT_PROOFS_BUCKET, proofPath, file);
      }
      await orderService.updatePaymentStatus(id, {
        ...order.payment, status: 'confirmed', method: paymentMethod, reference: paymentRef,
        paidAmount: paidAmount ? parseFloat(paidAmount) : (total || null),
        proofPath, confirmedBy: user?.email || 'Admin', confirmedAt: new Date().toISOString(),
      }, user?.email || 'Admin');
      toast.success('Payment confirmed — order moved to Processing');
    } catch { toast.error('Could not confirm payment.'); }
    finally { setProofUploading(false); setPaymentSaving(false); }
  };
  const viewProof = async () => {
    if (!order.payment?.proofPath) return;
    try { setProofUrl(await getSignedUrl(PAYMENT_PROOFS_BUCKET, order.payment.proofPath)); }
    catch { toast.error('Could not load the proof.'); }
  };

  // ---- Delivery → Shipped, Delivered, Cancel ----
  const handleMarkShipped = async () => {
    if (!id) return;
    if (!delivery.partnerName.trim()) { toast.error('Enter the delivery partner name'); return; }
    setShipSaving(true);
    try {
      await orderService.updateShipment(id, {
        courierName: delivery.partnerName, trackingNumber: delivery.trackingNumber,
        trackingUrl: delivery.trackingUrl, dispatchDate: delivery.dispatchDate || null,
        estimatedDeliveryAt: delivery.expectedDelivery || null,
      });
      if (status !== 'Shipped') await orderService.updateOrderStatus(id, 'Shipped', user?.email || 'Admin', 'Dispatched to customer');
      toast.success('Delivery details saved · order marked Shipped');
    } catch (e: any) { toast.error('Could not update: ' + (e?.message || 'error')); }
    finally { setShipSaving(false); }
  };
  const handleMarkDelivered = async () => {
    if (!id) return;
    try { await orderService.updateOrderStatus(id, 'Delivered', user?.email || 'Admin', 'Marked delivered'); toast.success('Order marked Delivered'); }
    catch (e: any) { toast.error('Could not update: ' + (e?.message || 'error')); }
  };
  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) { toast.error('Enter a cancellation reason'); return; }
    setCancelSaving(true);
    try { await orderService.cancelOrder(id, cancelReason, user?.email || 'Admin'); toast.success('Order cancelled'); setShowCancel(false); setCancelReason(''); }
    catch (e: any) { toast.error(e?.message || 'Could not cancel'); }
    finally { setCancelSaving(false); }
  };

  const card = 'bg-surface border border-[#c5a059]/20 p-5 md:p-6';

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/admin/orders" className="text-[10px] uppercase tracking-widest hover:text-[#c5a059] flex items-center transition-colors">
        <ArrowLeft className="w-3 h-3 mr-2" /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.2em] uppercase">Order {shortId}</h1>
          <p className="text-xs text-muted mt-1">{cust.name || 'Customer'} · <span className="text-[#c5a059] font-bold">{inr(total)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 border" style={{ color: STATUS_COLORS[status], borderColor: `${STATUS_COLORS[status]}40`, backgroundColor: `${STATUS_COLORS[status]}10` }}>{status}</span>
          {!delivered && !cancelled && (
            <button onClick={() => setShowCancel(true)} className="text-[10px] uppercase tracking-widest border border-red-500/30 text-red-400 px-3 py-1.5 hover:bg-red-500/10 transition-colors">Cancel</button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className={card}><Stepper stage={stage} cancelled={cancelled} /></div>

      {/* Cancelled banner */}
      {cancelled && (
        <div className="border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">Cancellation reason</p>
          <p className="text-sm text-content">{order.cancellation?.reason || '—'}</p>
        </div>
      )}

      {/* Contextual stage action */}
      {!cancelled && (
        <div className={card}>
          {/* Stage 1: Order Placed → collect payment */}
          {stage === 0 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold tracking-widest uppercase text-[#c5a059]">Step 1 · Collect payment</h3>
              <p className="text-xs text-muted leading-relaxed">Email the customer a payment link, then confirm once you receive the money (proof optional).</p>
              <button onClick={() => openEmailModal('payment_request')} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 px-4 py-2.5 hover:bg-[#c5a059] hover:text-bg transition-colors">
                <Mail className="w-3.5 h-3.5" /> Send Payment Email
              </button>

              <div className="border-t border-[#c5a059]/10 pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-bg border border-[#c5a059]/20 text-xs px-3 py-2 focus:outline-none uppercase text-content">
                      <option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="other">Other</option>
                    </select>
                  </div>
                  <Field label="Paid Amount (₹)" type="number" value={paidAmount} onChange={setPaidAmount} placeholder={String(total)} />
                  <Field label="Reference / UTR" value={paymentRef} onChange={setPaymentRef} placeholder="optional" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button disabled={paymentSaving} onClick={() => handleConfirmPayment()} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/40 px-4 py-2.5 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {paymentSaving ? 'Confirming…' : 'Confirm Payment → Processing'}
                  </button>
                  <label className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-widest border border-[#c5a059]/40 px-4 py-2.5 cursor-pointer transition-colors ${proofUploading ? 'opacity-50' : 'text-[#c5a059] hover:bg-[#c5a059] hover:text-bg'}`}>
                    <Upload className="w-3.5 h-3.5" /> {proofUploading ? 'Uploading…' : 'Confirm with proof'}
                    <input type="file" accept="image/*" disabled={proofUploading} className="hidden" onChange={(e) => handleConfirmPayment(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <p className="text-[10px] text-muted">Proof is optional — it's stored privately and shown only to admins.</p>
              </div>
            </div>
          )}

          {/* Stage 2: Processing → add delivery + ship */}
          {stage === 1 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold tracking-widest uppercase text-[#c5a059]">Step 2 · Dispatch</h3>
              <p className="text-xs text-muted leading-relaxed">Payment confirmed. When the bat is ready, add the delivery details (the customer sees these) and mark the order shipped.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Delivery partner *" value={delivery.partnerName} onChange={(v: string) => setDelivery({ ...delivery, partnerName: v })} placeholder="e.g. Bluedart" />
                <Field label="Tracking number" value={delivery.trackingNumber} onChange={(v: string) => setDelivery({ ...delivery, trackingNumber: v })} />
                <Field label="Dispatch date" type="date" value={delivery.dispatchDate} onChange={(v: string) => setDelivery({ ...delivery, dispatchDate: v })} />
                <Field label="Expected delivery" type="date" value={delivery.expectedDelivery} onChange={(v: string) => setDelivery({ ...delivery, expectedDelivery: v })} />
                <div className="sm:col-span-2"><Field label="Tracking link (URL)" type="url" value={delivery.trackingUrl} onChange={(v: string) => setDelivery({ ...delivery, trackingUrl: v })} placeholder="https://…" /></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button disabled={shipSaving} onClick={handleMarkShipped} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#c5a059] text-bg px-4 py-2.5 hover:bg-premium-gold-text transition-colors disabled:opacity-50">
                  <Truck className="w-3.5 h-3.5" /> {shipSaving ? 'Saving…' : 'Save details & Mark Shipped'}
                </button>
                <button onClick={() => openEmailModal('payment_received')} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest border border-[#c5a059]/40 text-[#c5a059] px-4 py-2.5 hover:bg-[#c5a059]/10 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> Email "payment received"
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: Shipped → mark delivered */}
          {stage === 2 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold tracking-widest uppercase text-[#c5a059]">Step 3 · In transit</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Partner</p><p className="text-content">{delivery.partnerName || '—'}</p></div>
                <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Tracking</p><p className="text-content font-mono break-all">{delivery.trackingNumber || '—'}</p></div>
                <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Dispatched</p><p className="text-content">{delivery.dispatchDate || '—'}</p></div>
                <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Expected</p><p className="text-content">{delivery.expectedDelivery || '—'}</p></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleMarkShipped} className="text-[10px] uppercase tracking-widest border border-[#c5a059]/40 text-[#c5a059] px-4 py-2.5 hover:bg-[#c5a059]/10 transition-colors">Update details</button>
                <button onClick={handleMarkDelivered} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/40 px-4 py-2.5 hover:bg-emerald-500 hover:text-white transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                </button>
              </div>
            </div>
          )}

          {/* Stage 4: Delivered → locked */}
          {stage === 3 && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-content uppercase tracking-widest">Order delivered</p>
                <p className="text-xs text-muted mt-1">This order is complete and locked — no further changes.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment + proof summary (once paid) */}
      {paid && (
        <div className={card}>
          <h3 className="text-sm font-bold tracking-widest uppercase text-[#c5a059] mb-4">Payment</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Status</p><p className="text-emerald-500 font-bold">Confirmed</p></div>
            <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Amount</p><p className="text-content">{inr(order.payment?.paidAmount || total)}</p></div>
            <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Method</p><p className="text-content uppercase">{order.payment?.method || '—'}</p></div>
            <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Reference</p><p className="text-content font-mono break-all">{order.payment?.reference || '—'}</p></div>
          </div>
          {order.payment?.proofPath && (
            <div className="mt-4">
              <button onClick={viewProof} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-content px-4 py-2 hover:bg-[#c5a059]/10 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View proof
              </button>
              {proofUrl && <div className="mt-3 max-w-xs"><img src={proofUrl} alt="Payment proof" className="w-full border border-[#c5a059]/20" /><p className="text-[9px] text-muted uppercase tracking-widest mt-1">Signed link · expires shortly</p></div>}
            </div>
          )}
        </div>
      )}

      {/* Compact: customer + items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={card}>
          <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 mb-4"><User className="w-4 h-4 text-[#c5a059]" /> Customer</h3>
          <div className="space-y-2 text-sm">
            <p className="text-content font-bold">{cust.name || 'N/A'}</p>
            <p className="text-muted break-all">{cust.email || '—'}</p>
            <p className="text-muted font-mono">{cust.phone || '—'}</p>
            {cust.address && <p className="text-muted text-xs leading-relaxed">{cust.address}{cust.city ? `, ${cust.city}` : ''}{cust.pincode ? ` ${cust.pincode}` : ''}</p>}
          </div>
          <div className="flex gap-2 mt-4">
            <Link to="/admin/customers" state={{ userId: order.userId || '' }} className="text-[10px] text-[#c5a059] font-bold uppercase tracking-widest border border-[#c5a059]/30 px-3 py-2 hover:bg-[#c5a059]/10">Customer 360</Link>
            <Link to={`/admin/support?orderId=${order.id}`} className="text-[10px] text-[#c5a059] font-bold uppercase tracking-widest border border-[#c5a059]/30 px-3 py-2 hover:bg-[#c5a059]/10">Support ({ticketsCount})</Link>
          </div>
        </div>

        <div className={card}>
          <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-[#c5a059]" /> Items</h3>
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

      {/* Email modal */}
      {showEmailModal && (() => {
        const draft = buildDraft();
        const sendFrom = brand?.orderEmailFrom || 'adminuser@grainood.com';
        return (
          <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-bg/90" onClick={() => setShowEmailModal(false)} />
            <div className="relative bg-surface border border-[#c5a059]/30 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#c5a059]/10">
                <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2"><Mail className="w-4 h-4 text-[#c5a059]" />{emailTemplate === 'payment_request' ? 'Send Payment Email' : 'Payment Received Email'}</h3>
                <button onClick={() => setShowEmailModal(false)} className="text-muted hover:text-[#c5a059]"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex gap-2"><span className="text-muted uppercase tracking-widest text-[10px] w-12 shrink-0 pt-0.5">From</span><span className="text-content font-mono break-all">{sendFrom}</span></div>
                  <div className="flex gap-2"><span className="text-muted uppercase tracking-widest text-[10px] w-12 shrink-0 pt-0.5">To</span><span className="text-content font-mono break-all">{draft.to || <span className="text-red-400 normal-case">No email on this order</span>}</span></div>
                </div>
                {emailTemplate === 'payment_request' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Payment link (https://…) <span className="text-red-400">*</span></label>
                    <input type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://…" className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059]" />
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Draft preview</p>
                  <div className="bg-bg border border-[#c5a059]/15 p-4">
                    <p className="text-xs font-bold text-content mb-2">{draft.subject}</p>
                    <pre className="text-[11px] text-content/90 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
                  </div>
                </div>
                {popupBlocked && (
                  <div className="border border-yellow-500/30 bg-yellow-500/5 p-3">
                    <p className="text-[11px] text-yellow-500/90 leading-relaxed mb-2">Pop-up blocked. Copy the draft and paste into Gmail, or allow pop-ups and retry.</p>
                    <button onClick={copyDraft} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest border border-[#c5a059]/40 text-[#c5a059] px-3 py-1.5 hover:bg-[#c5a059] hover:text-bg transition-colors">
                      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy email</>}
                    </button>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEmailModal(false)} className="flex-1 text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-content px-4 py-2.5 hover:bg-[#c5a059]/10 transition-colors">Cancel</button>
                  <button onClick={handleOpenGmail} className="flex-1 inline-flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest bg-[#c5a059] text-bg px-4 py-2.5 hover:bg-premium-gold-text transition-colors"><ExternalLink className="w-3.5 h-3.5" /> Open Gmail draft</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/90" onClick={() => !cancelSaving && setShowCancel(false)} />
          <div className="relative bg-surface border border-red-500/30 shadow-2xl w-full max-w-md p-6">
            <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 mb-2"><Ban className="w-4 h-4 text-red-400" /> Cancel order</h3>
            <p className="text-xs text-muted leading-relaxed mb-4">This cancels the order and shows the reason to the customer. It can't be undone.</p>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Reason <span className="text-red-400">*</span></label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="e.g. Out of stock for the selected willow grade" className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-red-400 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCancel(false)} disabled={cancelSaving} className="flex-1 text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-content px-4 py-2.5 hover:bg-[#c5a059]/10 disabled:opacity-50">Keep order</button>
              <button onClick={handleCancel} disabled={cancelSaving} className="flex-1 text-[10px] uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/40 px-4 py-2.5 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">{cancelSaving ? 'Cancelling…' : 'Cancel order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
