-- ═══════════════════════════════════════════════════════════════════════════════
-- CLAVEX BRAND INTELLIGENCE — Supabase Table Setup
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create the clavex_leads table
CREATE TABLE IF NOT EXISTS clavex_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  service TEXT NOT NULL,
  problem_summary TEXT,
  full_conversation JSONB NOT NULL DEFAULT '[]',
  brand_intel JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  whatsapp_clicked BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted')),
  ip_hash TEXT  -- hashed IP for deduplication, not tracking
);

-- Index for fast lookups by status and recency
CREATE INDEX IF NOT EXISTS idx_leads_status ON clavex_leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON clavex_leads (created_at DESC);

-- Enable Row Level Security (required by Supabase best practices)
ALTER TABLE clavex_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (our serverless functions use service key)
CREATE POLICY "Service role full access" ON clavex_leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Your table is ready.
-- ═══════════════════════════════════════════════════════════════════════════════
