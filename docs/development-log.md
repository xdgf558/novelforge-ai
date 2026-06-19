# Development Log

## 2026-06-19: 0.1.7 Pending Update Review Feedback Hotfix

Status: completed.

What was done:

- Added a client-side pending state for pending-update approval and rejection forms.
- Added a clear success banner after approving an update into formal story memory.
- Added a clear result banner after rejecting an update.
- Added per-card processed feedback showing handling time and whether the update wrote to formal memory.
- Bumped the app version to `0.1.7` for the replacement macOS installer.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 24 files and 105 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.7"`.
- Packaged runtime still uses `runDesktopMigrations` and does not contain Prisma CLI `migrate deploy` startup code.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.7-mac-arm64.pkg`.
- SHA-256: `c1904da27c16055416a69c372047c9df1c84eef77ce07e7a0b8ac16450dbb95a`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

## 2026-06-19: 0.1.6 MVP Acceptance Completion Hotfix

Status: completed.

What was done:

- Added a project setting AI generation context builder and parser for `project_setting_generation` tasks.
- Added an AI total-setting draft panel to the project settings page.
- Added a non-blocking `generateProjectSettingDraft` Server Action using the existing logged background AI task flow.
- Added explicit author adoption for AI-generated setting drafts; adoption writes formal `ProjectSetting`, creates a `SettingVersion`, and marks the AI task adopted.
- Added stale-task cleanup and page auto-refresh for project setting generation tasks.
- Fixed MVP acceptance so "批准后能写入正式记忆" recognizes the real `approved` status while remaining compatible with legacy `applied` fixture data.
- Bumped the app version to `0.1.6` for the replacement macOS installer.

Verification:

- `npm run typecheck` passed.
- `npm run test -- lib/ai/project-settings.test.ts lib/mvp-acceptance.test.ts` passed.
- `npm run test` passed, 24 files and 105 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app in a keychain-enabled environment.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.6"`.
- Packaged runtime still uses `runDesktopMigrations` and does not contain Prisma CLI `migrate deploy` startup code.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.6-mac-arm64.pkg`.
- SHA-256: `35d298cddceeb09315bd676a3f7af36b4d5a0c848da2d7b6dcdc929eee0c5458`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

## 2026-06-19: 0.1.5 Project Cover Upload and Station Cat Cover Payload

Status: completed.

What was done:

- Added project-level cover image metadata to the Prisma schema and migration.
- Added local cover asset storage for PNG, JPEG, WebP, and GIF files, with an 8MB file limit and path traversal protection.
- Set the Next.js Server Action body limit to 10MB so 8MB cover uploads have room for multipart form overhead.
- Added the project publish-page cover UI for previewing, uploading, replacing, and deleting a local cover image.
- Updated the standard publish package so `cover` includes filename, MIME type, size, alt text, updated timestamp, base64 image data, and a data URL when a local cover exists.
- Kept Station Cat publishing token handling unchanged: tokens stay in the `Authorization` header only, while cover data travels inside the normal package and cover changed item.
- Bumped the app version to `0.1.5` for the replacement macOS installer.

Verification:

- `npx prisma generate` passed.
- `npx prisma migrate deploy` applied `20260619090000_project_cover_assets`.
- `npm run typecheck` passed.
- `npm run test -- lib/publish-platforms.test.ts lib/station-cat-publisher.test.ts` passed.
- `npm run test` passed, 23 files and 101 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app in a keychain-enabled environment.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.5"`.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.5-mac-arm64.pkg`.
- SHA-256: `8a806421a6677dec46aafc93aa139856e19ad139a061fb323108f727d10fb8d3`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

## 2026-06-18: 0.1.4 Async AI Generation UX Hotfix

Status: completed.

What was done:

- Changed user-triggered AI generation to start a logged background task and return to the UI immediately instead of waiting for the model response inside the Server Action.
- Applied the non-blocking flow to chapter beats, chapter draft, chapter summary, pending update extraction, continuity checks, and publish package generation.
- Added completion callbacks for background AI tasks so pending updates, continuity reports, and publish packages are parsed and written to their destination tables after the model finishes.
- Kept active-task duplicate protection and chapter/publish page auto-refresh so running tasks update the UI without manual reload.
- Added an in-app version display in the top toolbar and a settings-page `版本与更新` section.
- Bumped the app version to `0.1.4` for the replacement macOS installer.

Verification:

- `npm run test -- lib/ai/task-logger.test.ts` passed.
- `npm run typecheck` passed.
- `npm run test` passed, 23 files and 100 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app in a keychain-enabled environment.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.4"`.
- Packaged app contains `startLoggedOpenAITextTask`, background completion callbacks, the `版本与更新` settings block, and package version `0.1.4`.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.4-mac-arm64.pkg`.
- SHA-256: `ae680e100f5085d6c2db8d98dc2e9164dbb4e4d7d563c7f378eab1ebe9ad4cce`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

## 2026-06-18: 0.1.3 Desktop UX Hotfix

Status: completed.

What was done:

- Added automatic chapter-page refresh while AI tasks are pending or running, so completed model calls appear without manual reload.
- Added stale AI task cleanup on chapter detail load: pending/running chapter AI tasks older than 15 minutes are marked failed with a clear retry message.
- Added settings-page success notices after saving AI connection settings or Station Cat publishing settings.
- Added Electron window-level Escape handling so fullscreen or maximized desktop windows return to windowed mode.
- Bumped the app version to `0.1.3` for the replacement macOS installer.

Verification:

- `npm run typecheck` passed.
- `npm run test -- lib/ai/task-timeouts.test.ts` passed.
- `npm run desktop:smoke` passed.
- `npm run test` passed, 22 files and 97 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app and expanded PKG payload app.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.3"`.
- Packaged app contains the Escape fullscreen/maximize handler, auto-refresh component, stale task timeout helper, and settings saved messages.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.3-mac-arm64.pkg`.
- SHA-256: `406ad2a02840478d95e56366fa26d3bab847b6cf206329c253ff76dc90c13af5`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

## 2026-06-18: 0.1.2 AI Provider Crash Hotfix

Status: completed.

Problem:

- The installed desktop app showed a Next.js production application error after generating chapter beats with a custom DeepSeek-compatible AI configuration.
- The failed AI task recorded `Unexpected end of JSON input`, which pointed to an empty or non-JSON provider response being parsed through the old Responses API path.

What was done:

- Updated the server-only AI client so the official OpenAI base URL continues to use `/responses`, while custom OpenAI-compatible base URLs use `/chat/completions`.
- Added Chat Completions response parsing for `choices[].message.content` and token usage fields such as `prompt_tokens` / `completion_tokens`.
- Changed AI task logging so selected user-triggered generation actions can record failed tasks without rethrowing into a full-page production error.
- Applied the non-crashing AI failure behavior to chapter beats, chapter draft, chapter summary, pending updates, continuity reports, and publish package generation.
- Added regression tests for custom OpenAI-compatible provider requests and Chat Completions output/usage parsing.
- Bumped the app version to `0.1.2` for the replacement macOS installer.

Verification:

- `npm run test -- lib/ai/openai-client.test.ts` passed.
- `npm run typecheck` passed.
- `npm run test` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app and the expanded PKG payload app.
- `pkgutil --expand-full` confirmed the PKG payload has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.2"`.
- Packaged runtime still uses `runDesktopMigrations` and does not contain the old Prisma CLI `migrate deploy` startup path.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.2-mac-arm64.pkg`.
- SHA-256: `191aaebe5287c838598cbd969920ef9095dc5237afc3ef4156dbbac30bf297b7`.

Packaging note:

- As with the previous formal PKG build, the app payload is Developer ID Application signed, but the PKG itself reports `Status: no signature` because the local keychain still does not contain a Developer ID Installer certificate.

## 2026-06-16: Phase 0 Memory Baseline

Status: completed.

What was done:

- Read the product development document at `/Users/shaola/Downloads/开发文档/长篇少说开发.md`.
- Summarized the implementation method before coding.
- Created a project-level memory entrypoint in `AGENTS.md`.
- Created `docs/project-memory.md` for MVP scope, product principles, development order, and acceptance baseline.
- Created `docs/product-memory-design.md` for the product's long-form story memory architecture.

Current workspace status:

- No application code has been created yet.
- No framework has been installed yet.
- No database schema has been created yet.

Next recommended step:

- Start Phase 1: scaffold the local Next.js MVP with TypeScript, Tailwind CSS, Prisma, SQLite, base layout, and project CRUD.

Rules for future phases:

- Read `AGENTS.md` and the docs in this folder before starting.
- Keep each phase scoped.
- Update this log after completing a phase.
- Preserve the MVP exclusions until the user explicitly expands scope.

## 2026-06-16: Repository Setup

Status: completed.

Goal:

- Create a local Git repository.
- Create a matching private GitHub repository.
- Push the current memory baseline before Phase 1 implementation begins.

Repository name:

- `novelforge-ai`

GitHub repository:

- `https://github.com/xdgf558/novelforge-ai`

