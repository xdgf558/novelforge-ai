# Product Memory Design

This file defines the product-level memory system that should be implemented before broad AI generation features expand.

## Goal

NovelForge AI must remember story facts across a long serialized novel without sending the whole manuscript to the model each time.

Memory is not a single prompt. It is a structured database plus controlled AI extraction and review.

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

### 6. Timeline Memory

Tracks event order and story-time conflicts:

- Event title
- Event description
- Story time or phase
- Related chapter
- Related characters
- Related location
- Event impact

### 7. AI Task Memory

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
