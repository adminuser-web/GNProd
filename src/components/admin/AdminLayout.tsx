import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, ShoppingBag, Box, LifeBuoy, Menu, X, DollarSign, Shield, Users, Search, FileText, Store, LogOut } from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { clsx } from 'clsx';
import { useAllOrders } from '../../features/orders/hooks/useOrders';
import { FEATURES } from '../../config/features';
import { Skeleton } from '../Skeleton';
import { verifyLoginCode } from '../../features/auth/mfa';
import { toast } from 'sonner';

type AdminLink = { path: string; label: string; icon: any; badge?: 'orders' | 'enquiries' | 'support' };

// Grouped so the sidebar reads as a few calm sections instead of one long list.
const NAV_GROUPS: { heading: string; links: AdminLink[] }[] = [
  {
    heading: 'Overview',
    links: [{ path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Commerce',
    links: [
      { path: '/admin/products', label: 'Products', icon: Box },
      { path: '/admin/orders', label: 'Sales / Orders', icon: ShoppingBag, badge: 'orders' },
    ],
  },
  {
    heading: 'Customers',
    links: [
      { path: '/admin/customers', label: 'Customers', icon: Users },
      { path: '/admin/enquiries', label: 'Enquiries', icon: DollarSign, badge: 'enquiries' },
      { path: '/admin/support', label: 'Support', icon: LifeBuoy, badge: 'support' },
    ],
  },
  {
    heading: 'Content & System',
    links: [
      { path: '/admin/content', label: 'Content', icon: FileText },
      { path: '/admin/audit', label: 'Audit Log', icon: Shield },
    ],
  },
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
          className="w-full md:w-64 bg-bg border border-line pl-10 pr-4 py-2 text-xs text-content focus:border-[#c5a059] focus:outline-none placeholder-muted uppercase tracking-widest transition-all focus:w-full md:focus:w-96"
        />
        {searchQuery && (
           <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
             <X className="w-3 h-3" />
           </button>
        )}
      </div>

      {searchOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 md:right-auto md:w-96 bg-surface border border-line shadow-2xl z-dropdown max-h-96 overflow-y-auto">
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
                       className="p-3 border-b border-line hover:bg-bg/50 transition-colors text-left flex flex-col gap-1 w-full"
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

function NavItem({
  link,
  active,
  badgeCount,
  variant,
  onClick,
}: {
  link: AdminLink;
  active: boolean;
  badgeCount: number;
  variant: 'mobile' | 'desktop';
  onClick?: () => void;
}) {
  return (
    <Link
      to={link.path}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 text-xs font-bold tracking-widest uppercase transition-all',
        variant === 'mobile'
          ? clsx(
              'p-4 border-l-2',
              active ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'border-transparent text-muted hover:bg-surface/80 hover:text-content',
            )
          : clsx(
              'p-3 rounded-sm duration-300',
              active ? 'bg-surface text-[#c5a059]' : 'text-muted hover:bg-surface/60 hover:text-content',
            ),
      )}
    >
      <link.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{link.label}</span>
      {link.badge && badgeCount > 0 && (
        <span
          className={clsx(
            'text-[9px] px-2 py-0.5 rounded-full ml-2',
            'bg-[#c5a059] text-[#1a1a1a]',
          )}
        >
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

export function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [newEnquiriesCount, setNewEnquiriesCount] = useState(0);
  const { orders } = useAllOrders();

  // MFA gate: admins with a verified authenticator MUST be at AAL2 (i.e. have
  // entered a code this session) before the admin area renders. This closes the
  // hole where a password-only (aal1) admin session could reach admin pages.
  const [mfaGate, setMfaGate] = useState<'checking' | 'ok' | 'challenge'>('checking');
  const [mfaCode, setMfaCode] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;
      if (data?.currentLevel === 'aal2') { setMfaGate('ok'); return; }
      const { data: f } = await supabase.auth.mfa.listFactors();
      const hasVerified = !!f?.totp?.some((x) => x.status === 'verified');
      // aal1 + a verified factor → must enter a code; no factor → MFA not set up, allow.
      setMfaGate(hasVerified ? 'challenge' : 'ok');
    })();
    return () => { active = false; };
  }, [user, loading]);

  const handleVerifyGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingMfa(true);
    try {
      await verifyLoginCode(mfaCode);   // challenge+verify elevates this session to aal2
      setMfaCode('');
      setMfaGate('ok');
    } catch {
      toast.error('Invalid code. Please try again.');
    } finally {
      setVerifyingMfa(false);
    }
  };

  // Orders needing attention: active (not cancelled/delivered) and not yet paid.
  const pendingOrdersCount = orders.filter(o => {
    if (o.status === 'Cancelled' || o.status === 'Delivered') return false;
    return o.payment?.status !== 'confirmed';
  }).length;

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setOpenTicketsCount(count ?? 0));
    supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new')
      .then(({ count }) => setNewEnquiriesCount(count ?? 0));
  }, [isAdmin]);

  const badgeFor = (badge?: AdminLink['badge']) =>
    badge === 'orders' ? pendingOrdersCount : badge === 'support' ? openTicketsCount : badge === 'enquiries' ? newEnquiriesCount : 0;
  const isActive = (path: string) =>
    location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));

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

  // MFA gate — still checking the session's assurance level.
  if (mfaGate === 'checking') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Skeleton variant="rectangular" className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  // MFA gate — admin has 2FA but this session hasn't verified a code yet.
  if (mfaGate === 'challenge') {
    return (
      <div className="min-h-screen bg-bg text-content px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm bg-surface border border-[#c5a059]/20 p-8">
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-[#c5a059] mb-2 text-center">Two-Factor Required</h1>
          <p className="text-xs text-muted text-center mb-6 leading-relaxed">Enter the 6-digit code from your authenticator app to access the admin area.</p>
          <form onSubmit={handleVerifyGate} className="space-y-5">
            <input
              inputMode="numeric" autoFocus maxLength={6} value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-bg border border-[#c5a059]/30 text-center text-2xl tracking-[0.5em] py-3 text-content focus:outline-none focus:border-[#c5a059]"
            />
            <button type="submit" disabled={verifyingMfa || mfaCode.length < 6} className="w-full bg-[#c5a059] text-bg text-xs font-bold uppercase tracking-widest py-3 hover:bg-premium-gold-text transition-colors disabled:opacity-50">
              {verifyingMfa ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={handleSignOut} className="w-full text-[10px] uppercase tracking-widest text-muted hover:text-content transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-content flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden border-b border-line bg-surface/95 sticky top-0 z-sticky-section">
        <div className="flex items-center justify-between p-4">
          <span className="text-[10px] tracking-[0.4em] uppercase text-premium-gold-text font-bold">Admin Panel</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-content p-2">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-[100%] left-0 w-full bg-surface border-b border-line flex flex-col shadow-2xl z-[100] max-h-[80vh] overflow-y-auto">
            {NAV_GROUPS.map(group => (
              <div key={group.heading}>
                <div className="px-4 pt-4 pb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-muted/50">{group.heading}</div>
                {group.links.map(link => (
                  <NavItem
                    key={link.path}
                    link={link}
                    active={isActive(link.path)}
                    badgeCount={badgeFor(link.badge)}
                    variant="mobile"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-line bg-surface/20 min-h-screen sticky top-0 shrink-0">
        <div className="p-6">
          <span className="text-[10px] tracking-[0.4em] uppercase text-premium-gold-text font-bold block mb-6">Admin Panel</span>
          <div className="flex flex-col gap-5">
            {NAV_GROUPS.map(group => (
              <div key={group.heading} className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted/50 px-3 mb-1">{group.heading}</span>
                {group.links.map(link => (
                  <NavItem
                    key={link.path}
                    link={link}
                    active={isActive(link.path)}
                    badgeCount={badgeFor(link.badge)}
                    variant="desktop"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 min-w-0">

        {/* Global Admin Search & Notifications */}
        <div className="mb-5 relative z-header flex items-center justify-between gap-4">
           <AdminOrderSearch />
           <div className="flex items-center gap-2 shrink-0">
             <Link
               to="/"
               title="View store"
               className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-muted border border-line rounded-sm hover:text-[#c5a059] hover:border-[#c5a059]/50 transition-colors"
             >
               <Store className="w-4 h-4" />
               <span className="hidden sm:inline">View Store</span>
             </Link>
             <NotificationBell roleTarget="admin" />
             <button
               onClick={handleSignOut}
               title="Sign out"
               className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-muted border border-line rounded-sm hover:text-red-400 hover:border-red-400/50 transition-colors"
             >
               <LogOut className="w-4 h-4" />
               <span className="hidden sm:inline">Sign Out</span>
             </button>
           </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
