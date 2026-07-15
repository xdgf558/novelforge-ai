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
- `IMAGE_API_KEY`
- `IMAGE_API_BASE_URL`
- `IMAGE_MODEL`
- `IMAGE_SIZE`
- `IMAGE_QUALITY`
- `STATION_CAT_API_BASE_URL`
- `STATION_CAT_PUBLISH_TOKEN`
- `STATION_CAT_DEFAULT_MODE`

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

Use `desktop:pack:mac` to produce the signed `.app` payload used for local
verification and the formal personal-use PKG. Use `desktop:dist:mac` only when
DMG/ZIP artifacts are explicitly needed without Apple notarization.

Current personal-use rebuild policy:

- Do not run Apple notarization by default.
- Build a clean `.pkg` that installs `NovelForge AI.app` into `/Applications`.
- Leave only the final versioned PKG in `release/desktop/` for normal handoff.
- Keep `desktop:dist:mac:notarized` only for an explicit future public-distribution request.
- Recheck the keychain before each release. When valid Developer ID Application
  and Installer identities are available, sign the app payload and final PKG,
  then verify the PKG certificate chain and the app expanded from that final
  PKG. If identities are unavailable, use an ad-hoc app plus unsigned PKG only
  after explicit author approval and record the limitation. Personal local
  builds remain unnotarized unless external Apple upload is explicitly
  authorized, so Gatekeeper may still require a one-time right-click Open
  confirmation.

## Packaging Notes

- `electron-builder` output is written to `release/desktop/`.
- The app uses the generated branded icon from `build/icon.icns`.
- macOS builds use Developer ID signing, hardened runtime, and `build/entitlements.mac.plist`.
- DMG artifacts are configured with `dmg.sign: true`.
- The packaged app runs from `Contents/Resources/app.asar.unpacked` because the desktop shell launches a bundled Next.js server and Prisma startup migrations.
- `scripts/after-pack.cjs` prunes unused Electron locale resources and copies `node_modules/.prisma` into `app.asar.unpacked`; keep this copy step, because electron-builder glob rules can skip the generated Prisma client dot directory.
- The signed-only scripts set `SKIP_NOTARIZE=1`; notarized builds use `APPLE_KEYCHAIN_PROFILE`, defaulting to `simplecut-pro-notary`, but should not be used for normal personal rebuilds.
- Build the PKG from a separate staging root with `pkgbuild`, identifier
  `com.novelforge.ai`, the current source version, and install location
  `/Applications`.
- Before handoff, verify the staged app, a second ordinary copy, and the app
  expanded from the final PKG with `codesign --verify --deep --strict`.
- Confirm the expanded app's Bundle version, packaged `package.json`, bundled
  migration count, runtime migration runner, and isolated SQLite migration
  acceptance. Do not overwrite the real `/Applications/NovelForge AI.app`
  merely to test an installer.
