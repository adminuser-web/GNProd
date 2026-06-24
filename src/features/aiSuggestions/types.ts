export interface AISuggestion {
  id: string;

  targetType:
    | "product"
    | "subSeries"
    | "seo"
    | "pricing"
    | "support_reply"
    | "enquiry_reply";

  targetId: string;

  prompt: string;
  suggestion: string;

  status: "draft" | "applied" | "dismissed";

  createdBy: string;
  appliedBy?: string;

  createdAt: any;
  appliedAt?: any;
}
