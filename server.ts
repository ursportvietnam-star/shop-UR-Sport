import express from "express";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // Max 60 requests per minute per IP
let gitSyncInProgress = false;

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

async function canWriteLocalMedia(req: express.Request) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  const host = String(req.headers.host || "").split(":")[0];
  const isLocalDevRequest = process.env.NODE_ENV !== "production"
    && ["localhost", "127.0.0.1", "::1"].includes(host);
  const isDevBypass = isLocalDevRequest || (process.env.NODE_ENV !== "production" && process.env.BYPASS_ADMIN_AUTH === "true");

  if (isDevBypass) return true;
  if (!token) return false;

  return verifyAdminToken(token);
}

function isLocalRequest(req: express.Request) {
  const host = String(req.headers.host || "").split(":")[0];
  const ip = req.ip || req.socket?.remoteAddress || "";

  return (
    ["localhost", "127.0.0.1", "::1"].includes(host) ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1"
  );
}

function normalizeLocalMediaFolder(folderParam: string) {
  const folderMap: Record<string, string> = {
    blog: "blog",
    products: "products",
    "product-descriptions": "products/descriptions",
    "size-guides": "products/size-guides",
    banners: "banners",
    nav: "nav",
    settings: "settings",
    "blog-categories": "blog/categories",
  };

  return folderMap[folderParam] || null;
}

