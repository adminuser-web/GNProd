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

export const STATUS_TRACKER_STEPS: OrderStatus[] = [
  'Order Placed',
  'Payment Confirmed',
  'Processing',
  'Shipped', // Can be skipped if store pickup
  'Delivered' // Or Completed 
];

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

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'Order Placed': ['Payment Pending', 'Cancelled'],
  'Payment Pending': ['Payment Confirmed', 'Cancelled'],
  'Payment Confirmed': ['Processing', 'Ready for Pickup', 'Shipped', 'Cancelled'],
  'Processing': ['Ready for Pickup', 'Shipped', 'Cancelled'],
  'Ready for Pickup': ['Completed', 'Cancelled'],
  'Shipped': ['Delivered'],
  'Delivered': ['Completed'],
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

