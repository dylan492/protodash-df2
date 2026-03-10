# AV Crypto Dashboard - Project Specification v2

## Overview
A web application for Alumni Ventures to track and manage cryptocurrency token holdings and equity positions across multiple custodians. Built with Next.js 14, Supabase, and Tailwind CSS. Based on the protodash UI prototype.

---

## Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Styling:** Tailwind CSS with dark theme
- **UI Components:** shadcn/ui (already in prototype)
- **State Management:** TanStack Query (React Query)
- **Live Prices:** CoinGecko API (free tier)
- **Icons:** Lucide React

---

## Key Design Decisions

1. **Holdings by Custodian**: Assets are tracked per-custodian (e.g., 125 BTC at Coinbase Prime + 50 BTC at Fireblocks = separate records)
2. **Trading Instructions Workflow**: Full workflow with statuses (Draft → Approved → Executed)
3. **Jira Integration**: Optional manual field on transactions, events, and instructions (placeholder for future API integration)
4. **Live Prices**: Fetch from CoinGecko API, cache for 5 minutes
5. **No Token/Equity Type Distinction**: All assets treated the same - focus on wallet, trading instructions, units, price
6. **No iTeam Grouping**: Removed from requirements

---

## User Roles & Permissions (Supabase Auth)

| Role | View All | Edit Holdings | Manage Instructions | Manage Events | Manage Access | Admin Settings |
|------|----------|---------------|---------------------|---------------|---------------|----------------|
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editor | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Pages (Matching Prototype)

### 1. Inventory (`/`) - Home/Dashboard
**KPI Cards:**
- Total Portfolio Value (USD, live prices)
- Total Assets (unique symbols)
- Custodians (count)
- Top Holding (by value)

**Filters:**
- Search (by asset symbol/name)
- Custodian dropdown

**Asset Inventory Table:**
| Column | Description |
|--------|-------------|
| Asset | Symbol + Name with icon |
| Network | Optional badge |
| Total Units | Aggregated across all custodians |
| USD Value | Live price × units |
| % of Portfolio | Visual bar + percentage |
| Details link | → Asset Detail page |

**Holdings by Custodian Section:**
- Card per custodian showing total value
- List of assets held at that custodian with units

---

### 2. Asset Detail (`/assets?symbol=XXX`)
**Header:**
- Asset selector dropdown
- Large asset card with symbol, name, current price, total holdings, total USD value

**Tabs:**
1. **Custodian Breakdown**
   - Table: Custodian, Units, USD Value, % of Asset
   
2. **Trading Instructions**
   - Cards showing: Action (Buy/Sell/Hold), Status badge, Amount, Timing, Execution Notes, Jira ticket link, Created/Updated dates
   
3. **Related Events**
   - Table: Type, Date, Description, Status, Jira Ticket
   
4. **Recent History**
   - Table: Date, Type, Custodian, Quantity (+/-), USD Value, Jira Ticket

**All Active Trading Instructions Table:**
- Shows all instructions across all assets for context
- Highlights current asset's instructions

---

### 3. Trading History (`/history`)
**KPI Cards:**
- Total Volume (USD)
- Trades count
- Transfers count
- Rewards count

**Filters:**
- Search
- Asset dropdown
- Custodian dropdown
- Type dropdown (trade, transfer, reward)

**Transaction Table:**
| Column | Description |
|--------|-------------|
| Date | YYYY-MM-DD |
| Asset | Symbol with icon |
| Custodian | Badge |
| Type | trade/transfer/reward badge |
| Quantity | +/- with color coding |
| USD Cost Basis | Dollar amount |
| Jira Ticket | Link (optional) |

**Export CSV Button:**
- Generates tax-ready CSV with FIFO-friendly format

---

### 4. Events (`/events`)
**KPI Cards:**
- Upcoming Drops
- Upcoming Unlocks
- Planned Trades
- REC Meetings (NEW)
- Total Pending

**Tabs:**
1. **List View**
   - Pending Events (checkbox to mark complete)
   - Completed Events (strikethrough)
   - Each event shows: Type icon, Type badge, Asset badge, Description, Date, Jira link, Status
   
2. **Calendar View**
   - Monthly grid calendar
   - Events shown as colored pills on dates
   - Color coding by event type

**Event Types:**
- `drop` - Airdrops, staking rewards
- `unlock` - Token/staking unlocks
- `planned_trade` - Scheduled trades
- `rec` - REC (Investment Committee) meetings (NEW)

---

### 5. Access (`/access`)
**KPI Cards:**
- Total Users
- Custodians
- Admin Access count
- Two-Touch count

**Tabs:**
1. **By Custodian**
   - Card per custodian
   - Lists people with access: Name, Role, Access Level badge
   
2. **By Person**
   - Table: Person (with avatar), Role, Custodian Access (badges)
   
3. **App RBAC**
   - Cards for Viewer/Editor/Admin roles with permission lists
   - Custodian Access Level Legend (read, transact, admin, two-touch)

**Access Levels (Custodian-level):**
- `read` - View only
- `transact` - Can initiate transactions
- `admin` - Full control
- `two_touch` - Requires dual approval

---

