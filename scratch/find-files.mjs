import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.npm-cache' && file !== 'dist') {
        results = results.concat(walk(filePath));
      }
    } else {
      if (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        results.push({ name: file, path: filePath });
      }
    }
  });
  return results;
}

const found = walk(process.cwd());
console.log(`Found ${found.length} images:`);
found.forEach(f => {
  console.log(`- ${f.name} (${path.relative(process.cwd(), f.path)})`);
});
