// ─── SUPABASE CLIENT (shared across serverless functions) ────────────────────
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let _client = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.");
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return _client;
}

module.exports = { getSupabase };
