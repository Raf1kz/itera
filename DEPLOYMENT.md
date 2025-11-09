# Vercel Deployment Guide

This guide walks you through deploying FlashStudy (Itera) to Vercel.

## Prerequisites

1. **Vercel Account**: Create account at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code should be pushed to GitHub (recommended) or use Vercel CLI
3. **Supabase Project**: Already set up with edge functions deployed
4. **Clerk Account**: JWT template configured (see CLAUDE.md)

---

## Quick Deploy (GitHub Integration)

### Step 1: Push Code to GitHub

```bash
# If not already a git repository
git init
git add .
git commit -m "Initial commit - ready for Vercel deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your FlashStudy repository
4. Configure project:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

### Step 3: Configure Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `VITE_SUPABASE_FUNCTION_URL` | `https://YOUR_PROJECT.functions.supabase.co` | Production, Preview, Development |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (use production key) | Production, Preview, Development |
| `VITE_ADMIN_USER_IDS` | `user_xxx,user_yyy` (comma-separated) | Production, Preview, Development |

**Important**:
- Use **production** Clerk keys (`pk_live_...`) for production environment
- Use **development** Clerk keys (`pk_test_...`) for preview/development environments if needed
- Never commit these values to git

### Step 4: Deploy

Click **Deploy** button. Vercel will:
1. Install dependencies (`npm install`)
2. Run build command (`npm run build`)
3. Deploy the `dist/` folder to CDN
4. Provide production URL (e.g., `https://your-app.vercel.app`)

---

## Alternative: Vercel CLI Deployment

### Installation

```bash
npm install -g vercel
```

### Login

```bash
vercel login
```

### Deploy

```bash
# From project root
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No (first time)
# - Project name? flashstudy (or your choice)
# - Directory? ./
# - Override settings? No (uses vercel.json)
```

### Set Environment Variables (CLI)

```bash
# Production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_SUPABASE_FUNCTION_URL production
vercel env add VITE_CLERK_PUBLISHABLE_KEY production
vercel env add VITE_ADMIN_USER_IDS production

# Preview (optional)
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_ANON_KEY preview
# ... repeat for all variables
```

### Production Deployment

```bash
vercel --prod
```

---

## Post-Deployment Configuration

### 1. Update Supabase CORS Settings

Update your Supabase edge function secrets to allow your Vercel domain:

```bash
# Get your Vercel production URL (e.g., https://flashstudy.vercel.app)
supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app --project-ref YOUR_REF
```

### 2. Update Clerk Allowed Origins

1. Go to Clerk Dashboard → **Configure → Settings**
2. Add your Vercel domain to:
   - **Allowed Origins (CORS)**: `https://your-app.vercel.app`
   - **Allowed Redirect URLs**: `https://your-app.vercel.app/*`

### 3. Test Authentication Flow

1. Visit your Vercel URL
2. Sign in with Clerk
3. Try generating flashcards to test:
   - Clerk JWT authentication
   - Supabase edge function calls
   - Database access (RLS policies)

### 4. Verify Edge Function Access

Open browser console and check for errors:
```javascript
// Should see successful API calls to:
// https://YOUR_PROJECT.functions.supabase.co/generate-flashcards
```

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Vercel Dashboard → **Settings → Domains**
2. Add your domain (e.g., `flashstudy.com`)
3. Configure DNS (Vercel provides instructions):
   - **A Record**: Point to Vercel's IP
   - **CNAME**: Point to `cname.vercel-dns.com`

### Update Environment Variables

After adding custom domain:

```bash
# Update ALLOWED_ORIGIN in Supabase
supabase secrets set ALLOWED_ORIGIN=https://flashstudy.com --project-ref YOUR_REF
```

Update Clerk allowed origins to include your custom domain.

---

## Troubleshooting

### Blank White Page on Deployment

**Issue**: Vercel deployment succeeds but shows a blank white page with no content

**Root Cause**: Missing environment variables (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, or `VITE_SUPABASE_ANON_KEY`) in Vercel dashboard

