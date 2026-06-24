import fs from 'fs';
import path from 'path';

function findAndReplace(dir, search, replace) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findAndReplace(filePath, search, replace);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(search)) {
        content = content.split(search).join(replace);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

findAndReplace('src', 'handmade-mastery.jpg', 'handmade-mastery.webp');
findAndReplace('src', 'product-bat.png', 'product-bat.webp');
