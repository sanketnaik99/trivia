# Quickstart Guide: UI Redesign with Dark Mode

**Feature**: 004-ui-redesign-dark-mode  
**Date**: November 5, 2025  
**Target Audience**: Developers implementing this feature

## Prerequisites

- Node.js 18+ installed
- Git repository cloned
- Existing trivia app running locally
- Branch `004-ui-redesign-dark-mode` checked out

## Setup Instructions

### 1. Verify Current Setup

```bash
# Ensure you're on the correct branch
git branch --show-current
# Should output: 004-ui-redesign-dark-mode

# Navigate to frontend directory
cd apps/frontend

# Install next-themes dependency
npm install next-themes

# Verify dependencies are installed
npm list next react tailwindcss next-themes
# Should show: next@16.0.1, react@19.2.0, tailwindcss@4.x, next-themes@latest

# Start development server to verify baseline
npm run dev
# Open http://localhost:3000
```

### 2. Update Global Styles

**File**: `apps/frontend/app/globals.css`

Replace the existing content with the new OKLCH theme (provided by user). The new theme includes:
- Light and dark mode color palettes
- Typography tokens (Inter, Source Serif 4, JetBrains Mono)
- Border radius variables
- Shadow system
- Spacing units

**Verification**:
```bash
# Check if globals.css contains new variables
grep "oklch(0.7686 0.1647 70.0804)" apps/frontend/app/globals.css
# Should find primary color references
```

### 3. Create Theme Provider

**File**: `apps/frontend/app/providers/theme-provider.tsx`

```typescript
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Note**: This is a simple wrapper around next-themes for consistency with the project structure.

### 4. Create Theme Toggle Component

**File**: `apps/frontend/components/ui/theme-toggle.tsx`

```typescript
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

### 5. Update Root Layout

**File**: `apps/frontend/app/layout.tsx`

Add ThemeProvider wrapper and update header with theme toggle:

```typescript
import { ThemeProvider } from './providers/theme-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <QueryProvider>
        <html lang="en" suppressHydrationWarning>
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="text-xl font-bold">Trivia</Link>
                    <Navigation />
                  </div>
                  <div className="flex items-center gap-4">
                    <AuthButtons />
                    <ThemeToggle />
                  </div>
                </div>
              </header>
              <main>{children}</main>
            </ThemeProvider>
          </body>
        </html>
      </QueryProvider>
    </ClerkProvider>
  );
}
```

**Important**: 
- `attribute="class"` tells next-themes to use className strategy (toggles `dark` class on `<html>`)
- `defaultTheme="system"` respects OS preference by default
- `enableSystem` allows "system" as a theme option
- `suppressHydrationWarning` on `<html>` prevents hydration mismatch warnings

### 6. Create Landing Page Structure

**Directory**: `apps/frontend/app/(marketing)/`

```bash
mkdir -p apps/frontend/app/\(marketing\)/components
```

**File**: `apps/frontend/app/(marketing)/page.tsx`

```typescript
import { HeroSection } from './components/hero';
import { FeaturesSection } from './components/features';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}
```

**File**: `apps/frontend/app/(marketing)/components/hero.tsx`

```typescript
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-4xl mx-auto space-y-8">
        <Image
          src="/horizontal-logo-light.png"
          alt="Trivia"
          width={200}
          height={60}
          className="mx-auto"
          priority
        />
        <h1 className="text-5xl font-bold tracking-tight">
          Real-Time Trivia Competitions
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Create rooms, invite friends, and compete in real-time trivia battles. No signup required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg">
            <Link href="/room/create">Create Room</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg">
            <Link href="/room/join">Join Room</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

**File**: `apps/frontend/app/(marketing)/components/features.tsx`

```typescript
import { Zap, Users, Clock, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Real-time Gameplay',
    description: 'Instant synchronization with Socket.IO. See answers as they happen.'
  },
  {
    icon: Users,
    title: 'Group Competitions',
    description: 'Compete with friends or join public rooms. Track leaderboards and stats.'
  },
  {
    icon: Clock,
    title: 'Quick Room Creation',
    description: 'Start a game in seconds. Share a simple room code with friends.'
  },
  {
    icon: ShieldCheck,
    title: 'No Registration Required',
    description: 'Jump in and play immediately. Optional authentication for groups.'
  }
];

export function FeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose Trivia?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4 p-6 rounded-lg bg-card">
              <div className="flex-shrink-0">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 7. Move Existing Homepage

The current `apps/frontend/app/page.tsx` (room creation/join) should be moved to a new route or kept as-is if you want the landing page to replace it entirely.

**Option A**: Replace existing page (recommended)
- Rename current `page.tsx` to `apps/frontend/app/lobby/page.tsx`
- Update navigation links

**Option B**: Keep both
- Landing at `/` (marketing)
- Lobby at `/lobby` (authenticated users)

### 8. Animation Cleanup

