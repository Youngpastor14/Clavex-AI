// ─── VERCEL SERVERLESS: /api/leads/[id] ─────────────────────────────────────
// GET:  Fetch a single lead by session ID (password-protected)
// PATCH: Update lead status (password-protected) OR track whatsapp click (public)

const { getSupabase } = require("../lib/supabase");
const {
  verifyPassword,
  getPasswordFromHeader,
  setSecurityHeaders,
  setCorsHeaders,
  checkAuthRateLimit,
  recordAuthFailure,
  ALLOWED_ORIGINS,
} = require("../lib/security");

module.exports = async function handler(req, res) {
  // Security headers
  setSecurityHeaders(res);

  // Restricted CORS
  setCorsHeaders(req, res, "GET, PATCH, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract ID from Vercel dynamic route — validate UUID format
  const { id } = req.query;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: "Invalid session ID." });
  }

  const supabase = getSupabase();
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

  // ── PATCH: Two modes ──────────────────────────────────────────────────
  // 1) Public tracking: { whatsapp_clicked: true, _track: true } — no auth needed
  // 2) Admin update: { status: "contacted" } — requires password
  if (req.method === "PATCH") {
    try {
      const body = req.body || {};

      // Mode 1: Public whatsapp tracking (no auth needed, very limited)
      // Only allows setting whatsapp_clicked to true — no other mutations
      if (body._track === true && body.whatsapp_clicked === true) {
        // Validate origin for public tracking
        const origin = req.headers.origin;
        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
          return res.status(403).json({ error: "Forbidden." });
        }

        const { error } = await supabase
          .from("clavex_leads")
          .update({ whatsapp_clicked: true })
          .eq("id", id);

        if (error) {
          console.error("[Leads] Track PATCH error:", error.message);
          return res.status(500).json({ error: "Failed to update." });
        }
        return res.status(200).json({ success: true });
      }

      // Mode 2: Admin updates — require auth via Authorization header
      const authRate = checkAuthRateLimit(ip);
      if (authRate.blocked) {
        return res.status(429).json({ error: "Too many failed attempts. Try again later." });
      }

      const password = getPasswordFromHeader(req);
      if (!verifyPassword(password)) {
        recordAuthFailure(ip);
        return res.status(401).json({ error: "Unauthorized." });
      }

      const updates = {};
      if (body.status && ["new", "contacted", "converted"].includes(body.status)) {
        updates.status = body.status;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update." });
      }

      const { data, error } = await supabase
        .from("clavex_leads")
        .update(updates)
        .eq("id", id)
        .select("id, status, whatsapp_clicked")
        .single();

      if (error) {
        console.error("[Leads] PATCH error:", error.message);
        return res.status(500).json({ error: "Failed to update lead." });
      }

      return res.status(200).json({ success: true, lead: data });
    } catch (err) {
      console.error("[Leads] PATCH error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // ── GET: Fetch single lead (always requires auth) ─────────────────────
  if (req.method === "GET") {
    const authRate = checkAuthRateLimit(ip);
    if (authRate.blocked) {
      return res.status(429).json({ error: "Too many failed attempts. Try again later." });
    }

    const password = getPasswordFromHeader(req);
    if (!verifyPassword(password)) {
      recordAuthFailure(ip);
      return res.status(401).json({ error: "Unauthorized." });
    }

    try {
      const { data, error } = await supabase
        .from("clavex_leads")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Lead not found." });
      }

      return res.status(200).json({ success: true, lead: data });
    } catch (err) {
      console.error("[Leads] GET by ID error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
};
