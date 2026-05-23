async function verifyAdminToken(token: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

  if (!projectId || !apiKey || !token) return false;

  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    }
  );

  if (!lookupResponse.ok) return false;
  const lookupData = await lookupResponse.json();
  const user = lookupData.users?.[0];
  if (!user) return false;
  if (user.email === "ursportvietnam@gmail.com") return true;

  const firestoreResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${user.localId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return firestoreResponse.ok;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    if (!(await verifyAdminToken(token))) {
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
            { role: "user", parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}` }] },
          ],
          generationConfig: { response_mime_type: "application/json" },
        }),
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

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini proxy failed:", error);
    return res.status(500).json({ error: "Gemini proxy failed" });
  }
}
