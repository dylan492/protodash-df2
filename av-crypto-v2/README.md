# AV Crypto Dashboard - Next.js 14 + Supabase

A web application for Alumni Ventures to track and manage cryptocurrency token holdings and equity positions across multiple custodians.

## 🚀 Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Styling:** Tailwind CSS with dark theme
- **UI Components:** shadcn/ui (complete library included)
- **State Management:** TanStack Query (React Query)
- **Live Prices:** CoinGecko API (free tier)
- **Icons:** Lucide React

## 📋 Prerequisites

- Node.js 18+ or Bun
- A Supabase account and project
- (Optional) CoinGecko Pro API key for higher rate limits

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd av-crypto-dashboard-nextjs
npm install
# or
bun install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the complete migration script from `supabase_migration.sql` (provided in the zip)
   - This will create all tables, indexes, views, and functions
   - It will also seed the database with sample data

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
COINGECKO_API_KEY=optional-for-pro-tier
```

Get your Supabase URL and anon key from:
- Supabase Dashboard → Settings → API

### 4. Create Test Users

In your Supabase dashboard:
1. Go to Authentication → Users
2. Create test users:
   - `admin@test.com` / `testpassword123` (Admin role)
   - `editor@test.com` / `testpassword123` (Editor role)
   - `viewer@test.com` / `testpassword123` (Viewer role)

3. After creating users, run this SQL to assign roles:

```sql
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, email FROM auth.users LOOP
    IF user_record.email LIKE '%admin%' THEN
      INSERT INTO user_roles (user_id, role) VALUES (user_record.id, 'admin')
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    ELSIF user_record.email LIKE '%editor%' THEN
      INSERT INTO user_roles (user_id, role) VALUES (user_record.id, 'editor')
      ON CONFLICT (user_id) DO UPDATE SET role = 'editor';
    ELSE
      INSERT INTO user_roles (user_id, role) VALUES (user_record.id, 'viewer')
      ON CONFLICT (user_id) DO UPDATE SET role = 'viewer';
    END IF;
  END LOOP;
END $$;
```

### 5. Run the Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 User Roles & Permissions

| Role | View All | Edit Holdings | Manage Instructions | Manage Events | Manage Access | Admin Settings |
|------|----------|---------------|---------------------|---------------|---------------|----------------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Editor** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 📁 Project Structure

```
av-crypto-dashboard-nextjs/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Inventory (home) - ✅ Implemented
│   ├── providers.tsx           # React Query & toast providers
│   ├── globals.css             # Tailwind + custom styles
│   ├── login/
│   │   └── page.tsx            # Auth page - ✅ Implemented
│   ├── assets/
│   │   └── page.tsx            # Asset detail - 🔨 Placeholder
│   ├── history/
│   │   └── page.tsx            # Trading history - 🔨 Placeholder
│   ├── events/
│   │   └── page.tsx            # Events calendar - 🔨 Placeholder
│   ├── access/
│   │   └── page.tsx            # Access management - 🔨 Placeholder
│   ├── settings/
│   │   └── page.tsx            # Settings - 🔨 Placeholder
│   └── api/
│       └── prices/
│           └── route.ts        # CoinGecko proxy - ✅ Implemented
├── components/
│   ├── ui/                     # shadcn components (45+ components)
│   ├── layout/
│   │   ├── TopNav.tsx          # Top navigation bar
│   │   └── PageLayout.tsx      # Page wrapper
│   └── shared/
│       ├── DataDisclaimer.tsx  # Disclaimer components
│       ├── JiraLink.tsx        # Jira ticket links
│       └── StatusBadge.tsx     # Status badges
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Client-side Supabase
│   │   └── server.ts           # Server-side Supabase
│   ├── utils.ts                # Utility functions
│   └── prices.ts               # CoinGecko integration
├── hooks/
│   ├── use-prices.ts           # React Query price hook
│   ├── use-toast.ts            # Toast notifications
│   └── use-mobile.tsx          # Mobile detection
├── types/
│   └── database.ts             # TypeScript types
├── middleware.ts               # Supabase auth middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## ✅ Implemented Features

### Phase 1: Core Infrastructure (✅ Complete)
- ✅ Next.js 14 project with Tailwind CSS
- ✅ All shadcn/ui components ported from prototype
- ✅ Supabase authentication setup
- ✅ Database schema and seed data (via migration SQL)
- ✅ Auth flow (login with role-based access)

