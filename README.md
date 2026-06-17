# NovelForge AI

NovelForge AI is a local-first AI writing workbench for long-form serialized novel authors.

The MVP focuses on structured story memory, setting versioning, character state tracking, chapter summaries, pending setting-update review, continuity checks, and traceable AI generation.

See `AGENTS.md` and `docs/` before starting implementation work.

## Local Development

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Default local URL:

- `http://localhost:3000`

Useful checks:

```bash
npm run test
npm run mvp:acceptance
npm run typecheck
npm run build
```

AI calls are server-only. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env`
before enabling real model-backed actions.
