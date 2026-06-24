export interface Review {
  id: string;

  customerName: string;
  customerRole?: string;

  rating?: number;
  title: string;
  text: string;

  seriesSlug?: string;
  subSeriesSlug?: string;

  verified: boolean;
  active: boolean;

  createdAt: any;
  updatedAt: any;
}