### Phase 2: Read-Only Views (Partial)
- ✅ **Inventory page** with live prices, KPIs, and asset tables
- ✅ Holdings by custodian cards
- 🔨 Asset detail page (placeholder created)
- 🔨 Trading history (placeholder created)
- 🔨 Events page (placeholder created)
- 🔨 Access page (placeholder created)

### Live Price Integration
- ✅ CoinGecko API integration
- ✅ 5-minute caching via React Query
- ✅ API route proxy to avoid CORS
- ✅ Price mapping for major cryptocurrencies

## 🎨 Design Features Preserved from Prototype

- ✅ Dark theme with glass-card effects
- ✅ Custom color palette (primary: teal, jira: blue)
- ✅ Status badges (approved, draft, executed, pending, complete)
- ✅ Custodian badges
- ✅ Jira integration indicators
- ✅ Custom scrollbars
- ✅ Mono font for numbers
- ✅ Responsive navigation

## 🚧 Next Steps for Development

### Phase 2 Completion (Pages)
1. **Asset Detail Page** (`/assets?symbol=XXX`)
   - Asset selector dropdown
   - Custodian breakdown table
   - Trading instructions cards
   - Related events timeline
   - Recent transaction history

2. **Trading History** (`/history`)
   - KPI cards (volume, trades, transfers, rewards)
   - Filterable transaction table
   - CSV export functionality
   - Date range filtering

3. **Events Calendar** (`/events`)
   - KPI cards for event types
   - List view (pending/complete toggle)
   - Calendar grid view
   - Event creation/editing forms

4. **Access Management** (`/access`)
   - By Custodian view
   - By Person view
   - RBAC permissions display
   - Access level legend

5. **Settings** (`/settings`)
   - Jira integration config
   - Price refresh settings
   - User management (admin only)

### Phase 3: Write Operations
1. Add/edit holdings (editors+)
2. Create/update trading instructions
3. Create/complete events
4. Record transactions
5. Manage access (admins only)

### Phase 4: Enhancements
1. CSV export with tax-ready formatting
2. Real-time price alerts
3. Jira API integration (auto-sync)
4. Audit logging
5. Multi-user collaboration features

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 🌐 API Routes

### `/api/prices` (GET)
Proxies CoinGecko API to fetch cryptocurrency prices.

**Query Parameters:**
- `ids` (required): Comma-separated CoinGecko IDs

**Response:**
```json
{
  "prices": {
    "BTC": { "usd": 98500, "usd_24h_change": 2.1 },
    "ETH": { "usd": 3850, "usd_24h_change": 1.8 }
  },
  "lastUpdated": "2026-01-23T15:30:00Z"
}
```

## 📊 Database Schema

See `supabase_migration.sql` for the complete schema. Key tables:

- `assets` - Master asset list (symbols, names, networks)
- `holdings` - Holdings by custodian (one record per asset-custodian pair)
- `trading_instructions` - Trading directives with workflow status
- `transactions` - Transaction history (trades, transfers, rewards)
- `events` - Calendar events (drops, unlocks, planned trades, REC meetings)
- `custodian_access` - Who can access which custodian
- `user_roles` - App-level RBAC (viewer, editor, admin)
- `asset_prices` - Cached prices (optional, for performance)

## 🔐 Security

- Row-level security policies enforced in Supabase
- Authentication required for all routes (except /login)
- Role-based access control via `user_roles` table
- Server-side API routes for sensitive operations
- Middleware-based auth refresh

## 📝 Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Your Supabase anonymous key

# Optional
COINGECKO_API_KEY=               # For CoinGecko Pro (higher rate limits)
```

## 🐛 Troubleshooting

### "Invalid JWT" or Auth Errors
- Clear browser cookies and localStorage
- Check that your Supabase URL and anon key are correct
- Ensure the user exists in Supabase Auth

### Prices Not Loading
- Check that the CoinGecko API is accessible
- Verify the `/api/prices` route is working
- Check browser console for CORS or network errors

### Database Errors
- Ensure you've run the complete migration SQL
- Check that RLS policies are enabled
- Verify user roles are correctly assigned

## 📖 Additional Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [CoinGecko API Documentation](https://www.coingecko.com/en/api)

## 📄 License

Private - Alumni Ventures Internal Use Only

## 🤝 Support

For questions or issues, contact the Alumni Ventures development team.

---

**Built with ❤️ by Alumni Ventures**
