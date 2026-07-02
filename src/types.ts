import { ProductSeries, ProductSubSeries, CustomizationGroup } from './features/products/types';
import { getSubSeries } from "./draftSubSeries";

export * from './features/users/types';
export * from './features/products/types';
export * from './features/orders/types';
export * from './features/builds/types';
export * from './features/enquiries/types';
export * from './features/support/types';
export * from './features/notifications/types';
export * from './features/content/types';
export * from './features/settings/types';
export * from './features/reviews/types';
export * from './features/audit/types';
export * from './features/aiSuggestions/types';
export type { OrderStatus } from './lib/orderStatus';

// Legacy types for compatibility
export type EnquiryStatus = any;
export type OrderRecord = any;

// Payment on an order. Paid at checkout via the Razorpay gateway (UPI/GPay/card);
// `gateway`/`razorpayOrderId`/`razorpayPaymentId` are set on success. Legacy
// manual-UPI fields remain permissive ([k: string]: any) for old records.
export type PaymentStatus =
  | 'pending'        // order placed, no payment action yet
  | 'submitted'      // customer reports paid (UPI ref / proof) — awaiting admin check
  | 'confirmed'      // payment verified by admin (seen in bank)
  | 'failed'
  | 'refunded';

export interface OrderPayment {
  status: PaymentStatus;
  paidAmount?: number;
  method?: string;                 // 'upi' | 'bank_transfer' | 'cash' | ...
  reference?: string;              // UPI UTR / bank reference
  notes?: string;
  proofImageUrl?: string;          // payment screenshot upload
  confirmedAt?: any;
  confirmedBy?: string;
  [k: string]: any;
}
export type SupportTicketMessage = any;
export type TicketAttachment = any;
export type OrderItemSelection = any;

export type Product = any;

export const BRAND = {
  whatsappNumber: "918939568005",
  whatsappDisplay: "+91 89395 68005",
  email: "CONNECT@GRAINOOD.COM",
  instagramUrl: "https://www.instagram.com/grainood",
  instagramHandle: "@grainood",
};

export type ThemedImage = string | { light?: string; dark?: string };

export interface BrandContent {
  brandName: string;
  logoUrl: ThemedImage;
  faviconUrl?: string;
  tagline: string;
  contact: { phone: string; whatsapp: string; email: string; instagram: string; };
  store: { address: string; hours: string; mapLink: string; };
  social?: { instagram?: string; facebook?: string; youtube?: string; };
  // Gmail account that order emails are composed FROM (admin opens a pre-filled
  // Gmail draft in this account). `authuser` targets it even with multiple
  // Google accounts signed in. Configured in admin → Content → Brand.
  orderEmailFrom?: string;
}

export interface HomeContent {
  hero: { headline: string; subheadline: string; bgImageUrl: ThemedImage; videoUrl: string; primaryCtaLabel: string; primaryCtaLink: string; secondaryCtaLabel: string; secondaryCtaLink: string; };
  sections: any[]; 
  featured: { heading: string; copy: string; };
  socialProof: any[];
}

export interface PhilosophyContent {
  heading: string;
  copy: string;
}

export interface ContactContent {
  heading: string;
  intro: string;
  faqs?: { question: string; answer: string; }[];
}

export interface FooterContent {
  columns: any[];
  bottomCopy: string;
}

export interface LegalContent {
  privacy: { title: string; body: string; };
  terms: { title: string; body: string; };
  returns: { title: string; body: string; };
}

export interface SeoContent {
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: ThemedImage;
}

export interface Review {
  name: string;
  rating: number;
  text: string;
  verified: boolean;
  productId?: string;
}

export interface ReviewsContent {
  reviews: Review[];
}

export interface MaintenanceContent {
  /** When true, public visitors see the "Launching Soon" splash. */
  enabled: boolean;
  headline: string;
  subtext: string;
  /** Hero image (a bat product shot on a dark background) glowing beside the copy. */
  heroImage?: string;
  /** Shareable bypass token: /?preview=<secret> unlocks the full site in that browser. */
  bypassSecret: string;
}

