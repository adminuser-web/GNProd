const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

// Swap sortOrder for Eternal and Legend
code = code.replace(/name: "LEGEND",([\s\S]*?)sortOrder: 3/m, 'name: "LEGEND",$1sortOrder: 4');
code = code.replace(/name: "ETERNAL",([\s\S]*?)sortOrder: 4/m, 'name: "ETERNAL",$1sortOrder: 3');

fs.writeFileSync('src/types.ts', code);
