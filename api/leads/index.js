// ─── VERCEL SERVERLESS: /api/leads ──────────────────────────────────────────
// POST: Save a completed diagnosis (full conversation + brand intel) to Supabase
// GET:  List all leads (password-protected, for Fortex Forge team)

const { getSupabase } = require("../lib/supabase");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || "Admin1404";

// ─── BRAND INTEL EXTRACTION PROMPT ──────────────────────────────────────────
const EXTRACT_PROMPT = `You are a data extraction assistant. Given a conversation between a brand diagnostic AI (Clavex) and a business owner, extract structured brand intelligence.

Return ONLY a raw JSON object (no markdown, no backticks, no explanation) with these fields:

{
  "business_name": "the brand/business name if mentioned, otherwise null",
  "industry": "their industry or niche if mentioned, otherwise null",
  "what_they_do": "concise description of what their business does",
  "target_audience": "who they serve or are trying to reach",
  "how_long_running": "how long they've been in business if mentioned, otherwise null",
  "team_size": "solo, small team, or larger — if mentioned, otherwise null",
  "current_challenges": ["list", "of", "specific", "challenges", "they", "mentioned"],
  "what_they_tried": "any past efforts or solutions they mentioned trying",
  "online_presence": "description of their current online presence (website, social, etc.)",
  "core_gap": "the fundamental gap or root problem holding their brand back",
  "revenue_model": "how they make money if mentioned, otherwise null",
  "competitors_mentioned": "any competitors or comparisons they brought up, otherwise null",
  "urgency_level": "low, medium, or high — based on how urgently they seem to need help",
  "key_quotes": ["2-3 direct quotes from the user that best capture their situation"]
}

Be specific. Use what they actually said, not generic descriptions. If something wasn't discussed, use null.`;

// ─── EXTRACT BRAND INTEL VIA GROQ ──────────────────────────────────────────
async function extractBrandIntel(conversation) {
  if (!GROQ_API_KEY) return {};

  try {
    // Build a readable transcript
    const transcript = conversation
      .map(m => `${m.role === "assistant" ? "Clavex" : "User"}: ${m.content}`)
      .join("\n\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.1,
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          { role: "user", content: `Here is the conversation:\n\n${transcript}` },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`[Brand Intel] Groq API error: ${res.status}`);
      return {};
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return {};

    // Try to parse the JSON — handle potential markdown wrapping
    let cleaned = content;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Brand Intel] Extraction error:", err.message);
    return {};
  }
}

// ─── HANDLER ────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ── POST: Save a new lead ──────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { conversation, result } = req.body;

      // Validate
      if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
        return res.status(400).json({ error: "Missing or invalid conversation data." });
      }
      if (!result || !result.service) {
        return res.status(400).json({ error: "Missing or invalid result data." });
      }

      // Extract structured brand intel (fire async, but we wait for it)
      const brandIntel = await extractBrandIntel(conversation);

      // Save to Supabase
      const supabase = getSupabase();
      const { data, error } = await supabase.from("clavex_leads").insert({
        first_name: result.first_name || null,
        service: result.service,
        problem_summary: result.problem || null,
        full_conversation: conversation,
        brand_intel: brandIntel,
      }).select("id").single();

      if (error) {
        console.error("[Leads] Supabase insert error:", error.message);
        return res.status(500).json({ error: "Failed to save lead data." });
      }

      return res.status(201).json({
        success: true,
        session_id: data.id,
      });
    } catch (err) {
      console.error("[Leads] POST error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // ── GET: List all leads (password-protected) ──────────────────────────
  if (req.method === "GET") {
    const password = req.query.password || req.headers["x-analytics-password"];
    if (password !== ANALYTICS_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Provide ?password=YOUR_PASSWORD" });
    }

    try {
      const supabase = getSupabase();

      // Optional filters
      const status = req.query.status;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);

      let query = supabase
        .from("clavex_leads")
        .select("id, first_name, service, problem_summary, brand_intel, created_at, whatsapp_clicked, status")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status && ["new", "contacted", "converted"].includes(status)) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Leads] Supabase select error:", error.message);
        return res.status(500).json({ error: "Failed to fetch leads." });
      }

      return res.status(200).json({
        success: true,
        count: data.length,
        leads: data,
      });
    } catch (err) {
      console.error("[Leads] GET error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
};
