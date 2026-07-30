# Contributing to NovelForge AI

Thanks for helping improve NovelForge AI.

## Before you start

Read:

- `docs/project-memory.md`
- `docs/product-memory-design.md`
- `docs/development-log.md`
- `AGENTS.md`

Keep changes inside the active local, single-user MVP boundary. In particular,
do not add cloud sync, SaaS multi-tenancy, payments, team permissions, mobile
apps, or automatic WeChat publishing without an explicit product decision.
The existing Station Cat publishing integration remains inside the current
product scope.

## Development setup

Use Node.js 22 LTS and npm:

```bash
npm ci
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Never commit `.env`, API keys, tokens, SQLite databases, backups, generated
assets, manuscripts, logs, or packaged desktop applications.

## Pull requests

1. Create a focused branch.
2. Follow existing architecture and keep unrelated refactors out of the patch.
3. Add or update tests for behavior changes.
4. Update `docs/development-log.md`; update `docs/project-memory.md` when scope,
   architecture, commands, or product decisions change.
5. Run the relevant checks:

```bash
npm test
npm run typecheck
npm run build
npm run desktop:smoke
npm run mvp:acceptance
npm run work-types:acceptance
```

Pull requests must preserve the core author-control invariant: AI output may
propose changes, but formal settings, characters, world rules, timelines, and
foreshadows change only after explicit author approval.

## Contribution terms

The repository is source-visible and all rights are reserved. By intentionally
submitting a contribution, you represent that you have the right to submit it
and grant the repository owner a perpetual, worldwide, non-exclusive,
royalty-free, irrevocable license to use, reproduce, modify, distribute,
sublicense, and relicense that contribution as part of NovelForge AI.

Opening a pull request does not grant contributors a license to the rest of the
repository beyond the terms in `LICENSE`.
