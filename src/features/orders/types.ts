import { Address } from "../users/types";
import { BuildSelection } from "../builds/types";

export interface Order {
  id: string;
  orderNumber: string;

  userId: string;

  customerSnapshot: any; // Using any for snapshot
  shippingAddress: Address;

  items: OrderItem[];

  subtotal: number;
  customizationTotal: number;
  discountTotal?: number;
  total: number;
  currency: "INR";

  payment: PaymentInfo;

  status:
    | "Order Placed"
    | "Payment Pending"
    | "Payment Confirmed"
    | "Processing"
    | "Ready for Pickup"
    | "Shipped"
    | "Delivered"
    | "Completed"
    | "Cancelled";

  fulfillmentMode: "delivery" | "store_pickup";
  source: "website" | "admin_created" | "store";

  shipment?: ShipmentInfo;

  supportTicketIds?: string[];
  enquiryIds?: string[];

  timeline: OrderTimelineEvent[];

  createdAt: any;
  updatedAt: any;
}

export interface OrderItem {
  id: string;

  seriesId: string;
  seriesSlug: string;
  seriesName: string;

  subSeriesId: string;
  subSeriesSlug: string;
  subSeriesName: string;

  sku: string;
  gradeLabel: string;

  productSnapshot: any;

  selections: BuildSelection[];

  engravingText?: string;

  quantity: number;

  unitPrice: number;
  customizationTotal: number;
  lineTotal: number;
}

export interface PaymentInfo {
  status: "pending" | "submitted" | "confirmed" | "failed" | "refunded";
  method?: "upi" | "bank_transfer" | "cash" | "other";
  reference?: string;
  paidAmount?: number;
  confirmedAt?: any;
  confirmedBy?: string;
  notes?: string;
  proofImageUrl?: string;
}

export interface ShipmentInfo {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: any;
  estimatedDeliveryAt?: any;
}

export interface OrderTimelineEvent {
  status: Order["status"];
  timestamp: any;
  note?: string;
}