export interface SiteContentMap {
  brand: BrandContent;
  home: HomeContent;
  philosophy: PhilosophyContent;
  contact: ContactContent;
  footer: FooterContent;
  legal: LegalContent;
  seo: SeoContent;
  reviews: ReviewsContent;
  maintenance: MaintenanceContent;
}

export const DEFAULT_SITE_CONTENT: SiteContentMap = {
  brand: {
    brandName: "GRAINOOD",
    logoUrl: "",
    faviconUrl: "/favicon.svg",
    tagline: "Handcrafted English Willow",
    contact: {
      phone: "+91 89395 68005",
      whatsapp: "+91 89395 68005",
      email: "CONNECT@GRAINOOD.COM",
      instagram: "https://www.instagram.com/grainood"
    },
    store: {
      address: "12/42, F Type, 4th Main Road, Sidco Nagar, Villivakkam, Chennai-600049, Tamil Nadu",
      hours: "Mon-Sat 10am-8pm",
      mapLink: "#"
    },
    social: {
      instagram: "grainood",
      facebook: "",
      youtube: ""
    },
    orderEmailFrom: "adminuser@grainood.com"
  },
  home: {
    hero: {
      headline: "THE EVOLUTION OF PERFORMANCE.",
      subheadline: "Masterfully crafted willow. Engineered for absolute dominance at the crease.",
      bgImageUrl: "/hero-bat.webp",
      videoUrl: "",
      primaryCtaLabel: "EXPLORE COLLECTION",
      primaryCtaLink: "/collection",
      secondaryCtaLabel: "WATCH THE FILM",
      secondaryCtaLink: "#"
    },
    sections: [],
    featured: {
      heading: "THE COLLECTION",
      copy: "The Grainood series — re-engineered for greater balance, stiffness, and control. Made to handle express pace and punishing spin with equal precision."
    },
    socialProof: []
  },
  philosophy: {
    heading: "PERFORMANCE ENGINEERED",
    copy: "Batting is more than runs. It's control in every drive, perfect balance in your stance, and total confidence when the ball meets the middle. Grainood bats carry an obsession with detail and a singular focus on raw power. The result is a batting experience built on precision and trust."
  },
  contact: {
    heading: "Contact Us",
    intro: "Have a question about our bats or need help with a custom order? Get in touch.",
    faqs: [
      {
        question: "What is your delivery time?",
        answer: "Every bat is made to order and meticulously hand-crafted. Please allow 4–6 weeks from order confirmation to delivery."
      },
      {
        question: "Do you ship internationally?",
        answer: "Yes, we ship globally."
      }
    ]
  },
  footer: {
    columns: [
      {
        title: "SHOP",
        links: [
          { label: "All Collection", url: "/collection" },
          { label: "AI Bat Consultant", url: "/bat-consultant" },
          { label: "Compare Series", url: "/comparison" }
        ]
      },
      {
        title: "HELP",
        links: [
          { label: "Support", url: "/my-requests" },
          { label: "Shipping Info", url: "/shipping" },
          { label: "Returns", url: "/refund" },
          { label: "Bat Care Guide", url: "/bat-care" },
          { label: "Privacy Policy", url: "/privacy" }
        ]
      },
      {
        title: "COMPANY",
        links: [
          { label: "About Us", url: "/about" },
          { label: "Contact", url: "/contact" },
          { label: "Locate Us", url: "/locate-us" }
        ]
      }
    ],
    bottomCopy: "© 2026 GRAINOOD CRICKET. ALL RIGHTS RESERVED."
  },
  legal: {
    privacy: { title: "Privacy Policy", body: "Privacy policy content." },
    terms: { title: "Terms of Service", body: "Terms of service content." },
    returns: { title: "Returns & Refunds", body: "Returns policy content." }
  },
  seo: {
    defaultTitle: "Grainood | Premium English Willow Cricket Bats",
    defaultDescription: "Explore premium English Willow cricket bats from Grainood. Compare bat series, customize your build, use the AI Bat Consultant, and find the right bat for your game.",
    defaultOgImage: ""
  },
  reviews: {
    reviews: [
      { name: "INTERNATIONAL PRO", rating: 5, text: "The pickup on the Immortal is unmatched. I've never felt this kind of balance.", verified: true },
      { name: "FIRST CLASS PLAYER", rating: 5, text: "Absolute destructive power. It pings like nothing I've ever used.", verified: true }
    ]
  },
  maintenance: {
    // Ships OFF so it never blacks out the site until an admin turns it on.
    enabled: false,
    headline: "Launching Soon",
    subtext: "Something special is being crafted. Our handcrafted English Willow collection arrives shortly.",
    heroImage: "https://ycebmqpayiiejcfukjra.supabase.co/storage/v1/object/public/media/products/debutant/1782887114344-DebutantCover.png",
    bypassSecret: "grainood-preview"
  }
};

