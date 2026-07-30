# Project Memory

## Product Identity

NovelForge AI is a local single-user writing workbench for serialized-novel and
complete-short-story and linked-story-series authors, especially WeChat public account fiction authors,
web novel writers, and content studios.

The product is not just a text generator. Its core value is helping authors maintain million-word continuity through structured memory, versioned settings, character state tracking, foreshadow management, timeline tracking, AI generation records, pending update review, and continuity checks.

## Repository Policy

- The canonical repository is `https://github.com/xdgf558/novelforge-ai`.
- The repository is publicly visible for transparency, evaluation, and
  collaboration, but it is not currently open source. Source use remains
  governed by the source-visible, all-rights-reserved `LICENSE`.
- Public repository automation must keep production dependency auditing,
  tests, type checking, builds, desktop smoke checks, and both acceptance
  suites green.
- GitHub private vulnerability reporting, dependency alerts, secret scanning,
  push protection, and protected `main` changes are expected repository
  controls.
- Never commit API keys, publishing tokens, `.env` files, SQLite databases,
  backups, author manuscripts, generated assets, logs, or packaged desktop
  applications.
- The original local product notes are not required to build or review the
  public project. Committed project memory and design documents are the source
  of truth.

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
- Immutable project work types for long-form serials and short stories; legacy
  projects default to long-form serials.
- Short-story blueprint workspace with ten formal planning fields, review-only
  AI generation, explicit adoption, and blueprint version history.
- Short-story writing-unit planning can generate one review-only editable
  draft for the current unit from the formal blueprint, bounded series memory,
  setting, characters, and prior units. It pre-fills the unit title plus five
  planning fields; no formal unit is written until the author reviews and
  submits the normal create form, which atomically adopts and links the source
  AI task.
- Short-story project settings provide explainable writing-style presets for
  rational urban mystery, engineering adventure, logical thought experiment,
  and reality-dislocation stories. Reference-author names remain UI-only;
  model context receives generic rules for rhythm, explanation density,
  suspense, dialogue, and ending shape plus an originality boundary.
  Applying a preset only fills the existing editable `styleSample` and
  `emotionalTone` fields, preserves custom author notes, and becomes formal
  only through the normal versioned setting save. No separate preset table or
  automatic formal-memory write exists.
- Narrative perspective is an independent formal setting shared by long-form
  serials and short stories, with
  immersive third-person limited, first-person experiential, multi-character
  limited, and objective-camera options. It controls viewpoint access and
  information boundaries without changing writing style, remains editable
  before the normal versioned save, and is read by the applicable planning,
  prose, polish, and review paths for both work types. Project-setting AI
  cannot draft or overwrite it, and existing projects remain unset until the
  author explicitly chooses or writes a rule.
- Short-story whole-story review workspace with bounded confirmed-unit context,
  seven closure dimensions plus saved-perspective consistency when configured,
  unit-bound suggestions, source-text staleness checks, and manual-only author
  resolution.
- Short-story complete-manuscript export with deterministic confirmed-unit
  assembly, three unit-boundary strategies, copy/TXT/Markdown output, and a
  visible 6,000-80,000 word-range check. Fanqie upload remains manual.
- Series-short-story parent workspaces that keep every `short_story` project
  independently readable while adding ordered membership, shared worldview,
  continuity rules, recurring elements, long-term mysteries, per-story series
  progression notes, and accumulated core-character state. Series memory is
  author-maintained formal context: generation and whole-story review may read
  it, but AI cannot create or update it silently. Current-story prompts receive
  only prior confirmed progression notes, never future-entry notes.
- Series creative-bible DOCX import is local and deterministic. It reads
  headings, paragraphs, lists, and tables into an editable draft for the six
  existing series fields; only the normal explicit create action makes that
  draft formal series memory. The business file limit is 10 MiB, the Server
  Action transport limit is 12 MiB for multipart overhead, and imported fields
  are capped at 12,000 characters with visible warnings. The current import
  does not call AI or automatically create characters, member projects, or
  individual story records from planned-story sections.
- Cross-work-type lifecycle hardening: short stories expose complete project
  Markdown/JSON backups; local desktop migration preserves existing projects as
  `serial_novel`; backup snapshots retain short-story blueprints, units, formal
  AI-task references, and review records; hard deletion remains explicit and
  project-scoped.
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
- Missing-target character suggestions fail closed by default. When extraction
  identifies a first-appearance name absent from formal characters, it becomes
  a reviewable create with no model-supplied ID. Historical unmatched character
  updates may be approved as a new role only through the explicit
  `作为新角色批准` checkbox; the created character ID and version are linked
  back to the approval record.
- Basic continuity check
- AI task records
- WeChat and Fanqie layout export for manual platform publishing
- Markdown/JSON project export
- Local persistence
- Successful Station Cat personal-site chapter uploads automatically mark the
  synced local chapters as `published` and create chapter version snapshots; AI
  or failed publish attempts must not silently change chapter status.
- Serial volume, story-unit, and chapter outline lifecycle labels are
  deterministically reconciled from their covered chapter range. Confirmed
  `final` / `published` coverage marks bounded outlines complete, later edits
  may return them to active, archived outlines remain untouched, Station Cat
  publishing triggers the same synchronization, and a forward migration repairs
  stale labels in existing desktop databases.
- When every current story-unit outline is complete but the project is not yet
  ready to finish, the outline workspace recommends the next starting chapter
  and can generate one review-only next-unit draft. It never creates formal
  outline memory automatically; the author must copy, review, and save the
  formal unit.
- Chapter beat generation surfaces due or attention-needed foreshadows as
  “本章建议处理伏笔” so the AI can plan recovery, staged progress, or an
  explicit deferral. This is only planning context; formal foreshadow status
  still changes only after author action in story memory.
- Chapter summary generation automatically audits bounded, relevant unresolved
  foreshadows against the confirmed final text. Evidence-backed advance or
  resolve signals become source-hash-bound pending updates; they never mutate
  formal foreshadow memory until author approval. Existing projects can run a
  historical audit over every unresolved foreshadow in sequential bounded
  batches, and authors may batch-confirm only current, high-confidence resolve
  candidates.

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
9. System surfaces due or attention-needed foreshadows for this chapter.
10. AI generates chapter beats with those foreshadows as planning context.
11. User confirms beats.
12. AI generates chapter draft.
13. User edits draft.
14. AI optionally polishes text.
15. User confirms final text.
16. AI generates chapter summary and automatically queues evidence-backed foreshadow advance/recovery candidates for review.
17. AI extracts other pending setting updates.
18. User approves, rejects, edits, or batch-confirms high-confidence foreshadow recoveries.
19. AI runs continuity check.
20. User exports WeChat-ready or Fanqie-ready layout/copy from confirmed chapter text.
21. User publishes manually and moves to next chapter.