Remove or simplify animations in these files:

```bash
# Files to update:
- apps/frontend/app/components/winner-banner.tsx (remove animate-bounce)
- apps/frontend/app/components/participant-card.tsx (remove slide-in animations)
- apps/frontend/components/ui/alert-dialog.tsx (simplify transitions)
- apps/frontend/components/ui/dialog.tsx (simplify transitions)
```

**Example change** in `winner-banner.tsx`:
```diff
- <div className="... animate-bounce ...">
+ <div className="... ...">
```

### 9. Add Reduced Motion Support

**File**: `apps/frontend/app/globals.css` (append)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Testing Checklist

### Theme Functionality
- [ ] Page loads in light mode by default (if system is light)
- [ ] Page loads in dark mode by default (if system is dark)
- [ ] Theme toggle switches between light and dark instantly
- [ ] Theme preference persists after page refresh
- [ ] Theme toggle icon changes correctly (sun in dark, moon in light)
- [ ] All pages apply theme consistently

### Landing Page
- [ ] Landing page appears at `/`
- [ ] Hero section displays logo, title, tagline, CTAs
- [ ] Features section displays 4 feature cards
- [ ] CTAs navigate to correct routes
- [ ] Layout is responsive on mobile, tablet, desktop

### Visual Design
- [ ] Primary color (yellow-green) appears on buttons, focus rings
- [ ] Accent color (orange in dark mode) appears correctly
- [ ] Text contrast meets WCAG 2.1 AA (4.5:1 minimum)
- [ ] Border radius is consistent (6px/0.375rem)
- [ ] Typography uses Inter for body, proper hierarchy

### Animations
- [ ] Winner banner no longer bounces
- [ ] Dialog/modal animations are simplified
- [ ] Badge animations are removed
- [ ] Loading spinners still work (purposeful)
- [ ] Skeleton loaders still pulse (purposeful)
- [ ] Reduced motion preference disables animations

### Responsive Design
- [ ] Mobile (320px-640px): Single column, stacked CTAs, square logo
- [ ] Tablet (640px-1024px): 2-column features, horizontal logo
- [ ] Desktop (1024px+): Full layout, horizontal logo
- [ ] Touch targets are minimum 44x44px
- [ ] No horizontal scroll on any breakpoint

### Accessibility
- [ ] Theme toggle has aria-label
- [ ] All images have alt text
- [ ] Keyboard navigation works (tab through elements)
- [ ] Focus states are visible
- [ ] Screen reader can navigate landing page

### Performance
- [ ] Landing page loads in <2s on throttled 4G
- [ ] Theme switching completes in <100ms
- [ ] No flash of unstyled content (FOUC)
- [ ] Logo images load with priority
- [ ] No console errors or warnings

## Troubleshooting

### Theme not persisting
**Symptom**: Theme resets on refresh  
**Solution**: Check localStorage permissions (may be blocked in private browsing)

### Flash of wrong theme
**Symptom**: Brief flash of light theme before dark applies  
**Solution**: Ensure `suppressHydrationWarning` is on `<html>` element

### Colors look wrong
**Symptom**: Colors don't match design  
**Solution**: Verify `globals.css` has OKLCH values, check for CSS conflicts

### Animations still present
**Symptom**: Unwanted animations remain  
**Solution**: Search for `animate-` classes, check tailwindcss-animate plugin config

### Logo not displaying
**Symptom**: Logo broken or missing  
**Solution**: Verify files exist in `/public/`, check Next.js Image component props

## Development Workflow

```bash
# 1. Start dev server
npm run dev

# 2. Open in browser
open http://localhost:3000

# 3. Toggle theme
# Click moon/sun icon in header

# 4. Test responsive
# Chrome DevTools > Device Toolbar (Cmd+Shift+M on Mac)

# 5. Check reduced motion
# Chrome DevTools > Rendering > Emulate CSS media prefers-reduced-motion: reduce

# 6. Verify contrast
# Chrome DevTools > Lighthouse > Accessibility audit
```

## Deployment Notes

### Environment Variables
- None required for this feature

### Build Verification
```bash
cd apps/frontend
npm run build
npm run start

# Verify production build
open http://localhost:3000
```

### Production Checklist
- [ ] Build succeeds without errors
- [ ] Bundle size increase <500KB
- [ ] Theme toggle works in production
- [ ] Landing page loads correctly
- [ ] Logos display properly
- [ ] No console errors in production

## Next Steps

After completing this setup:
1. Review all pages for theme compatibility
2. Test on multiple browsers (Chrome, Firefox, Safari)
3. Test on real mobile devices
4. Gather user feedback on new design
5. Monitor performance metrics
6. Consider adding theme transition animations (optional polish)

## Reference Links

- [Feature Spec](./spec.md)
- [Research](./research.md)
- [Data Model](./data-model.md)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [OKLCH Color Space](https://oklch.com/)
