import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { RevealSection } from './Reveal';
import { clsx } from 'clsx';
import { useUserOrders } from '../features/orders/hooks/useOrders';
import { Skeleton } from './Skeleton';
import { PackageOpen, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { mapLegacyStatus, stageIndex, STAGE_LABELS, STATUS_COLORS } from '../lib/orderStatus';

type Tab = 'active' | 'past';

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function toDate(v: any): Date {
  if (v?.toDate) return v.toDate();
  return v ? new Date(v) : new Date();
}

/** Slim 4-step tracker for in-progress orders. */
function MiniTracker({ status }: { status: string }) {
  const s = stageIndex(status);
  return (
    <div className="flex items-center gap-1.5 mt-3">
      {STAGE_LABELS.map((label, i) => {
        const done = s >= 0 && i <= s;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <span className={clsx('w-1.5 h-1.5 rounded-full', done ? 'bg-[#c5a059]' : 'bg-line')} />
              <span className={clsx('text-[8px] uppercase tracking-widest hidden sm:inline', done ? 'text-content/80' : 'text-muted/50')}>{label}</span>
            </div>
            {i < STAGE_LABELS.length - 1 && <span className={clsx('w-3 sm:w-5 h-px', i < s ? 'bg-[#c5a059]' : 'bg-line')} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function OrderCard({ order, idx }: { order: any; idx: number }) {
  const mapped = mapLegacyStatus(order.status || 'Processing');
  const color = STATUS_COLORS[mapped];
  const cancelled = mapped === 'Cancelled';
  const delivered = mapped === 'Delivered';
  const awaiting = mapped === 'Awaiting Payment';
  const dateStr = toDate(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const firstItem = order.items?.[0];
  const imageUrl = firstItem?.product?.imageUrl || firstItem?.image || '/product-bat.webp';
  const firstItemName = firstItem?.productName || firstItem?.product?.name || 'Bespoke Bat';
  const more = order.items && order.items.length > 1 ? order.items.length - 1 : 0;
  const title = more > 0 ? `${firstItemName} + ${more} more` : firstItemName;
  const total = order.totalPrice ?? order.pricing?.total ?? 0;

  return (
    <RevealSection delay={idx * 50}>
      <Link
        to={`/my-orders/${order.id}`}
        className="group block rounded-2xl border border-[#c5a059]/20 hover:border-[#c5a059]/60 p-4 md:p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_-12px_rgba(197,160,89,0.35)]"
      >
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-16 h-20 md:w-20 md:h-24 shrink-0 flex items-center justify-center rounded-xl border border-[#c5a059]/15 p-1.5">
            <LazyImage src={imageUrl} alt={firstItemName} containerClassName="h-full bg-transparent" className="w-auto h-full object-contain group-hover:scale-105 transition-transform duration-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-content text-sm md:text-base tracking-wide uppercase truncate">{title}</h3>
              <span className="text-[#c5a059] font-bold text-sm md:text-base whitespace-nowrap">{inr(total)}</span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
              <span className="tracking-widest uppercase">No. {order.receiptNumber || order.id.slice(-6)}</span>
              <span className="text-line">•</span>
              <span>{dateStr}</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] px-2.5 py-1 uppercase tracking-widest border font-bold rounded-sm"
                style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}>
                {cancelled ? <XCircle size={11} /> : delivered ? <CheckCircle2 size={11} /> : null}
                {mapped}
              </span>
            </div>

            {cancelled ? (
              order.cancellation?.reason && <p className="text-[11px] text-muted mt-2 line-clamp-1">Cancelled: {order.cancellation.reason}</p>
            ) : awaiting ? (
              <p className="text-[11px] text-amber-500 mt-2">Payment not completed — please reorder to pay securely.</p>
            ) : !delivered ? (
              <MiniTracker status={order.status} />
            ) : null}
          </div>

          <ChevronRight className="w-5 h-5 text-muted group-hover:text-[#c5a059] transition-colors shrink-0" />
        </div>
      </Link>
    </RevealSection>
  );
}

export function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { orders, loading: loadingOrders } = useUserOrders(user?.uid || undefined);
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => { document.title = 'My Orders — Grainood'; }, []);
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/my-orders' }, replace: true });
  }, [user, authLoading, navigate]);

  const { active, past } = useMemo(() => {
    const active: any[] = [], past: any[] = [];
    for (const o of orders) {
      const m = mapLegacyStatus(o.status || 'Processing');
      (m === 'Delivered' || m === 'Cancelled' ? past : active).push(o);
    }
    return { active, past };
  }, [orders]);

  if (authLoading || !user) return null;

  const list = tab === 'active' ? active : past;

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-8 text-center md:text-left">My Orders</h1>
        </RevealSection>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[#c5a059]/15 mb-8">
          {(['active', 'past'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx('relative pb-3 text-[11px] font-bold uppercase tracking-widest transition-colors',
                tab === t ? 'text-[#c5a059]' : 'text-muted hover:text-content')}
            >
              {t === 'active' ? 'Active' : 'Past'}
              <span className={clsx('ml-1.5 text-[10px]', tab === t ? 'text-[#c5a059]/70' : 'text-muted/60')}>
                {t === 'active' ? active.length : past.length}
              </span>
              {tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#c5a059]" />}
            </button>
          ))}
        </div>

        {loadingOrders ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="rectangular" className="h-[112px] w-full rounded-2xl" />)}
          </div>
        ) : list.length === 0 ? (
          <RevealSection delay={100}>
            <div className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-2xl border border-[#c5a059]/15">
              <div className="w-16 h-16 rounded-full border border-[#c5a059]/25 flex items-center justify-center mb-6">
                <PackageOpen size={28} className="text-muted" />
              </div>
              <h2 className="text-lg font-bold tracking-widest uppercase text-content mb-2">
                {tab === 'active' ? 'No active orders' : 'No past orders'}
              </h2>
              <p className="text-muted text-sm max-w-sm mb-8">
                {tab === 'active' ? 'Orders being crafted or on their way will appear here.' : 'Delivered and cancelled orders will appear here.'}
              </p>
              <Link to="/collection" className="bg-[#c5a059] text-bg px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#d4b271] transition-colors rounded-sm">
                Explore Collection
              </Link>
            </div>
          </RevealSection>
        ) : (
          <div className="space-y-4">
            {list.map((order, idx) => <OrderCard key={order.id} order={order} idx={idx} />)}
          </div>
        )}
      </div>
    </div>
  );
}
