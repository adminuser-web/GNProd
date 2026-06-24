import React, { useEffect, useState, useMemo } from 'react';
import { db, auth, storage } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { clsx } from 'clsx';
import { Skeleton } from '../Skeleton';
import { 
  ShoppingBag, ChevronRight, MessageCircle, Save, X, Phone, Mail, 
  Search, Filter, ChevronDown, MoreVertical, CreditCard, Box, Calendar, Clock, Banknote
} from 'lucide-react';
import { GoldButton } from '../GoldButton';
import { LazyImage } from '../LazyImage';
import { motion, AnimatePresence } from 'motion/react';

import { ORDER_STATUSES, OrderStatus, ALLOWED_TRANSITIONS, mapLegacyStatus, STATUS_COLORS } from '../../lib/orderStatus';
import { orderService } from '../../features/orders/services/orderService';
import { useAllOrders } from '../../features/orders/hooks/useOrders';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ImageUpload } from './ImageUpload';

const DATE_RANGES = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month'];

function isNewOrder(createdAt: any) {
  if (!createdAt?.toDate) return false;
  const curr = new Date().getTime();
  const orderTime = createdAt.toDate().getTime();
  return (curr - orderTime) < 24 * 60 * 60 * 1000;
}

function StatusBadge({ status, type = 'order' }: { status: string, type?: 'order' | 'payment' }) {
  if (type === 'payment') {
    const s = status.toLowerCase();
    const style = 
      s === 'confirmed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : 
      s === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/30" : 
      s === 'refunded' ? "bg-slate-500/10 text-slate-500 border-slate-500/30" : 
      "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    
    return (
      <span className={clsx("text-[9px] uppercase tracking-widest font-bold px-2 py-1 border inline-flex text-center whitespace-nowrap", style)}>
        {status}
      </span>
    );
  }

  // Order status
  const mapped = mapLegacyStatus(status);
  const color = STATUS_COLORS[mapped as OrderStatus] || '#c5a059';
  return (
    <span 
      className="text-[9px] uppercase tracking-widest font-bold px-2 py-1 border inline-flex text-center whitespace-nowrap flex-shrink-0"
      style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}30` }}
    >
      {mapped}
    </span>
  );
}

function PaymentPanel({ order, onUpdate }: { order: any, onUpdate: (o: any) => void }) {
  const defaultAmount = order.totalPrice || order.grandTotal || 0;
  const currentPayment = order.payment || { status: order.paymentStatus || 'pending', paidAmount: 0 };
  
  const [status, setStatus] = useState<string>(currentPayment.status || 'pending');
  const [method, setMethod] = useState<string>(currentPayment.method || 'upi');
  const [reference, setReference] = useState<string>(currentPayment.reference || '');
  const [paidAmount, setPaidAmount] = useState<number>(currentPayment.paidAmount || defaultAmount);
  const [notes, setNotes] = useState<string>(currentPayment.notes || '');
  const [saving, setSaving] = useState(false);
  const [proofUrl, setProofUrl] = useState<string>(currentPayment.proofImageUrl || '');

  const handleUpdate = async (newStatus: string) => {
    setSaving(true);
    try {
      const paymentUpdate: any = {
        status: newStatus,
        method,
        reference,
        paidAmount,
        notes,
        proofImageUrl: proofUrl
      };

      if (newStatus === 'confirmed') {
        paymentUpdate.confirmedAt = new Date();
        paymentUpdate.confirmedBy = auth.currentUser?.email || 'Admin';
      }

      if (newStatus === 'confirmed') {
        await orderService.updatePaymentStatus(order.id, paymentUpdate);
        onUpdate({ 
          ...order, 
          status: 'Payment Confirmed',
          payment: { ...paymentUpdate, confirmedAt: { toDate: () => new Date() } }
        });
        toast.success("Payment confirmed successfully");
      } else {
        await orderService.updatePaymentStatus(order.id, paymentUpdate);
        onUpdate({ ...order, payment: { ...paymentUpdate } });
        toast.success(`Payment status updated to ${newStatus}`);
      }
    } catch (err) {
      console.error('Failed to update payment:', err);
      toast.error("Failed to update payment.");
    }
    setSaving(false);
  };

  return (
    <div className="bg-bg p-4 border border-[#c5a059]/10">
       <div className="flex items-center gap-2 mb-4">
         <CreditCard className="w-4 h-4 text-[#c5a059]" />
         <p className="text-xs text-content uppercase tracking-widest font-bold">Payment Details</p>
       </div>
       
       <div className="space-y-4">
         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Status</label>
             <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none focus:border-[#c5a059] uppercase"
             >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
             </select>
           </div>
           <div>
             <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Method</label>
             <select 
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none focus:border-[#c5a059] uppercase"
             >
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
             </select>
           </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Reference / UTR</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" placeholder="e.g. 129381..." />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Amount (₹)</label>
              <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" />
            </div>
         </div>

         <div>
           <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Notes / Info</label>
           <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-surface border border-[#c5a059]/30 text-xs px-2 py-1.5 focus:outline-none text-content" placeholder="E.g. Sent via GPay" />
         </div>

         <div>
           <label className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Proof Image</label>
           {currentPayment.proofImageUrl ? (
              <a href={currentPayment.proofImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline block mb-2">View current proof</a>
           ) : null}
           <ImageUpload
              specKey="supportAttachment"
              supportThemes={false}
              value={proofUrl}
              onChange={(url) => setProofUrl(typeof url === 'string' ? url : (url.light || url.dark || ''))}
              storagePath={`payments/${order.id}`}
           />
         </div>

         <div className="flex justify-end gap-2 pt-2 border-t border-[#c5a059]/10">
           {status !== 'confirmed' && (
              <GoldButton onClick={() => handleUpdate(status)} disabled={saving} className="text-[10px] py-1.5 px-3 uppercase text-xs" variant="outline">
                {saving ? '...' : `Update to ${status}`}
              </GoldButton>
           )}
           <GoldButton onClick={() => handleUpdate('confirmed')} disabled={saving || currentPayment.status === 'confirmed'} className="text-[10px] py-1.5 px-3 uppercase text-xs border border-[#c5a059]/30">
             {saving ? '...' : 'Confirm Payment'}
           </GoldButton>
         </div>
       </div>
    </div>
  );
}

export function AdminOrdersBoard() {
  const { orders, loading } = useAllOrders();
  
  const [searchParams] = useSearchParams();
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>(
    searchParams.get('payment') === 'pending' ? 'Pending' : 'All'
  );
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<string>('All Time');
  
  // Drawer State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [shippingData, setShippingData] = useState({ courierName: '', trackingNumber: '', trackingUrl: '', notes: '', estimatedDeliveryAt: '' });
  const [savingShipping, setSavingShipping] = useState(false);

  useEffect(() => {
    document.title = "Sales & Orders — Admin";
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      setShippingData({
        courierName: selectedOrder.shipment?.courierName || '',
        trackingNumber: selectedOrder.shipment?.trackingNumber || '',
        trackingUrl: selectedOrder.shipment?.trackingUrl || '',
        notes: selectedOrder.shipment?.notes || '',
        estimatedDeliveryAt: selectedOrder.shipment?.estimatedDeliveryAt?.toDate ? selectedOrder.shipment.estimatedDeliveryAt.toDate().toISOString().split('T')[0] : (selectedOrder.shipment?.estimatedDeliveryAt ? new Date(selectedOrder.shipment.estimatedDeliveryAt).toISOString().split('T')[0] : '')
      });
      setAdminNote(selectedOrder.adminNote || '');
    }
  }, [selectedOrder?.id]);

  const [openTicketsMap, setOpenTicketsMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch open tickets map for filtering
    const qOpenTickets = query(collection(db, 'tickets'), where('status', '!=', 'resolved'));
    const unsub = onSnapshot(qOpenTickets, (snap: any) => {
      const map: Record<string, boolean> = {};
      snap.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.orderId) map[data.orderId] = true;
      });
      setOpenTicketsMap(map);
    });
    return () => unsub();
  }, []);

  // Derived filtered data
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = [...orders];

    // Date Range Matcher
    if (dateRange !== 'All Time') {
      const now = new Date();
      result = result.filter(o => {
        if (!o.createdAt?.toDate) return false;
        const oDate = o.createdAt.toDate();
        if (dateRange === 'Today') {
          return oDate.toDateString() === now.toDateString();
        } else if (dateRange === 'Last 7 Days') {
          return (now.getTime() - oDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        } else if (dateRange === 'Last 30 Days') {
          return (now.getTime() - oDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        } else if (dateRange === 'This Month') {
          return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Status Filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Support Open') {
        result = result.filter(o => openTicketsMap[o.id]);
      } else {
        result = result.filter(o => mapLegacyStatus(o.status || 'Order Placed') === statusFilter);
      }
    }

    // Payment Filter
    if (paymentFilter !== 'All') {
      result = result.filter(o => {
        const pStatus = (o.payment?.status || o.paymentStatus || 'pending').toLowerCase();
        return pStatus === paymentFilter.toLowerCase();
      });
    }

    // Source Filter
    if (sourceFilter !== 'All') {
      result = result.filter(o => {
        const src = (o.orderSource || 'website').toLowerCase();
        return src === sourceFilter.toLowerCase();
      });
    }

    // Search Query
    if (searchQuery.trim() !== '') {
      const term = searchQuery.toLowerCase();
      result = result.filter(o => {
        const matchId = o.id?.toLowerCase().includes(term) || o.receiptNumber?.toLowerCase().includes(term);
        const matchName = (o as any).customerInfo?.name?.toLowerCase().includes(term) || o.shippingDetails?.name?.toLowerCase().includes(term);
        const matchPhone = (o as any).customerInfo?.phone?.toLowerCase().includes(term) || o.shippingDetails?.phone?.toLowerCase().includes(term);
        return matchId || matchName || matchPhone;
      });
    }
    
    // Default Sort (Newest first)
    result.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });

    return result;
  }, [orders, dateRange, statusFilter, paymentFilter, sourceFilter, searchQuery]);

  const handleStatusChange = async (order: any, status: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await orderService.updateOrderStatus(order.id, status as OrderStatus, auth.currentUser?.uid || 'Admin');
      toast.success(`Order status updated to ${status}`);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({...selectedOrder, status});
      }
    } catch (err) {
      console.error('Error updating state via select:', err);
      toast.error('Failed to update status');
    }
  };

  const handleSaveShippingDetails = async () => {
    if (!selectedOrder) return;
    setSavingShipping(true);
    try {
      const updatedShipment = { 
         ...selectedOrder.shipment, 
         ...shippingData,
         estimatedDeliveryAt: shippingData.estimatedDeliveryAt ? new Date(shippingData.estimatedDeliveryAt) : null
      };
      await orderService.updateShipment(selectedOrder.id, updatedShipment);
      setSelectedOrder({ ...selectedOrder, shipment: updatedShipment });
      toast.success('Shipping details saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save shipping details');
    }
    setSavingShipping(false);
  };

  const handleSaveNote = async () => {
    if (!selectedOrder) return;
    setSavingNote(true);
    try {
      await orderService.updateAdminNote(selectedOrder.id, adminNote);
      setSelectedOrder({ ...selectedOrder, adminNote });
      toast.success('Admin note saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save note');
    }
    setSavingNote(false);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-[#c5a059]/10 pb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8 text-[#c5a059]" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content">Sales & Orders</h1>
          </div>
          <p className="text-muted tracking-widest uppercase text-[10px]">
            Showing {filteredOrders.length} results
          </p>
        </div>
        
        <div className="flex bg-surface border border-[#c5a059]/30 items-center px-3 py-1.5 shrink-0 flex-1 sm:flex-none">
           <Calendar className="w-4 h-4 text-[#c5a059] mr-2" />
           <select 
             value={dateRange}
             onChange={e => setDateRange(e.target.value)}
             className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer py-1 w-full"
           >
             {DATE_RANGES.map(dr => <option key={dr} value={dr}>{dr}</option>)}
           </select>
        </div>
      </div>

      {/* FILTERS ROW */}
      <div className="flex flex-col xl:flex-row gap-4 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c5a059]" />
          <input 
            type="text" 
            placeholder="Search order #, customer, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface/50 border border-[#c5a059]/20 py-2.5 pl-9 pr-4 text-xs text-content focus:border-[#c5a059]/50 focus:outline-none placeholder-muted uppercase tracking-widest transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Order Status Filter */}
          <div className="flex items-center border border-[#c5a059]/20 bg-surface/50 pl-3 pr-1 py-1 shrink-0 group hover:border-[#c5a059]/40 transition-colors">
            <Filter className="w-4 h-4 text-[#c5a059]/50 group-hover:text-[#c5a059] mr-2 transition-colors flex-shrink-0" />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer py-1.5 w-full"
            >
              <option value="All">All Statuses</option>
              <option value="Support Open">Support Open</option>
              {ORDER_STATUSES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center border border-[#c5a059]/20 bg-surface/50 pl-3 pr-1 py-1 shrink-0 group hover:border-[#c5a059]/40 transition-colors">
            <CreditCard className="w-4 h-4 text-[#c5a059]/50 group-hover:text-[#c5a059] mr-2 transition-colors flex-shrink-0" />
            <select 
              value={paymentFilter} 
              onChange={e => setPaymentFilter(e.target.value)}
              className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer py-1.5 w-full"
            >
              <option value="All">All Payments</option>
              {['Pending', 'Confirmed', 'Failed', 'Refunded'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Source Filter */}
          <div className="col-span-2 md:col-span-1 flex items-center border border-[#c5a059]/20 bg-surface/50 pl-3 pr-1 py-1 shrink-0 group hover:border-[#c5a059]/40 transition-colors">
            <select 
              value={sourceFilter} 
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer py-1.5 w-full"
            >
              <option value="All">All Sources</option>
              <option value="website">Website</option>
              <option value="store">Store</option>
              <option value="admin_created">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* LIST CONTENT */}
      <div className="flex-1 overflow-y-auto block w-full pb-10">
        {loading ? (
          <div className="flex flex-col gap-4">
             {[1,2,3,4].map(k => (
                <Skeleton key={k} variant="rectangular" className="h-[80px]" />
             ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-muted border border-[#c5a059]/10 border-dashed bg-surface/30 flex flex-col items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-[#c5a059]/20 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest text-content mb-2">No Orders Found</p>
            <p className="text-xs uppercase tracking-widest">Adjust your filters to see more results.</p>
          </div>
        ) : (
          <div className="flex w-full flex-col mt-2">
            {/* Desktop Header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 p-4 text-[9px] uppercase tracking-[0.2em] font-bold text-muted border-b border-[#c5a059]/20 sticky top-0 bg-bg z-raised w-full mb-2">
              <div className="col-span-2">Order</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-2">Series / Product</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-2 text-center">Payment</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* List Body */}
            <div className="flex flex-col gap-4 lg:gap-2 relative w-full">
              {filteredOrders.map(order => {
                const mappedStatus = mapLegacyStatus(order.status || 'Order Placed');
                const validTransitions = ALLOWED_TRANSITIONS[mappedStatus] || [];
                const payStatus = order.payment?.status || order.paymentStatus || 'pending';
                const totalAmt = order.pricing?.total || order.totalPrice || (order as any).grandTotal || 0;
                
                return (
                  <Link 
                    key={order.id} 
                    to={`/admin/orders/${order.id}`}
                    className="group bg-surface/40 hover:bg-surface/80 border border-[#c5a059]/10 hover:border-[#c5a059]/30 transition-colors p-5 lg:p-4 flex flex-col lg:grid lg:grid-cols-12 gap-y-4 lg:gap-4 items-start lg:items-center cursor-pointer relative"
                  >
                    {isNewOrder(order.createdAt) && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#c5a059]" />
                    )}

                    {/* Order & Date */}
                    <div className="col-span-2 w-full flex justify-between lg:block">
                       <div>
                         <span className="text-sm md:text-xs font-bold font-mono text-content uppercase block mb-1 lg:mb-0">
                           {order.receiptNumber ? `#${order.receiptNumber}` : order.id.slice(0, 8)}
                         </span>
                         <span className="text-[10px] text-muted tracking-widest uppercase flex items-center">
                           <Clock className="w-3 h-3 mr-1 inline opacity-50" />
                           {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                         </span>
                       </div>
                       <div className="lg:hidden flex flex-col items-end gap-1">
                         <StatusBadge status={mappedStatus} type="order" />
                         <span className="text-[9px] uppercase tracking-widest text-muted">{order.orderSource || 'website'}</span>
                       </div>
                    </div>

                    {/* Customer */}
                    <div className="col-span-2 w-full">
                       <span className="text-xs text-content font-bold uppercase tracking-widest block truncate">
                          {order.shippingDetails?.name || (order as any).customerInfo?.name || 'Unknown'}
                       </span>
                       <span className="text-[10px] text-muted tracking-widest uppercase truncate block mt-1">
                          {order.shippingDetails?.city}{order.shippingDetails?.state ? `, ${order.shippingDetails.state}` : ''}
                       </span>
                    </div>

                    {/* Products */}
                    <div className="col-span-2 w-full">
                       <span className="text-xs text-content/80 flex items-center truncate max-w-full lg:max-w-[150px] xl:max-w-[200px] mb-1">
                          <Box className="w-3 h-3 mr-1.5 inline text-[#c5a059]/50 flex-shrink-0" />
                          <span className="truncate">{order.items?.map((i: any) => i.productName || i.product?.name).join(', ') || 'No items'}</span>
                       </span>
                       <span className="text-[9px] text-muted uppercase tracking-widest font-bold">
                          {order.items?.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0) || 0} Items
                       </span>
                    </div>

                    {/* Amount */}
                    <div className="col-span-1 w-full lg:text-right flex items-center lg:block">
                       <span className="lg:hidden text-[10px] text-muted uppercase tracking-widest font-bold mr-2">Total:</span>
                       <span className="text-xs font-bold text-premium-gold-text font-mono">
                         ₹{totalAmt.toLocaleString('en-IN')}
                       </span>
                    </div>

                    {/* Payment Status (Hidden on mobile inline, visible block) */}
                    <div className="col-span-2 w-full flex items-center lg:justify-center mt-0">
                       <span className="lg:hidden text-[10px] text-muted uppercase tracking-widest font-bold mr-2 w-10">Pay:</span>
                       <StatusBadge status={payStatus} type="payment" />
                    </div>

                    {/* Order Status */}
                    <div className="col-span-2 w-full hidden lg:flex flex-col items-center justify-center">
                       <StatusBadge status={mappedStatus} type="order" />
                       <span className="text-[8px] uppercase tracking-widest text-[#c5a059]/50 mt-1.5">{order.orderSource || 'website'}</span>
                    </div>

                    {/* Actions Menu */}
                    <div className="col-span-1 w-full flex lg:justify-end border-t border-[#c5a059]/10 pt-4 lg:pt-0 lg:border-0 mt-2 lg:mt-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2 w-full lg:w-auto" onClick={e => e.stopPropagation()}>
                        <select
                          value={mappedStatus}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className="w-full lg:w-auto bg-bg text-[9px] font-bold uppercase tracking-widest p-1.5 focus:outline-none focus:border-[#c5a059] border border-[#c5a059]/30 text-content cursor-pointer"
                        >
                          {!validTransitions.includes(mappedStatus) && (
                            <option value={mappedStatus} disabled>{mappedStatus}</option>
                          )}
                          {validTransitions.map((s: string) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className="px-2 border border-[#c5a059]/30 hover:bg-[#c5a059]/10 text-content transition-colors bg-bg hidden lg:flex items-center justify-center">
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DRAWER PANEL */}
      <AnimatePresence>
        {selectedOrder && (
           <div className="fixed inset-0 z-modal flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-bg/90" onClick={() => setSelectedOrder(null)}></motion.div>
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.3, ease: 'easeOut' }} className="relative w-full max-w-lg bg-surface border-l border-[#c5a059]/20 shadow-2xl h-full flex flex-col">
                 <div className="flex items-center justify-between p-6 border-b border-[#c5a059]/10 shrink-0 bg-bg">
                    <div>
                      <h2 className="text-xl font-bold tracking-[0.1em] uppercase text-content">Order Details</h2>
                      <p className="text-xs text-muted tracking-widest font-mono uppercase mt-1 flex items-center gap-2">
                        #{selectedOrder.receiptNumber || selectedOrder.id}
                        <span className="w-1 h-1 bg-[#c5a059] rounded-full"></span>
                        {selectedOrder.createdAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
                      </p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="text-muted hover:text-[#c5a059] transition-colors p-2 bg-surface/50 border border-[#c5a059]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]">
                       <X className="w-5 h-5" />
                    </button>
                 </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth pb-[100px]">

                  {/* Status Badges Header */}
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                     <StatusBadge status={mapLegacyStatus(selectedOrder.status || 'Order Placed')} type="order" />
                     <StatusBadge status={selectedOrder.payment?.status || selectedOrder.paymentStatus || 'pending'} type="payment" />
                     <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-1 border border-[#c5a059]/20 bg-surface/50 flex-shrink-0 flex items-center">
                       <span className="opacity-50 mr-1">SRC:</span> {selectedOrder.orderSource || 'website'}
                     </span>
                  </div>

                  {/* Items */}
                  <div>
                     <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted mb-4 border-b border-[#c5a059]/10 pb-2">Purchased Items</h3>
                     <div className="space-y-4">
                        {selectedOrder.items?.map((item: any, i: number) => {
                           const uPrice = item.unitPrice ?? item.price;
                           return (
                           <div key={i} className="flex gap-4 p-4 bg-bg border border-[#c5a059]/10 hover:border-[#c5a059]/30 transition-colors">
                              <div className="w-16 h-20 bg-surface/50 border border-[#c5a059]/20 flex shrink-0 items-center justify-center relative overflow-hidden">
                                 {item.product?.imageUrl ? (
                                    <LazyImage src={item.product.imageUrl || ''} alt="img" className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" />
                                 ): (
                                    <ShoppingBag className="w-6 h-6 text-[#c5a059]/30" />
                                 )}
                              </div>
                              <div className="flex-1">
                                 <h4 className="text-sm font-bold uppercase tracking-wider text-content">{item.productName || item.product?.name || `Item ${i+1}`}</h4>
                                 <p className="text-[10px] text-muted tracking-widest mt-1">QTY: {item.quantity || 1} • <span className="font-mono">₹{uPrice?.toLocaleString('en-IN')}</span> ea</p>
                                 
                                 {item.selections && item.selections.length > 0 ? (
                                    <div className="mt-3 space-y-1.5 bg-surface p-2 border border-[#c5a059]/5">
                                       {item.selections.map((opt: any, idx: number) => (
                                          <p key={idx} className="text-[10px] text-content/80 flex justify-between">
                                             <span className="font-bold text-muted uppercase tracking-widest mr-2">{opt.groupLabel || opt.name}:</span> 
                                             <span className="text-right">
                                               {opt.optionLabel} {opt.priceDelta ? <span className="text-[#c5a059] font-mono">(+₹{opt.priceDelta.toLocaleString('en-IN')})</span> : ''}
                                             </span>
                                          </p>
                                       ))}
                                    </div>
                                 ) : item.customizations && (
                                    <div className="mt-3 space-y-1.5 bg-surface p-2 border border-[#c5a059]/5 flex flex-col">
                                       {Object.entries(item.customizations).map(([k, v]: [string, any], idx: number) => {
                                          if (k === '_qty') return null;
                                          return (
                                            <p key={idx} className="text-[10px] text-content/80 flex justify-between border-b border-[#c5a059]/5 pb-1 last:border-0 last:pb-0">
                                               <span className="font-bold mr-2 text-muted uppercase tracking-widest">{k}:</span> 
                                               <span className="text-right">{v as string}</span>
                                            </p>
                                          )
                                       })}
                                    </div>
                                 )}
                              </div>
                           </div>
                        )})}
                     </div>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="border border-[#c5a059]/10 bg-bg p-4 sticky top-0 z-raised shadow-lg">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-3">Order Total</p>
                    {selectedOrder.pricing?.baseSubtotal && (
                      <div className="flex justify-between items-center text-[10px] mb-2 tracking-widest uppercase">
                        <span className="text-muted">Subtotal</span>
                        <span className="text-content font-mono">₹{selectedOrder.pricing.baseSubtotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {(selectedOrder.pricing?.customizationTotal > 0) && (
                      <div className="flex justify-between items-center text-[10px] mb-2 tracking-widest uppercase">
                        <span className="text-muted">Customizations</span>
                        <span className="text-content font-mono">₹{selectedOrder.pricing.customizationTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {(selectedOrder.pricing?.discountsApplied?.length > 0) && selectedOrder.pricing.discountsApplied.map((d: any, i: number) => (
                       <div key={i} className="flex justify-between items-center text-[10px] mb-2 tracking-widest uppercase text-green-500">
                         <span>{d.label}</span>
                         <span className="font-mono">-₹{d.amount.toLocaleString('en-IN')}</span>
                       </div>
                    ))}
                    <div className="border-t border-[#c5a059]/10 pt-3 mt-1 flex justify-between items-center bg-bg">
                       <span className="uppercase text-[10px] tracking-widest font-bold text-muted">Grand Total</span>
                       <span className="text-lg font-bold text-[#c5a059] font-mono">
                         ₹{(selectedOrder.pricing?.total || selectedOrder.totalPrice || selectedOrder.grandTotal || 0).toLocaleString('en-IN')}
                       </span>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <PaymentPanel order={selectedOrder} onUpdate={(newOrder) => setSelectedOrder(newOrder)} />

                  {/* Customer Info */}
                  <div>
                     <div className="flex items-center justify-between border-b border-[#c5a059]/10 pb-2 mb-4">
                       <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted">Customer & Shipping</h3>
                       {selectedOrder.userId && (
                         <Link to={`/admin/customers/${selectedOrder.userId}`} className="text-[9px] uppercase tracking-widest text-[#c5a059] hover:underline flex items-center">
                           View Customer <ChevronRight className="w-3 h-3 ml-1" />
                         </Link>
                       )}
                     </div>
                     <div className="space-y-3 p-4 bg-bg border border-[#c5a059]/10">
                        <p className="font-bold text-content uppercase text-sm tracking-widest">
                          {selectedOrder.shippingDetails?.name || selectedOrder.customer?.name}
                        </p>
                        <p className="text-xs text-content/80 leading-relaxed font-mono">
                           {selectedOrder.shippingDetails?.address}<br/>
                           {selectedOrder.shippingDetails?.city}{selectedOrder.shippingDetails?.state ? `, ${selectedOrder.shippingDetails.state}` : ''} {selectedOrder.shippingDetails?.postalCode || selectedOrder.shippingDetails?.pincode}<br/>
                           {selectedOrder.shippingDetails?.country || 'India'}
                        </p>
                        
                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#c5a059]/10">
                           <a href={`mailto:${selectedOrder.shippingDetails?.email || selectedOrder.customer?.email}`} className="flex items-center text-[10px] text-premium-gold-text hover:underline tracking-wider uppercase bg-surface/50 p-2 border border-transparent hover:border-[#c5a059]/20 transition-colors">
                              <Mail className="w-3.5 h-3.5 mr-2" />
                              {selectedOrder.shippingDetails?.email || selectedOrder.customer?.email}
                           </a>
                           <a href={`tel:${selectedOrder.shippingDetails?.phone || selectedOrder.customer?.phone}`} className="flex items-center text-[10px] text-premium-gold-text hover:underline tracking-wider uppercase bg-surface/50 p-2 border border-transparent hover:border-[#c5a059]/20 transition-colors">
                              <Phone className="w-3.5 h-3.5 mr-2" />
                              {selectedOrder.shippingDetails?.phone || selectedOrder.customer?.phone}
                           </a>
                           <a 
                              href={`https://wa.me/${(selectedOrder.shippingDetails?.phone || selectedOrder.customer?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedOrder.shippingDetails?.name?.split(' ')[0] || ''},\n\nFollowing up regarding your Grainood order ${selectedOrder.receiptNumber || selectedOrder.id}.\n\n`)}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="mt-2 flex items-center bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 p-2.5 justify-center uppercase tracking-widest text-[10px] font-bold hover:bg-[#c5a059]/20 transition-colors"
                           >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Message on WhatsApp
                           </a>
                        </div>
                     </div>
                  </div>

                  {/* Fulfillment / Logistics Panel */}
                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted mb-4 border-b border-[#c5a059]/10 pb-2">Logistics / Tracking</h3>
                    <div className="bg-bg border border-[#c5a059]/10 p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">Courier Partner</label>
                           <input 
                              type="text" 
                              value={shippingData.courierName}
                              onChange={(e) => setShippingData({...shippingData, courierName: e.target.value})}
                              placeholder="e.g. Bluedart"
                              className="w-full bg-surface/50 border border-[#c5a059]/20 p-2 text-xs focus:border-[#c5a059] focus:outline-none transition-colors"
                           />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">Tracking Number</label>
                           <input 
                              type="text" 
                              value={shippingData.trackingNumber}
                              onChange={(e) => setShippingData({...shippingData, trackingNumber: e.target.value})}
                              className="w-full bg-surface/50 border border-[#c5a059]/20 p-2 text-xs focus:border-[#c5a059] focus:outline-none transition-colors"
                           />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">Tracking URL</label>
                           <input 
                              type="text" 
                              value={shippingData.trackingUrl}
                              onChange={(e) => setShippingData({...shippingData, trackingUrl: e.target.value})}
                              placeholder="https://..."
                              className="w-full bg-surface/50 border border-[#c5a059]/20 p-2 text-xs focus:border-[#c5a059] focus:outline-none transition-colors"
                           />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">Est. Delivery Date</label>
                           <input 
                              type="date"
                              value={shippingData.estimatedDeliveryAt}
                              onChange={(e) => setShippingData({...shippingData, estimatedDeliveryAt: e.target.value})}
                              className="w-full bg-surface/50 border border-[#c5a059]/20 p-2 text-[10px] uppercase tracking-widest focus:border-[#c5a059] focus:outline-none text-content transition-colors"
                           />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-[#c5a059]/10">
                         <GoldButton onClick={handleSaveShippingDetails} disabled={savingShipping} variant="outline" className="text-[10px] py-1.5 px-3 uppercase border-[#c5a059]/30 hover:border-[#c5a059]">
                            {savingShipping ? 'Saving...' : 'Save Logistics'}
                         </GoldButton>
                      </div>

                      <div className="pt-4 border-t border-[#c5a059]/10 flex flex-col sm:flex-row gap-2 sm:gap-3">
                         <button 
                            onClick={async () => {
                               if (!shippingData.trackingNumber) return toast.error('Tracking number is required to mark as shipped');
                               await handleSaveShippingDetails();
                               await orderService.updateShipment(selectedOrder.id, { ...shippingData, shippedAt: new Date() });
                               await handleStatusChange(selectedOrder, 'Shipped');
                               setSelectedOrder({...selectedOrder, shipment: { ...selectedOrder.shipment, ...shippingData, shippedAt: new Date() }, status: 'Shipped'});
                            }}
                            disabled={!ALLOWED_TRANSITIONS[mapLegacyStatus(selectedOrder.status as OrderStatus || 'Order Placed')]?.includes('Shipped')}
                            className="flex-1 text-[10px] uppercase tracking-widest border border-cyan-500/30 text-cyan-500 p-2.5 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-center"
                         >
                            Mark Shipped
                         </button>
                         <button
                            onClick={async () => {
                               await orderService.updateShipment(selectedOrder.id, { ...shippingData, deliveredAt: new Date() });
                               await handleStatusChange(selectedOrder, 'Delivered');
                               setSelectedOrder({...selectedOrder, shipment: { ...selectedOrder.shipment, ...shippingData, deliveredAt: new Date() }, status: 'Delivered'});
                            }}
                            disabled={!ALLOWED_TRANSITIONS[mapLegacyStatus(selectedOrder.status as OrderStatus || 'Order Placed')]?.includes('Delivered')}
                            className="flex-1 text-[10px] uppercase tracking-widest border border-green-500/30 text-green-500 p-2.5 hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-center"
                         >
                            Mark Delivered
                         </button>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                     <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted mb-4 border-b border-[#c5a059]/10 pb-2">Admin Note (Internal)</h3>
                     <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Add private notes about this order..."
                        rows={4}
                        className="w-full bg-bg border border-[#c5a059]/20 p-4 text-xs focus:outline-none focus:border-[#c5a059] transition-colors resize-none mb-3"
                     />
                     <GoldButton 
                        onClick={handleSaveNote} 
                        disabled={savingNote} 
                        className="w-full flex items-center justify-center gap-2 mb-3"
                        variant="outline"
                     >
                        <Save className="w-4 h-4" />
                        {savingNote ? 'Saving...' : 'Save Note'}
                     </GoldButton>
                  </div>

                  {/* Support & Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-base">
                     {/* Support Link */}
                     <div>
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted mb-4 border-b border-[#c5a059]/10 pb-2">Support Requests</h3>
                        {selectedOrder.supportRequestIds && selectedOrder.supportRequestIds.length > 0 ? (
                           <div className="space-y-2">
                             {selectedOrder.supportRequestIds.map((id: string) => (
                               <Link key={id} to={`/admin/support?search=${id}`} className="block text-[10px] uppercase tracking-widest text-[#c5a059] hover:underline bg-surface/50 p-2 border border-[#c5a059]/20">
                                 View Ticket #{id.slice(0,6)}
                               </Link>
                             ))}
                           </div>
                        ) : (
                           <p className="text-[10px] uppercase tracking-widest text-muted">No support tickets linked.</p>
                        )}
                     </div>

                     {/* Timeline */}
                     <div>
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted mb-4 border-b border-[#c5a059]/10 pb-2">Activity Timeline</h3>
                        {selectedOrder.timeline && selectedOrder.timeline.length > 0 ? (
                           <div className="space-y-4 border-l border-[#c5a059]/20 pl-3 ml-2 relative">
                             {selectedOrder.timeline.map((event: any, idx: number) => (
                               <div key={idx} className="relative">
                                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-[#c5a059]"></div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-content">{event.status}</p>
                                  <p className="text-[9px] uppercase tracking-widest text-muted mt-0.5">
                                    {event.timestamp?.toDate?.().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {event.changedBy}
                                  </p>
                                  {event.note && <p className="text-xs text-content/80 mt-1 italic">"{event.note}"</p>}
                               </div>
                             ))}
                           </div>
                        ) : (
                           <p className="text-[10px] uppercase tracking-widest text-muted">No timeline data available.</p>
                        )}
                     </div>
                  </div>

               </div>
               
               {/* Quick Bottom Action Bar in Drawer */}
               <div className="absolute flex flex-col md:flex-row gap-2 bottom-0 left-0 w-full p-4 border-t border-[#c5a059]/20 bg-[#141414] shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-sticky-section">
                 <button 
                    onClick={() => handleStatusChange(selectedOrder, 'Processing')}
                    disabled={!ALLOWED_TRANSITIONS[mapLegacyStatus(selectedOrder.status as OrderStatus || 'Order Placed')]?.includes('Processing')}
                    className="w-full md:flex-1 text-[10px] font-bold uppercase tracking-widest border border-purple-500/50 text-purple-500 p-3 hover:bg-purple-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    Move to Processing
                 </button>
                 {ALLOWED_TRANSITIONS[mapLegacyStatus(selectedOrder.status || 'Order Placed') as OrderStatus]?.includes('Cancelled') && (
                     <button 
                        onClick={() => handleStatusChange(selectedOrder, 'Cancelled')}
                        className="w-full md:w-auto text-[10px] font-bold uppercase tracking-widest border border-red-500/50 text-red-500 p-3 hover:bg-red-500/10 transition-colors"
                     >
                        Cancel Order
                     </button>
                 )}
               </div>
            </motion.div>
         </div>
        )}
      </AnimatePresence>
    </div>
  );
}
