// ─── VERCEL SERVERLESS: /api/analytics ───────────────────────────────────────
// Logs analytics events. On Vercel, filesystem is read-only and ephemeral,
// so we accept the event and return success. Analytics data won't persist
// between cold starts — this is a known trade-off on Vercel's free tier.
// For persistent analytics, consider using a free database (e.g., Vercel KV,
// Supabase, or PlanetScale) in the future.

const VALID_EVENTS = [
  "page_view",
  "chat_started",
  "message_sent",
  "diagnosis_complete",
  "whatsapp_clicked",
  "linkedin_clicked",
  "export_clicked",
  "service_diagnosed",
  "session_restored",
  "faq_used",
  "privacy_accepted",
];

// In-memory store (resets on cold start — best-effort on serverless)
const logs = [];

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-analytics-password");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // POST — log an event
  if (req.method === "POST") {
    const event = req.body;

    if (!event.type || !VALID_EVENTS.includes(event.type)) {
      return res.status(400).json({ success: false, error: "Invalid event type" });
    }

    const entry = {
      type: event.type,
      data: event.data || {},
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
    };

    logs.push(entry);

    // Keep only last 10,000
    if (logs.length > 10000) logs.splice(0, logs.length - 10000);

    return res.status(200).json({ success: true });
  }

  // If not POST, return method not allowed
  return res.status(405).json({ error: "Method not allowed. Use POST." });
};
