# Short Story Development Plan

This plan adds short-story creation without turning the existing serial-novel
workflow into a collection of mode checks. The app remains one local modular
monolith with shared project, character, memory, AI-task, and chapter storage.

## Product Boundary

- A project has one immutable `workType`: `serial_novel` or `short_story`.
- Existing projects and legacy submissions default to `serial_novel`.
- Short stories are exported as one complete work, but drafting should use
  bounded internal writing units instead of asking a model for 30,000 words in
  one response.
- `Chapter` remains the durable writing-unit foundation. Short-story UI may
  relabel those records as units or sections in later phases without creating a
  duplicate prose/version/task stack.
- Project setting, characters, structured memory, AI tasks, version history,
  continuity safeguards, and author approval remain shared capabilities.
- AI output never silently changes formal story memory or confirmed prose.

## Phase 1: Work Type and Architecture Foundation

Status: completed and merged.

- Add the backward-compatible `Project.workType` field and migration.
- Centralize work-type values, labels, normalization, and tool availability in
  `lib/projects/work-types.ts`.
- Select the type when creating a project and keep it immutable afterward.
- Give short-story projects a focused project dashboard and compact navigation.
- Keep the existing serial-novel dashboard and tools unchanged.
- Preserve work type in JSON, Markdown, and standard website publish packages.

## Phase 2: Short Story Blueprint

Status: completed and merged.

- Add a formal short-story blueprint with premise, hook, protagonist pressure,
  core conflict, reversal chain, emotional curve, climax, ending, required
  payoffs, and forbidden deviations.
- Generate only reviewable blueprint drafts through logged AI tasks.
- Write the formal blueprint only after explicit author adoption and retain
  version snapshots.

## Phase 3: Writing Unit Planning and Drafting

Status: completed and merged.

- Add a short-story writing-unit list plus manual new, edit, and review entry
  points, relabeling shared `Chapter` records without exposing serial-only tools.
- Recommend a bounded unit count from the total target instead of one-shot long
  generation.
- Plan each unit with a goal, scene movement, conflict, turn, payoff movement,
  and word target.
- Reuse the existing beat, draft, segmented polish, final-text, and version
  infrastructure with short-story-specific context and labels.
- Prevent repeated openings, recaps, character reintroductions, and artificial
  chapter-end hooks between internal units.

## Phase 4: Whole-Story Continuity and Closure

Status: completed and merged.

- Assemble confirmed units into a whole-story review context.
- Check motivation, chronology, repeated information, pacing gaps, opening
  promises, reversal setup, and unresolved payoffs.
- Generate reviewable revision suggestions tied to specific units; never rewrite
  confirmed prose automatically.
- Persist suggestions through the shared continuity-report workflow with target
  unit ids and source-text hashes. Whole-story review reports are manual-only:
  they cannot trigger one-click replacement or AI fix-patch generation.

## Phase 5: Complete Manuscript and Fanqie Export

Status: implemented for PR review.

- Deterministically merge confirmed units into one complete short story.
- Support no headings, section separators, or retained short headings.
- Remove internal work labels, duplicate titles, AI structure traces, and
  serial-only follow hooks without changing source prose.
- Provide copy, TXT, and Markdown output plus visible 6,000-80,000 word-range
  checks. Keep Fanqie upload manual.
- The implementation is short-story-only at
  `/projects/[projectId]/manuscript`. It reads only `final` / `published` units
  with non-empty `finalText`, performs all assembly in memory, and never writes
  the cleaned export back to chapter records.

## Phase 6: Hardening and Desktop Delivery

- Run serial-novel and short-story regression coverage together.
- Cover backup, project export, hard deletion, task retention, and migration from
  existing desktop databases.
- Verify desktop and mobile layouts, production build, packaged migrations, and
  the personal-use macOS installer after review approval.

## PR Rule

Each phase uses its own branch and draft PR. It is merged into `main` only after
author review, and a new desktop installer is built only after the approved
phase is merged.
