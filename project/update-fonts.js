const fs = require('fs');
const path = require('path');

const readdir = dir => fs.readdirSync(dir, {withFileTypes: true}).reduce((acc, dirent) => 
  dirent.isDirectory() ? [...acc, ...readdir(path.join(dir, dirent.name))] : [...acc, path.join(dir, dirent.name)], []
);

const files = [];
if (fs.existsSync('app')) files.push(...readdir('app'));
if (fs.existsSync('components')) files.push(...readdir('components'));

const tsxFiles = files.filter(f => f.endsWith('.tsx'));

tsxFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  // Add font-grotesk to <h1...h6> elements if they have className
  content = content.replace(/<(h[1-6])([^>]*)className=(["'])(.*?)\3/g, (match, tag, rest, quote, classes) => {
    if (!classes.includes('font-grotesk')) {
      changed = true;
      return `<${tag}${rest}className=${quote}${classes} font-grotesk${quote}`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(f, content);
  }
});
console.log('Updated', tsxFiles.length, 'files for headings');