export interface PricingRule {
  id: string;
  label: string;
  type: 'flat' | 'percent';
  amount: number;
  appliesTo?: 'order' | 'group' | 'option';
  target?: string;
  active: boolean;
  startsAt?: number;
  endsAt?: number;
}

export interface DiscountCode {
  code: string;
  type: 'flat' | 'percent';
  amount: number;
  active: boolean;
  expiresAt?: number;
}

const CUSTOMIZATION_LIBRARY: any = {
  'bat-size': {
    id: "bat-size",
    label: "Bat Size",
    type: "single_select",
    required: true,
    options: [
      { id: "size-sh", label: "Short Handle", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "size-harrow", label: "Harrow", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "size-6", label: "Size 6", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "size-lh", label: "Long Handle (Premium only)", priceDelta: 500, value: "", active: true, sortOrder: 0 },
    ]
  },
  'toe-shape': {
    id: "toe-shape",
    label: "Toe Profile",
    type: "single_select",
    required: true,
    options: [
      { id: "toe-round", label: "Round", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "toe-semi-square", label: "Semi-square", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "toe-square", label: "Square", priceDelta: 0, value: "", active: true, sortOrder: 0 },
    ]
  },
  'grip-color': {
    id: "grip-color",
    label: "Grip Colour",
    type: "single_select",
    required: true,
    options: [
      { id: "grip-white", label: "White", priceDelta: 0, colorHex: "#ffffff", value: "", active: true, sortOrder: 0 },
      { id: "grip-black", label: "Black", priceDelta: 0, colorHex: "#000000", value: "", active: true, sortOrder: 0 },
      { id: "grip-red", label: "Red", priceDelta: 0, colorHex: "#ff0000", value: "", active: true, sortOrder: 0 },
      { id: "grip-blue", label: "Blue", priceDelta: 0, colorHex: "#0000ff", value: "", active: true, sortOrder: 0 },
    ]
  },
  'handle-shape': {
    id: "handle-shape",
    label: "Handle Shape",
    type: "single_select",
    required: true,
    options: [
      { id: "handle-round", label: "Round", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "handle-semi", label: "Semi-Oval", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "handle-oval", label: "Oval", priceDelta: 0, value: "", active: true, sortOrder: 0 },
    ]
  },
  'weight-profile': {
    id: "weight-profile",
    label: "Target Weight",
    type: "single_select",
    required: true,
    options: [
      { id: "w-2-7", label: "2lb 7oz", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "w-2-8", label: "2lb 8oz", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "w-2-9", label: "2lb 9oz", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "w-2-10", label: "2lb 10oz", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "w-2-11", label: "2lb 11oz", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "w-2-12", label: "2lb 12oz", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "w-custom", label: "Custom weight (Premium only)", priceDelta: 500, value: "", active: true, sortOrder: 0 },
    ]
  },
  'edge-profile': {
    id: "edge-profile",
    label: "Edge Profile",
    type: "single_select",
    required: true,
    options: [
      { id: "edge-36", label: "36mm", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "edge-38", label: "38mm", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "edge-40", label: "40mm", priceDelta: 500, value: "", active: true, sortOrder: 0 },
    ]
  },
  'sweet-spot': {
    id: "sweet-spot",
    label: "Sweet Spot",
    type: "single_select",
    required: true,
    options: [
      { id: "spot-low", label: "Low", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "spot-mid", label: "Mid", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "spot-high", label: "High", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "spot-custom", label: "Custom (Premium only)", priceDelta: 1000, value: "", active: true, sortOrder: 0 },
    ]
  },
  'engraving': {
    id: "engraving",
    label: "Personal Engraving",
    type: "text",
    maxLength: 12,
    validationRegex: "^[A-Za-z0-9 ]{0,12}$",
    required: false,
    options: [
      { id: "engraving-yes", label: "Add Custom Engraving", priceDelta: 1500, value: "", active: true, sortOrder: 0 },
    ]
  },
  'pre-knocked': {
    id: "pre-knocked",
    label: "Knock-in Service",
    type: "toggle",
    required: false,
    options: [
      { id: "knocked-raw", label: "Raw / not knocked", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "knocked-yes", label: "Pre-knocked", priceDelta: 499, value: "", active: true, sortOrder: 0 },
      { id: "knocked-match", label: "Match-prep service", priceDelta: 999, value: "", active: true, sortOrder: 0 },
    ]
  },
  'handle-length': {
    id: "handle-length",
    label: "Handle Length",
    type: "single_select",
    required: true,
    options: [
      { id: "handle-std", label: "Standard", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "handle-short", label: "Short", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "handle-long", label: "Long", priceDelta: 0, value: "", active: true, sortOrder: 0 },
    ]
  },
  'bat-profile': {
    id: "bat-profile",
    label: "Bat Profile",
    type: "single_select",
    required: true,
    options: [
      { id: "profile-balanced", label: "Balanced profile", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "profile-full", label: "Full profile", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "profile-duckbill", label: "Duckbill profile", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "profile-low-ff", label: "Low-profile front-foot setup", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "profile-power", label: "Power profile", priceDelta: 0, value: "", active: true, sortOrder: 0 },
    ]
  },
  'finish': {
    id: "finish",
    label: "Finish",
    type: "single_select",
    required: true,
    options: [
      { id: "finish-natural", label: "Natural finish", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "finish-scuff", label: "Anti-scuff applied", priceDelta: 250, value: "", active: true, sortOrder: 0 },
      { id: "finish-polished", label: "Premium polished finish", priceDelta: 0, value: "", active: true, sortOrder: 0 },
      { id: "finish-match", label: "Match-ready finish", priceDelta: 0, value: "", active: true, sortOrder: 0 },
    ]
  },
  'accessories': {
    id: "accessories",
    label: "Accessories",
    type: "toggle",
    required: false,
    options: [
      { id: "acc-scuff", label: "Anti-scuff Sheet", priceDelta: 250, value: "", active: true, sortOrder: 0 },
      { id: "acc-toe", label: "Extra Toe Guard", priceDelta: 150, value: "", active: true, sortOrder: 0 },
    ]
  }
};

