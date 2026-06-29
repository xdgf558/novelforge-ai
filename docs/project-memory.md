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
- WeChat layout export for manual public-account publishing
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
19. User exports WeChat-ready layout/copy from confirmed chapter text.
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
- `storylines`
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
- `chapter_analytics`
- `chapter_insights`
- `audio_exports`
- `audio_export_segments`
- `ai_usage_daily`

## AI Integration Rules

- Frontend must never access `OPENAI_API_KEY`.
- All AI calls go through backend routes/actions.
- Store model name, prompt template version, input context summary, output, status, token usage when available, created time, and adoption state.
- The default AI connection remains the structural/editorial model route, intended for planning, outlines, beats, summaries, continuity checks, and other management tasks. Chapter draft and chapter polish tasks may use task-level OpenAI-compatible routes such as Kimi K2.6; when a route has no saved API key, it safely falls back to the default AI connection. Routed tasks store a non-secret execution snapshot with route source, model, and base URL in `ai_tasks.inputJson`, while API keys remain only in local config. Long-form writing tasks (`chapter_draft_generation` and `chapter_polish_generation`) use a longer 10 minute model request timeout; structural/editorial tasks keep the default 120 second timeout.
- Structured tasks should use JSON Schema:
  - Project setting generation
  - Character generation
  - Chapter summary extraction
  - Pending update extraction
  - Continuity checking
  - WeChat layout candidate generation where useful
- Draft generation and polishing can output text, but still need `ai_tasks` records.
- Automatic segmented chapter polish is a background runner, not a public
  server action. The UI action only creates and marks a trusted
  `chapter_polish_generation` task as running; the runner reloads the task,
  prompt template, chapter, setting, and characters by `taskId`, validates the
  task type/status plus the recorded source-text length, SHA-256 source hash,
  and segment count, and only then calls the model.

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

