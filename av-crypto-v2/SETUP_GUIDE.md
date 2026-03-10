# 🚀 Quick Setup Guide

Follow these steps to get the AV Crypto Dashboard running locally.

## Step 1: Prerequisites

Make sure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] A Supabase account ([sign up](https://supabase.com))
- [ ] Git installed

## Step 2: Supabase Project Setup

### 2.1 Create a New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name:** av-crypto-dashboard
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to you
4. Click "Create new project" (takes ~2 minutes)

### 2.2 Run Database Migration

1. Once your project is ready, click on the **SQL Editor** in the sidebar
2. Click "New Query"
3. Copy the **entire contents** of `supabase_migration.sql` (from the zip file)
4. Paste into the SQL editor
5. Click "Run" or press `Ctrl+Enter`
6. ✅ You should see "Success. No rows returned" - this means all tables and seed data were created!

### 2.3 Get Your API Keys

1. Go to **Settings** → **API** in the Supabase dashboard
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public key** (long string starting with `eyJ...`)

## Step 3: Local Project Setup

### 3.1 Install Dependencies

Open your terminal in the project directory:

```bash
cd av-crypto-dashboard-nextjs
npm install
```

### 3.2 Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and update with your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Create Test Users

### 4.1 Create Users in Supabase

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Create these three test users:

   **Admin User:**
   - Email: `admin@test.com`
   - Password: `testpassword123`

   **Editor User:**
   - Email: `editor@test.com`
   - Password: `testpassword123`

   **Viewer User:**
   - Email: `viewer@test.com`
   - Password: `testpassword123`

### 4.2 Assign User Roles

1. Go back to the **SQL Editor**
2. Run this query to auto-assign roles:

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

3. ✅ You should see "Success. No rows returned"

## Step 5: Run the Application

Start the development server:

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

## Step 6: Login and Explore

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. You'll be redirected to the login page
3. Sign in with one of the test accounts:
   - `admin@test.com` / `testpassword123` (full access)
   - `editor@test.com` / `testpassword123` (can edit)
   - `viewer@test.com` / `testpassword123` (read-only)

4. Explore the dashboard! You should see:
   - ✅ Inventory page with sample assets (SUI, BTC, ETH, etc.)
   - ✅ Live prices from CoinGecko
   - ✅ KPI cards showing portfolio value
   - ✅ Holdings by custodian

## 🎉 Success!

Your AV Crypto Dashboard is now running with:
- ✅ 13 sample assets (SUI, BTC, ETH, ALGO, etc.)
- ✅ Sample holdings across 7 custodians
- ✅ Trading instructions and events
- ✅ Live cryptocurrency prices
- ✅ Role-based access control

## 🚧 What's Next?

The core infrastructure is complete! The following pages have placeholders ready for development:
- 🔨 Asset Detail page
- 🔨 Trading History page
- 🔨 Events Calendar page
- 🔨 Access Management page
- 🔨 Settings page

Check the README.md for implementation details on each page.

## 🐛 Troubleshooting

### "Invalid login credentials" Error
- Double-check you created the users in Supabase Auth
- Make sure you're using the correct password (`testpassword123`)
- Try clearing cookies and cache

### "Network Error" or Blank Page
- Check that your `.env.local` file has the correct Supabase URL and key
- Make sure the development server is running (`npm run dev`)
- Check browser console for errors (F12 → Console tab)

### No Data Showing
- Verify you ran the complete `supabase_migration.sql` file
- Check Supabase dashboard → Table Editor to see if tables have data
- Try refreshing the page

### Prices Not Loading
- CoinGecko API may be rate-limited (free tier: 10-30 calls/min)
- Wait a minute and refresh
- Check browser console for errors

## 📞 Need Help?

If you run into issues:
1. Check the browser console (F12 → Console)
2. Check the terminal where `npm run dev` is running
3. Review the README.md for detailed documentation
4. Check Supabase logs (Dashboard → Logs)

---

**Happy coding! 🎉**