function buildCustomizationGroups(enabledKeys: string[], priceOverrides?: Record<string, number>): any[] {
  const allKeys = [
    "bat-size", "toe-shape", "grip-color", "handle-shape", "handle-length", 
    "weight-profile", "bat-profile", "edge-profile", "sweet-spot", "finish", 
    "engraving", "pre-knocked", "accessories"
  ];
  return allKeys.map(key => ({
    ...CUSTOMIZATION_LIBRARY[key],
    enabled: enabledKeys.includes(key),
    options: CUSTOMIZATION_LIBRARY[key].options.map(opt => ({ 
      ...opt,
      priceDelta: priceOverrides?.[opt.id] !== undefined ? priceOverrides[opt.id] : opt.priceDelta
    }))
  }));
}

const generateSubSeries = (baseSlug: string, baseName: string, baseGrade: string, basePrice: number, sortOrderStart: number) => {
  return Array.from({length: 4}).map((_, i) => {
    const num = i + 1;
    return {
      id: `${baseSlug}-v${num}`,
      slug: `${baseSlug}-v${num}`,
      name: `${baseName} Series ${num}`,
      sku: `SKU-${baseSlug.toUpperCase()}-${num}`,
      active: true,
      sortOrder: sortOrderStart + i,
      grade: baseGrade,
      gradeLabel: baseGrade,
      basePrice: basePrice + (i * 1000),
      tagline: `${baseName} standard edition ${num}`,
      shortDescription: `Placeholder description matching ${baseName} ${num}`,
      longDescription: `Extended description for ${baseName} ${num}`,
      idealFor: ['Club', 'League'],
      playerLevel: 'Intermediate',
      playingStyle: 'All-round',
      estimatedDeliveryDays: 14,
      warrantyMonths: 12,
      includedAccessories: ['Bat Cover'],
      specs: {
        willowGrade: baseGrade,
        grains: '6-8',
        weightRange: '2.8-2.10',
        profile: 'Mid',
        edges: '38mm',
        spine: '62mm',
        handle: 'Short Handle',
        sweetSpot: 'Mid',
        finish: 'Natural',
        pressing: 'Standard',
        pickupFeel: 'Light',
        toeProtection: 'Rubber Guard',
        preKnockedIncluded: false
      },
      media: {
        primaryImage: '/product-bat.webp'
      },
      performance: {
        power: 80,
        pickup: 80,
        balance: 80,
        control: 80
      }
    };
  });
};

