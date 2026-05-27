import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = process.argv.slice(2);
const mode = getArg('--mode', 'automation');
const productId = getArg('--product-id', 'at-1');
const maxTokens = getArg('--max-tokens', '900');
const ollamaModel = getArg('--model', process.env.OLLAMA_MODEL || 'qwen2.5:latest');
const ollamaUrl = process.env.OLLAMA_API || 'http://localhost:11434/api/generate';
const stableCpu = getArg('--stable-cpu', 'true') !== 'false';
const pythonExe = path.join(root, '.venv', 'Scripts', 'python.exe');
const outputsDir = path.join(root, 'outputs');

const strategyFiles = [
  'LOCAL-AI-AUTOMATION.md',
  'QUICK-START-GUIDE.md',
  'IMPLEMENTATION-CHECKLIST.md',
  'PRODUCT_SKILL.md',
  'PRODUCT-UPDATE-EXAMPLES.md',
  '10-ai-automation.md',
  'SEO-STRATEGY-2026.md',
  'AI-CITATIONS-GUIDE.md',
];

const seoFiles = [
  '.env',
  'index.html',
  'public/robots.txt',
  'public/llms.txt',
  'public/sitemap.xml',
];

const ignoredWorkspaceDirs = new Set([
  '.git',
  '.venv',
  'node_modules',
  'dist',
  'chroma_db',
  'outputs',
  '.firebase',
]);

function getArg(name, fallback = '') {
  const exact = args.find(arg => arg === name);
  if (exact) return 'true';
  const pair = args.find(arg => arg.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : fallback;
}

function log(message = '') {
  console.log(message);
}

function readIfExists(file, maxChars = 6000) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8').slice(0, maxChars);
}

function summarizeWorkspace() {
  const counts = new Map();
  const importantFiles = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (!ignoredWorkspaceDirs.has(entry.name)) walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase() || '[no-ext]';
      counts.set(ext, (counts.get(ext) || 0) + 1);

      if (
        relPath === 'package.json' ||
        relPath === 'server.ts' ||
        relPath === 'index.html' ||
        relPath.startsWith('src/') ||
        relPath.startsWith('public/') ||
        relPath.endsWith('.md')
      ) {
        importantFiles.push(relPath);
      }
    }
  }

  walk(root);

  const topExtensions = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([ext, count]) => `${ext}: ${count}`)
    .join(', ');

  return {
    topExtensions,
    importantCount: importantFiles.length,
    importantSample: importantFiles.slice(0, 60).join('\n'),
  };
}

function localDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Saigon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type)?.value || '00';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

async function runCommand(command, commandArgs, options = {}) {
  try {
    const result = await execFileAsync(command, commandArgs, {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, ...(options.env || {}) },
      timeout: options.timeout || 120000,
      maxBuffer: 1024 * 1024 * 8,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || '').trim(),
    };
  }
}

async function runShellCommand(commandLine, options = {}) {
  if (process.platform === 'win32') {
    return runCommand('cmd.exe', ['/d', '/s', '/c', commandLine], options);
  }
  return runCommand('sh', ['-lc', commandLine], options);
}

async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { ok: false, message: `Ollama HTTP ${response.status}` };
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models.map(item => item.name).join(', ') : '';
    return { ok: true, message: models || 'Ollama running' };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

