import React from 'react';
import { LegalPage, LegalSection } from './LegalPage';
import { useContent } from '../context/ContentContext';

const BAT_CARE_SECTIONS: LegalSection[] = [
  {
    heading: "Oiling & Preparation",
    content: [
      "Natural English Willow requires careful preparation. If you have not selected our pre-knocking service, you must apply a light coat of raw linseed oil to the face, edges, and toe before any use. Avoid oiling the splice or the back of the bat.",
      "Allow the bat to lie horizontally for at least 24 hours after oiling. Do not over-oil, as this can deaden the wood and reduce the bat's natural resonance."
    ]
  },
  {
    heading: "Knocking-In",
    content: [
      "Wait until the oil has fully dried before beginning the knocking-in process. Use a wooden bat mallet to carefully strike the face, gradually increasing force over 4 to 6 hours of continuous work.",
      "Pay special attention to the edges and the toe, striking at a 45-degree angle to gently round and harden them. Never strike the edges directly or the back of the bat."
    ]
  },
  {
    heading: "Storage & Natural Wear",
    content: [
      "Always store your bat in a cool, dry place away from direct sunlight, central heating, or the boot of a car. Extreme temperatures can cause the willow to dry out, warp, or crack prematurely.",
      "Surface cracking, slight denting, and minor edge damage are entirely natural characteristics of English Willow yielding to hard leather balls. These do not compromise performance and are not considered manufacturing defects. Regular maintenance with a scuff sheet and edge tape will prolong its lifespan."
    ]
  },
  {
    heading: "Refurbishment",
    content: [
      "When your bat begins to show significant signs of battle-wear, our workshop offers a full refurbishment service. We will strip, sand, repair minor cracks, re-oil, and apply fresh stickers to breathe new life into your weapon."
    ]
  }
];

export function BatCarePage() {
  const legalContent = useContent('legal');
  const careContent = (legalContent as any)?.batCare;
  return <LegalPage title={careContent?.title || "Bat Care Guide"} kicker="Protecting The Craft" body={careContent?.body} sections={!careContent?.body ? BAT_CARE_SECTIONS : undefined} />;
}

const SHIPPING_SECTIONS: LegalSection[] = [
  {
    heading: "The Crafting Window",
    content: [
      "Every Grainood bat is crafted specifically to order. We do not pull finished bats from a shelf. Because we hand-shape, balance, and press every piece based on your selected specifications, please allow a 4-to-6 week crafting window from the moment we confirm your order."
    ]
  },
  {
    heading: "Dispatch & Updates",
    content: [
      "True craftsmanship takes time. We will keep you updated on the progress of your bat via WhatsApp. Once the final finishing and oiling are complete, you will receive a dispatch notification along with your tracking details."
    ]
  },
  {
    heading: "Pan-India & International Courier",
    content: [
      "We securely ship our bats across India and to major international cricketing destinations. Shipping costs and estimated transit times vary based on your location and will be calculated and communicated during your order confirmation."
    ]
  }
];

export function ShippingPage() {
  const legalContent = useContent('legal');
  const shippingContent = (legalContent as any)?.shipping;
  return <LegalPage title={shippingContent?.title || "Shipping & Delivery"} kicker="From Workshop To Pitch" body={shippingContent?.body} sections={!shippingContent?.body ? SHIPPING_SECTIONS : undefined} />;
}

const REFUND_SECTIONS: LegalSection[] = [
  {
    heading: "Cancellations & Refunds",
    content: [
      "You pay securely at checkout. You may cancel for a full refund any time before we begin crafting your bat — typically within 24 hours of placing the order. Approved refunds are issued to your original payment method via our payment partner (Razorpay) within 5–7 business days.",
      "Because every bat is then custom-crafted to your exact weight, handle, and aesthetic specifications, orders cannot be cancelled or refunded once the shaping process has begun in our workshop. Please be certain of your specifications before paying."
    ]
  },
  {
    heading: "Manufacturing Defects",
    content: [
      "We take absolute pride in our quality control. If you notice a clear manufacturing defect upon receiving your bat (such as a delaminated splice or handle failure), please notify us within 30 days of delivery. We will inspect the issue and replace the bat if the defect is confirmed as a structural failure."
    ]
  },
  {
    heading: "Natural Wear is Not a Defect",
    content: [
      "English Willow is a soft, natural fibrous material designed to hit a hard leather ball. Surface cracks, indentations, and edge wear are inevitable and represent the natural breaking-in process. Damage caused by yorkers, poor running, or damp conditions does not constitute a defect."
    ]
  }
];

export function RefundPage() {
  const legalContent = useContent('legal');
  const returnsContent = (legalContent as any)?.returns;
  return <LegalPage title={returnsContent?.title || "Refund & Replacement"} kicker="Our Policy" body={returnsContent?.body} sections={!returnsContent?.body ? REFUND_SECTIONS : undefined} />;
}

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "Local Storage & Order Data",
    content: [
      "Your cart items and configurations are stored locally on your device while you browse. Your details are transmitted to Grainood only when you place your order and complete payment at checkout."
    ]
  },
  {
    heading: "Payment Security",
    content: [
      "Payments are processed securely by our PCI-DSS-compliant payment partner, Razorpay. Your card, UPI, and bank details go directly to the gateway — the Grainood website never sees or stores your full payment credentials."
    ]
  },
  {
    heading: "Communication",
    content: [
      "By placing an order or submitting an enquiry, you agree to be contacted via WhatsApp, Phone, or Email regarding your order status, delivery, and payment. We do not sell or share your contact details with external marketing agencies."
    ]
  }
];

export function PrivacyPage() {
  const legalContent = useContent('legal');
  const privacyContent = (legalContent as any)?.privacy;
  return <LegalPage title={privacyContent?.title || "Privacy Policy"} kicker="Data & Security" body={privacyContent?.body} sections={!privacyContent?.body ? PRIVACY_SECTIONS : undefined} />;
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Acceptance of Terms",
    content: [
      "By using the Grainood website and placing an order, you agree to these terms of service. Since every bat is handcrafted, the final product may feature slight natural variations compared to catalog images."
    ]
  },
  {
    heading: "Intellectual Property",
    content: [
      "All content, imagery, and branding on this site are the property of Grainood."
    ]
  }
];

export function TermsPage() {
  const legalContent = useContent('legal');
  const termsContent = (legalContent as any)?.terms;
  return <LegalPage title={termsContent?.title || "Terms of Service"} kicker="User Agreement" body={termsContent?.body} sections={!termsContent?.body ? TERMS_SECTIONS : undefined} />;
}

