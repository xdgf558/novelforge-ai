# UI/UX Route Audit

This audit keeps the public route tree aligned with the NovelForge writing
workbench instead of relying on a color-only compatibility pass.

## Interaction Rules

- Multi-stage work uses workspace tabs. Only the active stage renders its
  primary controls and long output.
- Review queues use a master-detail layout. The queue remains scannable while
  one selected record owns the approval or repair controls.
- Long snapshots and historical text use bounded, collapsible sections.
- Creation and edit forms group related fields and keep one stable save bar.
- Single-purpose pages may use the shared compact surface, but they must not
  reintroduce decorative card walls, oversized page sections, or unbounded
  model output.
- Desktop and mobile routes must avoid page-level horizontal overflow. Local
  tab, setting-navigation, and queue containers may scroll horizontally.

## Route Coverage

| Area | Routes | Workspace treatment |
| --- | --- | --- |
| Global entry | `/`, `/projects/new`, `/ai-settings` | Project library, shared project form, and tabbed global settings |
| Project workspace | `/projects/[projectId]`, `/projects/[projectId]/edit` | Phase-tabbed module index and shared project form |
| Formal setting | `/settings`, `/settings/history`, `/settings/history/[versionId]` | Section navigation, sticky save bar, compact history, collapsible snapshots |
| Characters | `/characters`, `/characters/new`, `/characters/[characterId]`, `/characters/[characterId]/edit`, both character history routes, `/characters/network` | Dense library plus grouped forms and bounded character snapshots |
| Planning | `/blueprint`, both blueprint history routes, `/outlines`, `/outlines/[outlineId]/edit`, `/storylines` | Compact planning forms; outline generation, ending planning, and formal records use separate workspace tabs |
| Chapter writing | `/chapters`, `/chapters/new`, `/chapters/[chapterId]`, `/chapters/[chapterId]/edit`, both chapter history routes | Compact chapter index; detail uses seven workflow tabs; forms and snapshots are grouped and collapsible |
| Review and memory | `/pending-updates`, `/continuity`, `/memory` | Master-detail review queues plus compact structured-memory sections |
| AI and delivery | `/ai`, `/publish`, `/audiobook`, `/acceptance` | Tabbed AI usage/templates/tasks and compact sequential delivery tools |
| Short story | `/story-review`, `/manuscript` | Shared compact review/export surfaces inside the same project shell |
| Series | `/series`, `/series/new`, `/series/import`, `/series/[seriesId]`, `/series/[seriesId]/edit`, `/series/[seriesId]/characters/[characterId]/edit` | Dedicated series index/detail plus grouped series and character forms |

All 42 public `page.tsx` routes are covered by either a dedicated workspace
pattern or a shared form/snapshot pattern. New routes should be added to this
table during review.

## Current Shared Components

- `components/workspace-tabs.tsx`: accessible route-level workflow tabs with
  URL hash synchronization.
- `components/settings/project-setting-form.tsx`: section navigation and
  sticky version-save controls.
- `components/chapters/chapter-form.tsx` and
  `components/characters/character-form.tsx`: grouped author forms.
- `components/chapters/chapter-snapshot.tsx`,
  `components/characters/character-snapshot.tsx`, and
  `components/settings/setting-snapshot.tsx`: bounded historical snapshots.
- `.nf-review-*`, `.nf-module-*`, `.nf-setting-*`, and `.nf-workspace-*` in
  `app/globals.css`: shared operational layout primitives.

## Review Checklist

- The page exposes one clear current task.
- Long text does not push the next action several screens away.
- AI output and author-confirmed data remain visually distinct.
- Primary author actions use amber; AI/local state uses cyan.
- Controls remain reachable by keyboard after switching tabs or opening a
  mobile drawer.
- No page-level horizontal overflow exists at desktop or mobile widths.
