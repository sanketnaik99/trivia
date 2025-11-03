# Quickstart Guide: Authentication, Groups & Persistent Leaderboards

**Feature Branch**: `003-auth-group-leaderboard`  
**Last Updated**: 2025-11-02

## Overview

This guide provides step-by-step setup instructions for implementing authentication (Clerk), groups, and persistent leaderboards with PostgreSQL and Prisma. Follow these instructions to set up your local development environment.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop (for local PostgreSQL) or a cloud Postgres provider account
- Clerk account (free tier available)
- Git (for branch management)

---

## 1. Environment Setup

### 1.1 Clone & Branch

```bash
cd /Users/sanketnaik99/Coding/React/trivia
git checkout -b 003-auth-group-leaderboard
```

### 1.2 Install Dependencies

```bash
# Install monorepo dependencies
npm install

# Install backend-specific dependencies
cd apps/backend
npm install @prisma/client prisma pg
npm install -D @types/pg

# Install frontend-specific dependencies
cd ../frontend
npm install @clerk/nextjs
```

---

## 2. Clerk Setup (Authentication)

### 2.1 Create Clerk Application

1. Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Sign up or sign in
3. Click **"Add application"**
4. Name: `Trivia App`
5. Enable **Email** authentication (disable SMS/Social for MVP)
6. Copy the following keys from **API Keys** section:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 2.2 Configure Clerk Webhooks

1. In Clerk Dashboard, go to **Webhooks** → **Add Endpoint**
2. Endpoint URL (dev): `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - Use [ngrok](https://ngrok.com/) to expose localhost: `ngrok http 3001`
   - For production, use your actual backend URL
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the **Signing Secret** (starts with `whsec_`)

### 2.3 Configure Clerk Routes (Frontend)

Clerk requires specific route configurations for authentication pages. Create middleware in `apps/frontend`:

```bash
cd apps/frontend
```

The Clerk Next.js SDK will handle routing automatically via middleware. No additional route configuration is needed.

---

## 3. PostgreSQL Setup

### 3.1 Option A: Local Docker (Recommended for Development)

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: trivia-postgres
    environment:
      POSTGRES_USER: trivia_user
      POSTGRES_PASSWORD: trivia_password
      POSTGRES_DB: trivia_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start the database:

```bash
docker-compose up -d
```

Verify it's running:

```bash
docker ps | grep trivia-postgres
```

**Connection String**:
```
DATABASE_URL="postgresql://trivia_user:trivia_password@localhost:5432/trivia_db"
```

### 3.2 Option B: Vercel Postgres (Production-Ready)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Storage** → **Create Database** → **Postgres**
3. Copy the `DATABASE_URL` from the connection string tab
4. Add to your `.env` file

### 3.3 Option C: Neon (Serverless Postgres with Branching)

1. Go to [https://neon.tech/](https://neon.tech/)
2. Sign up and create a new project: `trivia-app`
3. Copy the connection string from the dashboard
4. Add to your `.env` file

---

## 4. Prisma Setup

### 4.1 Initialize Prisma (Backend)

```bash
cd apps/backend
npx prisma init
```

This creates:
- `prisma/schema.prisma`
- `.env` (add to `.gitignore` if not already present)

### 4.2 Configure Schema

Replace the contents of `apps/backend/prisma/schema.prisma` with the schema from `specs/003-auth-group-leaderboard/data-model.md`:

```prisma
// See data-model.md for the full schema
// Copy the Prisma Schema section into this file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Models: User, Group, Membership, GroupInvite, GroupLeaderboardEntry, Room
// (Full schema in data-model.md)
```

### 4.3 Set Environment Variables

Create `apps/backend/.env`:

```bash
# Database (choose one from step 3)
DATABASE_URL="postgresql://trivia_user:trivia_password@localhost:5432/trivia_db"

# Clerk
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Server
PORT=3001
NODE_ENV=development
```

Create `apps/frontend/.env.local`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Backend API
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

**Important**: Add `.env` and `.env.local` to `.gitignore`:

```bash
# Add to .gitignore if not already present
apps/backend/.env
apps/frontend/.env.local
```

### 4.4 Run Migrations

```bash
cd apps/backend
npx prisma migrate dev --name init
```

This creates:
- `prisma/migrations/` folder with migration SQL
- Applies the migration to your database
- Generates `@prisma/client` types

### 4.5 Generate Prisma Client

```bash
npx prisma generate
```

This updates the Prisma Client with your schema types. Run this after every schema change.

---

## 5. Backend Code Integration

### 5.1 Install Clerk Backend SDK

```bash
cd apps/backend
npm install @clerk/clerk-sdk-node
```

### 5.2 Create Prisma Client Instance

Create `apps/backend/src/config/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

