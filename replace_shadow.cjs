const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let modifications = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/shadow-\[0_0_80px_rgba\(197,160,89,0\.05\)\]/g, 'shadow-sm');
  if(content !== newContent) {
    console.log('Fixed', file);
    fs.writeFileSync(file, newContent, 'utf8');
    modifications++;
  }
});

console.log('Modified', modifications, 'files.');
