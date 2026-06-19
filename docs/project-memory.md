# Project Memory

## Product Identity

NovelForge AI is a local single-user web app for long-form serialized novel authors, especially WeChat public account fiction authors, web novel writers, and content studios.

The product is not just a text generator. Its core value is helping authors maintain million-word continuity through structured memory, versioned settings, character state tracking, foreshadow management, timeline tracking, AI generation records, pending update review, and continuity checks.

## MVP Boundary

The first version must be local-only and single-user.

Use this stack unless the user changes direction:

- Next.js
- TypeScript
- Tailwind CSS
- SQLite
- Prisma
- OpenAI API through server-side routes only

MVP includes:

- Project creation and project list
- Project dashboard
- Project setting editor
- AI project setting generation
- Setting version history
- Character creation and character library
- Chapter CRUD
- AI chapter beat generation
- AI chapter draft generation
- AI chapter summary generation
- AI pending setting update extraction
- Pending update approval/rejection flow
- Basic continuity check
- AI task records
- WeChat publish package generation
- Markdown/JSON project export
- Local persistence

MVP excludes:

- Team collaboration
- Payment
- SaaS multi-tenancy
- Mobile app
- Automatic WeChat publishing
- Complex analytics dashboards
- Cover image generation
- Reader comment scraping
- Role-based permissions
- Cloud sync

## Core Product Principles

- Author has final control.
- AI cannot directly overwrite formal story memory.
- Long-form consistency is more important than one-off text generation.
- Structured memory is preferred over sending full manuscript text.
- Every AI call should be traceable.
- Every formal setting or chapter change should have version history where practical.
- Costs should be controlled by passing only task-relevant context.

## Core Workflow

The intended author workflow is:

1. Create project.
2. Fill inspiration and basic project fields.
3. AI generates initial project setting.
4. User edits and confirms project setting.
5. AI/user creates main characters.
6. User confirms character profiles.
7. AI/user prepares outline.
8. User creates a chapter.
9. AI generates chapter beats.
10. User confirms beats.
11. AI generates chapter draft.
12. User edits draft.
13. AI optionally polishes text.
14. User confirms final text.
15. AI generates chapter summary.
16. AI extracts pending setting updates.
17. User approves, rejects, or edits updates.
18. AI runs continuity check.
19. AI generates WeChat publish package.
20. User publishes manually and moves to next chapter.

## Database Memory Baseline

Prioritize these tables early:

- `projects`
- `project_settings`
- `setting_versions`
- `characters`
- `character_versions`
- `world_rules`
- `outlines`
- `chapters`
- `chapter_versions`
- `chapter_summaries`
- `foreshadows`
- `timeline_events`
- `ai_tasks`
- `ai_prompt_templates`
- `pending_updates`
- `continuity_reports`
- `publish_packages`

## AI Integration Rules

- Frontend must never access `OPENAI_API_KEY`.
- All AI calls go through backend routes/actions.
- Store model name, prompt template version, input context summary, output, status, token usage when available, created time, and adoption state.
- Structured tasks should use JSON Schema:
  - Project setting generation
  - Character generation
  - Chapter summary extraction
  - Pending update extraction
  - Continuity checking
  - WeChat publish packaging where useful
- Draft generation and polishing can output text, but still need `ai_tasks` records.

## Context Strategy

Do not pass the full novel manuscript for routine generation.

For chapter generation, assemble only:

- Project setting compressed summary
- Relevant character profiles
- Relevant world rules
- Current volume outline
- Current story unit outline
- Recent 3 chapter summaries
- Previous chapter full text when needed
- Current chapter goal
- Current chapter beats
- Forbidden items
- Style sample

Long-term memory should live in structured data:

- Project setting
- Character profiles
- World rules
- Foreshadow pool
- Timeline events
- Chapter summaries
- Phase summaries
- Setting versions

## Development Phase Order

Recommended implementation order:

