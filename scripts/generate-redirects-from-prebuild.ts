import fs from 'fs';
import path from 'path';
import { PRODUCTS } from '../src/data';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const infile = path.resolve(process.cwd(), 'prebuild-out.txt');
if (!fs.existsSync(infile)) {
  console.error('prebuild-out.txt not found. Run `npm run prebuild > prebuild-out.txt` first.');
  process.exit(1);
}
const raw = fs.readFileSync(infile, 'utf8');
const regex = /Link lỗi:\s*(\S+)/g;
const set = new Set<string>();
let m;
while ((m = regex.exec(raw)) !== null) set.add(m[1]);

const redirects: Array<{ from: string; to: string; reason?: string }> = [];
for (const p of set) {
  if (p.startsWith('/san-pham/')) {
    const slug = p.replace('/san-pham/', '').replace(/\/+$/,'');
    const prod = PRODUCTS.find(x => x.slug === slug);
    if (prod) {
      const categorySlug = slugify(prod.category || '');
      const to = `/apparel/${categorySlug}/${slug}`;
      redirects.push({ from: p, to, reason: `product ${prod.id} (${prod.name})` });
    } else {
      redirects.push({ from: p, to: p, reason: 'no product match; manual review' });
    }
  } else if (p === '/bang-size') {
    // map to blog slug if available
    const blogFile = fs.readFileSync(path.resolve(process.cwd(), '05-size.md'), 'utf8');
    const m2 = blogFile.match(/Slug:\s*(\S+)/i);
    if (m2) {
      redirects.push({ from: p, to: `/blog/${m2[1]}`, reason: 'map to size blog' });
    } else {
      redirects.push({ from: p, to: '/bang-size', reason: 'no blog slug found in 05-size.md' });
    }
  } else if (p.startsWith('/blog/')) {
    const slug = p.replace('/blog/', '').replace(/\/+$/,'');
    // try to find exact match in blog files (search Slug:)
    const mdFiles = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.md'));
    let found = false;
    for (const f of mdFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
      const m3 = content.match(/Slug:\s*(\S+)/i);
      if (m3 && m3[1] === slug) { found = true; break; }
    }
    if (!found) {
      // attempt fuzzy by levenshtein
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
      // collect blog slugs
      const blogSlugs: string[] = [];
      for (const f of mdFiles) {
        const content = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
        const m4 = content.match(/Slug:\s*(\S+)/i);
        if (m4) blogSlugs.push(m4[1]);
      }
      let best = { slug: '', dist: Infinity };
      for (const b of blogSlugs) {
        const d = levenshtein(slug, b);
        if (d < best.dist) best = { slug: b, dist: d };
      }
      if (best.slug && best.dist <= 3) {
        redirects.push({ from: p, to: `/blog/${best.slug}`, reason: 'fuzzy blog match' });
      } else {
        redirects.push({ from: p, to: p, reason: 'no blog match' });
      }
    } else {
      redirects.push({ from: p, to: p, reason: 'exists in content' });
    }
  } else {
    redirects.push({ from: p, to: p, reason: 'unknown pattern' });
  }
}

const outdir = path.resolve(process.cwd(), 'deploy');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
fs.writeFileSync(path.resolve(outdir, 'redirects-auto.json'), JSON.stringify(redirects, null, 2), 'utf8');
console.log('Wrote', redirects.length, 'redirect suggestions to', path.relative(process.cwd(), path.join('deploy','redirects-auto.json')));
