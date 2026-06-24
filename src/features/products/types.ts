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

  gradeLabel?: string;
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
  customizationGroups?: CustomizationGroup[];
  includedAccessories?: string[];
  grade?: string;
  warrantyMonths?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

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