What was done:

- Initialized local Git repository on `main`.
- Added `.gitignore` and `README.md`.
- Created the private GitHub repository.
- Added `origin`.
- Pushed the initial repository state to GitHub.

## 2026-06-17: Phase 1 Project Skeleton and Project CRUD

Status: completed.

Scope:

- Next.js local MVP skeleton.
- TypeScript configuration.
- Tailwind CSS configuration and base styling.
- Prisma and SQLite setup.
- Base application layout.
- Project CRUD only.

What was done:

- Added App Router pages for project list, project creation, project detail, and project editing.
- Added server actions for project create, update, and delete.
- Added Prisma `Project` model and initial migration.
- Added local `.env.example` with `DATABASE_URL`.
- Added reusable project form and app shell components.
- Added README local development commands.
- Added PostCSS override to avoid the moderate npm audit issue reported through Next's nested PostCSS dependency.

Verification:

- `npm install` completed and reported 0 vulnerabilities after the PostCSS override.
- `npx prisma migrate dev` reports the database is in sync.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verification passed for homepage, create project, project detail, edit project, delete project, and empty state.
- Browser console had no error or warning entries during the CRUD check.
- Local SQLite project count returned to 0 after deleting the browser test project.

Notes:

- The first `prisma migrate dev --name init` failed because Prisma could not create the first SQLite file on this volume path. Creating an empty `prisma/dev.db`, running `prisma db push`, generating the initial migration SQL with `prisma migrate diff`, and marking that migration as applied resolved the issue.
- `npm audit --omit=dev` briefly returned a registry 503 during the final recheck, but the preceding `npm install` audit completed with 0 vulnerabilities.

Next recommended step:

- Start Phase 2: project setting editor and setting version records.

## 2026-06-17: Phase 1 Review Fixes

Status: completed.

What was done:

- Hardened `formatWordRange` by using nullish checks instead of truthiness checks.
- Changed homepage active project and target word statistics to use Prisma `count` and `aggregate`.
- Added `cp .env.example .env` to README local setup steps.

Deferred review items:

- Test framework setup is deferred to Phase 2, where setting-version behavior will benefit more from regression tests.
- Friendly Server Action error handling is deferred until form state handling is introduced.
- Dependency ranges remain paired with `package-lock.json`; use `npm ci` for reproducible installs.

## 2026-06-17: Phase 2 Project Settings and Version History

Status: completed.

Scope:

- Project setting data model.
- Setting version snapshot records.
- Manual setting editor.
- Setting history and snapshot detail pages.
- Project detail entry points for settings.
- Lightweight test baseline.

What was done:

- Added `ProjectSetting` and `SettingVersion` Prisma models.
- Added a `project_settings` migration with one-to-one project settings and version history.
- Added shared project setting field descriptors for forms and snapshot rendering.
- Added save action that upserts the current setting and creates a version snapshot on every save.
- Added pages for editing project settings, listing setting history, and viewing a version snapshot.
- Added project detail links to the setting editor and history.
- Added Vitest and pure logic tests for number/range formatting and project setting snapshot fields.
- Updated README with `npm run test`.

Verification:

- `npx prisma migrate dev --name project_settings` completed and generated Prisma Client.
- `npx prisma migrate status` passed.
- `npm run test` passed, 2 files and 8 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verification passed for creating a project, saving two setting versions, viewing history, viewing v2 snapshot, seeing the project detail version count, and deleting the test project.
- Browser console had no error or warning entries.
- Local SQLite counts returned to zero for projects, project settings, and setting versions after test cleanup.

Notes:

- Browser role and CSS click locators were slow on the long settings form in this environment, so DOM node clicks were used for submit buttons during verification.
- `npm install --save-dev vitest` completed with 0 vulnerabilities.
- A later standalone `npm audit --omit=dev` returned a registry 503, matching the intermittent npm audit endpoint issue seen in Phase 1.

Next recommended step:

- Start Phase 3: character library, character CRUD, and character version records.

## 2026-06-17: Phase 2 Review Fixes

Status: completed.

What was done:

- Replaced the manual project setting form value mapping with a data-driven helper based on `projectSettingFields`.
- Added a regression test for building form values from a setting record.
- Changed the homepage total target word count to show `未设置` when the aggregate target is empty or zero.

Deferred review items:

- Setting version numbering remains scoped to the local single-user MVP. If the product expands to multi-user deployment, add a stronger concurrency strategy with unique constraints and retry handling.
- Friendly Server Action error handling remains deferred until form state and user-facing error messages are introduced.

## 2026-06-17: Phase 3 Character Library and Character Versions

Status: completed.

Scope:

- Character data model.
- Character version snapshot records.
- Manual character library and CRUD.
- Character history and snapshot detail pages.
- Project detail entry point for characters.
- Lightweight test coverage for character field helpers.

What was done:

- Added `Character` and `CharacterVersion` Prisma models.
- Added a `characters` migration with project-scoped character records and version history.
- Added shared character field descriptors for forms and snapshot rendering.
- Added character create, update, and delete server actions.
- Added pages for project character list, character creation, character detail, character editing, character history, and character version snapshots.
- Added project detail links and counts for character library and character snapshots.
- Updated current UI copy so the app no longer says characters are only a future module.
- Added Vitest coverage for character field alignment, defaults, record-to-form values, and snapshot trimming.

Verification:

- `npx prisma migrate dev --name characters` completed and generated Prisma Client.
- `npm run test` passed, 3 files and 13 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verification passed for creating a project, opening empty character library, creating a character, saving a second character version, viewing history, viewing the v2 snapshot, deleting the character, deleting the test project, and returning to the empty project state.
- Browser console had no error or warning entries during the character CRUD check.
- Local SQLite counts returned to zero for projects, characters, and character versions after test cleanup.

Notes:

- Character delete currently deletes that character's version history through the character relation, which keeps the local MVP from accumulating orphaned character snapshots with no detail route.
- AI character generation remains intentionally out of scope until the AI service wrapper, prompt templates, and AI task records are introduced.

Next recommended step:

- Start Phase 4: chapter list, chapter editor, and chapter version records.

## 2026-06-17: Phase 3 Review Fixes

Status: completed.

What was done:

- Changed character snapshot status rendering so unknown or invalid status values display `未知` instead of silently falling back to `活跃`.
- Added a regression test for known and unknown character status labels.

Deferred review items:

- Character version numbering remains scoped to the local single-user MVP and should be revisited with a stronger concurrency strategy if the product expands beyond local single-user usage.
- Friendly Server Action error handling remains deferred until form state and user-facing error messages are introduced.

## 2026-06-17: Phase 4 Chapter Editor and Chapter Versions

Status: completed.

Scope:

- Chapter data model.
- Chapter version snapshot records.
- Manual chapter list and CRUD.
- Chapter history and snapshot detail pages.
- Project detail entry point for chapters.
- Lightweight test coverage for chapter field helpers.

What was done:

