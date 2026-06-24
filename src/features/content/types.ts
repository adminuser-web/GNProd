import { SEOFields } from "../products/types";

export interface ContentPage {
  slug: string;
  title: string;
  content: string;
  seo: SEOFields;
  active: boolean;
  updatedAt: any;
}
