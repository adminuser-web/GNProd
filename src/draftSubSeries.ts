export const getSubSeries = (baseSlug: string) => {
  switch(baseSlug) {
    case 'debutant':
      return [{
        id: 'debutant-standard', slug: 'debutant-standard', name: 'Debutant Standard Edition', sku: 'GRN-DEB-01-STD',
        active: true, sortOrder: 1, grade: 'Grade 4 English Willow', gradeLabel: 'Grade 4',
        basePrice: 14999, tagline: 'Where the Journey Begins',
        shortDescription: 'Entry-level English Willow, best for beginners, casual match players, and early club players.',
        longDescription: 'The Debutant provides a proper English Willow experience without forcing you into premium pricing. It focuses on value, control, learning, and dependable pickup.',
        seoTitle: 'Debutant Standard English Willow Cricket Bat | Grainood',
        seoDescription: 'Buy Debutant Standard by Grainood, a Grade 4 English Willow cricket bat built for beginners. Explore specs, pickup, profile, customization options, and pricing.',
        idealFor: ['Beginners', 'Casual Match Players'], playerLevel: 'Beginner', playingStyle: 'All-round',
        estimatedDeliveryDays: 14, warrantyMonths: 6, includedAccessories: ['Bat Cover'],
        specs: { willowGrade: 'Grade 4 English Willow', grains: '4-6 visible grains', weightRange: '2lb 8oz - 2lb 11oz', edgeProfile: '36-38mm', spine: '58-62mm', profile: 'Mid profile', concaving: 'Light to medium', sweetSpot: 'Mid', handle: 'Semi-oval', finish: 'Natural', pressing: 'Standard', pickupFeel: 'Balanced', toeProtection: 'Rubber Guard' },
        media: { primaryImage: '/product-bat.webp' },
        performance: { power: 75, pickup: 85, balance: 80, control: 85 }
      }];
    case 'millennium':
      return [{
        id: 'millennium-pro', slug: 'millennium-pro', name: 'Millennium Pro Edition', sku: 'GRN-MIL-02-PRO',
        active: true, sortOrder: 1, grade: 'Grade 3 English Willow', gradeLabel: 'Grade 3',
        basePrice: 24999, tagline: 'Built for the Grind',
        shortDescription: 'Grade 3 English Willow bat best for regular club players and league starters.',
        longDescription: 'Engineered for durability and consistency. The Millennium provides reliable, balanced power and moderate customization options for serious club use.',
        seoTitle: 'Millennium Pro English Willow Cricket Bat | Grainood',
        seoDescription: 'Buy Millennium Pro by Grainood, a Grade 3 English Willow cricket bat built for club players. Explore specs, pickup, profile, customization options, and pricing.',
        idealFor: ['Club players', 'League starters'], playerLevel: 'Intermediate', playingStyle: 'All-round',
        estimatedDeliveryDays: 14, warrantyMonths: 6, includedAccessories: ['Premium Bat Cover', 'Extra Grip'],
        specs: { willowGrade: 'Grade 3 English Willow', grains: '5-7 visible grains', weightRange: '2lb 8oz - 2lb 12oz', edgeProfile: '37-40mm', spine: '60-64mm', profile: 'Mid-to-full', concaving: 'Medium', sweetSpot: 'Mid', handle: 'Semi-oval or round', finish: 'Polished', pressing: 'Standard', pickupFeel: 'Light', toeProtection: 'Rubber Guard' },
        media: { primaryImage: '/product-bat.webp' },
        performance: { power: 85, pickup: 80, balance: 85, control: 85 }
      }];
    case 'legend':
      return [{
        id: 'legend-elite', slug: 'legend-elite', name: 'Legend Elite Edition', sku: 'GRN-LEG-03-ELI',
        active: true, sortOrder: 1, grade: 'Grade 1 English Willow', gradeLabel: 'Grade 1',
        basePrice: 34999, tagline: 'Earn the Name',
        shortDescription: 'Grade 1 English Willow best for serious club/league players focusing on timing and control.',
        longDescription: 'Premium Grade 1 English Willow crafted for clean stroke play. Offers incredible pickup, timing, and control, with advanced customization options.',
        seoTitle: 'Legend Elite English Willow Cricket Bat | Grainood',
        seoDescription: 'Buy Legend Elite by Grainood, a Grade 1 English Willow cricket bat built for serious league players. Explore specs, pickup, profile, customization options, and pricing.',
        idealFor: ['Serious Club Players', 'League Players'], playerLevel: 'Advanced', playingStyle: 'Stroke Maker',
        estimatedDeliveryDays: 21, warrantyMonths: 12, includedAccessories: ['Padded Bat Cover', 'Two Extra Grips', 'Anti-scuff Sheet'],
        specs: { willowGrade: 'Grade 1 English Willow', grains: '7-10 visible grains', weightRange: '2lb 7oz - 2lb 10oz', edgeProfile: '38-40mm', spine: '62-65mm', profile: 'Balanced full profile', concaving: 'Minimal to medium', sweetSpot: 'Mid', handle: 'Semi-oval', finish: 'Waxed', pressing: 'Match-ready', pickupFeel: 'Featherlight', toeProtection: 'Rubber Guard' },
        media: { primaryImage: '/product-bat.webp' },
        performance: { power: 90, pickup: 90, balance: 95, control: 90 }
      }];
    case 'eternal':
      return [{
        id: 'eternal-supreme', slug: 'eternal-supreme', name: 'Eternal Supreme Edition', sku: 'GRN-ETE-04-SUP',
        active: true, sortOrder: 1, grade: 'Grade 1+ English Willow', gradeLabel: 'Grade 1+',
        basePrice: 44999, tagline: 'Timeless Power',
        shortDescription: 'Premium Grade 1+ English Willow best for aggressive advanced players.',
        longDescription: 'Designed for aggressive advanced players. Focuses on massive power, an imposing full profile, elite finishing, and deep custom-build options.',
        seoTitle: 'Eternal Supreme English Willow Cricket Bat | Grainood',
        seoDescription: 'Buy Eternal Supreme by Grainood, a Premium Grade 1+ English Willow cricket bat built for aggressive players. Explore specs, pickup, profile, customization options, and pricing.',
        idealFor: ['Aggressive advanced players'], playerLevel: 'Advanced', playingStyle: 'Power Hitter',
        estimatedDeliveryDays: 28, warrantyMonths: 12, includedAccessories: ['Tour Edition Cover', 'Pro Grips', 'Maintenance Kit'],
        specs: { willowGrade: 'Grade 1+ English Willow', grains: '8-12 visible grains', weightRange: '2lb 8oz - 2lb 12oz', edgeProfile: '39-41mm', spine: '63-66mm', profile: 'Full profile', concaving: 'Minimal', sweetSpot: 'Mid-to-low', handle: 'Oval / semi-oval / round options', finish: 'Polished', pressing: 'Hard', pickupFeel: 'Power balanced', toeProtection: 'Rubber Guard' },
        media: { primaryImage: '/product-bat.webp' },
        performance: { power: 98, pickup: 92, balance: 90, control: 95 }
      }];
    case 'immortal':
      return [{
        id: 'immortal-original', slug: 'immortal-original', name: 'Immortal Original', sku: 'GRN-IMM-05-ORG',
        active: true, sortOrder: 1, grade: 'Pro Reserve / Grade 1+ selected English Willow', gradeLabel: 'Pro Reserve',
        basePrice: 59999, tagline: 'One Bat. Forever Remembered.',
        shortDescription: 'The flagship premium line crafted from Pro Reserve clefts for professional buyers.',
        longDescription: 'The pinnacle of Grainood craftsmanship. Elite cleft selection, full pro-concierge customization, and matched to professional player specifications.',
        seoTitle: 'Immortal Pro Reserve English Willow Cricket Bat | Grainood',
        seoDescription: 'Buy Immortal Original by Grainood, a Pro Reserve English Willow cricket bat built for professional players. Explore specs, pickup, profile, customization options, and pricing.',
        idealFor: ['Professional players', 'Premium buyers'], playerLevel: 'Professional', playingStyle: 'All-round',
        estimatedDeliveryDays: 45, warrantyMonths: 24, includedAccessories: ['Presentation Case', 'Mastercraft Maintenance Kit', 'Certificate of Authenticity'],
        specs: { willowGrade: 'Pro Reserve Grade 1+ selected English Willow', grains: '10-14+ visible grains', weightRange: 'Custom', edgeProfile: 'Up to legal maximum', spine: 'Premium full profile', profile: 'Custom full profile', concaving: 'Minimal/Custom', sweetSpot: 'Custom', handle: 'Custom', finish: 'Match-ready', pressing: 'Custom', pickupFeel: 'Custom', toeProtection: 'Rubber Guard' },
        media: { primaryImage: '/product-bat.webp' },
        performance: { power: 100, pickup: 98, balance: 100, control: 98 }
      }];
    default:
      return [];
  }
};