### 5.3 Create Clerk Webhook Handler

Create `apps/backend/src/routes/webhook.routes.ts`:

```typescript
import { Router } from 'express';
import { Webhook } from 'svix';
import prisma from '../config/prisma';

const router = Router();

router.post('/clerk', async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Missing CLERK_WEBHOOK_SECRET' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  const body = JSON.stringify(req.body);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { type, data } = evt;

  switch (type) {
    case 'user.created':
    case 'user.updated':
      await prisma.user.upsert({
        where: { id: data.id },
        update: {
          email: data.email_addresses[0]?.email_address || '',
          displayName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || 'User',
          avatarUrl: data.image_url || null,
        },
        create: {
          id: data.id,
          email: data.email_addresses[0]?.email_address || '',
          displayName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || 'User',
          avatarUrl: data.image_url || null,
        },
      });
      break;
    case 'user.deleted':
      await prisma.user.delete({ where: { id: data.id } }).catch(() => {});
      break;
  }

  return res.json({ received: true });
});

export default router;
```

Register the webhook route in `apps/backend/src/routes/index.ts`:

```typescript
import webhookRoutes from './webhook.routes';

// Add to your route registration
app.use('/api/webhooks', webhookRoutes);
```

### 5.4 Middleware for Protected Routes

Create `apps/backend/src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' } });
  }

  try {
    const sessionClaims = await clerkClient.verifyToken(token);
    req.userId = sessionClaims.sub; // Attach userId to request
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
```

Apply to protected routes:

```typescript
import { requireAuth } from '../middleware/auth.middleware';

router.post('/api/groups', requireAuth, async (req, res) => {
  const userId = req.userId!;
  // Create group logic
});
```

---

## 6. Frontend Code Integration

### 6.1 Add Clerk Provider

Wrap your app in `ClerkProvider` in `apps/frontend/app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### 6.2 Create Middleware for Auth Routes

Create `apps/frontend/middleware.ts`:

```typescript
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/'], // Home page is public
  ignoredRoutes: ['/api/webhooks/(.*)'], // Allow webhook access
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### 6.3 Add Sign In/Sign Up Buttons

Create `apps/frontend/app/components/auth-buttons.tsx`:

```typescript
'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <div className="flex gap-2">
      <SignInButton mode="modal">
        <Button variant="outline">Sign In</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button>Sign Up</Button>
      </SignUpButton>
    </div>
  );
}
```

### 6.4 Fetch User Session Token

Use Clerk's `useAuth` hook to get the session token for API calls:

```typescript
'use client';

import { useAuth } from '@clerk/nextjs';

export function MyComponent() {
  const { getToken } = useAuth();

  const createGroup = async (name: string) => {
    const token = await getToken();
    const res = await fetch('http://localhost:3001/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    return res.json();
  };
}
```

---

## 7. Running the Application

### 7.1 Start Backend

```bash
cd apps/backend
npm run dev
```

Expected output:
```
Server listening on port 3001
Socket.IO server running
```

### 7.2 Start Frontend

```bash
cd apps/frontend
npm run dev
```

Expected output:
```
  ▲ Next.js 16.0.1
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### 7.3 Verify Database Connection

```bash
cd apps/backend
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555` to browse database tables.

---

## 8. Testing the Setup

### 8.1 Test Authentication Flow

1. Open `http://localhost:3000`
2. Click **Sign Up**
3. Enter email and create account
4. Verify you see the authenticated user UI (UserButton with avatar)
5. Check backend logs for Clerk webhook event: `user.created`
6. Verify user exists in Prisma Studio: `User` table should have 1 entry

### 8.2 Test Group Creation (Manual API Call)

```bash
# Get Clerk session token from browser DevTools:
# 1. Open DevTools → Application → Cookies → __session
# 2. Copy the token value

curl -X POST http://localhost:3001/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"name":"Test Group"}'
```

Expected response:
```json
{
  "group": {
    "id": "grp_...",
    "name": "Test Group",
    "privacy": "PRIVATE",
    "createdBy": "user_...",
    "createdAt": "2025-11-02T10:00:00.000Z",
    "memberCount": 1
  }
}
```

### 8.3 Test Leaderboard Query

