import React, { createContext, useContext, useEffect, useReducer, ReactNode, useState, useMemo } from 'react';
import { Product } from '../types';
import { computePrice, DiscountCode } from '../lib/pricing';
import { usePricingConfig } from '../features/products/hooks/usePricingConfig';
import { pricingConfigService } from '../features/products/services/pricingConfigService';

export interface OrderItemSelection {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  priceDelta: number;
  valueText?: string;
  type?: "select" | "color" | "toggle" | "text";
}

export interface OrderItem {
  id: string; // Unique ID for the cart line item
  product: Product;
  selections: OrderItemSelection[];
  quantity: number;
  unitPrice: number;
}

interface OrderState {
  items: OrderItem[];
}

type OrderAction = 
  | { type: 'ADD_ITEM'; payload: OrderItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_ITEM'; payload: { id: string; item: OrderItem } }
  | { type: 'CLEAR_ORDER' }
  | { type: 'LOAD_CART'; payload: OrderItem[] };

const initialState: OrderState = {
  items: [],
};

const STORAGE_KEY = 'grainood_order_v2';

function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const selectionsMatch = (a: OrderItemSelection[], b: OrderItemSelection[]) => {
        if (a.length !== b.length) return false;
        const aSorted = [...a].sort((x, y) => x.groupId.localeCompare(y.groupId));
        const bSorted = [...b].sort((x, y) => x.groupId.localeCompare(y.groupId));
        return aSorted.every((sel, i) => 
          sel.groupId === bSorted[i].groupId &&
          sel.optionId === bSorted[i].optionId &&
          sel.optionLabel === bSorted[i].optionLabel &&
          sel.valueText === bSorted[i].valueText
        );
      };

      const existingItemIndex = state.items.findIndex(
        item => 
          item.product.id === action.payload.product.id &&
          selectionsMatch(item.selections, action.payload.selections)
      );
      
      if (existingItemIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingItemIndex].quantity += action.payload.quantity;
        return { ...state, items: newItems };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
        ),
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? action.payload.item : item
        ),
      };
    case 'CLEAR_ORDER':
      return { ...state, items: [] };
    case 'LOAD_CART':
      return { ...state, items: action.payload };
    default:
      return state;
  }
}

interface OrderContextProps {
  state: OrderState;
  dispatch: React.Dispatch<OrderAction>;
  addToOrder: (item: Omit<OrderItem, 'id'>) => void;
  removeFromOrder: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItem: (id: string, item: OrderItem) => void;
  clearOrder: () => void;
  itemCount: number;
  subtotal: number;
  knockingTotal: number;
  grandTotal: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  discountCode: string;
  setDiscountCode: (code: string) => void;
  codeStatus: 'idle' | 'checking' | 'valid' | 'invalid';
  discountsApplied: { label: string; amount: number }[];
  itemsWithPricing: any[];
}

const OrderContext = createContext<OrderContextProps | undefined>(undefined);

const CART_VERSION = 1;

export function OrderProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously (lazy init) — an effect-based load runs AFTER child
  // effects, so a refresh on /order saw an empty cart and bounced the customer
  // to /collection before the stored items ever arrived.
  const [state, dispatch] = useReducer(orderReducer, initialState, (init) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === CART_VERSION) {
          return { ...init, items: parsed.items || [] };
        }
        // Version mismatch, discard cart
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("Could not load cart from local storage", e);
      localStorage.removeItem(STORAGE_KEY);
    }
    return init;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CART_VERSION, items: state.items }));
    } catch (e) {
      console.error("Could not save cart to local storage", e);
    }
  }, [state.items]);

  const addToOrder = (item: Omit<OrderItem, 'id'>) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: { ...item, id: crypto.randomUUID() },
    });
  };

  const removeFromOrder = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const updateItem = (id: string, item: OrderItem) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, item } });
  };

  const clearOrder = () => {
    dispatch({ type: 'CLEAR_ORDER' });
  };

  const [discountCode, setDiscountCode] = useState<string>('');
  const { rules: globalRules } = usePricingConfig();

  // Discount codes are no longer fetchable by customers (admin-only). Validate
  // the entered code server-side via the RPC and feed just that one code to the
  // pricing engine.
  const [validatedCodes, setValidatedCodes] = useState<DiscountCode[]>([]);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  useEffect(() => {
    const code = discountCode.trim();
    if (!code) { setValidatedCodes([]); setCodeStatus('idle'); return; }
    setCodeStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const result = await pricingConfigService.validateDiscountCode(code);
      if (!cancelled) { setValidatedCodes(result ? [result] : []); setCodeStatus(result ? 'valid' : 'invalid'); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [discountCode]);

  const { subtotal, grandTotal, discountsApplied, itemsWithPricing } = useMemo(() => {
    let orderSubtotal = 0;
    let orderTotal = 0;
    const combinedDiscounts: { label: string; amount: number }[] = [];
    const itemsWithPricing: any[] = [];

    state.items.forEach(item => {
      // Reconstruct selections to map
      const selMap: Record<string, string> = {};
      item.selections.forEach(s => {
        selMap[s.groupId] = s.type === 'text' && s.valueText ? s.valueText : s.optionId;
      });

      const res = computePrice(item.product, selMap, {
        rules: globalRules,
        availableCodes: validatedCodes,
        discountCode
      });

      orderSubtotal += res.subtotal * item.quantity;
      orderTotal += res.total * item.quantity;
      res.discounts.forEach(d => {
        combinedDiscounts.push({ label: d.label, amount: d.amount * item.quantity });
      });

      itemsWithPricing.push({
        ...item,
        pricingResult: res
      });
    });

    return { subtotal: orderSubtotal, grandTotal: orderTotal, discountsApplied: combinedDiscounts, itemsWithPricing };
  }, [state.items, discountCode, globalRules, validatedCodes]);

  const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);

  const knockingTotal = 0; // Baked into subtotal now

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <OrderContext.Provider value={{
      state,
      dispatch,
      addToOrder,
      removeFromOrder,
      updateQuantity,
      updateItem,
      clearOrder,
      itemCount,
      subtotal,
      knockingTotal,
      grandTotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      discountCode,
      setDiscountCode,
      codeStatus,
      discountsApplied,
      itemsWithPricing,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
