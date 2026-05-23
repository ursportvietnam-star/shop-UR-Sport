import { PRODUCTS } from '../src/data';

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

function normalize(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-+/g, '-');
}
function tokens(s: string) {
  const stopWords = new Set(['nam', 'nu', 'the', 'thao', 'ursport', 'ur', 'style', 'product', 'ao', 'quan']);
  return normalize(s).split('-').filter(t => t && !stopWords.has(t));
}

function bestProductMatch(slug: string) {
  const target = normalize(slug);
  const targetTokens = tokens(slug);
  let best = { slug: '', score: Infinity, overlap: 0 };
  for (const p of PRODUCTS) {
    const cs = normalize(p.slug || '');
    const nameNorm = normalize(p.name || '');
    const dist = levenshtein(target, cs);
    const normDist = dist / Math.max(target.length || 1, cs.length || 1);
    const cTokens = tokens(p.slug || '');
    const common = targetTokens.filter(t => cTokens.includes(t)).length;
    const union = new Set([...targetTokens, ...cTokens]).size || 1;
    const overlap = common / union;
    const nameDist = levenshtein(target, nameNorm);
    const nameNormDist = nameDist / Math.max(target.length || 1, nameNorm.length || 1);
    const score = Math.min(normDist, nameNormDist) - overlap * 0.25;
    if (score < best.score) best = { slug: p.slug || '', score, overlap };
  }
  return best;
}

const examples = [
  'quan-jogger-training-urfocus',
  'ao-thun-the-thao-in-hoa-tiet-camo',
  'ao-thun-cotton-compact-ursport'
];
for (const ex of examples) {
  const b = bestProductMatch(ex);
  console.log(ex, '->', b);
}
