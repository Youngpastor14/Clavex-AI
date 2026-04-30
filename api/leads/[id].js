// ─── VERCEL SERVERLESS: /api/leads/[id] ─────────────────────────────────────
// GET:  Fetch a single lead by session ID (password-protected)
// PATCH: Update lead status (password-protected)

const { getSupabase } = require("../lib/supabase");

const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || "Admin1404";

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract ID from Vercel dynamic route
  const { id } = req.query;

  if (!id || typeof id !== "string" || id.length < 30) {
    return res.status(400).json({ error: "Invalid session ID." });
  }

  // Auth check
  const password = req.query.password || req.headers["x-analytics-password"];
  if (password !== ANALYTICS_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized. Provide ?password=YOUR_PASSWORD" });
  }

  const supabase = getSupabase();

  // ── GET: Fetch single lead ────────────────────────────────────────────
  if (req.method === "GET") {
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

  // ── PATCH: Update lead status or whatsapp_clicked ─────────────────────
  if (req.method === "PATCH") {
    try {
      const updates = {};
      const { status, whatsapp_clicked } = req.body || {};

      if (status && ["new", "contacted", "converted"].includes(status)) {
        updates.status = status;
      }
      if (typeof whatsapp_clicked === "boolean") {
        updates.whatsapp_clicked = whatsapp_clicked;
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

  return res.status(405).json({ error: "Method not allowed." });
};