## Database Memory Baseline

Prioritize these tables early:

- `projects`
- `project_settings`
- `setting_versions`
- `short_story_blueprints`
- `short_story_blueprint_versions`
- `short_story_series`
- `short_story_series_entries`
- `short_story_series_characters`
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
- The default AI connection remains the structural/editorial model route, intended for planning, outlines, beats, summaries, continuity checks, and other management tasks. Chapter drafts may use a task-level OpenAI-compatible route such as Kimi K2.6; chapter polish and short-story whole review may use the polish route with Kimi K3. A blank polish model suggests `kimi-k3`, while explicitly saved K2.6 routes remain unchanged. Authors may explicitly let polish reuse the draft route's Kimi API Key and Base URL; sharing never activates silently, and a dedicated polish key takes precedence. K3 Chat Completions requests add top-level `reasoning_effort: "max"`; other model payloads remain unchanged. When a task route has no effective saved API key, it safely falls back to the default AI connection. Routed tasks store a non-secret execution snapshot with route source, task type, model, and base URL in `ai_tasks.inputJson`, while API keys remain only in local config. Long-form writing and deep editorial tasks (`chapter_draft_generation`, `chapter_polish_generation`, and `short_story_whole_review`) use Chat Completions SSE streaming with a 10-minute inactivity timeout: each received chunk resets the timer, token usage may come from top-level or provider-specific nested usage fields, and output becomes adoptable only after `data: [DONE]`. Planning, extraction, and continuity tasks stay non-streaming. Long planning or memory-audit tasks (`chapter_beat_generation`, `outline_generation`, `ending_planning_generation`, `pending_update_extraction`, and `foreshadow_recovery_audit`) use a 5 minute model request timeout because DeepSeek-style planning/JSON extraction responses can exceed 120 seconds even with compact inputs; shorter structural extraction/check tasks keep the default 120 second timeout. Timeout-aware direct `Agent` and proxy `ProxyAgent` dispatchers must set headers/body timeouts to the caller timeout plus a 30-second transport grace period, so Undici's roughly 300-second defaults cannot preempt longer AI tasks.
- Structured tasks should use JSON Schema:
  - Project setting generation
  - Character generation
  - Short-story blueprint generation
  - Short-story writing-unit plan generation
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
- For a short story assigned to a series: bounded shared series rules, active
  core-character state, and prior-entry progression notes up to the current
  story. Do not leak later-entry notes into an earlier story.
- For short-story writing-unit planning: the formal blueprint, bounded series
  context, relevant setting and characters, and prior units only. Generate one
  editable unit at a time and never read later units into an earlier plan.

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

Pending update extraction should not send all auxiliary chapter planning context
unbounded. The model still receives the full confirmed final text as the source
of truth, but bulky helper context such as chapter beats, project description,
WeChat positioning, notes, and the latest summary output should be clipped in the
actual prompt text as well as in `ai_tasks.inputJson`.

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
- Short Story Phase 1: backward-compatible project work types, immutable type
  selection at creation, a focused short-story dashboard/navigation shell, and
  work-type preservation in project and website publish exports.
- Short Story Phase 2: one formal ten-field short-story blueprint per project,
  review-only AI blueprint drafts, explicit transactional adoption, versioned
  manual/adopted/restored snapshots, and project export coverage.
- Short Story Phase 3: shared `Chapter` records are active internal writing
  units with bounded count recommendations; scene movement, conflict, turn,
  payoff movement, and word-target planning; unit-aware CRUD/history/export
  surfaces; and short-story beat, draft, and polish contexts that combine the
  formal blueprint with continuous-prose safeguards. Short-story unit writes
  must not auto-link serial storylines or synchronize serial outline status.
- Short Story Phase 4: `short_story_whole_review` tasks assemble every confirmed
  writing unit under a bounded whole-story prompt budget and check motivation,
  chronology, repeated information, pacing gaps, opening promises, reversal
  setup, and unresolved payoffs. Parsed suggestions reuse `continuity_reports`,
  bind to stable unit ids and per-unit final-text hashes, and remain manual-only:
  generic one-click replacement and continuity fix-patch generation must reject
  this task source.
- Short Story Phase 5: `/projects/[projectId]/manuscript` deterministically
  assembles only `final` / `published` writing units with non-empty `finalText`.
  It supports no unit headings, neutral separators, or retained short headings;
  removes duplicate unit titles, internal work labels, known AI structure
  traces, and serial-only follow hooks without mutating source records; and
  provides copy, TXT, and Markdown outputs with visible 6,000-80,000 word-range
  and omitted-unit warnings. There is no export-history write or automatic
  Fanqie upload in this phase.
- Short Story Phase 6: the manuscript workspace also provides full project
  Markdown/JSON exports, while project editing links directly to local backup
  creation before hard deletion. `npm run work-types:acceptance` is the durable
  regression for legacy desktop migration, serial/short-story coexistence,
  SQLite snapshot preservation, formal task retention, cascade deletion, and
  foreign-key/database health. `npm run responsive:smoke` covers the key export
  and destructive-management layouts at desktop and mobile viewport sizes.
  Final installer creation remains a post-review, post-merge release step.
- Narrative-perspective follow-up: `ProjectSetting` stores one
  `narrativePerspective` rule independently from `styleSample` for both long-form
  serials and short stories. Four explainable options cover immersive
  third-person limited, first-person experiential, multi-character limited, and
  objective-camera narration. Applying a choice only edits the browser form and
  the normal versioned setting save remains the formal-write boundary.
  Project-setting AI may read but cannot draft or overwrite the field. Serial
  outline, beat, draft, normal/segmented polish, and chapter-continuity prompts
  consume it; short-story blueprint, unit-plan, beat, draft, polish, and
  whole-story-review prompts continue to consume it. Applied presets use a
  stable generic id marker; the prior short-story id and label markers remain
  recognizable without rewriting existing setting text or history snapshots.
  Whole-story review exposes evidence-backed viewpoint-violation and
  unauthorized-knowledge-leak counts, while serial continuity checks classify
  evidence-backed violations as `narrative_perspective`. All reports remain
  advisory and manual-only. No schema migration was required because the
  nullable formal field already existed.
