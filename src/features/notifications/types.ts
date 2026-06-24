export interface Notification {
  id: string;

  userId: string;
  roleTarget?: "customer" | "admin";

  type:
    | "order_created"
    | "order_status_changed"
    | "payment_confirmed"
    | "receipt_ready"
    | "new_enquiry"
    | "new_support_request"
    | "support_reply"
    | "enquiry_reply";

  title: string;
  message: string;
  link?: string;

  read: boolean;

  createdAt: any;
}
