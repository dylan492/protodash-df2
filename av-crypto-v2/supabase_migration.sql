-- =====================================================
-- AV CRYPTO DASHBOARD v2 - SUPABASE MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Master asset list (unique symbols)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  network TEXT,
  coingecko_id TEXT,  -- for price lookups
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings by custodian (multiple records per asset)
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  custodian TEXT NOT NULL,
  units NUMERIC NOT NULL DEFAULT 0,
  wallet_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, custodian)
);

-- Trading instructions with workflow
CREATE TABLE trading_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('Buy', 'Sell', 'Hold')),
  amount TEXT NOT NULL,
  timing TEXT,
  execution_notes TEXT,
  jira_ticket_id TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Executed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction history
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  custodian TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('trade', 'transfer', 'reward')),
  quantity NUMERIC NOT NULL,
  usd_cost_basis NUMERIC,
  jira_ticket_id TEXT,
  executed_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('drop', 'unlock', 'planned_trade', 'rec')),
  event_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  description TEXT,
  jira_ticket_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custodian access directory
CREATE TABLE custodian_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custodian TEXT NOT NULL,
  person_name TEXT NOT NULL,
  person_role TEXT,
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'transact', 'admin', 'two_touch')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App-level user roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached asset prices (optional, reduces API calls)
CREATE TABLE asset_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  current_price NUMERIC,
  change_24h NUMERIC,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX idx_holdings_custodian ON holdings(custodian);