- Added `Chapter` and `ChapterVersion` Prisma models.
- Added a `chapters` migration with project-scoped chapter records and version history.
- Added shared chapter field descriptors for forms, status labels, word counting, and snapshot rendering.
- Added chapter create, update, and delete server actions.
- Added pages for project chapter list, chapter creation, chapter detail, chapter editing, chapter history, and chapter version snapshots.
- Added project detail links and counts for chapter editor and chapter snapshots.
- Updated current UI copy so the app no longer says chapters are only a future module.
- Added Vitest coverage for chapter field alignment, defaults, record-to-form values, status labels, word counting, and snapshot trimming.

Verification:

- `npx prisma migrate dev --name chapters` completed and generated Prisma Client.
- `npx prisma migrate status` passed.
- `npm run test` passed, 4 files and 20 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Browser verification passed for creating a project, seeing the chapter editor entry, creating a chapter, saving a second chapter version, viewing history, viewing the v2 snapshot, deleting the chapter, and deleting the test project.
- Browser console had no error entries during the chapter CRUD check.
- Local SQLite counts returned to zero for the browser test project, chapter, and chapter versions after cleanup.

Notes:

- Chapter word count is computed from final text when present, otherwise from draft text, with whitespace removed.
- Chapter delete currently deletes that chapter's version history through the chapter relation, which keeps the local MVP from accumulating orphaned chapter snapshots with no detail route.
- AI chapter beat generation and draft generation remain intentionally out of scope until the AI service wrapper, prompt templates, and AI task records are introduced.

Next recommended step:

- Start Phase 5: server-only AI service wrapper, prompt templates, and AI task records.

## 2026-06-17: Phase 4 Review Fixes

Status: completed.

What was done:

- Replaced the manual chapter record-to-form value mapping with a data-driven helper based on `chapterFieldNames`.
- Added regression coverage for null/default chapter record fields.
- Added `formatChapterWordCount` so empty or zero chapter word counts display as `未统计` instead of `0`.

Deferred review items:

- `countChapterWords` behavior remains unchanged because whitespace-only final text correctly falls back to draft text or counts as zero when no draft exists.
- Chapter version numbering remains scoped to the local single-user MVP and should be revisited with a stronger concurrency strategy if the product expands beyond local single-user usage.
- Friendly Server Action error handling remains deferred until form state and user-facing error messages are introduced.

## 2026-06-17: Phase 5 AI Task Infrastructure

Status: completed.

Scope:

- AI prompt template storage.
- AI task audit records.
- Server-only OpenAI Responses wrapper.
- Task logging helper for future model-backed features.
- Project AI task page and project detail entry point.

What was done:

- Added `AiPromptTemplate` and `AiTask` Prisma models.
- Added the `ai_task_infra` migration with project-scoped prompt templates and AI task records.
- Added default prompt templates for project setting generation, chapter beat generation, chapter draft generation, chapter summary extraction, pending update extraction, and continuity checking.
- Added a server-only OpenAI Responses wrapper that builds text input payloads, reads `OPENAI_MODEL`, requires `OPENAI_API_KEY` only at call time, extracts output text, and records token usage when present.
- Added AI task logger helpers for pending, running, completed, failed, and logged OpenAI text tasks.
- Added a project AI page for syncing default templates and recording a local readiness check without calling an external model.
- Added project detail counts and entry point for AI templates and tasks.
- Updated README and UI copy to reflect server-only AI task infrastructure.
- Added Vitest coverage for prompt template uniqueness, task status labels, OpenAI payload construction, output extraction, token usage extraction, and environment config helpers.

Verification:

- `npx prisma migrate dev --name ai_task_infra` completed and generated Prisma Client.
- `npx prisma migrate status` passed.
- `npm run test` passed, 7 files and 33 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Browser verification passed for creating a project, opening the AI page, syncing 6 default templates, recording a local readiness task, seeing project AI counts update, and deleting the test project.
- Browser console had no error entries during the AI task flow.
- Local SQLite counts returned to zero for the browser test project, AI prompt templates, and AI tasks after cleanup.

Notes:

- Phase 5 does not generate chapter beats or drafts yet. It only creates the safe and traceable AI foundation.
- The readiness check intentionally does not call OpenAI; it verifies local task logging and server-side key visibility without spending tokens.
- `OPENAI_API_KEY` remains server-only and is never rendered to the frontend.

Next recommended step:

- Start Phase 6: chapter beat generation using the `chapter_beat_generation` prompt template and `ai_tasks` logging.

## 2026-06-17: Phase 5 Review Fixes

Status: completed.

What was done:

- Changed the local AI readiness check to create a completed `ai_tasks` record in one write instead of creating a pending task and updating it afterward.
- Reused the shared AI task payload stringifier so readiness input/output JSON formatting stays aligned with the task logger helpers.

Deferred review items:

- Reading `OPENAI_MODEL` and `OPENAI_API_KEY` presence from the AI page Server Component remains safe for the current Node server runtime.
- Friendly Server Action error handling remains deferred until form state and user-facing error messages are introduced.

## 2026-06-17: Phase 6 Chapter Beat Generation

Status: completed.

Scope:

- Chapter beat context assembly.
- AI-backed chapter beat generation.
- AI task records for generated beat drafts.
- Explicit author adoption of beat drafts into chapter records.
- Chapter detail UI entry point for beat generation and recent beat tasks.

What was done:

- Added a pure chapter beat context builder that assembles task-relevant project, setting, character, recent chapter, previous ending, current chapter goal, and forbidden-item context.
- Added clipping for previous chapter text so routine beat generation uses the previous ending rather than full manuscript text.
- Added a `generateChapterBeats` server action that ensures the project has the `chapter_beat_generation` prompt template, calls the server-only AI wrapper, and records the model call in `ai_tasks`.
- Added an `adoptChapterBeats` server action that writes a completed AI task output into `Chapter.beats` only after an explicit author action, creates a chapter version snapshot, and marks the AI task as adopted.
- Added an AI chapter beat panel to the chapter detail page with generation, latest task display, task status, adoption status, and an adopt button.
- Added Vitest coverage for beat context assembly, previous-ending clipping, and AI task context summaries.

Verification:

- `npm run test` passed, 8 files and 36 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npx prisma migrate status` passed.
- `git diff --check` passed.
- Browser verification passed for opening a chapter with a completed beat task, seeing the AI beat panel, confirming the generate button is disabled when no API key is configured, adopting the beat task output into chapter beats, seeing the task marked adopted, and confirming a chapter version snapshot was created.
- Local SQLite counts returned to zero for the browser test project, chapters, AI tasks, and chapter versions after cleanup.

Notes:

- Phase 6 does not generate chapter drafts yet. It only produces and adopts chapter beat drafts.
- Generated beat output is not written into formal chapter data until the author clicks adopt.
- Missing API keys disable the UI generate button; real model-backed calls remain server-only.

Next recommended step:

- Start Phase 7: chapter draft generation using confirmed chapter beats and the `chapter_draft_generation` prompt template.

## 2026-06-17: Phase 6 Review Fixes

Status: completed.

What was done:

- Added shared active AI task status detection for `pending` and `running` tasks.
- Prevented duplicate chapter beat generation calls when a chapter already has a pending or running `chapter_beat_generation` task.
- Disabled the chapter beat generate button while a generation task is active and added an in-page explanation.

Verification:

- `npm run test` passed, 8 files and 37 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Local page verification confirmed a chapter with a running beat task renders the generate button as disabled with the `生成中` label and duplicate-generation explanation.
- Local SQLite counts returned to zero for the review-fix test project, chapter, and AI task after cleanup.

Deferred review items:

- Long-running Server Action feedback remains deferred until streaming, optimistic UI, or shared form state handling is introduced.
- Project-scoped prompt template upsert remains outside the generation transaction because templates are reusable and safe to keep once created.

## 2026-06-17: Phase 7 Chapter Draft Generation

Status: completed.

Scope:

- Chapter draft context assembly from confirmed chapter beats.
- AI-backed chapter draft generation.
- AI task records for generated draft text.
- Explicit author adoption of draft task output into `Chapter.draftText`.
- Chapter detail UI entry point for draft generation and recent draft tasks.

What was done:

- Added a pure chapter draft context builder that assembles confirmed beats, style sample, character speaking rules, previous chapter ending, target word range, story constraints, and forbidden items.
- Added checks so draft generation requires confirmed chapter beats and avoids duplicate pending or running draft generation tasks.
- Added a `generateChapterDraft` server action that ensures the project has the `chapter_draft_generation` prompt template, calls the server-only AI wrapper, and records the model call in `ai_tasks`.
- Added an `adoptChapterDraft` server action that writes a completed AI task output into `Chapter.draftText` only after an explicit author action, creates a chapter version snapshot, and marks the AI task as adopted.
- Added an AI chapter draft panel to the chapter detail page with generation, latest task display, task status, adoption status, and an adopt button.
- Added Vitest coverage for draft context assembly, previous-ending clipping, confirmed-beat detection, and AI task context summaries.

Verification:

- `npm run test` passed, 9 files and 40 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npx prisma migrate status` confirmed the SQLite schema is up to date.
- `git diff --check` passed.
- Browser verification passed with a temporary project: the chapter detail page showed the AI chapter draft panel and completed draft task, the author adoption action wrote the output to `Chapter.draftText`, created an `ai_chapter_draft` chapter version snapshot, marked the task as adopted, and the temporary project was deleted after verification.

