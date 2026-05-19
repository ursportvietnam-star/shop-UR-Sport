/**
 * ai-advisor.mjs — URSport AI Content Advisor v2.0
 *
 * Chức năng:
 *   1. [website] Kiểm tra website hằng ngày: HTTP status, SEO meta, response time
 *   2. [blog]    Quét file .md → phát hiện lỗi → AI gợi ý bài viết tiếp theo
 *   3. [product] AI phân tích danh mục → gợi ý sản phẩm nên đăng tiếp theo
 *   4. [full]    Chạy cả 3 module (default)
 *
 * Cách dùng:
 *   node ai-advisor.mjs
 *   node ai-advisor.mjs --mode=website
 *   node ai-advisor.mjs --mode=blog
 *   node ai-advisor.mjs --mode=product
 *   node ai-advisor.mjs --mode=full --export
 *   node ai-advisor.mjs --quiet
 *
 * Env:
 *   GEMINI_KEY=AIza...    (bắt buộc cho AI suggestions)
 *   SITE_URL=https://...  (optional, default: http://localhost:5173)
 */

import fs from 'fs';

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE   = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'full';
const EXPORT = args.includes('--export');
const QUIET  = args.includes('--quiet');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
const SITE_URL   = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const SEO_FILES = [
  '01-ao-thun-nam.md',
  '02-quan-the-thao.md',
  '03-do-gym.md',
  '04-chat-lieu.md',
  '05-size.md',
  '06-phoi-do.md',
  '07-buyer.md',
];

const KEY_PAGES = [
  { url: '/',                     label: 'Trang chủ' },
  { url: '/ao-thun-nam',          label: 'Áo thun nam' },
  { url: '/ao-thun-the-thao-nam', label: 'Áo thể thao nam' },
  { url: '/ao-polo-nam',          label: 'Áo polo nam' },
  { url: '/quan-the-thao-nam',    label: 'Quần thể thao' },
  { url: '/phu-kien-the-thao',    label: 'Phụ kiện TT' },
  { url: '/blog',                 label: 'Blog' },
];

const REQUIRED_FIELDS = [
  '1. SEO CORE', '2. INTERNAL LINK MAP', '3. CONTENT BLUEPRINT',
  '4. FAQ', '5. CTA', '6. SCHEMA',
  'Primary keyword:', 'Meta Description:', 'Slug:', 'Canonical URL:',
  'H2 #1:', 'H2 #2:', 'H2 #3:', 'Image filename:', 'Alt text:', 'AI image prompt:',
];

const PRODUCT_CATEGORIES = [
  { name: 'Áo thun nam',         slug: 'ao-thun-nam',          season: 'summer', skuCount: 8 },
  { name: 'Áo thể thao nam',     slug: 'ao-thun-the-thao-nam', season: 'all',    skuCount: 8 },
  { name: 'Áo polo nam',         slug: 'ao-polo-nam',          season: 'all',    skuCount: 8 },
  { name: 'Quần thể thao nam',   slug: 'quan-the-thao-nam',    season: 'summer', skuCount: 8 },
  { name: 'Phụ kiện thể thao',   slug: 'phu-kien-the-thao',    season: 'all',    skuCount: 8 },
];

// ─── ANSI COLORS ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',  bold:   '\x1b[1m',  dim:    '\x1b[2m',
  red:    '\x1b[31m', green:  '\x1b[32m', yellow: '\x1b[33m',
  blue:   '\x1b[34m', cyan:   '\x1b[36m', white:  '\x1b[37m',
};

const log  = (...a) => !QUIET && console.log(...a);
const qlog = (...a) => console.log(...a); // always show (even in --quiet)
const info    = m => log(`${C.cyan}${m}${C.reset}`);
const success = m => log(`${C.green}${m}${C.reset}`);
const warn    = m => log(`${C.yellow}${m}${C.reset}`);
const dimLog  = m => log(`${C.dim}${m}${C.reset}`);
const hdr     = m => log(`\n${C.bold}${C.white}${m}${C.reset}`);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function bar(pct, w = 18) {
  const f = Math.round((pct / 100) * w);
  return `[${'█'.repeat(f)}${'░'.repeat(w - f)}] ${String(pct).padStart(3)}%`;
}

