# NovelForge AI

NovelForge AI is a local-first AI writing workbench for long-form serialized novel authors.

The MVP focuses on structured story memory, setting versioning, character state tracking, chapter summaries, pending setting-update review, continuity checks, and traceable AI generation.

See `AGENTS.md` and `docs/` before starting implementation work.

## Local Development

```bash
npm install
npm run prisma:migrate
npm run dev
```

Default local URL:

- `http://localhost:3000`

Useful checks:

```bash
npm run typecheck
npm run build
```

