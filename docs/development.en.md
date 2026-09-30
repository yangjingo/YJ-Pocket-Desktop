# Development and build guide

English · [简体中文](development.md) · Back to the [product page](../README.md)

This guide is for contributors and downstream developers. The [README](../README.md) and [PRD](specs/PRD.md) define what is shipped versus planned. A successful build is not a substitute for launching the package on its target OS.

## Set up

Install Node.js and npm, then run `npm ci` in the repository. Browsing and browser-supported media playback require no external service. Some video conversions and synthetic promo-asset generation need local `ffmpeg`; regenerating the app PNG/ICO also needs Python and Pillow.

Keep personal media outside the repository. The development machine defaults to the sibling `D:\YJ-Media` folder, but Settings can select another root. Never commit personal files, secrets, or indexes. For isolated testing, set `YJ_MEDIA_ROOT` to a demo library and `YJ_STATE_ROOT` to a separate state directory.

```powershell
npm ci
npm start
```

Open `http://127.0.0.1:8765/`. `npm start` builds before starting the loopback-only service; `npm run preview` uses port 8766. If you have no media library, select an existing test directory in Settings.

## Repository map

| Path | Responsibility |
| --- | --- |
| `app/` | HTML, CSS, and original SVG assets |
| `src/client/` | Desktop interactions, 3D archive objects, localization |
| `src/server/` | Local HTTP/API service and settings |
| `src/voice/` | Recording recognition and batch CLI |
| `src/shared/` | Runtime-independent utilities |
| `tests/` | Tests grouped to mirror `src/` features |
| `docs/media/promo/` | Remotion video project, captured screens, and audio inputs |
| `dist/` | Ignored local output; only the latest package is retained |

`src/app.ts`, `src/server.ts`, and `src/voice-transcribe.ts` are thin build entry points; `src/electron-main.ts` is the Electron main process. See the [source layout](specs/source-layout.md) for module boundaries and staged refactoring. The promo shares the app’s visual language but is not a runtime dependency.

## Verify changes

```powershell
npm run lint
npm run check
npm test
npm run build
npm run build:voice
npm run promo:check
```

`npm test` compiles test files into `dist/tests/` and runs them with Node. The web, server, and Electron entry points build to `dist/web/`, `dist/server.cjs`, and `dist/electron-main.cjs`. The current tests cover settings, concurrency limiting, and ASR fallback—not full UI or packaged-app behavior. Check desktop, Finder, preview, language, and narrow layouts in a browser after client changes; then launch packages on their target OS. A browser pass does not validate an EXE.

## Package and release

```powershell
npm run icons
npm run dist:win
```

`npm run icons` updates `app/assets/media-archive/*.svg`. `build/icon.svg` is the application icon source; `python scripts/render-app-icon.py` creates PNG/ICO files. The Windows portable package lands at `dist/packages/YJ-Pocket-Desktop-<version>-win-x64.exe`. Build `npm run dist:mac` and `npm run dist:linux` on the respective systems and launch-test there. Before a release, update the version in `package.json` and `package-lock.json`, the [changelog](../CHANGELOG.md), and follow the [release checklist](specs/release-process.md) for privacy, licenses, bundled resources, and real startup checks. `dist/` stays out of Git; publish packages separately through Releases.

## Promo and recording tools

Finished videos live in `docs/media/`; the editable project is in [`docs/media/promo/`](media/promo/README.md):

```powershell
npm run promo:assets
npm run promo:check
npm run promo:studio
npm run promo:render:en
```

`promo:assets` creates an isolated synthetic library in `dist/promo-demo-media/` and regenerates the project audio. See the promo README for UI recapture steps. Recording batch processing uses `node scripts/transcribe.mjs` with options such as `--root`, `--dry-run`, and `--asr-only`. ASR calls an external service; do not test it inadvertently with private recordings. See the [media migration spec](specs/media-library-migration.md).