1. Project skeleton, dependencies, Prisma, SQLite, base layout.
2. Project CRUD and dashboard.
3. Project setting editor and setting version records.
4. Character library and character CRUD.
5. Chapter list and chapter editor.
6. AI service wrapper, prompt templates, AI task records.
7. Chapter beat generation.
8. Chapter draft generation.
9. Chapter summary generation.
10. Pending update extraction and review flow.
11. Continuity check reports.
12. WeChat publish package and Markdown/JSON export.

## Completed Phases

- Phase 0: Project memory baseline and development notes.
- Repository setup: local Git repository and private GitHub repository.
- Phase 1: Next.js, TypeScript, Tailwind CSS, Prisma, SQLite, base layout, and project CRUD.
- Phase 2: Project setting editor, setting version snapshots, setting history pages, and Vitest baseline tests.
- Phase 3: Character library, character CRUD, character version snapshots, and character field tests.
- Phase 4: Chapter list, chapter editor, chapter CRUD, chapter version snapshots, and chapter field tests.
- Phase 5: AI prompt templates, AI task records, server-only OpenAI wrapper, and AI task audit page.
- Phase 6: AI chapter beat generation, context assembly, AI task records, and explicit author adoption into chapter beats.
- Phase 7: AI chapter draft generation from confirmed beats, draft task records, and explicit author adoption into chapter draft text.
- Phase 8: AI chapter summary extraction from author-confirmed final text, structured summary task records, and chapter detail UI review surface.
- Phase 9: Pending update extraction, author review flow, and approved writes into formal setting, character, world rule, foreshadow, and timeline memory.
- Phase 10: Continuity check reports, issue review surface, and resolved/open report workflow.
- Phase 11: WeChat publish packages, copy/download Markdown publishing materials, and Markdown/JSON project export.
- Phase 12: MVP acceptance dashboard, local acceptance smoke script, prompt-template helper consolidation, and acceptance hardening checks.
- Phase 13: macOS desktop packaging prototype with Electron, local app data, desktop SQLite startup migrations, and macOS packaging scripts.
- Phase 14: macOS distribution hardening is completed. Branded icon generation, Developer ID signing, hardened runtime, `asar` packaging, Electron locale pruning, generated Prisma client copying, signed DMG/ZIP artifacts, packaged startup smoke, final DMG notarization, stapling, and `syspolicy_check distribution` are implemented.
- Nocturne UI refresh: the app shell and project dashboard now use a dark teal writing-workbench style with warm gold/cyan accents, branded custom SVG illustrations, local mode status, glassy cards, and scoped dark styling for legacy pages.
- Phase 16: AI connection settings page for local API Key, custom model id, and OpenAI-compatible base URL, including DeepSeek-style custom provider support without exposing API keys to the frontend.
- Phase 17: software-side publish platform abstraction, local target/token management, standard website import package JSON, draft/direct publish modes, incremental content-hash tracking, and local publish result records.
- Phase 18A: Station Cat publish API adapter and draft API contract, including import request generation, endpoint normalization, server-only future HTTP client, response/error parsing, dry-run publish run request storage, and contract documentation for the website backend agent.
- Phase 18B: Station Cat real publish API integration, including `POST /api/novelforge/import`, Station Cat Publish Token handling, preview/publish URL persistence, remote id sync-state updates, failed-run recording without hash advancement, and updated website API contract docs.
- Phase 19A: project cover image upload, local cover asset storage, project-level cover metadata, publish-page cover preview/removal, and Station Cat standard package cover payload with base64 image data.

## UI Direction

- Current product UI direction is a dark local writing workbench, not a generic light SaaS dashboard.
- Primary feel: nocturne writing room, local memory vault, warm editorial tooling.
- Use very dark teal/black surfaces, warm gold CTAs and borders, cyan local/active accents, cream primary text, and muted parchment secondary text.
- Keep the first screen as the usable project dashboard. Do not turn it into a marketing landing page.
- Custom story-specific SVG illustration components live in `components/story-illustrations.tsx` and can be reused for future empty states or dashboard panels.
- `components/app-shell.tsx` owns the persistent sidebar, local mode toolbar, and dark workspace panel.
- `app/globals.css` contains the scoped `nf-*` visual system plus `nf-legacy-surface` overrides so older MVP pages stay visually aligned until they receive dedicated component cleanup.

