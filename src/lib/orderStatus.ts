export type OrderStatus = 
  | 'Order Placed' 
  | 'Payment Pending' 
  | 'Payment Confirmed' 
  | 'Processing' 
  | 'Ready for Pickup'
  | 'Shipped' 
  | 'Delivered' 
  | 'Completed'
  | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'Order Placed',
  'Payment Pending',
  'Payment Confirmed',
  'Processing',
  'Ready for Pickup',
  'Shipped',
  'Delivered',
  'Completed',
  'Cancelled'
];

// Unified 4-stage customer/admin journey (payment is folded into stage 1→2).
export const STAGE_FLOW: OrderStatus[] = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];
export const STAGE_LABELS = ['Placed', 'Processing', 'Shipped', 'Delivered'];

/** Index of an order in the 4-stage flow (legacy statuses mapped in). -1 = cancelled. */
export function stageIndex(status: string): number {
  if (!status) return 0;
  const m = mapLegacyStatus(status);
  if (m === 'Cancelled') return -1;
  if (m === 'Payment Pending') return 0;
  if (m === 'Payment Confirmed') return 1;     // confirmed = into Processing
  if (m === 'Ready for Pickup') return 2;      // ~ shipped stage
  if (m === 'Completed') return 3;
  const i = STAGE_FLOW.indexOf(m);
  return i === -1 ? 0 : i;
}

export const STATUS_TRACKER_STEPS: OrderStatus[] = STAGE_FLOW;

export const STATUS_COLORS: Record<OrderStatus, string> = {
  'Order Placed': '#eab308', // yellow
  'Payment Pending': '#f59e0b', // orange-amber
  'Payment Confirmed': '#10b981', // green
  'Processing': '#8b5cf6', // purple
  'Ready for Pickup': '#0ea5e9', // sky
  'Shipped': '#14b8a6', // teal
  'Delivered': '#64748b', // slate
  'Completed': '#22c55e', // distinct green for completion
  'Cancelled': '#ef4444' // red
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  'Order Placed': 'Order Placed',
  'Payment Pending': 'Payment Pending',
  'Payment Confirmed': 'Payment Confirmed',
  'Processing': 'Processing',
  'Ready for Pickup': 'Ready for Pickup',
  'Shipped': 'Shipped',
  'Delivered': 'Delivered',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled'
};

// Unified flow: Placed → Processing → Shipped → Delivered. Cancel allowed any
// time BEFORE delivery; Delivered is terminal (no reversal).
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'Order Placed': ['Processing', 'Cancelled'],
  'Payment Pending': ['Processing', 'Cancelled'],
  'Payment Confirmed': ['Processing', 'Shipped', 'Cancelled'],
  'Processing': ['Shipped', 'Cancelled'],
  'Ready for Pickup': ['Delivered', 'Cancelled'],
  'Shipped': ['Delivered', 'Cancelled'],
  'Delivered': [],
  'Completed': [],
  'Cancelled': []
};

export function mapLegacyStatus(status: string): OrderStatus {
  switch (status) {
    case 'Received': return 'Payment Pending';
    case 'Confirmed': return 'Payment Confirmed';
    case 'Payment Submitted': return 'Payment Pending';
    case 'Crafting': return 'Processing';
    case 'In Production': return 'Processing';
    case 'Quality Check': return 'Processing';
    case 'Ready to Ship': return 'Processing';
    case 'Shipped': return 'Shipped';
    case 'Delivered': return 'Delivered';
    case 'Cancelled': return 'Cancelled';
    default:
      if (ORDER_STATUSES.includes(status as OrderStatus)) {
        return status as OrderStatus;
      }
      return 'Payment Pending'; 
  }
}

