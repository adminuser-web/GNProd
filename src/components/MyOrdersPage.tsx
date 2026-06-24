import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { RevealSection } from './Reveal';
import { clsx } from 'clsx';
import { useUserOrders } from '../features/orders/hooks/useOrders';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { AlertTriangle, PackageOpen, ChevronRight } from 'lucide-react';
import { LazyImage } from './LazyImage';

export function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, loading: loadingOrders } = useUserOrders(user?.uid || undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "My Orders — Grainood";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/my-orders' }, replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-content mb-12 text-center md:text-left capitalize">My Orders</h1>
        </RevealSection>

        {loadingOrders ? (
          <div className="space-y-4">
            <Skeleton variant="rectangular" className="h-[120px] w-full" />
            <Skeleton variant="rectangular" className="h-[120px] w-full" />
            <Skeleton variant="rectangular" className="h-[120px] w-full" />
          </div>
        ) : fetchError ? (
          <EmptyState 
            icon={<AlertTriangle size={32} />}
            title="Error Loading Orders"
            description={fetchError}
            actionText="Retry"
            onAction={() => window.location.reload()}
          />
        ) : orders.length === 0 ? (
          <RevealSection delay={100}>
            <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-surface border border-[#c5a059]/10">
              <div className="w-20 h-20 rounded-full bg-elevated border border-[#c5a059]/20 flex items-center justify-center mb-6">
                <PackageOpen size={32} className="text-muted" />
              </div>
              <h2 className="text-xl font-bold tracking-widest uppercase text-content mb-3">No orders yet</h2>
              <p className="text-muted text-sm max-w-sm mb-8">Your confirmed Grainood orders will appear here.</p>
              <Link 
                to="/collection"
                className="bg-[#c5a059] text-bg px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#d4b271] transition-colors"
              >
                Explore Collection
              </Link>
            </div>
          </RevealSection>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => {
              const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
              const dateStr = orderDate.toLocaleDateString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric' 
              });
              const paymentStatus = order.payment?.status || 'pending';
              const orderStatus = order.status || 'Order Placed';
              
              const firstItem = order.items?.[0];
              const imageUrl = firstItem?.product?.imageUrl || '/product-bat.webp';
              const firstItemName = firstItem?.productName || firstItem?.product?.name || "Bespoke Bat";
              const moreItemsCount = order.items && order.items.length > 1 ? order.items.length - 1 : 0;
              const title = moreItemsCount > 0 ? `${firstItemName} + ${moreItemsCount} more` : firstItemName;

              return (
                <RevealSection key={order.id} delay={idx * 50}>
                  <Link 
                    to={`/my-orders/${order.id}`} 
                    className="group block bg-surface border border-[#c5a059]/10 hover:border-[#c5a059]/30 transition-all p-4 md:p-6 hover:-translate-y-0.5 shadow-sm hover:shadow-[0_4px_30px_rgba(197,160,89,0.05)]"
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-elevated border border-[#c5a059]/5 shrink-0 flex items-center justify-center p-2">
                        <LazyImage 
                          src={imageUrl} 
                          alt={firstItemName} 
                          className="w-full h-full object-contain filter group-hover:brightness-110 transition-all duration-500" 
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-2 md:mb-1">
                          <h3 className="font-bold text-content text-sm md:text-base tracking-wider uppercase truncate">{title}</h3>
                          <span className="text-[#c5a059] font-bold text-sm md:text-base whitespace-nowrap hidden md:block">
                            ₹{order.totalPrice?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-[11px] md:text-xs">
                          <span className="text-muted tracking-widest uppercase">No. {order.receiptNumber || order.id.slice(-6)}</span>
                          <span className="hidden md:inline text-line">•</span>
                          <span className="text-content/80">{dateStr}</span>
                          <span className="md:hidden mt-1 font-bold text-[#c5a059]">₹{order.totalPrice?.toLocaleString('en-IN')}</span>
                        </div>
                        
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={clsx("text-[9px] px-2 py-1 uppercase tracking-widest border font-bold", 
                            paymentStatus === 'confirmed' ? "border-green-500/30 text-green-500 bg-green-500/10" : 
                            (paymentStatus as string) === 'submitted' ? "border-blue-500/30 text-blue-400 bg-blue-500/10" :
                            "border-orange-500/30 text-orange-400 bg-orange-500/10"
                          )}>
                            {paymentStatus}
                          </span>
                          <span className="text-[9px] px-2 py-1 uppercase tracking-widest border border-[#c5a059]/30 text-[#c5a059] bg-[#c5a059]/10 font-bold max-w-[120px] md:max-w-none truncate">
                            {orderStatus}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-muted group-hover:text-[#c5a059] transition-colors pl-2 shrink-0">
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                    </div>
                  </Link>
                </RevealSection>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
