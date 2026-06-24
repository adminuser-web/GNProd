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
  let newContent = content
    .replace(/shadow-\[0_0_80px_rgba\(197,160,89,0\.1\)\]/g, 'shadow-sm')
    .replace(/shadow-\[0_0_80px_rgba\(239,68,68,0\.05\)\]/g, 'shadow-sm')
    .replace(/shadow-\[0_0_50px_rgba\(197,160,89,0\.1\)\]/g, 'shadow-sm')
    .replace(/shadow-\[0_0_20px_rgba\(197,160,89,0\.2\)\]/g, 'shadow-sm')
    .replace(/shadow-\[0_-10px_30px_rgba\(0,0,0,0\.6\)\]/g, 'shadow-lg');
  if(content !== newContent) {
    console.log('Fixed', file);
    fs.writeFileSync(file, newContent, 'utf8');
    modifications++;
  }
});

console.log('Modified', modifications, 'files.');