function parseArticles(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\n(?=## \d+\.)/)
    .filter(p => /^## \d+\./m.test(p.trim())) // chỉ lấy phần có heading ## N.
    .map(p => {
      const m = p.match(/^## (\d+)\. (.+)/m);
      return { id: m?.[1] || '?', title: m?.[2]?.trim() || 'Unknown', content: p, file: filePath };
    });
}

function checkArticle(art) {
  const errs = [];
  for (const f of REQUIRED_FIELDS)
    if (!art.content.includes(f)) errs.push({ type: 'field', msg: `Thiếu: "${f}"` });

  const words = art.content.split(/\s+/).length;
  if (words < 150) errs.push({ type: 'thin', msg: `Quá ngắn (${words} từ)` });

  const qCount = (art.content.match(/^Q:/gm) || []).length;
  if (qCount < 3) errs.push({ type: 'faq', msg: `FAQ thiếu (${qCount}/3 câu)` });

  const ctaLine = art.content.match(/5\. CTA\n(.+)/)?.[1]?.trim() || '';
  if (ctaLine.length < 20) errs.push({ type: 'cta', msg: 'CTA rỗng hoặc quá ngắn' });

  if (!art.content.match(/Priority:\s*(HIGH|MEDIUM|LOW)/i))
    errs.push({ type: 'priority', msg: 'Thiếu Priority' });

  return errs;
}

async function askGemini(prompt) {
  if (!GEMINI_KEY) return '⚠️  Chưa có GEMINI_KEY — set biến môi trường: GEMINI_KEY=AIza... node ai-advisor.mjs';
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6 },
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return `[Lỗi Gemini ${res.status}: ${e.error?.message || 'Unknown'}]`;
    }
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || `[Lỗi: không nhận được phản hồi]`;
  } catch (e) {
    return `[Lỗi kết nối: ${e.message}]`;
  }
}

