# Product Memory Design

This file defines the product-level memory system that should be implemented before broad AI generation features expand.

## Goal

NovelForge AI must remember story facts across a long serialized novel without sending the whole manuscript to the model each time.

Memory is not a single prompt. It is a structured database plus controlled AI extraction and review.

## Work Type Boundary

Every project has one durable work type: `serial_novel` or `short_story`.
Existing projects default to `serial_novel`, and the type is immutable after
creation so a populated long-form project cannot silently switch workflows.

Both work types share formal settings, characters, structured memory, AI task
records, version history, and author-approval rules. Long-form volume, storyline,
chapter, and audiobook surfaces remain specific to serial novels. Short stories
use a focused workspace and will reuse `Chapter` as an internal writing-unit
foundation rather than duplicating the prose/version/task storage model.

Short-story projects also have one formal blueprint with premise, opening hook,
protagonist pressure, core conflict, reversal chain, emotional arc, climax,
ending, required payoffs, and forbidden deviations. The blueprint is durable
planning memory: manual saves, adopted AI drafts, and restores create version
snapshots. AI generation only creates a logged review draft; formal blueprint
fields change only after explicit author adoption. Restoring an old snapshot
creates a new rollback version so history remains append-only.

Before a short-story writing unit exists, the new-unit form may request one
review-only AI planning draft. The task reads the formal blueprint, bounded
series context, relevant setting and characters, and prior units only, then
prefills the unit title, scene movement, conflict, turn, payoff movement, and
goal. Every field remains editable. Generation itself creates no formal unit;
the task is adopted and linked atomically only when the author submits the
normal create form successfully.

Short-story project settings may use an explainable writing-style preset to
fill the shared `styleSample` and `emotionalTone` fields. Presets describe
sentence rhythm, scientific-explanation density, suspense method, character
interaction, and ending tendency, but do not prescribe viewpoint access or
first/third person. Inspiration-author labels are presentation metadata only
and must not enter AI prompts; model guidance also states that reference
characters, worlds, names, plots, signature expressions, and original sentences
must not be copied. Applying a preset changes only the editable browser form,
preserves existing custom guidance as an author supplement, and becomes formal
memory only when the author submits the normal versioned project-setting save.

Narrative perspective is a separate formal setting shared by long-form serials
and short stories. The
explainable options cover immersive third-person limited, first-person
experiential, multi-character limited, and objective-camera narration. This
setting controls the viewpoint anchor, information boundary, access to other
minds, experiential distance, and scene-switch rules, so any perspective may be
combined with any writing style. Applying an option only fills an editable form
and preserves author supplements; the normal versioned save remains the only
formal write. Existing projects remain unset until the author explicitly
chooses or writes a rule. Project-setting AI may read the saved rule for context
but cannot generate, replace, or delete it. Long-form outline, chapter beat,
draft, normal/segmented polish, and chapter continuity tasks must obey the saved
rule; short-story blueprint, unit-plan, beat, draft, polish, and whole-story
review continue to obey it. Applied presets carry a stable generic machine id
marker while preserving aliases for prior short-story id and Chinese-label
markers, so UI copy can change without breaking saved settings or
version-history detection. Whole-story review may report viewpoint violations
without rewriting confirmed prose and returns two evidence-backed quality
metrics: total viewpoint violations and the subset that directly leaks
knowledge unavailable to the active viewpoint. Long-form continuity checks use
the same `narrative_perspective` category with source evidence. Any report
remains advisory and author-resolved.

Independent short-story projects may optionally belong to one
`ShortStorySeries`. The parent series does not merge prose or replace a story's
blueprint. It stores the recommended reading order, shared worldview,
cross-story continuity rules, recurring people/organizations/technology,
long-term mysteries, future direction, each story's series-progression note,
and accumulated core-character state. These are formal author-controlled
records. AI generation and review may read a bounded snapshot, but no AI task
may silently assign projects, reorder stories, or update series memory. Context
for the current story includes prior progression notes and excludes later story
notes so future disclosures cannot leak backward.

