# Development Log

## 2026-06-22: 0.1.35 Audiobook Export MVP

Status: completed for review.

What was done:

- Bumped the source app/package version to `0.1.35`.
- Added Phase 25 audiobook export storage:
  - `audio_exports` records for chapter-level export jobs,
  - `audio_export_segments` records for per-segment status, local file path, provider request id, duration, and errors.
- Added local TTS settings at `/ai-settings`:
  - PPQ TTS as the first supported provider,
  - ElevenLabs and DeepGram model options through PPQ,
  - server-side API Key storage,
  - voice ID/manual voice name fields,
  - voice list fetching,
  - voice preview generation with a local audio player.
- Added the project audiobook page at `/projects/[projectId]/audiobook`:
  - single-chapter export from polished text, final text, draft text, or automatic source selection,
  - source priority for automatic selection: polished text -> final text -> draft text,
  - text normalization and safe segmentation by model input budget,
  - background export processing with auto-refresh,
  - per-segment success/failure tracking,
  - retry for failed segments,
  - local audio playback through a controlled `/audio-assets` route,
  - a button to open the local export folder on macOS.
- Added PPQ-compatible TTS provider helpers:
  - `/audio/voices` voice list parsing and provider/model filtering,
  - `/audio/speech` synthesis payload builder,
  - rough duration/cost estimation helpers.
- Added the sidebar and project dashboard entry for 有声小说导出.
- Updated project activity summaries so completed audio exports can count toward recent project activity.
- Kept the first version local-first and author-controlled: audio files are local export assets, not formal story memory, and no cloud sync or automatic publishing was added.

Verification:

- `npm run test -- lib/audio/chunk-text.test.ts lib/audio/text-source.test.ts lib/audio/providers/ppq-tts.test.ts lib/ai/local-config.test.ts` passed.
- `npm run typecheck` passed.

## 2026-06-22: 0.1.34 Mainline Character Relationship Package

Status: completed.

What was done:

- Bumped the source app/package version to `0.1.34`.
- Updated the in-app release notes for the merged character relationship AI draft workflow and review hardening.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.34-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.

Verification:

- `npm run typecheck` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` and `npm run desktop:pack:mac` both reached macOS Developer ID signing but were interrupted because Apple timestamp signing stalled.
- Built the macOS app payload with electron-builder's directory target, explicit signing disabled, then manually ad-hoc signed the app payload with the Electron entitlements.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.34"`.
- `codesign --verify --deep --strict --verbose=2` passed for both the generated app payload and the expanded PKG payload app.
- Verified the packaged app still uses `runDesktopMigrations` and does not rely on Prisma CLI startup migrations.
- Final PKG SHA-256: `540653097a0a1483d9cbfa7671d52c670f3a1c6a4a510eac000bf1227bcfd58f`.

## 2026-06-22: 0.1.33 AI Character Relationship Drafts

Status: completed.

What was done:

- Added AI-assisted character relationship draft generation to the character relationship network page.
- Added the `character_relationship_generation` default prompt template and task type.
- Relationship generation now reads project setting, active characters, existing relationships, outlines, and recent chapter summary task output, then stores draft-only suggestions in `ai_tasks`.
- Added review controls on `/projects/[projectId]/characters/network`:
  - generate relationship drafts,
  - auto-refresh while a relationship task is active,
  - display parsed candidate relationships,
  - adopt all usable draft relationships,
  - reject the draft task.
- Preserved author control and formal-memory safety:
  - AI generation does not write `character_relationships`,
  - adoption revalidates active current-project characters,
  - chapter references are resolved to current-project chapters,
  - same-character, archived-character, invalid, and duplicate active/tension/hidden relationships are skipped.
- Review hardening:
  - relationship draft tasks are marked adopted only after the transaction confirms at least one non-duplicate relationship can be written,
  - duplicate-only adoption attempts leave the task reviewable and do not create formal relationships,
  - character fields included in relationship-generation `inputJson` and prompt text are clipped before logging/calling the model to keep long character libraries within a safer context budget.
- Updated the AI task page copy, source version, release notes, and project memory.
- Built the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.33-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.

Verification:

- `npm run test -- lib/ai/character-relationships.test.ts app/projects/[projectId]/characters/network/actions.test.ts` passed after review hardening.
- `npm run test -- lib/ai/character-relationships.test.ts lib/ai/prompt-templates.test.ts app/projects/[projectId]/characters/network/actions.test.ts` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- Built the macOS app payload with electron-builder's directory target and macOS identity disabled to avoid Apple timestamp stalls during personal-use packaging.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.33"`.
- `codesign --verify --deep --strict --verbose=2` passed for both the generated app payload and the expanded PKG payload app.
- Final PKG SHA-256: `582fb941e56edba3bba06a0e84b086bc2a6cb5999e0f8ab77e8b7c4215eaa471`.

## 2026-06-22: 0.1.32 Publish Package Record Collapse

Status: completed.

What was done:

- Changed the publish page so the "发布包装记录" section shows only the latest publish package by default.
- Kept older publish package records in the local database and moved them into a collapsed "历史发布包装记录" section.
- Extracted the publish package card rendering so latest and historical records keep the same copy/export UI when shown.
- Bumped the source app/package version to `0.1.32` and updated in-app release notes.

Verification:

- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- Built the macOS app payload with electron-builder's directory target and macOS identity disabled to avoid Apple timestamp stalls during personal-use packaging.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.32"`.
- `codesign --verify --deep --strict --verbose=2` passed for the expanded PKG payload app.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.
- Final PKG SHA-256: `04f4cc7ddb01657fd189413cf1686875f324d349b743e6770c27d7d9a82a8b22`.

