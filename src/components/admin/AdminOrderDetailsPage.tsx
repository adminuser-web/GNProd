import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../features/orders/services/orderService';
import { OrderRecord } from '../../types';
import { ShoppingBag, User, DollarSign, Factory, Truck, Shield, Wrench, ArrowLeft, RefreshCw, FileText, ClipboardList, Activity, Mail, Upload, X, ExternalLink } from 'lucide-react';
import { GoldButton } from '../GoldButton';

import { ticketService } from '../../features/support/services/ticketService';
import { ORDER_STATUSES, OrderStatus, ALLOWED_TRANSITIONS, mapLegacyStatus } from '../../lib/orderStatus';
import { FEATURES } from '../../config/features';
import { useContent } from '../../context/ContentContext';
import { buildUpiUri } from '../../lib/upi';
import { sendOrderEmail, OrderEmailTemplate } from '../../features/orders/services/orderEmailService';
import { uploadPrivate, getSignedUrl, PAYMENT_PROOFS_BUCKET } from '../../lib/storage';

import { toast } from 'sonner';

export function AdminOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const brand = useContent('brand');

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [ticketsCount, setTicketsCount] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Summary');
  
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [confirmedAt, setConfirmedAt] = useState<string>('');
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [shippingData, setShippingData] = useState({ courierName: '', trackingNumber: '', trackingUrl: '', notes: '', estimatedDeliveryAt: '' });
  const [shippingSaving, setShippingSaving] = useState(false);

  // Payment-by-email + proof
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<OrderEmailTemplate>('payment_request');
  const [paymentLink, setPaymentLink] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState('');

  useEffect(() => {
    if (!id) return;
    
    // Subscribe to Order
    const unsubOrder = orderService.subscribeToOrder(id, (fetchedOrder) => {
      setOrder(fetchedOrder);
      if (fetchedOrder && fetchedOrder.payment) {
        setPaymentStatus(fetchedOrder.payment.status || 'pending');
        setPaymentMethod(fetchedOrder.payment.method || 'upi');
        setPaymentRef(fetchedOrder.payment.reference || '');
        setPaymentNotes(fetchedOrder.payment.notes || '');
        setPaidAmount(fetchedOrder.payment.paidAmount ? fetchedOrder.payment.paidAmount.toString() : '');
        setConfirmedAt(fetchedOrder.payment.confirmedAt?.toDate 
            ? fetchedOrder.payment.confirmedAt.toDate().toISOString().split('T')[0] 
            : (fetchedOrder.payment.confirmedAt ? new Date(fetchedOrder.payment.confirmedAt).toISOString().split('T')[0] : '')
        );
      }
      if (fetchedOrder && fetchedOrder.shipment) {
        setShippingData({
          courierName: fetchedOrder.shipment.courierName || '',
          trackingNumber: fetchedOrder.shipment.trackingNumber || '',
          trackingUrl: fetchedOrder.shipment.trackingUrl || '',
          notes: fetchedOrder.shipment.notes || '',
          estimatedDeliveryAt: fetchedOrder.shipment.estimatedDeliveryAt?.toDate 
            ? fetchedOrder.shipment.estimatedDeliveryAt.toDate().toISOString().split('T')[0] 
            : (fetchedOrder.shipment.estimatedDeliveryAt ? new Date(fetchedOrder.shipment.estimatedDeliveryAt).toISOString().split('T')[0] : '')
        });
      }
      setLoading(false);
    });

    // Tickets count for this order
    if (id) ticketService.getTicketCountByOrder(id).then(setTicketsCount);

    return () => {
      unsubOrder();
    };
  }, [id, user]);

  if (loading) {
     return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#c5a059] border-t-transparent animate-spin" /></div>;
  }

  if (!order) {
     return <div className="p-8"><h2 className="text-xl">Order not found</h2></div>;
  }

  const handleUpdatePayment = async (status: string) => {
    if (!id) return;
    setPaymentSaving(true);
    try {
      await orderService.updatePaymentStatus(id, {
        ...order.payment,
        status: status as any,
        method: paymentMethod,
        reference: paymentRef,
        notes: paymentNotes,
        paidAmount: paidAmount ? parseFloat(paidAmount) : null,
        confirmedAt: confirmedAt ? new Date(confirmedAt) : null
      }, user?.email || 'Admin');
      setPaymentStatus(status);
      toast.success("Payment info updated");
    } catch (err: any) {
      toast.error("Error updating payment: " + err.message);
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleUpdateShipping = async () => {
    if (!id) return;
    setShippingSaving(true);
    try {
      await orderService.updateShipment(id, {
        ...order.shipment,
        ...shippingData,
        estimatedDeliveryAt: shippingData.estimatedDeliveryAt ? new Date(shippingData.estimatedDeliveryAt) : null
      });
      toast.success("Shipping info updated");
    } catch (err: any) {
      toast.error("Failed to update shipping: " + err.message);
    } finally {
      setShippingSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!id) return;
    const newStatus = e.target.value as OrderStatus;
    try {
      await orderService.updateOrderStatus(id, newStatus, user?.email || 'Admin', `Status updated manually from admin detail page`);
      toast.success("Order status updated");
    } catch (err: any) {
      toast.error("Error updating order status: " + err.message);
    }
  };

  const openEmailModal = (tpl: OrderEmailTemplate) => {
    setEmailTemplate(tpl);
    setPaymentLink('');
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!id) return;
    if (emailTemplate === 'payment_request') {
      let valid = false;
      try { valid = new URL(paymentLink).protocol === 'https:'; } catch { valid = false; }
      if (!valid) { toast.error('Enter a valid https payment link'); return; }
    }
    setSendingEmail(true);
    try {
      await sendOrderEmail(id, emailTemplate, emailTemplate === 'payment_request' ? paymentLink : undefined);
      toast.success('Email sent to the customer');
      setShowEmailModal(false);
    } catch {
      // Generic — no PII in the toast.
      toast.error('Could not send the email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Upload proof to the PRIVATE bucket, confirm payment, advance to Processing.
  const handleUploadProof = async (file: File | null) => {
    if (!id || !file) return;
    setProofUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${id}/${Date.now()}-${safe}`;
      await uploadPrivate(PAYMENT_PROOFS_BUCKET, path, file);
      await orderService.updatePaymentStatus(id, {
        ...order.payment,
        status: 'confirmed',
        method: paymentMethod,
        reference: paymentRef,
        notes: paymentNotes,
        paidAmount: paidAmount ? parseFloat(paidAmount) : (order.totalPrice ?? null),
        proofPath: path,
        confirmedBy: user?.email || 'Admin',
        confirmedAt: new Date().toISOString(),
      }, user?.email || 'Admin');
      try {
        await orderService.updateOrderStatus(id, 'Processing', user?.email || 'Admin', 'Advanced to Processing after payment confirmation');
      } catch { /* transition may already be past Processing */ }
      setPaymentStatus('confirmed');
      const signed = await getSignedUrl(PAYMENT_PROOFS_BUCKET, path).catch(() => '');
      setProofUrl(signed);
      toast.success('Proof saved · payment confirmed · order moved to Processing');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setProofUploading(false);
    }
  };

  const viewProof = async () => {
    const path = order?.payment?.proofPath;
    if (!path) return;
    try {
      setProofUrl(await getSignedUrl(PAYMENT_PROOFS_BUCKET, path));
    } catch {
      toast.error('Could not load the proof.');
    }
  };

  const TABS = [
    'Summary', 
    'Customer',
    'Payment', 
    'Items', 
    'Shipping / Pickup', 
    'Support', 
    'Activity'
  ];

  return (
    <div className="space-y-6">
       <Link to="/admin/orders" className="text-[10px] uppercase tracking-widest hover:text-[#c5a059] flex items-center transition-colors">
         <ArrowLeft className="w-3 h-3 mr-2" /> Back to Orders
       </Link>

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-2xl font-bold tracking-[0.2em] uppercase">Order {order.receiptNumber || order.id?.slice(0,8)}</h1>
           <div className="text-xs text-muted uppercase tracking-widest mt-1 flex items-center gap-4 flex-wrap">
             <div className="flex items-center gap-2">
               Status: 
               <select 
                 value={order.status}
                 onChange={handleUpdateOrderStatus}
                 className="bg-bg border border-[#c5a059]/30 text-[#c5a059] p-1 focus:outline-none focus:border-[#c5a059]"
               >
                 <option value={order.status}>{order.status}</option>
                 {(ALLOWED_TRANSITIONS[order.status as OrderStatus] || []).map(t => (
                   <option key={t} value={t}>{t}</option>
                 ))}
               </select>
             </div>
             {(order as any).receiptUrl && (
               <span className="text-white">Receipt Link Unlocked: <a href={(order as any).receiptUrl} target="_blank" rel="noreferrer" className="text-[#c5a059] hover:underline cursor-pointer">{order.receiptNumber}</a></span>
             )}
             {(order as any).receiptNumber && !(order as any).receiptUrl && (
               <span className="text-white">Receipt #: <span className="text-[#c5a059]">{order.receiptNumber}</span></span>
             )}
           </div>
         </div>
         <div className="flex gap-2 flex-wrap">
            {(() => {
              const amt = (order as any).totalPrice ?? (order as any).pricing?.total ?? (order as any).grandTotal ?? 0;
              const ref = order.receiptNumber || order.id;
              const cName = (order as any).customerInfo?.name || order.shippingDetails?.name || 'there';
              const phone = ((order as any).customerInfo?.phone || order.shippingDetails?.phone || '').replace(/\D/g, '');
              const upiId = brand?.payments?.upiId;
              const upiUri = upiId ? buildUpiUri({ payeeVpa: upiId, payeeName: brand?.payments?.upiPayeeName || brand?.brandName || 'Grainood', amount: amt, note: `Order ${ref}` }) : '';
              const msg = encodeURIComponent(
                `Hi ${cName}, your Grainood order ${ref} is confirmed for ₹${Math.round(amt).toLocaleString('en-IN')}.` +
                (upiId ? `\n\nPay via UPI to: ${upiId}` + (upiUri ? `\nor tap to pay: ${upiUri}` : '') : '') +
                `\n\nPlease reply with your UPI reference once paid. Thank you!`,
              );
              const waUrl = phone ? `https://wa.me/${phone}?text=${msg}` : '';
              return order.payment?.status !== 'confirmed' && waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase tracking-widest bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059] hover:text-bg transition-colors"
                >
                  Request Payment (WhatsApp)
                </a>
              ) : null;
            })()}
            {order.payment?.status !== 'confirmed' && (
              <button
                onClick={() => openEmailModal('payment_request')}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059] hover:text-bg transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Send Payment Email
              </button>
            )}
            <button
               onClick={() => handleUpdatePayment('confirmed')}
               className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-4 py-2 hover:bg-emerald-500 hover:text-white transition-colors"
            >
               Mark Paid
            </button>
            <Link to={`/admin/support?orderId=${order.id}`} className="text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-[#c5a059] px-4 py-2 hover:bg-[#c5a059]/10 transition-colors">
               Create Ticket
            </Link>
         </div>
       </div>

       {/* Tabs Navigation */}
       <div className="flex overflow-x-auto border-b border-[#c5a059]/20 hide-scrollbar mask-edges pb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-6 py-3 text-xs tracking-widest uppercase transition-colors ${activeTab === tab ? 'text-[#c5a059] border-b border-[#c5a059]' : 'text-muted hover:text-content'}`}
            >
              {tab}
            </button>
          ))}
       </div>

       <div className="bg-surface border border-[#c5a059]/20 p-6 min-h-[400px]">
          
          {activeTab === 'Summary' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <FileText className="w-4 h-4 text-[#c5a059]" /> Order Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-muted">
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Order Date</p>
                  <p className="text-content">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Source</p>
                  <p className="text-content uppercase">{order.orderSource || 'Website'}</p>
                </div>
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Items</p>
                  <p className="text-content">{order.items?.length || 0} items</p>
                </div>
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Total</p>
                  <p className="text-[#c5a059] font-bold text-lg">₹{(order.totalPrice || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Customer' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <User className="w-4 h-4 text-[#c5a059]" /> Customer Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted">
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Name</p>
                  <p className="text-content font-bold">{(order as any).customerInfo?.name || order.shippingDetails?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Email</p>
                  <p className="text-content">{(order as any).customerInfo?.email || order.shippingDetails?.email}</p>
                </div>
                <div>
                  <p className="tracking-widest uppercase text-[10px] mb-1">Phone</p>
                  <p className="text-content">{(order as any).customerInfo?.phone || order.shippingDetails?.phone}</p>
                </div>
              </div>
              <Link to="/admin/customers" state={{ userId: order.userId || '' }} className="mt-4 text-[10px] text-[#c5a059] font-bold uppercase tracking-widest border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059]/10 inline-block text-center">
                 Open Customer 360
              </Link>
            </div>
          )}

          {activeTab === 'Payment' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <DollarSign className="w-4 h-4 text-[#c5a059]" /> Payment Tracking
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted">
                <div><p className="tracking-widest uppercase text-[10px] mb-1">Total Amount</p><p className="text-content font-bold">₹{(order.totalPrice || 0).toLocaleString('en-IN')}</p></div>
                <div><p className="tracking-widest uppercase text-[10px] mb-1">Status</p><p className={paymentStatus === 'confirmed' ? 'text-emerald-500' : 'text-yellow-500'}>{paymentStatus}</p></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none focus:border-[#c5a059] uppercase"
                  >
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Paid Amount (₹)</label>
                  <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" placeholder="e.g. 50000" />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Reference / UTR</label>
                  <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" placeholder="e.g. 129381..." />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Confirmed Date</label>
                  <input type="date" value={confirmedAt} onChange={(e) => setConfirmedAt(e.target.value)} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Internal Notes</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" placeholder="E.g. Sent via GPay" />
              </div>

              <div className="mt-6 flex gap-4 max-w-sm">
                <button
                  disabled={paymentSaving}
                  onClick={() => handleUpdatePayment('confirmed')}
                  className="flex-1 text-[10px] border border-emerald-500/50 text-emerald-500 px-4 py-2 uppercase tracking-widest hover:bg-emerald-500/10"
                >
                  Confirm Payment
                </button>
                <button
                  disabled={paymentSaving}
                  onClick={() => handleUpdatePayment('pending')}
                  className="flex-1 text-[10px] border border-[#c5a059]/50 text-[#c5a059] px-4 py-2 uppercase tracking-widest hover:bg-[#c5a059]/10"
                >
                  Save as Pending
                </button>
              </div>

              {/* Payment proof (private bucket, admin-only via signed URL) */}
              <div className="mt-8 border-t border-[#c5a059]/10 pt-6">
                <h4 className="text-[10px] text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-[#c5a059]" /> Payment Proof
                </h4>
                <p className="text-[11px] text-muted leading-relaxed mb-3 max-w-md">
                  Uploading a proof image confirms the payment, records who/when, and moves the order to <span className="text-content">Processing</span>. Proofs are private — visible to admins only.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-widest border border-[#c5a059]/40 px-4 py-2 cursor-pointer transition-colors ${proofUploading ? 'opacity-50' : 'text-[#c5a059] hover:bg-[#c5a059] hover:text-bg'}`}>
                    <Upload className="w-3.5 h-3.5" />
                    {proofUploading ? 'Uploading…' : (order.payment?.proofPath ? 'Replace Proof' : 'Upload Proof & Confirm')}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={proofUploading}
                      className="hidden"
                      onChange={(e) => handleUploadProof(e.target.files?.[0] || null)}
                    />
                  </label>
                  {order.payment?.proofPath && (
                    <button onClick={viewProof} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-content px-4 py-2 hover:bg-[#c5a059]/10 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> View Proof
                    </button>
                  )}
                </div>
                {proofUrl && (
                  <div className="mt-4 max-w-xs">
                    <img src={proofUrl} alt="Payment proof" className="w-full border border-[#c5a059]/20" />
                    <p className="text-[9px] text-muted uppercase tracking-widest mt-1">Signed link · expires shortly</p>
                  </div>
                )}
              </div>

              {/* Payment received email */}
              {order.payment?.status === 'confirmed' && (
                <div className="mt-8 border-t border-[#c5a059]/10 pt-6">
                  <h4 className="text-[10px] text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#c5a059]" /> Notify Customer
                  </h4>
                  <button
                    onClick={() => openEmailModal('payment_received')}
                    className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest border border-[#c5a059]/40 text-[#c5a059] px-4 py-2 hover:bg-[#c5a059] hover:text-bg transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send "Payment received" email
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Items' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <ShoppingBag className="w-4 h-4 text-[#c5a059]" /> Line Items
              </h3>
              <div className="space-y-4">
                 {(order.items || []).map((item: any, i: number) => {
                    const uPrice = item.unitPrice ?? item.price;
                    const lineTotal = uPrice * (item.quantity || 1);
                    return (
                    <div key={i} className="border border-[#c5a059]/10 p-4 relative">
                       <p className="font-bold text-content text-lg mb-1">{item.productName || item.product?.name || 'Custom Product'} <span className="text-muted font-normal text-sm ml-2">x{item.quantity || 1}</span></p>
                       <p className="text-muted text-xs font-mono mb-4">Unit Price: ₹{uPrice?.toLocaleString('en-IN')} | Line Total: <span className="text-content font-bold">₹{lineTotal.toLocaleString('en-IN')}</span></p>

                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 border-t border-[#c5a059]/10 pt-4">
                         {item.product?.seriesId && <div><p className="tracking-widest uppercase text-[10px] text-muted mb-1">Series</p><p className="text-xs text-content uppercase">{item.product.seriesId.replace('-', ' ')}</p></div>}
                         {item.product?.subSeriesName && <div><p className="tracking-widest uppercase text-[10px] text-muted mb-1">Sub-Series</p><p className="text-xs text-content uppercase">{item.product.subSeriesName}</p></div>}
                         {item.product?.id && <div><p className="tracking-widest uppercase text-[10px] text-muted mb-1">SKU / ID</p><p className="text-xs text-content uppercase">{item.product.sku || item.product.id}</p></div>}
                         {item.product?.grade && <div><p className="tracking-widest uppercase text-[10px] text-muted mb-1">Grade</p><p className="text-xs text-content uppercase">{item.product.grade}</p></div>}
                         {item.customizations?.engraving && <div><p className="tracking-widest uppercase text-[10px] text-muted mb-1">Engraving</p><p className="text-xs text-content">{item.customizations.engraving}</p></div>}
                       </div>

                       {item.selections && item.selections.length > 0 ? (
                          <div className="mt-2 text-xs text-muted flex flex-wrap gap-2">
                             {item.selections.map((sel: any, sIdx: number) => (
                                <span key={sIdx} className="bg-bg px-2 py-1 flex flex-col rounded-sm border border-[#c5a059]/20">
                                  <span className="text-[9px] uppercase tracking-widest opacity-50">{sel.groupLabel || sel.groupId}:</span> 
                                  <span className="text-content uppercase">{sel.optionLabel || sel.valueText}</span>
                                </span>
                             ))}
                          </div>
                       ) : item.customizations && (
                          <div className="mt-2 text-xs text-muted grid grid-cols-2 md:grid-cols-4 gap-2">
                             {Object.entries(item.customizations).map(([k, v]: [string, any], idx: number) => {
                                if (k === '_qty') return null;
                                return (
                                  <span key={idx} className="bg-bg px-2 py-1 flex flex-col rounded-sm border border-[#c5a059]/20">
                                    <span className="text-[9px] uppercase tracking-widest opacity-50">{k}:</span> 
                                    <span className="text-content uppercase">{v as string}</span>
                                  </span>
                                )
                             })}
                          </div>
                       )}
                    </div>
                 )})}
              </div>
            </div>
          )}

          {activeTab === 'Shipping / Pickup' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <Truck className="w-4 h-4 text-[#c5a059]" /> Shipping / Pickup Information
              </h3>
              <div className="text-sm border border-[#c5a059]/20 p-4 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] tracking-widest uppercase text-muted mb-1">Courier Name</label>
                       <input 
                          type="text" 
                          value={shippingData.courierName} 
                          onChange={(e) => setShippingData({ ...shippingData, courierName: e.target.value })}
                          className="w-full bg-bg border border-[#c5a059]/20 p-2 text-xs focus:outline-none focus:border-[#c5a059]"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] tracking-widest uppercase text-muted mb-1">Tracking Number</label>
                       <input 
                          type="text" 
                          value={shippingData.trackingNumber} 
                          onChange={(e) => setShippingData({ ...shippingData, trackingNumber: e.target.value })}
                          className="w-full bg-bg border border-[#c5a059]/20 p-2 text-xs focus:outline-none focus:border-[#c5a059]"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] tracking-widest uppercase text-muted mb-1">Est. Delivery Date</label>
                       <input 
                          type="date" 
                          value={shippingData.estimatedDeliveryAt} 
                          onChange={(e) => setShippingData({ ...shippingData, estimatedDeliveryAt: e.target.value })}
                          className="w-full bg-bg border border-[#c5a059]/20 p-2 text-xs focus:outline-none focus:border-[#c5a059]"
                       />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-[10px] tracking-widest uppercase text-muted mb-1">Tracking URL</label>
                       <input 
                          type="url" 
                          value={shippingData.trackingUrl} 
                          onChange={(e) => setShippingData({ ...shippingData, trackingUrl: e.target.value })}
                          className="w-full bg-bg border border-[#c5a059]/20 p-2 text-xs focus:outline-none focus:border-[#c5a059]"
                       />
                    </div>
                 </div>
                 <div className="mt-4 flex gap-4 max-w-sm">
                   <button 
                     disabled={shippingSaving} 
                     onClick={handleUpdateShipping} 
                     className="flex-1 text-[10px] border border-[#c5a059] text-[#c5a059] px-4 py-2 uppercase tracking-widest hover:bg-[#c5a059]/10"
                   >
                     {shippingSaving ? 'Saving...' : 'Save Shipping'}
                   </button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'Support' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <Wrench className="w-4 h-4 text-[#c5a059]" /> Customer Support
              </h3>
              <div className="border border-[#c5a059]/20 p-4 max-w-md">
                 <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Support Tickets Linked</p>
                 <p className="text-2xl font-bold">{ticketsCount}</p>
                 <Link to={`/admin/support?orderId=${order.id}`} className="mt-4 text-[10px] text-[#c5a059] font-bold uppercase tracking-widest border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059]/10 inline-block text-center">
                   View Linked Tickets &rarr;
                 </Link>
              </div>
            </div>
          )}
          
          {activeTab === 'Activity' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 border-b border-[#c5a059]/10 pb-2">
                <Activity className="w-4 h-4 text-[#c5a059]" /> Timeline Log
              </h3>
              <div className="space-y-4">
                 {(order.timeline || []).slice().reverse().map((t: any, idx: number) => (
                    <div key={idx} className="flex flex-col text-xs space-y-1 pb-4 border-b border-[#c5a059]/10">
                       <p className="text-content uppercase tracking-widest">{t.status}</p>
                       <p className="text-muted">{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : new Date(t.timestamp).toLocaleString()}</p>
                       <p className="text-muted italic">{t.note}</p>
                       {t.changedBy && <p className="text-[#c5a059]">User: {t.changedBy}</p>}
                    </div>
                 ))}
              </div>
            </div>
          )}

       </div>

       {showEmailModal && (
         <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-bg/90" onClick={() => !sendingEmail && setShowEmailModal(false)} />
           <div className="relative bg-surface border border-[#c5a059]/30 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between px-6 py-4 border-b border-[#c5a059]/10">
               <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                 <Mail className="w-4 h-4 text-[#c5a059]" />
                 {emailTemplate === 'payment_request' ? 'Send Payment Email' : 'Payment Received Email'}
               </h3>
               <button onClick={() => !sendingEmail && setShowEmailModal(false)} className="text-muted hover:text-[#c5a059]"><X className="w-5 h-5" /></button>
             </div>

             <div className="p-6 space-y-5">
               {/* Preview (admin-visible name + order summary; the email itself is rendered server-side) */}
               <div className="bg-bg border border-[#c5a059]/15 p-4">
                 <p className="text-[10px] text-muted uppercase tracking-widest mb-1">To</p>
                 <p className="text-content font-bold text-sm mb-4">{(order as any).customerInfo?.name || order.shippingDetails?.name || 'Customer'}</p>

                 <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
                   {emailTemplate === 'payment_request'
                     ? `Complete your payment — order ${order.receiptNumber || order.id?.slice(0, 12)}`
                     : `Payment received — order ${order.receiptNumber || order.id?.slice(0, 12)} in processing`}
                 </p>

                 <div className="divide-y divide-[#c5a059]/10">
                   {(order.items || []).map((it: any, i: number) => (
                     <div key={i} className="flex justify-between py-1.5 text-xs">
                       <span className="text-content">{it.quantity || 1}× {it.productName || it.product?.name || 'Custom bat'}</span>
                       <span className="text-muted font-mono">₹{Math.round(it.lineTotal ?? (it.unitPrice || it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}</span>
                     </div>
                   ))}
                 </div>
                 <div className="flex justify-between pt-3 mt-2 border-t border-[#c5a059]/20 text-sm font-bold">
                   <span className="text-content uppercase tracking-widest">Total</span>
                   <span className="text-[#c5a059]">₹{Math.round((order as any).totalPrice ?? (order as any).pricing?.total ?? 0).toLocaleString('en-IN')}</span>
                 </div>
               </div>

               {emailTemplate === 'payment_request' ? (
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Payment link (https://…) <span className="text-red-400">*</span></label>
                   <input
                     type="url"
                     value={paymentLink}
                     onChange={(e) => setPaymentLink(e.target.value)}
                     placeholder="https://…"
                     className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059]"
                   />
                   <p className="text-[10px] text-muted mt-1">Paste the payment link you've prepared. It's inserted into the email's "Pay now" button.</p>
                 </div>
               ) : (
                 <p className="text-[11px] text-muted leading-relaxed">Sends the customer a "payment received — order in processing" confirmation.</p>
               )}

               <div className="flex gap-3 pt-2">
                 <button onClick={() => setShowEmailModal(false)} disabled={sendingEmail} className="flex-1 text-[10px] uppercase tracking-widest border border-[#c5a059]/30 text-content px-4 py-2.5 hover:bg-[#c5a059]/10 transition-colors disabled:opacity-50">
                   Cancel
                 </button>
                 <button onClick={handleSendEmail} disabled={sendingEmail} className="flex-1 inline-flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest bg-[#c5a059] text-bg px-4 py-2.5 hover:bg-premium-gold-text transition-colors disabled:opacity-50">
                   <Mail className="w-3.5 h-3.5" /> {sendingEmail ? 'Sending…' : 'Send Email'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
