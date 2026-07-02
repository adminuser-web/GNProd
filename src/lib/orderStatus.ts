export type OrderStatus =
  | 'Awaiting Payment'
  | 'Order Placed'
  | 'Payment Pending'
  | 'Payment Confirmed'
  | 'Processing'
  | 'Ready for Shipment'
  | 'Ready for Pickup'
  | 'Shipped'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'Awaiting Payment',
  'Order Placed',
  'Payment Pending',
  'Payment Confirmed',
  'Processing',
  'Ready for Shipment',
  'Ready for Pickup',
  'Shipped',
  'Delivered',
  'Completed',
  'Cancelled'
];

// Online order journey after payment: Processing → Ready → Shipped → Delivered.
// (Payment happens at checkout via the gateway, so "confirmed" == Processing.)
export const STAGE_FLOW: OrderStatus[] = ['Processing', 'Ready for Shipment', 'Shipped', 'Delivered'];
export const STAGE_LABELS = ['Confirmed', 'Ready to Ship', 'Shipped', 'Delivered'];

/** Index of an order in the post-payment flow. -1 = cancelled or not-yet-paid. */
export function stageIndex(status: string): number {
  const m = mapLegacyStatus(status || 'Processing');
  if (m === 'Cancelled') return -1;
  if (m === 'Awaiting Payment' || m === 'Payment Pending') return -1; // pre-payment
  if (m === 'Delivered' || m === 'Completed') return 3;
  const i = STAGE_FLOW.indexOf(m);
  return i === -1 ? 0 : i;
}

export const STATUS_TRACKER_STEPS: OrderStatus[] = STAGE_FLOW;

export const STATUS_COLORS: Record<OrderStatus, string> = {
  'Awaiting Payment': '#f59e0b', // amber — unpaid
  'Order Placed': '#eab308', // yellow
  'Payment Pending': '#f59e0b', // orange-amber
  'Payment Confirmed': '#10b981', // green
  'Processing': '#8b5cf6', // purple
  'Ready for Shipment': '#0ea5e9', // sky
  'Ready for Pickup': '#0ea5e9', // sky (legacy)
  'Shipped': '#14b8a6', // teal
  'Delivered': '#64748b', // slate
  'Completed': '#22c55e', // distinct green for completion
  'Cancelled': '#ef4444' // red
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  'Awaiting Payment': 'Awaiting Payment',
  'Order Placed': 'Order Placed',
  'Payment Pending': 'Payment Pending',
  'Payment Confirmed': 'Payment Confirmed',
  'Processing': 'Processing',
  'Ready for Shipment': 'Ready for Shipment',
  'Ready for Pickup': 'Ready for Pickup',
  'Shipped': 'Shipped',
  'Delivered': 'Delivered',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled'
};

// Online flow: Awaiting Payment → Processing → Ready for Shipment → Shipped →
// Delivered. Cancel (with refund) allowed any time BEFORE delivery; Delivered
// is terminal.
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'Awaiting Payment': ['Processing', 'Cancelled'],
  'Order Placed': ['Processing', 'Cancelled'],
  'Payment Pending': ['Processing', 'Cancelled'],
  'Payment Confirmed': ['Processing', 'Cancelled'],
  'Processing': ['Ready for Shipment', 'Cancelled'],
  'Ready for Shipment': ['Shipped', 'Cancelled'],
  'Ready for Pickup': ['Shipped', 'Cancelled'],
  'Shipped': ['Delivered', 'Cancelled'],
  'Delivered': [],
  'Completed': [],
  'Cancelled': []
};

export function mapLegacyStatus(status: string): OrderStatus {
  switch (status) {
    case 'Received': return 'Processing';
    case 'Confirmed': return 'Processing';
    case 'Payment Confirmed': return 'Processing';
    case 'Order Placed': return 'Processing';
    case 'Payment Submitted': return 'Awaiting Payment';
    case 'Payment Pending': return 'Awaiting Payment';
    case 'Crafting': return 'Processing';
    case 'In Production': return 'Processing';
    case 'Quality Check': return 'Processing';
    case 'Ready to Ship': return 'Ready for Shipment';
    case 'Ready for Pickup': return 'Ready for Shipment';
    case 'Shipped': return 'Shipped';
    case 'Delivered': return 'Delivered';
    case 'Completed': return 'Delivered';
    case 'Cancelled': return 'Cancelled';
    default:
      if (ORDER_STATUSES.includes(status as OrderStatus)) {
        return status as OrderStatus;
      }
      return 'Processing';
  }
}

