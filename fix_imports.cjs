const fs = require('fs');

function replaceInFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        code = code.split(search).join(replace);
    }
    fs.writeFileSync(path, code);
}

const comps = [
    'src/components/admin/products/AdminDetailsTab.tsx',
    'src/components/admin/products/AdminMediaTab.tsx',
    'src/components/admin/products/AdminPricingTab.tsx',
    'src/components/admin/products/AdminSeoTab.tsx',
    'src/components/admin/products/AdminSpecsTab.tsx',
    'src/features/products/hooks/useProductConfigurator.test.ts',
    'src/lib/pricing.test.ts',
];

for(const comp of comps) {
    replaceInFile(comp, [
        ['Product,', ''],
        ['import { Product } from \'../../../features/products/types\';', 'import { Product } from \'../../../types\';'],
        ['import { Product } from \'../types\';', 'import { Product } from \'../../../types\';']
    ]);
}

replaceInFile('src/features/products/hooks/useProductConfigurator.test.ts', [
    ['import { Product }', 'import { Product } from \'../../../types\';\nimport {']
]);

replaceInFile('src/lib/pricing.test.ts', [
    ['import { Product }', 'import { Product } from \'../types\';\nimport {']
]);

