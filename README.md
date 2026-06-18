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

AI calls are server-only. Use the in-app AI connection settings page to set
`OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL`, or set the same keys in
`.env` before enabling real model-backed actions.

## macOS Desktop Packaging

Phase 13 adds an Electron shell that launches the existing local Next.js app
inside a desktop window.

Development desktop shell:

```bash
npm run desktop:dev
```

Package a local macOS `.app` directory:

```bash
npm run desktop:pack:mac
```

Build distributable macOS artifacts:

```bash
npm run desktop:dist:mac
```

Desktop runtime data lives outside the app bundle:

- database: `~/Library/Application Support/NovelForge AI/data/novelforge-ai.sqlite`
- AI config: `~/Library/Application Support/NovelForge AI/.env`

On first launch, the app creates `.env.example` in that data folder. The desktop
UI can write `.env` from the AI connection settings page. Custom
OpenAI-compatible providers can be configured by setting `OPENAI_BASE_URL` and a
custom `OPENAI_MODEL`. API keys are passed only to the local server process.
