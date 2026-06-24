import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LayoutDashboard, ShoppingBag, Box, LifeBuoy, Menu, X, DollarSign, Factory, Archive, Wrench, Shield, BarChart2, Users, Search, FileText } from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { clsx } from 'clsx';
import { useAllOrders } from '../../features/orders/hooks/useOrders';
import { FEATURES } from '../../config/features';
import { Skeleton } from '../Skeleton';

const ADMIN_LINKS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Products', icon: Box },
  { path: '/admin/orders', label: 'Sales/Orders', icon: ShoppingBag, badge: 'orders' },
  { path: '/admin/customers', label: 'Customers', icon: Users },
  { path: '/admin/content', label: 'Content', icon: FileText },
  { path: '/admin/enquiries', label: 'Enquiries', icon: DollarSign, badge: 'enquiries' },
  { path: '/admin/support', label: 'Support', icon: LifeBuoy, badge: 'support' },
  { path: '/admin/audit', label: 'Audit Log', icon: Shield },
];

function AdminOrderSearch() {
  const { orders } = useAllOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOrders = orders.filter(o => {
    if (searchQuery.length < 2) return false;
    const term = searchQuery.toLowerCase();
    const matchId = o.id?.toLowerCase().includes(term);
    const matchReceipt = o.receiptNumber?.toLowerCase().includes(term);
    const matchName = (o as any).customerInfo?.name?.toLowerCase().includes(term) || o.shippingDetails?.name?.toLowerCase().includes(term);
    const matchPhone = (o as any).customerInfo?.phone?.toLowerCase().includes(term) || o.shippingDetails?.phone?.toLowerCase().includes(term);
    return matchId || matchReceipt || matchName || matchPhone;
  });

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#c5a059] transition-colors" />
        <input 
          type="text" 
          placeholder="Search orders by ID, receipt, name, or phone..." 
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (e.target.value.length >= 2) setSearchOpen(true);
            else setSearchOpen(false);
          }}
          onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true); }}
          className="w-full md:w-64 bg-bg border border-[#c5a059]/20 pl-10 pr-4 py-2 text-xs text-content focus:border-[#c5a059] focus:outline-none placeholder-muted uppercase tracking-widest transition-all focus:w-full md:focus:w-96"
        />
        {searchQuery && (
           <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
             <X className="w-3 h-3" />
           </button>
        )}
      </div>

      {searchOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 md:right-auto md:w-96 bg-surface border border-[#c5a059]/20 shadow-2xl z-dropdown max-h-96 overflow-y-auto">
           {filteredOrders.length === 0 ? (
              <div className="p-4 text-xs text-muted uppercase tracking-widest text-center">No matching orders found</div>
           ) : (
              <div className="flex flex-col">
                 {filteredOrders.map(order => (
                    <button 
                       key={order.id}
                       onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/admin/orders/${order.id}`);
                       }}
                       className="p-3 border-b border-[#c5a059]/10 hover:bg-bg/50 transition-colors text-left flex flex-col gap-1 w-full"
                    >
                       <div className="flex justify-between items-center bg-transparent">
                          <div>
                            <span className="text-xs font-bold tracking-widest text-[#c5a059] uppercase block">{order.receiptNumber || order.id?.slice(0,8)}</span>
                            <span className="text-[10px] text-muted uppercase tracking-widest">{(order as any).customerInfo?.name || order.shippingDetails?.name || 'Unknown'} - {(order as any).customerInfo?.phone || order.shippingDetails?.phone || ''}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-content">{order.status}</span>
                       </div>
                    </button>
                 ))}
              </div>
           )}
        </div>
      )}
    </div>
  );
}

export function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [newEnquiriesCount, setNewEnquiriesCount] = useState(0);
  const { orders } = useAllOrders();

  const pendingOrdersCount = orders.filter(o => 
    (o.payment?.status?.toLowerCase() === 'pending' || !o.payment && o.status !== 'Cancelled' && o.status !== 'Delivered')
  ).length;

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'tickets'), where('status', '==', 'open'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOpenTicketsCount(snapshot.size);
    }, (err) => console.error(err));

    const qEnq = query(collection(db, 'enquiries'), where('status', '==', 'new'));
    const unsubscribeEnq = onSnapshot(qEnq, (snapshot) => {
      setNewEnquiriesCount(snapshot.size);
    }, (err) => console.error(err));

    return () => { unsubscribe(); unsubscribeEnq(); };
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Skeleton variant="rectangular" className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg text-content pt-32 pb-20 px-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-red-500 mb-4">Not Authorized</h1>
        <p className="text-muted tracking-widest uppercase text-sm mb-8">You do not have administrative privileges.</p>
        <Link to="/" className="text-xs text-premium-gold-text font-bold tracking-widest uppercase py-3 px-8 border border-[#c5a059]/30 hover:bg-[#c5a059]/10 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-content pt-20 md:pt-24 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden border-b border-[#c5a059]/20 bg-surface/95 sticky top-16 z-sticky-section">
        <div className="flex items-center justify-between p-4">
          <span className="text-[10px] tracking-[0.4em] uppercase text-premium-gold-text font-bold">Admin Panel</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-content p-2">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-[100%] left-0 w-full bg-surface border-b border-[#c5a059]/20 flex flex-col shadow-2xl z-[100]">
            {ADMIN_LINKS.map(link => {
              const active = location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 p-4 text-xs font-bold tracking-widest uppercase border-l-2 transition-colors",
                    active 
                      ? "border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]" 
                      : "border-transparent text-muted hover:bg-surface/80 hover:text-content"
                  )}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{link.label}</span>
                  {link.badge === 'support' && openTicketsCount > 0 && (
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full ml-2", active ? "bg-[#333333] text-[#c5a059]" : "bg-[#c5a059] text-[#1a1a1a]")}>
                      {openTicketsCount}
                    </span>
                  )}
                  {link.badge === 'orders' && pendingOrdersCount > 0 && (
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full ml-2", active ? "bg-[#333333] text-[#c5a059]" : "bg-[#c5a059] text-[#1a1a1a]")}>
                      {pendingOrdersCount}
                    </span>
                  )}
                  {link.badge === 'enquiries' && newEnquiriesCount > 0 && (
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full ml-2", active ? "bg-[#333333] text-[#c5a059]" : "bg-[#c5a059] text-[#1a1a1a]")}>
                      {newEnquiriesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-[#c5a059]/20 bg-surface/30 min-h-[calc(100vh-6rem)] sticky top-24 shrink-0">
        <div className="p-8">
          <span className="text-[10px] tracking-[0.4em] uppercase text-premium-gold-text font-bold block mb-8">Admin Panel</span>
          <div className="flex flex-col gap-2">
            {ADMIN_LINKS.map(link => {
              const active = location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={clsx(
                    "flex items-center gap-3 p-3 text-xs font-bold tracking-widest uppercase rounded-sm transition-all duration-300",
                    active 
                      ? "bg-[#c5a059] text-[#333333]" 
                      : "text-muted hover:bg-surface hover:text-[#c5a059]"
                  )}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{link.label}</span>
                  {link.badge === 'support' && openTicketsCount > 0 && (
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full ml-auto", active ? "bg-[#333333] text-[#c5a059]" : "bg-[#c5a059] text-[#1a1a1a]")}>
                      {openTicketsCount}
                    </span>
                  )}
                  {link.badge === 'orders' && pendingOrdersCount > 0 && (
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full ml-auto", active ? "bg-[#333333] text-[#c5a059]" : "bg-[#c5a059] text-[#1a1a1a]")}>
                      {pendingOrdersCount}
                    </span>
                  )}
                  {link.badge === 'enquiries' && newEnquiriesCount > 0 && (
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full ml-auto", active ? "bg-[#333333] text-[#c5a059]" : "bg-[#c5a059] text-[#1a1a1a]")}>
                      {newEnquiriesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 min-w-0">
        
        {/* Global Admin Search & Notifications */}
        <div className="mb-6 relative z-header flex items-center justify-between gap-4">
           <AdminOrderSearch />
           <NotificationBell roleTarget="admin" />
        </div>

        <Outlet />
      </div>
    </div>
  );
}