### 6. Settings (`/settings`)
- Jira integration config (future)
- Price refresh settings
- Export options
- Admin-only: User management

---

### 7. Login (`/login`)
- Email/password auth via Supabase
- Sign up option
- Password reset
- Redirect to Inventory on success

---

## Data Model

### 1. `assets` - Master asset list
```sql
id              UUID PRIMARY KEY
symbol          TEXT NOT NULL UNIQUE  -- e.g., 'BTC', 'SUI'
name            TEXT NOT NULL         -- e.g., 'Bitcoin', 'Mysten Labs'
network         TEXT                  -- e.g., 'Ethereum', 'Solana' (optional display)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 2. `holdings` - Holdings by custodian
```sql
id              UUID PRIMARY KEY
asset_id        UUID REFERENCES assets
custodian       TEXT NOT NULL         -- e.g., 'Coinbase Prime', 'Fireblocks'
units           NUMERIC NOT NULL
wallet_address  TEXT                  -- optional
notes           TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE(asset_id, custodian)
```

### 3. `trading_instructions` - Trading directives
```sql
id              UUID PRIMARY KEY
asset_id        UUID REFERENCES assets
action          TEXT NOT NULL         -- 'Buy', 'Sell', 'Hold'
amount          TEXT NOT NULL         -- e.g., '200-300 ETH', 'All positions'
timing          TEXT                  -- e.g., 'Before Jan 31, 2026'
execution_notes TEXT
jira_ticket_id  TEXT                  -- optional, e.g., 'CRYPTO-1089'
status          TEXT NOT NULL         -- 'Draft', 'Approved', 'Executed'
created_by      UUID REFERENCES auth.users
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 4. `transactions` - Transaction history
```sql
id              UUID PRIMARY KEY
asset_id        UUID REFERENCES assets
custodian       TEXT NOT NULL
type            TEXT NOT NULL         -- 'trade', 'transfer', 'reward'
quantity        NUMERIC NOT NULL      -- positive or negative
usd_cost_basis  NUMERIC
jira_ticket_id  TEXT                  -- optional
executed_at     TIMESTAMPTZ NOT NULL
created_by      UUID REFERENCES auth.users
created_at      TIMESTAMPTZ
```

### 5. `events` - Calendar events
```sql
id              UUID PRIMARY KEY
asset_id        UUID REFERENCES assets  -- optional
title           TEXT NOT NULL
event_type      TEXT NOT NULL         -- 'drop', 'unlock', 'planned_trade', 'rec'
event_date      DATE NOT NULL
status          TEXT DEFAULT 'pending' -- 'pending', 'complete'
description     TEXT
jira_ticket_id  TEXT                  -- optional
created_by      UUID REFERENCES auth.users
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 6. `custodian_access` - Who can access which custodian
```sql
id              UUID PRIMARY KEY
custodian       TEXT NOT NULL
person_name     TEXT NOT NULL
person_role     TEXT                  -- e.g., 'Treasury Lead', 'CFO'
access_level    TEXT NOT NULL         -- 'read', 'transact', 'admin', 'two_touch'
created_at      TIMESTAMPTZ
```

### 7. `user_roles` - App-level RBAC
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users UNIQUE
role            TEXT DEFAULT 'viewer' -- 'viewer', 'editor', 'admin'
created_at      TIMESTAMPTZ
```

### 8. `asset_prices` - Cached prices (optional, for reducing API calls)
```sql
id              UUID PRIMARY KEY
symbol          TEXT NOT NULL UNIQUE
coingecko_id    TEXT                  -- e.g., 'bitcoin', 'ethereum'
current_price   NUMERIC
change_24h      NUMERIC
last_updated    TIMESTAMPTZ
```

---

## Live Price Integration (CoinGecko)

**API Endpoint:**
```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true
```

**Strategy:**
1. On page load, fetch prices for all assets
2. Cache in React Query with 5-minute stale time
3. Optionally store in `asset_prices` table for faster subsequent loads
4. Map asset symbols to CoinGecko IDs (store in assets table or use lookup)

**CoinGecko ID Mapping (examples):**
| Symbol | CoinGecko ID |
|--------|--------------|
| BTC | bitcoin |
| ETH | ethereum |
| SOL | solana |
| SUI | sui |
| ALGO | algorand |
| MATIC | matic-network |
| DOT | polkadot |
| AVAX | avalanche-2 |
| LINK | chainlink |
| USDC | usd-coin |

---

## Seed Data

### Assets
| Symbol | Name | Network |
|--------|------|---------|
| SUI | Mysten Labs (SUI) | Sui |
| DEEP | Mysten Labs (DEEP) | Sui |
| NS | Mysten Labs (NS) | Sui |
| ALGO | Algorand | Algorand |
| MYTHOS | Mythical Games | Ethereum |
| WXM | WeatherXM | Ethereum |
| ANLOG | Analog | Ethereum |
| 0G | 0G Labs | Ethereum |
| QUAI | Quai Network | Quai |
| BERA | Berachain | Berachain |
| MOVE | Movement Labs | Movement |
| GRASS | Grass | Solana |
| EIGEN | Eigen Layer | Ethereum |

