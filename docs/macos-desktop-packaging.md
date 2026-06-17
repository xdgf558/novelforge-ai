# macOS Desktop Packaging

Phase 13 packages the local MVP as a macOS desktop app while keeping the existing Next.js, Prisma, and SQLite application as the functional core.

## Architecture

- Electron is a thin desktop shell.
- The Electron main process starts a local production Next.js server on `127.0.0.1`.
- The BrowserWindow loads that local server.
- The desktop shell sets `DATABASE_URL` for the server process.
- Prisma migrations run on startup against the desktop database before the Next.js server starts.
- No cloud sync, SaaS account system, payment, mobile app, or automatic WeChat publishing is introduced.

## Local Data

The desktop app stores user data outside the app bundle:

- database: `~/Library/Application Support/NovelForge AI/data/novelforge-ai.sqlite`
- optional AI config: `~/Library/Application Support/NovelForge AI/.env`
- generated example config: `~/Library/Application Support/NovelForge AI/.env.example`

The database file is created before Prisma migrations run. This preserves the Phase 1 SQLite startup workaround and avoids first-launch database creation failures on this machine.

## API Key Handling

Desktop API keys remain server-only.

The desktop shell reads only these keys from the optional desktop `.env` file:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

The desktop shell ignores `DATABASE_URL` from that file because it owns the local desktop database path.

## Commands

```bash
npm run desktop:dev
npm run desktop:smoke
npm run desktop:pack:mac
npm run desktop:dist:mac
```

Use `desktop:pack:mac` for a fast local `.app` directory verification. Use `desktop:dist:mac` when DMG/ZIP artifacts are needed.

## Packaging Notes

- `electron-builder` output is written to `release/desktop/`.
- The app is not signed or notarized in Phase 13.
- Distribution hardening can later add signing, notarization, app icons, versioned release cleanup, and update metadata.
