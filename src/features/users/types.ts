export interface UserProfile {
  id: string;
  uid: string;
  role: "customer" | "admin";

  fullName: string;
  email: string;
  phone?: string;
  dob?: string;

  address?: Address;

  profileCompleted: boolean;
  marketingConsent?: boolean;

  createdAt: any;
  updatedAt: any;
  lastLoginAt?: any;

  adminNotes?: string;
}

export interface Address {
  countryCode: string;
  country: string;

  stateCode?: string;
  state?: string;

  city: string;
  line1: string;
  line2?: string;
  landmark?: string;
  pincode: string;
}