## 2026-06-22: 0.1.31 Publish Target UI Simplification

Status: completed.

What was done:

- Simplified the project publish page so the global Station Cat API is the single recommended publishing entry.
- Hid the automatically maintained `Station Cat 全局配置` internal sync target from the normal custom target list.
- Moved project-specific publish targets into an advanced optional section for alternate sites, test environments, or special endpoints.
- Reused one publish-result card for both global and advanced targets so preview links, publish links, remote IDs, and changed items are shown consistently.
- Bumped the source app/package version to `0.1.31` and updated in-app release notes.

Verification:

- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed through build and app payload creation; Developer ID timestamp signing stalled on Apple's timestamp service, so the personal-use package flow used local ad-hoc app signing as documented for current PKG handoffs.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.31"`.
- `codesign --verify --deep --strict --verbose=2` passed for the expanded PKG payload app.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.
- Final PKG SHA-256: `08e8cbc7a9cf1256774af68b61668d3ba04e66169c6b9a50d8932dbf0fc40a14`.

## 2026-06-21: 0.1.30 Continuity Fix Suggestions and Scroll Restoration

Status: completed.

What was done:

- Expanded continuity one-click fix parsing beyond quoted `将 A 改为 B` replacements.
- The continuity page can now infer a safe date-time replacement when:
  - the report suggestion states a corrected target time,
  - the evidence/description/final text contains a unique matching old time with the same time-of-day suffix.
- For date-time fixes, the system can apply multiple precise replacements in one author-triggered action, such as changing both a timestamp and a nearby `现在是...` sentence.
- Added global form scroll restoration so same-page server-action form submissions return the author to the previous scroll position instead of jumping to the top.
- Bumped the source app/package version to `0.1.30` and updated in-app release notes.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.30-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.

Verification:

- `npm run test -- lib/continuity-fixes.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` passed with notarization skipped.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.30"`.
- `codesign --verify --deep --strict --verbose=2` passed for the expanded PKG payload app.
- Final PKG SHA-256: `8caf6efe21e1e3ddb4864b5dd487175f3cf74756483549142b6f026fd5faeb0d`.

## 2026-06-21: 0.1.29 Chapter Outline Prefill for New Chapters

Status: completed.

What was done:

- Added automatic chapter-outline prefill on the new chapter page.
- When the next chapter number has a matching non-archived formal chapter outline, the create form now preloads:
  - the outline title as the chapter title,
  - the outline goal plus chapter conflict, pleasure point, foreshadow, resolved foreshadow, characters, location, ending hook, and notes into the editable chapter goal field.
- Kept author control intact: the outline only fills form defaults, and the chapter is still written only after the author clicks create.
- Bumped the source app/package version to `0.1.29` and updated in-app release notes.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.29-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.

Verification:

- `npm run test -- lib/chapter-outline-prefill.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` passed with notarization skipped.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.29"`.
- `codesign --verify --deep --strict --verbose=2` passed for the expanded PKG payload app.
- Final PKG SHA-256: `1b7a2e64faba6ec4f391abdaa3a47581a5e99fdb5b251fa7cfdd41d51366cdbe`.

## 2026-06-21: 0.1.28 Chapter Outline Single-Chapter Generation

Status: completed.

What was done:

- Changed the outline AI form for chapter outlines from "章节条目数" to "目标章节号".
- Chapter outline generation now always requests exactly one chapter outline:
  - the UI asks for the target chapter number,
  - the server forces `chapterCount` to `1` for chapter-level outline generation,
  - the prompt explicitly says to generate only the target chapter and not a multi-chapter list.
- The target chapter number defaults to the next chapter after the highest existing chapter or saved chapter outline.
- Updated the outline generation task audit summary to record the target chapter number and the fixed single-chapter scope.
- Bumped the source app/package version to `0.1.28` and updated in-app release notes.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.28-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.

Verification:

- `npm run test -- lib/ai/outlines.test.ts app/projects/[projectId]/outlines/actions.test.ts lib/outline-draft-copy.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed after retrying once because the first electron-builder run timed out on a request.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.28"`.
- `codesign --verify --deep --strict --verbose=2` passed for the expanded PKG payload app.
- Final PKG SHA-256: `e4489218c899a590b9b1e8d2eb072b22f7e9c68d0a5e53e664d1e86383058677`.

## 2026-06-21: 0.1.27 Outline Save Feedback Follow-up

Status: completed.

What was done:

- Diagnosed the packaged 0.1.26 outline page after a reported case where a copied volume outline appeared not to persist.
- Verified the running desktop server action can write a temporary diagnostic outline into the local SQLite `outlines` table, then removed that diagnostic row.
- Added explicit quick-create save feedback:
  - submit buttons now show a pending "保存中..." state,
  - successful creates redirect back with a visible "已保存..." message,
  - invalid quick-create form submissions redirect back with a visible form-error message instead of falling through to an opaque server failure.
- Bumped the source app/package version to `0.1.27` and updated in-app release notes.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.27-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the final PKG handoff remains.

Verification:

- Added regression coverage for successful outline create redirects and invalid quick-create form handling.
- `npm run test -- app/projects/[projectId]/outlines/actions.test.ts lib/outline-draft-copy.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed after clearing stale proxy environment variables.
- `pkgbuild` created the final PKG with `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.27"`.
- `codesign --verify --deep --strict --verbose=2` passed for both the generated app payload and the expanded PKG payload app.
- Final PKG SHA-256: `18f1f4ca5599a7f94e1c1ef71bca37ffc9e6a0d695128f23438758e005374869`.

