export interface SavedBuild {
  id: string;
  userId: string;

  seriesId: string;
  seriesSlug: string;
  seriesName: string;

  subSeriesId: string;
  subSeriesSlug: string;
  subSeriesName: string;

  productSnapshot: any; // Using any or specific ProductSnapshot type

  selections: BuildSelection[];

  engravingText?: string;

  priceSnapshot: PriceSnapshot;

  shareToken?: string;
  publicShareEnabled?: boolean;

  source?: "product_page" | "ai_consultant" | "order_again";

  createdAt: any;
  updatedAt: any;
}

export interface BuildSelection {
  groupId: string;
  groupLabel: string;

  optionId?: string;
  optionLabel?: string;

  type: "single_select" | "multi_select" | "text" | "toggle";

  valueText?: string;
  priceDelta: number;
}

export interface PriceSnapshot {
  basePrice: number;
  customizationTotal: number;
  total: number;
  currency: string;
}

export interface SharedBuild {
  token: string;

  ownerUserId?: string;

  seriesSlug: string;
  subSeriesSlug: string;

  buildSnapshot: any;
  priceSnapshot: PriceSnapshot;

  active: boolean;

  createdAt: any;
  expiresAt?: any;
}
