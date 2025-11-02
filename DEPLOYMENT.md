# Deployment Guide - Trivia Room System (Express + Socket.IO)

Production deployment guide for the monorepo: Next.js frontend + Express/Socket.IO backend.

## Architecture Overview

Two independent deployments:

1. **Frontend (Next.js)** → deploy to Vercel (recommended)
2. **Backend (Express + Socket.IO)** → deploy to your Node host (Render, Railway, Fly.io, AWS, etc.)

## 🔧 Prerequisites

- Vercel account (for frontend)
- A Node hosting provider (for backend)
- GitHub repository with your code
- Node.js 18+ installed locally

---

## Part 1: Deploy Backend (Express + Socket.IO)

### Step 1: Choose a host

Pick a Node hosting provider (Render, Railway, Fly.io, AWS EC2/Lightsail, Azure App Service, etc.).

### Step 2: Build and run

Backend path: `apps/backend`

Environment variables:
- `PORT` (default: 3001)
- `FRONTEND_BASE_URL` (used for generating shareable URLs)

Start command:
```bash
npm ci
npm run build
npm start
```

Ensure CORS allows your frontend origin.

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
| `NEXT_PUBLIC_SOCKET_URL` | Your backend Socket.IO URL | `https://api.example.com` |
| `NEXT_PUBLIC_API_URL` | Your backend HTTP URL | `https://api.example.com` |

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

### For Backend (Express)

Point a subdomain like `api.yourdomain.com` to your backend host. Ensure SSL (HTTPS) is configured.

Example with custom domains:
```env
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Part 4: Environment-Specific Configuration

### Development (.env.local in apps/frontend)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Staging (.env.staging)
```env
NEXT_PUBLIC_SOCKET_URL=https://api-staging.example.com
NEXT_PUBLIC_API_URL=https://api-staging.example.com
```

### Production (.env.production)
```env
NEXT_PUBLIC_SOCKET_URL=https://api.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

---

## Part 5: CI/CD Setup (Optional)

### Automatic Vercel Deployment

Vercel automatically deploys on:
- Every push to `main` → Production
- Every PR → Preview deployment

No additional setup needed!

---

## Part 6: Monitoring & Debugging

### Backend

View logs in your hosting provider, or run locally with `npm run dev` in `apps/backend`.

### Vercel

View logs in Vercel Dashboard:
1. Select your project
2. Click "Deployments"
3. Click on a deployment → "Function Logs"

### Common Issues

**Issue**: Socket.IO connection fails
- **Solution**: Check CORS settings, verify `NEXT_PUBLIC_SOCKET_URL` is correct and uses `https://` in production

**Issue**: 404 on /api/room/:code/validate
- **Solution**: Confirm backend is deployed and `NEXT_PUBLIC_API_URL` is set to backend base URL

**Issue**: Environment variables not working
- **Solution**: Remember to rebuild after changing env vars (`npm run build`)

---

## Part 7: Scaling Considerations

### Backend Host Limits

Limits vary by provider (Render, Railway, Fly.io, AWS, etc.). Ensure:
- WebSockets are supported and not proxied incorrectly
- Instance has enough RAM/CPU for expected concurrent rooms
- Idle timeouts are disabled for long-lived connections

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

<!-- Removed Workers rollback section (not applicable) -->

---

## Part 9: Health Checks

### Backend Health Check

```bash
curl https://api.yourdomain.com/api/health
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
4. **Enable a WAF** - Protect against attacks (at your CDN or load balancer)
5. **Monitor logs for anomalies** - Set up alerts

---

## Quick Deployment Checklist

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

**Vercel Support**:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Community Discord](https://vercel.com/discord)

**Backend Hosting Support**:
- Refer to your provider's docs (Render, Railway, Fly.io, AWS, Azure, GCP) for deployment and logging specifics

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0
