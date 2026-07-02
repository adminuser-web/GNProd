import React, { useEffect, useState, useMemo } from 'react';
import { ticketService } from '../../features/support/services/ticketService';
import { clsx } from 'clsx';
import { Skeleton } from '../Skeleton';
import { ShoppingBag, Search, Filter, CreditCard, Calendar } from 'lucide-react';

import { ORDER_STATUSES, OrderStatus, mapLegacyStatus, STATUS_COLORS } from '../../lib/orderStatus';
import { useAllOrders } from '../../features/orders/hooks/useOrders';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, EmptyState, Segmented } from './ui';

const DATE_RANGES = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month'];

/** Timestamps are ISO strings now; tolerate legacy Firestore shapes. */
function toTime(v: any): number {
  if (!v) return NaN;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v?.toDate) return v.toDate().getTime();
  if (v?.seconds) return v.seconds * 1000;
  return NaN;
}

function isNewOrder(createdAt: any) {
  const t = toTime(createdAt);
  return !Number.isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000;
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status as OrderStatus] || '#c5a059';
  return (
    <span
      className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 border rounded-sm whitespace-nowrap"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
    >
      {status}
    </span>
  );
}

/**
 * Payment is implied by the lifecycle (Awaiting Payment = unpaid, everything
 * after = paid via Razorpay), so it only gets surfaced when it's unusual.
 */
function paymentHint(order: any, mapped: string): { label: string; cls: string } | null {
  const p = (order.payment?.status || order.paymentStatus || 'pending').toLowerCase();
  if (p === 'refunded' || order.refund?.status) return { label: 'Refunded', cls: 'text-red-400' };
  if (p === 'failed') return { label: 'Payment failed', cls: 'text-red-400' };
  if (p !== 'confirmed' && mapped !== 'Awaiting Payment' && mapped !== 'Cancelled') return { label: 'Unpaid', cls: 'text-amber-500' };
  return null;
}

