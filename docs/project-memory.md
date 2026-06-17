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

## Next Phase

Phase 9 should focus on pending update extraction and review flow:

- Use the Phase 5 server-only AI wrapper and task logger for every model call.
- Use the project-scoped `pending_update_extraction` prompt template.
- Read author-confirmed final chapter text, current formal project setting, character memory, and the latest completed chapter summary task where useful.
- Extract proposed setting, character, world rule, timeline, and foreshadow updates into reviewable pending records.
- Add an author review surface for approving, rejecting, or editing proposed updates.
- Approved updates should write to formal tables with source chapter and version snapshots; rejected updates must not change formal memory.
- Keep high-risk updates visible and require explicit author approval.

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
- Export project data as Markdown or JSON.
