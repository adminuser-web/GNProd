const fs = require('fs');

function replaceInFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        code = code.split(search).join(replace);
    }
    fs.writeFileSync(path, code);
}

replaceInFile('src/components/admin/products/AdminSpecsTab.tsx', [
    ['specs?.edges', 'specs?.edgeThickness'],
    ['updateSpec("edges"', 'updateSpec("edgeThickness"'],
    ['specs?.spine', 'specs?.spineHeight'],
    ['updateSpec("spine"', 'updateSpec("spineHeight"'],
    ['specs?.handle', 'specs?.handleShape'],
    ['updateSpec("handle"', 'updateSpec("handleShape"'],
    ['specs?.toeProtection', 'specs?.toeProfile'],
    ['updateSpec("toeProtection"', 'updateSpec("toeProfile"'],
    ['specs?.preKnockedIncluded', 'specs?.knockedInStatus === "yes"'],
    ['updateSpec("preKnockedIncluded"', 'updateSpec("knockedInStatus"']
]);