function FilterSelect({ icon: Icon, value, onChange, children }: { icon?: any; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center border border-line bg-surface/50 pl-2.5 pr-1 rounded-sm group hover:border-[#c5a059]/40 transition-colors">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#c5a059]/50 group-hover:text-[#c5a059] mr-1.5 shrink-0 transition-colors" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer py-2 w-full"
      >
        {children}
      </select>
    </div>
  );
}

function OrderRow({ order }: { order: any }) {
  const mapped = mapLegacyStatus(order.status || 'Order Placed');
  const totalAmt = order.pricing?.total || order.totalPrice || (order as any).grandTotal || 0;
  const t = toTime(order.createdAt);
  const dateStr = !Number.isNaN(t) ? new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
  const orderNo = order.receiptNumber ? `#${order.receiptNumber}` : order.id.slice(0, 8);
  const name = order.shippingDetails?.name || (order as any).customerInfo?.name || 'Unknown';
  const place = [order.shippingDetails?.city, order.shippingDetails?.state].filter(Boolean).join(', ');
  const itemNames = order.items?.map((i: any) => i.productName || i.product?.name).filter(Boolean).join(', ') || 'No items';
  const qty = order.items?.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0) || 0;
  const hint = paymentHint(order, mapped);
  const source = (order.orderSource || 'website').toLowerCase();
  const sourceLabel = source === 'admin_created' ? 'admin' : source;

  return (
    <Link to={`/admin/orders/${order.id}`} className="relative block px-4 py-2.5 hover:bg-[#c5a059]/[0.04] transition-colors">
      {isNewOrder(order.createdAt) && <span aria-hidden className="absolute left-0 top-0 h-full w-0.5 bg-[#c5a059]" />}

      {/* Desktop row */}
      <div className="hidden lg:grid grid-cols-12 gap-3 items-center">
        <div className="col-span-2 leading-tight">
          <span className="block text-xs font-bold font-mono text-content">{orderNo}</span>
          <span className="block text-[10px] text-muted mt-0.5">
            {dateStr}
            {source !== 'website' && <span className="uppercase tracking-widest text-[#c5a059]/60"> · {sourceLabel}</span>}
          </span>
        </div>
        <div className="col-span-3 leading-tight min-w-0">
          <span className="block text-xs font-bold text-content uppercase tracking-wide truncate">{name}</span>
          {place && <span className="block text-[10px] text-muted truncate mt-0.5">{place}</span>}
        </div>
        <div className="col-span-3 leading-tight min-w-0">
          <span className="block text-xs text-content/80 truncate">{itemNames}</span>
          {qty > 1 && <span className="block text-[10px] text-muted mt-0.5">{qty} items</span>}
        </div>
        <div className="col-span-2 text-right">
          <span className="text-xs font-bold font-mono text-premium-gold-text">₹{totalAmt.toLocaleString('en-IN')}</span>
        </div>
        <div className="col-span-2 flex flex-col items-end gap-0.5">
          <StatusBadge status={mapped} />
          {hint && <span className={clsx('text-[9px] uppercase tracking-widest font-bold', hint.cls)}>{hint.label}</span>}
        </div>
      </div>

      {/* Mobile card */}
      <div className="lg:hidden space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold font-mono text-content">{orderNo}</span>
          <StatusBadge status={mapped} />
        </div>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-xs text-content uppercase tracking-wide truncate">{name}</span>
          <span className="text-xs font-bold font-mono text-premium-gold-text shrink-0">₹{totalAmt.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-[10px] text-muted truncate">{itemNames}{qty > 1 ? ` · ${qty} items` : ''}</span>
          <span className="text-[10px] text-muted shrink-0">
            {dateStr}
            {source !== 'website' && <span className="uppercase tracking-widest text-[#c5a059]/60"> · {sourceLabel}</span>}
          </span>
        </div>
        {hint && <span className={clsx('block text-[9px] uppercase tracking-widest font-bold', hint.cls)}>{hint.label}</span>}
      </div>
    </Link>
  );
}

export function AdminOrdersBoard() {
  const { orders, loading } = useAllOrders();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'All');
  const [paymentFilter, setPaymentFilter] = useState<string>(
    searchParams.get('payment') === 'pending' ? 'Pending' : 'All'
  );
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [view, setView] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [dateRange, setDateRange] = useState<string>('All Time');

  useEffect(() => {
    document.title = 'Sales & Orders — Admin';
  }, []);

  const [openTicketsMap, setOpenTicketsMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Map of orderId -> true for orders with an active (non-resolved) ticket.
    ticketService.getActiveOrderIds().then(setOpenTicketsMap);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = [...orders];

    // View: Active (in-progress) / Completed (delivered) / Cancelled.
    if (view === 'active') {
      result = result.filter(o => {
        const m = mapLegacyStatus(o.status || 'Processing');
        return m !== 'Cancelled' && m !== 'Delivered';
      });
    } else if (view === 'completed') {
      result = result.filter(o => mapLegacyStatus(o.status || 'Processing') === 'Delivered');
    } else if (view === 'cancelled') {
      result = result.filter(o => mapLegacyStatus(o.status || 'Processing') === 'Cancelled');
    }

    // Date Range Matcher
    if (dateRange !== 'All Time') {
      const now = new Date();
      result = result.filter(o => {
        const t = toTime(o.createdAt);
        if (Number.isNaN(t)) return false;
        const oDate = new Date(t);
        if (dateRange === 'Today') {
          return oDate.toDateString() === now.toDateString();
        } else if (dateRange === 'Last 7 Days') {
          return (now.getTime() - t) <= 7 * 24 * 60 * 60 * 1000;
        } else if (dateRange === 'Last 30 Days') {
          return (now.getTime() - t) <= 30 * 24 * 60 * 60 * 1000;
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
      const timeA = toTime(a.createdAt) || 0;
      const timeB = toTime(b.createdAt) || 0;
      return timeB - timeA;
    });

    return result;
  }, [orders, view, dateRange, statusFilter, paymentFilter, sourceFilter, searchQuery, openTicketsMap]);

  const counts = useMemo(() => {
    let active = 0, completed = 0, cancelled = 0;
    for (const o of orders || []) {
      const m = mapLegacyStatus(o.status || 'Processing');
      if (m === 'Cancelled') cancelled++;
      else if (m === 'Delivered') completed++;
      else active++;
    }
    return { active, completed, cancelled };
  }, [orders]);

  return (
    <div className="w-full h-full flex flex-col gap-4">

      {/* HEADER */}
      <div className="shrink-0">
        <PageHeader
          eyebrow="Commerce"
          title="Sales & Orders"
          description={`Showing ${filteredOrders.length} ${filteredOrders.length === 1 ? 'result' : 'results'}`}
          actions={
            <div className="flex bg-surface border border-line items-center px-3 py-1.5 rounded-sm">
              <Calendar className="w-4 h-4 text-[#c5a059] mr-2 shrink-0" />
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer py-1"
              >
                {DATE_RANGES.map(dr => <option key={dr} value={dr}>{dr}</option>)}
              </select>
            </div>
          }
        />
      </div>

      {/* TABS + FILTERS (single row on desktop) */}
      <div className="shrink-0 flex flex-col xl:flex-row xl:items-center gap-3">
        <Segmented<'active' | 'completed' | 'cancelled'>
          value={view}
          onChange={setView}
          options={[
            { value: 'active', label: `Active${counts.active ? ` (${counts.active})` : ''}` },
            { value: 'completed', label: `Completed${counts.completed ? ` (${counts.completed})` : ''}` },
            { value: 'cancelled', label: `Cancelled${counts.cancelled ? ` (${counts.cancelled})` : ''}` },
          ]}
        />

        <div className="flex-1 flex flex-col md:flex-row gap-3 xl:justify-end">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c5a059]" />
            <input
              type="text"
              placeholder="Order #, customer, phone…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface/50 border border-line py-2 pl-9 pr-3 text-[10px] text-content focus:border-[#c5a059]/50 focus:outline-none placeholder-muted uppercase tracking-widest transition-colors rounded-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <FilterSelect icon={Filter} value={statusFilter} onChange={setStatusFilter}>
              <option value="All">All Statuses</option>
              <option value="Support Open">Support Open</option>
              {ORDER_STATUSES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </FilterSelect>
            <FilterSelect icon={CreditCard} value={paymentFilter} onChange={setPaymentFilter}>
              <option value="All">All Payments</option>
              {['Pending', 'Confirmed', 'Failed', 'Refunded'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </FilterSelect>
            <FilterSelect value={sourceFilter} onChange={setSourceFilter}>
              <option value="All">All Sources</option>
              <option value="website">Website</option>
              <option value="store">Store</option>
              <option value="admin_created">Admin</option>
            </FilterSelect>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto pb-10">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5, 6].map(k => (
              <Skeleton key={k} variant="rectangular" className="h-12" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="border border-line border-dashed bg-surface/30 rounded-xl">
            <EmptyState icon={ShoppingBag} title="No orders found" description="Adjust your search or filters to see more results." />
          </div>
        ) : (
          <div className="rounded-xl border border-line overflow-hidden">
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] font-bold text-muted bg-bg border-b border-line sticky top-0 z-raised">
              <div className="col-span-2">Order</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-3">Product</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            <div className="divide-y divide-line">
              {filteredOrders.map(order => <OrderRow key={order.id} order={order} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