After writing units have confirmed final text, short-story projects can run a
whole-story closure review. The review assembles every confirmed unit under a
bounded prompt budget, retaining full text where possible and otherwise using
explicit head/middle/tail excerpts. It checks motivation, chronology, repeated
information, pacing gaps, opening promises, reversal setup, and unresolved
payoffs. Every suggestion must target an existing unit id and stores that
unit's final-text hash in the shared continuity-report layer. A changed unit
makes the suggestion stale. These reports are advisory and manual-only: they
cannot invoke one-click prose replacement or AI-generated fix patches.

Once confirmed units are ready, the complete-manuscript export reads only
`final` / `published` units with non-empty `finalText`, sorts them by unit
number, and assembles output deterministically in memory. Authors may remove
unit headings, keep neutral separators, or retain short unit titles. Export
cleanup may remove duplicate titles, internal work labels, known AI structure
traces, and serial-only follow hooks, but it must never write the cleaned result
back into unit prose or formal memory. Copy, TXT, and Markdown exports are local;
the 6,000-80,000 range is advisory and Fanqie upload remains manual.

Lifecycle operations preserve the same work-type boundary. Full local backups
snapshot the entire SQLite database and generated assets, so short-story
blueprints, unit plans, review reports, and task audit records travel together;
integration tokens remain excluded. Project Markdown/JSON exports include the
immutable work type and short-story planning fields. AI-task retention must
protect tasks referenced by blueprint versions, continuity reports, pending
updates, summaries, or other formal records. Hard deletion requires explicit
backup acknowledgement and removes only the selected project's database rows
and generated assets. Existing desktop databases migrate forward with legacy
projects defaulting to `serial_novel` and existing chapter prose unchanged.

Long-form outline status is a deterministic view of confirmed chapter progress
when an outline has a bounded chapter count or range. A range is `completed`
only when every expected chapter is `final` or `published`; created but
unfinished coverage is `active`, and a later prose revision may move a formerly
completed outline back to active. Explicitly archived outlines stay archived.
All chapter-status paths, including successful Station Cat publishing, should
run the same reconciliation, and migrations may repair historical stale labels.

Story-unit continuation remains review-first. When every current non-archived
unit is complete and the project is not ready to finish, the workspace may
recommend the next uncovered chapter and offer a one-click AI unit-planning
draft anchored to the previous chapter ending. The draft is only an AI task
record; it must not create or mutate a formal outline until the author reviews
and saves it.

## Memory Layers

### 1. Project Setting Memory

Stores the stable global foundation:

- Genre
- Target audience
- Selling point
- Main conflict
- Worldview rules
- Protagonist desire and flaw
- Villain logic
- Supporting characters
- Factions
- Timeline
- Pleasure mechanism
- Forbidden items
- Narrative perspective
- Style sample
- WeChat positioning
- Ending direction

Every accepted change should produce a setting version snapshot.

### 2. Character Memory

Stores stable and evolving character state:

- Identity
- Speaking style
- Desire
- Fear
- Secret
- Relationship to protagonist and antagonist
- Known information
- Hidden information
- Ability boundary
- Behavior rules
- Character arc
- First and latest appearance

Important character updates should produce character version snapshots.

### 3. World Rule Memory

Stores constraints that chapter generation and continuity checks must obey:

- Power system
- Social rules
- Economy rules
- Organization rules
- Geography rules
- Technology rules
- Cultivation or ability rules
- Law and taboo rules
- Cost mechanisms
- Information propagation rules

Core rules should be marked and treated as high risk when updated.

### 4. Chapter Memory

Each chapter stores both creative text and structured continuity data:

- Chapter goal
- Beats
- Draft text
- Polished text
- Publish text
- Short summary
- Structured summary
- Main events
- Character state changes
- New settings
- New foreshadows
- Resolved foreshadows
- Timeline events
- Continuity risks

### 5. Foreshadow Memory

Tracks planted and resolved foreshadows:

- Content
- Planted chapter
- Expected resolve chapter
- Actual resolve chapter
- Related characters, locations, factions
- Importance
- Status

Foreshadow lifecycle automation is review-first. Chapter summary extraction may
compare confirmed final text with a bounded set of unresolved formal
foreshadows and create pending `advance` or `resolve` suggestions with stable
foreshadow/chapter IDs, direct evidence, confidence, and the source final-text
hash. A historical audit may scan all legacy unresolved foreshadows in bounded,
sequential batches. These workflows never write formal memory silently:
high-confidence resolve candidates may be batch-approved by the author, while
medium-confidence or partial-progress candidates remain individually
reviewable. Changed final text makes the suggestion stale and prevents
application.

