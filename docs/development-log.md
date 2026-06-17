# Development Log

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
