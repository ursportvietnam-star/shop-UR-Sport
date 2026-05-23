import fs from 'fs';
import path from 'path';

const suggestionsPath = path.join(process.cwd(), 'deploy', 'blog-fix-suggestions.json');
if (!fs.existsSync(suggestionsPath)) {
  console.error('Suggestions file not found:', suggestionsPath);
  process.exit(1);
}
const suggestions = JSON.parse(fs.readFileSync(suggestionsPath, 'utf8')) as Array<{file:string;line:number;original:string;suggestion?:string}>;
const grouped = new Map<string, Array<any>>();
for (const s of suggestions) {
  if (s.suggestion) {
    if (!grouped.has(s.file)) grouped.set(s.file, []);
    grouped.get(s.file)!.push(s);
  }
}

let changed = 0;
for (const [file, items] of grouped.entries()) {
  let content = fs.readFileSync(file, 'utf8');
  for (const it of items) {
    const orig = it.original;
    const sug = it.suggestion;
    const re = new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (re.test(content)) {
      content = content.replace(re, sug);
      changed++;
    }
  }
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Applied', changed, 'replacements across', grouped.size, 'files');
