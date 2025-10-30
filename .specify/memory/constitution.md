<!--
Sync Impact Report:
Version: 0.0.0 → 1.0.0
Modified principles: N/A (Initial constitution)
Added sections:
  - Core Principles (5 principles)
  - Technology Stack (mandatory dependencies)
  - Development Standards
  - Governance
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (validated)
  ✅ .specify/templates/spec-template.md (validated)
  ✅ .specify/templates/tasks-template.md (validated)
Follow-up TODOs: None
-->

# Trivia Project Constitution

## Core Principles

### I. TanStack Start Framework

**MUST** use TanStack Start as the foundational framework for all application features.
This includes:

- All routing MUST be implemented using TanStack Router with file-based routing
- Server-side functionality MUST leverage TanStack Start's server functions
- Data loading MUST use TanStack Router's loader patterns or TanStack Query
- The application MUST support both SSR and SPA modes as provided by TanStack Start

**Rationale**: TanStack Start provides a full-stack React framework with built-in
SSR, routing, and data fetching patterns that ensure consistency and optimal
performance across the application.

### II. Component Architecture with shadcn/ui

**MUST** use shadcn/ui for all UI components. New components MUST:

- Be added via the shadcn CLI: `pnpx shadcn@latest add [component]`
- Follow shadcn's component composition patterns
- Utilize the class-variance-authority for variant management
- Be placed in the `src/components/` directory structure
- Leverage lucide-react for iconography

**MUST NOT** install competing UI libraries (Material-UI, Ant Design, Chakra UI, etc.).

**Rationale**: shadcn/ui provides accessible, customizable components that integrate
seamlessly with Tailwind CSS, ensuring design consistency and reducing bundle size
through tree-shaking.

### III. Tailwind CSS for Styling

**MUST** use Tailwind CSS for all styling needs. Styling MUST:

- Use Tailwind utility classes as the primary styling approach
- Leverage the `cn()` utility from `src/lib/utils.ts` for conditional classes
- Follow Tailwind's design system (spacing, colors, typography)
- Use custom Tailwind configuration when design tokens need extension
- Utilize the `@tailwindcss/vite` plugin for optimal performance

**MUST NOT** use CSS-in-JS libraries, styled-components, or separate CSS/SCSS files
unless absolutely necessary for third-party library integration.

**Rationale**: Tailwind CSS ensures consistent styling, excellent performance,
and seamless integration with shadcn/ui components while maintaining a utility-first
approach that improves development velocity.

### IV. Clerk Authentication

**MUST** use Clerk as the authentication and user management solution.
Authentication implementation MUST:

- Use `@clerk/clerk-react` for all authentication flows
- Wrap the application with `ClerkProvider` from `src/integrations/clerk/provider.tsx`
- Use Clerk's prebuilt components for sign-in, sign-up, and user profile
- Store the `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` (never in source code)
- Implement route protection using Clerk's authentication state
- Use Clerk's session management for authenticated requests

**MUST NOT** implement custom authentication systems or use alternative auth providers.

**Rationale**: Clerk provides production-ready authentication with excellent DX,
security best practices, and seamless React integration, eliminating the need to
build and maintain custom auth infrastructure.

### V. No Testing Requirements

Testing is **EXPLICITLY NOT REQUIRED** for this project. Development workflow:

- E2E tests are NOT required
- Integration tests are NOT required
- Unit tests are OPTIONAL and only added if explicitly requested
- Test-first development (TDD) is NOT enforced
- Manual testing and validation is the primary quality assurance method

**Rationale**: This project prioritizes rapid development and prototyping over
comprehensive test coverage. Testing infrastructure exists in the codebase but
is not mandatory for feature implementation.

## Technology Stack

All features MUST use the following dependencies (present in `package.json`):

### Required Core Dependencies

- **Framework**: `@tanstack/react-start`, `@tanstack/react-router`
- **UI Library**: shadcn/ui components (via CLI)
- **Styling**: `tailwindcss`, `@tailwindcss/vite`
- **Authentication**: `@clerk/clerk-react`
- **React**: `react`, `react-dom` (version 19.2.0+)
- **State Management**: `@tanstack/react-query` (when server state needed)
- **Utilities**: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`

### Required Development Dependencies

- **Build Tool**: `vite`, `@vitejs/plugin-react`
- **Linting/Formatting**: `@biomejs/biome`
- **TypeScript**: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`
- **Routing Plugin**: `@tanstack/router-plugin`
- **Path Resolution**: `vite-tsconfig-paths`

### Dependency Management Rules

- New dependencies MUST be justified and documented
- MUST NOT add dependencies that conflict with the core principles
- MUST use the versions specified in `package.json` or newer patch versions
- Breaking changes in dependencies MUST be tested before upgrading

## Development Standards

### File Structure

- Routes MUST be placed in `src/routes/` following TanStack Router conventions
- Components MUST be organized in `src/components/`
- Integrations MUST be in `src/integrations/[integration-name]/`
- Utility functions MUST be in `src/lib/`
- Data and types MUST be in `src/data/` or colocated with features

### Code Quality

- Code MUST be formatted using Biome: `npm run format`
- Code MUST pass linting: `npm run lint`
- TypeScript strict mode MUST be enabled
- Environment variables MUST use the `VITE_` prefix and be stored in `.env.local`

### Documentation

- README.md MUST be kept up-to-date with setup instructions
- Complex features SHOULD include inline comments explaining the "why"
- API integrations MUST document endpoints and data structures

## Governance

### Amendment Process

1. Proposed changes MUST be documented with rationale
2. Changes affecting core principles require updating this constitution
3. Version MUST be incremented following semantic versioning:
   - **MAJOR**: Removal or redefinition of core principles
   - **MINOR**: Addition of new principles or technology requirements
   - **PATCH**: Clarifications, wording improvements, non-semantic changes

### Compliance

- All feature implementations MUST comply with core principles
- Deviations MUST be documented and justified in specification documents
- Constitution principles supersede individual preferences or conventions

### Version Control

This constitution is the authoritative source for project standards. When conflicts
arise between this document and other documentation, the constitution takes precedence.

**Version**: 1.0.0 | **Ratified**: 2025-10-30 | **Last Amended**: 2025-10-30