CREATE INDEX idx_trading_instructions_asset_id ON trading_instructions(asset_id);
CREATE INDEX idx_trading_instructions_status ON trading_instructions(status);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_executed_at ON transactions(executed_at);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_asset_id ON events(asset_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_custodian_access_custodian ON custodian_access(custodian);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  role_result TEXT;
BEGIN
  SELECT role INTO role_result FROM user_roles WHERE user_id = check_user_id;
  RETURN COALESCE(role_result, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trading_instructions_updated_at
  BEFORE UPDATE ON trading_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodian_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;

-- Assets policies (everyone can read)
CREATE POLICY "Anyone can view assets" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can insert assets" ON assets FOR INSERT TO authenticated 
  WITH CHECK (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Editors can update assets" ON assets FOR UPDATE TO authenticated 
  USING (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Admins can delete assets" ON assets FOR DELETE TO authenticated 
  USING (get_user_role(auth.uid()) = 'admin');

-- Holdings policies
CREATE POLICY "Anyone can view holdings" ON holdings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can insert holdings" ON holdings FOR INSERT TO authenticated 
  WITH CHECK (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Editors can update holdings" ON holdings FOR UPDATE TO authenticated 
  USING (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Admins can delete holdings" ON holdings FOR DELETE TO authenticated 
  USING (get_user_role(auth.uid()) = 'admin');

-- Trading instructions policies
CREATE POLICY "Anyone can view instructions" ON trading_instructions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can insert instructions" ON trading_instructions FOR INSERT TO authenticated 
  WITH CHECK (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Editors can update instructions" ON trading_instructions FOR UPDATE TO authenticated 
  USING (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Admins can delete instructions" ON trading_instructions FOR DELETE TO authenticated 
  USING (get_user_role(auth.uid()) = 'admin');

-- Transactions policies
CREATE POLICY "Anyone can view transactions" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can insert transactions" ON transactions FOR INSERT TO authenticated 
  WITH CHECK (get_user_role(auth.uid()) IN ('editor', 'admin'));

-- Events policies
CREATE POLICY "Anyone can view events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can insert events" ON events FOR INSERT TO authenticated 
  WITH CHECK (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Editors can update events" ON events FOR UPDATE TO authenticated 
  USING (get_user_role(auth.uid()) IN ('editor', 'admin'));
CREATE POLICY "Editors can delete events" ON events FOR DELETE TO authenticated 
  USING (get_user_role(auth.uid()) IN ('editor', 'admin'));

-- Custodian access policies
CREATE POLICY "Anyone can view custodian_access" ON custodian_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage custodian_access" ON custodian_access FOR ALL TO authenticated 
  USING (get_user_role(auth.uid()) = 'admin');

-- User roles policies
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL TO authenticated 
  USING (get_user_role(auth.uid()) = 'admin');

-- Asset prices policies (public read, system write)
CREATE POLICY "Anyone can view prices" ON asset_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can update prices" ON asset_prices FOR ALL TO authenticated 
  USING (get_user_role(auth.uid()) IN ('editor', 'admin'));

-- =====================================================
-- SEED DATA: ASSETS
-- =====================================================

INSERT INTO assets (symbol, name, network, coingecko_id) VALUES
('SUI', 'Mysten Labs (SUI)', 'Sui', 'sui'),
('DEEP', 'Mysten Labs (DEEP)', 'Sui', NULL),
('NS', 'Mysten Labs (NS)', 'Sui', NULL),
('ALGO', 'Algorand', 'Algorand', 'algorand'),
('MYTHOS', 'Mythical Games', 'Ethereum', 'mythos'),
('WXM', 'WeatherXM', 'Ethereum', 'weatherxm'),
('ANLOG', 'Analog', 'Ethereum', NULL),
('0G', '0G Labs', 'Ethereum', NULL),
('QUAI', 'Quai Network', 'Quai', NULL),
('BERA', 'Berachain', 'Berachain', NULL),
('MOVE', 'Movement Labs', 'Movement', NULL),
('GRASS', 'Grass', 'Solana', 'grass'),
('EIGEN', 'Eigen Layer', 'Ethereum', 'eigenlayer'),
('BTC', 'Bitcoin', 'Bitcoin', 'bitcoin'),
('ETH', 'Ethereum', 'Ethereum', 'ethereum'),
('SOL', 'Solana', 'Solana', 'solana'),
('MATIC', 'Polygon', 'Polygon', 'matic-network'),
('USDC', 'USD Coin', 'Ethereum', 'usd-coin'),
('DOT', 'Polkadot', 'Polkadot', 'polkadot'),
('AVAX', 'Avalanche', 'Avalanche', 'avalanche-2'),
('LINK', 'Chainlink', 'Ethereum', 'chainlink');

-- =====================================================
-- SEED DATA: HOLDINGS
-- =====================================================

INSERT INTO holdings (asset_id, custodian, units, notes) VALUES
-- SUI ecosystem
((SELECT id FROM assets WHERE symbol = 'SUI'), 'Coinbase Prime', 6583837, '6.5M unlocked; 850k monthly unlock. Staked via Coinbase'),
((SELECT id FROM assets WHERE symbol = 'DEEP'), 'Coinbase Prime', 76351, 'Unlocked'),
((SELECT id FROM assets WHERE symbol = 'NS'), 'Coinbase Prime', 32000, 'Unlocked'),

-- Other tokens
((SELECT id FROM assets WHERE symbol = 'ALGO'), 'Coinbase Prime', 8206793, 'Staked'),
((SELECT id FROM assets WHERE symbol = 'MYTHOS'), 'BitGo', 300000, 'Unlocked'),
((SELECT id FROM assets WHERE symbol = 'WXM'), 'MetaMask (Enterprise)', 9722, 'Waiting for CB listing'),
((SELECT id FROM assets WHERE symbol = 'ANLOG'), 'Fireblocks', 4000000, 'Unlocked'),
((SELECT id FROM assets WHERE symbol = '0G'), 'Fireblocks', 862500, 'Unlocked'),
((SELECT id FROM assets WHERE symbol = 'QUAI'), 'Talisman', 5416667, '12mo cliff, 36mo linear vest'),
((SELECT id FROM assets WHERE symbol = 'GRASS'), 'Phantom', 50000, '6mo cliff'),
((SELECT id FROM assets WHERE symbol = 'EIGEN'), 'Fireblocks', 150000, 'Restaked'),

-- Sample BTC/ETH holdings (multi-custodian example)
((SELECT id FROM assets WHERE symbol = 'BTC'), 'Coinbase Prime', 125.5, 'Strategic reserve'),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'Fireblocks', 50.25, 'Cold storage'),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'BitGo', 25.0, 'Operational'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'Coinbase Prime', 1250, 'Primary trading'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'Fireblocks', 500, 'Staked'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'MetaMask (Enterprise)', 75, 'DeFi operations'),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'Coinbase Prime', 15000, 'Staked'),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'Fireblocks', 8500, 'Liquid'),
((SELECT id FROM assets WHERE symbol = 'USDC'), 'Coinbase Prime', 2500000, 'Operating reserve'),
((SELECT id FROM assets WHERE symbol = 'USDC'), 'Fireblocks', 1000000, 'Treasury'),
((SELECT id FROM assets WHERE symbol = 'DOT'), 'Coinbase Prime', 75000, 'Staked'),
((SELECT id FROM assets WHERE symbol = 'AVAX'), 'Coinbase Prime', 12500, 'Liquid'),
((SELECT id FROM assets WHERE symbol = 'LINK'), 'Coinbase Prime', 45000, 'Long-term hold'),
((SELECT id FROM assets WHERE symbol = 'LINK'), 'BitGo', 15000, 'Operational'),
((SELECT id FROM assets WHERE symbol = 'MATIC'), 'Coinbase Prime', 500000, 'Position reduction planned');

-- =====================================================
-- SEED DATA: TRADING INSTRUCTIONS
-- =====================================================

INSERT INTO trading_instructions (asset_id, action, amount, timing, execution_notes, jira_ticket_id, status) VALUES
((SELECT id FROM assets WHERE symbol = 'SUI'), 'Sell', '40-80k/week', 'Ongoing', 'Sell in tranches. Use Coinbase Prime TWAP.', 'CRYPTO-1089', 'Approved'),
((SELECT id FROM assets WHERE symbol = 'ALGO'), 'Sell', 'At market', 'Q1 2026', 'Reduce position per portfolio rebalance.', 'CRYPTO-1102', 'Approved'),
((SELECT id FROM assets WHERE symbol = 'MYTHOS'), 'Sell', 'All', 'When ready', 'Transfer to Coinbase, then sell at market.', 'CRYPTO-1095', 'Draft'),
((SELECT id FROM assets WHERE symbol = 'DEEP'), 'Sell', 'At market', 'Ongoing', 'Sell at market', NULL, 'Approved'),
((SELECT id FROM assets WHERE symbol = 'NS'), 'Hold', 'All positions', 'Pending review', 'Hold pending review', NULL, 'Approved'),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'Hold', 'All positions', 'Until Q2 2026 review', 'Strategic reserve - no trading unless Board approval', 'CRYPTO-1042', 'Approved'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'Sell', '200-300 ETH', 'Before Jan 31, 2026', 'Sell in tranches of 50 ETH max per day. Use Coinbase Prime TWAP.', 'CRYPTO-1089', 'Approved'),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'Buy', '5,000-10,000 SOL', 'Opportunistic - if price < $175', 'DCA strategy. Split across Coinbase Prime and Fireblocks.', 'CRYPTO-1095', 'Draft'),
((SELECT id FROM assets WHERE symbol = 'USDC'), 'Hold', 'Maintain $3M minimum', 'Ongoing', 'Operating reserve. Alert if balance drops below threshold.', 'CRYPTO-1001', 'Executed'),
((SELECT id FROM assets WHERE symbol = 'MATIC'), 'Sell', '100,000 MATIC', 'Q1 2026', 'Position reduction per portfolio rebalance. OTC preferred.', 'CRYPTO-1102', 'Approved'),
((SELECT id FROM assets WHERE symbol = 'LINK'), 'Hold', 'All positions', 'Until ecosystem evaluation', 'Monitor oracle integrations. No action required.', 'CRYPTO-1078', 'Approved'),
((SELECT id FROM assets WHERE symbol = 'EIGEN'), 'Hold', 'All positions', 'Until staking ends', 'Restaked - cannot sell until unlock', NULL, 'Approved');

-- =====================================================
-- SEED DATA: TRANSACTIONS
-- =====================================================

INSERT INTO transactions (asset_id, custodian, type, quantity, usd_cost_basis, jira_ticket_id, executed_at) VALUES
((SELECT id FROM assets WHERE symbol = 'ETH'), 'Coinbase Prime', 'trade', -50, 192500, 'CRYPTO-1089', '2025-01-14'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'Coinbase Prime', 'trade', -50, 191000, 'CRYPTO-1089', '2025-01-13'),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'Coinbase Prime', 'trade', 2500, 437500, 'CRYPTO-1095', '2025-01-10'),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'Fireblocks', 'transfer', 10, 950000, 'CRYPTO-1042', '2025-01-08'),
((SELECT id FROM assets WHERE symbol = 'USDC'), 'Coinbase Prime', 'transfer', 500000, 500000, 'CRYPTO-1001', '2025-01-05'),
((SELECT id FROM assets WHERE symbol = 'DOT'), 'Coinbase Prime', 'reward', 5000, 42500, 'CRYPTO-1055', '2024-12-28'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'Fireblocks', 'trade', 100, 380000, 'CRYPTO-1067', '2024-12-20'),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'Coinbase Prime', 'trade', 25, 2375000, 'CRYPTO-1042', '2024-12-15'),
((SELECT id FROM assets WHERE symbol = 'AVAX'), 'Coinbase Prime', 'trade', 5000, 200000, 'CRYPTO-1048', '2024-12-10'),
((SELECT id FROM assets WHERE symbol = 'LINK'), 'Coinbase Prime', 'trade', 10000, 175000, 'CRYPTO-1078', '2024-12-05'),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'Fireblocks', 'trade', 3500, 595000, 'CRYPTO-1032', '2024-11-28'),
((SELECT id FROM assets WHERE symbol = 'MATIC'), 'Coinbase Prime', 'trade', 100000, 95000, 'CRYPTO-1025', '2024-11-20'),
((SELECT id FROM assets WHERE symbol = 'SUI'), 'Coinbase Prime', 'trade', -40000, 160000, 'CRYPTO-1089', '2025-01-13'),
((SELECT id FROM assets WHERE symbol = 'SUI'), 'Coinbase Prime', 'trade', -40000, 156000, 'CRYPTO-1089', '2025-01-06');