## 2026-06-21: 0.1.26 Outline Copy Helper Packaging

Status: completed.

What was done:

- Added a client-side "复制到表单" action to completed outline AI task cards. It parses common volume, story-unit, and chapter outline draft formats and fills the matching quick-create form.
- Preserved the outline author-control boundary: copied drafts only populate form fields; authors still click save before formal `outlines` rows are written.
- Bumped the source app/package version to `0.1.26` and updated in-app release notes.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.26-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run test -- lib/outline-draft-copy.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.26"`.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the final expanded PKG payload app.

## 2026-06-21: Phase 24 AI Cover Image Generation

Status: PR review handoff.

Scope:

- Add AI-assisted cover image generation on top of the existing local cover upload and Station Cat cover payload flow while preserving author control.

What was done:

- Added global image generation settings to `/ai-settings`:
  - `IMAGE_API_KEY`,
  - `IMAGE_API_BASE_URL`,
  - `IMAGE_MODEL`,
  - `IMAGE_SIZE`,
  - `IMAGE_QUALITY`.
- Defaulted the image endpoint to PPQ-compatible `https://api.ppq.ai/v1` and the model to `qwen-image-2`.
- Added an OpenAI-compatible image generation client for `POST /images/generations`, supporting both base64 and URL image responses.
- Added `cover_image_generation` default prompt template and task type.
- Added a publish-page AI cover generation panel:
  - reuses the latest publish-package cover prompt by default,
  - allows author-edited prompts,
  - supports book cover, website banner, and square thumbnail targets,
  - creates logged background `ai_tasks`,
  - auto-refreshes while tasks are pending/running,
  - expires stale pending/running cover tasks after the shared timeout window.
- Kept generated images draft-only until explicit author adoption:
  - task output displays candidate images,
  - “采用为封面” writes the selected image into the existing local cover asset storage,
  - rejected tasks do not alter project cover fields.
- Extended local cover asset storage with a buffer-saving helper so generated images and uploaded files use the same validation, 8MB limit, and Station Cat payload path.
- Updated desktop runtime config parsing, `.env.example`, and desktop smoke coverage for `IMAGE_*` settings.
- Updated the AI task page copy and in-app release notes.
- Bumped the source app/package version to `0.1.25`.

Review hardening:

- Removed the URL-candidate adoption path for generated covers. Image providers
  must return base64 image data; URL-only results are skipped or fail the task so
  external API output cannot make the local server download arbitrary URLs.
- Changed generated-cover task output to store local candidate asset references
  only. Full base64 image payloads and raw provider responses are no longer
  written to `ai_tasks.outputJson`.
- Saved generated cover candidates immediately into a local candidate asset
  directory; adopting a cover now copies from that local candidate asset into
  the formal project cover slot.
- Added magic-byte validation for PNG/JPEG/WebP/GIF before saving any manual or
  generated cover image, and restored upload-size preflight before reading a
  selected manual file into memory.
- Limited "拒绝整组" to completed cover-generation tasks and added friendly
  feedback for invalid image API Base URL settings.
- Added lifecycle cleanup for generated cover candidate assets:
  - adopting a generated cover removes that task's candidate directory after
    the selected image is copied into the formal cover slot,
  - rejecting a generated cover task removes that task's candidate directory,
  - AI task retention removes cover candidate directories before pruning old
    `cover_image_generation` task records.
- Moved cover-candidate previews behind a controlled project asset route so the
  publish page no longer synchronously embeds large base64 data URLs during SSR.
- Added server-side cover-prompt length validation so forged requests over 3000
  characters return visible feedback instead of creating oversized image tasks.
- Added a direct regression test that `createAiTask` triggers project AI task
  retention after task creation, so pruning old `cover_image_generation` records
  also runs the candidate-directory cleanup path.

Verification:

- `npm run test -- lib/ai/local-config.test.ts lib/ai/image-client.test.ts lib/ai/cover-images.test.ts lib/project-cover-assets.test.ts lib/ai/prompt-templates.test.ts` passed: 5 files, 30 tests.
- `npm run test -- lib/project-cover-assets.test.ts lib/ai/cover-images.test.ts lib/ai/task-retention.test.ts app/projects/[projectId]/publish/actions.test.ts` passed: 4 files, 18 tests.
- `npm run test -- lib/ai/task-logger.test.ts lib/ai/task-retention.test.ts lib/project-cover-assets.test.ts app/projects/[projectId]/publish/actions.test.ts` passed: 4 files, 16 tests.
- `npm run typecheck` passed.
- `npm run test` passed: 40 files, 200 tests.
- `npm run desktop:smoke` passed.
- `npm run build` passed.
- `git diff --check` passed.
- PR #24 was checked against `origin/main`; the branch is up to date and GitHub
  reports it as mergeable.

Notes:

- This phase does not auto-generate a cover during Station Cat upload; authors generate and adopt a cover before publishing.
- Generated cover images remain local assets until included in a Station Cat publish request through the existing standard package flow.
- No desktop installer should be built before review approval.

## 2026-06-21: Phase 23 Character Network and Character AI

Status: PR review handoff.

Scope:

- Add a dedicated character relationship network and AI-assisted character draft generation while preserving author control.

What was done:

- Added the `character_relationships` table and Prisma relations to project, character, and chapter records.
- Added `/projects/[projectId]/characters/network` for author-managed relationship creation, editing, and archive-first lifecycle.
- Added server-side validation so relationship character and chapter references must belong to the current project.
- Added `character_generation` default prompt template and AI context builder.
- Added an AI character generation panel on the character library page:
  - generation starts a logged background `ai_tasks` record,
  - stale pending/running character tasks are failed after the shared timeout window,
  - completed drafts can be explicitly adopted into a new formal character record,
  - adoption creates a `CharacterVersion` snapshot and is idempotent.
- Added character relationships to project JSON and Markdown exports.
- Added a project dashboard card for the relationship network.
- Bumped the source app/package version to `0.1.24` and updated in-app release notes.

Review hardening:

- Changed role removal from hard delete to archive-first: character detail now archives the role, creates a `CharacterVersion`, and preserves relationship history.
- Changed `character_relationships` character foreign keys from cascade delete to restrict delete so relationship records cannot be erased by deleting a character row.
- Added API-key gating to character AI generation on both the UI and server action, matching the rest of the AI panels.
- Clamped AI-adopted character draft fields to the manual character limits and capped suggested relationship notes before writing formal character records.
- Added duplicate active/tension/hidden relationship detection for the same character pair, relationship type, and direction.
- Made relationship editing preserve archived endpoint characters in the select options so older relationship records do not accidentally change endpoints.
- Character archiving now also archives related active/tension/hidden relationship records, and character AI generation filters out relationships whose source or target character is already archived.
- Character generation request input now has UI length limits and server-side safe validation that redirects to visible feedback instead of throwing Zod errors.
- Relationship network summary stats now use full-project count queries instead of the currently loaded 80-row page slice.
- New relationship creation now rejects archived character endpoints on the server, while editing remains able to preserve existing archived endpoints for historical maintenance.
- Character archive revalidation now also refreshes the character history page because archiving creates a new `CharacterVersion`.

Verification:

- `npx prisma generate` passed.
- `npm run typecheck` passed.
- `npm run test` passed: 36 files, 174 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.

Notes:

- AI-generated character profiles remain draft-only until the author clicks "采用为新角色".
- AI-generated suggested relationships are appended to the adopted character notes for author review; they do not directly create formal relationship records.
- No desktop installer should be built before review approval. Phase 23 is intended for PR review first.

## 2026-06-20: Phase 22 Structured Memory Management Pages

Status: completed pending review.

What was done:

- Added `/projects/[projectId]/memory` as the dedicated structured memory workbench for world rules, foreshadows, and timeline events.
- Added author-controlled create/edit/delete server actions for world rules, foreshadows, and timeline events. These actions update formal memory only after explicit user submission.
- Expanded structured memory metadata: core world-rule flag, rule scope, related characters/locations/organizations, foreshadow expected resolution chapter and related story metadata, plus timeline related characters and location.
- Linked the project dashboard structured-memory card and sidebar navigation to the new memory workbench.
- Updated project exports and continuity context assembly so the richer memory metadata is backed up and available to checks.
- Bumped the source app/package version to `0.1.23` and updated in-app release notes.

Review hardening:

- Added server-side validation that every chapter relation written from the structured-memory forms belongs to the current project, preventing cross-project memory references.
- Changed world-rule, foreshadow, and timeline "delete" actions into soft status transitions: world rules and timeline events are archived, while foreshadows are marked abandoned.
- Added `TimelineEvent.status` so timeline items can be archived without losing history, and filtered archived timeline events out of continuity-check context.
- Reduced the structured-memory page's default render weight by listing summary cards and expanding only the selected record's edit form, with each memory type capped to the latest 50 rows on the page.
- Added full-count queries and per-section limit notices so the 50-row page cap is visible and top summary cards use full project counts rather than loaded-row counts.
- Renamed soft-delete server actions to `archiveWorldRule`, `abandonForeshadow`, and `archiveTimelineEvent`, and hid archive/abandon buttons on records already in those states.
- Split key validation feedback into dedicated messages for missing titles, missing content, overlong body text, invalid expected resolve chapter, and invalid chapter references.
- Normalized world-rule categories through the server-side whitelist so arbitrary submitted category values fall back to `other`.

Verification:

- `npx prisma format` passed.
- `npx prisma generate` passed.
- `npm run test -- app/projects/[projectId]/memory/actions.test.ts` passed, 1 file and 8 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 33 files and 152 tests.
- `git diff --check` passed.
- `npm run build` passed.

Packaging note:

- No desktop installer should be built before review approval. Phase 22 is intended for PR review first.

## 2026-06-20: Phase 21 Outline Module

Status: completed pending review.

What was done:

- Added the `outlines` SQLite table and Prisma model for three outline levels: volume, story unit, and chapter.
- Added `/projects/[projectId]/outlines` with quick-create forms, grouped outline lists, edit/delete controls, and an edit page for structured outline fields.
- Added `outline_generation` as a default AI prompt template and an AI outline draft panel. AI-generated outline text is saved only as an `ai_tasks` record; formal outline rows still require author manual creation or editing.
- Updated the project dashboard and left navigation so the outline module is reachable as a first-class creative tool.
- Injected matching volume/unit/chapter outline context into chapter beat generation and chapter draft generation.
- Updated project JSON/Markdown export to include outline records.
- Bumped the source app/package version to `0.1.22` and updated in-app release notes.

Review hardening:

