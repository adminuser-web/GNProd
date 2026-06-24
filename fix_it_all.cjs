const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

// The main series we want is: 
// Debutant -> sortOrder: 1
// Millennium -> sortOrder: 2
// Eternal -> sortOrder: 3
// Legend -> sortOrder: 4
// Immortal -> sortOrder: 5

code = code.replace(/name: 'Legend Series 3',\s*sku: 'SKU-LEGEND-3',\s*active: true,\s*sortOrder: 4,/g, 
  "name: 'Legend Series 3',\n      sku: 'SKU-LEGEND-3',\n      active: true,\n      sortOrder: 3,");
code = code.replace(/name: 'Legend',\s*sortOrder: 3,/g, // if we accidentally replaced something
   "");

code = code.replace(/name: 'Eternal Series 4',\s*sku: 'SKU-ETERNAL-4',\s*active: true,\s*sortOrder: 3,/g, 
  "name: 'Eternal Series 4',\n      sku: 'SKU-ETERNAL-4',\n      active: true,\n      sortOrder: 4,");

// Let's just fix the top level manually.
code = code.replace(/name: "LEGEND",([\s\S]*?)active: true,\s*sortOrder: 3/g, 'name: "LEGEND",$1active: true,\n    sortOrder: 4');
code = code.replace(/name: "ETERNAL",([\s\S]*?)active: true,\s*sortOrder: 4/g, 'name: "ETERNAL",$1active: true,\n    sortOrder: 3');

fs.writeFileSync('src/types.ts', code);