Notes:

- Phase 7 does not generate chapter summaries, pending memory updates, or continuity reports.
- Generated draft output is not written into chapter data until the author clicks adopt.
- Missing API keys or missing confirmed beats disable the UI generate button; real model-backed calls remain server-only.

Next recommended step:

- Start Phase 8: chapter summary generation using author-confirmed chapter text and the `chapter_summary_extraction` prompt template.

## 2026-06-17: Phase 7 Review Fixes

Status: completed.

What was done:

- Changed `ChapterDraftSettingContext` from a hand-written setting field shape to a `ProjectSettingFieldName`-derived record.
- Centralized the draft-relevant setting fields into typed field lists for style, world constraints, and forbidden items.
- Preserved the existing chapter draft prompt behavior while removing the need to manually keep the context type in sync with project setting fields.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 9 files and 40 tests.
- `npm run build` passed.
- `git diff --check` passed.

Deferred review items:

- Draft adoption word count behavior remains unchanged because the current `chapterSnapshot` rule intentionally prefers final text when present.
- Version number race risk and friendly Server Action error handling remain deferred with the earlier Phase 1-6 follow-up items.

## 2026-06-17: Phase 8 Chapter Summary Generation

Status: completed.

Scope:

- Chapter summary context assembly from author-confirmed final chapter text.
- AI-backed structured chapter summary extraction.
- AI task records for generated summary JSON text.
- Chapter detail UI entry point for summary generation and recent summary tasks.

What was done:

- Added a pure chapter summary context builder that assembles final chapter text, project basics, project setting summary, active character list, chapter goal, beats, and notes.
- Added guards so summary generation requires `Chapter.finalText` and never treats draft text as confirmed chapter canon.
- Added `generateChapterSummary` server action that prevents duplicate pending or running summary tasks, ensures the project has the `chapter_summary_extraction` prompt template, passes the JSON schema to the model prompt, and records the task in `ai_tasks`.
- Added an AI chapter summary panel to the chapter detail page with generation status, disabled-state explanations, recent summary tasks, and structured output display.
- Updated the default chapter summary schema to include new settings and timeline events alongside short summary, main events, character changes, foreshadows, and continuity risks.
- Added Vitest coverage for summary context assembly, final-text-only confirmation, and AI task context summaries.

Verification:

- `npm run test` passed, 10 files and 43 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npx prisma migrate status` passed; local database is up to date.
- `git diff --check` passed.
- Browser verification passed with a temporary project and finalized chapter: the chapter detail page displayed the AI chapter summary panel, showed a completed `chapter_summary_extraction` task with structured JSON output, kept draft text out of the summary panel output, and disabled generation when no API key was configured. Temporary verification data was deleted afterward.

Notes:

- Phase 8 does not create formal `chapter_summaries`, `foreshadows`, `timeline_events`, or `pending_updates` records yet.
- Generated chapter summaries are saved as AI task outputs first; they do not automatically update formal story memory.
- Missing API keys, missing final text, or active summary tasks disable the UI generate button.

Next recommended step:

- Start Phase 9: pending update extraction and author review flow using final chapter text, latest completed summary task output, and current formal memory.

## 2026-06-17: Phase 9 Pending Update Extraction and Review Flow

Status: completed.

Scope:

- Pending update data model and review workflow.
- AI-backed pending update extraction from author-confirmed final chapter text.
- Author approval, rejection, and edit-before-approval controls.
- Approved writes into formal memory tables where supported by the current MVP schema.

What was done:

- Added `PendingUpdate`, `WorldRule`, `Foreshadow`, and `TimelineEvent` Prisma models plus project/chapter/AI task relations.
- Added a pure pending update context builder that assembles final chapter text, current project setting, active character memory, and the latest completed chapter summary task output.
- Added parser support for the `updates` array schema and the grouped schema style from the original product document.
- Added `generatePendingUpdates` server action using the server-only AI wrapper and task logger, with duplicate active-task protection.
- Added a project-level pending update review page with source chapter, risk level, target type, evidence, approval, rejection, and edit-before-approval controls.
- Added approval application logic:
  - Project setting updates append to the relevant setting field and create a setting version snapshot.
  - Character updates create or update character records and create character version snapshots.
  - World rules, foreshadows, and timeline events write to formal structured memory rows with source chapter and pending-update linkage.
  - Rejected updates do not change formal memory.
- Added chapter-detail entry point for extracting pending updates and project-dashboard entry points/counts for pending updates and structured memory.
- Expanded the default `pending_update_extraction` JSON schema with update type, target type, target name, field name, title, reason, risk level, and source evidence.
- Added Vitest coverage for pending update context assembly, direct JSON parsing, grouped schema conversion, risk normalization, field inference, and formal-memory append behavior.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 12 files and 51 tests.
- `npm run build` passed.
- `npx prisma migrate status` passed; local database is up to date with 6 migrations.
- `git diff --check` passed.
- Browser verification passed with a temporary project and finalized chapter: the chapter detail page showed the pending update extraction panel, the pending update review page showed high-risk labels, source evidence, approve/reject controls, approval wrote the proposed rule into `ProjectSetting.worldviewRules` and created a `SettingVersion`, rejection left formal `WorldRule` memory unchanged, and temporary verification data was deleted afterward.

Notes:

- Phase 9 keeps the non-negotiable author-control rule: AI output first becomes `pending_updates`; only explicit approval writes formal memory.
- High-risk updates are labeled visibly, but every approval is explicit, including low- and medium-risk items.
- World rule, foreshadow, and timeline memory are intentionally minimal formal tables for MVP continuity work; richer management pages can follow after continuity reports.

Next recommended step:

- Start Phase 10: basic continuity check reports using project setting, character memory, world rules, foreshadows, timeline events, latest chapter text, and recent summaries.

## 2026-06-17: Phase 9 Review Fixes

Status: completed.

What was done:

- Fixed new-character approval from pending updates so non-identity character fields no longer overwrite `identity`.
- Moved pending-update new-character value construction into a pure helper.
- Added regression tests for non-identity and explicit identity character pending updates.

Verification:

- `npm run typecheck` passed.
- `npm run test -- lib/pending-updates.test.ts` passed, 1 file and 6 tests.
- `npm run test` passed, 12 files and 53 tests.
- `npm run build` passed.
- `git diff --check` passed.

Deferred review items:

- Pending update review UI extraction remains deferred to a future component cleanup pass.
- Pending update action splitting by target type remains deferred until the flow stabilizes further.

## 2026-06-17: Phase 10 Continuity Check Reports

Status: completed.

Scope:

- Continuity report data model.
- AI-backed continuity checking from author-confirmed final chapter text.
- Formal issue records with severity, category, evidence, conflicting memory, suggested fix, and status.
- Project-level report review page.
- Chapter detail entry point for running continuity checks.

What was done:

- Added the `ContinuityReport` Prisma model and `continuity_reports` migration.
- Added a pure continuity context builder that reads final chapter text, project setting, active characters, world rules, foreshadows, timeline events, recent summary tasks, and pending updates.
- Added parser support for the product document's `chapter_number` / `overall_risk_level` / `issues` JSON shape and camelCase variants.
- Expanded the default `continuity_check` prompt template schema to match the product document.
- Added `generateContinuityReport` server action using the server-only AI wrapper and task logger, with duplicate active-task protection.
- Added report status actions for marking issues resolved and reopening them.
- Added a project-level continuity report page with risk/category/status labels, source chapter links, evidence, conflicting memory, suggested fix, and resolution notes.
- Added a chapter-detail continuity panel with disabled-state explanations and recent continuity task output.
- Added project dashboard entry point and count for continuity reports.
- Added Vitest coverage for continuity labels, severity/category normalization, context assembly, context summaries, and output parsing.

Verification:

- `npm run typecheck` passed.
- `npm run test -- lib/continuity-reports.test.ts lib/ai/continuity-reports.test.ts lib/ai/prompt-templates.test.ts` passed, 3 files and 10 tests.
- `npm run test` passed, 14 files and 60 tests.
- `npm run build` passed.
- `npx prisma migrate status` passed; local database is up to date with 7 migrations.
- `git diff --check` passed.
- Browser verification passed with a temporary project and continuity report: the project dashboard showed the continuity entry and count, the chapter detail page showed the continuity panel and task output, the report page showed severity/category/status/evidence/conflicting memory/suggested fix, marking a report resolved worked with a resolution note, reopening cleared the note and restored the open state, browser console had no warnings or errors, and temporary data was deleted afterward.

Notes:

- Continuity reports do not update formal story memory. Fixes still route through author edits or pending updates.
- If the model returns no parseable issues, the AI task remains available in the audit log and no report rows are created.

Next recommended step:

- Start Phase 11: WeChat publish package plus Markdown/JSON export without automatic WeChat publishing.

## 2026-06-17: Phase 11 WeChat Publish Packages and Project Export

Status: completed.

Scope:

- WeChat publish package data model.
- AI-backed publish packaging from author-confirmed final chapter text.
- Copy/download Markdown publish materials.
- Markdown/JSON project export.
- Project and chapter entry points for publishing/export.

What was done:

- Added the `PublishPackage` Prisma model and `publish_packages` migration with project, chapter, and AI task relations.
- Added the default `wechat_publish_packaging` prompt template with a JSON response schema for title candidates, opening guide, reader-facing summary, ending question, next-chapter preview, comment guide, cover prompt, Markdown body, and checklist.
- Added a pure publish package context builder that uses only `Chapter.finalText`, publish-relevant project setting fields, the latest chapter summary task output, and recent publish titles.
- Added a publish package parser that accepts snake_case or camelCase JSON and builds fallback Markdown when the model omits `markdown_body`.
- Added project-level `/publish` page with:
  - chapter list for generating packages,
  - publish package records,
  - copy/download controls for Markdown publish bodies,
  - Markdown and JSON project export panels.
- Added chapter-detail and project-dashboard entry points for publish packaging and export.
- Added project export builders covering project basics, settings, characters, chapters, structured memory, pending updates, continuity reports, publish packages, and AI task references.
- Added Vitest coverage for publish package helpers, AI context/parser behavior, project exports, and default prompt template coverage.

Verification:

- `npm run test -- lib/publish-packages.test.ts lib/project-export.test.ts lib/ai/publish-packages.test.ts lib/ai/prompt-templates.test.ts` passed, 4 files and 12 tests.
- `npm run test` passed, 17 files and 69 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npx prisma migrate status` passed; local database is up to date with 8 migrations.
- `git diff --check` passed.
- Browser-level page verification via local dev server passed with a temporary finalized chapter and publish package: project dashboard, chapter detail page, and `/projects/[projectId]/publish` all returned 200 and displayed the expected publish/export panels. Temporary verification data was deleted afterward.

