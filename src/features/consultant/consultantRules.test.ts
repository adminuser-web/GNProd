import { describe, it, expect } from 'vitest';
import { consultBat, BatConsultantInput } from './consultantRules';
import { ProductSeries } from '../products/types';

describe('Bat Consultant Logic', () => {
  const mockProducts: any[] = [
    {
      id: 's1',
      name: 'Debutant',
      slug: 'debutant',
      price: 12000,
      active: true,
      description: '',
      features: [],
      subSeries: [
        {
          id: 'ss1',
          name: 'Debutant V1',
          slug: 'debutant-v1',
          basePrice: 12000,
          active: true,
          playerLevel: 'Beginner',
          performance: { power: 5, control: 8, pickup: 8, balance: 7 }
        }
      ]
    },
    {
      id: 's2',
      name: 'Millennium',
      slug: 'millennium',
      price: 22000,
      active: true,
      description: '',
      features: [],
      subSeries: [
        {
          id: 'ss2',
          name: 'Millennium V2',
          slug: 'millennium-v2',
          basePrice: 22000,
          active: true,
          playerLevel: 'Club',
          performance: { power: 7, control: 7, pickup: 7, balance: 8 }
        }
      ]
    },
    {
      id: 's3',
      name: 'Legend',
      slug: 'legend',
      price: 35000,
      active: true,
      description: '',
      features: [],
      subSeries: [
        {
          id: 'ss3',
          name: 'Legend Pro',
          slug: 'legend-pro',
          basePrice: 35000,
          active: true,
          playerLevel: 'Advanced',
          performance: { power: 6, control: 9, pickup: 9, balance: 8 }
        }
      ]
    },
    {
      id: 's4',
      name: 'Eternal',
      slug: 'eternal',
      price: 55000,
      active: true,
      description: '',
      features: [],
      subSeries: [
        {
          id: 'ss4',
          name: 'Eternal Power',
          slug: 'eternal-power',
          basePrice: 55000,
          active: true,
          playerLevel: 'Advanced',
          performance: { power: 10, control: 7, pickup: 6, balance: 6 }
        }
      ]
    },
    {
      id: 's5',
      name: 'Immortal',
      slug: 'immortal',
      price: 85000,
      active: true,
      description: '',
      features: [],
      subSeries: [
        {
          id: 'ss5',
          name: 'Immortal Reserve',
          slug: 'immortal-reserve',
          basePrice: 85000,
          active: true,
          playerLevel: 'Professional',
          consultationRequired: true,
          performance: { power: 10, control: 9, pickup: 8, balance: 9 }
        }
      ]
    },
    {
      id: 's6',
      name: 'Legacy Basic',
      slug: 'legacy-basic',
      price: 5000,
      active: true,
      description: '',
      features: [],
      subSeries: [] 
    }
  ];

  it('Beginner + low budget recommends Debutant', () => {
    const input: BatConsultantInput = {
      playerProfile: 'Beginner / Casual Player',
      battingStyle: 'Defensive / Control Focus',
      pickupFeel: 'Balanced Pickup',
      budgetRange: 'Under ₹15,000',
      customizationPreference: 'Basic setup is enough'
    };
    const rec = consultBat(input, mockProducts);
    expect(rec?.seriesName).toContain('Debutant');
  });

  it('Club + mid budget recommends Millennium', () => {
    const input: BatConsultantInput = {
      playerProfile: 'Club Cricketer',
      battingStyle: 'Balanced All-Round Game',
      pickupFeel: 'Balanced Pickup',
      budgetRange: '₹15,000 – ₹25,000',
      customizationPreference: 'Some customization'
    };
    const rec = consultBat(input, mockProducts);
    expect(rec?.seriesName).toContain('Millennium');
  });

  it('Stroke player + premium budget recommends Legend', () => {
    const input: BatConsultantInput = {
      playerProfile: 'League / Tournament Player',
      battingStyle: 'Timing & Stroke Play',
      pickupFeel: 'Light Pickup',
      budgetRange: '₹25,000 – ₹40,000',
      customizationPreference: 'Some customization'
    };
    const rec = consultBat(input, mockProducts);
    expect(rec?.seriesName).toContain('Legend');
  });

  it('Power hitter + premium budget recommends Eternal', () => {
    const input: BatConsultantInput = {
      playerProfile: 'Advanced / Serious Player',
      battingStyle: 'Power Hitting',
      pickupFeel: 'Powerful / Slightly Heavy',
      budgetRange: '₹40,000 – ₹60,000',
      customizationPreference: 'Full custom build'
    };
    const rec = consultBat(input, mockProducts);
    expect(rec?.seriesName).toContain('Eternal');
  });

  it('Professional + no-limit budget recommends Immortal', () => {
    const input: BatConsultantInput = {
      playerProfile: 'Professional / Premium Buyer',
      battingStyle: 'Balanced All-Round Game',
      pickupFeel: 'Powerful / Slightly Heavy',
      budgetRange: '₹60,000+ / Best Available',
      customizationPreference: 'I want expert help choosing'
    };
    const rec = consultBat(input, mockProducts);
    expect(rec?.seriesName).toContain('Immortal');
  });

  it('Inactive product/sub-series is not recommended', () => {
    const inactiveProducts: any[] = [{
      ...mockProducts[0],
      active: false
    }];
    const input: BatConsultantInput = {
      playerProfile: 'Beginner / Casual Player',
      battingStyle: 'Defensive / Control Focus',
      pickupFeel: 'Balanced Pickup',
      budgetRange: 'Under ₹15,000',
      customizationPreference: 'Basic setup is enough'
    };
    const rec = consultBat(input, inactiveProducts);
    expect(rec).toBeNull();
  });

  it('Confidence is deterministic', () => {
    const input: BatConsultantInput = {
      playerProfile: 'Club Cricketer',
      battingStyle: 'Balanced All-Round Game',
      pickupFeel: 'Balanced Pickup',
      budgetRange: '₹15,000 – ₹25,000',
      customizationPreference: 'Some customization'
    };
    const rec1 = consultBat(input, mockProducts);
    const rec2 = consultBat(input, mockProducts);
    expect(rec1?.confidence).toEqual(rec2?.confidence);
  });
});
