# Deployment Guide - Trivia Room System

Complete guide to deploying the Trivia Room System to production.

## Architecture Overview

The application consists of two separate deployments:

1. **Frontend (Next.js)** → Deploy to Vercel
2. **Backend (Cloudflare Workers)** → Deploy to Cloudflare

## 🔧 Prerequisites

- Vercel account (free tier works)
- Cloudflare account (Workers free tier: 100,000 requests/day)
- GitHub repository with your code
- Node.js 18+ installed locally
- Wrangler CLI installed globally

```bash
npm install -g wrangler
```

---

## Part 1: Deploy Cloudflare Workers (Backend)

### Step 1: Setup Cloudflare Account

1. Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up)
2. Navigate to "Workers & Pages"
3. Click "Create Application" → "Create Worker"

### Step 2: Configure Wrangler

```bash
# Login to Cloudflare
wrangler login

# This will open a browser window to authenticate
```

### Step 3: Update wrangler.toml

Edit `workers/wrangler.toml`:

```toml
name = "trivia-workers"  # Change to your preferred name
main = "room-durable-object.ts"
compatibility_date = "2024-01-01"

# Durable Objects configuration
[[durable_objects.bindings]]
name = "ROOM"
class_name = "RoomDurableObject"

# Migrations for Durable Objects (required on first deploy)
[[migrations]]
tag = "v1"
new_classes = ["RoomDurableObject"]
```

### Step 4: Deploy Workers

```bash
cd workers
npm install
npm run deploy
```

Expected output:
```
Uploaded trivia-workers (X.XX sec)
Published trivia-workers (X.XX sec)
  https://trivia-workers.<your-subdomain>.workers.dev
```

### Step 5: Note Your Workers URL

Save the deployment URL - you'll need it for the Next.js deployment:
- **WebSocket URL**: `wss://trivia-workers.<your-subdomain>.workers.dev`
- **HTTP API URL**: `https://trivia-workers.<your-subdomain>.workers.dev`

### Step 6: Test Workers Deployment

```bash
# Test room creation
curl -X POST https://trivia-workers.<your-subdomain>.workers.dev/api/room/create \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser"}'

# Should return:
# {"roomCode":"XXXXXX","playerId":"uuid-here"}
```

---

## Part 2: Deploy Next.js Frontend (Vercel)

### Step 1: Prepare Repository

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### Step 2: Import to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_WS_URL` | Your Workers WebSocket URL | `wss://trivia-workers.example.workers.dev` |
| `NEXT_PUBLIC_API_URL` | Your Workers HTTP URL | `https://trivia-workers.example.workers.dev` |

**Important**: These must be set BEFORE the first deployment!

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Your site will be live at `https://your-project.vercel.app`

### Step 5: Test Production Deployment

1. Visit your Vercel URL
2. Create a room
3. Open in incognito/another browser
4. Join the room with the code
5. Verify real-time updates work

---

## Part 3: Custom Domain (Optional)

### For Vercel (Frontend)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `trivia.yourdomain.com`)
3. Follow DNS configuration instructions
4. Vercel will auto-provision SSL certificate

### For Cloudflare Workers (Backend)

1. Add a Workers route in Cloudflare Dashboard
2. Navigate to Workers → Routes
3. Add route: `api.yourdomain.com/*` → Your Worker
4. SSL is automatic with Cloudflare

Example with custom domains:
```env
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Part 4: Environment-Specific Configuration

### Development (.env.local)
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8787
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Staging (.env.staging)
```env
NEXT_PUBLIC_WS_URL=wss://trivia-workers-staging.workers.dev
NEXT_PUBLIC_API_URL=https://trivia-workers-staging.workers.dev
```

### Production (.env.production)
```env
NEXT_PUBLIC_WS_URL=wss://trivia-workers.workers.dev
NEXT_PUBLIC_API_URL=https://trivia-workers.workers.dev
```

---

## Part 5: CI/CD Setup (Optional)

### Automatic Workers Deployment

Create `.github/workflows/deploy-workers.yml`:

```yaml
name: Deploy Workers

on:
  push:
    branches: [main]
    paths:
      - 'workers/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd workers && npm ci
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: workers
```

### Automatic Vercel Deployment

Vercel automatically deploys on:
- Every push to `main` → Production
- Every PR → Preview deployment

No additional setup needed!

---

## Part 6: Monitoring & Debugging

### Cloudflare Workers

View logs in real-time:
```bash
cd workers
wrangler tail
```

Or view in Cloudflare Dashboard:
1. Workers & Pages
2. Select your worker
3. Click "Logs" tab

### Vercel

View logs in Vercel Dashboard:
1. Select your project
2. Click "Deployments"
3. Click on a deployment → "Function Logs"

### Common Issues

**Issue**: WebSocket connection fails
- **Solution**: Check CORS settings, verify WS URL uses `wss://` in production

**Issue**: "Module not found" in Workers
- **Solution**: Ensure all imports use explicit file extensions in `room-durable-object.ts`

**Issue**: Environment variables not working
- **Solution**: Remember to rebuild after changing env vars (`npm run build`)

---

## Part 7: Scaling Considerations

### Cloudflare Workers Limits

**Free Tier**:
- 100,000 requests/day
- 10ms CPU time per request
- 30 seconds per Durable Object instance

**Paid Tier** ($5/month):
- 10 million requests/month included
- $0.50 per additional million
- No CPU time limit

### Vercel Limits

**Hobby Tier** (Free):
- 100GB bandwidth/month
- Fast Builds (up to 6,000 minutes/month)

**Pro Tier** ($20/month):
- 1TB bandwidth/month
- Unlimited edge functions

---

## Part 8: Rollback Procedures

### Rollback Vercel Deployment

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Rollback Workers Deployment

```bash
cd workers
git checkout <previous-commit>
npm run deploy
```

Or use Cloudflare Dashboard:
1. Workers & Pages → Your worker
2. Click "Rollbacks" tab
3. Select previous version

---

## Part 9: Health Checks

### Workers Health Check

```bash
curl https://trivia-workers.workers.dev/health
```

Expected response: `200 OK`

### Frontend Health Check

```bash
curl https://your-project.vercel.app/
```

Expected response: `200 OK` with HTML

---

## Part 10: Security Best Practices

1. **Never commit .env files** - Use `.gitignore`
2. **Use HTTPS/WSS in production** - HTTP/WS only for local dev
3. **Rotate API tokens regularly** - Update in CI/CD secrets
4. **Enable Cloudflare WAF** - Protect against attacks
5. **Monitor logs for anomalies** - Set up alerts

---

## Quick Deployment Checklist

- [ ] Workers deployed to Cloudflare
- [ ] Workers URL saved
- [ ] Environment variables set in Vercel
- [ ] Frontend deployed to Vercel
- [ ] Test: Create room works
- [ ] Test: Join room works
- [ ] Test: WebSocket connection successful
- [ ] Test: Real-time updates work
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Logs accessible

---

## Support & Troubleshooting

**Cloudflare Workers Support**:
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Community Discord](https://discord.gg/cloudflaredev)

**Vercel Support**:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Community Discord](https://vercel.com/discord)

---

**Last Updated**: 2025-10-31
**Version**: 1.0.0