function saveRun(data) {
  const file = 'runs.json';
  let runs = [];
  try { if (fs.existsSync(file)) runs = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (!Array.isArray(runs)) runs = [];
  runs.unshift(data);
  if (runs.length > 30) runs = runs.slice(0, 30);
  fs.writeFileSync(file, JSON.stringify(runs, null, 2));
}

function exportMarkdown(sections) {
  const date = new Date().toISOString().split('T')[0];
  const fname = `ai-report-${date}.md`;
  const content = [
    `# URSport AI Advisor Report — ${date}`,
    '',
    ...sections,
  ].join('\n');
  fs.writeFileSync(fname, content, 'utf8');
  success(`\n📄 Đã xuất report: ${fname}`);
  return fname;
}

// ─── MODULE 1: WEBSITE HEALTH CHECK ──────────────────────────────────────────

async function checkWebsite() {
  hdr('═══ MODULE 1: WEBSITE HEALTH CHECK ═══');
  info(`🌐 Kiểm tra: ${SITE_URL}  (SPA — H1 & canonical inject bởi React sau hydrate)\n`);

  const results = [];
  const t0 = Date.now();

  // Check /api/health endpoint
  try {
    const res = await fetch(`${SITE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json().catch(() => ({}));
    const icon = res.ok ? `${C.green}✅` : `${C.red}❌`;
    log(`  ${icon}${C.reset} ${'API /api/health'.padEnd(22)} HTTP ${res.status}  ${data.status === 'ok' ? 'status: ok ✓' : JSON.stringify(data)}`);
  } catch {
    warn(`  ⚠️  API /api/health — Không kết nối được`);
  }
  log('');

  for (const page of KEY_PAGES) {
    const url = `${SITE_URL}${page.url}`;
    const pt = Date.now();
    let status = null, ms = null;
    const errors = [];  // lỗi thực sự
    const notes  = [];  // SPA-expected

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      status = res.status;
      ms = Date.now() - pt;
      const html = await res.text();

      // ── Real errors ────────────────────────────────────────
      if (!/<title[^>]*>[^<]{5}/i.test(html))
        errors.push('Thiếu title tag');
      if (!/meta[^>]+name=["']description["'][^>]+content=["'][^"']{10}/i.test(html) &&
          !/meta[^>]+content=["'][^"']{10}[^>]*name=["']description["']/i.test(html))
        errors.push('Thiếu meta description');
      if (!/og:title/i.test(html))
        errors.push('Thiếu Open Graph og:title');
      if (ms > 3000)
        errors.push(`Response chậm: ${ms}ms`);

      // ── SPA-expected (note only) ───────────────────────────
      if (!/<h1[\s>]/i.test(html))
        notes.push('H1 (React inject)');
      if (!/rel=["']canonical["']/i.test(html))
        notes.push('canonical (React inject)');

    } catch (err) {
      status = err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
      ms = Date.now() - pt;
      errors.push(err.name === 'AbortError' ? 'Timeout >8s' : err.message.slice(0, 60));
    }

    const isOk = status === 200 && errors.length === 0;
    const icon = isOk
      ? `${C.green}✅`
      : status === 200 ? `${C.yellow}⚠️ ` : `${C.red}❌`;
    const timeStr = ms ? `${ms}ms`.padStart(6) : '  ---';

    log(`  ${icon}${C.reset} ${page.label.padEnd(22)} HTTP ${String(status).padEnd(7)} ${timeStr}`);
    for (const e of errors) log(`        ${C.red}↳ [LỖI] ${e}${C.reset}`);
    for (const n of notes)  dimLog(`        ↳ [SPA]  ${n}`);

    results.push({ ...page, status, ms, errors, notes, ok: isOk });
  }

  const ok    = results.filter(r => r.ok).length;
  const bad   = results.filter(r => !r.ok).length;
  const total = Date.now() - t0;

  log('');
  if (bad === 0) {
    success(`  ✅ Tất cả ${ok}/${results.length} trang OK  ⏱ ${total}ms`);
  } else {
    warn(`  ⚠️  OK: ${ok}/${results.length}  ❌ Lỗi thực: ${bad} trang  ⏱ ${total}ms`);
  }
  dimLog(`  Ghi chú: [SPA] là bình thường với React SPA.`);

  const mdSection = [
    '## 🌐 Website Health Check',
    '',
    `| Trang | Status | ms | Lỗi | SPA Notes |`,
    `|-------|--------|----|-----|-----------|`,
    ...results.map(r =>
      `| ${r.label} | ${r.status} | ${r.ms} | ${r.errors.join(', ') || '—'} | ${r.notes.join(', ') || '—'} |`
    ),
  ].join('\n');

  return { results, summary: { ok, bad, total }, mdSection };
}


// ─── MODULE 2: BLOG CONTENT CHECK ────────────────────────────────────────────

async function checkBlog() {
  hdr('═══ MODULE 2: BLOG CONTENT CHECK ═══');
  info('📋 Đang quét chất lượng tất cả file .md...\n');

  const all = [], errors = [], good = [];

  for (const file of SEO_FILES) {
    if (!fs.existsSync(file)) { warn(`   ⚠️  Không tìm thấy: ${file}`); continue; }
    for (const art of parseArticles(file)) {
      const errs = checkArticle(art);
      art.errors = errs;
      art.errorCount = errs.length;
      all.push(art);
      (errs.length > 0 ? errors : good).push(art);
    }
  }

  const pct = all.length ? Math.round((good.length / all.length) * 100) : 0;
  log(`  ${C.green}✅ Đã chuẩn hóa:  ${good.length} bài${C.reset}`);
  log(`  ${C.red}❌ Cần chuẩn hóa: ${errors.length} bài${C.reset}`);
  log(`  ${C.cyan}📊 Tổng:          ${all.length} bài  ${bar(pct)}${C.reset}`);

  // Progress by file
  log('');
  hdr('─── Tiến độ theo file:');
  const byFile = {};
  for (const a of all) {
    if (!byFile[a.file]) byFile[a.file] = { t: 0, d: 0 };
    byFile[a.file].t++;
    if (a.errors.length === 0) byFile[a.file].d++;
  }
  for (const [f, s] of Object.entries(byFile)) {
    const p = Math.round((s.d / s.t) * 100);
    const icon = p === 100 ? '✅' : p >= 50 ? '🔄' : '❌';
    log(`  ${icon} ${f.padEnd(27)} ${bar(p, 14)} ${s.d}/${s.t}`);
  }

  // Error list
  if (errors.length > 0) {
    log('');
    hdr('─── Bài viết cần chuẩn hóa (sắp xếp theo mức độ):');
    const sorted = [...errors].sort((a, b) => b.errorCount - a.errorCount);
    const grouped = {};
    for (const a of sorted) {
      if (!grouped[a.file]) grouped[a.file] = [];
      grouped[a.file].push(a);
    }
    for (const [f, arts] of Object.entries(grouped)) {
      log(`\n  ${C.cyan}📂 ${f} (${arts.length} bài):${C.reset}`);
      for (const a of arts) {
        const level = a.errorCount > 5
          ? `${C.red}[CRITICAL]`
          : a.errorCount > 2
            ? `${C.yellow}[WARNING] `
            : `${C.dim}[MINOR]   `;
        log(`    ${level}${C.reset} ${a.id}. ${a.title} — ${a.errorCount} lỗi`);
        for (const e of a.errors.slice(0, 3)) dimLog(`          ⚠️  ${e.msg}`);
        if (a.errors.length > 3) dimLog(`          ... và ${a.errors.length - 3} lỗi khác`);
      }
    }
  }

  // AI suggestions
  log('');
  hdr('─── 🧠 AI đang phân tích bài viết tiếp theo...');

  const sample = errors.slice(0, 8)
    .map(a => `- [${a.file}] Bài ${a.id}: "${a.title}" | ${a.errorCount} lỗi | Lỗi chính: ${a.errors.slice(0, 2).map(e => e.msg).join(', ')}`)
    .join('\n');

  const goodTitles = good.slice(0, 5).map(a => `"${a.title}"`).join(', ');

  const prompt = `Bạn là SEO Content Strategist cho URSport — thời trang thể thao nam Việt Nam.

TIẾN ĐỘ: ${good.length} bài chuẩn hóa / ${all.length} tổng (${pct}%)
ĐÃ CÓ: ${goodTitles || 'Chưa có'}

BÀI CẦN CHUẨN HÓA (nhiều lỗi nhất trước):
${sample || 'Tất cả đã hoàn thành! 🎉'}

NHIỆM VỤ:
1. ⭐ TOP 3 bài nên chuẩn hóa NGAY HÔM NAY — lý do cụ thể (commercial intent, mùa hè VN, chuyển đổi)
2. 💡 3 ý tưởng bài blog MỚI phù hợp mùa hè 2026 cho nam giới VN mua activewear
3. 🔗 2 cặp internal link nên thêm ngay giữa các bài hiện có

Trả lời tiếng Việt, ngắn gọn, dùng emoji, actionable.`;

  const advice = await askGemini(prompt);
  log('');
  log(advice);

  const mdSection = [
    '## 📝 Blog Content Check',
    '',
    `- ✅ Đã chuẩn hóa: **${good.length}** bài`,
    `- ❌ Cần chuẩn hóa: **${errors.length}** bài`,
    `- 📊 Tiến độ tổng: **${pct}%**`,
    '',
    '### AI Gợi ý',
    '',
    advice,
  ].join('\n');

  return { all, errors, good, pct, mdSection };
}

// ─── MODULE 3: PRODUCT SUGGESTION ────────────────────────────────────────────

async function checkProducts() {
  hdr('═══ MODULE 3: PRODUCT SUGGESTION AI ═══');

  const month = new Date().getMonth() + 1;
  const isSummer = month >= 4 && month <= 9;
  const season = isSummer
    ? `🔥 Mùa hè (tháng ${month}) — nhu cầu đồ thoáng mát, gym, chạy bộ tăng cao`
    : `❄️ Mùa mát (tháng ${month}) — nhu cầu áo dài tay, khoác nhẹ tăng`;

  info(`📅 ${season}\n`);

  // Analyze .md file coverage per category
  const catStats = PRODUCT_CATEGORIES.map(cat => {
    let mentions = 0;
    for (const file of SEO_FILES) {
      if (!fs.existsSync(file)) continue;
      const raw = fs.readFileSync(file, 'utf8').toLowerCase();
      mentions += (raw.match(new RegExp(cat.name.toLowerCase().replace(/ /g, '.'), 'g')) || []).length;
    }
    const coverPct = Math.min(100, Math.round((mentions / 40) * 100));
    const hot = cat.season === 'all' || (isSummer && cat.season === 'summer') || (!isSummer && cat.season === 'winter');
    return { ...cat, mentions, coverPct, hot };
  });

  hdr('─── Phân tích danh mục hiện tại:');
  for (const c of catStats) {
    const icon = c.hot ? '🔥' : '❄️ ';
    const hotLabel = c.hot ? `${C.red}HOT${C.reset}` : `${C.dim}off${C.reset}`;
    log(`  ${icon} ${c.name.padEnd(26)} SKU: ${String(c.skuCount).padStart(2)}  SEO: ${bar(c.coverPct, 10)}  ${hotLabel}`);
  }

  log('');
  hdr('─── 🧠 AI đang phân tích sản phẩm nên đăng tiếp theo...');

  const catInfo = catStats
    .map(c => `- ${c.name}: ${c.skuCount} SKU hiện có, phủ SEO ${c.coverPct}%${c.hot ? ' [HOT mùa này]' : ''}`)
    .join('\n');

  const prompt = `Bạn là Product Manager + SEO Specialist cho URSport — thương hiệu đồ thể thao nam Việt Nam.

THỜI ĐIỂM: ${season}

DANH MỤC VÀ SKU HIỆN TẠI:
${catInfo}

SẢN PHẨM ĐÃ CÓ (để tránh trùng):
- Áo thun: Cotton Starship, Graphic Run Fast, Oversize UrStyle, Henley Cổ Nút, Sọc Ngang, Pocket Tee, Longline, In Chìm
- Áo thể thao: Pro-Dry, Tanktop UrArmor, Compression Dài Tay, NightRun Phản Quang, V-Neck Sport, Camo, Windbreaker, Stringer
- Áo polo: Golf Classic Lux, Sporty Mesh, Stripe Bo Tay, Zipper Tech, Dệt Kim Knit, Active Dri-Fit, Pattern Dot, Long Sleeve Winter
- Quần: Short Elite Night, Jogger UrFocus, Đùi 2 Lớp, Long Pants Pro, Basketball, Legging, Cargo Sport, Short Bơi
- Phụ kiện: Bình nước Tritan, Thảm yoga TPE, Túi Duffel, Găng tay Pro-Grip, Nón kết, Dây nhảy, Tất Cotton, Mini Band

NHIỆM VỤ:
1. 🔥 TOP 5 sản phẩm NÊN ĐĂNG THÊM ngay (tên cụ thể + danh mục + lý do phù hợp mùa/thị trường VN)
2. 📸 Brief ảnh chụp ngắn cho mỗi sản phẩm (để chụp phong cách lifestyle/ecommerce)
3. 💰 Mức giá đề xuất (phân khúc 150k–650k của URSport)
4. 🏷️ 3–5 từ khóa SEO chính cho mỗi sản phẩm mới

Format: Số thứ tự rõ ràng, dùng emoji, ngắn gọn, tiếng Việt, actionable.`;

  const advice = await askGemini(prompt);
  log('');
  log(advice);

  const mdSection = [
    '## 📦 Product Suggestion',
    '',
    `**Thời điểm:** ${season}`,
    '',
    '### Phân tích danh mục',
    '',
    '| Danh mục | SKU | SEO Coverage | Mùa |',
    '|----------|-----|-------------|-----|',
    ...catStats.map(c => `| ${c.name} | ${c.skuCount} | ${c.coverPct}% | ${c.hot ? '🔥 HOT' : '❄️ Off'} |`),
    '',
    '### AI Gợi ý Sản Phẩm',
    '',
    advice,
  ].join('\n');

  return { catStats, season, mdSection };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const tsVN = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  console.log(`\n${C.bold}${C.cyan}╔════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   🤖  URSport AI Content Advisor  v2.0         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   📅  ${tsVN.padEnd(41)}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   ⚙️   Mode: ${MODE.padEnd(35)}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════╝${C.reset}\n`);

  if (!GEMINI_KEY) {
    warn('⚠️  GEMINI_KEY chưa được đặt — AI suggestions sẽ bị tắt.');
    warn('   Để bật AI: GEMINI_KEY=AIza... node ai-advisor.mjs\n');
  }

  const runData = { timestamp: new Date().toISOString(), mode: MODE, results: {} };
  const mdSections = [];

  // Run modules based on mode
  if (MODE === 'website' || MODE === 'full') {
    const r = await checkWebsite();
    runData.results.website = r.summary;
    mdSections.push(r.mdSection);
  }

  if (MODE === 'blog' || MODE === 'full') {
    const r = await checkBlog();
    runData.results.blog = { total: r.all.length, good: r.good.length, errors: r.errors.length, pct: r.pct };
    mdSections.push(r.mdSection);
  }

  if (MODE === 'product' || MODE === 'full') {
    const r = await checkProducts();
    runData.results.product = { season: r.season };
    mdSections.push(r.mdSection);
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  runData.elapsed = `${elapsed}s`;

  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════${C.reset}`);
  qlog(`${C.bold}  ✨ Xong! Thời gian: ${elapsed}s${C.reset}`);
  qlog(`${C.dim}  Chạy lại bất cứ lúc nào: node ai-advisor.mjs${C.reset}`);
  if (!GEMINI_KEY) qlog(`${C.yellow}  💡 Tip: GEMINI_KEY=AIza... node ai-advisor.mjs --mode=full${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════${C.reset}\n`);

  // Save runs history
  try { saveRun(runData); } catch {}

  // Export markdown report
  if (EXPORT && mdSections.length > 0) {
    exportMarkdown(mdSections);
  }
}

main().catch(err => {
  console.error(`${C.red}❌ Lỗi không xử lý được: ${err.message}${C.reset}`);
  process.exit(1);
});