- Unified workbench UI refresh: the app shell, project library, series library,
  long-form and short-story dashboards, and chapter workspace now use one
  compact dark-teal writing-workbench system. The visual treatment is flat
  rather than glassy: cyan represents AI/local activity, amber represents
  author actions and primary commands, cream is primary reading text, and muted
  parchment is secondary text.
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
- Retired Phase 24: AI-assisted cover image generation is no longer exposed or
  callable. The publish page keeps only local cover preview/upload/replace/delete,
  and `/ai-settings` no longer shows image-model credentials. Historical
  `cover_image_generation` tasks, candidate cleanup compatibility, schema fields,
  and dormant local `IMAGE_*` values remain non-destructively available for old
  databases and backups.
- Phase 25: audiobook export MVP, including local TTS settings, Google Gemini TTS provider support, Google voice-name selection, voice preview playback, chapter-level segmented audio export, `audio_exports` / `audio_export_segments`, failed-segment retry, local export folder opening, and controlled `/audio-assets` playback.
- Phase 29: ending planning and closure readiness, including an outline-module “终局规划 / 收尾检查” panel, local ending-readiness signals from total word target, chapter progress, outline status, and unresolved foreshadows, plus logged `ending_planning_generation` AI draft tasks. AI may suggest remaining chapters, final story units, foreshadow recovery priorities, character endings, and conclusion tone, but it must not automatically modify formal outlines, foreshadows, timelines, or story memory. Each new plan records its generation chapter and a locally estimated validity window derived from remaining target words and observed chapter pace. A missing word target uses a neutral ten-chapter estimate plus buffer. Outline generation also recomputes the exact live manuscript word budget for every request. The one shared chapter-capacity estimator uses observed pace first, then the configured minimum/maximum average, then a 5,000-word default. When the target has been reached, or the remaining budget fits within one estimated chapter, the next chapter should finish the work and a newly generated ending plan receives a one-chapter window. This live constraint overrides older ending-plan schedules and longer formal outline ranges as generation guidance. It remains separate from foreshadow readiness: unresolved and high-importance counts stay visible, and the author may skip the hard ending instruction for one chapter-outline generation. Volume and story-unit generation are unavailable at this boundary until the target changes. Unresolved foreshadows may be prioritized, faded, or left open, but cannot silently extend the manuscript, and no new branches or next-chapter hook may be added when the constraint is active. After completion, only the latest non-empty plan in the `not_reviewed` or `adopted` state may be passed to later volume, story-unit, and chapter outline generation, and only when the target lies after the generation point and within that window. The reference is a non-overlapping, ending-preserving head/middle/tail excerpt capped at 6,000 characters and wrapped as untrusted model-output data. Authors may skip it for one outline generation or globally stop it by marking the latest plan ignored; an unusable latest plan never falls back to an older one. Expired references are not injected, and the outline page identifies their last recommended chapter and directs the author to regenerate the plan. Page banners and volume, story-unit, and chapter generation all use the shared next-target helper, considering written chapters and non-archived chapter outlines, so displayed expiry and actual prompt injection cannot disagree. The page also displays remaining estimated chapters and an explicit alert when the live budget recommends the next chapter finish. Formal outlines, settings, and finalized chapters always win conflicts and are never rewritten automatically. Prompt loading and retention share deterministic `createdAt` plus ID ordering; retention protects only the latest usable ending plan through a targeted one-row query and never bulk-loads every AI task's `outputText`. The outline page loads ending-plan history separately so the current reference remains reviewable and rejectable. Existing outline prompt template rows upgrade to v4 on demand through `ensureDefaultPromptTemplate`; no schema migration is required.
- The Station Cat reader-feedback feature is retired. Chapter pages no longer
  fetch or display analytics/insight snapshots, and beat/draft generation does
  not load feedback or include it in prompts and AI task context. Existing
  `readerRemoteId`, `chapter_analytics`, and `chapter_insights` schema remains
  only for non-destructive compatibility with older desktop databases and
  backups; no active product path reads or writes it.
- Continuity one-click repair: open continuity reports can offer an author-triggered “一键修复正文” button when the suggested fix contains an explicit replacement such as “将 A 改为 B”; the action updates the linked chapter final text, creates a chapter version snapshot, and marks the report resolved. Vague or structural fixes can generate logged `continuity_fix_patch_generation` AI candidate patches for author review, but those candidates never directly modify chapter text, formal settings, characters, timelines, foreshadows, or structured memory.
- Phase 26: WeChat layout export enhancement on the project publish page. The deterministic formatter reads chapter text in `polishedText -> finalText -> draftText` order, supports “微信公众号正文粘贴版” and “微信公众号完整发布版”, and provides one-click copy plus TXT/Markdown/HTML downloads. Default behavior is “只排版，不改文”. The export panel now has a separate logged `wechat_layout_candidate_generation` AI task for title/opening/ending follow-hook candidates; generating candidates never mutates formal chapter text, legacy publish packages, or story memory, and applying a candidate only fills the local export form.
- Phase 27: local maintenance and recovery. `/ai-settings` can create local ZIP backups from a transactional `VACUUM INTO` SQLite snapshot plus generated asset roots while excluding local `.env` secrets; asset files are streamed into the ZIP rather than buffered in memory. Project maintenance is archive-first with restore support and guarded hard deletion; setting history snapshots can be restored into the current setting with a new rollback version; project setting AI now supports draft-only generation, completion, and optimization task types; and the AI task page has basic prompt-template view/copy/duplicate/enable/disable/reset controls. AI generation now resolves the highest-version active prompt template for a key before falling back to the default template.
- Phase 28: long-form management efficiency, progress tracking, and cost awareness. Character library search/filtering, character appearance records, structured memory filters with expandable long text, outline progress, outline status sync from chapter lifecycle, daily AI usage aggregation, and non-blocking daily token budget reminders are implemented.
- Phase 29 multi-storyline foundation: formal `storylines` memory plus project-scoped links to characters, foreshadows, chapters, and outlines. Authors manage storylines manually from `/projects/[projectId]/storylines`; chapter detail pages and outline cards show associated storylines. AI does not auto-create or auto-update storylines. Confirmed storyline chapter ranges may automatically add chapter relation rows because the author has already approved the range.
- Phase 30A AI storyline draft generation: `/projects/[projectId]/storylines` can start logged `storyline_generation` tasks that suggest storylines from project setting, characters, foreshadows, recent chapter summaries, outlines, and existing storylines. Candidate storylines may fill the formal form, but formal `storylines` rows and relation rows are written only after explicit author confirmation.
- Storyline completion remains safe and semi-automatic: the board may suggest “可能可以收束” when a storyline reaches its ending chapter or its linked chapters are all finalized/published, but the author must manually mark it completed or archive it. The storyline board shows the latest 3 formal storylines by default and folds older ones into history.
- Storyline chapter relations are semi-automatic from confirmed metadata: when a storyline has both `startChapter` and `endChapter`, saving/adopting it merges existing chapters in that inclusive range into “推进章节”; creating or editing a chapter adds the chapter to non-archived storylines whose explicit range contains that chapter number. The sync is additive and must not silently remove manual chapter links.
- Automatic foreshadow recovery audit: chapter summaries now compare confirmed
  final text with a bounded, ranked set of unresolved formal foreshadows and
  create source-bound pending advance/resolve updates only when the model
  returns stable target IDs plus explicit evidence. The memory page can audit
  all legacy unresolved foreshadows in sequential batches of 12, skipping
  targets that already await review and stale chapter summaries. Only current
  high-confidence resolve candidates support one-click batch approval; medium
  confidence and advance candidates remain individually reviewable. Formal
  foreshadows still change only after an author action.
