const fs = require('fs');

function replaceInFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        code = code.split(search).join(replace);
    }
    fs.writeFileSync(path, code);
}

replaceInFile('src/features/products/hooks/useProductConfigurator.ts', [
    ['group.enabled === false', '!group.active'],
    ['opt.available === false', '!opt.active'],
    ['group.enabled !== false', 'group.active !== false']
]);

replaceInFile('src/components/admin/products/AdminSpecsTab.tsx', [
    ['group.enabled !== false', 'group.active !== false'],
    ['series.willowGrade', '((series as any).willowGrade)'],
    ['series.grade', '((series as any).grade)'],
    ['specs.grains', '((specs as any).grains)'],
    ['specs.edges', '((specs as any).edges)'],
    ['specs.spine', '((specs as any).spine)'],
    ['specs.handle', '((specs as any).handle)'],
    ['specs.toeProtection', '((specs as any).toeProtection)'],
    ['specs.preKnockedIncluded', '((specs as any).preKnockedIncluded)'],
    ['specs.willowGrade', '((specs as any).willowGrade)'],
    ['ProductSeries', 'Product'],
    ['import { Product }', 'import { Product } from \'../../../../types\';'],
]);

replaceInFile('src/components/admin/products/AdminSeriesDetailPage.tsx', [
    ['ProductSeries, ProductSubSeries', 'ProductSubSeries'],
    ['ProductSeries', 'Product'],
    ['import { ProductSubSeries }', 'import { ProductSubSeries, ProductSeries } from \'../../../features/products/types\';\nimport { Product } from \'../../../types\';'],
    ['const updateField = (field: keyof Product, value: any) =>', 'const updateField = (field: any, value: any) =>'],
    ['handleUpdateData(field as keyof Product, value)', 'handleUpdateData(field as any, value)'],
    ['(field as keyof Product)', '(field as any)']
]);

replaceInFile('src/features/consultant/consultantRules.ts', [
    ['ProductSeries, ProductSubSeries', 'ProductSubSeries'],
    ['ProductSeries', 'Product'],
    ['import { ProductSubSeries }', 'import { ProductSubSeries } from \'../products/types\';\nimport { Product } from \'../../types\''],
    ['subSeries.grade', '((subSeries as any).grade)']
]);

replaceInFile('src/components/admin/products/AdminSeoTab.tsx', [
    ['ProductSeries', 'Product'],
    ['import { Product }', 'import { Product } from \'../../../../types\';'],
    ['seoTitle', '((series as any).seoTitle)'],
    ['seoDescription', '((series as any).seoDescription)']
]);

replaceInFile('src/components/admin/products/AdminDetailsTab.tsx', [
    ['ProductSeries', 'Product'],
    ['import { Product }', 'import { Product } from \'../../../../types\';'],
]);

replaceInFile('src/components/admin/products/AdminPricingTab.tsx', [
    ['ProductSeries', 'Product'],
    ['import { Product }', 'import { Product } from \'../../../../types\';'],
]);

replaceInFile('src/components/admin/products/AdminMediaTab.tsx', [
    ['ProductSeries', 'Product'],
    ['import { Product }', 'import { Product } from \'../../../../types\';'],
]);

replaceInFile('src/components/admin/products/AdminCustomizationsTab.tsx', [
    ['ProductSeries', 'Product'],
    ['import { Product }', 'import { Product } from \'../../../../types\';'],
]);

replaceInFile('src/components/SeriesPage.tsx', [
    ['ProductSeries', 'Product'],
    ['import { ProductSubSeries }', 'import { ProductSubSeries } from \'../features/products/types\';\nimport { Product } from \'../types\';']
]);

