const fs = require('fs');

function replaceInFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        code = code.split(search).join(replace);
    }
    fs.writeFileSync(path, code);
}

replaceInFile('src/features/consultant/consultantRules.ts', [
    ['((subSeries as any).grade)', '(subSeries as any).grade'],
    ['import { ProductSubSeries } from \'../products/types\';\nimport { Product } from \'../../types\'', 'import { ProductSubSeries } from \'../products/types\';\nimport { Product } from \'../../types\';'],
    ['ProductSeries, ProductSubSeries', 'ProductSubSeries']
]);