function getContentType(req: express.Request) {
  return String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
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

function buildSafeImageFileName(req: express.Request, fallbackName: string) {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = mimeToExt[getContentType(req)];
  if (!ext) return null;

  const encodedOriginalName = Array.isArray(req.headers["x-file-name"])
    ? req.headers["x-file-name"][0]
    : req.headers["x-file-name"];
  const originalName = encodedOriginalName ? decodeURIComponent(encodedOriginalName) : "";
  const baseName = slugifyFileBase(originalName, fallbackName);
  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  return `${baseName}-${uniqueSuffix}.${ext}`;
}

function assertInsideDirectory(parentDir: string, targetPath: string) {
  const relative = path.relative(parentDir, targetPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function saveUploadedImage(req: express.Request, mediaFolder: string, fallbackName: string) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw Object.assign(new Error("No image file received"), { statusCode: 400 });
  }

  const fileName = buildSafeImageFileName(req, fallbackName);
  if (!fileName) {
    throw Object.assign(new Error("Unsupported image format. Allowed formats: JPG, PNG, WebP, GIF"), { statusCode: 400 });
  }

  const imagesRoot = path.resolve(process.cwd(), "public", "images");
  const uploadDir = path.resolve(imagesRoot, mediaFolder);
  const targetPath = path.resolve(uploadDir, fileName);

  if (!assertInsideDirectory(imagesRoot, uploadDir) || !assertInsideDirectory(uploadDir, targetPath)) {
    throw Object.assign(new Error("Invalid upload path"), { statusCode: 400 });
  }

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(targetPath, req.body, { flag: "wx" });

  return {
    fileName,
    url: `/images/${mediaFolder.replace(/\\/g, "/")}/${fileName}`,
  };
}

async function runGit(args: string[], cwd: string) {
  return execFileAsync("git", args, { cwd, maxBuffer: 1024 * 1024 });
}

function countPorcelainLines(stdout: string) {
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
}

async function startServer() {
  const app = express();
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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.google.com https://*.gstatic.com wss://*.firebaseapp.com wss://localhost:* ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* https://api.cloudinary.com https://res.cloudinary.com https://images.unsplash.com https://api.resend.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
      `img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://*.google.com https://*.googleapis.com https://*.googleusercontent.com https://*.gstatic.com`,
      `frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://*.google.com https://*.firebaseapp.com",
      "report-uri /api/csp-violation"
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
    next();
  });

  // 2. CORS Middleware
  app.use((req, res, next) => {
    const allowedOrigins = [
      "https://shop-ur-sport.vercel.app",
      "https://shop-ur-sport.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-newsletter-token, x-file-name");
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
    gitSyncInProgress = true;

    try {
      // Kiểm tra xem có file mới/thay đổi nào trong public/images không
      const { stdout: statusOut } = await runGit(["status", "--porcelain", "--", "public/images"], cwd);

      if (!statusOut.trim()) {
        return res.json({
          success: true,
          message: "Không có ảnh mới cần đồng bộ. Website đã up to date.",
          details: [],
        });
      }

      const changedFiles = countPorcelainLines(statusOut);
      const details: string[] = [];

      // Stage toàn bộ thư mục public/images
      await runGit(["add", "--", "public/images"], cwd);
      const { stdout: stagedOut } = await runGit(["diff", "--cached", "--name-only", "--", "public/images"], cwd);
      const stagedFiles = stagedOut.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (stagedFiles.length === 0) {
        return res.json({
          success: true,
          message: "Khong co thay doi anh nao can commit sau khi stage.",
          details,
        });
      }
      details.push(`✅ Staged ${changedFiles} file(s) từ public/images`);

      // Commit với timestamp
      const now = new Date()
        .toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        .replace(/,/g, "");
      const commitMsg = `sync(images): upload ${stagedFiles.length} file(s) - ${now}`;
      const { stdout: commitOut } = await runGit(["commit", "-m", commitMsg], cwd);
      details.push(`✅ ${commitOut.trim().split("\n")[0]}`);

      // Push lên remote
      const { stdout: pushOut, stderr: pushErr } = await runGit(["push"], cwd);
      details.push(`✅ Pushed → ${(pushOut || pushErr || "remote").trim().split("\n")[0]}`);

      console.log(`[git-sync] Đồng bộ thành công ${stagedFiles.length} file(s)`);
      return res.json({
        success: true,
        message: `Đã đồng bộ ${stagedFiles.length} ảnh lên GitHub. Vercel đang build lại...`,
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
    express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif"], limit: "10mb" }),
    async (req, res) => {
      try {
        if (!(await canWriteLocalMedia(req))) {
          return res.status(401).json({ error: "Unauthorized image upload" });
        }

        const mediaFolder = normalizeLocalMediaFolder(req.params.folder);
        if (!mediaFolder) {
          return res.status(400).json({ error: "Unsupported local image folder" });
        }

        const saved = await saveUploadedImage(req, mediaFolder, "local-image");
        return res.json(saved);
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
      const apiKey = process.env.GEMINI_API_KEY;
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      if (!token || !(await verifyAdminToken(token))) {
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

      if (!token || !(await verifyAdminToken(token))) {
        return res.status(401).json({ error: "Unauthorized AI request" });
      }

      const systemInstruction = String(req.body?.systemInstruction || "").trim();
      const userPrompt = String(req.body?.userPrompt || "").trim();
      const model = String(req.body?.model || 'qwen2.5').trim();

      if (!systemInstruction && !userPrompt) {
        return res.status(400).json({ error: "systemInstruction or userPrompt is required" });
      }

      const payload = {
        model,
        prompt: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}`,
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
        return res.status(forward.status).json({ error: data?.error || `Local AI returned ${forward.status}` });
      }

      // Return the raw response (text under `response`) for client parsing
      return res.json({ text: data?.response || '' });
    } catch (error: any) {
      console.error('/api/local-ai proxy error:', error);
      return res.status(500).json({ error: error?.message || 'Local AI proxy failed' });
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
            <p style="margin:0 0 8px;font-weight:700;color:#1e4b64">${voucher.name || "Mã ưu đãi UR Sport"}</p>
            <p style="margin:0;font-size:24px;font-weight:900;letter-spacing:1px;color:#111827">${voucher.code}</p>
            <p style="margin:8px 0 0;color:#4b5563">${voucher.description || ""}</p>
          </div>
        `
        : "";

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          ${cleanMessage.replace(/\n/g, "<br />")}
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
    express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif"], limit: "10mb" }),
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

        const saved = await saveUploadedImage(req, "blog", "blog-image");
        return res.json(saved);
      } catch (error: any) {
        console.error("Blog image upload failed:", error);
        res.status(error.statusCode || 500).json({ error: error.message || "Upload failed" });
      }
    }
  );

  app.use("/images", express.static(path.join(process.cwd(), "public", "images")));

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

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
