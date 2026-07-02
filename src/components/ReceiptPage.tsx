import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../features/orders/services/orderService';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../types';

import { STATUS_TRACKER_STEPS, ORDER_STATUSES, mapLegacyStatus } from '../lib/orderStatus';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { AlertTriangle, Download } from 'lucide-react';

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      document.title = `Receipt ${id} — Grainood`;
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: `/my-orders/${id}/receipt` }, replace: true });
    }
  }, [user, authLoading, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const data: any = await orderService.getOrder(id);

        if (!data) {
          setError('Order not found.');
          setLoading(false);
          return;
        }

        if (data.userId !== user.uid) {
          setError('Order not found.');
          setLoading(false);
          return;
        }

        const status = mapLegacyStatus(data.status || 'Order Placed');
        const indexOfStatus = ORDER_STATUSES.indexOf(status);
        
        if (data.payment?.status !== 'confirmed') {
           navigate(`/my-orders/${id}`, { replace: true });
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
  }, [id, user, navigate]);

  if (authLoading || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-content pt-24 pb-20 font-sans px-4">
        <div className="max-w-3xl mx-auto">
          <Skeleton variant="rectangular" className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-bg relative z-raised">
        <EmptyState 
           icon={<AlertTriangle size={32} />}
           title="Receipt Error"
           description={error || 'Receipt could not be loaded.'}
           actionText={error ? "Retry Loading" : "Back to My Orders"}
           onAction={error ? () => window.location.reload() : undefined}
           actionLink={error ? undefined : "/my-orders"}
        />
      </div>
    );
  }

  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const dateStr = orderDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const orderTotal = order.totalPrice ?? order.grandTotal ?? 0;

  return (
    <div className="min-h-screen bg-bg text-content pt-24 pb-20 font-sans relative z-raised print:bg-white print:text-black print:pt-0 print:pb-0">
       <div className="max-w-3xl mx-auto px-4 lg:px-0">
          <div className="flex justify-end mb-8 print-hide">
              <button 
                 onClick={() => window.print()}
                 className="bg-[#c5a059] text-[10px] font-bold tracking-widest uppercase py-3 px-8 text-[#1a1a1a] hover:bg-[#e6c882] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c5a059]"
              >
                  Print / Save PDF
              </button>
          </div>

          {/* Receipt Container */}
          <div className="bg-white text-black p-8 md:p-12 shadow-md print:shadow-none print:border-none print:p-0 mx-auto border border-gray-200" style={{ maxWidth: '210mm' }}>
             
             {/* Header */}
             <div className="flex justify-between items-start border-b border-gray-300 pb-8 mb-8">
                <div>
                   <h1 className="text-3xl font-bold tracking-widest uppercase">GRAINOOD</h1>
                   <p className="text-gray-500 text-[10px] tracking-widest uppercase mt-1">Handcrafted English Willow</p>
                </div>
                <div className="text-right">
                   <h2 className="text-xl font-bold tracking-widest uppercase text-gray-800">Payment Receipt</h2>
                   <p className="text-xs text-gray-500 tracking-wider uppercase mt-2">No. {order.receiptNumber || order.id}</p>
                   <p className="text-xs text-gray-500 tracking-wider uppercase">{dateStr}</p>
                </div>
             </div>

             {/* Bill To */}
             <div className="mb-12">
                <h3 className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-3">Bill To</h3>
                <p className="font-bold text-sm text-gray-800 uppercase tracking-wide">{order.shippingDetails?.name}</p>
                <div className="text-sm text-gray-600 leading-relaxed mt-2">
                   <p>{order.shippingDetails?.address}</p>
                   <p>{order.shippingDetails?.city}{order.shippingDetails?.state ? `, ${order.shippingDetails.state}` : ''} {order.shippingDetails?.postalCode}</p>
                   <p>{order.shippingDetails?.country}</p>
                   <p className="mt-2">Email: {order.shippingDetails?.email}</p>
                   <p>Phone: {order.shippingDetails?.phone}</p>
                </div>
             </div>

             {/* Items Table */}
             <div className="mb-12">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b-2 border-gray-800 text-[10px] uppercase tracking-widest text-gray-800">
                        <th className="py-3 px-2 font-bold">Description</th>
                        <th className="py-3 px-2 text-right font-bold hidden sm:table-cell">Price</th>
                        <th className="py-3 px-2 text-center font-bold">Qty</th>
                        <th className="py-3 px-2 text-right font-bold">Total</th>
                     </tr>
                  </thead>
                  <tbody>
                     {order.items?.map((item: any, i: number) => {
                        const itemTotal = item.lineTotal ?? item.totalPrice ?? (item.unitPrice ?? item.price) * item.quantity;
                        const uPrice = item.unitPrice ?? item.price;
                        return (
                           <tr key={i} className="border-b border-gray-200">
                              <td className="py-4 px-2">
                                 <p className="font-bold text-sm text-gray-800 uppercase tracking-wide">{item.productName || item.product?.name}</p>
                                 {item.selections && item.selections.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                       {item.selections.map((s: any, idx: number) => (
                                          <p key={idx} className="text-xs text-gray-500">
                                            <span className="font-medium mr-1">{s.groupLabel || s.name}:</span> {s.optionLabel} {s.priceDelta ? `(+₹${s.priceDelta.toLocaleString('en-IN')})` : ''}
                                          </p>
                                       ))}
                                    </div>
                                 )}
                              </td>
                              <td className="py-4 px-2 text-right text-sm text-gray-600 whitespace-nowrap hidden sm:table-cell">₹{uPrice?.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-2 text-center text-sm text-gray-600">{item.quantity}</td>
                              <td className="py-4 px-2 text-right text-sm font-bold text-gray-800 whitespace-nowrap">₹{itemTotal.toLocaleString('en-IN')}</td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
             </div>

             {/* Totals */}
             <div className="flex justify-end mb-16">
               <div className="w-full sm:w-64">
                  <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-100">
                     <span>Base Subtotal</span>
                     <span>₹{(order.pricing?.baseSubtotal ?? order.subtotal ?? orderTotal).toLocaleString('en-IN')}</span>
                  </div>
                  {order.pricing?.customizationTotal > 0 && (
                    <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-100">
                       <span>Customizations</span>
                       <span>₹{order.pricing.customizationTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {((order.pricing?.discountsApplied) || (Array.isArray(order.discountsApplied) ? order.discountsApplied : [])).map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-2 text-sm text-green-600 border-b border-gray-100">
                       <span>{d.label}</span>
                       <span>-₹{d.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-100">
                     <span>Shipping</span>
                     <span>Free</span>
                  </div>
                  <div className="flex justify-between py-4 border-t-2 border-gray-800 font-bold text-lg text-gray-800 mt-2">
                     <span className="uppercase tracking-widest text-sm self-center">Grand Total</span>
                     <span>₹{orderTotal.toLocaleString('en-IN')}</span>
                  </div>
               </div>
             </div>

             {/* Footer Notes */}
             <div className="pt-8 border-t border-gray-200">
                <p className="text-xs text-center text-gray-500 font-medium tracking-wide">
                   Payment received securely online via Razorpay. Let the runs flow.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2 sm:gap-6 text-[10px] tracking-widest uppercase text-gray-400 items-center">
                   <span>{BRAND.email}</span>
                   <span className="hidden sm:inline">•</span>
                   <span>{BRAND.whatsappDisplay}</span>
                   <span className="hidden sm:inline">•</span>
                   <span>{BRAND.instagramHandle}</span>
                </div>
             </div>

          </div>
       </div>
    </div>
  );
}