export const PUBLISHED_PRODUCTS: any[] = [
  {
    id: "p1",
    slug: "debutant",
    name: "DEBUTANT",
    tagline: "Where the Journey Begins",
    tier: "ENTRY LEVEL — ENGLISH WILLOW",
    grade: "Grade 4 English Willow",
    price: 14999,
    basePrice: 14999,
    imageUrl: "/product-bat.webp",
    galleryImages: ["/product-bat.webp", "/product-bat.webp"],
    badge: "Best for Beginners",
    description: "A premium club-grade bat that punches well above its price. Designed to provide maximum value without compromising on profile or performance. The Debutant offers a solid, balanced pickup and extended sweet spot for players refining their technique.",
    idealFor: "Beginners, casual match players, and early club players",
    playerLevel: "Beginner",
    playingStyle: "All-round",
    seoTitle: "Debutant English Willow Cricket Bat | Grainood",
    seoDescription: "Buy Debutant by Grainood, a Grade 4 English Willow cricket bat built for beginners. Explore specs, pickup, profile, customization options, and pricing.",
    seoKeywords: ["English Willow cricket bat", "Grade 4 English Willow bat", "beginners cricket bat", "handmade cricket bat India"],
    estimatedDeliveryDays: 14,
    warrantyMonths: 6,
    sku: "GRN-DEB-01",
    includedAccessories: ["Bat Cover", "Extra Grip"],
    willowGrade: "Grade 4 English Willow",
    grains: "4–6 visible grains",
    weightRange: "2lb 8oz – 2lb 11oz",
    performanceMetrics: { power: 75, pickup: 85, balance: 80, control: 85 },
    active: true,
    sortOrder: 1,
    customizationGroups: buildCustomizationGroups(["bat-size", "toe-shape", "grip-color"]),
    subSeries: getSubSeries('debutant')
  },
  {
    id: "p2",
    slug: "millennium",
    name: "MILLENNIUM",
    tagline: "Built for the Grind",
    tier: "CLUB / LEAGUE — ENGLISH WILLOW",
    grade: "Grade 3 English Willow",
    price: 24999,
    basePrice: 24999,
    imageUrl: "/product-bat.webp",
    galleryImages: ["/product-bat.webp", "/product-bat.webp"],
    badge: "Best Value",
    description: "Engineered for durability and consistent performance in demanding conditions. The Millennium features a mid-to-full profile designed for powerful drives. Solid edge structure ensures maximum power transfer directly into the shot.",
    idealFor: "Regular club players and league starters",
    playerLevel: "Intermediate",
    playingStyle: "All-round",
    seoTitle: "Millennium English Willow Cricket Bat | Grainood",
    seoDescription: "Buy Millennium by Grainood, a Grade 3 English Willow cricket bat built for club players. Explore specs, pickup, profile, customization options, and pricing.",
    seoKeywords: ["English Willow cricket bat", "Grade 3 English Willow bat", "cricket bat pickup and balance", "Grainood cricket bat"],
    estimatedDeliveryDays: 14,
    warrantyMonths: 6,
    sku: "GRN-MIL-02",
    includedAccessories: ["Premium Bat Cover", "Extra Grip"],
    willowGrade: "Grade 3 English Willow",
    grains: "5–7 visible grains",
    weightRange: "2lb 8oz – 2lb 12oz",
    performanceMetrics: { power: 85, pickup: 80, balance: 85, control: 85 },
    active: true,
    sortOrder: 2,
    customizationGroups: buildCustomizationGroups(["bat-size", "toe-shape", "grip-color", "handle-shape", "pre-knocked"]),
    subSeries: getSubSeries('millennium')
  },
  {
    id: "p3",
    slug: "legend",
    name: "LEGEND",
    tagline: "Earn the Name",
    tier: "PREMIER — ENGLISH WILLOW",
    grade: "Grade 1 English Willow",
    price: 34999,
    basePrice: 34999,
    imageUrl: "/product-bat.webp",
    galleryImages: ["/product-bat.webp", "/product-bat.webp"],
    badge: "Best Pickup",
    description: "A testament to handmade excellence and premium materials. Featuring an optimal profile and minimal concaving, the Legend maintains a featherlight pickup relative to its size. Perfect for elegant stroke makers requiring absolute precision.",
    idealFor: "Serious club/league players",
    playerLevel: "Advanced",
    playingStyle: "Stroke Maker",
    seoTitle: "Legend English Willow Cricket Bat | Grainood",
    seoDescription: "Buy Legend by Grainood, a Grade 1 English Willow cricket bat built for serious club players. Explore specs, pickup, profile, customization options, and pricing.",
    seoKeywords: ["premium cricket bat", "Grade 1 English Willow bat", "cricket bat for stroke players", "custom English Willow bat India"],
    estimatedDeliveryDays: 21,
    warrantyMonths: 12,
    sku: "GRN-LEG-03",
    includedAccessories: ["Padded Bat Cover", "Two Extra Grips", "Anti-scuff Sheet"],
    willowGrade: "Grade 1 English Willow",
    grains: "7–10 visible grains",
    weightRange: "2lb 7oz – 2lb 10oz",
    performanceMetrics: { power: 90, pickup: 90, balance: 95, control: 90 },
    active: true,
    sortOrder: 3,
    customizationGroups: buildCustomizationGroups(["bat-size", "toe-shape", "grip-color", "handle-shape", "pre-knocked", "weight-profile", "accessories"]),
    subSeries: getSubSeries('legend')
  },
  {
    id: "p4",
    slug: "eternal",
    name: "ETERNAL",
    tagline: "Timeless Power",
    tier: "PRO — ENGLISH WILLOW",
    grade: "Grade 1+ English Willow",
    price: 44999,
    basePrice: 44999,
    imageUrl: "/product-bat.webp",
    galleryImages: ["/product-bat.webp", "/product-bat.webp"],
    badge: "Best Power",
    description: "Built for dominance at the highest levels of the game. Using air-dried, player-spec clefts, the Eternal features an imposing full profile for unmatched power. An expanded sweet spot ensures maximum punishment across the line.",
    idealFor: "Aggressive advanced players",
    playerLevel: "Advanced",
    playingStyle: "Power Hitter",
    seoTitle: "Eternal English Willow Cricket Bat | Grainood",
    seoDescription: "Buy Eternal by Grainood, a Premium Grade 1+ English Willow cricket bat built for power hitters. Explore specs, pickup, profile, customization options, and pricing.",
    seoKeywords: ["cricket bat for power hitting", "professional cricket bat", "Grade 1+ English Willow bat", "Grainood cricket bat"],
    estimatedDeliveryDays: 28,
    warrantyMonths: 12,
    sku: "GRN-ETE-04",
    includedAccessories: ["Tour Edition Cover", "Pro Grips", "Maintenance Kit"],
    willowGrade: "Grade 1+ English Willow",
    grains: "8–12 visible grains",
    weightRange: "2lb 8oz – 2lb 12oz",
    performanceMetrics: { power: 98, pickup: 92, balance: 90, control: 95 },
    active: true,
    sortOrder: 4,
    customizationGroups: buildCustomizationGroups(
      ["bat-size", "toe-shape", "grip-color", "handle-shape", "weight-profile", "bat-profile", "edge-profile", "sweet-spot", "finish", "engraving", "pre-knocked", "accessories"],
      {
        "edge-40": 1000,
        "edge-max": 1500
      }
    ),
    subSeries: getSubSeries('eternal')
  },
  {
    id: "p5",
    slug: "immortal",
    name: "IMMORTAL",
    tagline: "One Bat. Forever Remembered.",
    tier: "PRO RESERVE — ENGLISH WILLOW",
    grade: "Pro Reserve Grade 1+ selected English Willow",
    price: 59999,
    basePrice: 59999,
    isFlagship: true,
    limitedEdition: true,
    maxAnnualUnits: 50,
    imageUrl: "/product-bat.webp",
    galleryImages: ["/product-bat.webp", "/product-bat.webp"],
    badge: "Premium Choice",
    description: "The pinnacle of bat-making excellence. Crafted from the top 1% of Pro Reserve willow, it offers an international-spec full profile. Highly exclusive, only a limited number are produced annually, with each bat sequentially numbered and personally signed by our master craftsman.",
    idealFor: "Professional/premium buyers",
    playerLevel: "Professional",
    playingStyle: "All-round",
    seoTitle: "Immortal Pro Reserve English Willow Cricket Bat | Grainood",
    seoDescription: "Buy Immortal by Grainood, a Pro Reserve English Willow cricket bat built for professionals. Explore specs, pickup, profile, customization options, and pricing.",
    seoKeywords: ["Pro Reserve English Willow bat", "professional cricket bat", "custom English Willow bat India", "handmade cricket bat India"],
    estimatedDeliveryDays: 45,
    warrantyMonths: 24,
    sku: "GRN-IMM-05",
    includedAccessories: ["Presentation Case", "Mastercraft Maintenance Kit", "Certificate of Authenticity"],
    willowGrade: "Pro Reserve Grade 1+ selected English Willow",
    grains: "10–14+ visible grains where available",
    weightRange: "Custom",
    performanceMetrics: { power: 100, pickup: 98, balance: 100, control: 98 },
    active: true,
    sortOrder: 5,
    customizationGroups: buildCustomizationGroups(
      ["bat-size", "toe-shape", "grip-color", "handle-shape", "handle-length", "weight-profile", "bat-profile", "edge-profile", "sweet-spot", "finish", "engraving", "pre-knocked", "accessories"],
      {
        "edge-40": 1500,
        "edge-max": 2500,
        "engraving-yes": 2500,
        "knocked-yes": 1499
      }
    ),
    subSeries: getSubSeries('immortal')
  }
];
