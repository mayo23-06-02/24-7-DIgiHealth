const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'components', 'auth', 'steps');

const targetClassStr = 'w-full px-5 py-3.5 bg-slate-50 transition-all text-slate-900 font-medium placeholder-slate-300';
const targetClassStrDynamic = 'w-full px-5 py-3.5 bg-slate-50 transition-all text-slate-900 font-medium placeholder-slate-300 ';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all static className="w-full ..." 
    // Make sure it doesn't strip out important different classes if possible, but the user said "edit all inputs". 
    // Looking at the grep, inputs have className="w-full px-5 py-4 ..." or similar.
    content = content.replace(/className=\"w-full[^\"]*\"/g, `className="${targetClassStr}"`);
    
    // Replace template literal classNames like className={`w-full ... ${expr}`}
    content = content.replace(/className=\{\`(w-full[^\$`]*)/g, `className={\`${targetClassStrDynamic}`);
    
    // Also cover forms that might be missed or textareas
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
