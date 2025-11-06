# Contracts: UI Redesign with Dark Mode

**Feature**: 004-ui-redesign-dark-mode  
**Date**: November 5, 2025

## Overview

This feature is entirely frontend-focused and does not introduce any new HTTP API endpoints, WebSocket events, or backend contracts. All functionality is implemented in the React frontend using existing infrastructure.

## No New Contracts Required

This feature does not require:
- ❌ HTTP API endpoints (no backend changes)
- ❌ WebSocket events (no new Socket.IO events)
- ❌ GraphQL schemas (not applicable)
- ❌ Database schemas (localStorage only, client-side)
- ❌ External API integrations (no third-party services)

## Existing Contracts Used

The feature leverages existing infrastructure:

### Client-Side Storage
- **localStorage API**: Browser-native, no contract needed
- **Key**: `theme-preference`
- **Value**: JSON string with theme mode and timestamp

### Existing Routes (no changes)
The landing page uses existing navigation routes:
- `POST /room/create` - Existing endpoint for room creation
- Room join flow - Existing Socket.IO connection

### Static Assets
- `/horizontal-logo-light.png` - Existing file in public directory
- `/square-logo-light.png` - Existing file in public directory

## Internal Component Contracts

While not API contracts, here are the internal component interfaces for reference:

### ThemeProvider Props
```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
}
```

### useTheme Hook Return
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

### Landing Page Component Props
```typescript
// All components use default React props, no special contracts
interface HeroSectionProps {
  // No props - static content
}

interface FeaturesSectionProps {
  // No props - static content
}
```

## Browser APIs Used

### matchMedia
```typescript
window.matchMedia('(prefers-color-scheme: dark)').matches
// Returns: boolean
```

### localStorage
```typescript
localStorage.setItem(key: string, value: string): void
localStorage.getItem(key: string): string | null
```

### DOM APIs
```typescript
document.documentElement.classList.add('dark'): void
document.documentElement.classList.remove('dark'): void
```

## Conclusion

No formal API contracts are required for this feature. All functionality is self-contained within the frontend application using browser-native APIs and existing infrastructure.
