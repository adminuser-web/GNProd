import { Address } from "../users/types";

export interface BrandSettings {
  brandName: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  instagramUrl?: string;
  storeAddress?: Address;
}

export interface PaymentSettings {
  acceptedMethods: ("upi" | "bank_transfer" | "cash")[];
  upiId?: string;
  bankDetails?: string;
  paymentInstructions: string;
}

export interface ReturnPolicySettings {
  enabled: boolean;
  allowedSources: ("website" | "store")[];
  returnWindowDays: number;
  policyText: string;
}
