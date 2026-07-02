import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../features/orders/services/orderService';
import { ticketService } from '../features/support/services/ticketService';
import { useAuth } from '../context/AuthContext';
import { GoldButton } from './GoldButton';
import { RevealSection } from './Reveal';
import { ArrowLeft, X, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { mapLegacyStatus, ORDER_STATUSES, OrderStatus, stageIndex, STAGE_LABELS } from '../lib/orderStatus';
import { useOrder } from '../context/OrderContext';
import { useProducts } from '../context/ProductsContext';
import { Skeleton, SkeletonTextLines } from './Skeleton';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { LazyImage } from './LazyImage';
import { getCustomizableAttributes } from '../features/products/attributes';

function StatusTracker({ status }: { status: string }) {
  const normalizedStatus = mapLegacyStatus(status || 'Order Placed');
  if (normalizedStatus === 'Cancelled') {
    return (
      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex gap-2 items-center">
        <div className="bg-elevated text-red-500 text-[10px] font-bold px-4 py-2 uppercase tracking-wider">
          Cancelled
        </div>
      </motion.div>
    );
  }

  // Unified 4-stage journey: Placed → Processing → Shipped → Delivered.
  const STEPS = STAGE_LABELS;
  const currentIndex = Math.max(0, stageIndex(status || 'Order Placed'));

  return (
    <div className="relative pt-6 pb-2 px-2">
      <div className="hidden sm:block absolute top-1/2 left-4 right-4 h-0.5 bg-line -z-raised -translate-y-1/2 mt-[-5px]"></div>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `calc(${(currentIndex / (STEPS.length - 1)) * 100}% - 16px)` }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="hidden sm:block absolute top-1/2 left-4 h-0.5 bg-[#c5a059] -z-raised -translate-y-1/2 mt-[-5px]" 
      />
      <div className="flex flex-col sm:flex-row justify-between relative gap-6 sm:gap-0">
        {STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.15 }}
              key={idx} 
              className="flex sm:flex-col items-center sm:w-20 gap-4 sm:gap-0"
            >
              <div className="relative">
                {/* Vertical line for mobile */}
                {idx !== STEPS.length - 1 && (
                  <div className={clsx("sm:hidden absolute top-4 left-1/2 w-0.5 h-12 -translate-x-1/2", isCompleted ? "bg-[#c5a059]" : "bg-line")}></div>
                )}
                <div className={clsx("w-3 h-3 rounded-full border-2 transition-colors duration-300 relative z-10", isCompleted ? "bg-[#c5a059] border-[#c5a059]" : "bg-bg border-line")}></div>
              </div>
              <span className={clsx("text-[9px] sm:mt-3 tracking-widest uppercase transition-colors duration-300 sm:text-center", isCompleted ? "text-[#c5a059] font-bold" : "text-muted font-medium")}>{step}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { dispatch, openDrawer } = useOrder();
  const { products } = useProducts();

  const handleOrderAgain = (orderItems: any[]) => {
     let allSuccessful = true;
     
     for (const item of orderItems) {
        let matchingProduct = products.find(p => p.slug === item.product?.slug || p.id === item.product?.id);
        
        if (!matchingProduct) {
           toast.error(`The product "${item.productName || item.product?.name}" is no longer available.`);
           allSuccessful = false;
           continue;
        }

        // Validate options and price
        let optionsChanged = false;
        let priceChanged = false;
        let selectionsForUrl: any = {};
        
        if (matchingProduct.basePrice !== item.product?.basePrice && item.product?.basePrice !== undefined) {
           priceChanged = true;
        }
        
        for (const selection of (item.selections || [])) {
           if (selection.type === 'text') {
              selectionsForUrl['engraving'] = selection.valueText;
              continue; // preserve text
           }

           const group = getCustomizableAttributes(matchingProduct).find((g: any) => g.key === selection.groupId);
           const option = group?.options?.find((o: any) => o.id === selection.optionId);

           if (!group || !option) {
              optionsChanged = true;
           } else {
              selectionsForUrl[selection.groupId] = selection.optionId;
              if (option.priceDelta !== selection.priceDelta) {
                 priceChanged = true;
              }
           }
        }

        if (optionsChanged) {
           toast.error(`Some previously selected options for "${matchingProduct.name}" are no longer available. Please review and re-select your options.`);
           const encoded = btoa(JSON.stringify(selectionsForUrl));
           navigate(`/collection/${matchingProduct.slug}?build=${encoded}`);
           return; 
        }

        if (priceChanged) {
           toast.info(`Note: The price of "${matchingProduct.name}" or its Customizations has changed since your last order.`);
        }

        dispatch({
           type: 'ADD_ITEM',
           payload: {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              product: matchingProduct as any,
              selections: item.selections || [],
              quantity: item.quantity || 1,
              unitPrice: matchingProduct.basePrice || 0
           }
        });
     }
     
     if (allSuccessful && orderItems.length > 0) {
        toast.success("Added to cart");
        openDrawer();
     }
  };
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Modal form state
  const [ticketType, setTicketType] = useState<any>('order_query');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (id) {
      document.title = `Order ${id} — Grainood`;
    }
  }, [id]);

  useEffect(() => {
    if (window.location.hash === '#support') {
      setShowSupportModal(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: `/my-orders/${id}` }, replace: true });
    }
  }, [user, authLoading, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const data: any = await orderService.getOrder(id);

        if (!data || data.userId !== user.uid) {
          setError('Order not found.');
          setLoading(false);
          return;
        }

        setOrder(data);
      } catch (err: any) {
        console.error("Error fetching order details:", err);
        setError('Failed to load order details.');
      }
      setLoading(false);
    };

    fetchOrder();
  }, [id, user]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order) return;
    
    setSubmitting(true);
    setSubmitError('');

    try {
      const newTicketId = crypto.randomUUID();

      let attachments = [];
      if (file) {
        try {
          const fileData = await ticketService.uploadAttachment(file, user.uid, newTicketId);
          attachments.push(fileData);
        } catch(err) {
           console.error("Upload failed", err);
           setSubmitError("Attachment upload failed. It may be due to missing storage configuration.");
           toast.error("Attachment upload failed.");
           setSubmitting(false);
           return;
        }
      }

      const isReturn = ticketType === 'return_request';
      let eligibility = undefined;

      if (isReturn) {
         const { RETURN_POLICY } = await import('../features/support/types');
         const isEligibleSource = RETURN_POLICY.allowedSources.includes(order.orderSource || 'website');
         // We check Delivered/Completed status
         const isDeliveredOrCompleted = ['Delivered', 'Completed'].includes(order.status || 'Order Placed');
         
         const deliveredAt = order.shipment?.deliveredAt?.toMillis ? order.shipment.deliveredAt.toMillis() : order.shipment?.deliveredAt;
         const daysSinceDelivery = deliveredAt ? (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 3600 * 24) : Infinity;
         const withinWindow = daysSinceDelivery <= RETURN_POLICY.returnWindowDays;

         if (!RETURN_POLICY.enabled) {
           eligibility = { eligible: false, reason: "Returns are currently disabled." };
         } else if (!isEligibleSource) {
           eligibility = { eligible: false, reason: `Returns are not available for ${order.orderSource || 'website'} orders. Please submit a General support request instead.` };
         } else if (!isDeliveredOrCompleted) {
           eligibility = { eligible: false, reason: "Order must be Delivered to request a return." };
         } else if (!withinWindow) {
           eligibility = { eligible: false, reason: `Return window of ${RETURN_POLICY.returnWindowDays} days has expired. Please submit a General support request instead.` };
         } else {
           eligibility = { eligible: true };
         }
      }

      await ticketService.createTicket({
        userId: user.uid,
        orderId: order.id,
        orderCode: order.receiptNumber || order.id,
        type: ticketType,
        subject,
        description,
        status: 'open',
        customerName: order.shippingDetails?.name || user.displayName || 'Customer',
        customerEmail: order.shippingDetails?.email || user.email || '',
        customerPhone: order.shippingDetails?.phone || '',
        messages: [{
          sender: 'customer',
          text: description,
          createdAt: new Date().toISOString(),
          ...(attachments.length ? { attachments } : {})
        }],
        ...(attachments.length ? { attachments } : {}),
        ...(eligibility ? { eligibility } : {}),
      } as any);

      toast.success("Support request submitted");
      setShowSupportModal(false);
      navigate('/my-requests');
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      setSubmitError('Failed to submit your request. Please try again.');
      toast.error("Failed to submit request.");
    }
    setSubmitting(false);
  };

  if (authLoading || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton variant="text" className="h-4 w-32 mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <Skeleton variant="text" className="h-4 w-24 mb-3" />
              <Skeleton variant="text" className="h-8 w-64 mb-2" />
              <Skeleton variant="text" className="h-4 w-32" />
            </div>
            <div className="flex flex-col md:items-end gap-2 text-left md:text-right">
              <Skeleton variant="text" className="h-3 w-20" />
              <Skeleton variant="text" className="h-8 w-32" />
            </div>
          </div>
          
          <Skeleton variant="rectangular" className="h-64 w-full mb-8" />
          <Skeleton variant="rectangular" className="h-96 w-full mb-8" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <EmptyState 
             icon={<AlertTriangle size={32} />}
             title="Order Error"
             description={error || 'Order not found.'}
             actionText={error ? "Retry Loading" : "Back to My Orders"}
             onAction={error ? () => window.location.reload() : undefined}
             actionLink={error ? undefined : "/my-orders"}
          />
        </div>
      </div>
    );
  }

  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const dateStr = orderDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  // Can download receipt if Payment confirmed or Confirmed or later
  const statusRecord = mapLegacyStatus(order.status || 'Order Placed');
  const indexOfStatus = ORDER_STATUSES.indexOf(statusRecord);
  const canDownloadReceipt = order.payment?.status === 'confirmed';

  const orderTotal = order.totalPrice ?? order.grandTotal ?? 0;

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mb-12">
            <Link to="/my-orders" className="inline-flex items-center text-[10px] uppercase tracking-[0.2em] text-muted hover:text-premium-gold-text transition-colors mb-6 min-h-[44px]">
              <ArrowLeft className="w-3 h-3 mr-2" />
              Back to Orders
            </Link>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#c5a059]/10 pb-8">
              <div>
                <p className="text-[11px] tracking-[0.4em] uppercase text-premium-gold-text mb-3 block">Order Details</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-content">{order.receiptNumber ? `Order No. ${order.receiptNumber}` : `Order ${order.id}`}</h1>
                  <span className="bg-surface border border-[#c5a059]/30 text-[#c5a059] px-3 py-1 text-[10px] uppercase tracking-widest">{order.status || 'Order Placed'}</span>
                  {order.payment?.status === 'confirmed' ? (
                     <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-3 py-1 text-[10px] uppercase tracking-widest">Payment Confirmed</span>
                  ) : order.payment?.status === 'submitted' ? (
                     <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 text-[10px] uppercase tracking-widest">Payment Review</span>
                  ) : (
                     <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-3 py-1 text-[10px] uppercase tracking-widest">Payment Pending</span>
                  )}
                </div>
                <p className="text-sm text-content/80 mt-4">{dateStr}</p>
                <p className="text-sm font-bold text-premium-gold-text mt-3">
                  {order.payment?.status === 'confirmed' && !['Shipped', 'Ready for Pickup', 'Delivered', 'Completed'].includes(order.status) ? 'Payment confirmed. Your order is being processed.' : 
                   order.status === 'Shipped' || order.status === 'Delivered' || order.status === 'Completed' ? 'Your bat is on the way.' : 
                   'Awaiting payment confirmation.'}
                </p>
              </div>
              
              <div className="flex flex-col md:items-end gap-2 text-left md:text-right">
                <span className="text-[10px] text-muted uppercase tracking-widest block">Total Amount</span>
                <span className="font-bold text-2xl text-[#c5a059]">₹{orderTotal.toLocaleString('en-IN')}</span>
                {order.status === 'Delivered' && (
                  <button 
                     onClick={() => handleOrderAgain(order.items || [])}
                     className="mt-2 px-6 py-2 border border-[#c5a059]/20 text-[10px] uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors min-h-[44px]"
                  >
                     Order Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </RevealSection>

        {order.payment?.status !== 'confirmed' && order.status !== 'Cancelled' && (
          <RevealSection delay={75}>
            <div className="mb-8 bg-[#c5a059]/5 border border-[#c5a059]/20 p-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#c5a059] mb-1">Payment Not Completed</p>
              <p className="text-[12px] text-muted leading-relaxed max-w-md mx-auto">
                This order wasn't paid for. If you'd still like it, please place the order again from the collection — payment is taken securely at checkout.
              </p>
            </div>
          </RevealSection>
        )}

        <RevealSection delay={100}>
          <div className="bg-surface border border-[#c5a059]/10 shadow-sm p-6 md:p-10 mb-8">
             <h2 className="text-[10px] text-muted uppercase tracking-widest mb-8">Order Progress</h2>
            <div className="overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 hide-scrollbar">
              <div className="min-w-[400px]">
                <StatusTracker status={order.status || 'Order Placed'} />
              </div>
            </div>

            {order.status === 'Cancelled' ? (
              <div className="mt-8 border border-red-500/30 bg-red-500/5 p-6">
                <p className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-2">Order Cancelled</p>
                <p className="text-sm text-content leading-relaxed">{order.cancellation?.reason || 'This order has been cancelled.'}</p>
              </div>
            ) : (
              <div className="mt-8 border-t border-[#c5a059]/10 pt-8 space-y-8">
                {/* Payment */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-content">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Payment</p>
                    {order.payment?.status === 'confirmed' ? (
                      <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest text-[11px]"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</div>
                    ) : order.payment?.status === 'submitted' ? (
                      <div className="text-blue-400 font-bold uppercase tracking-widest text-[11px]">In Review</div>
                    ) : (
                      <div className="text-yellow-500 font-bold uppercase tracking-widest text-[11px]">Pending</div>
                    )}
                  </div>
                  <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Amount</p><p className="font-mono text-[#c5a059] font-bold">₹{(order.payment?.paidAmount || orderTotal || 0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Method</p><p className="uppercase tracking-widest text-[11px]">{order.payment?.method || '-'}</p></div>
                  <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Reference</p><p className="font-mono text-[11px] break-all">{order.payment?.reference || '-'}</p></div>
                </div>

                {/* Delivery — shown once dispatched */}
                {order.shipment?.courierName && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-content border-t border-[#c5a059]/10 pt-6">
                    <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Delivery Partner</p><p className="text-[11px]">{order.shipment.courierName}</p></div>
                    <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Dispatched</p><p className="text-[11px]">{order.shipment.dispatchDate ? new Date(order.shipment.dispatchDate).toLocaleDateString() : '-'}</p></div>
                    <div><p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Expected</p><p className="text-[11px]">{order.shipment.estimatedDeliveryAt ? new Date(order.shipment.estimatedDeliveryAt).toLocaleDateString() : '-'}</p></div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Tracking</p>
                      {order.shipment.trackingUrl ? (
                        <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#c5a059] border-b border-[#c5a059]/40 hover:text-content">Track package</a>
                      ) : <p className="text-[11px] font-mono">{order.shipment.trackingNumber || '-'}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {order.adminNote && (
              <div className="mt-12 border border-[#c5a059] bg-[#c5a059]/5 p-6">
                <h4 className="text-[10px] text-premium-gold-text uppercase tracking-widest font-bold mb-3">Update from the workshop</h4>
                <p className="text-sm text-content leading-relaxed">{order.adminNote}</p>
              </div>
            )}
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-surface border border-[#c5a059]/10 shadow-sm p-6 md:p-10">
              <h2 className="text-sm text-content font-bold uppercase tracking-widest mb-8 border-b border-[#c5a059]/10 pb-4">Item Summary</h2>
              
              <div className="space-y-8">
                {order.items?.map((item: any, i: number) => {
                  const itemTotal = item.lineTotal ?? item.totalPrice ?? (item.unitPrice ?? item.price) * item.quantity;
                  const itemImage = item.product?.media?.find((m: any) => m.isPrimary)?.url || item.product?.media?.[0]?.url || item.product?.imageUrl || '/product-bat.webp';
                  
                  return (
                    <div key={i} className="flex flex-col sm:flex-row justify-between border-b border-[#c5a059]/5 pb-6 last:border-0 last:pb-0 gap-6">
                      <div className="flex-1 flex flex-col sm:flex-row gap-6">
                        <div className="w-24 h-32 shrink-0 bg-[#c5a059]/5 border border-[#c5a059]/10 relative">
                          <LazyImage src={itemImage} alt={item.productName || item.product?.name} className="w-full h-full object-cover" />
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#c5a059] text-[#111] font-bold text-xs flex items-center justify-center border-2 border-surface">{item.quantity}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-4">
                            <div>
                              <h3 className="font-bold tracking-[0.1em] text-sm uppercase text-content pt-0.5">{item.productName || item.product?.name}</h3>
                              {item.product?.subSeriesName && (
                                <p className="text-[#c5a059] text-[10px] uppercase tracking-widest mt-1">{item.product.subSeriesName}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {(item.product?.sku || item.product?.id) && <span className="text-[9px] uppercase tracking-widest text-muted border border-[#c5a059]/20 px-2 py-0.5">SKU: {item.product.sku || item.product.id?.slice(0, 8)}</span>}
                                {item.product?.grade && <span className="text-[9px] uppercase tracking-widest text-muted border border-[#c5a059]/20 px-2 py-0.5">{item.product.grade}</span>}
                              </div>
                            </div>
                          </div>
                        
                          {item.selections && item.selections.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-4">
                              {item.selections.map((s: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-0.5">
                                  <span className="text-[9px] uppercase tracking-widest text-muted">{s.groupLabel || s.name}</span>
                                  <span className="text-[11px] text-content uppercase tracking-wider font-medium truncate">
                                    {s.type === 'text' && s.valueText ? s.valueText : s.optionLabel} 
                                    {s.priceDelta ? <span className="text-[#c5a059]/80 ml-1">(+₹{s.priceDelta.toLocaleString('en-IN')})</span> : null}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <Link to={`/collection/${item.product?.slug || item.product?.seriesId}`} className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059] border-b border-[#c5a059]/40 mt-6 inline-block hover:text-content transition-colors pb-0.5">
                            View Product Details
                          </Link>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex flex-col justify-start">
                        <span className="font-bold text-[#c5a059] text-base whitespace-nowrap block">₹{itemTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-8 border-t border-[#c5a059]/10">
                <div className="w-full sm:w-72 ml-auto space-y-3 text-sm text-content">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest text-muted">Base</span>
                    <span className="font-medium">₹{(order.pricing?.baseSubtotal ?? order.subtotal ?? orderTotal).toLocaleString('en-IN')}</span>
                  </div>
                  {order.pricing?.customizationTotal > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-muted">Customs</span>
                      <span className="font-medium">₹{order.pricing.customizationTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {((order.pricing?.discountsApplied) || (Array.isArray(order.discountsApplied) ? order.discountsApplied : [])).map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[#c5a059] items-center">
                      <span className="text-[10px] uppercase tracking-widest">{d.label}</span>
                      <span className="font-mono text-xs">-₹{d.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-[#c5a059]/20 font-bold text-[#c5a059] mt-2">
                    <span className="uppercase tracking-[0.2em] text-xs">Total</span>
                    <span className="text-xl">₹{orderTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-8">
              <div className="bg-surface border border-[#c5a059]/10 shadow-sm p-6 md:p-8 flex-1">
                <h2 className="text-xs text-content font-bold uppercase tracking-[0.2em] mb-6 border-b border-[#c5a059]/10 pb-4">Shipping Details</h2>
                
                <div className="space-y-8">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-[#c5a059]/10 flex items-center justify-center mb-3">
                      <span className="text-[#c5a059] text-[10px] font-bold">To</span>
                    </span>
                    <p className="text-content font-bold text-sm tracking-wider uppercase">{order.shippingDetails?.name}</p>
                    <p className="text-muted text-xs mt-1">{order.shippingDetails?.email}</p>
                    <p className="text-muted text-xs font-mono mt-1">{order.shippingDetails?.phone}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted mb-2">Destination</p>
                    <p className="text-sm leading-relaxed text-content">
                      {order.shippingDetails?.address}<br/>
                      {order.shippingDetails?.city}{order.shippingDetails?.state ? `, ${order.shippingDetails.state}` : ''} {order.shippingDetails?.pincode || order.shippingDetails?.postalCode}<br/>
                      <span className="font-bold text-[#c5a059] mt-1 block">{order.shippingDetails?.country || 'India'}</span>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </RevealSection>

        {order.timeline && order.timeline.length > 0 && (
          <RevealSection delay={300}>
            <div className="bg-surface border border-[#c5a059]/10 shadow-sm p-6 md:p-10 mb-8">
               <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-content mb-8 border-b border-[#c5a059]/10 pb-4">Order Timeline</h3>
               <div className="space-y-6">
                  {order.timeline.slice().reverse().map((t: any, i: number) => (
                     <div key={i} className="flex gap-6 items-start relative pb-6 last:pb-0">
                        {i !== order.timeline.length - 1 && (
                          <div className="absolute left-[3px] top-4 bottom-0 w-px bg-[#c5a059]/20"></div>
                        )}
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-[#c5a059] shrink-0 relative z-10 shadow-[0_0_0_4px_rgba(197,160,89,0.1)]"></div>
                        <div>
                           <p className="text-xs font-bold uppercase tracking-widest text-content">{t.status}</p>
                           <p className="text-[10px] text-[#c5a059] tracking-widest uppercase mt-1 font-mono">
                              {new Date(t.timestamp?.toMillis ? t.timestamp.toMillis() : t.timestamp).toLocaleString()}
                           </p>
                           {t.note && t.note !== `Status updated to ${t.status}` && (
                              <p className="text-xs text-content/70 mt-2 bg-bg p-3 border border-[#c5a059]/10 block">{t.note}</p>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </RevealSection>
        )}

        <RevealSection delay={400}>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-[#c5a059]/20 pt-8 mt-12 mb-8">
            <div className="w-full sm:w-auto flex flex-col items-center sm:items-start group relative">
              <GoldButton 
                disabled={!canDownloadReceipt}
                variant="solid"
                className="w-full sm:w-auto text-center"
                as={canDownloadReceipt ? Link : 'button'}
                to={canDownloadReceipt ? `/my-orders/${id}/receipt` : undefined}
              >
                View Receipt
              </GoldButton>
              {!canDownloadReceipt && (
                <span className="absolute -top-10 left-0 bg-elevated border border-[#c5a059]/20 text-[10px] text-content px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Receipt unlocks after payment confirmation
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-surface border border-[#c5a059]/10 shadow-sm p-6 md:p-10 mb-8 mt-8">
             <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-content mb-2">Need help with this order?</h3>
             <p className="text-xs text-muted leading-relaxed mb-6">Select a support option below. We usually respond within 24 hours.</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => { setTicketType('order_query'); setShowSupportModal(true); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors border border-[#c5a059]/30 p-4 min-h-[44px] text-center flex flex-col items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 opacity-50 block md:hidden" />
                  Raise Order Query
                </button>
                <button 
                  onClick={() => { setTicketType('return_request'); setShowSupportModal(true); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors border border-[#c5a059]/30 p-4 min-h-[44px] text-center flex flex-col items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 opacity-50 block md:hidden" />
                  Request Return
                </button>
                <button 
                  onClick={() => { setTicketType('warranty_claim'); setShowSupportModal(true); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors border border-[#c5a059]/30 p-4 min-h-[44px] text-center flex flex-col items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 opacity-50 block md:hidden" />
                  Warranty Claim
                </button>
                <button 
                  onClick={() => { setTicketType('repair_request'); setShowSupportModal(true); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-bg transition-colors border border-[#c5a059]/30 p-4 min-h-[44px] text-center flex flex-col items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 opacity-50 block md:hidden" />
                  Repair Request
                </button>
             </div>
          </div>
        </RevealSection>
      </div>

      {showSupportModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/95" onClick={() => setShowSupportModal(false)}></div>
          <div className="relative bg-surface border border-[#c5a059]/20 shadow-2xl w-full max-w-lg p-6 md:p-10 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-[#c5a059] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-content mb-2 mt-4">Support Request</h2>
            <p className="text-xs text-muted tracking-widest uppercase mb-8">Order: {order.id}</p>

            <form onSubmit={handleSubmitTicket} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Request Type</label>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      name="ticketType" 
                      value="order_query" 
                      checked={ticketType === 'order_query'}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">Order Query</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      name="ticketType" 
                      value="return_request" 
                      checked={ticketType === 'return_request'}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">Return Request</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      name="ticketType" 
                      value="repair_request" 
                      checked={ticketType === 'repair_request'}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">Request Repair</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      name="ticketType" 
                      value="general" 
                      checked={ticketType === 'general'}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">General</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      name="ticketType" 
                      value="warranty_claim" 
                      checked={ticketType === 'warranty_claim'}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">Warranty Claim</span>
                  </label>
                </div>
              </div>

              {ticketType === 'return_request' && (
                <div className="mb-4 text-xs">
                  {(() => {
                    const isDeliveredOrCompleted = ['Delivered', 'Completed'].includes(order.status || 'Order Placed');
                    if (!isDeliveredOrCompleted) return <div className="text-red-500 bg-red-500/10 p-3 border border-red-500/20">Not eligible: Order must be Delivered to request a return. Please submit a General support request instead.</div>;
                    
                    const deliveredAt = order.shipment?.deliveredAt?.toMillis ? order.shipment.deliveredAt.toMillis() : order.shipment?.deliveredAt;
                    const daysSinceDelivery = deliveredAt ? (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 3600 * 24) : Infinity;
                    const withinWindow = daysSinceDelivery <= 7;
                    if (!withinWindow) return <div className="text-red-500 bg-red-500/10 p-3 border border-red-500/20">Not eligible: Return window has expired. Please submit a General support request instead.</div>;
                    
                    const isStoreOnly = order.orderSource ? !['store'].includes(order.orderSource) : true;
                    if (isStoreOnly) return <div className="text-red-500 bg-red-500/10 p-3 border border-red-500/20">Not eligible: Returns are not available for {(order.orderSource || 'website')} orders. Please submit a General support request instead.</div>;
                    
                    return <div className="text-emerald-500 bg-emerald-500/10 p-3 border border-emerald-500/20">This order is eligible for a return. Provide details below to proceed.</div>;
                  })()}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Subject</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm focus:outline-none focus:border-[#c5a059] transition-colors min-h-[44px]"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Message</label>
                <textarea 
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm focus:outline-none focus:border-[#c5a059] transition-colors resize-none min-h-[44px]"
                  placeholder="Provide detailed information to help us resolve this quickly..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Attachment (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-content file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-[#c5a059]/10 file:text-[#c5a059] hover:file:bg-[#c5a059]/20 cursor-pointer min-h-[44px] flex items-center"
                />
              </div>

              {submitError && (
                <div className="text-red-500 text-xs text-center">{submitError}</div>
              )}

              <GoldButton type="submit" disabled={submitting} variant="solid" className="w-full min-h-[44px]">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </GoldButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