**Solution**:
1. Go to Vercel Dashboard → **Settings → Environment Variables**
2. Verify ALL required `VITE_*` variables are set:
   - `VITE_CLERK_PUBLISHABLE_KEY` (required - app won't render without it)
   - `VITE_SUPABASE_URL` (required for database access)
   - `VITE_SUPABASE_ANON_KEY` (required for database access)
   - `VITE_SUPABASE_FUNCTION_URL` (required for edge functions)
   - `VITE_ADMIN_USER_IDS` (optional - only for admin features)
3. After adding variables, click **Redeploy** in Vercel Deployments tab
4. **Important**: Environment variables are embedded at build time, so redeployment is required

**How to verify**:
- Open browser DevTools → Console on deployed site
- If you see "Clerk configuration required" screen instead of blank page, env vars are working
- If blank page persists, check Console for JavaScript errors

### Build Fails

**Issue**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
# Run locally to debug
npm run typecheck
npm run build

# Fix errors, then commit and redeploy
```

### Environment Variables Not Loading

**Issue**: App shows "undefined" for Supabase URL or Clerk key

**Solution**:
1. Verify variables in Vercel Dashboard → **Settings → Environment Variables**
2. Ensure all variables start with `VITE_` prefix (required for Vite)
3. Redeploy after adding variables (automatic rebuild needed)

### CORS Errors

**Issue**: `Access-Control-Allow-Origin` errors when calling edge functions

**Solution**:
```bash
# Ensure ALLOWED_ORIGIN matches your Vercel domain exactly (no trailing slash)
supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app --project-ref YOUR_REF
```

### Authentication Not Working

**Issue**: Clerk login works but edge function returns 401 Unauthorized

**Solution**:
1. Verify Clerk JWT template name is exactly `supabase` (lowercase)
2. Check `CLERK_ISSUER` in Supabase secrets matches Clerk dashboard
3. Ensure JWT template includes required claims (see CLAUDE.md)
4. Check browser console for detailed error messages

### 404 on Page Refresh

**Issue**: Refreshing `/decks` or other routes returns 404

**Solution**: This should be fixed by `vercel.json` rewrites. If not working:
1. Verify `vercel.json` exists in project root
2. Check rewrites configuration includes catch-all route
3. Redeploy

---

## Deployment Checklist

### Before First Deploy

- [ ] All code committed and pushed to GitHub
- [ ] `.env.local` in `.gitignore` (verify not committed)
- [ ] Production Clerk keys obtained (`pk_live_...`)
- [ ] Supabase edge functions deployed and tested
- [ ] Admin user IDs identified for production

### Vercel Configuration

- [ ] Project imported from GitHub
- [ ] All `VITE_*` environment variables set
- [ ] Production Clerk key configured
- [ ] Build settings verified (Framework: Vite, Output: dist)

### Post-Deploy

- [ ] `ALLOWED_ORIGIN` updated in Supabase secrets
- [ ] Vercel domain added to Clerk allowed origins
- [ ] Authentication tested end-to-end
- [ ] Flashcard generation tested
- [ ] Summary generation tested
- [ ] Spaced repetition (FSRS) tested
- [ ] All views accessible (Generate, Decks, Summaries, Study)

### Production Cleanup (CRITICAL)

- [ ] Remove admin bypass code from edge function (see TECHNICAL_STATUS.md)
- [ ] Remove anon key workaround from GenerateView
- [ ] Verify proper Clerk JWT authentication flow
- [ ] Test with non-admin users
- [ ] Monitor error logs for first 24 hours

---

## Continuous Deployment

Once set up, Vercel automatically deploys:

- **Production**: Every push to `main` branch
- **Preview**: Every push to feature branches (optional)

To disable auto-deploy for preview branches:
1. Go to **Settings → Git**
2. Disable "Preview Deployments"

---

## Monitoring

### Vercel Analytics

1. Go to **Analytics** tab in Vercel dashboard
2. View real-time traffic, performance metrics
3. Monitor Web Vitals (LCP, FID, CLS)

### Error Tracking

1. Go to **Logs** tab
2. Filter by:
   - **Build Logs**: Deployment issues
   - **Function Logs**: API errors (if using Vercel functions)
   - **Edge Logs**: Runtime errors

### Supabase Edge Function Logs

```bash
# View edge function logs
supabase functions logs generate-flashcards --project-ref YOUR_REF

# Real-time logs
supabase functions logs generate-flashcards --project-ref YOUR_REF --follow
```

---

## Rollback

If deployment has issues:

1. Go to **Deployments** tab in Vercel
2. Find last working deployment
3. Click **⋯ → Promote to Production**

---

## Cost Estimates

### Vercel

- **Hobby (Free)**: Unlimited deployments, 100GB bandwidth/month
- **Pro ($20/month)**: Commercial use, analytics, 1TB bandwidth

### Supabase

- **Free Tier**: 500MB database, 50K API requests/month
- **Pro ($25/month)**: 8GB database, unlimited API requests

### OpenAI (GPT-4o-mini)

- **Cost**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Estimate**: ~$0.01-0.05 per flashcard generation (depends on input size)
- **Budget**: Set usage limits in OpenAI dashboard

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Project README**: See [README.md](README.md)
- **Technical Details**: See [CLAUDE.md](CLAUDE.md)
- **Known Issues**: See [TECHNICAL_STATUS.md](TECHNICAL_STATUS.md)

---

## Security Best Practices

1. **Rotate Secrets**: Change OpenAI API key quarterly
2. **Monitor Usage**: Check Supabase and OpenAI dashboards weekly
3. **Rate Limiting**: Monitor edge function rate limits (see `rate-limit.ts`)
4. **Audit Logs**: Review Supabase auth logs monthly
5. **Dependency Updates**: Run `npm audit` monthly and update packages
6. **Environment Separation**: Use different Clerk projects for dev/prod

---

**Ready to deploy?** Start with the [Quick Deploy](#quick-deploy-github-integration) section above!
