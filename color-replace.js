const fs = require('fs');
const path = require('path');

const directories = ['app', 'components', 'src'];
const root = __dirname;

const replacements = [
  { search: /#028090/gi, replace: '#ea580c' }, // dark teal -> orange-600
  { search: /#00a896/gi, replace: '#f97316' }, // medium teal -> orange-500
  { search: /#00c49f/gi, replace: '#fb923c' }, // light teal -> orange-400
  { search: /\bteal-/g, replace: 'orange-' },  // tailwind colors
  { search: /shadow-teal-glow/g, replace: 'shadow-orange-glow' } // custom classes
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let updated = false;
      
      for (const rule of replacements) {
        if (rule.search.test(content)) {
          content = content.replace(rule.search, rule.replace);
          updated = true;
        }
      }
      
      if (updated) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

for (const dir of directories) {
  const fullDirPath = path.join(root, dir);
  if (fs.existsSync(fullDirPath)) {
    processDirectory(fullDirPath);
  }
}

console.log('Done.');