Notes:

- Phase 11 preserves the MVP boundary: the app only prepares local publish materials and exports; it does not publish to WeChat automatically.
- Publish packaging uses author-confirmed `finalText` only, not draft text.
- Marking a package as exported is a local workflow state and does not call any external service.

Next recommended step:

- Run a full MVP acceptance and hardening pass across project setup, story memory, AI task records, pending updates, continuity reports, publish packages, export, and the repeated review cleanup items.

## 2026-06-17: Phase 12 MVP Acceptance and Hardening

Status: completed.

Scope:

- Project-level MVP acceptance dashboard.
- Local full-flow acceptance smoke script.
- Prompt-template helper consolidation.
- Hardening around the acceptance checklist and repeated AI template upsert logic.

What was done:

- Added `buildMvpAcceptanceReport`, a pure acceptance report builder covering the original MVP checks plus the Phase 11 publish-package requirement.
- Added `/projects/[projectId]/acceptance`, a project-level acceptance dashboard grouped by project basics, story memory, AI links, author review, release/export, and local persistence.
- Added a project dashboard entry point for MVP acceptance.
- Added `scripts/mvp-acceptance-smoke.cjs` and `npm run mvp:acceptance`; the script creates a temporary project with setting, 5 characters, chapter 1, core AI task records, applied/rejected pending updates, continuity report, publish package, reconnects SQLite, verifies persistence, and cleans up.
- Centralized default prompt-template upsert logic in `lib/ai/prompt-template-store.ts` and reused it across AI workspace, chapters, pending updates, continuity, and publish actions.
- Updated README with the new local acceptance command.

Verification:

- `npm run test -- lib/mvp-acceptance.test.ts lib/ai/prompt-templates.test.ts` passed, 2 files and 5 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 18 files and 71 tests.
- `npm run mvp:acceptance` passed.
- `npm run build` passed.
- `npx prisma migrate status` passed; local database is up to date with 8 migrations.
- `git diff --check` passed.
- Browser-level page smoke verification passed with a temporary project: project detail displayed the MVP acceptance entry point, `/projects/[projectId]/acceptance` returned 200 and displayed `Phase 12 / MVP 验收`, and temporary verification data was deleted afterward.

Notes:

- Phase 12 does not add SaaS, cloud sync, mobile apps, payment, collaboration, or automatic WeChat publishing.
- The acceptance dashboard is a local project readiness view, not an external deployment gate.
- The smoke script uses synthetic local records so it can validate persistence and data shape without calling OpenAI.

Next recommended step:

- Start Phase 13 if the goal is macOS desktop packaging for the local MVP. Keep it as a thin local shell around the existing app and preserve local SQLite plus server-only AI key handling.
- Otherwise, run a component/action cleanup pass for the larger files accumulated in the AI panels, pending update flow, and continuity flow.

## 2026-06-17: Phase 13 macOS Desktop Packaging

Status: completed.

Scope:

- macOS desktop packaging prototype.
- Thin Electron shell around the existing local Next.js MVP.
- Local desktop SQLite data path and startup migration flow.
- Desktop packaging scripts and documentation.

What was done:

- Added Electron and electron-builder packaging support.
- Added `desktop/main.cjs`, which starts a local production Next.js server on `127.0.0.1`, opens it in a secure BrowserWindow, and shuts the server down with the app.
- Added `desktop/runtime.cjs` for desktop-only SQLite URL handling, database file pre-creation, and desktop `.env` parsing.
- Added startup Prisma migration execution against the desktop SQLite database before the local server starts.
- Added optional desktop AI config loading from `~/Library/Application Support/NovelForge AI/.env`, limited to `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Added `NOVELFORGE_DESKTOP_DATA_DIR` for automated desktop smoke tests without touching the real user data folder.
- Added npm scripts:
  - `npm run desktop:dev`
  - `npm run desktop:smoke`
  - `npm run desktop:pack:mac`
  - `npm run desktop:dist:mac`
- Configured local macOS packaging output under `release/desktop/`.
- Disabled automatic macOS code signing for Phase 13 so local packaging does not hang on timestamp/signing; signing and notarization are deferred to distribution hardening.
- Moved `prisma` to runtime dependencies so the packaged app can run startup migrations.
- Added `docs/macos-desktop-packaging.md` and README desktop packaging instructions.

Verification:

- `npm run desktop:smoke` passed.
- `npm run typecheck` passed.
- `npm run test` passed, 18 files and 71 tests.
- `npm run build` passed.
- `npm run desktop:pack:mac` passed and produced `release/desktop/mac-arm64/NovelForge AI.app`.
- Packaged app startup smoke passed with a temporary data directory; it created the SQLite database and applied all 8 migrations.
- `npm run mvp:acceptance` passed.
- `npx prisma migrate status` passed; local database is up to date with 8 migrations.
- `npm audit --omit=dev` passed with 0 vulnerabilities after retrying a transient registry 503.
- `git diff --check` passed.

Notes:

- Phase 13 preserves the local-first MVP boundary. It does not add SaaS, cloud sync, payment, team collaboration, mobile apps, or automatic WeChat publishing.
- The desktop package is currently unsigned and not notarized.
- `asar` is disabled in Phase 13 to keep the Next.js server, Prisma CLI, and migrations externally available for the prototype. A later packaging-hardening pass can move to `asar` plus `asarUnpack`.
- The default Electron icon is still used; branded icon work is deferred.

Next recommended step:

- Run a distribution hardening phase if the app will be shared: app icon, signing, notarization, DMG polish, release artifact cleanup, and a manual release checklist.
- Otherwise, run the deferred component/action cleanup pass for large page/action files.

## 2026-06-18: Phase 14 macOS Distribution Hardening

Status: completed.

Scope:

- Branded macOS app icon.
- Developer ID signing and hardened runtime.
- `asar` packaging plus runtime unpacking for the local Next.js/Prisma desktop app.
- Signed DMG/ZIP release artifacts.
- Apple notarization and stapling.

What was done:

- Added generated branded icon assets under `build/` and `npm run desktop:icon`.
- Added signing entitlements in `build/entitlements.mac.plist`.
- Added `scripts/notarize.cjs` as the electron-builder `afterSign` hook.
- Added `scripts/after-pack.cjs` to prune unused Electron locale resources before signing and copy `node_modules/.prisma` into `app.asar.unpacked` so the packaged app can load Prisma at runtime.
- Switched desktop packaging to `asar: true` with explicit unpacking for `.next`, runtime app files, Prisma schema/migrations, and runtime dependencies.
- Updated the Electron runtime root so packaged builds run the local server from `Contents/Resources/app.asar.unpacked`.
- Split signed-only packaging (`npm run desktop:dist:mac`) from notarized packaging (`npm run desktop:dist:mac:notarized`).
- Signed the regenerated `.app` with `Developer ID Application: HAO YE (Y35K7AQ974)` and hardened runtime.
- Enabled `dmg.sign: true`; the current regenerated DMG was also manually signed after the builder run.
- Notarized and stapled the final DMG release artifact with Apple notarytool.
- Generated signed release artifacts:
  - `release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg`
  - `release/desktop/NovelForge-AI-0.1.0-mac-arm64.zip`

Verification completed:

- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed.
- `codesign --verify --deep --strict --verbose=2 release/desktop/mac-arm64/NovelForge\ AI.app` passed.
- `codesign -dv --verbose=4 release/desktop/mac-arm64/NovelForge\ AI.app` confirmed Developer ID, Team ID `Y35K7AQ974`, hardened runtime, and timestamp.
- `codesign --verify --verbose=4 release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed after DMG signing.
- `unzip -tq release/desktop/NovelForge-AI-0.1.0-mac-arm64.zip` passed.
- `hdiutil verify release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed.
- `xcrun notarytool submit release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg --keychain-profile simplecut-pro-notary --wait --output-format json` returned `Accepted` for submission `ac82cd1b-e370-4b92-b0c0-7c66785d90db`.
- `xcrun stapler staple release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed.
- `xcrun stapler validate release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed.
- `syspolicy_check distribution release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed with `App passed all pre-distribution checks and is ready for distribution.`
- Packaged app startup smoke passed with a temporary data directory: the local Next.js server returned HTTP 200 from `127.0.0.1:48312`, created the desktop SQLite database, and no longer emitted the missing `.prisma/client/default` runtime error.

Notes:

- Final distribution should use the notarized and stapled DMG. The direct app zip submission `741f751a-0525-4206-a56a-013f4b4aaefe` remained slow/in progress during verification, but the final DMG distribution path is complete and Gatekeeper-ready.
- Apple notarytool/CloudKit intermittently returned `NSURLErrorDomain Code=-1005`; retrying by submission id avoided duplicate uploads.

Next recommended step:

- Open a PR for Phase 14 and review the packaging hardening changes.
- If this app will be released publicly, add a manual release checklist for final version bump, artifact upload, DMG download smoke, and release notes.

## 2026-06-18: Nocturne UI Refresh

Status: completed.

Scope:

- Visual redesign of the local MVP shell and project dashboard.
- Dark writing-workbench style inspired by the provided NovelForge AI reference mockup.
- Preserve existing local-first product behavior and data flow.

What was done:

- Reworked the global app background into a dark teal/nocturne theme with warm gold and cyan accents.
- Rebuilt the app shell with a branded NovelForge mark, glassy sidebar navigation, local mode status, notification/settings icon buttons, and a pinned local SQLite memory note.
- Added custom project-specific SVG illustration components for the logo mark, sidebar nocturne scene, empty project state, and stat card backdrops.
- Redesigned the home dashboard with a large local-workbench header, gold CTA buttons, dark glass stat cards, illustrated empty state, project cards, and recent activity panel.
- Added scoped legacy-surface styling so existing pages inherit the darker theme without changing their server actions or form logic.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 18 files and 71 tests.
- `npm run build` passed.
- Browser visual smoke passed for the home dashboard at desktop width: `h1` and CTA rendered, 4 glass cards were present, workspace panel rendered, and no horizontal overflow was detected.
- Browser responsive smoke passed at 390px width: no horizontal overflow, mobile panel width fit the viewport, and primary CTA buttons remained single-line.
- Browser form-page smoke passed for `/projects/new`: form rendered, dark legacy-surface overrides applied to inputs and form section, and no horizontal overflow was detected.

Notes:

- This is a UI-only pass. It does not add SaaS, cloud sync, collaboration, mobile apps, payment, or automatic WeChat publishing.
- Existing author-control and AI review rules are unchanged; AI output still cannot directly overwrite formal story memory.

## 2026-06-18: Phase 16 AI Connection Settings

Status: completed.

Scope:

- In-app AI connection settings for the local desktop/web MVP.
- Custom OpenAI-compatible provider support through editable model id and base URL.
- Preserve server-only API key handling.

What was done:

- Added `/ai-settings`, a global local settings page for API Key, custom model name, and OpenAI-compatible base URL.
- Connected the app shell settings icon and the project AI workspace to the new AI settings page.
- Added `lib/ai/local-config.ts` to read and write the local AI `.env` config while masking API keys in UI-facing status.
- Updated the OpenAI client to dynamically read the local config file on server-side calls, so saved settings take effect without rebuilding the app.
- Added `OPENAI_BASE_URL` to `.env.example`, desktop runtime parsing, and the generated desktop `.env.example`.
- Updated desktop startup env to expose `NOVELFORGE_AI_CONFIG_PATH` and `NOVELFORGE_DESKTOP_DATA_DIR` to the bundled Next.js server.
- Updated README and macOS desktop packaging docs for the in-app settings flow.
- Added regression coverage for AI config parsing, saving, key masking, environment fallback, custom base URL support, and desktop smoke parsing.

Verification:

