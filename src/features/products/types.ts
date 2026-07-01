import { ThemedImage } from '../../types';

export interface ProductSeries {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  shortDescription?: string;
  longDescription?: string;

  tier: string;
  status: "draft" | "published" | "archived";

  gradeLabel?: string;

  // Added base level stats
  performanceMetrics?: BatPerformance;

  /** Unified attribute model — replaces `customizationGroups` (and, on sub-series, `specs`). */
  attributes?: ProductAttribute[];

  /** @deprecated legacy — migrated into `attributes`; retained for rollback. */
  customizationGroups?: CustomizationGroup[];

  createdAt: any;
  updatedAt: any;

  grade?: string;
}

export interface ProductSubSeries {
  id: string;
  seriesId: string;
  slug: string;
  name: string;
  sku: string;

  badge?: string;
  shortDescription?: string;

  basePrice: number;
  compareAtPrice?: number;

  status: "draft" | "published" | "out_of_stock";

  /** Storefront visibility + list ordering (present on real data). */
  active?: boolean;
  sortOrder?: number;

  gradeLabel?: string;

  /** Unified attribute model — replaces `specs` (fixed) + `customizationGroups` (customizable). */
  attributes?: ProductAttribute[];

  /** @deprecated legacy — migrated into fixed `attributes`; retained for rollback. */
  specs?: BatSpecs;
  media: ProductMedia[];
  seo: SEOFields;

  customizationOverrides?: Record<string, string[]>;
  includedItems?: string[];

  consultationRequired?: boolean;
  whatsappConsultationEnabled?: boolean;

  estimatedDeliveryDays?: number;

  createdAt: any;
  updatedAt: any;

  // Legacy UI compat
  /** @deprecated legacy — migrated into `attributes`; retained for rollback. */
  customizationGroups?: CustomizationGroup[];
  includedAccessories?: string[];
  grade?: string;
  warrantyMonths?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

/**
 * Unified product attribute. A single list of these replaces the old
 * `specs` (fixed facts) + `customizationGroups` (buyer-configurable options)
 * split. `mode` decides how it renders: `fixed` → spec table; `customizable`
 * → buy configurator. `key` is a canonical, stable kebab-case identifier that
 * orders/builds may reference — never rename existing keys.
 */
export interface ProductAttribute {
  id: string;
  key: string;
  label: string;
  mode: "fixed" | "customizable";
  sortOrder: number;
  active: boolean;

  // mode === "fixed"
  fixedValue?: string;

  // mode === "customizable" (reuses the CustomizationOption shape unchanged)
  required?: boolean;
  type?: "single_select" | "multi_select" | "text" | "toggle";
  options?: CustomizationOption[];
  // text-input config (only when type === "text")
  maxLength?: number;
  validationRegex?: string;
}

/** @deprecated Migrated into fixed `ProductAttribute`s. Kept as migration source + rollback. */
export interface BatSpecs {
  grainRange?: string;
  weightRange?: string;
  targetWeights?: string[];

  edgeThickness?: string;
  spineHeight?: string;

  profile?: string;
  concaving?: string;
  sweetSpot?: string;

  handleShape?: string;
  handleLength?: string;

  toeProfile?: string;
  finish?: string;
  pressing?: string;

  pickupFeel?: string;
  knockedInStatus?: string;
  oilingStatus?: string;

  // Legacy UI compat
  willowGrade?: string;
  grains?: string;
  edges?: string;
  spine?: string;
  handle?: string;
  toeProtection?: string;
  preKnockedIncluded?: boolean;
}

export interface BatPerformance {
  power: number;
  pickup: number;
  balance: number;
  control: number;
}

export interface ProductMedia {
  id: string;
  type: "image" | "video";
  url: ThemedImage;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface SEOFields {
  title: string;
  description: string;
  keywords: string[];
}

/** @deprecated Migrated into customizable `ProductAttribute`s. Kept as migration source + rollback. */
export interface CustomizationGroup {
  id: string;
  name: string;
  slug: string;

  type: "single_select" | "multi_select" | "text" | "toggle";
  required: boolean;

  options: CustomizationOption[];

  active: boolean;
  sortOrder: number;

  // Added for old ui compatibility temporarily
  label?: string;
  maxLength?: number;
  validationRegex?: string;
  enabled?: boolean;
}

export interface CustomizationOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  priceDelta: number;
  active: boolean;
  sortOrder: number;
  colorHex?: string;
  available?: boolean;
  imageUrl?: ThemedImage;
}

export type Product = any; // Alias for compat
