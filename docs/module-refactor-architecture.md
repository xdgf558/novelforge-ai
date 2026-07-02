# Modular Refactor Architecture

This note defines the target shape for the incremental modularization work.
The current app should stay a local-first modular monolith: one Next.js app,
one Prisma schema, and one local SQLite database, with clearer domain
boundaries inside the codebase.

## Goals

- Keep behavior unchanged during refactor-only phases.
- Move business rules out of route files before adding more features.
- Preserve author control: AI suggestions must remain reviewable and explicit.
- Preserve long-form continuity: formal memory tables and version snapshots are
  domain state, not page-local implementation details.
- Keep server-only AI and local configuration logic out of client components.

## Target Layers

### `app/`

Route modules and server actions live here.

Use `app/` for:

- Page composition and data loading for the route.
- Server action entry points, request parsing, redirects, and revalidation.
- Calling domain services from `lib/`.

Avoid putting new long-running business workflows directly in route files.
When a route action grows beyond request parsing and orchestration, move the
domain behavior into a service module.

### `components/`

Reusable UI pieces live here.

Use `components/` for:

- Form controls, panels, list cards, copy/download widgets, and local UI state.
- Client components that wrap server actions.
- Shared visual system components.

Do not fetch formal story memory or call Prisma from client components.

### `lib/<domain>/`

Domain services and pure helpers live here.

Use domain folders or files for:

- Validation helpers and value normalization.
- Database writes that represent a business operation.
- Version snapshot creation.
- Status synchronization.
- Deterministic export or formatting logic.
- Tests that prove behavior survived the refactor.

Prefer domain-specific modules such as `lib/chapters/*`,
`lib/outlines/*`, `lib/storylines/*`, `lib/memory/*`, and
`lib/publish/*` as larger route actions are split.

### `lib/ai/`

AI task context assembly, prompt-template resolution, model calls, task
logging, task maintenance, and AI output parsing live here.

Every AI call must go through logged task helpers. AI modules may suggest
formal memory changes, but they must not directly apply those changes unless
the surrounding workflow is explicitly author-triggered and already designed
for it.

### `lib/server-actions/`

Small Next.js server-action support utilities live here.

Use this layer for framework-coupled helpers shared by multiple route actions,
such as `notFound()` guards and redirect/revalidation utilities. Keep durable
business rules in domain services instead of this layer.

## Refactor Order

1. Establish support helpers and this boundary document.
2. Split chapter actions into chapter CRUD, versioning, AI task orchestration,
   outline sync, and storyline sync services.
3. Split outline, storyline, and structured-memory actions.
4. Split publish, audiobook, and continuity actions.

Each phase should update `docs/development-log.md`, update
`docs/project-memory.md` when architectural memory changes, and run relevant
tests plus `npm run typecheck`.

