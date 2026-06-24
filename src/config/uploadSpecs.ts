export type UploadSpecKey = 
  | 'heroImage'
  | 'seriesTile'
  | 'productPrimary'
  | 'productGallery'
  | 'customizationSwatch'
  | 'brandLogo'
  | 'contentImage'
  | 'supportAttachment'
  | 'heroVideo';

export interface UploadSpec {
  label: string;
  aspectLabel: string;
  recommendedWidth: number;
  recommendedHeight: number;
  formats: string[];
  maxBytes: number;
  hint: string;
  why: string;
}

export const UPLOAD_SPECS: Record<UploadSpecKey, UploadSpec> = {
  heroImage: {
    label: "Hero Image",
    aspectLabel: "16:9 / Landscape",
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    formats: ["JPEG", "WebP", "PNG"],
    maxBytes: 2 * 1024 * 1024,
    hint: "Use a wide, high-res dark image.",
    why: "Displayed full-width on large screens; wider images scale better across devices."
  },
  heroVideo: {
    label: "Hero Video",
    aspectLabel: "16:9 / Landscape",
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    formats: ["MP4"],
    maxBytes: 8 * 1024 * 1024,
    hint: "Keep under 8MB. Use compressed MP4.",
    why: "Videos should be short ambient loops to keep the page load fast."
  },
  seriesTile: {
    label: "Series Tile",
    aspectLabel: "4:5 / Portrait",
    recommendedWidth: 800,
    recommendedHeight: 1000,
    formats: ["JPEG", "WebP"],
    maxBytes: 1 * 1024 * 1024,
    hint: "Use a vertical, textured background.",
    why: "Used as the background for collection cards which are taller than they are wide."
  },
  productPrimary: {
    label: "Primary Product Image",
    aspectLabel: "1:1 / Square",
    recommendedWidth: 1000,
    recommendedHeight: 1000,
    formats: ["PNG (Required)"],
    maxBytes: 1.5 * 1024 * 1024,
    hint: "Transparent PNG required. Clean edges.",
    why: "Overlaps different backgrounds. Must be transparent PNG."
  },
  productGallery: {
    label: "Gallery Image",
    aspectLabel: "4:5 / Portrait",
    recommendedWidth: 1000,
    recommendedHeight: 1250,
    formats: ["JPEG", "WebP", "PNG"],
    maxBytes: 1.5 * 1024 * 1024,
    hint: "Show details clearly. Use consistent lighting.",
    why: "Displayed in sliding galleries where consistency matters."
  },
  customizationSwatch: {
    label: "Color/Swatch",
    aspectLabel: "1:1 / Square",
    recommendedWidth: 200,
    recommendedHeight: 200,
    formats: ["JPEG", "PNG"],
    maxBytes: 250 * 1024,
    hint: "Keep it small. Focus on material texture.",
    why: "Loaded many times per page for tiny selection circles."
  },
  brandLogo: {
    label: "Brand Logo",
    aspectLabel: "Any",
    recommendedWidth: 500,
    recommendedHeight: 500,
    formats: ["SVG", "PNG"],
    maxBytes: 500 * 1024,
    hint: "Transparent background, legible when small.",
    why: "Used in the navigation bar and footers."
  },
  contentImage: {
    label: "Article/Content Image",
    aspectLabel: "16:9 or 4:3",
    recommendedWidth: 1200,
    recommendedHeight: 800,
    formats: ["JPEG", "WebP", "PNG"],
    maxBytes: 1.5 * 1024 * 1024,
    hint: "Good contrast. Contextual shot.",
    why: "Standard embedded image for story pages."
  },
  supportAttachment: {
    label: "Attachment",
    aspectLabel: "Any",
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    formats: ["JPEG", "PNG", "WebP", "PDF"],
    maxBytes: 8 * 1024 * 1024,
    hint: "Make sure text/details are legible.",
    why: "Used for payment proofs or support request photos."
  }
};
