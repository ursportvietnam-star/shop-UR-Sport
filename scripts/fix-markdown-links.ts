import fs from 'fs';
import path from 'path';
import { PRODUCTS } from '../src/data';

type Suggestion = {
  file: string;
  line: number;
  original: string;
  target: string;
  suggestion?: string;
};

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

function bestProductMatch(slug: string) {
  function normalize(s: string) {
    return (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\- ]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-');
  }

  const stopWords = new Set(['nam', 'nu', 'the', 'thao', 'ursport', 'ur', 'style', 'product', 'ao', 'quan']);
  function tokens(s: string) {
    return normalize(s).split('-').filter(t => t && !stopWords.has(t));
  }

  const target = normalize(slug);
  const targetTokens = tokens(slug);

  const candidates = PRODUCTS.map(p => ({ slug: p.slug, name: p.name })).filter(c => c.slug);
  let best = { slug: '', score: Infinity, overlap: 0 };

  for (const c of candidates) {
    const cs = normalize(c.slug);
    const nameNorm = normalize(c.name || '');
    const dist = levenshtein(target, cs);
    const normDist = dist / Math.max(target.length || 1, cs.length || 1);

    // token overlap
    const cTokens = tokens(c.slug);
    const common = targetTokens.filter(t => cTokens.includes(t)).length;
    const union = new Set([...targetTokens, ...cTokens]).size || 1;
    const overlap = common / union;

    // also compare with product name as fallback (helps if slug differs considerably)
    const nameDist = levenshtein(target, nameNorm);
    const nameNormDist = nameDist / Math.max(target.length || 1, nameNorm.length || 1);

    // combined score prefers normalized distance but rewards token overlap
    const score = Math.min(normDist, nameNormDist) - overlap * 0.25;

    if (score < best.score) best = { slug: c.slug, score, overlap };
  }

  // Decide threshold: accept if normalized distance <= 0.4 or overlap >= 0.45
  return best;
}

function findMarkdownFiles(root: string) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) files.push(path.join(root, e.name));
  }
  return files;
}

function parseLinks(line: string) {
  const mdRe = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  const bareRe = /(\/san-pham\/[a-z0-9\-]+)/gi;
  const matches: Array<{ text?: string; url: string; index: number }> = [];
  let m;
  while ((m = mdRe.exec(line)) !== null) {
    matches.push({ text: m[1], url: m[2], index: m.index });
  }
  while ((m = bareRe.exec(line)) !== null) {
    matches.push({ url: m[1], index: m.index });
  }
  // sort by index to process left-to-right
  return matches.sort((a, b) => a.index - b.index);
}

function run(dry = true, options: { aggressive?: boolean; fixBlog?: boolean; verbose?: boolean } = {}) {
  const root = path.resolve(process.cwd());
  const mdFiles = findMarkdownFiles(root);
  if (options.verbose) console.log('Found markdown files:', mdFiles.length);
  // collect blog slugs from markdown by scanning for a line starting with 'Slug:'
  const blogSlugs = new Set<string>();
  for (const f of mdFiles) {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split(/\r?\n/);
    for (const L of lines) {
      const m = L.match(/^Slug:\s*(\S+)/i);
      if (m) blogSlugs.add(m[1].trim());
    }
  }
  if (options.verbose) console.log('Collected blog slugs:', blogSlugs.size);
  const suggestions: Suggestion[] = [];

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const links = parseLinks(line);
      for (const l of links) {
        const url = l.url;
        if (url.startsWith('/san-pham/')) {
          const slug = url.replace('/san-pham/', '').replace(/\/+$/,'');
          const exists = PRODUCTS.some(p => p.slug === slug);
          if (!exists) {
            const best = bestProductMatch(slug);
            let suggestionUrl: string | undefined;
            if (best && best.slug) {
              // Accept suggestion when normalized score looks reasonable or token overlap is high
              const scoreThreshold = options.aggressive ? 0.6 : 0.4;
              const overlapThreshold = options.aggressive ? 0.25 : 0.45;
              if ((best.score !== undefined && best.score <= scoreThreshold) || (best.overlap !== undefined && best.overlap >= overlapThreshold)) {
                suggestionUrl = `/san-pham/${best.slug}`;
              }
            }
            suggestions.push({ file, line: i + 1, original: url, target: slug, suggestion: suggestionUrl });
            if (!dry && suggestionUrl) {
              if (l.text) {
                // markdown link
                lines[i] = line.replace(`(${url})`, `(${suggestionUrl})`);
              } else {
                // bare occurrence
                const re = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                lines[i] = line.replace(re, suggestionUrl);
              }
            }
          }
        }
        if ((url === '/bang-size' || url.startsWith('/blog/')) && options.fixBlog) {
          // Try to suggest blog slug replacements when possible
          if (url === '/bang-size') {
            // prefer /bang-size mapped to slug found in blogSlugs that contains 'bang-size'
            const candidate = Array.from(blogSlugs).find(s => s.includes('bang-size'));
            if (candidate) {
              suggestions.push({ file, line: i + 1, original: url, target: 'bang-size', suggestion: `/blog/${candidate}` });
              if (!dry) {
                const re = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                lines[i] = line.replace(re, `/blog/${candidate}`);
              }
            }
          } else if (url.startsWith('/blog/')) {
            const blogSlug = url.replace('/blog/', '').replace(/\/+$/,'');
            if (!blogSlugs.has(blogSlug)) {
              // try fuzzy match against blogSlugs
              let bestB = { slug: '', dist: Infinity };
              for (const b of blogSlugs) {
                const d = levenshtein(blogSlug, b);
                if (d < bestB.dist) bestB = { slug: b, dist: d };
              }
              // accept if close enough (<=3 edits)
              if (bestB.slug && bestB.dist <= (options.aggressive ? 5 : 3)) {
                const suggestionUrl = `/blog/${bestB.slug}`;
                suggestions.push({ file, line: i + 1, original: url, target: blogSlug, suggestion: suggestionUrl });
                if (!dry) {
                  const re = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                  lines[i] = line.replace(re, suggestionUrl);
                }
              }
            }
          }
        }
      }
    }
    if (!dry) {
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
    }
  }

  return suggestions;
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const aggressive = args.includes('--aggressive');
const fixBlog = args.includes('--fix-blog');
const verbose = args.includes('--verbose');
if (verbose) console.log('Options:', { apply, aggressive, fixBlog });
const results = run(!apply, { aggressive, fixBlog, verbose });
if (results.length === 0) {
  console.log('No auto-fix suggestions found.');
} else {
  console.log(`Found ${results.length} suggestions:`);
  for (const s of results) {
    console.log(`- ${s.file}:${s.line} ${s.original} -> ${s.suggestion || 'NO_SUGGESTION'}`);
  }
  if (!apply) console.log('\nRun with `npx tsx scripts/fix-markdown-links.ts --apply` to apply suggested fixes.');
  if (!apply) console.log('Use `--aggressive` to relax thresholds, `--fix-blog` to enable blog slug suggestions.');
}