-- =====================================================
-- SEED DATA: EVENTS
-- =====================================================

INSERT INTO events (asset_id, title, event_type, event_date, status, description, jira_ticket_id) VALUES
-- Unlocks
((SELECT id FROM assets WHERE symbol = 'QUAI'), 'QUAI Token Unlock', 'unlock', '2026-01-26', 'pending', '12mo cliff ends - 5.4M QUAI unlocks', 'CRYPTO-1110'),
((SELECT id FROM assets WHERE symbol = 'BERA'), 'BERA TGE', 'unlock', '2026-02-01', 'pending', 'Token Generation Event expected', 'CRYPTO-1115'),
((SELECT id FROM assets WHERE symbol = 'MOVE'), 'MOVE Cliff End', 'unlock', '2026-03-15', 'pending', 'Cliff ends Q1 2026', NULL),
((SELECT id FROM assets WHERE symbol = 'GRASS'), 'GRASS Unlock', 'unlock', '2026-02-15', 'pending', '6mo cliff ends', NULL),
((SELECT id FROM assets WHERE symbol = 'EIGEN'), 'EIGEN Staking End', 'unlock', '2026-03-01', 'pending', 'Staking lockup expires', NULL),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'SOL Staking Unlock', 'unlock', '2025-02-01', 'pending', 'Staking unlock - 5,000 SOL from validator', 'CRYPTO-1110'),
((SELECT id FROM assets WHERE symbol = 'AVAX'), 'AVAX Staking End', 'unlock', '2025-02-15', 'pending', 'AVAX staking period ends', 'CRYPTO-1115'),