- Added stale `outline_generation` task cleanup so old pending/running outline draft jobs older than 15 minutes are marked failed before the outline page or generation action checks active locks.
- Added outline-page auto-refresh while an outline AI task is pending/running, matching the chapter AI task UX.
- Changed chapter generation outline selection from first-match to specificity-first matching: closed chapter ranges beat open ranges, shorter ranges beat wider ones, active status is preferred after specificity, and multiple story-unit outlines can be included.
- Forced outline draft `chapterCount` to apply only to chapter-level outline generation, so volume and story-unit prompts do not receive misleading "chapter-level item" instructions.
- Moved the outline AI generation controls into a small client component so the "chapter count" field is visible only when generating chapter-level outlines.
- Added server-side outline consistency validation for invalid chapter ranges and missing chapter numbers on chapter outlines, with visible redirect feedback instead of a server error.
- Added server action tests for outline create/update validation, stale task expiry, duplicate-task prevention, and draft-only AI task creation.

Verification:

- `npx prisma generate` passed.
- `npm run test -- lib/outline-fields.test.ts lib/ai/outlines.test.ts app/projects/[projectId]/outlines/actions.test.ts` passed, 3 files and 15 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 32 files and 147 tests.
- `git diff --check` passed.
- `npm run build` passed.

Follow-up UX fix:

- Added a client-side "复制到表单" action on completed outline AI tasks. It parses common volume/story-unit/chapter draft fields and fills the matching quick-create form, but still requires the author to review and click save before a formal outline is created.
- Added focused parser coverage for volume, story-unit, and chapter outline draft formats.

Packaging note:

- No desktop installer should be built before review approval. Phase 21 is intended for PR review first.

## 2026-06-20: Phase 20 AI Chapter Polish

Status: completed.

What was done:

- Added a dedicated `Chapter.polishedText` field and SQLite migration so AI-polished prose is stored separately from draft and final text.
- Added the `chapter_polish_generation` default prompt template and pure chapter polish context builder.
- Added server actions to start non-blocking polish AI tasks, prevent duplicate active polish tasks, and explicitly adopt completed polish output into `Chapter.polishedText`.
- Added the chapter detail `AI 正文精修` panel with generate, running-state, auto-refresh, empty-state, task output, and “采用到精修正文” controls.
- Updated the chapter edit form so authors can finalize from either polished text or draft text; final text is still only written by explicit author action.
- Updated word counting, chapter snapshots, chapter list preview, and project exports to include polished text.
- Bumped the source app/package version to `0.1.21` and updated in-app release notes.

Review hardening:

- Changed polish source priority to `polishedText -> finalText -> draftText`, so repeated polish uses the current polished candidate before falling back to older text.
- Added single-call polish prompt length protection: overlong chapters are sent as head/middle/tail excerpts with a clear task summary note instead of silently exceeding model context.
- Made `adoptChapterPolish` server-side idempotent by only moving tasks from `not_reviewed` to `adopted` before writing `polishedText` and chapter versions.
- Added UI and server feedback for empty “用精修稿一键定稿” / “用草稿一键定稿” submissions.
- Updated the AI task page copy to include `正文精修`.
- Blocked adoption of excerpt-only long-text polish tasks so a head/middle/tail preview cannot overwrite the complete `polishedText` field.
- Changed polish adoption status handling so `draft` and `final` chapters become `revising` after a new polish candidate is adopted; `published` chapters remain published.
- Tightened the polish task card adopt button to only show for `not_reviewed` non-excerpt completed tasks.

Verification:

- `npx prisma generate` passed.
- `npm run typecheck` passed.
- `npm run test -- lib/ai/chapter-polishes.test.ts app/projects/[projectId]/chapters/actions.test.ts` passed, 2 files and 12 tests.
- `npm run test` passed, 29 files and 132 tests.
- `git diff --check` passed.
- `npm run build` passed.

Packaging note:

- No desktop installer was built in this phase. The user requested a PR for review first, with deployment/packaging after review approval.

## 2026-06-20: Desktop Startup Date Compatibility Hotfix

Status: completed.

What was done:

- Investigated the installed `0.1.19` app showing `Timed out while starting the local NovelForge server`.
- Reproduced the real packaged-server failure: the local Next server started, but `/` returned HTTP 500 while loading the project dashboard.
- Found the root cause in `lib/project-activity.ts`: Prisma `DateTime` aggregates failed on existing local SQLite rows with mixed historical timestamp formats, including millisecond timestamps and SQLite `YYYY-MM-DD HH:mm:ss` strings.
- Reworked project activity summary loading to read activity timestamps via SQLite rows and parse `Date`, millisecond numbers, numeric strings, and SQLite timestamp strings safely in application code.
- Kept existing user data untouched; the fix is read-compatible and does not require clearing or migrating the local novel database.
- Updated desktop startup waiting diagnostics so future startup timeouts report the last observed check such as HTTP 500 instead of only a generic timeout.
- Bumped the app/package version to `0.1.20` and updated in-app release notes.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.20-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run test -- lib/project-activity.test.ts` passed, 1 file and 5 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 27 files and 120 tests.
- `git diff --check` passed.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- With the user's current desktop SQLite database, the fixed production server returned `HTTP/1.1 200 OK` for `/`.
- The packaged `0.1.20` app payload also returned `HTTP/1.1 200 OK` for `/` and showed `v0.1.20` plus the new release title on `/ai-settings`.
- `npm run desktop:dist:mac` completed with notarization skipped after rerunning outside the sandbox without stale proxy environment.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.20"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged desktop startup still uses `runDesktopMigrations` from `desktop/runtime.cjs`, reads bundled migration SQL from `app.asar.unpacked`, and does not use Prisma CLI `migrate deploy` as the app startup path.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.20-mac-arm64.pkg`.
- SHA-256: `5b371bf201b786cdc25e1dca5c79db09f186431d62a11fca138c59c7f4afd0f5`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.

