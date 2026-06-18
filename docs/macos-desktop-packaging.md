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
- `OPENAI_BASE_URL`

The desktop shell ignores `DATABASE_URL` from that file because it owns the local desktop database path.
The in-app AI connection settings page writes the same `.env` file, so packaged
desktop users do not need to edit it by hand.

## Commands

```bash
npm run desktop:dev
npm run desktop:smoke
npm run desktop:pack:mac
npm run desktop:dist:mac
npm run desktop:dist:mac:notarized
```

Use `desktop:pack:mac` for a fast local `.app` directory verification. Use `desktop:dist:mac` when signed DMG/ZIP artifacts are needed without Apple notarization. Use `desktop:dist:mac:notarized` only when the Apple notarytool keychain profile is available.

## Packaging Notes

- `electron-builder` output is written to `release/desktop/`.
- The app uses the generated branded icon from `build/icon.icns`.
- macOS builds use Developer ID signing, hardened runtime, and `build/entitlements.mac.plist`.
- DMG artifacts are configured with `dmg.sign: true`.
- The packaged app runs from `Contents/Resources/app.asar.unpacked` because the desktop shell launches a bundled Next.js server and Prisma startup migrations.
- `scripts/after-pack.cjs` prunes unused Electron locale resources and copies `node_modules/.prisma` into `app.asar.unpacked`; keep this copy step, because electron-builder glob rules can skip the generated Prisma client dot directory.
- The signed-only scripts set `SKIP_NOTARIZE=1`; notarized builds use `APPLE_KEYCHAIN_PROFILE`, defaulting to `simplecut-pro-notary`.