-- Drops/Rewards
((SELECT id FROM assets WHERE symbol = 'DOT'), 'DOT Parachain Rewards', 'drop', '2025-01-25', 'pending', 'Parachain rewards distribution', 'CRYPTO-1105'),
((SELECT id FROM assets WHERE symbol = 'LINK'), 'LINK Staking Rewards', 'drop', '2025-01-10', 'complete', 'LINK staking rewards claimed', 'CRYPTO-1078'),
((SELECT id FROM assets WHERE symbol = 'SOL'), 'SOL Epoch Rewards', 'drop', '2024-12-28', 'complete', 'SOL epoch rewards received', 'CRYPTO-1055'),

-- Planned Trades
((SELECT id FROM assets WHERE symbol = 'SUI'), 'SUI Weekly Sale', 'planned_trade', '2025-01-20', 'pending', 'Weekly sale - 40k units', 'CRYPTO-1089'),
((SELECT id FROM assets WHERE symbol = 'SUI'), 'SUI Weekly Sale', 'planned_trade', '2025-01-27', 'pending', 'Weekly sale - 40k units', 'CRYPTO-1089'),
((SELECT id FROM assets WHERE symbol = 'SUI'), 'SUI Weekly Sale', 'planned_trade', '2025-02-03', 'pending', 'Weekly sale - 40k units', 'CRYPTO-1089'),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'ETH Sell Program', 'planned_trade', '2025-01-20', 'pending', 'Continue ETH sell program - next tranche', 'CRYPTO-1089'),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'BTC Q1 Review', 'planned_trade', '2025-03-01', 'pending', 'Q1 rebalance review - potential reallocation', 'CRYPTO-1120'),