## 2026-06-20: Project Activity Timestamp Fix

Status: completed.

What was done:

- Investigated the project dashboard showing both project creation and update time as `2026年6月18日 19:42` even after later chapter, AI, pending update, continuity, and publish activity.
- Confirmed the installed desktop database had later activity records, while the project page only displayed `projects.createdAt` and `projects.updatedAt`.
- Added `lib/project-activity.ts` to aggregate the latest project activity across chapters, settings, characters, AI tasks, pending updates, continuity reports, publish packages, publish targets/runs, and publish sync states.
- Updated the project detail status card to show separate rows for `项目创建`, `首章创建`, `项目资料更新`, and `最近活动`, with helper text explaining the difference.
- Updated the project list and recent activity section to sort and display by aggregated latest activity instead of only `projects.updatedAt`.
- Bumped the app/package version to `0.1.19` and updated in-app release notes for project activity timestamps.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.19-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run test -- lib/project-activity.test.ts` passed, 1 file and 2 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 27 files and 117 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped after rerunning outside the sandbox for electron-builder's GitHub metadata lookup.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.19"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` from `desktop/runtime.cjs`, reads bundled `migration.sql`, and does not contain Prisma CLI `migrate deploy` startup code.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.19-mac-arm64.pkg`.
- SHA-256: `2951c1a34aded93dbfce8c5c41ce089726da8f938a545e30088cdeb5acf54490`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.

## 2026-06-20: Station Cat Selective Chapter Publish

Status: completed.

What was done:

- Added an explicit upload scope to Station Cat publish forms: `全部变更` or `指定章节`.
- The publish page now lists finalized chapters in the Station Cat send form, so the author can select chapter 2 and send only that chapter.
- Publish actions now filter `changedItems` before creating the Station Cat request and before advancing sync state, preventing unrelated cover/project/chapter items from being marked uploaded during a selected-chapter run.
- Standard publish package chapter bodies now strip AI draft structure labels before website upload, including leading duplicate chapter Markdown titles, leading `---`, and headings such as `开场钩子`, `节拍1`, and `节拍二`.
- Added in-flight submit feedback for Station Cat publish buttons, including a spinner, “正在发送...” label, and helper text while the server action is running.

Verification:

- `npm run test -- lib/publish-platforms.test.ts` passed.
- `npm run test -- lib/publish-platforms.test.ts lib/station-cat-publisher.test.ts` passed after final package metadata restoration, 2 files and 14 tests.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run test` passed, 26 files and 115 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped after rerunning outside the sandbox for electron-builder's GitHub metadata lookup.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.18"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` from `desktop/runtime.cjs`, reads bundled `migration.sql`, and does not contain Prisma CLI `migrate deploy` startup code.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.18-mac-arm64.pkg`.
- SHA-256: `37a8633260e2d466dc33ca575177ecb3cd0ca109d154c6dae6f51beba37f2470`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- `release/desktop` was cleaned after packaging so only the formal PKG handoff remains.

## 2026-06-20: Personal macOS Installer 0.1.17

Status: completed.

What was done:

- Bumped the app/package version to `0.1.17`.
- Updated in-app release notes for Station Cat publish failure diagnostics.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.17-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run test -- lib/station-cat-publisher.test.ts` passed.
- `npm run typecheck` passed.
- `npm run test` passed, 26 files and 113 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped after rerunning without the stale local proxy environment.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.17"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` from `desktop/runtime.cjs`, reads bundled `migration.sql`, and does not contain Prisma CLI `migrate deploy` startup code.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.17-mac-arm64.pkg`.
- SHA-256: `5a34842fad315ea4770000dedc55431bf5d0a2cfeac91df811ebfb80c90d9a05`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- The final personal-use PKG uses the copied-and-ad-hoc-signed app payload path established in the `0.1.12` packaging pass, and the expanded payload passed codesign verification.

## 2026-06-19: Station Cat Publish Failure Diagnostics

Status: completed.

What was done:

- Investigated a Station Cat import failure for chapter 2 where the publish run only showed `fetch failed`.
- Verified the local Station Cat global config has API Base URL and a saved publish token, and the latest failed run attempted to upload the changed cover, chapter 1 update, and new chapter 2.
- Verified the website import endpoint is reachable from the host network and returns the expected JSON error shape when no token is provided.
- Confirmed the local sandboxed Node fetch failure includes the lower-level `ENOTFOUND` cause, while host-network Node fetch reaches the endpoint.
- Updated the Station Cat publisher client so network failures now record the endpoint, approximate request body size, low-level network cause, and a Chinese diagnostic hint such as DNS failure or interrupted socket instead of only `fetch failed`.

Verification:

- `npm run test -- lib/station-cat-publisher.test.ts` passed.

## 2026-06-19: Continuity Report One-Click Fix

Status: completed.

What was done:

- Bumped the app/package version to `0.1.16`.
- Added an explicit one-click repair flow to the continuity report page.
- Continuity reports now show “一键修复正文” when the AI suggestion contains a safe, explicit replacement pattern such as “将 A 改为 B”.
- Clicking the button updates the linked chapter’s confirmed final text, creates a new chapter version snapshot, and marks the continuity report as resolved.
- Unsupported or vague fix suggestions remain manual-only so AI reports cannot silently guess complex story edits.
- Added success/failure feedback banners to the continuity report page so authors can see whether the repair was applied, unsupported, already resolved, missing a chapter, or could not find the original text.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.16-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run test -- lib/continuity-fixes.test.ts` passed, 1 file and 3 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 26 files and 112 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.16"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` from `desktop/runtime.cjs` and does not contain Prisma CLI `migrate deploy` startup code.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.16-mac-arm64.pkg`.
- SHA-256: `38a59d0b6803752c8c644b6b57192e765b1c01ce5a720421ece09dd827bcc6e2`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- The final personal-use PKG uses the copied-and-ad-hoc-signed app payload path established in the `0.1.12` packaging pass, and the expanded payload passed codesign verification.

