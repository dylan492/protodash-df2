-- =====================================================
-- AV CRYPTO DASHBOARD v3 - ADDITIVE MIGRATION
-- Run in Supabase SQL Editor AFTER existing migration
-- =====================================================

-- Custodian API keys table
-- Stores masked versions of API keys only (never raw keys)
CREATE TABLE IF NOT EXISTS custodian_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custodian TEXT NOT NULL UNIQUE,
  key_masked TEXT,                      -- last 4 chars visible only, e.g. "abcd••••••••efgh"
  status TEXT DEFAULT 'not_configured'
    CHECK (status IN ('not_configured', 'configured', 'error')),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_custodian_api_keys_updated_at
  BEFORE UPDATE ON custodian_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE custodian_api_keys ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view (masked keys only — no raw keys stored)
CREATE POLICY "Authenticated users can view api keys"
  ON custodian_api_keys FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage api keys"
  ON custodian_api_keys FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Seed with the 6 custodians that have API docs
INSERT INTO custodian_api_keys (custodian, status) VALUES
  ('BitGo', 'not_configured'),
  ('Coinbase', 'not_configured'),
  ('Fireblocks', 'not_configured'),
  ('MetaMask', 'not_configured'),
  ('Petra', 'not_configured'),
  ('Pelagus', 'not_configured')
ON CONFLICT (custodian) DO NOTHING;

-- =====================================================
-- FIX: Holdings schema alignment
-- The app queries total_units/vested_units/unvested_units
-- but original migration created only 'units'
-- This adds the missing columns if they don't exist
-- =====================================================

ALTER TABLE holdings
  ADD COLUMN IF NOT EXISTS total_units NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vested_units NUMERIC,
  ADD COLUMN IF NOT EXISTS unvested_units NUMERIC,
  ADD COLUMN IF NOT EXISTS unvested_status TEXT;

-- Backfill total_units from units where total_units is 0
UPDATE holdings SET total_units = units WHERE total_units = 0 AND units > 0;

-- Update the consolidated_assets view to use total_units
CREATE OR REPLACE VIEW consolidated_assets AS
SELECT
  a.id,
  a.symbol,
  a.name,
  a.network,
  a.coingecko_id,
  COALESCE(SUM(h.total_units), 0) as total_units,
  COUNT(DISTINCT h.custodian) as custodian_count
FROM assets a
LEFT JOIN holdings h ON a.id = h.asset_id
GROUP BY a.id, a.symbol, a.name, a.network, a.coingecko_id;

-- Update holdings_with_asset view
CREATE OR REPLACE VIEW holdings_with_asset AS
SELECT
  h.*,
  a.symbol,
  a.name as asset_name,
  a.network
FROM holdings h
JOIN assets a ON h.asset_id = a.id;

GRANT SELECT ON consolidated_assets TO authenticated;
GRANT SELECT ON holdings_with_asset TO authenticated;
