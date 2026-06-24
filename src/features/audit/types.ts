export interface AuditLog {
  id: string;

  actorUserId: string;
  actorName?: string;

  action:
    | "product_created"
    | "product_updated"
    | "product_archived"
    | "order_status_updated"
    | "payment_confirmed"
    | "support_status_updated"
    | "enquiry_status_updated"
    | "settings_updated";

  entityType: string;
  entityId: string;

  before?: any;
  after?: any;

  createdAt: any;
}