- Modular refactor Phase 1 establishes the target modular-monolith boundaries in `docs/module-refactor-architecture.md`. Future refactor phases should keep route files focused on request parsing, redirects, and revalidation; move durable business rules into `lib/<domain>/`; keep AI orchestration in `lib/ai/`; and put shared Next server-action glue in `lib/server-actions/`. Phase 1 also centralizes repeated project-existence guards in `lib/server-actions/project-guards.ts`.
- Modular refactor Phase 2 splits the oversized chapter server action into `lib/chapters/` domain modules. Chapter record writes and version snapshots live in `lib/chapters/records.ts`; chapter AI task startup lives in `lib/chapters/ai-generation.ts`; chapter beat/draft/polish/summary context loading lives in `lib/chapters/context.ts`; outline status sync lives in `lib/chapters/outline-status.ts`. The route action should stay responsible for form parsing, `notFound` translation, revalidation, and redirects.
- Modular refactor Phase 3 splits outline, storyline, and structured-memory route actions into domain services. Formal memory record writes and relation guards live in `lib/memory/records.ts`; storyline writes, relation replacement, duplicate checks, range-based chapter auto-linking, and completion/archive state changes live in `lib/storylines/records.ts`; outline CRUD lives in `lib/outlines/records.ts`; outline active-task helpers and previous-ending context live in `lib/outlines/ai-tasks.ts`; ending-planning foreshadow selection lives in `lib/outlines/ending-planning.ts`. Keep formal story-memory changes author-controlled: these services may write only from existing explicit author actions, not from AI suggestions directly.

## UI Direction

- Current product UI direction is a dark local writing workbench, not a generic light SaaS dashboard.
- Primary feel: nocturne writing room, local memory vault, warm editorial tooling.
- Use very dark teal/black surfaces, warm gold CTAs and borders, cyan local/active accents, cream primary text, and muted parchment secondary text.
- Keep surfaces flat, quiet, and operational. Avoid gradients, translucent
  glass panels, oversized marketing typography, decorative cards, and nested
  cards. Individual records, modals, and framed tools may use restrained
  4-8px-radius panels.
- The persistent desktop shell is a 210px navigation rail, a 50px command bar,
  a flexible content workspace, and an optional 322px AI run console. On
  smaller screens the navigation and AI console become independent drawers;
  neither may force horizontal page overflow.
- Organize project tools by the author's working phases: `准备`, `写作`, `审校`,
  and `发布`. Long-form novels, short stories, and short-story series use the
  same shell and interaction vocabulary while exposing only their relevant
  tools.
- The top bar owns project-aware breadcrumbs, `Cmd/Ctrl+K` command search,
  review notifications, AI status, and the AI-console toggle. Do not duplicate
  these global controls inside page bodies.
- The AI run console is a read-only projection of existing `AiTask` records.
  Its progress stages are derived status labels, not a second task engine.
  Opening, closing, or reading the console must never approve AI output or
  mutate formal story memory. Mobile navigation and AI-console drawers must
  move focus to their close control when opened, leave the accessibility tree
  when closed, and return focus to their trigger. Task labels and status tones
  live in `lib/ai/task-presentation.ts`; use the real database task keys, and
  never present `cancelled` as successfully completed.
- Global review notifications are grouped by `projectId` through
  `lib/app-shell-review-counts.ts`. Every displayed count must link to the same
  project that owns those pending updates or continuity reports; do not combine
  global totals with a current-project destination.
- Project and series indexes should prefer dense rows, status summaries, and
  recent activity over large decorative tiles. Chapter detail should keep the
  author oriented with direct jumps between beats, draft, polish, summary,
  memory review, and continuity review.
- Keep the first screen as the usable project dashboard. Do not turn it into a marketing landing page.
- Custom story-specific SVG illustration components live in `components/story-illustrations.tsx` and can be reused for future empty states or dashboard panels.
- `components/app-shell.tsx` loads serializable shell data;
  `components/app-shell-frame.tsx` owns the responsive client shell and global
  interactions; `components/app-shell-navigation.tsx` owns phase navigation;
  and `components/ai/ai-run-console.tsx` renders AI task visibility.
- `app/globals.css` contains the shared `nf-*` token and layout system plus
  restrained legacy overrides so older MVP pages stay visually aligned until
  they receive dedicated component cleanup.

## Next Phase

The local MVP feature set, acceptance hardening pass, macOS packaging prototype, distribution hardening, first dark UI refresh, in-app AI connection settings, software-side publishing platform preparation, Station Cat API contract adapter, real Station Cat import integration, and local project cover upload are implemented:

- Production app icon assets exist under `build/`.
- macOS packaging now uses Developer ID signing, hardened runtime, and signed DMG/ZIP artifacts.
- Historical Phase 14 distribution validation produced a notarized and stapled DMG, but the current product is for personal local use. Do not run Apple notarization by default for future rebuilds; produce the signed app payload first, then hand off a clean PKG installer unless the user explicitly asks for DMG/ZIP artifacts.
- Packaged runtime uses `app.asar.unpacked`; keep generated Prisma client copying in `scripts/after-pack.cjs` because electron-builder does not reliably include the `node_modules/.prisma` dot directory from glob rules alone.
- Desktop startup must not run Prisma CLI commands from inside the packaged app bundle. DMG volumes are read-only, and Prisma CLI can try to mutate `node_modules/@prisma/engines` under `app.asar.unpacked`, causing `EROFS`. Use `runDesktopMigrations` in `desktop/runtime.cjs`, which reads bundled `prisma/migrations/*/migration.sql`, applies SQL through Prisma Client to the user data SQLite database, and records `_prisma_migrations`.
- `npm run desktop:dist:mac` produces the signed local app payload plus DMG/ZIP artifacts and skips notarization; use the app payload to build the formal `/Applications` PKG handoff.
- `npm run desktop:dist:mac:notarized` exists only for an explicit future public-distribution request; do not use it for normal personal-use rebuilds.
- Current source app version is `0.1.109`; the latest personal-use macOS installer is `release/desktop/NovelForge-AI-0.1.109-mac-arm64.pkg`. This release has a Developer ID Application signed payload and a Developer ID Installer signed PKG with trusted timestamps, but remains unnotarized by personal-use policy. Future handoff should leave only the final `release/desktop/NovelForge-AI-<version>-mac-arm64.pkg` in the delivery folder unless the user explicitly asks for DMG/ZIP/update metadata.
- Short-story development follows `docs/short-story-development-plan.md`.
  `Project.workType` is `serial_novel` or `short_story`, is selected at project
  creation, and must not be changed by the general edit form. Existing records
  default to `serial_novel`. Shared setting, character, memory, AI-task, and
  version infrastructure should be reused; long-form-only tools are hidden from
  the short-story navigation. `Chapter` is the active internal writing-unit
  foundation rather than a duplicate prose stack. Short-story units persist
  `unitSceneMovement`, `unitConflict`, `unitTurn`, `unitPayoffMovement`, and
  `unitWordTarget`; their beat, draft, and polish contexts use the formal
  blueprint and continuous-prose safeguards instead of serial outlines,
  storylines, repeated openings, or artificial chapter hooks.
  Short-story setting pages may also fill `styleSample` and `emotionalTone`
  from an explainable UI preset. The saved generic guide is included in
  blueprint generation, unit planning, drafting, polishing, and whole-story
  review; inspiration-author labels must not be copied into model prompts.
  Writing-style presets must remain free of viewpoint instructions. A separate
  `narrativePerspective` field controls viewpoint anchor, information access,
  other-character interiority, experiential distance, and scene-switch rules
  for both work types. Its four explainable options can be combined with any
  style, are stored through the same versioned author save, and are read by
  long-form outline/chapter generation plus continuity checks as well as every
  short-story generation/review path. Setting AI must never generate, replace,
  or delete this author-controlled field. Machine recognition uses a stable
  generic id marker with backward-compatible legacy short-story markers, so
  later UI label changes cannot invalidate saved preset detection.
  `/projects/[projectId]/story-review` is short-story-only and uses the shared
  AI-task/continuity-report infrastructure. It requires a formal blueprint and
  at least two confirmed units, preserves unit source hashes for stale-result
  detection, and never writes confirmed prose automatically. When a formal
  narrative perspective exists, review output also records total viewpoint
  violations and the unauthorized-knowledge-leak subset; nonzero metrics must
  be backed by a unit-bound report and source evidence.
  `/projects/[projectId]/manuscript` is also short-story-only. It is a pure local
  export surface: only confirmed `finalText` is eligible, output cleanup is
  deterministic and in-memory, and missing/unconfirmed units remain visible
  instead of silently falling back to draft or polished candidates.
- Phase 1 of the Fanqie template/export work is implemented as a deterministic core library: `lib/fanqie-layout-export.ts` selects正文 from `polishedText -> finalText -> draftText`, cleans duplicate chapter titles, Markdown, completion markers, web tails, and AI outline traces, counts CJK-aware words, and returns validation/split-manifest helpers.
- Phase 2 of the Fanqie template/export work adds a publish-page 番茄小说正文粘贴版 panel. It supports chapter selection, source selection, optional title inclusion, validation display, copy, and TXT download. It is still local/manual only: no database writes, no automatic Fanqie upload, no ZIP package generation, and no hidden chapter rewrites.
- Phase 3 of the Fanqie template/export work adds the publish-page 番茄分章 TXT 包 path. The panel now supports template switching, 3000/4000/5000/custom target word counts, split preview, `拆分清单.md`, and browser-side ZIP download containing the manifest plus generated TXT files. This remains deterministic local export only: no database export-history table, no automatic Fanqie login/upload, and no silent chapter rewrites.
- Phase 4 of the Fanqie template/export work adds target-platform selection to chapter draft and chapter polish generation. The `通用连载` path remains the default; choosing `番茄小说` injects platform-specific writing constraints into the existing `chapter_draft_generation` or `chapter_polish_generation` task context and records the template in `ai_tasks.inputJson` / `inputContextSummary`. This does not add new task types, does not rewrite chapter text automatically, and still requires explicit author adoption.
- Phase 27 added local backup creation under `/ai-settings`; backups are ZIP files containing a `VACUUM INTO` SQLite snapshot and generated assets, and deliberately exclude local `.env` API keys, TTS keys, image keys, proxy settings, and Station Cat tokens. Keep this invariant if backup/restore is extended later, and keep asset ZIP writing streaming rather than all-in-memory.
- Chapter summaries are durable domain records in `chapter_summaries`, not
  disposable AI-task output. Every new summary stores the SHA-256 fingerprint of
  the final text that produced it. Pending updates and continuity reports carry
  the same fingerprint and must not be applied to a changed final text.
- AI-task retention may prune only unreferenced disposable logs. Never delete a
  chapter summary task or a task still referenced by a pending update, continuity
  report, publish package, or durable summary merely to satisfy the visible task
  history limit.
- AI context limits are prompt budgets, not alphabetical database selection.
  Load the eligible project records, rank explicit mentions and domain priority
  first, then slice. World-rule risk and foreshadow importance/status must use
  explicit ranks rather than string sort order.
- Station Cat publish runs use a local outbox: save the request and stable
  idempotency ID before the remote call, then advance sync state and chapter
  status in the completion transaction. Do not put volatile timestamps into the
  idempotency signature.
- Chapter numbers are unique within a project. New schema changes must keep
  migrations aligned with `prisma/schema.prisma`, and acceptance checks must use
  a newly migrated temporary database rather than relying on `prisma/dev.db`.
