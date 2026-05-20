import express from "express";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // Max 60 requests per minute per IP

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

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  // 1. Security Headers Middleware (Enhanced Helmet-like protection with CSP)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-DNS-Prefetch-Control", "on");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "shop-ur-sport";
    const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.firebaseapp.com https://*.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com wss://*.firebaseapp.com wss://localhost:* ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* https://res.cloudinary.com https://images.unsplash.com https://api.resend.com https://identitytoolkit.googleapis.com`,
      `img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://*.google.com https://*.googleapis.com`,
      `frame-src 'self' https://*.firebaseapp.com https://*.google.com`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-uri /api/csp-violation"
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
    next();
  });

  // 2. CORS Middleware
  app.use((req, res, next) => {
    const allowedOrigins = [
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-newsletter-token, x-file-name");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // 3. Rate limiting for API endpoints
  app.use("/api/*", apiRateLimiter);

  // 4. Payload size limit for JSON bodies to prevent DoS
  app.use(express.json({ limit: "10kb" }));

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
        // Authenticate admin
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
        const isDevBypass = process.env.NODE_ENV !== "production" && process.env.BYPASS_ADMIN_AUTH === "true";

        if (!isDevBypass) {
          if (!token) {
            return res.status(401).json({ error: "Unauthorized image upload: Missing token" });
          }
          const isAdmin = await verifyAdminToken(token);
          if (!isAdmin) {
            return res.status(403).json({ error: "Forbidden image upload: Not an admin" });
          }
        } else {
          console.warn("⚠️ WARNING: Admin authentication bypassed in development mode!");
        }

        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "No image file received" });
        }

        const mimeToExt: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
        };
        const contentType = req.headers["content-type"] || "";
        if (!mimeToExt[contentType]) {
          return res.status(400).json({ error: "Unsupported image format. Allowed formats: JPG, PNG, WebP, GIF" });
        }
        
        const ext = mimeToExt[contentType];
        const encodedOriginalName = Array.isArray(req.headers["x-file-name"])
          ? req.headers["x-file-name"][0]
          : req.headers["x-file-name"];
        const originalName = encodedOriginalName ? decodeURIComponent(encodedOriginalName) : "";
        const baseName = (originalName || "blog-image")
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
          .slice(0, 80) || "blog-image";
        
        // Prevent collisions with unique timestamp suffix
        const fileName = `${baseName}-${Date.now()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "images", "blog");

        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, fileName), req.body);

        res.json({ url: `/images/blog/${fileName}` });
      } catch (error) {
        console.error("Blog image upload failed:", error);
        res.status(500).json({ error: "Upload failed" });
      }
    }
  );

  app.use("/images", express.static(path.join(process.cwd(), "public", "images")));

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
