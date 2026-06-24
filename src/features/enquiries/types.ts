export type EnquiryStatus = Enquiry['status'];
export type EnquiryType = Enquiry['type'];

export interface Enquiry {
  id: string;

  userId?: string;

  customerName: string;
  customerEmail?: string;
  customerPhone: string;

  // Legacy compat
  name?: string;
  email?: string;
  phone?: string;
  productOfInterest?: string;

  type:
    | "product_enquiry"
    | "custom_build"
    | "bulk_order"
    | "pro_consultation"
    | "cleft_selection"
    | "general";

  status:
    | "new"
    | "in_review"
    | "responded"
    | "waiting_for_customer"
    | "converted_to_order"
    | "closed";

  priority?: "low" | "normal" | "high";

  productRef?: {
    seriesId?: string;
    seriesSlug?: string;
    seriesName?: string;
    subSeriesId?: string;
    subSeriesSlug?: string;
    subSeriesName?: string;
  };

  buildSnapshot?: any;

  message: string;

  source:
    | "product_page"
    | "ai_consultant"
    | "garage"
    | "contact"
    | "whatsapp_cta";

  messages?: EnquiryMessage[];

  adminNotes?: string;

  createdAt: any;
  updatedAt: any;
}

export interface EnquiryMessage {
  id: string;
  sender: "customer" | "admin" | "system";
  text: string;
  createdAt: any;
}