## Next Phase

The local MVP feature set, acceptance hardening pass, macOS packaging prototype, distribution hardening, first dark UI refresh, in-app AI connection settings, software-side publishing platform preparation, Station Cat API contract adapter, real Station Cat import integration, and local project cover upload are implemented:

- Production app icon assets exist under `build/`.
- macOS packaging now uses Developer ID signing, hardened runtime, and signed DMG/ZIP artifacts.
- Historical Phase 14 distribution validation produced a notarized and stapled DMG, but the current product is for personal local use. Do not run Apple notarization by default for future rebuilds; produce a fresh signed local DMG/ZIP instead.
- Packaged runtime uses `app.asar.unpacked`; keep generated Prisma client copying in `scripts/after-pack.cjs` because electron-builder does not reliably include the `node_modules/.prisma` dot directory from glob rules alone.
- Desktop startup must not run Prisma CLI commands from inside the packaged app bundle. DMG volumes are read-only, and Prisma CLI can try to mutate `node_modules/@prisma/engines` under `app.asar.unpacked`, causing `EROFS`. Use `runDesktopMigrations` in `desktop/runtime.cjs`, which reads bundled `prisma/migrations/*/migration.sql`, applies SQL through Prisma Client to the user data SQLite database, and records `_prisma_migrations`.
- `npm run desktop:dist:mac` produces signed local artifacts and skips notarization.
- `npm run desktop:dist:mac:notarized` exists only for an explicit future public-distribution request; do not use it for normal personal-use rebuilds.
- Current formal personal-use macOS installer version is `0.1.9`; handoff should leave only `release/desktop/NovelForge-AI-0.1.9-mac-arm64.pkg` in the delivery folder unless the user explicitly asks for DMG/ZIP/update metadata.
- Formal handoff should use a `.pkg` installer that installs `NovelForge AI.app` into `/Applications`; a DMG is only a drag-and-drop/test package because the app inside a DMG can be launched directly.
- Current keychain has Developer ID Application signing available but no Developer ID Installer identity; until an Installer certificate is added, the PKG itself is unsigned while the `NovelForge AI.app` payload remains Developer ID Application signed.
- Pending update review forms now show an in-flight state while approving/rejecting, redirect back with a visible result banner, and processed cards show the handling time plus whether the suggestion wrote to formal memory.
- Project dashboard pending-update cards should show workflow state counts (`pending`, `approved`, `rejected`) rather than only total suggestions, and the sidebar creative-tool entries are real project-context links when a current project id exists in the route.
- Sidebar creative-tool entries should also work from non-project routes by using the most recently updated project as a fallback, and the fixed desktop sidebar must have its own vertical scrolling so the local persistence note is not clipped on short windows.
- Before reporting a desktop package as ready, verify the packaged app still uses `runDesktopMigrations` from `desktop/runtime.cjs`, does not contain Prisma CLI `migrate deploy` startup code, and the installer payload targets `/Applications/NovelForge AI.app`.
- AI connection config is now editable at `/ai-settings`; the app writes the local `.env` config and reads `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` dynamically on the server.
- OpenAI's official base URL uses the Responses API, while custom OpenAI-compatible base URLs such as DeepSeek use `/chat/completions`. AI task failures should be recorded in `ai_tasks` and redirect back to the relevant page instead of surfacing a full Next.js application error page.
- Chapter detail pages auto-refresh while AI tasks are pending/running, and stale chapter AI tasks older than 15 minutes are marked failed so they do not permanently lock generation buttons.
- User-triggered AI generation should not block the UI while waiting for the model. Chapter beats, chapter drafts, summaries, pending update extraction, continuity checks, and publish package generation should start logged background tasks and return to a page that auto-refreshes. If a task needs follow-up writes, use a background completion callback after the task output is saved.
- `/ai-settings` redirects back with a saved-state message after AI or Station Cat settings are stored.
- The top toolbar and `/ai-settings` should show the current app version and release notes so the user can confirm which packaged version is installed.
- The Electron shell handles `Escape` at the window level to leave fullscreen or maximized state.
- Station Cat website publishing config is also global at `/ai-settings`; the same local `.env` stores `STATION_CAT_API_BASE_URL`, `STATION_CAT_PUBLISH_TOKEN`, and `STATION_CAT_DEFAULT_MODE`. The token remains server-only and masked in UI.
- Publishing targets remain available from `/projects/[projectId]/publish`, but Station Cat can now use the global config without manual per-project setup. The first global publish from a project creates/updates an internal `Station Cat 全局配置` target so `PublishRun` / `PublishSyncState` can still track preview URLs, remote IDs, and changed content hashes per project.
- Station Cat targets call `POST https://wwwstationcat.org/api/novelforge/import` when API Base URL and Station Cat Publish Token are configured; keep request tokens in the `Authorization` header only, never inside request JSON.
- Successful Station Cat responses save preview/publish URLs and remote ids into `PublishRun` / `PublishSyncState`; failed responses record a failed run and do not advance content hashes, so retries still include the changed items.
- Project cover images can be uploaded from the project publish page. They are stored under the local app data assets directory in desktop builds or `.novelforge-assets/` during local development, and are included in the standard publish package / Station Cat request as the cover changed item with `dataBase64` and `dataUrl`.
- Project setting AI generation is available from `/projects/[projectId]/settings`. It starts a logged `project_setting_generation` background task, displays the draft on the settings page, and only writes formal setting memory after the author clicks "采用到总设定档"; adoption creates a `SettingVersion` with source type `ai_project_setting`.
- MVP acceptance treats pending updates with status `approved` as satisfying "批准后能写入正式记忆"; older `applied` fixture data remains compatible.
- The website-side contract is documented in `docs/station-cat-publish-api-contract.md`; the matching website environment variable is `NOVELFORGE_PUBLISH_TOKEN`.
- Still add a manual public-release checklist if this build will be uploaded outside local sharing.
- Keep WeChat publishing manual; distribution hardening must not introduce automatic WeChat publishing.

