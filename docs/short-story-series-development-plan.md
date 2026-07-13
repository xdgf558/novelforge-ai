# Short Story Series Development Plan

This plan adds a parent continuity layer for independently complete short
stories. It does not convert one project into a multi-chapter serial and does
not merge the prose, blueprint, review, or export lifecycle of member stories.

## Product Boundary

- Every episode remains an immutable `short_story` project.
- A short story may belong to at most one series at a time.
- Every story must retain its own cause, investigation, truth, and ending.
- Series memory may accumulate character experience, relationships, knowledge,
  recurring organizations or technology, and long-term mysteries.
- AI may read series memory, but formal series records change only through
  explicit author action or a future author-approved proposal workflow.
- Current-story prompts may read prior-entry progression notes but must not read
  future-entry notes.

## Phase 1: Series Foundation and Read-Only Continuity

Status: implemented for PR review.

- Add series, ordered membership, and core-character state tables.
- Add series list, create, detail, edit, and destructive confirmation pages.
- Add existing unassigned short-story projects to a series, reorder them, save
  per-story progression notes, or remove membership without deleting projects.
- Maintain shared worldview, continuity rules, recurring elements, long-term
  mysteries, future direction, and accumulated core-character state manually.
- Surface series membership on the project list and short-story dashboard.
- Feed bounded, read-only series context into blueprint, beat, draft, polish,
  and whole-story review tasks.
- Include the parent series context in short-story Markdown/JSON project exports
  and in work-type lifecycle backup/delete acceptance coverage.

## Phase 2: Author-Approved Series Handoff

Status: planned.

- After a story has confirmed final units, generate review-only proposals for
  character state, relationship state, known information, long-term mystery
  progress, and the story's series progression note.
- Bind proposals to source text hashes and stable series/story ids.
- Apply only after author review; stale source text must block approval.
- Keep episode project memory and series memory as separate approval targets.

## Phase 3: Next-Story Planning and Series Audit

Status: planned.

- Generate a review-only next-story brief from current series state without
  creating a project automatically.
- Check repeated case structures, continuity drift, premature mystery reveals,
  character-state regressions, and missing relationship consequences.
- Preserve random-entry readability by checking that every episode explains
  only the shared context needed for its independent plot.

## Phase 4: Series Export and Hardening

Status: planned.

- Export a series bible and ordered story catalog without merging member prose.
- Add broader migration, backup, deletion, responsive-layout, and desktop tests.
- Package only after the phase is reviewed and merged.

## PR Rule

Each phase uses its own branch and draft PR. Merge to `main` and installer
rebuild happen only after author review.