### Holdings (sample)
| Asset | Custodian | Units |
|-------|-----------|-------|
| SUI | Coinbase Prime | 6,583,837 |
| DEEP | Coinbase Prime | 76,351 |
| NS | Coinbase Prime | 32,000 |
| ALGO | Coinbase Prime | 8,206,793 |
| MYTHOS | BitGo | 300,000 |
| WXM | MetaMask (Enterprise) | 9,722 |
| ANLOG | Fireblocks | 4,000,000 |
| 0G | Fireblocks | 862,500 |
| QUAI | Talisman | 5,416,667 |
| GRASS | Phantom | 50,000 |
| EIGEN | Fireblocks | 150,000 |

### Trading Instructions (sample)
| Asset | Action | Amount | Timing | Status |
|-------|--------|--------|--------|--------|
| SUI | Sell | 40-80k/week | Ongoing | Approved |
| ALGO | Sell | At market | Q1 2026 | Approved |
| MYTHOS | Sell | Transfer to CB, then sell | When ready | Draft |
| EIGEN | Hold | All positions | Until staking ends | Approved |

### Events (sample)
| Asset | Type | Date | Description |
|-------|------|------|-------------|
| QUAI | unlock | 2026-01-26 | 12mo cliff ends |
| BERA | unlock | 2026-02-01 | TGE expected |
| SUI | planned_trade | 2026-01-20 | Weekly sale - 40k units |
| SUI | rec | 2026-02-05 | REC review meeting |

### Custodian Access (sample)
| Custodian | Person | Role | Access |
|-----------|--------|------|--------|
| Coinbase Prime | Sarah Chen | Treasury Lead | admin |
| Coinbase Prime | Michael Torres | CFO | admin |
| Fireblocks | Sarah Chen | Treasury Lead | two_touch |
| Fireblocks | David Park | Security Lead | admin |
| BitGo | Sarah Chen | Treasury Lead | admin |

---

## File Structure
```
/app
  /layout.tsx              # Root layout with providers
  /page.tsx                # Inventory (home)
  /globals.css             # Tailwind + custom styles
  /assets/page.tsx         # Asset detail
  /history/page.tsx        # Trading history
  /events/page.tsx         # Events calendar
  /access/page.tsx         # Access management
  /settings/page.tsx       # Settings
  /login/page.tsx          # Auth page
  /api/prices/route.ts     # CoinGecko proxy endpoint
/components
  /layout/
    TopNav.tsx
    PageLayout.tsx
  /shared/
    DataDisclaimer.tsx
    JiraLink.tsx
    StatusBadge.tsx
  /ui/                     # shadcn components (from prototype)
    button.tsx
    card.tsx
    table.tsx
    badge.tsx
    tabs.tsx
    select.tsx
    input.tsx
    checkbox.tsx
    dialog.tsx
    toaster.tsx
    ... (all from prototype)
/lib
  supabase.ts              # Supabase client
  utils.ts                 # Helpers (cn, formatters)
  prices.ts                # CoinGecko fetching
/hooks
  use-toast.ts
  use-prices.ts            # React Query price hook
/types
  database.ts              # TypeScript types
```

---

## API Routes

### `/api/prices` (GET)
Proxies CoinGecko API to avoid CORS and add caching.

```typescript
// Returns
{
  prices: {
    BTC: { usd: 98500, change_24h: 2.1 },
    ETH: { usd: 3850, change_24h: 1.8 },
    ...
  },
  lastUpdated: "2026-01-20T15:30:00Z"
}
```

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
COINGECKO_API_KEY=[optional-for-pro-tier]
```

---

## Prototype Files to Preserve
The following from `protodash-main` should be migrated:
- All `/src/components/ui/*` - shadcn components
- `/src/index.css` - Tailwind config and custom styles
- Page layouts and structure from `/src/pages/*`
- Styling patterns (glass-card, status-badge, etc.)

---

## Implementation Priority

### Phase 1: Core Infrastructure
1. Set up Next.js 14 project with Tailwind
2. Port all shadcn/ui components from prototype
3. Set up Supabase with auth
4. Create database schema and seed data
5. Implement auth flow (login, roles)

### Phase 2: Read-Only Views
1. Inventory page with live prices
2. Asset detail page with tabs
3. Trading history with filters
4. Events page with list/calendar views
5. Access page (read-only directory)

### Phase 3: Write Operations
1. Add/edit holdings (editors)
2. Create/update trading instructions
3. Create/complete events
4. Record transactions
5. Manage access (admins)

### Phase 4: Enhancements
1. CSV export functionality
2. Price alerts (optional)
3. Jira API integration (future)
4. Audit logging

---

## Notes for Implementation

1. **Preserve the prototype's visual style** - The dark theme, glass-card effects, and status badges look great
2. **Vite → Next.js conversion** - Main changes are:
   - `react-router-dom` → Next.js App Router
   - Move pages to `/app` directory
   - Convert `useSearchParams` to Next.js version
3. **Supabase RLS** - Ensure all tables have proper row-level security policies
4. **CoinGecko rate limits** - Free tier is 10-30 calls/minute, so cache aggressively
