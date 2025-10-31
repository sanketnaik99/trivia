<!--
SYNC IMPACT REPORT
==================
Version Change: [NEW] → 1.0.0
Constitution Type: Initial ratification

Modified Principles: N/A (initial version)
Added Sections:
  - Core Principles: Clean Code, Simple & Elegant UI, Responsive Design, Minimal Dependencies
  - Technology Stack (mandatory requirements)
  - Development Standards

Removed Sections: N/A

Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Updated Constitution Check section
  ✅ .specify/templates/spec-template.md - Updated requirements guidance
  ✅ .specify/templates/tasks-template.md - Removed testing requirements

Follow-up TODOs: None
-->

# Trivia Constitution

## Core Principles

### I. Clean Code (NON-NEGOTIABLE)

Code MUST be clean, readable, and maintainable at all times. This principle is non-negotiable and supersedes all other considerations including delivery speed.

**Requirements**:
- Code MUST be self-documenting with clear variable and function names
- Functions MUST have a single, well-defined purpose
- Code duplication MUST be eliminated through proper abstraction
- Complex logic MUST be broken into smaller, understandable units
- Comments MUST explain "why" not "what" (code should explain the "what")
- TypeScript types MUST be properly defined - no `any` types except when absolutely necessary with justification

**Rationale**: Clean code reduces technical debt, improves maintainability, enables faster feature development, and reduces bugs. Unreadable code compounds problems exponentially over time.

### II. Simple & Elegant UI (NON-NEGOTIABLE)

User interfaces MUST prioritize simplicity, elegance, and user experience above visual complexity.

**Requirements**:
- UI components MUST be intuitive and require minimal explanation
- Design MUST follow established UX patterns unless there is compelling reason to deviate
- Visual hierarchy MUST be clear and guide user attention appropriately
- Animations and transitions MUST enhance usability, not distract
- Accessibility MUST be considered in all UI decisions
- Component composition MUST be logical and reusable

**Rationale**: Simple, elegant interfaces reduce cognitive load, improve user satisfaction, and are easier to maintain and extend. Complex UIs create friction and reduce adoption.

### III. Responsive Design (NON-NEGOTIABLE)

All UI MUST be fully responsive and provide excellent user experience across all device sizes.

**Requirements**:
- UI MUST work seamlessly on mobile (320px+), tablet (768px+), and desktop (1024px+) viewports
- Touch interactions MUST be properly sized (minimum 44x44px tap targets)
- Content MUST reflow logically at all breakpoints
- Images and media MUST be responsive and optimized
- Testing MUST verify functionality on multiple device sizes
- Performance MUST remain acceptable on mobile devices

**Rationale**: Users access applications from diverse devices. Non-responsive design excludes users, damages brand perception, and fails to meet modern web standards.

### IV. Minimal Dependencies (NON-NEGOTIABLE)

Project MUST maintain a minimal dependency footprint, adding new dependencies only when clearly justified.

**Requirements**:
- New dependencies MUST be justified with clear reasoning documented in commit messages or PRs
- Alternatives using existing dependencies or native functionality MUST be considered first
- Dependencies MUST be actively maintained and well-established
- Bundle size impact MUST be evaluated before adding UI dependencies
- Unused dependencies MUST be removed immediately
- Dependency updates MUST be reviewed for breaking changes

**Rationale**: Each dependency increases attack surface, maintenance burden, bundle size, and potential for breaking changes. Minimal dependencies improve security, performance, and long-term maintainability.

### V. No Testing Infrastructure

This project explicitly EXCLUDES all testing infrastructure and test code.

**Requirements**:
- NO unit tests shall be written
- NO integration tests shall be written
- NO end-to-end (E2E) tests shall be written
- NO testing frameworks shall be installed (Jest, Vitest, Playwright, Cypress, etc.)
- NO test configuration files shall be created
- Quality assurance MUST be performed through manual testing and code review

**Rationale**: This is a conscious architectural decision to optimize for rapid development and simplicity. Testing infrastructure adds complexity, dependencies, and maintenance overhead that is explicitly rejected for this project.

## Technology Stack

The following technology stack is MANDATORY and MUST NOT be substituted:

**Core Framework**:
- Next.js (React framework) - REQUIRED for all application development
- React 19+ - Component library
- TypeScript - Type safety and developer experience

**Styling**:
- Tailwind CSS - REQUIRED for all styling
- shadcn/ui - REQUIRED for UI component primitives

**Rationale**: This stack provides optimal developer experience, performance, and maintainability while adhering to the minimal dependencies principle. These technologies are battle-tested, well-documented, and have strong ecosystem support.

## Development Standards

### Code Review Requirements
- All code changes MUST be reviewed for adherence to Core Principles
- Reviewers MUST verify clean code standards are met
- UI changes MUST be reviewed for simplicity, elegance, and responsiveness
- New dependencies MUST be challenged and justified

### Component Development
- Components MUST be built using shadcn/ui primitives where applicable
- Custom components MUST follow shadcn/ui patterns and conventions
- Component APIs MUST be simple and composable
- Props MUST be properly typed with TypeScript

### Styling Standards
- Tailwind utility classes MUST be used for all styling
- Custom CSS MUST be avoided unless absolutely necessary
- Responsive breakpoints MUST use Tailwind's standard breakpoint system
- Dark mode support SHOULD be considered but is not mandatory

### Performance Standards
- Initial page load MUST prioritize perceived performance
- Images MUST be optimized and use Next.js Image component
- Code splitting MUST be employed for large feature sets
- Lighthouse scores SHOULD be monitored but not strictly enforced

## Governance

This constitution supersedes all other development practices and preferences. Any deviation from these principles MUST be explicitly justified, documented, and approved.

**Amendment Process**:
- Amendments require clear documentation of rationale
- Version number MUST be incremented following semantic versioning
- All affected templates and documentation MUST be updated
- MAJOR version for principle changes, MINOR for new sections, PATCH for clarifications

**Compliance**:
- All pull requests MUST verify compliance with constitution principles
- Constitution violations MUST be corrected before code review completion
- Complexity that violates principles MUST be justified or refactored
- Template generators MUST align with constitutional requirements

**Enforcement**:
- Constitution compliance is the responsibility of all contributors
- Code reviewers have authority to reject changes that violate principles
- Persistent violations may require architectural review

**Version**: 1.0.0 | **Ratified**: 2025-10-30 | **Last Amended**: 2025-10-30
