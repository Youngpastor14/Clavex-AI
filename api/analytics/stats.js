// ─── VERCEL SERVERLESS: /api/analytics/stats ────────────────────────────────
// Returns analytics dashboard. On Vercel serverless, data is ephemeral
// (resets on cold starts). For production analytics, integrate a database.

const {
  verifyPassword,
  getPasswordFromHeader,
  setSecurityHeaders,
  setCorsHeaders,
  escapeHtml,
  checkAuthRateLimit,
  recordAuthFailure,
} = require("../lib/security");

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res, "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Brute-force rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const authRate = checkAuthRateLimit(ip);
  if (authRate.blocked) {
    return res.status(429).json({ error: "Too many failed attempts. Try again later." });
  }

  // Password via Authorization header only — never URL query
  const password = getPasswordFromHeader(req);
  if (!verifyPassword(password)) {
    recordAuthFailure(ip);
    return res.status(401).json({ error: "Unauthorized." });
  }

  // On Vercel serverless, we can't share state between functions,
  // so stats will be minimal. Return a helpful message.
  const stats = {
    overview: {
      totalEvents: 0,
      today: {},
      last7Days: {},
      last30Days: {},
      note: "Analytics events are accepted but not persisted on Vercel serverless. For persistent analytics, integrate Vercel KV or an external database.",
    },
    funnel: {
      page_views: 0,
      chats_started: 0,
      messages_sent: 0,
      diagnoses_complete: 0,
      whatsapp_clicks: 0,
    },
    serviceDistribution: {},
    dailyBreakdown: {},
    generatedAt: new Date().toISOString(),
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clavex Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0f1c; color: #c8dcf5; padding: 32px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 13px; color: rgba(255,255,255,.3); margin-bottom: 32px; }
    .notice { background: rgba(74,144,217,.1); border: 1px solid rgba(74,144,217,.3); border-radius: 12px; padding: 20px; margin-bottom: 32px; }
    .notice h2 { font-size: 16px; color: #4a90d9; margin-bottom: 8px; }
    .notice p { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,.6); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 20px; }
    .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,.3); margin-bottom: 8px; }
    .card-value { font-size: 28px; font-weight: 700; color: #4a90d9; }
    pre { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 16px; font-size: 12px; overflow-x: auto; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>📊 Clavex Analytics</h1>
  <p class="subtitle">Generated ${escapeHtml(stats.generatedAt)}</p>

  <div class="notice">
    <h2>⚡ Vercel Serverless Mode</h2>
    <p>Your app is running on Vercel serverless functions. Analytics events are accepted from the frontend but are not persisted between function invocations. To enable persistent analytics, consider integrating <strong>Vercel KV</strong>, <strong>Supabase</strong>, or another database service.</p>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Status</div>
      <div class="card-value" style="font-size:18px;">✅ Live</div>
    </div>
    <div class="card">
      <div class="card-label">Platform</div>
      <div class="card-value" style="font-size:18px;">Vercel</div>
    </div>
    <div class="card">
      <div class="card-label">Analytics</div>
      <div class="card-value" style="font-size:18px;">Ephemeral</div>
    </div>
  </div>

  <pre>${escapeHtml(JSON.stringify(stats, null, 2))}</pre>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
};
