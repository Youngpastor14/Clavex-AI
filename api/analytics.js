// ─── VERCEL SERVERLESS: /api/analytics ───────────────────────────────────────
// Logs analytics events. On Vercel, filesystem is read-only and ephemeral,
// so we accept the event and return success. Analytics data won't persist
// between cold starts — this is a known trade-off on Vercel's free tier.

const { setSecurityHeaders, setCorsHeaders } = require("./lib/security");

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

// Maximum size for event.data payload (1KB)
const MAX_DATA_SIZE = 1024;

// In-memory store (resets on cold start — best-effort on serverless)
const logs = [];

module.exports = async function handler(req, res) {
  // Security headers on every response
  setSecurityHeaders(res);

  // Restricted CORS — only allow our own domains
  setCorsHeaders(req, res, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // POST — log an event
  if (req.method === "POST") {
    const event = req.body;

    if (!event || !event.type || !VALID_EVENTS.includes(event.type)) {
      return res.status(400).json({ success: false, error: "Invalid event type" });
    }

    // Validate data payload size to prevent abuse
    const dataStr = JSON.stringify(event.data || {});
    if (dataStr.length > MAX_DATA_SIZE) {
      return res.status(400).json({ success: false, error: "Event data too large." });
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
