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

## Next Phase

The local MVP feature set, acceptance hardening pass, and macOS packaging prototype are implemented. Distribution hardening is now underway:

- Production app icon assets exist under `build/`.
- macOS packaging now uses Developer ID signing, hardened runtime, and signed DMG/ZIP artifacts.
- The final DMG `release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` was notarized and stapled; notary submission `ac82cd1b-e370-4b92-b0c0-7c66785d90db` returned `Accepted`.
- Packaged runtime uses `app.asar.unpacked`; keep generated Prisma client copying in `scripts/after-pack.cjs` because electron-builder does not reliably include the `node_modules/.prisma` dot directory from glob rules alone.
- `npm run desktop:dist:mac` produces signed local artifacts and skips notarization.
- `npm run desktop:dist:mac:notarized` is intended for Apple notarized builds and uses `APPLE_KEYCHAIN_PROFILE`, defaulting to `simplecut-pro-notary`.
- Still add a manual public-release checklist if this build will be uploaded outside local sharing.
- Keep WeChat publishing manual; distribution hardening must not introduce automatic WeChat publishing.

If distribution hardening is delayed, the next useful cleanup pass is:

- Split oversized page/action files where review notes repeatedly flagged maintainability.
- Add friendly Server Action/form error handling where it improves the local author workflow.
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