### 6. Timeline Memory

Tracks event order and story-time conflicts:

- Event title
- Event description
- Story time or phase
- Related chapter
- Related characters
- Related location
- Event impact

### 7. Storyline Memory

Tracks long-running narrative threads across outlines and chapters:

- Storyline name
- Storyline type, such as mainline, subplot, character arc, business line, antagonist line, foreshadow line, or world line
- Status
- Start and end chapter range
- Core goal
- Current progress
- Related characters
- Related foreshadows
- Related chapters
- Related outlines

Storylines are formal planning memory. They should be edited by the author or through explicit author-approved adoption only; AI may use them as context or generate reviewable candidates, but must not silently create or mutate them. Candidate generation can prefill a save form; the formal row is written only after the author confirms. Once the author has confirmed both `startChapter` and `endChapter`, the app may automatically add matching chapter relation rows as a deterministic convenience, but it should not silently remove manual chapter links.

### 8. AI Task Memory

Every AI call should be saved:

- Task type
- Model
- Prompt template id and version
- Input context summary
- Output text or JSON
- Status
- Error message
- Token input and output when available
- Created time
- Whether the user adopted the output

This lets future development debug model behavior and compare prompt versions.

### 9. Short Story Series Memory

Stores continuity shared by independently complete short stories:

- Series premise and reader promise
- Shared worldview and immutable rules
- Recurring people, organizations, locations, and technology
- Long-term mysteries and disclosure boundaries
- Recommended story order
- Per-story series progression note
- Core-character accumulated experience and current condition
- Cross-story relationship state
- Character known-information boundaries
- Recurring behavior and ability rules

Each short story remains a normal `short_story` project and can be exported on
its own. Deleting a story removes only its membership; deleting a series removes
the parent memory and memberships but never deletes member projects.

## Pending Update Rule

AI-extracted story changes must not directly modify formal memory.

Flow:

1. User confirms final chapter text.
2. System reads final text and current structured memory.
3. AI extracts proposed changes.
4. System writes suggestions to `pending_updates`.
5. User reviews each suggestion.
6. User approves, rejects, or edits before approving.
7. Approved updates write to formal tables.
8. System creates version records and preserves source chapter.

High-risk updates:

- Protagonist changes
- Antagonist changes
- Core worldview rules
- Timeline changes that affect earlier chapters
- Ability or power boundary changes
- Forbidden item changes

High-risk updates should require explicit confirmation.

## Context Assembly Rule

Each AI task should use a context assembler rather than ad hoc prompt construction.

For chapter beat generation, include:

- Project setting summary
- Current outline
- Relevant characters
- Relevant world rules
- Recent 3 chapter summaries
- Previous chapter ending or full text when needed
- Current chapter goal
- Forbidden items

For draft generation, include:

- Confirmed chapter beats
- Style sample
- Character speaking rules
- Previous chapter text or ending
- Target word count
- Forbidden items

For summary extraction, include:

- Final chapter text
- Chapter number
- Current setting summary
- Very long final text may be passed as a head/middle/tail excerpt for request stability, with the original length and excerpt strategy recorded in `ai_tasks`; a future chunk-and-merge pipeline can replace this when full long-chapter extraction is required.

For continuity check, include:

- Current chapter text
- Relevant characters
- Relevant world rules
- Timeline events
- Foreshadow pool
- Previous chapter summary
- Recent 3 chapter summaries
- Forbidden items

## Implementation Priority

Implement memory in this order:

1. Database schema for memory tables.
2. Version snapshot helpers for settings, characters, and chapters.
3. AI task logging helper.
4. Prompt template storage.
5. Context assembler.
6. Chapter summary extractor.
7. Pending update extractor.
8. Pending update reviewer and applier.
9. Continuity checker.
10. Phase summary generation every 10 chapters.

## Non-Negotiable Invariants

- No direct AI overwrite of formal memory.
- Continuity one-click fixes are allowed only as explicit author-triggered actions for precise replacement suggestions; vague AI advice must remain manual.
- No hidden AI changes.
- No full-manuscript prompt strategy for ordinary chapter generation.
- No frontend API key exposure.
- No unlogged AI calls.
- No accepted setting update without source and reason.
