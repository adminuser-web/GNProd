import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(/type: "select"/g, 'type: "single_select"');
code = code.replace(/type: "color"/g, 'type: "single_select"');
code = code.replace(/priceDelta: (\d+)(?=\s*\})/g, 'priceDelta: $1, value: "", active: true, sortOrder: 0');
code = code.replace(/colorHex: "([^"]+)"(?=\s*\})/g, 'colorHex: "$1", value: "", active: true, sortOrder: 0');
fs.writeFileSync('src/types.ts', code);
