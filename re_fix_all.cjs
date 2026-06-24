const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const generateSubSeries = (baseSlug, baseName, baseGrade, basePrice, sortOrderStart) => {
  return Array.from({length: 4}).map((_, i) => {
    const num = i + 1;
    return `{
      id: '${baseSlug}-v${num}',
      slug: '${baseSlug}-v${num}',
      name: '${baseName} Series ${num}',
      sku: 'SKU-${baseSlug.toUpperCase()}-${num}',
      active: true,
      sortOrder: ${sortOrderStart + i},
      grade: '${baseGrade}',
      gradeLabel: '${baseGrade}',
      basePrice: ${basePrice + (i * 1000)},
      tagline: '${baseName} standard edition ${num}',
      shortDescription: 'Placeholder description matching ${baseName} ${num}',
      longDescription: 'Extended description for ${baseName} ${num}',
      idealFor: ['Club', 'League'],
      playerLevel: 'Intermediate',
      playingStyle: 'All-round',
      estimatedDeliveryDays: 14,
      warrantyMonths: 12,
      includedAccessories: ['Bat Cover'],
      specs: {
        willowGrade: '${baseGrade}',
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
        primaryImage: '/product-bat.png'
      },
      performance: {
        power: 80,
        pickup: 80,
        balance: 80,
        control: 80
      }
    }`;
  }).join(',\n');
};

// Replace subseries blocks
// Debutant
code = code.replace(/    subSeries: \[\s*\{[\s\S]*?id: 'debutant-v4'[\s\S]*?\}\s*\],?/g, `    subSeries: [\n${generateSubSeries('debutant', 'Debutant', 'Grade 4', 14999, 1)}\n    ],\n`);
// Millennium
code = code.replace(/    subSeries: \[\s*\{[\s\S]*?id: 'millennium-v4'[\s\S]*?\}\s*\],?/g, `    subSeries: [\n${generateSubSeries('millennium', 'Millennium', 'Grade 3', 24999, 1)}\n    ],\n`);
// Eternal
code = code.replace(/    subSeries: \[\s*\{[\s\S]*?id: 'eternal-v4'[\s\S]*?\}\s*\],?/g, `    subSeries: [\n${generateSubSeries('eternal', 'Eternal', 'Grade 2', 44999, 1)}\n    ],\n`);
// Legend
code = code.replace(/    subSeries: \[\s*\{[\s\S]*?id: 'legend-v4'[\s\S]*?\}\s*\],?/g, `    subSeries: [\n${generateSubSeries('legend', 'Legend', 'Grade 1', 34999, 1)}\n    ],\n`);

// Adjust main series orders
code = code.replace(/name: "LEGEND",([\s\S]*?)active: true,(\s*)sortOrder: (3|4)/g, 'name: "LEGEND",$1active: true,$2sortOrder: 4');
code = code.replace(/name: "ETERNAL",([\s\S]*?)active: true,(\s*)sortOrder: (3|4)/g, 'name: "ETERNAL",$1active: true,$2sortOrder: 3');

fs.writeFileSync('src/types.ts', code);
