import fs from 'fs';
import path from 'path';

function findMarkdownFiles(root: string) {
  return fs.readdirSync(root).filter(f => f.endsWith('.md')).map(f => path.join(root, f));
}

function levenshtein(a: string, b: string) {
  const A = a || '';
  const B = b || '';
  const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = 0; i <= A.length; i++) dp[i][0] = i;
  for (let j = 0; j <= B.length; j++) dp[0][j] = j;
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[A.length][B.length];
}

const root = process.cwd();
const mdFiles = findMarkdownFiles(root);
const blogSlugs: string[] = [];
for (const f of mdFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const m = c.match(/Slug:\s*(\S+)/i);
  if (m) blogSlugs.push(m[1]);
}

const suggestions: Array<{ file: string; line: number; original: string; suggestion?: string }> = [];
const urlRe = /(\/blog\/[a-z0-9\-]+)|(?:\/bang-size)/gi;
for (const f of mdFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    while ((m = urlRe.exec(line)) !== null) {
      const url = m[0];
      if (url === '/bang-size') {
        // map to 05-size.md slug if exists
        const sizeFile = path.join(root, '05-size.md');
        if (fs.existsSync(sizeFile)) {
          const content = fs.readFileSync(sizeFile, 'utf8');
          const mm = content.match(/Slug:\s*(\S+)/i);
          if (mm) suggestions.push({ file: f, line: i + 1, original: url, suggestion: `/blog/${mm[1]}` });
        }
      } else if (url.startsWith('/blog/')) {
        const slug = url.replace('/blog/', '').replace(/\/+$/,'');
        if (!blogSlugs.includes(slug)) {
          // fuzzy match
          let best = { slug: '', dist: Infinity };
          for (const b of blogSlugs) {
            const d = levenshtein(slug, b);
            if (d < best.dist) best = { slug: b, dist: d };
          }
          if (best.slug && best.dist <= 3) {
            suggestions.push({ file: f, line: i + 1, original: url, suggestion: `/blog/${best.slug}` });
          } else {
            suggestions.push({ file: f, line: i + 1, original: url, suggestion: undefined });
          }
        }
      }
    }
  }
}

const outdir = path.join(root, 'deploy');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
fs.writeFileSync(path.join(outdir, 'blog-fix-suggestions.json'), JSON.stringify(suggestions, null, 2), 'utf8');
console.log('Wrote', suggestions.length, 'suggestions to deploy/blog-fix-suggestions.json');
