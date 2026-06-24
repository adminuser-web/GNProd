import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, Moon, Sun, User, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProducts } from '../context/ProductsContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  const { itemCount, openDrawer } = useOrder();
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { products } = useProducts();
  const [bounce, setBounce] = useState(false);
  const navigate = useNavigate();

  // Notification states
  const [unreadOrders, setUnreadOrders] = useState(false);
  const [unreadRequests, setUnreadRequests] = useState(false);

  useEffect(() => {
    if (!user || isAdmin) return;

    const unsubs: (() => void)[] = [];

    // Check orders
    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid));
    unsubs.push(onSnapshot(qOrders, (snap) => {
      let hasUnread = false;
      const lastViewed = parseInt(localStorage.getItem(`lastViewedOrders_${user.uid}`) || '0', 10);
      snap.forEach(doc => {
        const data = doc.data();
        const updatedTime = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0);
        if (updatedTime > lastViewed) {
          hasUnread = true;
        }
      });
      setUnreadOrders(hasUnread);
    }, (error) => {
      console.error("Navbar qOrders onSnapshot error:", error);
    }));

    // Check tickets
    const qTickets = query(collection(db, 'tickets'), where('userId', '==', user.uid));
    unsubs.push(onSnapshot(qTickets, (snap) => {
      let hasUnread = false;
      const lastViewed = parseInt(localStorage.getItem(`lastViewedTickets_${user.uid}`) || '0', 10);
      snap.forEach(doc => {
        const data = doc.data();
        const updatedTime = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0);
        if (updatedTime > lastViewed) {
          hasUnread = true;
        }
      });
      setUnreadRequests(hasUnread);
    }, (error) => {
      console.error("Navbar qTickets onSnapshot error:", error);
    }));

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, [user, isAdmin]);

  useEffect(() => {
    // Also clear badges if user navigates to those pages
    if (location.pathname === '/my-orders' && user) {
      localStorage.setItem(`lastViewedOrders_${user.uid}`, Date.now().toString());
      setUnreadOrders(false);
    }
    if (location.pathname === '/my-requests' && user) {
      localStorage.setItem(`lastViewedTickets_${user.uid}`, Date.now().toString());
      setUnreadRequests(false);
    }
  }, [location.pathname, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
    setAccountDropdownOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (itemCount > 0) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountDropdownOpen(false);
    };
    
    if (accountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountDropdownOpen]);

  const isTransparent = isHomePage && !isScrolled && !mobileMenuOpen;
  
  const navbarClasses = twMerge(
    'fixed top-0 w-full z-header transition-all duration-300 print-hide',
    isTransparent
      ? 'bg-transparent text-content border-b border-transparent'
      : 'bg-surface/95 backdrop-blur-md text-content border-b border-[#c5a059]/10 shadow-sm'
  );

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path || (path === '/collection' && location.pathname.startsWith('/collection'));
    return clsx(
      "text-xs tracking-widest whitespace-nowrap uppercase font-medium transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded-sm",
      isActive ? "text-[#c5a059] font-bold" : "text-content/80 hover:text-[#c5a059]"
    );
  };

  const getDropdownItemClass = "block w-full text-left px-6 py-3 text-xs tracking-widest uppercase text-content/80 hover:text-premium-gold-text hover:bg-elevated transition-colors focus-visible:bg-elevated focus-visible:outline-none";

  return (
    <nav className={navbarClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* LEFT ZONE: LOGO */}
          <div className="flex-1 flex justify-start items-center">
            <Link to="/" className="text-2xl font-bold tracking-[0.2em] uppercase flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded-sm">
              GRAINOOD
            </Link>
          </div>

          {/* CENTER ZONE: LINKS */}
          <div className="hidden lg:flex flex-1 justify-center items-center gap-10">
            <Link to="/" className={getNavClass('/')}>Home</Link>
            
            <div className="relative group py-8">
              <span className={clsx(getNavClass('/collection'), "cursor-pointer flex items-center gap-1")}>
                Shop <ChevronDown size={14} className="opacity-70 group-hover:rotate-180 transition-transform" />
              </span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-64 bg-surface border border-[#c5a059]/20 shadow-2xl shadow-black/40 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 mt-0">
                <div className="absolute top-[-10px] left-0 w-full h-[10px] bg-transparent"></div>
                <div className="py-4">
                  {products.map(product => (
                    <Link 
                      key={product.id}
                      to={`/collection/${product.slug}`} 
                      className="block px-6 py-3 text-[10px] tracking-widest uppercase text-content/80 hover:text-premium-gold-text hover:bg-elevated transition-colors flex justify-between focus-visible:bg-elevated focus-visible:outline-none w-full"
                    >
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis mr-2">{product.name}</span>
                      <span className="opacity-50">₹{(product.price/1000).toFixed(0)}k</span>
                    </Link>
                  ))}
                  <div className="border-t border-[#c5a059]/10 mt-2 pt-2">
                    <Link to="/collection" className="block px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase text-premium-gold-text hover:text-content hover:bg-elevated transition-colors focus-visible:bg-elevated focus-visible:outline-none">
                      View All Models
                    </Link>
                    <Link to="/comparison" className="block px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase text-premium-gold-text hover:text-content hover:bg-elevated transition-colors focus-visible:bg-elevated focus-visible:outline-none">
                      Compare Series
                    </Link>
                    <Link to="/bat-consultant" className="block px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase text-premium-gold-text hover:text-content hover:bg-elevated transition-colors focus-visible:bg-elevated focus-visible:outline-none">
                      AI Bat Consultant
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/contact" className={getNavClass('/contact')}>Contact</Link>
            <Link to="/locate-us" className={getNavClass('/locate-us')}>Locate Us</Link>
          </div>
          
          {/* RIGHT ZONE: ICONS */}
          <div className="flex-1 flex justify-end items-center gap-4">
            
            {user && !isAdmin && (
              <NotificationBell roleTarget="customer" className="hidden lg:block -mr-2" />
            )}

            <button 
              onClick={toggleTheme}
              className="hidden lg:flex p-2 text-content/80 hover:text-[#c5a059] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="hidden lg:block relative" ref={accountDropdownRef}>
              <button 
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="relative p-2 text-content/80 hover:text-[#c5a059] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] flex items-center justify-center"
                aria-haspopup="true"
                aria-expanded={accountDropdownOpen}
                aria-label="Account menu"
              >
                <User size={20} />
                {(unreadOrders || unreadRequests) && (
                   <span className="absolute top-1 right-1 w-2 h-2 bg-[#c5a059] rounded-full shadow-[0_0_8px_#c5a059]" />
                )}
              </button>
              
              {accountDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-surface border border-[#c5a059]/20 shadow-xl shadow-black/40 flex flex-col py-2 z-dropdown">
                  {!user ? (
                    <>
                      <button onClick={() => { setAccountDropdownOpen(false); navigate('/login'); }} className={getDropdownItemClass}>
                        Sign In
                      </button>
                      <button onClick={() => { setAccountDropdownOpen(false); navigate('/login', { state: { mode: 'signup' }}); }} className={getDropdownItemClass}>
                        Create Account
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-6 py-3 border-b border-[#c5a059]/10 text-muted/80 text-[10px] break-all truncate">
                        {user.email}
                      </div>
                      <button onClick={() => { setAccountDropdownOpen(false); navigate('/my-orders'); }} className={clsx(getDropdownItemClass, unreadOrders && "font-bold text-[#c5a059]")}>
                        My Orders {unreadOrders && <span className="inline-block w-1.5 h-1.5 bg-[#c5a059] rounded-full ml-1 mb-0.5"></span>}
                      </button>
                      <button onClick={() => { setAccountDropdownOpen(false); navigate('/my-builds'); }} className={getDropdownItemClass}>
                        My Builds
                      </button>
                      <button onClick={() => { setAccountDropdownOpen(false); navigate('/my-requests'); }} className={clsx(getDropdownItemClass, unreadRequests && "font-bold text-[#c5a059]")}>
                        Support {unreadRequests && <span className="inline-block w-1.5 h-1.5 bg-[#c5a059] rounded-full ml-1 mb-0.5"></span>}
                      </button>
                      <button onClick={() => { setAccountDropdownOpen(false); navigate('/profile'); }} className={getDropdownItemClass}>
                        Profile
                      </button>
                      {isAdmin && (
                        <button onClick={() => { setAccountDropdownOpen(false); navigate('/admin'); }} className={getDropdownItemClass}>
                          Admin Dashboard
                        </button>
                      )}
                      <div className="my-1 border-t border-[#c5a059]/10"></div>
                      <button onClick={handleSignOut} className={getDropdownItemClass}>
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={openDrawer}
              className="relative p-2 text-content/80 hover:text-[#c5a059] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
              aria-label="Open Cart"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span 
                  className={clsx(
                    "absolute top-0 right-0 translate-x-1 -translate-y-1 bg-[#c5a059] text-[#1a1a1a] w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                    bounce && "animate-bounce"
                  )}
                >
                  {itemCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="lg:hidden p-2 text-content/80 hover:text-[#c5a059] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Drawer Overlay */}
      <div 
        className={clsx(
          "fixed inset-0 z-overlay bg-black/80 lg:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Drawer */}
      <div 
        className={clsx(
          "fixed top-0 right-0 h-[100dvh] w-[85vw] max-w-[400px] bg-surface border-l border-[#c5a059]/20 overflow-y-auto transition-transform duration-300 ease-in-out z-drawer lg:hidden flex flex-col pointer-events-auto shadow-2xl",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#c5a059]/10">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-content">Menu</span>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-content/80 hover:text-[#c5a059] transition-colors rounded-full focus-visible:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Main Sections */}
          <div className="px-4 py-2 flex flex-col space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-[#c5a059] mb-2 mt-4 px-2">Discover</span>
            
            <Link 
              to="/collection" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center px-2 min-h-[44px] text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none focus-visible:text-premium-gold-text text-content/80 hover:text-[#c5a059]"
            >
              Shop Collection
            </Link>
            <Link 
              to="/bat-consultant" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center px-2 min-h-[44px] text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none focus-visible:text-premium-gold-text text-content/80 hover:text-[#c5a059]"
            >
              AI Bat Consultant
            </Link>
            <Link 
              to="/comparison" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center px-2 min-h-[44px] text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none focus-visible:text-premium-gold-text text-content/80 hover:text-[#c5a059]"
            >
              Compare
            </Link>
            <Link 
              to="/locate-us"
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center px-2 min-h-[44px] text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none focus-visible:text-premium-gold-text text-content/80 hover:text-[#c5a059]"
            >
              Locate Us
            </Link>
            <Link 
              to="/contact" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center px-2 min-h-[44px] text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none focus-visible:text-premium-gold-text text-content/80 hover:text-[#c5a059]"
            >
              Contact
            </Link>
          </div>

          <div className="mx-4 my-4 border-t border-[#c5a059]/10"></div>

          {/* Account Block */}
          <div className="px-4 py-2 flex flex-col space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-[#c5a059] mb-2 px-2">Account</span>
            
            {!user ? (
              <>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} 
                  className="flex items-center px-2 min-h-[44px] text-left text-content/80 hover:text-premium-gold-text text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/login', { state: { mode: 'signup' } }); }} 
                  className="flex items-center px-2 min-h-[44px] text-left text-content/80 hover:text-premium-gold-text text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none"
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center px-2 min-h-[44px] text-muted text-[10px] break-all truncate">
                  {user.email}
                </div>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/profile'); }} 
                  className="flex items-center px-2 min-h-[44px] text-left text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none text-content/80 hover:text-[#c5a059]"
                >
                  Profile
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/my-orders'); }} 
                  className={clsx("flex items-center px-2 min-h-[44px] text-left text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none", unreadOrders ? "text-[#c5a059]" : "text-content/80 hover:text-[#c5a059]")}
                >
                  My Orders {unreadOrders && <span className="inline-block w-1.5 h-1.5 bg-[#c5a059] rounded-full ml-2 shadow-[0_0_8px_#c5a059]"></span>}
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/my-builds'); }} 
                  className="flex items-center px-2 min-h-[44px] text-left text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none text-content/80 hover:text-[#c5a059]"
                >
                  My Builds
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/my-requests'); }} 
                  className={clsx("flex items-center px-2 min-h-[44px] text-left text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none", unreadRequests ? "text-[#c5a059]" : "text-content/80 hover:text-[#c5a059]")}
                >
                  Support {unreadRequests && <span className="inline-block w-1.5 h-1.5 bg-[#c5a059] rounded-full ml-2 shadow-[0_0_8px_#c5a059]"></span>}
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }} 
                    className="flex items-center px-2 min-h-[44px] text-left text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none text-[#c5a059]"
                  >
                    Admin Dashboard
                  </button>
                )}
                <button 
                  onClick={handleSignOut} 
                  className="flex items-center px-2 min-h-[44px] text-left text-content/80 hover:text-premium-gold-text text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[#c5a059]/10">
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-center gap-3 w-full min-h-[44px] text-content/80 hover:text-premium-gold-text text-xs font-bold tracking-[0.25em] uppercase transition-colors focus-visible:outline-none rounded-sm border border-[#c5a059]/20"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <><Sun size={16} /> Light Mode</>
            ) : (
              <><Moon size={16} /> Dark Mode</>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
