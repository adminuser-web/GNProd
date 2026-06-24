const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/export const PUBLISHED_PRODUCTS: Product\[\] = \[/g, 'export const PUBLISHED_PRODUCTS: any[] = [');
code = code.replace(/const CUSTOMIZATION_LIBRARY: Record<string, Omit<CustomizationGroup, \'enabled\'>> = \{/g, 'const CUSTOMIZATION_LIBRARY: any = {');
code = code.replace(/function buildCustomizationGroups\(enabledKeys: string\[\], priceOverrides\?: Record<string, number>\): CustomizationGroup\[\] \{/g, 'function buildCustomizationGroups(enabledKeys: string[], priceOverrides?: Record<string, number>): any[] {');

fs.writeFileSync('src/types.ts', code);