- Project deletion should remain archive-first. The default project list shows active projects; archived projects are available through the project-status filter and can be restored from the edit page. Hard delete must keep a visible backup acknowledgement and typed confirmation.
- Prompt template management is basic by design: authors can view/copy, duplicate a version, enable/disable, and reset to defaults. Do not add arbitrary browser-side API key access or hidden prompt mutation. AI calls should use the highest-version active template for a key, but if the code ships a newer default template version than the currently active project template, `ensureDefaultPromptTemplate` may auto-upsert and use that newer default, then mark older active versions for the same key inactive. User-created higher-version templates still remain preferred.
- AI daily usage aggregation lives in `ai_usage_daily` and should survive `ai_tasks` retention pruning. `markAiTaskCompleted` records one completed call grouped by project, local date, task type, and model. The project-level `aiDailyTokenBudget` is a reminder threshold only: generation buttons may show warnings near or above the threshold, but should not hard-block the author unless a future phase explicitly designs strict budgeting.
- Formal handoff should use a `.pkg` installer that installs `NovelForge AI.app` into `/Applications`; a DMG is only a drag-and-drop/test package because the app inside a DMG can be launched directly.
- Recheck code-signing identities for every release instead of assuming the login keychain is stable. When valid Developer ID Application and Installer identities are available, sign both the Electron app and installer, verify the installer chain with `pkgutil --check-signature`, and verify the app expanded from the final PKG with system-level `codesign --verify --deep --strict`; source-path verification alone is insufficient. If identities are missing or signing returns `errSecInternalComponent`, do not silently downgrade the artifact: obtain or rely on explicit author approval before using an ad-hoc app signature and unsigned PKG, and record that limitation in the release log. Apple notarization uploads the private artifact externally, so do not notarize unless the user explicitly authorizes that upload. Until notarized, a valid Developer ID build will report `Unnotarized Developer ID`; an ad-hoc/unsigned fallback will instead be rejected as having no usable distribution signature. Also run packaged desktop migrations against an isolated SQLite database. Do not run a real overwrite install into `/Applications` for verification unless the user explicitly approves replacing the installed local app.
- Pending update review forms now show an in-flight state while approving/rejecting, redirect back with a visible result banner, and processed cards show the handling time plus whether the suggestion wrote to formal memory.
- Pending-update target IDs are authoritative only after project-scoped validation. If extraction returns a real character, world-rule, foreshadow, or timeline ID with the wrong `targetType`, normalization may correct the type only when that ID belongs to exactly one formal memory layer in the bounded context. For older stored suggestions whose normalized ID was removed, approval may recover the original ID from `payloadJson` only after rechecking all four tables inside the current project transaction; create suggestions, unknown IDs, and ambiguous matches must remain blocked. Persist the recovered canonical type and ID on the processed pending-update audit row.
- Project dashboard pending-update cards should show workflow state counts (`pending`, `approved`, `rejected`) rather than only total suggestions, and the sidebar creative-tool entries are real project-context links when a current project id exists in the route.
- Project dashboard status timestamps must distinguish project metadata time from writing activity time. `projects.updatedAt` only means title/description/basic project fields changed; use `loadProjectActivitySummary` / `loadProjectActivitySummaries` for “最近活动” because it aggregates chapters, settings, characters, AI tasks, pending updates, continuity reports, publish packages, and Station Cat publish runs.
- Project activity date reads must tolerate mixed historical SQLite timestamp formats. Older user databases can contain both millisecond timestamps and `YYYY-MM-DD HH:mm:ss` strings; avoid Prisma DateTime aggregates for cross-table activity summaries because they can throw `P2023` on legacy rows.
- Sidebar creative-tool entries should also work from non-project routes by using the most recently updated project as a fallback. The fixed desktop sidebar remains scrollable and above the main content layer (`z-30` currently), but the old bottom local-persistence card and decorative sidebar art are intentionally hidden so navigation stays compact.
- Before reporting a desktop package as ready, verify the packaged app still uses `runDesktopMigrations` from `desktop/runtime.cjs`, does not contain Prisma CLI `migrate deploy` startup code, and the installer payload targets `/Applications/NovelForge AI.app`.
- AI connection config is now editable at `/ai-settings`; the app writes the local `.env` config and reads `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` dynamically on the server.
- Legacy image-generation config keys may remain in an existing local `.env`, but
  they are no longer shown or saved by `/ai-settings` and no active product path
  calls an image-generation endpoint.
