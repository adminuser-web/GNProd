import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { clsx } from 'clsx';
import { GoldButton } from './GoldButton';
import { LazyImage } from './LazyImage';
import { HowItWorks } from './HowItWorks';

export function OrderDrawer() {
  const { state: { items }, isDrawerOpen, closeDrawer, updateQuantity, removeFromOrder, grandTotal, updateItem, itemsWithPricing } = useOrder();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change
  useEffect(() => {
    closeDrawer();
  }, [location.pathname]);

  // Lock body scroll and focus trap when open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the close button for accessibility
      setTimeout(() => closeBtnRef.current?.focus(), 100);
      
      // Handle escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeDrawer();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isDrawerOpen]);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      removeFromOrder(id);
      setRemovingId(null);
    }, 300); // match transition duration
  };

  return (
    <>
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-overlay transition-opacity duration-400",
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <div 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your Order"
        className={clsx(
          "fixed top-0 right-0 h-full w-[90%] max-w-md bg-surface border-l border-[#c5a059]/20 z-drawer shadow-2xl flex flex-col transition-transform duration-400 ease-out",
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex justify-between items-center p-6 border-b border-[#c5a059]/20">
          <h2 className="text-xl font-bold tracking-tight text-content uppercase">Your Order</h2>
          <button 
            ref={closeBtnRef}
            onClick={closeDrawer} 
            className="text-content/80 hover:text-[#c5a059] transition-colors p-2 -mr-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
            aria-label="Close Order drawer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted gap-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                <path d="M14 2L8 22" />
                <path d="M10 2L16 22" />
              </svg>
              <p className="tracking-[0.2em] uppercase text-xs">Your order is empty</p>
              <GoldButton 
                as={Link}
                to="/collection"
                onClick={closeDrawer}
                variant="outline"
              >
                DISCOVER THE COLLECTION
              </GoldButton>
            </div>
          ) : (
            <div className="space-y-6">
              {itemsWithPricing.map((item) => (
                <div 
                  key={item.id} 
                  className={clsx(
                    "flex gap-4 transition-all duration-300 overflow-hidden",
                    removingId === item.id ? "opacity-0 scale-95 h-0 mb-0" : "opacity-100 scale-100 min-h-[100px] mb-6"
                  )}
                >
                  <div className="w-20 h-28 bg-elevated overflow-hidden flex-shrink-0 border border-[#c5a059]/20">
                    <LazyImage 
                      src={item.product.media?.primaryImage || item.product.imageUrl || ''} 
                      alt={item.product.name} 
                      className="w-full h-full object-cover opacity-80" 
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <Link to={`/collection/${item.product.slug}/${item.product.activeSubSeriesSlug || ''}`} onClick={closeDrawer} className="text-content font-bold tracking-tight uppercase text-sm hover:text-[#c5a059] transition-colors focus-visible:outline-none focus-visible:text-premium-gold-text">
                          {item.product.name} {item.product.subSeriesName && <span className="block text-[10px] text-muted">{item.product.subSeriesName}</span>}
                        </Link>
                        <button 
                          onClick={() => handleRemove(item.id)} 
                          className="text-muted hover:text-red-500 transition-colors p-1 -mr-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`Remove ${item.product.name} from order`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="text-muted text-[10px] tracking-widest uppercase mt-1 space-y-1">
                        {item.selections.map(s => {
                          if (s.type === 'text') {
                            return (
                              <div key={s.groupId} className="flex flex-col gap-1 mt-2 mb-2">
                                <label className="text-[9px] font-bold text-premium-gold-text">{s.groupLabel}</label>
                                <input 
                                  type="text" 
                                  className="bg-bg border border-[#c5a059]/30 p-1.5 focus:border-[#c5a059] focus:outline-none w-full text-content uppercase text-[10px]"
                                  value={s.valueText || ''}
                                  onChange={(e) => {
                                    const newSelections = item.selections.map(sel => 
                                      sel.groupId === s.groupId ? { ...sel, valueText: e.target.value } : sel
                                    );
                                    updateItem(item.id, { ...item, selections: newSelections });
                                  }}
                                  placeholder="Enter engraving text"
                                />
                              </div>
                            );
                          }
                          return <div key={s.groupId}>{s.optionLabel}</div>;
                        })}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center border border-[#c5a059]/30 h-8">
                        <button 
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="px-2 text-muted hover:text-content transition-colors focus-visible:outline-none focus-visible:bg-elevated"
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-content text-[12px]" aria-label="Quantity">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, Math.min(5, item.quantity + 1))}
                          className="px-2 text-muted hover:text-content transition-colors focus-visible:outline-none focus-visible:bg-elevated"
                          disabled={item.quantity >= 5}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-content font-light text-sm tracking-wider">
                        ₹{Math.round(item.pricingResult.total * item.quantity).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[#c5a059]/20 bg-surface">
            <HowItWorks variant="compact" className="mb-5" />
            <div className="flex justify-between items-center mb-6">
              <span className="text-content font-bold tracking-widest uppercase text-xs">Total</span>
              <span className="text-content font-bold tracking-widest text-lg">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <GoldButton
              as={Link}
              to="/order"
              onClick={closeDrawer}
              variant="solid"
              className="w-full"
            >
              PLACE ORDER
            </GoldButton>
          </div>
        )}
      </div>
    </>
  );
}
