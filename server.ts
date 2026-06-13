import express from "express";
import "dotenv/config";
import compression from "compression";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { registerProductFactoryRoutes } from "./server/productFactory";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(process.cwd(), "public");
const faviconConfigPath = path.resolve(publicRoot, "favicon-config.json");
const defaultFaviconUrl = "/images/products/icon-logo-ursport.png";

// In-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // Max 60 requests per minute per IP
let gitSyncInProgress = false;

const getGeminiApiKey = () => process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";

const compactAiContext = (value: string, maxLength = 6500) => {
  const normalized = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= maxLength) return normalized;

  const priorityBlocks = normalized
    .split(/\n(?=\d+\.|##|\*\*)/g)
    .filter(block => /quy tắc|cấu trúc|bắt buộc|nghiêm cấm|html|h2|figure|image|ảnh|caption|không|seo|mô tả|description/i.test(block))
    .join("\n\n");

  return (priorityBlocks || normalized).slice(0, maxLength).trim();
};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now > record.resetTime) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || "anonymous";
  const now = Date.now();

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please try again after 1 minute." });
  }

  next();
}

// Function to verify Firebase ID Token and check if the user is an admin
async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    
    if (!projectId || !apiKey) {
      console.error("Missing Firebase Project ID or API Key in server configuration");
      return false;
    }

    // 1. Verify token via Google Identity Toolkit REST API
    const lookupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!lookupResponse.ok) {
      console.error("Firebase ID Token verification failed via Identity Toolkit");
      return false;
    }

    const lookupData = await lookupResponse.json();
    const user = lookupData.users?.[0];
    if (!user) return false;

    // Default admin email bypass
    if (user.email === "ursportvietnam@gmail.com") {
      return true;
    }

    // 2. Check Firestore admins collection dynamically using User's token
    const uid = user.localId;
    const firestoreResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return firestoreResponse.ok;
  } catch (error) {
    console.error("Error verifying admin token:", error);
    return false;
  }
}

function isLocalRequest(req: express.Request) {
  const addr = req.socket?.remoteAddress || '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function canWriteLocalMedia(req: express.Request) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  const addr = req.socket?.remoteAddress || '';
  const isLocalDevRequest = process.env.NODE_ENV !== "production"
    && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(addr);
  const isDevBypass = isLocalDevRequest || (process.env.NODE_ENV !== "production" && process.env.BYPASS_ADMIN_AUTH === "true");

  if (isDevBypass) return true;
  if (!token) return false;

  return verifyAdminToken(token);
}

function isLocalDevAdminRequest(req: express.Request) {
  const addr = req.socket?.remoteAddress || '';
  const devHeader = String(req.headers["x-dev-admin"] || "");
  const isLocalHost = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(addr);
  return process.env.NODE_ENV !== "production" && isLocalHost && devHeader === "1";
}

function normalizeLocalMediaFolder(folderParam: string) {
  const folderMap: Record<string, string> = {
    images: "",
    root: "",
    blog: "blog",
    product: "product",
    products: "products",
    "product-descriptions": "products/descriptions",
    "size-guides": "products/size-guides",
    banners: "banners",
    nav: "nav",
    settings: "settings",
    "blog-categories": "blog/categories",
  };

  return Object.prototype.hasOwnProperty.call(folderMap, folderParam)
    ? folderMap[folderParam]
    : null;
}

function getContentType(req: express.Request) {
  return String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
}