## 2026-06-19: Long Chapter Summary Stability Hotfix

Status: completed.

What was done:

- Bumped the app/package version to `0.1.15`.
- Updated in-app release notes for long chapter summary stability.
- Fixed repeated `fetch failed` failures when chapter summary generation sends very long final text to an OpenAI-compatible provider.
- Chapter summary context now keeps the original final-text length in the audit record, but sends a safer head/middle/tail excerpt to the model when the confirmed final text is very long.
- AI task `inputJson` now records:
  - original final text length,
  - model prompt text length,
  - whether the text was excerpted,
  - the excerpt strategy.
- OpenAI-compatible client failures now record the endpoint, approximate request size, and low-level network cause instead of only `fetch failed`.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.15-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Observed cause:

- The installed `0.1.14` app was configured correctly for DeepSeek (`OPENAI_BASE_URL=https://api.deepseek.com`, model `deepseek-v4-pro`, API Key present).
- Chapter 1 summary succeeded with about 10k confirmed final-text characters.
- Chapter 2 summary failed twice with `fetch failed` while sending about 30k confirmed final-text characters.
- The most likely failure mode is the provider/network closing the oversized single request before an HTTP response is returned.

Verification:

- `npm run test -- lib/ai/chapter-summaries.test.ts lib/ai/openai-client.test.ts` passed, 2 files and 14 tests.
- `npm run typecheck` passed.
- `npm run test` passed, 25 files and 109 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.15"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` and bundled `migration.sql`; startup does not use Prisma CLI `migrate deploy`.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.15-mac-arm64.pkg`.
- SHA-256: `c085a266bd4f9d8e678669493b58adde05cba9cd66bf2d9c69eb2346366daf7f`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- The final personal-use PKG uses the copied-and-ad-hoc-signed app payload path established in the `0.1.12` packaging pass, and the expanded payload passed codesign verification.

## 2026-06-19: One-Click Chapter Finalization

Status: completed.

What was done:

- Bumped the app/package version to `0.1.14`.
- Updated in-app release notes for one-click finalization.
- Added a “用草稿一键定稿” button beside the chapter edit page final-text field.
- The button submits the current form, copies the current draft text into final text, sets chapter status to `final`, saves the chapter, and creates a new chapter version snapshot.
- If the author leaves the change reason empty, the action records `一键定稿：将草稿正文保存为定稿正文`.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.14-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 25 files and 107 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.14"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` and bundled `migration.sql`; startup does not use Prisma CLI `migrate deploy`.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.14-mac-arm64.pkg`.
- SHA-256: `4295d9918dce42af814a17c2bdbb15796e1e60beab6cdd45c2683718147b0548`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- The final personal-use PKG uses the copied-and-ad-hoc-signed app payload path established in the `0.1.12` packaging pass, and the expanded payload passed codesign verification.

## 2026-06-19: Final Text Guidance Hotfix

Status: completed.

What was done:

- Bumped the app/package version to `0.1.13`.
- Updated in-app release notes for the final-text guidance improvement.
- Added a stable `#finalText` anchor to the chapter edit form so chapter detail prompts can deep-link directly to the final-text field.
- Updated final-text dependent AI panels on the chapter detail page:
  - chapter summary extraction,
  - pending update extraction,
  - continuity checking,
  - publish package generation.
- When a chapter has no confirmed final text, these panels now show an actionable “去填写定稿正文” link instead of only a passive disabled-state sentence.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.13-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 25 files and 107 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.13"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` and bundled `migration.sql`; startup does not use Prisma CLI `migrate deploy`.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.13-mac-arm64.pkg`.
- SHA-256: `527abc07041b183b97af1d1bb2053c115cb54d51c7d5d7d09831e9b1f660744a`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- The final personal-use PKG uses the copied-and-ad-hoc-signed app payload path established in the `0.1.12` packaging pass, and the expanded payload passed codesign verification.

## 2026-06-19: Minimal Chapter Creation Form

Status: completed.

Scope:

- Reduce the new-chapter form to the fields authors actually need before AI generation.

What was done:

- Bumped the app/package version to `0.1.12`.
- Updated in-app release notes for the new-chapter form simplification.
- Updated `ChapterForm` so create mode only shows:
  - chapter number,
  - chapter title,
  - chapter goal.