- `npm run test -- lib/ai/local-config.test.ts lib/ai/openai-client.test.ts` passed, 2 files and 13 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 19 files and 78 tests.
- `npm run desktop:smoke` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Local HTTP smoke passed: `/ai-settings` returned 200 and `/` returned 200 through `npm run dev`.

Notes:

- API keys are still not exposed to client components. The settings page only renders masked key status and posts new key values through a Server Action.
- Leaving the API Key field blank keeps the currently saved key. Checking "清除已保存的 API Key" removes the saved local key.
- DeepSeek or other OpenAI-compatible providers should be configured by entering their provider base URL and exact model id in the settings page.
- This phase does not add cover image generation or Station Cat publishing; those remain future publishing-platform phases.

## 2026-06-18: Phase 17 Publish Platform Packages

Status: completed.

Scope:

- Software-side publish platform abstraction.
- Local target website and Token management.
- Standard website import package export.
- Draft/direct publish mode selection.
- Incremental content-hash tracking for "only upload changes".
- Publish result display fields for future website API responses.

What was done:

- Added `PublishTarget`, `PublishRun`, and `PublishSyncState` Prisma models plus the `publish_platforms` migration.
- Added `lib/publish-platforms.ts` for:
  - Station Cat / WeChat target labels,
  - draft/direct publish mode normalization,
  - publish Token masking,
  - standard publish-package JSON generation,
  - pricing suggestion generation,
  - stable SHA-256 content hashes,
  - changed-item detection against previous sync state.
- Extended the project publish page with:
  - target website creation,
  - API Base URL and Token save/update,
  - masked Token status,
  - per-target draft/direct mode selection,
  - "only upload changes" toggle,
  - local one-click publish preparation,
  - latest result message, preview URL, publish URL, and changed items.
- Added standard publish-package JSON export alongside existing Markdown/JSON project export.
- Added Server Actions to save publish targets and create local publish runs.
- Extended project publish data loading to include target runs and sync states.
- Added Vitest coverage for standard package generation, changed-item detection, deterministic JSON output, labels, modes, and Token masking.

Verification:

- `npx prisma migrate dev --name publish_platforms` applied the new migration and generated Prisma Client.
- `npm run test -- lib/publish-platforms.test.ts lib/publish-packages.test.ts lib/project-export.test.ts` passed, 3 files and 10 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 20 files and 83 tests.
- `npm run build` passed.
- `npm run mvp:acceptance` passed.
- `npm run desktop:smoke` passed.
- `npx prisma migrate status` passed.
- `git diff --check` passed.
- Local HTTP smoke passed for `/projects/[projectId]/publish` with a temporary project, finalized chapter, and Station Cat target; temporary verification data was deleted afterward.

Notes:

- Phase 17 does not call the Station Cat website API. It prepares the local software-side contract and stores local publish run records only.
- Preview and publish URLs are display fields for future website responses; until real API integration, they show as waiting for website API.
- Tokens are stored locally for the selected publish target and are never rendered back as raw values in the UI.
- Cover image generation is still not implemented. The standard package includes the latest cover prompt plus empty cover image fields for the future cover asset flow.

## 2026-06-18: Phase 18A Station Cat Publish API Adapter

Status: completed.

Scope:

- Software-side Station Cat publish API contract adapter.
- Dry-run import request generation for website backend handoff.
- Mockable future HTTP client with server-only token handling.
- Response and error parsing for the future real API.
- Contract documentation for the website-side agent.

What was done:

- Added `lib/station-cat-publisher.ts` for:
  - `station-cat-novelforge-import.v1` request construction,
  - normalized `POST /api/novelforge/import` endpoint generation,
  - deterministic request IDs,
  - token-free request JSON serialization,
  - server-only `publishToStationCat` with injectable `fetch`,
  - success/error response normalization,
  - dry-run result message generation.
- Added `docs/station-cat-publish-api-contract.md` covering endpoint, auth, request body, response body, aliases, item statuses, error shape, and Phase 18B handoff expectations.
- Updated the project publish action so Station Cat targets store the generated import request JSON in `PublishRun.packageJson` while remaining a local dry-run.
- Updated the publish page copy and target card to show the normalized Station Cat API endpoint and dry-run boundary.
- Added Vitest coverage for request generation, endpoint normalization, auth header behavior, token exclusion from request JSON, response parsing, error parsing, and dry-run messaging.

Verification:

- `npm run test -- lib/station-cat-publisher.test.ts lib/publish-platforms.test.ts` passed, 2 files and 10 tests.
- `npm run typecheck` passed.

Notes:

- Phase 18A still does not send real website HTTP requests from the UI.
- Token values are sent only through the future `Authorization: Bearer <token>` header and are not serialized into the request body.
- The default external publish path should remain `draft`; direct publish must stay an explicit user-selected mode.
- Phase 18B should call `publishToStationCat` only after the Station Cat website backend implements the documented contract, then persist returned preview/publish URLs and remote ids.

## 2026-06-18: Phase 18B Station Cat Real Publish Integration

Status: completed.

Scope:

- Real Station Cat import API calls from the project publish page.
- Station Cat Publish Token handling aligned with website `NOVELFORGE_PUBLISH_TOKEN`.
- Preview/publish URL and remote id persistence.
- Safe retry behavior for failed website imports.

What was done:

- Changed Station Cat publish runs from dry-run storage to real `publishToStationCat` calls when the target has both API Base URL and Token.
- Kept request bodies token-free; the Token is sent only as `Authorization: Bearer <token>`.
- Added support for website response fields:
  - `requestId`,
  - `remoteIds`,
  - `previewUrl`,
  - `publishUrl`,
  - item-level `remoteId`, `status`, and `message`,
  - error `code` plus `message`.
- Persisted successful preview and publish URLs to `PublishRun`.
- Persisted successful remote ids to `PublishSyncState` so later "only upload changes" runs can update existing remote content.
- Recorded failed Station Cat runs with `status = failed` and `errorMessage` without updating content hashes, keeping failed changes retryable.
- Disabled the Station Cat send button when API Base URL or Station Cat Publish Token is missing.
- Updated the publish page to show real Station Cat API behavior, run status, errors, and remote ids.
- Updated `docs/station-cat-publish-api-contract.md` with the website-provided production endpoint, token env var, response format, error codes, and remote id rules.

Verification:

- `npm run test -- lib/station-cat-publisher.test.ts lib/publish-platforms.test.ts` passed.
- `npm run typecheck` passed.
- `npm run test` passed, 21 files and 88 tests.
- `npm run build` passed.
- `npm run mvp:acceptance` passed.
- `npm run desktop:smoke` passed.
- `npx prisma migrate status` passed; all migrations are applied.
- `git diff --check` passed.
- Local HTTP smoke passed for `/projects/[projectId]/publish` with a temporary Station Cat target using `https://wwwstationcat.org` and no Token; the page rendered Phase 18B copy, `Station Cat Publish Token`, `NOVELFORGE_PUBLISH_TOKEN`, and the disabled send button state without calling the real website API. Temporary verification data was deleted afterward.

Notes:

- This phase does not generate or upload cover images yet; cover remains a prompt/metadata field until the cover asset phase.
- The app still defaults to draft import. Direct publish requires the user to select `publish`.
- Real website calls require the user to save the same token value configured on the website as `NOVELFORGE_PUBLISH_TOKEN`.

## 2026-06-18: Post-Phase 18B Personal macOS Rebuild

Status: completed.

What was done:

- Rebuilt the macOS desktop package from `main` at `88a5822 Phase 18B Station Cat real publish`.
- Generated fresh personal-use macOS artifacts:
  - `release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg`
  - `release/desktop/NovelForge-AI-0.1.0-mac-arm64.zip`
- Deleted the old DMG/ZIP helper outputs (`*.blockmap`, `latest-mac.yml`, `builder-debug.yml`) and kept only the fresh DMG/ZIP plus current app directory.
- Canceled Apple notarization at the user's request and changed the project packaging policy: future normal rebuilds should skip notarization because this app is for personal local use.

Verification:

- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed through signed app packaging before manual artifact regeneration.
- `unzip -tq release/desktop/NovelForge-AI-0.1.0-mac-arm64.zip` passed.
- `hdiutil verify release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed.
- Gatekeeper assessment reports `Unnotarized Developer ID`, which is expected for the new personal-use no-notarization policy.

Notes:

- Do not run `desktop:dist:mac:notarized` for future normal rebuilds unless the user explicitly asks for public distribution.

## 2026-06-18: macOS Read-Only DMG Startup Fix

Status: completed.

Bug:

- Launching `NovelForge AI.app` directly from the mounted DMG failed with:
  - `Error: EROFS: read-only file system, unlink '/Volumes/NovelForge AI/NovelForge AI.app/Contents/Resources/app.asar.unpacked/node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node'`
- Root cause: desktop startup ran Prisma CLI `migrate deploy` from inside `app.asar.unpacked`. On a mounted DMG, the app bundle is read-only, and Prisma CLI can try to mutate its bundled engine files.

What was done:

- Removed the packaged desktop startup dependency on Prisma CLI migration execution.
- Added `runDesktopMigrations` to `desktop/runtime.cjs`.
  - Resolves bundled `@prisma/client` from `app.asar.unpacked`.
  - Reads bundled `prisma/migrations/*/migration.sql`.
  - Applies unapplied SQL migrations to the user data SQLite database through Prisma Client.
  - Records applied rows in `_prisma_migrations` with checksums and step counts.
- Updated `desktop/main.cjs` to run the read-only-safe migration runner before starting the bundled Next.js server.
- Expanded `npm run desktop:smoke` so it now verifies:
  - desktop startup no longer references `prisma/build/index.js`,
  - the migration SQL splitter handles comments,
  - all bundled migrations apply to a fresh desktop SQLite file,
  - rerunning desktop migrations is idempotent.
- Hardened `scripts/generate-macos-icon.py` to reuse an existing valid `build/icon.icns` if the local macOS `iconutil` rejects the generated iconset, so a system iconutil issue does not block urgent desktop rebuilds.

Verification:

- `npm run desktop:smoke` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run test` passed, 21 files and 88 tests.
- `npm run desktop:dist:mac` completed with notarization skipped.
- Re-signed the generated app with `Developer ID Application: HAO YE (Y35K7AQ974)` and verified:
  - `codesign --verify --deep --strict --verbose=2 release/desktop/mac-arm64/NovelForge AI.app` passed.
- Final artifacts:
  - `release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg`
  - `release/desktop/NovelForge-AI-0.1.0-mac-arm64.zip`
- Final package checks:
  - `hdiutil verify release/desktop/NovelForge-AI-0.1.0-mac-arm64.dmg` passed.
  - `unzip -tq release/desktop/NovelForge-AI-0.1.0-mac-arm64.zip` passed.
  - ZIP-extracted app signature verification passed.
  - DMG-mounted app signature verification passed.
  - Direct launch from the read-only mounted DMG with `NOVELFORGE_DESKTOP_DATA_DIR=/private/tmp/novelforge-readonly-smoke-data` started the local Next.js server and returned HTTP 200 from `http://127.0.0.1:48312`, with no `EROFS` error.

Notes:

- Keep desktop runtime writes inside the user data directory. Never write to `process.resourcesPath`, `app.asar`, or `app.asar.unpacked` at runtime.
- The current DMG is still not notarized, by user preference for personal local use.

## 2026-06-18: Global Station Cat Publish Settings

Status: completed.

Scope:

- Make Station Cat website API settings global instead of requiring every project to configure a publish target first.

What was done:

- Extended the local desktop `.env` config to support:
  - `STATION_CAT_API_BASE_URL`,
  - `STATION_CAT_PUBLISH_TOKEN`,
  - `STATION_CAT_DEFAULT_MODE`.
- Updated desktop runtime config parsing and `.env.example` generation so packaged macOS builds load the Station Cat global settings into the server process.
- Expanded `/ai-settings` into a general local integration settings page:
  - AI API Key / model / base URL,
  - Station Cat API Base URL,
  - Station Cat Publish Token,
  - default draft/direct publish mode.
- Kept Station Cat Publish Token server-only and masked in UI.
- Added a global Station Cat card to `/projects/[projectId]/publish`.
  - Users can publish with global settings without manually adding a per-project target.
  - On first use, the action creates or updates an internal `Station Cat 全局配置` publish target for that project, preserving existing `PublishRun` and `PublishSyncState` tracking for incremental uploads and remote IDs.
- Left project-specific publish targets available for future cases where a project needs a custom destination.

Verification:

- `npm run test -- lib/ai/local-config.test.ts lib/station-cat-publisher.test.ts lib/publish-platforms.test.ts` passed, 3 files and 20 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 21 files and 92 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.

Notes:

- Current installed macOS app must be rebuilt before this new global settings UI appears there.
- Global Station Cat settings do not change the website contract: requests still use `POST /api/novelforge/import` with `Authorization: Bearer <token>`.

## 2026-06-18: Formal Personal macOS Installer 0.1.1

Status: completed.

Scope:

- Bump the desktop app/package version for a distinguishable formal personal-use installer.
- Rebuild a clean single-DMG macOS installer with the read-only-safe desktop migration runner.

What was done:

- Bumped `package.json` and `package-lock.json` from `0.1.0` to `0.1.1`.
- Kept the no-notarization personal-use packaging policy.
- Rebuilt the macOS installer from the current `main` code.
- Re-signed the packaged app with Developer ID signing after the electron-builder output required final verification.
- Recreated the DMG from the signed app.
- Removed build intermediates and update artifacts so `release/desktop/` contains only:
  - `NovelForge-AI-0.1.1-mac-arm64.dmg`

Verification:

- `npm run desktop:smoke` passed.
- `npm run typecheck` passed.
- `npm run test` passed.
- `npm run build` passed.
- Package metadata reports version `0.1.1`.
- Packaged `app.asar` desktop runtime check passed:
  - `desktop/main.cjs` contains `runDesktopMigrations`.
  - The packaged startup code does not contain `prisma/build/index.js`.
  - The packaged startup code does not contain `migrate deploy`.
  - `desktop/runtime.cjs` reads bundled `migration.sql`.
- DMG verification passed.
- DMG-mounted app signature verification passed.
- Direct launch from the read-only mounted DMG with a temporary `NOVELFORGE_DESKTOP_DATA_DIR` started the local app and returned HTTP 200, with no `EROFS` error.

Notes:

- Continue handing off the single DMG only for personal macOS use.
- Do not leave `release/desktop/mac-arm64/`, ZIP, blockmaps, `latest-mac.yml`, or `builder-debug.yml` in the user-facing delivery folder unless explicitly requested.

## 2026-06-18: Formal macOS PKG Installer Correction

Status: completed.

Correction:

- A DMG is not the formal installer shape the user expects because the app inside it can still be launched directly.
- Formal personal-use handoff should be a `.pkg` installer that installs `NovelForge AI.app` into `/Applications`.

What was done:

- Kept app version at `0.1.1`.
- Built a macOS PKG installer named `NovelForge-AI-0.1.1-mac-arm64.pkg`.
- Set the installer payload to install `NovelForge AI.app` into `/Applications`.
- Removed the DMG from the final user-facing delivery directory so the user does not confuse drag-and-drop distribution with the formal installer.
- Confirmed the current keychain does not include a `Developer ID Installer` identity, so the PKG itself is unsigned; the bundled `NovelForge AI.app` payload remains Developer ID Application signed.

Verification:

- `pkgutil --check-signature` reports `Status: no signature`, matching the missing Installer certificate.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.1"`.
- Expanded payload contains `NovelForge AI.app`.
- Expanded app `codesign --verify --deep --strict --verbose=2` passed.
- Expanded app `CFBundleShortVersionString` and `CFBundleVersion` are `0.1.1`.
- Packaged `package.json` is `0.1.1`.
- Packaged startup code still uses `runDesktopMigrations`, reads bundled `migration.sql`, and does not contain Prisma CLI `migrate deploy` startup code.
