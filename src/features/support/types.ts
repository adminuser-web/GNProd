export interface SupportTicket {
  id: string;

  userId: string;

  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  orderId?: string;
  orderNumber?: string;
  orderItemId?: string;

  // Legacy compat
  orderCode?: string;
  eligibility?: any;

  type:
    | "order_query"
    | "warranty_claim"
    | "repair_request"
    | "return_request"
    | "general";

  subject: string;
  description: string;

  status:
    | "open"
    | "under_review"
    | "waiting_for_customer"
    | "approved"
    | "rejected"
    | "resolved"
    | "closed";

  priority?: "low" | "normal" | "high";

  messages: SupportMessage[];

  attachments?: Attachment[];

  internalNotes?: InternalNote[];

  createdAt: any;
  updatedAt: any;
}

export interface SupportMessage {
  id: string;
  sender: "customer" | "admin" | "system";
  text: string;
  createdAt: any;
  // Legacy compat
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  // Legacy compat
  contentType?: string;
}

export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
}

// Legacy compat
export const RETURN_POLICY = {
  enabled: true,
  allowedSources: ['website'],
  returnWindowDays: 14,
  policyText: 'Standard return policy'
};