-- REC Meetings
((SELECT id FROM assets WHERE symbol = 'SUI'), 'SUI REC Review', 'rec', '2025-02-05', 'pending', 'Monthly REC review for SUI position', NULL),
((SELECT id FROM assets WHERE symbol = 'ETH'), 'ETH REC Review', 'rec', '2025-02-05', 'pending', 'ETH sell program status review', NULL),
((SELECT id FROM assets WHERE symbol = 'BTC'), 'BTC REC Review', 'rec', '2025-03-05', 'pending', 'Q1 strategic review', 'CRYPTO-1120'),
(NULL, 'Monthly Portfolio REC', 'rec', '2025-02-10', 'pending', 'Full portfolio review meeting', NULL),
(NULL, 'Monthly Portfolio REC', 'rec', '2025-03-10', 'pending', 'Full portfolio review meeting', NULL);

-- =====================================================
-- SEED DATA: CUSTODIAN ACCESS
-- =====================================================

INSERT INTO custodian_access (custodian, person_name, person_role, access_level) VALUES
-- Coinbase Prime
('Coinbase Prime', 'Sarah Chen', 'Treasury Lead', 'admin'),
('Coinbase Prime', 'Michael Torres', 'CFO', 'admin'),
('Coinbase Prime', 'Alex Kim', 'Finance Analyst', 'read'),
('Coinbase Prime', 'Jordan Lee', 'Operations', 'transact'),

-- Fireblocks
('Fireblocks', 'Sarah Chen', 'Treasury Lead', 'two_touch'),
('Fireblocks', 'Michael Torres', 'CFO', 'two_touch'),
('Fireblocks', 'David Park', 'Security Lead', 'admin'),

-- BitGo
('BitGo', 'Sarah Chen', 'Treasury Lead', 'admin'),
('BitGo', 'Emily Wong', 'Compliance', 'read'),

-- MetaMask Enterprise
('MetaMask (Enterprise)', 'Jordan Lee', 'Operations', 'transact'),
('MetaMask (Enterprise)', 'Alex Kim', 'Finance Analyst', 'read'),

-- Phantom
('Phantom', 'Jordan Lee', 'Operations', 'transact'),

-- Talisman
('Talisman', 'Jordan Lee', 'Operations', 'transact'),
('Talisman', 'Sarah Chen', 'Treasury Lead', 'admin');

-- =====================================================
-- VIEWS
-- =====================================================

-- Consolidated asset view (aggregates holdings across custodians)
CREATE OR REPLACE VIEW consolidated_assets AS
SELECT 
  a.id,
  a.symbol,
  a.name,
  a.network,
  a.coingecko_id,
  COALESCE(SUM(h.units), 0) as total_units,
  COUNT(DISTINCT h.custodian) as custodian_count
FROM assets a
LEFT JOIN holdings h ON a.id = h.asset_id
GROUP BY a.id, a.symbol, a.name, a.network, a.coingecko_id;

GRANT SELECT ON consolidated_assets TO authenticated;

-- Holdings with asset info
CREATE OR REPLACE VIEW holdings_with_asset AS
SELECT 
  h.*,
  a.symbol,
  a.name as asset_name,
  a.network
FROM holdings h
JOIN assets a ON h.asset_id = a.id;

GRANT SELECT ON holdings_with_asset TO authenticated;

-- =====================================================
-- USER SETUP HELPER
-- Run this AFTER creating users in Supabase Auth
-- =====================================================
-- 1. Create users in Supabase Dashboard > Authentication > Users:
--    - admin@test.com (password: testpassword123)
--    - editor@test.com (password: testpassword123)  
--    - viewer@test.com (password: testpassword123)
--
-- 2. Then run this to auto-assign roles based on email:

-- DO $$
-- DECLARE
--   user_record RECORD;
-- BEGIN
--   FOR user_record IN SELECT id, email FROM auth.users LOOP
--     IF user_record.email LIKE '%admin%' THEN
--       INSERT INTO user_roles (user_id, role) VALUES (user_record.id, 'admin')
--       ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
--     ELSIF user_record.email LIKE '%editor%' THEN
--       INSERT INTO user_roles (user_id, role) VALUES (user_record.id, 'editor')
--       ON CONFLICT (user_id) DO UPDATE SET role = 'editor';
--     ELSE
--       INSERT INTO user_roles (user_id, role) VALUES (user_record.id, 'viewer')
--       ON CONFLICT (user_id) DO UPDATE SET role = 'viewer';
--     END IF;
--   END LOOP;
-- END $$;