async function askLocalAI(prompt, numPredict = 700) {
  const response = await fetch(ollamaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      prompt,
      stream: false,
      options: {
        num_predict: numPredict,
        num_ctx: Number(process.env.OLLAMA_NUM_CTX || 2048),
        num_gpu: stableCpu ? 0 : Number(process.env.OLLAMA_NUM_GPU || -1),
      },
    }),
    signal: AbortSignal.timeout(900000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama HTTP ${response.status}: ${text}`);
  }
  const data = await response.json();
  return String(data.response || '').trim();
}

function isOllamaResourceError(text) {
  return /CUDA|resource|runner has unexpectedly stopped|illegal memory|Internal Server Error|HTTP 500/i.test(text);
}

async function generateProduct() {
  if (!fs.existsSync(pythonExe)) {
    throw new Error(`Không tìm thấy Python venv: ${pythonExe}`);
  }

  log(`Nạp embeddings từ scripts/products_seed.json...`);
  const ingest = await runCommand(pythonExe, ['scripts/ingest_embeddings.py'], { timeout: 300000 });
  if (!ingest.ok) {
    throw new Error(`ingest_embeddings.py lỗi:\n${ingest.stderr || ingest.stdout}`);
  }

  log(`Tạo mô tả sản phẩm ${productId} bằng Ollama...`);
  const productEnv = {
    OLLAMA_MODEL: ollamaModel,
    OLLAMA_NUM_CTX: process.env.OLLAMA_NUM_CTX || '2048',
    OLLAMA_NUM_GPU: stableCpu ? '0' : (process.env.OLLAMA_NUM_GPU || '-1'),
  };
  let generate = await runCommand(
    pythonExe,
    ['scripts/generate_product_descriptions.py', '--product-id', productId, '--max-tokens', maxTokens],
    { timeout: 1200000, env: productEnv },
  );
  if (!generate.ok && isOllamaResourceError(`${generate.stderr}\n${generate.stdout}`)) {
    log('Ollama bị lỗi tài nguyên/GPU. Thử lại chế độ ổn định CPU với output ngắn hơn...');
    const retryTokens = String(Math.min(Number(maxTokens) || 900, 500));
    generate = await runCommand(
      pythonExe,
      ['scripts/generate_product_descriptions.py', '--product-id', productId, '--max-tokens', retryTokens],
      { timeout: 1200000, env: { ...productEnv, OLLAMA_NUM_GPU: '0', OLLAMA_NUM_CTX: '1536' } },
    );
  }
  if (!generate.ok) {
    throw new Error(`generate_product_descriptions.py lỗi:\n${generate.stderr || generate.stdout}`);
  }

  const outputFile = path.join(outputsDir, `${productId}.md`);
  log(generate.stdout);
  log(`Xong: ${outputFile}`);
  return outputFile;
}

async function buildWorkspaceAutomationReport({ deep = false } = {}) {
  const now = new Date();
  const gitStatus = await runCommand('git', ['status', '--short'], { timeout: 30000 });
  const typecheck = await runShellCommand('npx tsc --noEmit', { timeout: 240000 });
  const ollama = await checkOllama();
  const workspace = summarizeWorkspace();
  const buildCheck = deep
    ? await runShellCommand('npx vite build', { timeout: 600000 })
    : null;

  const seoChecks = seoFiles.map(file => {
    const content = readIfExists(file, 20000);
    if (!content) return `- ${file}: thiếu hoặc không đọc được`;
    const hasDomain = content.includes('https://www.ursport.vn') || content.includes('www.ursport.vn');
    const hasVercel = content.includes('shop-ur-sport.vercel.app');
    return `- ${file}: ${hasDomain ? 'có domain chính' : 'cần kiểm tra domain'}${hasVercel ? ', còn vercel.app' : ''}`;
  }).join('\n');

  const planContext = strategyFiles.map(file => {
    const content = readIfExists(file, 1800);
    return content ? `--- ${file} ---\n${content}` : `--- ${file} ---\n[missing]`;
  }).join('\n\n');

  const deterministicReport = [
    `# URSport Workspace AI Automation Report`,
    ``,
    `Thời gian: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Saigon' })}`,
    `Workspace: ${root}`,
    ``,
    `## Kiểm tra nhanh`,
    `- Git status: ${gitStatus.ok ? (gitStatus.stdout || 'sạch') : `lỗi: ${gitStatus.stderr}`}`,
    `- TypeScript: ${typecheck.ok ? 'pass' : 'fail'}`,
    deep ? `- Build check: ${buildCheck?.ok ? 'pass' : 'fail'}` : `- Build check: bỏ qua trong daily light report`,
    `- Ollama: ${ollama.ok ? `đang chạy (${ollama.message})` : `chưa sẵn sàng (${ollama.message})`}`,
    ``,
    `## Workspace Scope`,
    `- Đã quét toàn bộ thư mục dự án, bỏ qua thư mục nặng: ${Array.from(ignoredWorkspaceDirs).join(', ')}`,
    `- Nhóm file chính: ${workspace.topExtensions}`,
    `- Số file quan trọng trong app/docs/public: ${workspace.importantCount}`,
    ``,
    `## SEO Files`,
    seoChecks,
  ].join('\n');

  const fallbackSummary = [
    `1. Trạng thái`,
    `- Workspace đã được kiểm tra theo LOCAL-AI-AUTOMATION.md.`,
    `- TypeScript: ${typecheck.ok ? 'pass' : 'fail'}.`,
    `- SEO foundation files đã được kiểm tra domain/sitemap/robots/llms.`,
    ``,
    `2. Rủi ro`,
    `- Có nhiều file đang modified/untracked, cần review trước khi deploy.`,
    `- Ollama chỉ dùng để tóm tắt; nếu Ollama lỗi, báo cáo kỹ thuật vẫn hợp lệ.`,
    ``,
    `3. 3 việc ưu tiên hôm nay`,
    `- Review các file đang thay đổi trong git status.`,
    `- Kiểm tra lại sitemap/robots/llms sau khi cập nhật domain.`,
    `- Hoàn thiện checklist SEO/product/blog trước khi publish.`,
    ``,
    `4. File cần review`,
    `- LOCAL-AI-AUTOMATION.md`,
    `- IMPLEMENTATION-CHECKLIST.md`,
    `- PRODUCT_SKILL.md`,
    `- SEO-STRATEGY-2026.md`,
    `- AI-CITATIONS-GUIDE.md`,
    ``,
    `5. Lệnh nên chạy tiếp theo`,
    `- npm run local-ai:daily`,
    deep ? `- npm run local-ai:weekly` : `- npm run local-ai:weekly khi cần audit sâu`,
  ].join('\n');

  let aiSummary = '';
  if (ollama.ok) {
    const prompt = [
      `Bạn là Codex local automation cho toàn bộ workspace UR Sport.`,
      `Nhiệm vụ này phải tuân thủ LOCAL-AI-AUTOMATION.md.`,
      `Đây là nhiệm vụ BÁO CÁO TOÀN THƯ MỤC, không phải viết bài sản phẩm riêng lẻ.`,
      `Chỉ đọc, kiểm tra, tổng hợp và đề xuất việc ưu tiên. Không publish, không push, không sửa giá/tồn kho/khuyến mãi.`,
      `Trả lời tiếng Việt ngắn gọn theo đúng format:`,
      `1. Trạng thái`,
      `2. Rủi ro`,
      `3. 3 việc ưu tiên hôm nay`,
      `4. File cần review`,
      `5. Lệnh nên chạy tiếp theo`,
      `Không viết mô tả sản phẩm, không tạo HTML/schema, không bịa số liệu, không yêu cầu publish/push.`,
      ``,
      `[CHECKS]`,
      deterministicReport,
      ``,
      `[IMPORTANT FILE SAMPLE]`,
      workspace.importantSample,
      ``,
      `[PLAN CONTEXT]`,
      planContext.slice(0, 15000),
    ].join('\n');
    aiSummary = await askLocalAI(prompt, 800).catch(error => `${fallbackSummary}\n\nGhi chú: Ollama summary không chạy được (${error.message}).`);
  }

  const report = [
    deterministicReport,
    ``,
    !typecheck.ok ? `## TypeScript Errors\n${typecheck.stderr || typecheck.stdout || 'Không có output lỗi.'}\n` : '',
    deep && buildCheck && !buildCheck.ok ? `## Build Errors\n${buildCheck.stderr || buildCheck.stdout || 'Không có output lỗi.'}\n` : '',
    ``,
    `## AI Summary`,
    aiSummary || fallbackSummary,
    ``,
    `## Commands`,
    `- npx tsc --noEmit: ${typecheck.ok ? 'pass' : 'fail'}`,
    deep && buildCheck ? `- npx vite build: ${buildCheck.ok ? 'pass' : 'fail'}` : `- npx vite build: skipped`,
  ].join('\n');

  fs.mkdirSync(outputsDir, { recursive: true });
  const fileName = `local-ai-workspace-report-${localDateStamp(now)}.md`;
  const outputPath = path.join(outputsDir, fileName);
  fs.writeFileSync(outputPath, report, 'utf8');
  log(report);
  log(`\nĐã lưu report: ${outputPath}`);
  return outputPath;
}

async function buildSeoReport() {
  return buildWorkspaceAutomationReport({ deep: false });
}

async function main() {
  fs.mkdirSync(outputsDir, { recursive: true });

  if (mode === 'product') {
    await generateProduct();
    return;
  }

  if (mode === 'automation' || mode === 'workspace' || mode === 'daily' || mode === 'report') {
    await buildWorkspaceAutomationReport({ deep: false });
    return;
  }

  if (mode === 'weekly' || mode === 'deep') {
    await buildWorkspaceAutomationReport({ deep: true });
    return;
  }

  if (mode === 'all') {
    await buildWorkspaceAutomationReport({ deep: true });
    return;
  }

  throw new Error(`Mode không hợp lệ: ${mode}. Dùng automation, daily, weekly, product hoặc all.`);
}

main().catch(error => {
  console.error(`\nLocal AI runner lỗi:\n${error.message}`);
  process.exit(1);
});