- Kept edit mode unchanged, with status, beats, draft text, final text, notes, and change reason still available from the chapter edit page.
- Preserved hidden default values for create-only submissions so the existing chapter creation action still stores complete chapter records and version snapshots.
- Updated the new-chapter page copy to tell authors to save the chapter shell first, then generate beats and drafts from the chapter detail page.
- Rebuilt the personal-use macOS PKG installer as `release/desktop/NovelForge-AI-0.1.12-mac-arm64.pkg`.
- Cleaned `release/desktop` after packaging so only the formal PKG handoff remains.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 25 files and 107 tests.
- `git diff --check` passed.
- `npm run desktop:smoke` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the final PKG metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.12"`.
- `codesign --verify --deep --strict --verbose=2` passed for the final expanded PKG payload app.
- Packaged runtime still uses `runDesktopMigrations` and bundled `migration.sql`; startup does not use Prisma CLI `migrate deploy`.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.12-mac-arm64.pkg`.
- SHA-256: `827a4a66faef7b83667f613f1dafd6de0c399cd7a0cc6c8fecb9228e93d7a99a`.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate.
- Copying the Developer ID signed Electron app into a PKG staging directory caused the copied/expanded app to fail codesign verification. The final personal-use PKG therefore uses an ad-hoc signed app payload that survives copy/package/expand verification. Keep this as a local-use workaround until a fully signed Installer certificate workflow is available.

## 2026-06-19: 0.1.11 AI Task Retention Hotfix

Status: completed.

What was done:

- Added a project-level AI task retention helper with a default limit of 10 records.
- The AI task workspace now prunes old completed/failed/cancelled tasks before loading and only displays the latest 10 records.
- New logged AI tasks and the local AI readiness check now trigger the same retention cleanup after creating a task record.
- Pending/running AI tasks are preserved during cleanup so background generation can still update its logged record when it completes.
- Updated the in-app version and release notes to `0.1.11`.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 25 files and 107 tests.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` completed with notarization skipped.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.11"`.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload.
- Packaged runtime still uses `runDesktopMigrations` and bundled `migration.sql`; startup does not use Prisma CLI `migrate deploy`.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.11-mac-arm64.pkg`.
- SHA-256: `8ded47ada56421d8ee5114cdf596d4017926ec820d0d12b38f78361443c09176`.
- `release/desktop` was cleaned after packaging so only the formal PKG handoff remains.
- `pkgutil --check-signature` still reports `Status: no signature` because this machine has no Developer ID Installer certificate; the app payload is Developer ID Application signed.
- A temporary-disk install smoke was not completed because macOS `installer` requires root privileges for this package.

## 2026-06-19: 0.1.10 Sidebar Click Hit-Testing Hotfix

Status: completed.

What was done:

- Fixed sidebar link hit-testing by raising the fixed sidebar above the main content layer.
- Kept project-aware sidebar links from `0.1.9`, including fallback to the most recently updated project.
- Hid the decorative sidebar illustration on short windows so the local SQLite persistence note is not cut in half.
- Bumped the app version to `0.1.10` for the replacement macOS installer.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 24 files and 105 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- Real app-window verification passed on the generated app payload: sidebar "设定库" clicked from `/` navigated to `/projects/[projectId]/settings`, and the local SQLite persistence card displayed fully in the short-height desktop window.
- Generated CSS includes `@media (max-height:900px){.nf-sidebar-art{display:none}}`.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.10"`.
- Packaged runtime still uses `runDesktopMigrations` and does not contain Prisma CLI `migrate deploy` startup code.

Packaging note:

- Final handoff package: `release/desktop/NovelForge-AI-0.1.10-mac-arm64.pkg`.
- SHA-256: `a2e178a5971ce2c3060fd3976cbddad64e3ceece83ae8af73ec44409542d1fd5`.
- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.
- `release/desktop` was cleaned after packaging so only the formal PKG handoff remains.

## 2026-06-19: 0.1.9 Sidebar Fallback Navigation and Scroll Hotfix

Status: completed.

What was done:

- Added a server-side fallback project lookup so sidebar creative-tool links work even when the current route does not contain a project id.
- Kept route project ids as the first priority, then falls back to the most recently updated local project.
- Added independent vertical scrolling to the fixed desktop sidebar so the local SQLite persistence note is not clipped in short windows.
- Bumped the app version to `0.1.9` for the replacement macOS installer.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 24 files and 105 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.9"`.
- Packaged runtime still uses `runDesktopMigrations` and does not contain Prisma CLI `migrate deploy` startup code.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.9-mac-arm64.pkg`.
- SHA-256: `136ff557b2f35efb59487943c39851b693a1aa5360fb531cbb22287cddfe5100`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

## 2026-06-19: 0.1.8 Project Dashboard Status and Sidebar Navigation Hotfix

Status: completed.

What was done:

- Changed the project detail pending-update card from total suggestion count to workflow state counts: pending, approved, and rejected.
- Added a project-aware sidebar navigation component.
- Turned sidebar creative-tool entries into real links for the current project: settings, characters, chapters, and AI task records.
- Added active-state highlighting for project landing pages and project tool pages.
- Bumped the app version to `0.1.8` for the replacement macOS installer.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed, 24 files and 105 tests.
- `npm run build` passed.
- `npm run desktop:smoke` passed.
- `git diff --check` passed.
- `npm run desktop:dist:mac` produced the signed macOS app payload with notarization skipped for personal use.
- `codesign --verify --deep --strict --verbose=2` passed for the generated app payload and the expanded PKG payload app.
- `pkgutil --expand-full` confirmed the package metadata has `install-location="/Applications"` and bundle `CFBundleShortVersionString="0.1.8"`.
- Packaged runtime still uses `runDesktopMigrations` and does not contain Prisma CLI `migrate deploy` startup code.
- Final handoff package: `release/desktop/NovelForge-AI-0.1.8-mac-arm64.pkg`.
- SHA-256: `d7234a372c4090ec5c84cc110793f3ca790fb8408bb392c10731b0b4a06f2431`.

Packaging note:

- The app payload is Developer ID Application signed. The PKG itself still reports `Status: no signature` because the local keychain does not contain a Developer ID Installer certificate.

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