- TTS / audiobook export config is now editable at `/ai-settings`; the same local `.env` stores `TTS_PROVIDER_ID`, `TTS_API_KEY`, `TTS_API_BASE_URL`, `TTS_MODEL`, `TTS_VOICE_ID`, `TTS_VOICE_NAME`, `TTS_LANGUAGE_CODE`, `TTS_OUTPUT_FORMAT`, and `TTS_STYLE_PROMPT`. The active user-facing providers are Google Gemini TTS and GLM-TTS. Google defaults to `https://generativelanguage.googleapis.com/v1beta`, `gemini-2.5-flash-preview-tts`, voice `Kore`, language `cmn`, and WAV output. GLM-TTS defaults to `https://open.bigmodel.cn/api/paas/v4`, model `glm-tts`, voice `female` / `彤彤（默认）`, and WAV output. PPQ remains available only as legacy code for old records/tests and is no longer a user-facing audiobook provider.
- The TTS voice picker should remain explicit: refreshed voice lists show Google Gemini's built-in voice names and can auto-select the first voice only for immediate preview convenience, but the author can click "保存当前音色" to persist the selected `TTS_VOICE_ID` / `TTS_VOICE_NAME` into the local `.env`. Preview/export actions should fail with a clear missing-voice message when no voice name is submitted.
- Legacy PPQ audiobook settings must be migrated on read: old `TTS_PROVIDER_ID=ppq_tts`, `https://api.ppq.ai/v1`, ElevenLabs/DeepGram models, PPQ voice ids, and MP3 output should fall back to Google Gemini defaults. Do not carry an old PPQ API key forward as a Google Gemini API key.
- Google Gemini TTS preview and chapter export call `models/{model}:generateContent` with `responseModalities: ["AUDIO"]` and a `prebuiltVoiceConfig.voiceName`; returned PCM audio is wrapped as WAV before local storage. Gemini JSON responses can contain base64 audio and must be read with a content-length / streaming byte cap before JSON parsing, then validated again after base64 decode and WAV wrapping. Do not present MP3/OGG as active Google Gemini output choices unless a future Google endpoint supports them directly.
- Network proxy config is now editable at `/ai-settings` inside the AI connection section; the same local `.env` stores `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and `NO_PROXY`. Server-side OpenAI-compatible model calls, Google Gemini TTS, and Station Cat publishing use `createServerFetch`, which reads the local proxy config so GUI-launched desktop builds can access services that otherwise require the user's local proxy. Proxy selection must be protocol-specific (`HTTP_PROXY` for `http:`, `HTTPS_PROXY` for `https:`, `ALL_PROXY` as fallback) and must respect `NO_PROXY` for string, `URL`, and `Request` inputs. When using the proxy dispatcher, do not pass `AbortController.signal` directly into undici; keep caller-side timeout semantics in the wrapper to avoid premature `Request was cancelled` failures.
- Audiobook exports live under local export assets and are tracked by `audio_exports` plus `audio_export_segments`. Default chapter audio source selection reads the current public website chapter body from Station Cat using `GET /api/novelforge/chapters/:remoteChapterId/content` and the saved Station Cat Publish Token; `publish_sync_states.remoteId` is only the lookup bridge. Software-local sources (`polishedText -> finalText -> draftText`) remain manual fallback options. Gemini and GLM WAV segmentation should use the local audio byte budget rather than model context alone, so normal successful segments stay below `maxAudioSegmentBytes`. Exported audio files and preview files must not be written into formal story memory, chapter text, structured memory, or publish packages unless a future phase explicitly designs that flow.
- Audiobook export must stay cost-safe: do not allow a second pending/running export for the same project/chapter, enforce the active-export partial unique index with a friendly duplicate-export redirect, atomically lock failed/partial exports before retrying failed segments, stream TTS audio or audio-bearing JSON responses with a byte cap, reject non-audio 200 responses or mismatched audio signatures, and only allow unidentified `application/octet-stream` audio when the requested output format is raw `pcm`. Do not retry historical PPQ/legacy exports with the current provider; show a clear message and ask the user to create a fresh export. Serve exported chapter audio only through the project-scoped `/projects/[projectId]/audio-assets` route after confirming the segment belongs to that project. The global `/audio-assets` route is for short TTS previews only, and preview cleanup should keep local assets bounded. When every WAV segment succeeds, write a merged whole-chapter WAV path back to `audio_exports` while keeping segment files for retry/debug; deleting an export should remove its local audio directory as well as the database record.
- The publish page should treat the global Station Cat API settings as the default daily publishing path. The auto-created `Station Cat 全局配置` target is an internal sync-state record for remote IDs and publish runs, not a separate user-facing website backend. Project-specific publish targets should stay in the advanced optional area for alternate sites, test environments, or special endpoints.
- The legacy AI chapter publish-package UI is retired. Keep historical `publish_packages` data for export and Station Cat standard-package compatibility, but do not surface new generation entry points. Author-facing WeChat output should go through the deterministic “公众号排版导出” panel and optional `wechat_layout_candidate_generation` opening/ending/title candidates.
- The publish page has a deterministic WeChat layout export path for manual public-account publishing. It is separate from Station Cat upload: layout export can use draft/polished/final chapter text, normalizes format for copy/download, and must not imply automatic WeChat publishing.
- OpenAI's official base URL uses the Responses API, while custom OpenAI-compatible base URLs such as DeepSeek use `/chat/completions`. AI task failures should be recorded in `ai_tasks` and redirect back to the relevant page instead of surfacing a full Next.js application error page.
- Chapter detail pages auto-refresh while AI tasks are pending/running. Streamed long-form tasks update `AiTask.updatedAt` with throttled progress heartbeats, and stale chapter or short-story whole-review tasks are marked failed only after 15 minutes without activity so healthy long generations do not permanently lock buttons or get terminated mid-response.
- User-triggered AI generation should not block the UI while waiting for the model. Chapter beats, chapter drafts, chapter polish, summaries, pending update extraction, continuity checks, and WeChat layout candidates should start logged background tasks and return to a page that auto-refreshes. If a task needs follow-up writes, use a background completion callback after the task output is saved.
- Chapter prose generation should avoid repetitive AI template phrasing. Keep the shared prose style guardrails in chapter beat, draft, and polish contexts so future output reduces high-frequency “不是……而是……”“不是因为……而是因为……”“真正的……不是……而是……” and “不是……是……” patterns. For draft and polish generation, these should be framed as hard self-check requirements rather than soft style preferences: at most one necessary occurrence per chapter/segment, otherwise rewrite into concrete actions, details, reactions, dialogue, or cause-effect progression.
- AI chapter polish uses task type `chapter_polish_generation`. It reads the best available author text in this order: polished text, final text, draft text, so repeated polish starts from the author's current polished candidate instead of stale draft text. Generated output is saved in `ai_tasks` and only moves into `Chapter.polishedText` after explicit author adoption. Adoption must remain server-side idempotent (`not_reviewed` -> `adopted`) and must not directly overwrite `finalText`.
- Chapter polish prompt input has a single-call budget. New overlong polish requests should automatically create one logged `chapter_polish_generation` task that runs segmented polish in the background: split the best available source text into bounded segments, call the model sequentially for each segment with adjacent-segment context, then stitch successful outputs back into a complete polish candidate. The task must be adoptable only after all segments succeed; old head/middle/tail excerpt tasks remain preview-only and must not be adoptable into `Chapter.polishedText`.
- Adopting a polish candidate should move `draft` and `final` chapters to `revising` because `finalText` has not changed yet and the author still needs to explicitly finalize the new polished candidate. Keep `published` as `published` until a richer published-with-revision state exists.
- Chapter beat/draft/polish generation must avoid default day-by-day diary
  progression. Prompts and contexts should push the model toward conflict
  chains, clue chains, character choices, costs, relationship shifts, risk
  escalation, and foreshadow movement; routine days or transitions with no new
  narrative function should be skipped or compressed.
- `/ai-settings` redirects back with a saved-state message after AI or Station Cat settings are stored.
- The top toolbar and `/ai-settings` should show the current app version and release notes so the user can confirm which packaged version is installed.
- The Electron shell handles `Escape` at the window level to leave fullscreen or maximized state.
- Station Cat website publishing config is also global at `/ai-settings`; the same local `.env` stores `STATION_CAT_API_BASE_URL`, `STATION_CAT_PUBLISH_TOKEN`, and `STATION_CAT_DEFAULT_MODE`. The token remains server-only and masked in UI.
- Publishing targets remain available from `/projects/[projectId]/publish`, but Station Cat can now use the global config without manual per-project setup. The first global publish from a project creates/updates an internal `Station Cat 全局配置` target so `PublishRun` / `PublishSyncState` can still track preview URLs, remote IDs, and changed content hashes per project.
- Station Cat targets call `POST https://wwwstationcat.org/api/novelforge/import` when API Base URL and Station Cat Publish Token are configured; keep request tokens in the `Authorization` header only, never inside request JSON.
- Station Cat publish runs support an explicit upload scope from the publish page: all changed items by default, or one selected finalized chapter. The selected-chapter path filters `changedItems` before the website request and before sync-state advancement, so choosing chapter 2 does not implicitly upload the cover, project metadata, or chapter 1.
- The Station Cat specified-chapter dropdown is intentionally compact: it shows
  only the latest five publishable chapters, with older chapters hidden from the
  send form. WeChat/Fanqie manual export selectors may still show their own
  broader chapter choices.