```bash
# Replace :groupId with actual group ID from previous step
curl http://localhost:3001/api/groups/grp_.../leaderboard \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Expected response:
```json
{
  "leaderboard": [],
  "pagination": { "page": 1, "limit": 50, "total": 0, "totalPages": 0 },
  "groupInfo": { "id": "grp_...", "name": "Test Group", "totalGamesPlayed": 0 }
}
```

---

## 9. Common Issues & Troubleshooting

### Issue: "Webhook verification failed"

**Cause**: Incorrect `CLERK_WEBHOOK_SECRET` or missing Svix headers.

**Solution**:
1. Verify the webhook secret in Clerk Dashboard matches your `.env`
2. Use ngrok for local testing: `ngrok http 3001`
3. Update Clerk webhook endpoint URL to ngrok URL
4. Ensure Content-Type is `application/json` in webhook payload

### Issue: "Prisma Client not found"

**Cause**: Prisma Client not generated after schema changes.

**Solution**:
```bash
cd apps/backend
npx prisma generate
```

### Issue: "Database connection failed"

**Cause**: Incorrect `DATABASE_URL` or database not running.

**Solution**:
1. Verify Docker container is running: `docker ps`
2. Check connection string format: `postgresql://user:password@host:port/database`
3. Test connection manually:
   ```bash
   psql postgresql://trivia_user:trivia_password@localhost:5432/trivia_db
   ```

### Issue: "Cannot read properties of undefined (reading 'sub')"

**Cause**: Token verification failed or expired.

**Solution**:
1. Re-authenticate in the frontend
2. Verify `CLERK_SECRET_KEY` is correct in backend `.env`
3. Check token expiration (Clerk tokens expire after 60 minutes by default)

### Issue: "Rate limit exceeded" (429)

**Cause**: Too many requests to rate-limited endpoints (invite generation, group creation).

**Solution**: Wait for the rate limit window to reset (1 hour for invite generation).

---

## 10. Next Steps

### Implement API Endpoints

Refer to `specs/003-auth-group-leaderboard/contracts/http-api.md` for full endpoint specifications. Implement routes in order of dependency:

1. **Groups**: `POST /api/groups`, `GET /api/groups`, `GET /api/groups/:id`
2. **Invitations**: `POST /api/groups/:id/invites`, `POST /api/invites/:token/accept`
3. **Memberships**: `POST /api/groups/:id/leave`, `POST /api/groups/:id/members/:userId/remove`
4. **Rooms**: Extend existing `POST /api/rooms` to accept `groupId`
5. **Leaderboard**: `GET /api/groups/:id/leaderboard`, `POST /api/internal/leaderboard/update`

### Implement Socket.IO Events

Refer to `specs/003-auth-group-leaderboard/contracts/socketio-events.md`:

1. Extend `room:create` to accept `groupId`
2. Add `isGroupMember` flag to `room:join` response
3. Create `/groups` namespace for group-specific events
4. Implement `leaderboard:updated` broadcast after game completion

### Frontend Components

1. **Auth**: Sign in/up modals, user profile dropdown
2. **Groups**: Create group form, group list, group detail page
3. **Invites**: Generate invite modal, accept invite flow
4. **Leaderboard**: Group leaderboard table with pagination, real-time updates

### Database Seeding (Optional)

Create `apps/backend/prisma/seed.ts` for test data:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      id: 'user_test123',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  });

  const group = await prisma.group.create({
    data: {
      name: 'Test Group',
      createdBy: user.id,
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      groupId: group.id,
      role: 'ADMIN',
    },
  });

  console.log('Seeded:', { user, group });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
npx prisma db seed
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 11. Deployment Considerations

### Environment Variables (Production)

Set the following in your deployment platform (Vercel, Render, etc.):

**Backend**:
- `DATABASE_URL` (Vercel Postgres or Neon connection string)
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NODE_ENV=production`

**Frontend**:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` (production backend URL)

### Database Migrations

Run migrations in production:
```bash
npx prisma migrate deploy
```

### Clerk Webhook URL

Update Clerk webhook endpoint to production backend URL:
```
https://api.trivia.example.com/api/webhooks/clerk
```

### CORS Configuration

Add CORS middleware in `apps/backend/src/app.ts`:

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

---

## Resources

- **Clerk Documentation**: [https://clerk.com/docs](https://clerk.com/docs)
- **Prisma Documentation**: [https://www.prisma.io/docs](https://www.prisma.io/docs)
- **Next.js with Clerk**: [https://clerk.com/docs/quickstarts/nextjs](https://clerk.com/docs/quickstarts/nextjs)
- **Socket.IO Authentication**: [https://socket.io/docs/v4/middlewares/](https://socket.io/docs/v4/middlewares/)
- **Vercel Postgres**: [https://vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)
- **Neon**: [https://neon.tech/docs/introduction](https://neon.tech/docs/introduction)

---

## Support

For issues related to this feature implementation, refer to:
- Feature Spec: `specs/003-auth-group-leaderboard/spec.md`
- Data Model: `specs/003-auth-group-leaderboard/data-model.md`
- API Contracts: `specs/003-auth-group-leaderboard/contracts/`
- Research: `specs/003-auth-group-leaderboard/research.md`
