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
  
  if (file.includes('Navbar.tsx')) {
    // only replace line 304 overlay, not line 139 header
    content = content.replace('bg-black/60 backdrop-blur-sm lg:hidden', 'bg-black/80 lg:hidden');
  } else {
    content = content.replace(/backdrop-blur-sm/g, '').replace(/backdrop-blur-md/g, '').replace(/backdrop-blur-lg/g, '');
    // replace any floating "bg-bg/80 " left over just in case, though it's fine.
  }

  if(content !== fs.readFileSync(file, 'utf8')) {
    console.log('Fixed', file);
    fs.writeFileSync(file, content, 'utf8');
    modifications++;
  }
});

console.log('Modified', modifications, 'files.');