For chapter summary extraction, confirmed final text is still the only source.
When final text is too long for stable single-request model calls, pass a
head/middle/tail excerpt to the model, and record the original final-text length,
excerpt length, and excerpt strategy in the AI task audit trail. This keeps the
local MVP stable with OpenAI-compatible providers while leaving room for a future
chunk-and-merge summary pipeline.

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
12. WeChat layout export and Markdown/JSON export.

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
- Phase 20: AI chapter polish generation, independent `Chapter.polishedText` storage, explicit adoption into polished text, and author-controlled finalization from polished text.
- Phase 21: outline module with volume, story-unit, and chapter outlines; logged AI outline draft generation; project dashboard/sidebar entry; project export coverage; and outline context injection into chapter beat and draft generation.
- Phase 22: structured memory management pages for world rules, foreshadows, and timeline events, including richer metadata fields, dashboard/sidebar entry, project export coverage, continuity context enrichment, current-project chapter relation validation, and soft archive/abandon flows for formal memory records.
- Phase 23: character relationship network and character AI generation, including `character_relationships`, author-managed relationship create/edit/archive, current-project character/chapter relation validation, relationship export coverage, logged `character_generation` AI tasks, and explicit author adoption into new formal character records with character version snapshots.
- Phase 23 follow-up: character relationship AI generation uses `character_relationship_generation` tasks on `/projects/[projectId]/characters/network`. It reads project setting, active characters, existing relationships, outlines, and recent chapter summaries, then stores draft-only relationship suggestions in `ai_tasks`. Formal `character_relationships` rows are created only after the author clicks "采用全部可用关系"; adoption revalidates current-project active characters, maps chapter references, skips duplicates, and marks the task adopted.
- Phase 23 relationship review hardening: relationship draft adoption now preflights duplicate checks inside the transaction and only marks the AI task adopted when at least one non-duplicate relationship will be written; duplicate-only attempts leave the task reviewable. Character fields passed into relationship-generation `inputJson` and prompt text are clipped before logging/calling the model to control prompt size as the role library grows.
- Phase 24: AI-assisted cover image generation on the project publish page, including global image API settings, PPQ/OpenAI-compatible `/images/generations` calls, logged `cover_image_generation` tasks, candidate previews, and explicit author adoption into the existing local cover asset flow.
- Phase 24 review hardening: generated cover tasks now persist base64 provider results as local candidate assets and store only asset references in `ai_tasks.outputJson`; URL-only image results are not adopted or downloaded, candidate previews are served through a controlled project asset route rather than SSR base64 embedding, candidate asset directories are removed on adoption/rejection/task-retention pruning, and all manual/generated covers must pass PNG/JPEG/WebP/GIF magic-byte validation before entering the formal cover slot.
- Phase 25: audiobook export MVP, including local TTS settings, Google Gemini TTS provider support, Google voice-name selection, voice preview playback, chapter-level segmented audio export, `audio_exports` / `audio_export_segments`, failed-segment retry, local export folder opening, and controlled `/audio-assets` playback.
- Phase 29: ending planning and closure readiness, including an outline-module “终局规划 / 收尾检查” panel, local ending-readiness signals from total word target, chapter progress, outline status, and unresolved foreshadows, plus logged `ending_planning_generation` AI draft tasks. AI may suggest remaining chapters, final story units, foreshadow recovery priorities, character endings, and conclusion tone, but it must not automatically modify formal outlines, foreshadows, timelines, or story memory.
- Phase A reader feedback snapshots: chapter detail pages can pull Station Cat website analytics and insights using the saved Station Cat API Base URL/token, preferring `Chapter.readerRemoteId` and falling back to `publish_sync_states.remoteId` for the chapter. Reader feedback endpoints live under the NovelForge namespace: `/api/novelforge/analytics/chapter/:chapterId` and `/api/novelforge/analytics/insights/:chapterId`. Store snapshots in `chapter_analytics` and `chapter_insights`, including raw JSON for troubleshooting, and prune to the latest 30 records per chapter per snapshot type after each fetch. This is read-only reference data in Phase A and must not automatically change chapter text, settings, characters, outlines, foreshadows, timelines, or structured memory.
- Phase B feedback-driven next chapter generation: chapter beat and draft generation now load the latest analytics/insight snapshots from up to 3 previous chapters, compress them into reader-feedback signals, and include them in AI task `inputJson` and prompt text. Feedback may guide pacing, opening momentum, hook strength, reader-focus character weighting, and explanation density, but it must not be treated as formal memory and must never automatically change chapter text, settings, characters, outlines, foreshadows, timelines, or structured memory. The chapter detail page shows the exact feedback signals used as “当前章生成参考”, and both page display and generation actions must use `loadReaderFeedbackSignalsForChapterGeneration` so they stay aligned.
- Continuity one-click repair: open continuity reports can offer an author-triggered “一键修复正文” button when the suggested fix contains an explicit replacement such as “将 A 改为 B”; the action updates the linked chapter final text, creates a chapter version snapshot, and marks the report resolved. Vague or structural fixes can generate logged `continuity_fix_patch_generation` AI candidate patches for author review, but those candidates never directly modify chapter text, formal settings, characters, timelines, foreshadows, or structured memory.
- Phase 26: WeChat layout export enhancement on the project publish page. The deterministic formatter reads chapter text in `polishedText -> finalText -> draftText` order, supports “微信公众号正文粘贴版” and “微信公众号完整发布版”, and provides one-click copy plus TXT/Markdown/HTML downloads. Default behavior is “只排版，不改文”. The export panel now has a separate logged `wechat_layout_candidate_generation` AI task for title/opening/ending follow-hook candidates; generating candidates never mutates formal chapter text, legacy publish packages, or story memory, and applying a candidate only fills the local export form.
- Phase 27: local maintenance and recovery. `/ai-settings` can create local ZIP backups from a transactional `VACUUM INTO` SQLite snapshot plus generated asset roots while excluding local `.env` secrets; asset files are streamed into the ZIP rather than buffered in memory. Project maintenance is archive-first with restore support and guarded hard deletion; setting history snapshots can be restored into the current setting with a new rollback version; project setting AI now supports draft-only generation, completion, and optimization task types; and the AI task page has basic prompt-template view/copy/duplicate/enable/disable/reset controls. AI generation now resolves the highest-version active prompt template for a key before falling back to the default template.
- Phase 28: long-form management efficiency, progress tracking, and cost awareness. Character library search/filtering, character appearance records, structured memory filters with expandable long text, outline progress, outline status sync from chapter lifecycle, daily AI usage aggregation, and non-blocking daily token budget reminders are implemented.
- Phase 29 multi-storyline foundation: formal `storylines` memory plus project-scoped links to characters, foreshadows, chapters, and outlines. Authors manage storylines manually from `/projects/[projectId]/storylines`; chapter detail pages and outline cards show associated storylines. AI does not auto-create, auto-link, or auto-update storylines in this phase.
- Phase 30A AI storyline draft generation: `/projects/[projectId]/storylines` can start logged `storyline_generation` tasks that suggest storylines from project setting, characters, foreshadows, recent chapter summaries, outlines, and existing storylines. Candidate storylines may fill the formal form, but formal `storylines` rows and relation rows are written only after explicit author confirmation.
- Storyline completion remains safe and semi-automatic: the board may suggest “可能可以收束” when a storyline reaches its ending chapter or its linked chapters are all finalized/published, but the author must manually mark it completed or archive it. The storyline board shows the latest 3 formal storylines by default and folds older ones into history.

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
- Historical Phase 14 distribution validation produced a notarized and stapled DMG, but the current product is for personal local use. Do not run Apple notarization by default for future rebuilds; produce the signed app payload first, then hand off a clean PKG installer unless the user explicitly asks for DMG/ZIP artifacts.
- Packaged runtime uses `app.asar.unpacked`; keep generated Prisma client copying in `scripts/after-pack.cjs` because electron-builder does not reliably include the `node_modules/.prisma` dot directory from glob rules alone.
- Desktop startup must not run Prisma CLI commands from inside the packaged app bundle. DMG volumes are read-only, and Prisma CLI can try to mutate `node_modules/@prisma/engines` under `app.asar.unpacked`, causing `EROFS`. Use `runDesktopMigrations` in `desktop/runtime.cjs`, which reads bundled `prisma/migrations/*/migration.sql`, applies SQL through Prisma Client to the user data SQLite database, and records `_prisma_migrations`.
- `npm run desktop:dist:mac` produces the signed local app payload plus DMG/ZIP artifacts and skips notarization; use the app payload to build the formal `/Applications` PKG handoff.
- `npm run desktop:dist:mac:notarized` exists only for an explicit future public-distribution request; do not use it for normal personal-use rebuilds.
- Current source app version is `0.1.66`; the latest formal personal-use macOS installer can lag behind source until the next packaging handoff. Handoff should leave only the final `release/desktop/NovelForge-AI-<version>-mac-arm64.pkg` in the delivery folder unless the user explicitly asks for DMG/ZIP/update metadata.
- Phase 27 added local backup creation under `/ai-settings`; backups are ZIP files containing a `VACUUM INTO` SQLite snapshot and generated assets, and deliberately exclude local `.env` API keys, TTS keys, image keys, proxy settings, and Station Cat tokens. Keep this invariant if backup/restore is extended later, and keep asset ZIP writing streaming rather than all-in-memory.
- Project deletion should remain archive-first. The default project list shows active projects; archived projects are available through the project-status filter and can be restored from the edit page. Hard delete must keep a visible backup acknowledgement and typed confirmation.
- Prompt template management is basic by design: authors can view/copy, duplicate a version, enable/disable, and reset to defaults. Do not add arbitrary browser-side API key access or hidden prompt mutation. AI calls should use the highest-version active template for a key.
- AI daily usage aggregation lives in `ai_usage_daily` and should survive `ai_tasks` retention pruning. `markAiTaskCompleted` records one completed call grouped by project, local date, task type, and model. The project-level `aiDailyTokenBudget` is a reminder threshold only: generation buttons may show warnings near or above the threshold, but should not hard-block the author unless a future phase explicitly designs strict budgeting.
- Formal handoff should use a `.pkg` installer that installs `NovelForge AI.app` into `/Applications`; a DMG is only a drag-and-drop/test package because the app inside a DMG can be launched directly.
- Current keychain has Developer ID Application signing available but no Developer ID Installer identity; until an Installer certificate is added, the PKG itself is unsigned. Since the 0.1.12 packaging pass, copied Developer ID signed app bundles can fail verification after staging/PKG expansion, so the final personal-use PKG uses an ad-hoc signed app payload that passes copy/package/expand verification.
- Pending update review forms now show an in-flight state while approving/rejecting, redirect back with a visible result banner, and processed cards show the handling time plus whether the suggestion wrote to formal memory.
- Project dashboard pending-update cards should show workflow state counts (`pending`, `approved`, `rejected`) rather than only total suggestions, and the sidebar creative-tool entries are real project-context links when a current project id exists in the route.
- Project dashboard status timestamps must distinguish project metadata time from writing activity time. `projects.updatedAt` only means title/description/basic project fields changed; use `loadProjectActivitySummary` / `loadProjectActivitySummaries` for “最近活动” because it aggregates chapters, settings, characters, AI tasks, pending updates, continuity reports, publish packages, and Station Cat publish runs.
- Project activity date reads must tolerate mixed historical SQLite timestamp formats. Older user databases can contain both millisecond timestamps and `YYYY-MM-DD HH:mm:ss` strings; avoid Prisma DateTime aggregates for cross-table activity summaries because they can throw `P2023` on legacy rows.
- Sidebar creative-tool entries should also work from non-project routes by using the most recently updated project as a fallback, and the fixed desktop sidebar must have its own vertical scrolling so the local persistence note is not clipped on short windows.
- The fixed desktop sidebar must remain above the main content layer (`z-30` currently) so sidebar links are clickable; short windows hide the decorative sidebar art to keep the local persistence note visible.
- Before reporting a desktop package as ready, verify the packaged app still uses `runDesktopMigrations` from `desktop/runtime.cjs`, does not contain Prisma CLI `migrate deploy` startup code, and the installer payload targets `/Applications/NovelForge AI.app`.
- AI connection config is now editable at `/ai-settings`; the app writes the local `.env` config and reads `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` dynamically on the server.
- Image generation config is now editable at `/ai-settings`; the same local `.env` stores `IMAGE_API_KEY`, `IMAGE_API_BASE_URL`, `IMAGE_MODEL`, `IMAGE_SIZE`, and `IMAGE_QUALITY`. The default image endpoint is PPQ-compatible `https://api.ppq.ai/v1`, default model is `qwen-image-2`, and calls use `POST /images/generations`.
- TTS / audiobook export config is now editable at `/ai-settings`; the same local `.env` stores `TTS_PROVIDER_ID`, `TTS_API_KEY`, `TTS_API_BASE_URL`, `TTS_MODEL`, `TTS_VOICE_ID`, `TTS_VOICE_NAME`, `TTS_LANGUAGE_CODE`, `TTS_OUTPUT_FORMAT`, and `TTS_STYLE_PROMPT`. The active user-facing providers are Google Gemini TTS and GLM-TTS. Google defaults to `https://generativelanguage.googleapis.com/v1beta`, `gemini-2.5-flash-preview-tts`, voice `Kore`, language `cmn`, and WAV output. GLM-TTS defaults to `https://open.bigmodel.cn/api/paas/v4`, model `glm-tts`, voice `female` / `彤彤（默认）`, and WAV output. PPQ remains available only as legacy code for old records/tests and is no longer a user-facing audiobook provider.
- The TTS voice picker should remain explicit: refreshed voice lists show Google Gemini's built-in voice names and can auto-select the first voice only for immediate preview convenience, but the author can click "保存当前音色" to persist the selected `TTS_VOICE_ID` / `TTS_VOICE_NAME` into the local `.env`. Preview/export actions should fail with a clear missing-voice message when no voice name is submitted.
- Legacy PPQ audiobook settings must be migrated on read: old `TTS_PROVIDER_ID=ppq_tts`, `https://api.ppq.ai/v1`, ElevenLabs/DeepGram models, PPQ voice ids, and MP3 output should fall back to Google Gemini defaults. Do not carry an old PPQ API key forward as a Google Gemini API key.
- Google Gemini TTS preview and chapter export call `models/{model}:generateContent` with `responseModalities: ["AUDIO"]` and a `prebuiltVoiceConfig.voiceName`; returned PCM audio is wrapped as WAV before local storage. Gemini JSON responses can contain base64 audio and must be read with a content-length / streaming byte cap before JSON parsing, then validated again after base64 decode and WAV wrapping. Do not present MP3/OGG as active Google Gemini output choices unless a future Google endpoint supports them directly.
- Network proxy config is now editable at `/ai-settings` inside the AI connection section; the same local `.env` stores `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and `NO_PROXY`. Server-side OpenAI-compatible model calls, image generation, Google Gemini TTS, and Station Cat publishing use `createServerFetch`, which reads the local proxy config so GUI-launched desktop builds can access services that otherwise require the user's local proxy. Proxy selection must be protocol-specific (`HTTP_PROXY` for `http:`, `HTTPS_PROXY` for `https:`, `ALL_PROXY` as fallback) and must respect `NO_PROXY` for string, `URL`, and `Request` inputs. When using the proxy dispatcher, do not pass `AbortController.signal` directly into undici; keep caller-side timeout semantics in the wrapper to avoid premature `Request was cancelled` failures.
- Audiobook exports live under local export assets and are tracked by `audio_exports` plus `audio_export_segments`. Default chapter audio source selection reads the current public website chapter body from Station Cat using `GET /api/novelforge/chapters/:remoteChapterId/content` and the saved Station Cat Publish Token; `publish_sync_states.remoteId` is only the lookup bridge. Software-local sources (`polishedText -> finalText -> draftText`) remain manual fallback options. Gemini and GLM WAV segmentation should use the local audio byte budget rather than model context alone, so normal successful segments stay below `maxAudioSegmentBytes`. Exported audio files and preview files must not be written into formal story memory, chapter text, structured memory, or publish packages unless a future phase explicitly designs that flow.
- Audiobook export must stay cost-safe: do not allow a second pending/running export for the same project/chapter, enforce the active-export partial unique index with a friendly duplicate-export redirect, atomically lock failed/partial exports before retrying failed segments, stream TTS audio or audio-bearing JSON responses with a byte cap, reject non-audio 200 responses or mismatched audio signatures, and only allow unidentified `application/octet-stream` audio when the requested output format is raw `pcm`. Do not retry historical PPQ/legacy exports with the current provider; show a clear message and ask the user to create a fresh export. Serve exported chapter audio only through the project-scoped `/projects/[projectId]/audio-assets` route after confirming the segment belongs to that project. The global `/audio-assets` route is for short TTS previews only, and preview cleanup should keep local assets bounded. When every WAV segment succeeds, write a merged whole-chapter WAV path back to `audio_exports` while keeping segment files for retry/debug; deleting an export should remove its local audio directory as well as the database record.
- The publish page should treat the global Station Cat API settings as the default daily publishing path. The auto-created `Station Cat 全局配置` target is an internal sync-state record for remote IDs and publish runs, not a separate user-facing website backend. Project-specific publish targets should stay in the advanced optional area for alternate sites, test environments, or special endpoints.
- The legacy AI chapter publish-package UI is retired. Keep historical `publish_packages` data for export and Station Cat standard-package compatibility, but do not surface new generation entry points. Author-facing WeChat output should go through the deterministic “公众号排版导出” panel and optional `wechat_layout_candidate_generation` opening/ending/title candidates.
- The publish page has a deterministic WeChat layout export path for manual public-account publishing. It is separate from Station Cat upload: layout export can use draft/polished/final chapter text, normalizes format for copy/download, and must not imply automatic WeChat publishing.
- OpenAI's official base URL uses the Responses API, while custom OpenAI-compatible base URLs such as DeepSeek use `/chat/completions`. AI task failures should be recorded in `ai_tasks` and redirect back to the relevant page instead of surfacing a full Next.js application error page.
- Chapter detail pages auto-refresh while AI tasks are pending/running, and stale chapter AI tasks older than 15 minutes are marked failed so they do not permanently lock generation buttons.
- User-triggered AI generation should not block the UI while waiting for the model. Chapter beats, chapter drafts, chapter polish, summaries, pending update extraction, continuity checks, and WeChat layout candidates should start logged background tasks and return to a page that auto-refreshes. If a task needs follow-up writes, use a background completion callback after the task output is saved.
- Chapter prose generation should avoid repetitive AI template phrasing. Keep the shared prose style guardrails in chapter beat, draft, and polish contexts so future output reduces high-frequency “不是……而是……”“不是因为……而是因为……” patterns and prefers concrete actions, details, reactions, and cause-effect progression over abstract summary sentences.
- AI chapter polish uses task type `chapter_polish_generation`. It reads the best available author text in this order: polished text, final text, draft text, so repeated polish starts from the author's current polished candidate instead of stale draft text. Generated output is saved in `ai_tasks` and only moves into `Chapter.polishedText` after explicit author adoption. Adoption must remain server-side idempotent (`not_reviewed` -> `adopted`) and must not directly overwrite `finalText`.
- Chapter polish prompt input has a single-call budget. New overlong polish requests should automatically create one logged `chapter_polish_generation` task that runs segmented polish in the background: split the best available source text into bounded segments, call the model sequentially for each segment with adjacent-segment context, then stitch successful outputs back into a complete polish candidate. The task must be adoptable only after all segments succeed; old head/middle/tail excerpt tasks remain preview-only and must not be adoptable into `Chapter.polishedText`.
- Adopting a polish candidate should move `draft` and `final` chapters to `revising` because `finalText` has not changed yet and the author still needs to explicitly finalize the new polished candidate. Keep `published` as `published` until a richer published-with-revision state exists.
- `/ai-settings` redirects back with a saved-state message after AI or Station Cat settings are stored.
- The top toolbar and `/ai-settings` should show the current app version and release notes so the user can confirm which packaged version is installed.
- The Electron shell handles `Escape` at the window level to leave fullscreen or maximized state.
- Station Cat website publishing config is also global at `/ai-settings`; the same local `.env` stores `STATION_CAT_API_BASE_URL`, `STATION_CAT_PUBLISH_TOKEN`, and `STATION_CAT_DEFAULT_MODE`. The token remains server-only and masked in UI.
- Publishing targets remain available from `/projects/[projectId]/publish`, but Station Cat can now use the global config without manual per-project setup. The first global publish from a project creates/updates an internal `Station Cat 全局配置` target so `PublishRun` / `PublishSyncState` can still track preview URLs, remote IDs, and changed content hashes per project.
- Station Cat targets call `POST https://wwwstationcat.org/api/novelforge/import` when API Base URL and Station Cat Publish Token are configured; keep request tokens in the `Authorization` header only, never inside request JSON.
- Station Cat publish runs support an explicit upload scope from the publish page: all changed items by default, or one selected finalized chapter. The selected-chapter path filters `changedItems` before the website request and before sync-state advancement, so choosing chapter 2 does not implicitly upload the cover, project metadata, or chapter 1.
- Website publish bodies are cleaned in the standard publish package: leading duplicate Markdown chapter titles, leading `---`, and AI draft structure headings such as `开场钩子` / `节拍1` / `节拍二` are stripped before Station Cat upload. This does not mutate the local chapter final text.
- Successful Station Cat responses save preview/publish URLs and remote ids into `PublishRun` / `PublishSyncState`; failed responses record a failed run and do not advance content hashes, so retries still include the changed items.
- Station Cat network failures should preserve diagnostics in `PublishRun.errorMessage`: endpoint, approximate request size, low-level cause such as `ENOTFOUND` / `ECONNRESET`, and a user-facing hint. Do not collapse these back to plain `fetch failed`.
- Project cover images can be uploaded from the project publish page. They are stored under the local app data assets directory in desktop builds or `.novelforge-assets/` during local development, and are included in the standard publish package / Station Cat request as the cover changed item with `dataBase64` and `dataUrl`.
- AI cover image generation uses task type `cover_image_generation`. It starts a logged background image task from the publish page, uses an author-entered prompt or existing project/cover context, and only writes to formal project cover fields after the author clicks "采用为封面". Adopted generated images are saved through the same local cover asset storage and then included in the Station Cat standard package.
- Project setting AI generation is available from `/projects/[projectId]/settings`. It starts a logged `project_setting_generation` background task, displays the draft on the settings page, and only writes formal setting memory after the author clicks "采用到总设定档"; adoption creates a `SettingVersion` with source type `ai_project_setting`.
- Project outlines live in the `outlines` table with `level` values `volume`, `unit`, and `chapter`. The `/projects/[projectId]/outlines` page handles manual creation/editing/deletion, while `outline_generation` AI tasks are draft-only and must not auto-write formal outline rows. Chapter beat and draft generation should load the matching volume/unit/chapter outline for the current chapter number.
- Multi-storyline planning lives in `storylines` plus project-scoped relation tables for characters, foreshadows, chapters, and outlines. `/projects/[projectId]/storylines` is the author-controlled management surface for mainlines, subplots, character arcs, business lines, antagonist lines, foreshadow lines, world lines, and other narrative threads. `storyline_generation` AI tasks may suggest candidate storylines and prefill the same form, but those candidates remain draft-only `ai_tasks` output until the author explicitly saves a candidate into formal memory. AI must not silently create, auto-link, or mutate formal storylines.
- Completed outline AI tasks may offer a "复制到表单" convenience action that parses the draft and fills the matching quick-create form. This is only a client-side form-fill helper; the author must still review and click the form's save button before a formal outline row is written.
- Outline generation follows the same background-task hardening as chapter AI tasks: stale `outline_generation` pending/running records older than 15 minutes are marked failed before locking the generate button, and the outline page auto-refreshes while a task is active.
- Outline matching for chapter generation is specificity-first, not first-created-first-used. Closed start/end ranges beat open ranges, shorter ranges beat wider ranges, active status is preferred after specificity, and matching output may include one volume outline, up to two story-unit outlines, and one exact chapter outline.
- Formal outline saves must reject invalid ranges where `endChapter < startChapter`, and chapter-level outlines must have `chapterNumber` before they can be saved into the outline table.
- Outline progress is derived from chapter records, not AI output. Volume/unit/chapter outlines display created/final/published counts for their range. Chapter create/update/delete may sync matching outline `status` to `planned`, `active`, or `completed`, but must not change outline content, goals, conflicts, hooks, or other author-written planning text.
- Character relationships live in `character_relationships` and are managed at `/projects/[projectId]/characters/network`. Relationship saves must validate that both endpoint characters and any source chapter belong to the current project. Archive relationships instead of hard-deleting them unless a future cleanup explicitly requires destructive deletion.
- AI-generated character relationship suggestions must stay draft-only in `ai_tasks` until explicit adoption. Do not let relationship generation directly mutate `character_relationships`; adoption should reject/skip archived characters, cross-project references, same-character endpoints, and duplicate active/tension/hidden relationships.
- Character relationship foreign keys to characters must not use cascade delete. Character removal is archive-first (`status = archived`) with a new `CharacterVersion`, so relationship history remains visible and exportable after a role is retired.
- Archiving a character should also archive related active/tension/hidden relationships. Character AI context should still filter out relationships whose source or target character is archived, so old historical ties do not pollute new character generation.
- Relationship creation/update should reject duplicate active/tension/hidden records for the same character pair, relationship type, and direction; archived/resolved history can remain as traceable past states.
- New character relationships must reject archived source/target characters on the server. Relationship updates may still preserve existing archived endpoints so historical records remain maintainable.
- Character AI generation uses task type `character_generation`. It starts a logged background task from the character library page and only creates a formal character after explicit author adoption; suggested relationships from AI output should remain review notes, not automatic relationship rows.
- Character AI generation must be disabled when the local AI API Key is missing, and server actions should redirect with visible feedback instead of creating doomed failed tasks.
- AI-adopted character draft fields should be sanitized to the same practical limits as manual character forms (`name` 120 chars, text fields 8000 chars, suggested relationships capped before being appended to notes).
- Structured story memory is directly manageable at `/projects/[projectId]/memory`. World rules, foreshadows, and timeline events can be created, edited, or deleted only through explicit author actions or pending-update approval; AI generation must not directly overwrite these formal rows.
- World rules can carry `isCore`, `scope`, `relatedCharacters`, `relatedLocations`, and `relatedOrganizations`. Foreshadows can carry `expectedResolveChapter`, `relatedCharacters`, `relatedLocations`, and `relatedFactions`. Timeline events can carry `relatedCharacters` and `location`. Project exports and continuity checks should preserve/read these richer fields.
- Project AI task records now have a retention limit of 10 records per project. The AI workspace prunes older finished tasks before display, and new task creation triggers the same cleanup. Pending/running tasks are not pruned so background generation can still write completion or failure status.
- The AI task workspace should stay compact as template/task history grows: top summary cards must keep long API URLs inside their card, Prompt Templates should show the latest 3 versions by default, and Recent Tasks should show the latest 3 records by default with older retained items folded.
- New chapter creation is intentionally minimal: show only chapter number, chapter title, and chapter goal. Beats, draft text, final text, notes, status edits, and change reasons belong on the chapter detail/edit flow after the shell exists.
- The chapter list should stay compact and metadata-only for long-form projects: do not load or render full chapter bodies on `/projects/[projectId]/chapters`; show chapter number, status, title, goal, word count, version count, and update time, with full text reserved for the chapter detail page. By default, show only the latest 3 chapters and fold older chapters into a collapsed history section while keeping old chapters reachable.
- The publish/export page should stay compact as publish assets grow: keep the book-cover tools, WeChat layout export, Station Cat publish runs, and project-export panels scannable; use explicit expand/collapse for long generated/export text instead of forcing full text into every card.
- Deep project management pages should prefer dense management surfaces over large repeated cards. Character lists, saved outlines, and structured memory records should show compact rows or short summaries by default; full long text belongs in edit/detail mode. Creation forms for memory-heavy modules may be folded behind an explicit expand control to keep long projects scannable. A later compact-UI refinement can add lightweight expand/collapse controls for outline and structured-memory summaries when authors need to read long world rules, timeline events, or foreshadows without entering edit mode.
- MVP acceptance treats pending updates with status `approved` as satisfying "批准后能写入正式记忆"; older `applied` fixture data remains compatible.
- The website-side contract is documented in `docs/station-cat-publish-api-contract.md`; the matching website environment variable is `NOVELFORGE_PUBLISH_TOKEN`.
- Still add a manual public-release checklist if this build will be uploaded outside local sharing.
- Keep WeChat publishing manual; distribution hardening must not introduce automatic WeChat publishing.

The next useful product phase is:

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
- Produce WeChat-ready layout exports from author-confirmed chapter text.
- Export project data as Markdown or JSON.
- Show the project-level MVP acceptance dashboard.
- Pass `npm run mvp:acceptance`, which creates a temporary full-flow project, reconnects SQLite, verifies core records, and cleans up.
