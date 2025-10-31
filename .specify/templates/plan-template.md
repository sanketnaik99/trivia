# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript 5+, Next.js 16+]  
**Primary Dependencies**: [e.g., Next.js, React, Tailwind CSS, shadcn/ui - verify against constitution]  
**Storage**: [if applicable, e.g., PostgreSQL, file storage, or N/A]  
**Testing**: NONE (per constitution - no testing infrastructure)  
**Target Platform**: [e.g., Web (responsive: mobile/tablet/desktop)]
**Project Type**: [Next.js app - determines source structure]  
**Performance Goals**: [e.g., <2s initial page load, 60fps animations or NEEDS CLARIFICATION]  
**Constraints**: [e.g., <500KB initial bundle, mobile-first, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [e.g., expected user count, page count, component complexity or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **Clean Code**: Does this feature maintain clean, readable code standards?
- [ ] **Simple & Elegant UI**: Does the UI design prioritize simplicity and elegance?
- [ ] **Responsive Design**: Is responsive design across all device sizes planned?
- [ ] **Minimal Dependencies**: Are new dependencies justified and minimal?
- [ ] **No Testing**: Confirm no test infrastructure is planned (this is correct per constitution)
- [ ] **Next.js + Tailwind + shadcn/ui**: Does the implementation use the required tech stack?

**Complexity Justifications**: [Document any necessary deviations with rationale]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Next.js App Router (DEFAULT for this project)
app/
├── (routes)/           # Route groups
├── components/         # Shared components
├── lib/               # Utilities and helpers
└── api/               # API routes (if needed)

components/
└── ui/                # shadcn/ui components

public/                # Static assets

# [REMOVE IF UNUSED] Option 2: Next.js with separate API
app/                   # Frontend Next.js app
├── (routes)/
├── components/
└── lib/

api/                   # Separate API service
├── src/
└── routes/

# [REMOVE IF UNUSED] Option 3: Monorepo structure
apps/
├── web/              # Next.js app
└── api/              # API service (if separate)

packages/             # Shared packages
└── ui/              # Shared components
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