- Website publish bodies are cleaned in the standard publish package: leading duplicate Markdown chapter titles, leading `---`, and AI draft structure headings such as `开场钩子` / `节拍1` / `节拍二` are stripped before Station Cat upload. This does not mutate the local chapter final text.
- Successful Station Cat responses save preview/publish URLs and remote ids into `PublishRun` / `PublishSyncState`; failed responses record a failed run and do not advance content hashes, so retries still include the changed items.
- Station Cat network failures should preserve diagnostics in `PublishRun.errorMessage`: endpoint, approximate request size, low-level cause such as `ENOTFOUND` / `ECONNRESET`, and a user-facing hint. Do not collapse these back to plain `fetch failed`.
- Project cover images can be uploaded from the project publish page. They are stored under the local app data assets directory in desktop builds or `.novelforge-assets/` during local development, and are included in the standard publish package / Station Cat request as the cover changed item with `dataBase64` and `dataUrl`.
- AI cover generation is retired. Do not add generation, candidate preview,
  adoption, or image-model settings back without a new explicit product decision.
  Historical task records and candidate cleanup remain compatibility-only.
- Project setting AI generation is available from `/projects/[projectId]/settings`. It starts a logged `project_setting_generation` background task, displays the draft on the settings page, and only writes formal setting memory after the author clicks "采用到总设定档"; adoption creates a `SettingVersion` with source type `ai_project_setting`.
- Project outlines live in the `outlines` table with `level` values `volume`, `unit`, and `chapter`. The `/projects/[projectId]/outlines` page handles manual creation/editing/deletion, while `outline_generation` AI tasks are draft-only and must not auto-write formal outline rows. Chapter beat and draft generation should load the matching volume/unit/chapter outline for the current chapter number.
- Multi-storyline planning lives in `storylines` plus project-scoped relation tables for characters, foreshadows, chapters, and outlines. `/projects/[projectId]/storylines` is the author-controlled management surface for mainlines, subplots, character arcs, business lines, antagonist lines, foreshadow lines, world lines, and other narrative threads. `storyline_generation` AI tasks may suggest candidate storylines and prefill the same form, but those candidates remain draft-only `ai_tasks` output until the author explicitly saves a candidate into formal memory. AI must not silently create or mutate formal storylines; range-derived chapter relation rows are allowed only from author-confirmed `startChapter` / `endChapter` metadata and are additive.
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
- Pending-update `targetId` values are untrusted model output. Extraction prompts must expose the real IDs of every formal record the model may update, persistence must discard or uniquely canonicalize IDs that are not present in the supplied type-specific context, and approval may recover a legacy invalid ID only through one project-scoped target match. Ambiguous or missing targets must remain blocked so AI suggestions cannot mutate the wrong formal memory record.
- World rules can carry `isCore`, `scope`, `relatedCharacters`, `relatedLocations`, and `relatedOrganizations`. Foreshadows can carry `expectedResolveChapter`, `relatedCharacters`, `relatedLocations`, and `relatedFactions`. Timeline events can carry `relatedCharacters` and `location`. Project exports and continuity checks should preserve/read these richer fields.
- Project AI task records now have a retention limit of 10 records per project. The AI workspace prunes older finished tasks before display, and new task creation triggers the same cleanup. Pending/running tasks are not pruned so background generation can still write completion or failure status.
- The AI task workspace should stay compact as template/task history grows: top summary cards must keep long API URLs inside their card, Prompt Templates should show the latest 3 versions by default, and Recent Tasks should show the latest 3 records by default with older retained items folded.
- New chapter creation is intentionally minimal: show only chapter number, chapter title, and chapter goal. Beats, draft text, final text, notes, status edits, and change reasons belong on the chapter detail/edit flow after the shell exists.
- The chapter list should stay compact and metadata-only for long-form projects: do not load or render full chapter bodies on `/projects/[projectId]/chapters`; show chapter number, status, title, goal, word count, version count, and update time, with full text reserved for the chapter detail page. By default, show only the latest 3 chapters and fold older chapters into a collapsed history section while keeping old chapters reachable.
- The publish/export page should stay compact as publish assets grow: keep the book-cover tools, WeChat layout export, Station Cat publish runs, and project-export panels scannable; use explicit expand/collapse for long generated/export text instead of forcing full text into every card.
- Deep project management pages should prefer dense management surfaces over large repeated cards. Character lists, saved outlines, and structured memory records should show compact rows or short summaries by default; full long text belongs in edit/detail mode. Creation forms for memory-heavy modules may be folded behind an explicit expand control to keep long projects scannable. A later compact-UI refinement can add lightweight expand/collapse controls for outline and structured-memory summaries when authors need to read long world rules, timeline events, or foreshadows without entering edit mode.
- The outline page should keep each saved-outline group compact: volume outlines, story-unit outlines, and chapter outlines each show only the latest one by default, with older rows folded into a per-group history expander.
- Modular refactor Phase 4 moved durable publish/audiobook/continuity behavior out of route actions: audiobook DB operations live in `lib/audio/records.ts`, continuity report and fix-patch record operations live in `lib/continuity/records.ts`, Station Cat publish-run/sync logic lives in `lib/publish/runs.ts`, publish-page task context lookup lives in `lib/publish/ai-tasks.ts`, and generated cover candidate persistence lives in `lib/publish/cover-candidates.ts`. Keep new publish/audiobook/continuity features behind these domain services rather than growing `app/projects/[projectId]/*/actions.ts` again.
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
- Continue applying the unified workbench system to deeper project pages with
  dedicated components rather than broad one-off class overrides. Preserve the
  same phase navigation and semantic color meanings for serial novels, short
  stories, and series.
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