function getImageContentTypeFromPath(value: string) {
  const cleanPath = value.split("?")[0].toLowerCase();
  if (cleanPath.endsWith(".ico")) return "image/x-icon";
  if (cleanPath.endsWith(".png")) return "image/png";
  if (cleanPath.endsWith(".webp")) return "image/webp";
  if (cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg")) return "image/jpeg";
  if (cleanPath.endsWith(".gif")) return "image/gif";
  if (cleanPath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function isSupportedFaviconPath(value: string) {
  const cleanPath = value.split("?")[0].toLowerCase();
  return [".ico", ".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg"].some((ext) => cleanPath.endsWith(ext));
}

function resolvePublicUrlPath(url: string) {
  const cleanUrl = String(url || "").split("?")[0].trim();
  if (!cleanUrl.startsWith("/") || cleanUrl.startsWith("//")) return null;

  const targetPath = path.resolve(publicRoot, decodeURIComponent(cleanUrl.slice(1)));
  const relative = path.relative(publicRoot, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return targetPath;
}

async function getConfiguredFaviconUrl() {
  try {
    const raw = await fs.readFile(faviconConfigPath, "utf8");
    const data = JSON.parse(raw);
    return String(data?.favicon || "").trim();
  } catch {
    return "";
  }
}

function slugifyFileBase(value: string, fallbackName: string) {
  return (value || fallbackName)
    .split(/[\\/]/)
    .pop()
    ?.trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallbackName;
}

function buildSafeImageFileName(req: express.Request, fallbackName: string, useUniqueSuffix = true) {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
  };
  const ext = mimeToExt[getContentType(req)];
  if (!ext) return null;

  const encodedOriginalName = Array.isArray(req.headers["x-file-name"])
    ? req.headers["x-file-name"][0]
    : req.headers["x-file-name"];
  const originalName = encodedOriginalName ? decodeURIComponent(encodedOriginalName) : "";
  const baseName = slugifyFileBase(originalName, fallbackName);
  if (!useUniqueSuffix) {
    return `${baseName}.${ext}`;
  }

  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return `${baseName}-${uniqueSuffix}.${ext}`;
}

function assertInsideDirectory(parentDir: string, targetPath: string) {
  const relative = path.relative(parentDir, targetPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function saveUploadedImage(
  req: express.Request,
  mediaFolder: string,
  fallbackName: string,
  options: { useUniqueSuffix?: boolean; overwrite?: boolean } = {}
) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw Object.assign(new Error("No image file received"), { statusCode: 400 });
  }

  const fileName = buildSafeImageFileName(req, fallbackName, options.useUniqueSuffix ?? true);
  if (!fileName) {
    throw Object.assign(new Error("Unsupported image format. Allowed formats: JPG, PNG, WebP, GIF, ICO"), { statusCode: 400 });
  }

  const imagesRoot = path.resolve(process.cwd(), "public", "images");
  const uploadDir = path.resolve(imagesRoot, mediaFolder);
  const targetPath = path.resolve(uploadDir, fileName);

  const isImagesRoot = uploadDir === imagesRoot;
  if ((!isImagesRoot && !assertInsideDirectory(imagesRoot, uploadDir)) || !assertInsideDirectory(uploadDir, targetPath)) {
    throw Object.assign(new Error("Invalid upload path"), { statusCode: 400 });
  }

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(targetPath, req.body, { flag: options.overwrite ? "w" : "wx" });

  return {
    fileName,
    url: mediaFolder
      ? `/images/${mediaFolder.replace(/\\/g, "/")}/${fileName}`
      : `/images/${fileName}`,
  };
}

async function syncRootFavicon(req: express.Request) {
  const contentType = getContentType(req);
  if (!["image/x-icon", "image/vnd.microsoft.icon"].includes(contentType)) {
    return false;
  }

  const faviconPath = path.resolve(process.cwd(), "public", "favicon.ico");
  await fs.writeFile(faviconPath, req.body);
  return true;
}

async function runGit(args: string[], cwd: string) {
  return execFileAsync("git", args, { cwd, maxBuffer: 1024 * 1024 });
}

function countPorcelainLines(stdout: string) {
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
}

async function startServer() {
  const app = express();
  app.use(compression());
  app.set("trust proxy", 1);
  const PORT = 3000;
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';

  // 1. Security Headers Middleware (Enhanced Helmet-like protection with CSP)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-DNS-Prefetch-Control", "on");
    res.setHeader("X-Download-Options", "noopen");
    // Firebase Auth popup needs access to its opener while it returns from
    // /__/auth/handler; same-origin breaks that handshake on localhost.
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "shop-ur-sport";
    const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.firebaseapp.com https://*.google.com https://*.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com https://*.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.google.com https://*.gstatic.com wss://*.firebaseapp.com wss://localhost:* ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* https://api.cloudinary.com https://res.cloudinary.com https://images.unsplash.com https://api.resend.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
      `img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://*.google.com https://*.googleapis.com https://*.googleusercontent.com https://*.gstatic.com`,
      `frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com https://youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com`,
      "media-src 'self' https://res.cloudinary.com https://www.youtube.com https://*.youtube.com https://youtube.com https://player.vimeo.com https://vimeo.com blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://*.google.com https://*.firebaseapp.com",
      "report-uri /api/csp-violation"
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
    next();
  });

  app.get("/favicon.ico", async (_req, res, next) => {
    try {
      const configuredFavicon = await getConfiguredFaviconUrl();
      const localFaviconPath = resolvePublicUrlPath(configuredFavicon);
      const fallbackFaviconPath = resolvePublicUrlPath(defaultFaviconUrl) || path.resolve(publicRoot, "favicon.ico");
      const faviconPath = localFaviconPath || fallbackFaviconPath;
      const sourceForType = localFaviconPath ? configuredFavicon : defaultFaviconUrl;

      const buffer = await fs.readFile(faviconPath);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Content-Type", getImageContentTypeFromPath(sourceForType));
      return res.send(buffer);
    } catch (error) {
      return next(error);
    }
  });

  // 2. CORS Middleware
  app.use((req, res, next) => {
    const allowedOrigins = [
      "https://www.ursport.vn",
      "https://ursport.vn",
      "https://shop-ur-sport.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-newsletter-token, x-file-name, x-dev-admin");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // 3. Rate limiting for API endpoints
  app.use("/api/*", apiRateLimiter);

  // 4. Payload size limit for admin AI/content drafts and API requests
  app.use(express.json({ limit: "256kb" }));

  // API routes
  registerProductFactoryRoutes(app, {
    isAdminRequest: canWriteLocalMedia,
    getGeminiApiKey,
  });

  app.post("/api/csp-violation", express.json({ type: ["application/json", "application/csp-report"], limit: "10kb" }), (req, res) => {
    const report = req.body?.["csp-report"];
    if (report) {
      console.warn("⚠️ CSP Violation Detected:", {
        documentUri: report["document-uri"],
        blockedUri: report["blocked-uri"],
        violatedDirective: report["violated-directive"]
      });
    }
    res.sendStatus(204);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/site-favicon", async (req, res) => {
    try {
      if (!(await canWriteLocalMedia(req))) {
        return res.status(401).json({ error: "Unauthorized favicon update" });
      }

      const favicon = String(req.body?.favicon || "").trim();
      if (!isSupportedFaviconPath(favicon)) {
        return res.status(400).json({ error: "Favicon must be an ICO, PNG, WebP, JPG, GIF or SVG file" });
      }

      const localFaviconPath = resolvePublicUrlPath(favicon);
      if (!localFaviconPath) {
        return res.status(400).json({ error: "Favicon must be a local public URL" });
      }

      await fs.access(localFaviconPath);
      await fs.writeFile(
        faviconConfigPath,
        JSON.stringify({ favicon, updatedAt: new Date().toISOString() }, null, 2)
      );
      return res.json({ success: true, favicon });
    } catch (error: any) {
      console.error("Site favicon update failed:", error);
      return res.status(error.statusCode || 500).json({
        error: error.message || "Failed to update site favicon",
      });
    }
  });

  // ─── Git Sync: Đồng bộ ảnh local lên GitHub → Vercel ───────────────────────
  app.post("/api/git-sync", async (req, res) => {
    // Bảo mật: chỉ cho phép từ localhost
    if (!isLocalRequest(req)) {
      return res
        .status(403)
        .json({ error: "Git sync chỉ khả dụng trên môi trường local." });
    }

    // Xác thực admin token
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : "";
    if (!token || !(await verifyAdminToken(token))) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (gitSyncInProgress) {
      return res.status(409).json({ error: "Git sync dang chay. Vui long doi lan hien tai hoan tat." });
    }

    const cwd = process.cwd();
    const scope = String(req.query.scope || 'images');
    const isCodeSync = scope === 'code';
    gitSyncInProgress = true;

    try {
      const statusArgs = isCodeSync
        ? ["status", "--porcelain", "--"]
        : ["status", "--porcelain", "--", "public/images"];
      const { stdout: statusOut } = await runGit(statusArgs, cwd);

      if (!statusOut.trim()) {
        return res.json({
          success: true,
          message: isCodeSync
            ? "Không có thay đổi code cần đồng bộ. Website đã up to date."
            : "Không có ảnh mới cần đồng bộ. Website đã up to date.",
          details: [],
        });
      }

      const changedFiles = countPorcelainLines(statusOut);
      const details: string[] = [];

      if (isCodeSync) {
        await runGit(["add", "--all"], cwd);
      } else {
        await runGit(["add", "--", "public/images"], cwd);
      }

      const diffArgs = isCodeSync
        ? ["diff", "--cached", "--name-only", "--"]
        : ["diff", "--cached", "--name-only", "--", "public/images"];
      const { stdout: stagedOut } = await runGit(diffArgs, cwd);
      const stagedFiles = stagedOut.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (stagedFiles.length === 0) {
        return res.json({
          success: true,
          message: isCodeSync
            ? "Không có thay đổi code nào cần commit sau khi stage."
            : "Không có thay đổi ảnh nào cần commit sau khi stage.",
          details,
        });
      }
      details.push(`✅ Staged ${changedFiles} file(s) ${isCodeSync ? 'từ repository' : 'từ public/images'}`);

      // Commit với timestamp
      const now = new Date()
        .toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        .replace(/,/g, "");
      const commitMsg = `sync(${isCodeSync ? 'code' : 'images'}): upload ${stagedFiles.length} file(s) - ${now}`;
      const { stdout: commitOut } = await runGit(["commit", "-m", commitMsg], cwd);
      details.push(`✅ ${commitOut.trim().split("\n")[0]}`);

      // Push lên remote
      const { stdout: pushOut, stderr: pushErr } = await runGit(["push"], cwd);
      details.push(`✅ Pushed → ${(pushOut || pushErr || "remote").trim().split("\n")[0]}`);

      console.log(`[git-sync] Đồng bộ thành công ${stagedFiles.length} file(s)`);
      return res.json({
        success: true,
        message: isCodeSync
          ? `Đã đồng bộ ${stagedFiles.length} file code lên GitHub. Vercel đang build lại...`
          : `Đã đồng bộ ${stagedFiles.length} ảnh lên GitHub. Vercel đang build lại...`,
        details,
      });
    } catch (err: any) {
      console.error("[git-sync] Error:", err.message);
      return res.status(500).json({
        error: "Git sync thất bại",
        details: err.stderr || err.message,
      });
    } finally {
      gitSyncInProgress = false;
    }
  });

  app.post(
    "/api/upload-local-image/:folder",
    express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"], limit: "10mb" }),
    async (req, res) => {
      try {
        if (!(await canWriteLocalMedia(req))) {
          return res.status(401).json({ error: "Unauthorized image upload" });
        }

        const mediaFolder = normalizeLocalMediaFolder(req.params.folder);
        if (mediaFolder === null) {
          return res.status(400).json({ error: "Unsupported local image folder" });
        }

        const saved = await saveUploadedImage(req, mediaFolder, "local-image", {
          useUniqueSuffix: false,
          overwrite: true,
        });
        const syncedRootFavicon = mediaFolder === "settings" ? await syncRootFavicon(req) : false;
        return res.json({ ...saved, syncedRootFavicon });
      } catch (error: any) {
        console.error("Local image upload failed:", error);
        return res.status(error.statusCode || 500).json({
          error: error.message || "Failed to save uploaded image locally",
        });
      }
    }
  );

  app.post("/api/gemini-json", async (req, res) => {
    try {
      const apiKey = getGeminiApiKey();
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
      const bypass = isLocalDevAdminRequest(req);

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      if (!bypass && (!token || !(await verifyAdminToken(token)))) {
        return res.status(401).json({ error: "Unauthorized AI request" });
      }

      const systemInstruction = String(req.body?.systemInstruction || "").trim();
      const userPrompt = String(req.body?.userPrompt || "").trim();

      if (!systemInstruction || !userPrompt) {
        return res.status(400).json({ error: "systemInstruction and userPrompt are required" });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}` }] }
            ],
            generationConfig: {
              response_mime_type: "application/json"
            }
          })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({ error: data?.error?.message || "Gemini request failed" });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return res.status(502).json({ error: "Gemini returned an empty response" });
      }

      return res.json({ text });
    } catch (error) {
      console.error("Gemini proxy failed:", error);
      return res.status(500).json({ error: "Gemini proxy failed" });
    }
  });

  // Proxy endpoint for Local AI (Ollama) to avoid CORS in browser
  app.post("/api/local-ai", async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
      const bypass = isLocalDevAdminRequest(req);

      if (!bypass && (!token || !(await verifyAdminToken(token)))) {
        return res.status(401).json({ error: "Unauthorized AI request" });
      }

      const systemInstruction = String(req.body?.systemInstruction || "").trim();
      const userPrompt = String(req.body?.userPrompt || "").trim();
      const model = String(req.body?.model || 'qwen2.5').trim();
      const requestOptions = req.body?.options && typeof req.body.options === 'object' ? req.body.options : {};

      if (!systemInstruction && !userPrompt) {
        return res.status(400).json({ error: "systemInstruction or userPrompt is required" });
      }

      const payload = {
        model,
        prompt: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}`,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
          num_ctx: 8192,
          num_predict: 4096,
          ...requestOptions,
        },
      };

      const forward = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await forward.json().catch(() => ({}));
      if (!forward.ok) {
        return res.status(forward.status).json({ error: data?.error || `Local AI returned ${forward.status}` });
      }

      // Return the raw response (text under `response`) for client parsing
      return res.json({ text: data?.response || '' });
    } catch (error: any) {
      console.error('/api/local-ai proxy error:', error);
      return res.status(500).json({ error: error?.message || 'Local AI proxy failed' });
    }
  });

  app.post("/api/generate-product-description", async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
      const bypass = isLocalDevAdminRequest(req);

      if (!bypass && (!token || !(await verifyAdminToken(token)))) {
        return res.status(401).json({ error: "Unauthorized AI request" });
      }

      const { productName, keywords, brief, provider } = req.body || {};

      if (!productName) {
        return res.status(400).json({ error: "productName is required" });
      }

      // 1. Read files dynamically from the project root
      let productSkillContext = "";
      let imageFormatRulesContext = "";

      try {
        productSkillContext = compactAiContext(await fs.readFile(path.join(process.cwd(), "PRODUCT_SKILL.md"), "utf-8"), 6200);
      } catch (err) {
        console.warn("Could not read PRODUCT_SKILL.md, using default rules", err);
        productSkillContext = "Hãy viết bài mô tả sản phẩm chi tiết, chuẩn SEO.";
      }

      try {
        imageFormatRulesContext = compactAiContext(await fs.readFile(path.join(process.cwd(), "IMAGE_FORMAT_RULES.md"), "utf-8"), 3200);
      } catch (err) {
        console.warn("Could not read IMAGE_FORMAT_RULES.md, using default rules", err);
        imageFormatRulesContext = "Hãy chèn hình ảnh minh họa phù hợp.";
      }

      // 2. Build system instruction
      const systemInstruction = `Bạn là một chuyên gia Copywriter và SEO thương mại điện tử hàng đầu tại Việt Nam, chuyên về thời trang nam thể thao & casual cho thương hiệu UR Sport.
Nhiệm vụ: Dựa vào Tên sản phẩm, Từ khóa SEO và nội dung tài liệu tham khảo (Markdown/Brief), hãy viết một bài mô tả sản phẩm hoàn chỉnh, chuẩn SEO và AEO (tối ưu cho Google, người dùng và các AI tìm kiếm như các mô hình ngôn ngữ lớn ChatGPT, Perplexity, Gemini).

Sản phẩm: ${productName}
Từ khóa SEO mục tiêu: ${keywords || 'Tự đề xuất từ khóa phù hợp với sản phẩm'}
Tài liệu tham khảo/Brief:
${brief || 'Không có tài liệu tham khảo. Hãy tự viết bài mô tả dựa trên Tên sản phẩm và Từ khóa SEO.'}

Bạn phải tuân thủ nghiêm ngặt 2 bộ quy tắc sau:

1. HƯỚNG DẪN SEO SẢN PHẨM (PRODUCT SKILL):
${productSkillContext}

2. QUY TẮC CHÈN ẢNH CHUẨN SEO (IMAGE FORMAT RULES):
${imageFormatRulesContext}

YÊU CẦU CỤ THỂ:
1. Trả về định dạng JSON thuần túy (không bọc trong markdown): { "contentHtml": "Nội dung bài viết HTML" }
2. YÊU CẦU ĐỘ DÀI BẮT BUỘC: Bài viết HTML phải chi tiết và đạt độ dài từ 500 đến 800 từ. Nếu tài liệu tham khảo/Brief do người dùng cung cấp ngắn, bạn bắt buộc phải chủ động phân tích sâu rộng, viết chi tiết thêm để đạt độ dài này. Hãy mở rộng bằng cách giải thích sâu về lợi ích của chất liệu/nguyên liệu được cung cấp, form dáng, bối cảnh sử dụng, cách phối đồ, chọn size và bảo quản. Không được bịa số liệu, giá, tồn kho, bảo hành, đổi trả hoặc cam kết dịch vụ nếu brief/file .md không cung cấp.
3. Mã HTML trả về:
   - Phải bám sát CẤU TRÚC BÀI VIẾT chuẩn trong hướng dẫn SEO sản phẩm ở trên. 
   - Chia thành nhiều phần bằng các thẻ <h2>, <h3> hợp lý (VD: Đặc điểm nổi bật, Chất liệu & Form dáng, Hoành cảnh sử dụng, Hướng dẫn chọn size, Cam kết từ UR Sport).
   - Văn phong thu hút, thuyết phục khách hàng, mạnh mẽ và chân thực (dựa trên dữ liệu thực tế, tránh hoa mỹ/sáo rỗng).
   - Sử dụng <ul>, <li> để trình bày danh sách dễ nhìn.
   - Bắt buộc chèn đúng 3 ảnh minh họa dạng <figure class="image-figure"> trong chi tiết bài viết theo cấu trúc chuẩn. Các đường dẫn ảnh (src) phải có định dạng: "/images/products/[slug-ten-san-pham]-hero.webp", "/images/products/[slug-ten-san-pham]-detail.webp", "/images/products/[slug-ten-san-pham]-lifestyle.webp" (viết thường không dấu, phân tách bằng dấu gạch ngang, ví dụ: "/images/products/ao-thun-nam-cotton-compact-hero.webp").
   - Mỗi ảnh phải có đầy đủ thuộc tính: alt (dưới 125 ký tự, mô tả ảnh tự nhiên chứa từ khóa chính), width="1200", height="800", title (ngắn gọn), và thẻ <figcaption> giải thích lợi ích thực tế cho người đọc.
   - Tuyệt đối KHÔNG dùng markdown (như **bold**) trong nội dung HTML, phải dùng thẻ <strong>. KHÔNG dùng thẻ <style> hay style inline. Không chứa class lạ ngoài class "image-figure" và "image-caption".`;

      const strictSystemInstruction = `${systemInstruction}

RÀO CHẮN NGÔN NGỮ VÀ CẤU TRÚC BẮT BUỘC:
- Chỉ được viết tiếng Việt tự nhiên cho khách hàng Việt Nam. Tuyệt đối không dùng tiếng Trung, tiếng Anh thừa, chữ Hán, pinyin, Japanese, Korean hoặc câu trả lời lẫn ngôn ngữ.
- Không chèn emoji, lời xin lỗi, lời hỏi lại, hoặc câu ngoài nội dung bán hàng.
- contentHtml phải bắt đầu bằng một đoạn <p>, sau đó có ít nhất 4 thẻ <h2>.
- contentHtml phải có đúng 3 block <figure class="image-figure">. Trong mỗi figure, thứ tự bắt buộc là <img ... width="1200" height="800" ...> rồi <figcaption class="image-caption">...</figcaption>. Không đặt caption thành thẻ <p> riêng bên ngoài figure.
- Các ảnh phải dùng đường dẫn /images/products/[slug-san-pham]-hero.webp, /images/products/[slug-san-pham]-detail.webp, /images/products/[slug-san-pham]-lifestyle.webp.
- Dùng <ul><li> thật cho danh sách bullet. Không dùng <ol data-list="bullet">, không dùng span class="ql-ui".
- Bắt buộc có các phần: lợi ích/chất liệu, form dáng/thiết kế, hoàn cảnh sử dụng/phối đồ, chọn size, bảo quản, cam kết UR Sport.
- Không được bịa chính sách bảo hành, đổi trả, giá, tồn kho, số liệu kỹ thuật hoặc cam kết dịch vụ nếu không có trong brief/file .md. Nếu không có dữ liệu, chỉ viết cam kết chung về trải nghiệm tư vấn/chọn đúng sản phẩm.
- Trả về JSON hợp lệ duy nhất: {"contentHtml":"..."}; không markdown, không code fence.`;

      const compactBrief = compactAiContext(brief || '', 4500);
      const userPrompt = `[SYSTEM INSTRUCTION]\n${strictSystemInstruction}\n\n[USER PROMPT]\n${compactBrief || productName}`;
      const selectedProvider: string = 'gemini';
      const hasCjkText = (value: string) => /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
      const parseAiJson = (value: string) => {
        const cleanText = value
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanText);
      };

      const validateProductDescription = (contentHtml: string) => {
        const issues: string[] = [];
        if (!contentHtml || typeof contentHtml !== 'string') issues.push('contentHtml is empty');
        if (hasCjkText(contentHtml || '')) issues.push('contentHtml contains Chinese/CJK characters');
        if (((contentHtml || '').match(/<h2[\s>]/gi) || []).length < 4) issues.push('contentHtml needs at least 4 H2 sections');
        const figures = contentHtml.match(/<figure\b[\s\S]*?<\/figure>/gi) || [];
        if (figures.length !== 3) issues.push('contentHtml must contain exactly 3 figure blocks');
        figures.forEach((figure, index) => {
          if (!/<figure\b[^>]*class=["'][^"']*\bimage-figure\b/i.test(figure)) issues.push(`figure ${index + 1} missing image-figure class`);
          if (!/<img\b[^>]*\bwidth=["']1200["'][^>]*>/i.test(figure)) issues.push(`figure ${index + 1} image missing width=1200`);
          if (!/<img\b[^>]*\bheight=["']800["'][^>]*>/i.test(figure)) issues.push(`figure ${index + 1} image missing height=800`);
          if (!/<img\b[^>]*\balt=["'][^"']{20,125}["'][^>]*>/i.test(figure)) issues.push(`figure ${index + 1} image missing useful alt`);
          if (!/<img\b[^>]*\btitle=["'][^"']+["'][^>]*>/i.test(figure)) issues.push(`figure ${index + 1} image missing title`);
          if (!/<figcaption\b[^>]*class=["'][^"']*\bimage-caption\b[^"']*["'][^>]*>[\s\S]{20,220}?<\/figcaption>/i.test(figure)) issues.push(`figure ${index + 1} missing image-caption figcaption`);
        });
        if (!/\/images\/products\/[^"']+-hero\.webp/i.test(contentHtml || '')) issues.push('missing hero product image path');
        if (!/\/images\/products\/[^"']+-detail\.webp/i.test(contentHtml || '')) issues.push('missing detail product image path');
        if (!/\/images\/products\/[^"']+-lifestyle\.webp/i.test(contentHtml || '')) issues.push('missing lifestyle product image path');
        if (/<ol\b[^>]*data-list=["']bullet["']|class=["'][^"']*\bql-ui\b/i.test(contentHtml || '')) issues.push('contentHtml contains Quill bullet markup instead of ul/li');
        if (/(bảo hành|bao hanh|đổi trả|doi tra|1 đổi 1|1 doi 1|30 ngày|30 ngay)/i.test(contentHtml || '')) issues.push('contentHtml invents warranty/return policy');
        if (/\*\*|```|!\[[^\]]*\]\(/.test(contentHtml || '')) issues.push('contentHtml contains markdown syntax');
        return issues;
      };

      const callProductDescriptionAI = async (promptText: string) => {
        let resultText = "";

        if (selectedProvider === 'local') {
          const payload = {
            model: "qwen2.5",
            prompt: promptText,
            stream: false,
            format: "json",
          };

          const forward = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await forward.json().catch(() => ({}));
          if (!forward.ok) {
            throw new Error(data?.error || `Local AI returned ${forward.status}`);
          }
          resultText = data?.response || '';
        } else {
          const apiKey = getGeminiApiKey();
          if (!apiKey) {
            throw new Error("Gemini API key is not configured");
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  { role: "user", parts: [{ text: promptText }] }
                ],
                generationConfig: {
                  response_mime_type: "application/json"
                }
              })
            }
          );

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.error?.message || "Gemini request failed");
          }

          resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        if (!resultText) {
          throw new Error("AI returned an empty response");
        }

        return parseAiJson(resultText);
      };

      let parsed = await callProductDescriptionAI(userPrompt);
      let validationIssues = validateProductDescription(parsed?.contentHtml || '');

      if (validationIssues.length) {
        const repairPrompt = `${userPrompt}

[REPAIR REQUIRED]
Kết quả trước đó sai các lỗi: ${validationIssues.join('; ')}.
Hãy viết lại hoàn toàn contentHtml bằng tiếng Việt 100%, đúng PRODUCT_SKILL và IMAGE_FORMAT_RULES.
Không giữ lại bất kỳ câu tiếng Trung/chữ Hán/ngôn ngữ nước ngoài nào.
Nội dung sai trước đó:
${String(parsed?.contentHtml || '').slice(0, 12000)}`;
        parsed = await callProductDescriptionAI(repairPrompt);
        validationIssues = validateProductDescription(parsed?.contentHtml || '');
      }

      if (validationIssues.length) {
        return res.status(422).json({
          error: `AI chưa tạo đúng cấu trúc: ${validationIssues.join('; ')}. Vui lòng bấm Chạy phác thảo lại hoặc bổ sung brief rõ hơn.`
        });
      }

      return res.json(parsed);

    } catch (error: any) {
      console.error("Generate product description failed:", error);
      return res.status(500).json({ error: error.message || "Failed to generate product description" });
    }
  });

  app.post("/api/send-newsletter", async (req, res) => {
    try {
      const configuredToken = process.env.NEWSLETTER_SEND_TOKEN;
      const providedToken = req.headers["x-newsletter-token"];
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || "UR Sport <onboarding@resend.dev>";

      if (!configuredToken || providedToken !== configuredToken) {
        return res.status(401).json({ error: "Unauthorized newsletter send request" });
      }

      if (!resendApiKey) {
        return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
      }

      const { recipients, subject, message, voucher } = req.body || {};
      const validRecipients = Array.isArray(recipients)
        ? recipients
            .map((email) => String(email || "").trim().toLowerCase())
            .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        : [];

      if (validRecipients.length === 0 || validRecipients.length > 100) {
        return res.status(400).json({ error: "Recipients must contain 1 to 100 valid emails" });
      }

      const cleanSubject = String(subject || "").trim().slice(0, 160);
      const cleanMessage = String(message || "").trim().slice(0, 8000);

      if (!cleanSubject || !cleanMessage) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      const voucherBlock = voucher?.code
        ? `
          <div style="margin:24px 0;padding:18px;border:1px solid #d9e7ef;border-radius:12px;background:#f4fbff">
            <p style="margin:0 0 8px;font-weight:700;color:#1e4b64">${escapeHtml(voucher.name || "Mã ưu đãi UR Sport")}</p>
            <p style="margin:0;font-size:24px;font-weight:900;letter-spacing:1px;color:#111827">${escapeHtml(voucher.code)}</p>
            <p style="margin:8px 0 0;color:#4b5563">${escapeHtml(voucher.description || "")}</p>
          </div>
        `
        : "";

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          ${escapeHtml(cleanMessage).replace(/\n/g, "<br />")}
          ${voucherBlock}
          <p style="margin-top:28px;color:#4b5563">UR Sport cảm ơn quý khách đã đồng hành.</p>
        </div>
      `;

      const results = await Promise.allSettled(
        validRecipients.map((recipient) =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: recipient,
              subject: cleanSubject,
              html,
            }),
          }).then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data?.message || `Send failed for ${recipient}`);
            }
            return data;
          })
        )
      );

      const sent = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - sent;

      res.json({ sent, failed });
    } catch (error) {
      console.error("Newsletter send failed:", error);
      res.status(500).json({ error: "Newsletter send failed" });
    }
  });

  app.post(
    "/api/upload-blog-image",
    express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"], limit: "10mb" }),
    async (req, res) => {
      try {
        console.log('[upload-blog-image] request received', { url: req.url, method: req.method, contentType: req.headers['content-type'], contentLength: req.headers['content-length'] });
        // Authenticate admin
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
        console.log('[upload-blog-image] authHeader present?', !!authHeader, 'token length', token ? token.length : 0);
        const host = String(req.headers.host || "").split(":")[0];
        const isLocalDevRequest = process.env.NODE_ENV !== "production"
          && ["localhost", "127.0.0.1", "::1"].includes(host);
        const isDevBypass = isLocalDevRequest || (process.env.NODE_ENV !== "production" && process.env.BYPASS_ADMIN_AUTH === "true");

        if (!isDevBypass) {
          if (!token) {
            console.warn('[upload-blog-image] missing token, rejecting');
            return res.status(401).json({ error: "Unauthorized image upload: Missing token" });
          }
          let isAdmin = false;
          try {
            isAdmin = await verifyAdminToken(token);
          } catch (err) {
            console.error('[upload-blog-image] verifyAdminToken threw', err);
            return res.status(500).json({ error: 'Server error verifying admin token' });
          }
          console.log('[upload-blog-image] verifyAdminToken =>', isAdmin);
          if (!isAdmin) {
            console.warn('[upload-blog-image] token is not admin, rejecting');
            return res.status(403).json({ error: "Forbidden image upload: Not an admin" });
          }
        } else {
          console.warn("⚠️ WARNING: Admin authentication bypassed in development mode!");
        }

        const saved = await saveUploadedImage(req, "blog", "blog-image", {
          useUniqueSuffix: false,
          overwrite: true,
        });
        return res.json(saved);
      } catch (error: any) {
        console.error("Blog image upload failed:", error);
        res.status(error.statusCode || 500).json({ error: error.message || "Upload failed" });
      }
    }
  );

  app.use(
    "/images",
    express.static(path.join(process.cwd(), "public", "images"), {
      maxAge: "30d",
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=2592000");
      }
    })
  );

  app.all("/__/auth/*", async (req, res) => {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "shop-ursport";
    const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
    const targetUrl = `https://${authDomain}${req.originalUrl}`;

    try {
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (!value || ['host', 'connection', 'content-length'].includes(key.toLowerCase())) return;
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      });

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
        redirect: 'manual',
      });

      response.headers.forEach((value, key) => {
        if (['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
        res.setHeader(key, value);
      });

      const location = response.headers.get('location');
      if (location) {
        res.setHeader('location', location.replace(`https://${authDomain}`, `${req.protocol}://${req.get('host')}`));
      }

      res.status(response.status);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (error) {
      console.error('Firebase auth proxy failed:', error);
      res.status(502).send('Firebase auth proxy failed');
    }
  });

  // Catchy social media shortlinks/redirects
  const socialRedirects: Record<string, string> = {
    "fanpage": "https://www.facebook.com/ursportvietnam",
    "facebook": "https://zalo.me/0917722425",
    "cong-dong": "https://www.facebook.com/ursportvietnam",
    "clb-the-thao": "https://www.facebook.com/ursportvietnam",
    "tiktok": "https://zalo.me/0917722425",
    "goc-the-thao": "https://www.tiktok.com/@ursportvietnam",
    "video": "https://www.tiktok.com/@ursportvietnam",
    "instagram": "https://www.instagram.com/ursportvietnam",
    "goc-anh": "https://www.instagram.com/ursportvietnam",
    "bo-suu-tap": "https://www.instagram.com/ursportvietnam",
    "zalo": "https://zalo.me/0917722425",
    "x": "https://zalo.me/0917722425",
    "tu-van": "https://zalo.me/0917722425",
    "chat": "https://zalo.me/0917722425",
    "ho-tro": "https://zalo.me/0917722425"
  };

  Object.entries(socialRedirects).forEach(([pathName, targetUrl]) => {
    app.get(`/${pathName}`, (_req, res) => {
      res.redirect(301, targetUrl);
    });
  });

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Dynamic SEO static snapshot router (Optimized routing without redirect hops)
    app.get("*", async (req, res, next) => {
      const cleanPath = req.path.replace(/^\/+|\/+$/g, "");
      
      // Bypass static assets and API routes
      if (req.path.startsWith("/api/") || path.extname(req.path)) {
        return next();
      }

      // Check if a pre-rendered HTML file exists for the route
      const snapshotFile = cleanPath
        ? path.join(distPath, cleanPath, "index.html")
        : path.join(distPath, "index.html");

      try {
        await fs.access(snapshotFile);
        return res.sendFile(snapshotFile);
      } catch {
        return next(); // Fall back to express.static or default SPA shell
      }
    });

    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filepath) => {
        if (filepath.includes(path.sep + 'assets' + path.sep)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filepath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const bindHost = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  app.listen(PORT, bindHost, () => {
    console.log(`Server running on http://${bindHost}:${PORT}`);
  });
}

startServer();
