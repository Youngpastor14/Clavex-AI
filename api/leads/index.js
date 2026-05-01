// ─── VERCEL SERVERLESS: /api/leads ──────────────────────────────────────────
// POST: Save a completed diagnosis (full conversation + brand intel) to Supabase
// GET:  List all leads (password-protected, for Fortex Forge team)

const { getSupabase } = require("../lib/supabase");
const {
  verifyPassword,
  getPasswordFromHeader,
  setSecurityHeaders,
  setCorsHeaders,
  checkAuthRateLimit,
  recordAuthFailure,
} = require("../lib/security");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ─── RATE LIMITER FOR POST (lead creation) ─────────────────────────────────
const postStore = new Map();
const POST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const POST_MAX_REQUESTS = 5; // max 5 lead submissions per 10 min per IP

function checkPostRateLimit(ip) {
  const now = Date.now();
  if (!postStore.has(ip)) postStore.set(ip, { timestamps: [] });
  const data = postStore.get(ip);
  data.timestamps = data.timestamps.filter(t => now - t < POST_WINDOW_MS);
  if (data.timestamps.length >= POST_MAX_REQUESTS) {
    return { limited: true };
  }
  data.timestamps.push(now);
  return { limited: false };
}

// Clean up periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of postStore) {
    data.timestamps = data.timestamps.filter(t => now - t < POST_WINDOW_MS);
    if (data.timestamps.length === 0) postStore.delete(ip);
  }
}, 10 * 60 * 1000);

// ─── INPUT VALIDATION ──────────────────────────────────────────────────────
const VALID_SERVICES = ["brand_strategy", "brand_identity", "uiux", "web_development", "social_media"];
const MAX_CONVERSATION_MESSAGES = 40;
const MAX_MESSAGE_CONTENT_LENGTH = 2000;

function validateLeadInput(conversation, result) {
  if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
    return { valid: false, error: "Missing or invalid conversation data." };
  }

  if (conversation.length > MAX_CONVERSATION_MESSAGES) {
    return { valid: false, error: "Conversation too long." };
  }

  // Validate each message structure
  for (const msg of conversation) {
    if (!msg.role || !["user", "assistant"].includes(msg.role)) {
      return { valid: false, error: "Invalid message format in conversation." };
    }
    if (typeof msg.content !== "string" || msg.content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      return { valid: false, error: "Invalid message content in conversation." };
    }
  }

  if (!result || !result.service || !VALID_SERVICES.includes(result.service)) {
    return { valid: false, error: "Missing or invalid result data." };
  }

  if (result.first_name && (typeof result.first_name !== "string" || result.first_name.length > 100)) {
    return { valid: false, error: "Invalid first name." };
  }

  if (result.problem && (typeof result.problem !== "string" || result.problem.length > 500)) {
    return { valid: false, error: "Invalid problem summary." };
  }

  return { valid: true };
}

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
  // Security headers
  setSecurityHeaders(res);

  // Restricted CORS
  setCorsHeaders(req, res, "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

  // ── POST: Save a new lead ──────────────────────────────────────────────
  if (req.method === "POST") {
    // Rate limit lead creation
    const postRate = checkPostRateLimit(ip);
    if (postRate.limited) {
      return res.status(429).json({ error: "Too many submissions. Please try again later." });
    }

    try {
      const { conversation, result } = req.body;

      // Validate input structure and content
      const validation = validateLeadInput(conversation, result);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Strip to only safe fields from conversation messages
      const safeConversation = conversation.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Extract structured brand intel (fire async, but we wait for it)
      const brandIntel = await extractBrandIntel(safeConversation);

      // Save to Supabase
      const supabase = getSupabase();
      const { data, error } = await supabase.from("clavex_leads").insert({
        first_name: result.first_name ? String(result.first_name).slice(0, 100) : null,
        service: result.service,
        problem_summary: result.problem ? String(result.problem).slice(0, 500) : null,
        full_conversation: safeConversation,
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
    // Brute-force rate limiting
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
