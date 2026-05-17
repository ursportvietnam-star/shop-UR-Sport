const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
          .filter(isValidEmail)
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

    return res.status(200).json({ sent, failed });
  } catch (error) {
    console.error("Newsletter send failed:", error);
    return res.status(500).json({ error: "Newsletter send failed" });
  }
}
