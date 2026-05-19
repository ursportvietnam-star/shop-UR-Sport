import express from "express";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
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
    express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"], limit: "10mb" }),
    async (req, res) => {
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "No image file received" });
        }

        const mimeToExt: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "image/svg+xml": "svg",
        };
        const contentType = req.headers["content-type"] || "";
        const ext = mimeToExt[contentType] || "jpg";
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
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80) || "blog-image";
        const fileName = `${baseName}.${ext}`;
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