The next useful product phase is:

- Add AI-assisted cover image prompt-to-image generation on top of the existing local cover upload flow.
- Let website responses persist remote cover IDs and expose clearer per-item upload status for cover/chapter/project imports.
- Keep external publishing behind explicit preview and author confirmation; default to draft import.

The next useful cleanup pass is:

- Split oversized page/action files where review notes repeatedly flagged maintainability.
- Add friendly Server Action/form error handling where it improves the local author workflow.
- Continue applying the nocturne UI system to deeper project pages with dedicated components rather than broad one-off class overrides.
- Keep MVP boundaries intact: no SaaS, team collaboration, mobile app, cloud sync, payment, or automatic WeChat publishing unless the user explicitly expands scope.

## Acceptance Baseline

The MVP is not complete until it can:

- Create a novel project.
- Save and reload project setting.
- Generate project setting with AI.
- Create at least 5 characters.
- Create chapter 1.
- Generate chapter beats from setting and characters.
- Generate draft text from beats.
- Save draft text.
- Extract structured chapter summary.
- Extract pending setting updates.
- Approve updates into formal data.
- Reject updates without changing formal data.
- Produce continuity issues.
- Record every AI call.
- Preserve data after restart.
- Produce a WeChat publish package from author-confirmed chapter final text.
- Export project data as Markdown or JSON.
- Show the project-level MVP acceptance dashboard.
- Pass `npm run mvp:acceptance`, which creates a temporary full-flow project, reconnects SQLite, verifies core records, and cleans up.
