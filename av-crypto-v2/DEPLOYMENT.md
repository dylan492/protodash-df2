# 🚀 Deployment Guide (Vercel)

This guide will help you deploy your AV Crypto Dashboard to production using Vercel.

## Prerequisites

- [ ] Vercel account ([sign up free](https://vercel.com/signup))
- [ ] Supabase project set up (see SETUP_GUIDE.md)
- [ ] GitHub account (recommended for automatic deployments)

## Option 1: Deploy via GitHub (Recommended)

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/av-crypto-dashboard.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `av-crypto-dashboard` repository
4. Click "Import"

### Step 3: Configure Environment Variables

In the Vercel deployment settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
COINGECKO_API_KEY=optional-for-pro-tier
```

💡 **Tip:** Get these from your Supabase dashboard → Settings → API

### Step 4: Deploy

1. Click "Deploy"
2. Wait 1-2 minutes for the build to complete
3. ✅ Your app will be live at `https://av-crypto-dashboard-xxx.vercel.app`

## Option 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
# From the project directory
vercel

# Follow the prompts:
# - Set up and deploy? [Y/n] → Y
# - Which scope? → Your account
# - Link to existing project? [y/N] → N
# - What's your project's name? → av-crypto-dashboard
# - In which directory is your code located? → ./
```

### Step 4: Set Environment Variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add COINGECKO_API_KEY
```

Enter each value when prompted.

### Step 5: Deploy to Production

```bash
vercel --prod
```

## Post-Deployment Setup

### 1. Configure Supabase Redirect URLs

After deployment, add your Vercel URL to Supabase:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to **Site URL:**
   ```
   https://your-app.vercel.app
   ```

3. Add to **Redirect URLs:**
   ```
   https://your-app.vercel.app/**
   http://localhost:3000/**
   ```

### 2. Test the Deployment

1. Visit your Vercel URL
2. Try logging in with test accounts
3. Verify data loads correctly
4. Check that prices update from CoinGecko

## Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- Deploy every push to `main` branch → Production
- Deploy pull requests → Preview deployments
- Run build checks and tests

## Environment Management

### Production vs Development

Keep separate Supabase projects:
- **Development:** Local `.env.local`
- **Production:** Vercel environment variables

### Update Environment Variables

Via Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Edit or add new variables
3. Redeploy for changes to take effect

Via CLI:
```bash
vercel env add VARIABLE_NAME production
vercel env rm VARIABLE_NAME production
```

## Custom Domain

### Add a Custom Domain

1. Go to your Vercel project → Settings → Domains
2. Add your domain (e.g., `crypto.alumniventures.com`)
3. Follow DNS setup instructions
4. Wait for DNS propagation (~24 hours max)

### Update Supabase URLs

Don't forget to add your custom domain to Supabase redirect URLs!

## Performance Optimization

### Enable Analytics

1. In Vercel dashboard → Analytics
2. Click "Enable Analytics"
3. Track page views, performance, and user behavior

### Configure Caching

Next.js automatically handles most caching. For additional control:

```typescript
// In API routes or pages
export const revalidate = 300; // Cache for 5 minutes
```

### Image Optimization

Next.js automatically optimizes images. Make sure to use the `Image` component:

```tsx
import Image from 'next/image';

<Image src="/logo.png" alt="Logo" width={100} height={100} />
```

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env.local` to Git
- ✅ Use Vercel's environment variable encryption
- ✅ Rotate keys periodically

### 2. Supabase Security

- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Use service role key only in API routes (never expose to client)
- ✅ Regularly review auth policies

### 3. API Rate Limits

- ✅ Implement rate limiting for API routes
- ✅ Use CoinGecko Pro API for higher limits in production
- ✅ Cache aggressively to reduce API calls

## Monitoring and Logging

### Vercel Logs

View real-time logs:
```bash
vercel logs
```

Or in dashboard → Deployments → [Select deployment] → Logs

### Supabase Logs

Monitor database queries and errors:
1. Supabase Dashboard → Logs
2. Filter by type (API, Database, Auth)

### Error Tracking (Optional)

Consider integrating:
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay
- [Datadog](https://www.datadoghq.com/) for APM

## Scaling Considerations

### Database

- Monitor Supabase usage in dashboard
- Upgrade plan if approaching limits
- Consider read replicas for high traffic

### CoinGecko API

- Free tier: 10-30 calls/minute
- Pro tier: Higher limits, more features
- Implement fallback to cached prices

### Vercel

- Free tier: 100GB bandwidth/month
- Pro tier: Unlimited bandwidth
- Monitor usage in dashboard

## Rollback Strategy

### Quick Rollback

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

Via CLI:
```bash
vercel rollback
```

### Database Rollback

Supabase provides point-in-time recovery:
1. Dashboard → Database → Backups
2. Restore to specific timestamp

## CI/CD Pipeline (Advanced)

For automated testing before deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Test build locally: `npm run build`

### "Module not found" Errors

- Clear Vercel cache: Settings → General → Clear Cache
- Ensure all dependencies are in `package.json`
- Check import paths for typos

### Authentication Issues

- Verify Supabase redirect URLs include Vercel URL
- Check that environment variables are correct
- Ensure cookies are enabled

### Slow Loading

- Check CoinGecko API response times
- Review Vercel Analytics for bottlenecks
- Consider implementing server-side caching

## Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

---

**🎉 Congratulations! Your dashboard is now live in production!**
