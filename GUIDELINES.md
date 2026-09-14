# Side B Development Guidelines

This document defines how Side B should evolve without returning to monolithic files or coupling visual details to playback behavior.

## Architectural approach

Side B uses an MVC-inspired architecture adapted to Electron. It is not classical server-side MVC; the important rule is separation of responsibilities.

- **Models** describe music, queues, playlists and listening state. They must not manipulate the DOM.
- **Views** render state and own presentation-specific calculations, such as cassette colors and tape geometry. They must not access SQLite or the filesystem.
- **Controllers** respond to user or playback events, coordinate models and views, and call the preload API.
- **Services** perform application operations such as scanning files, reading metadata, analyzing audio or importing Apple Music data.
- **Repositories** are the only modules that contain persistent SQLite queries.
- **IPC handlers** validate renderer input and translate requests into service or repository calls.

Dependency direction:

```text
Renderer View ← Renderer Controller → preload API
                                      ↓
                                  IPC handler
                                      ↓
                          Service → Repository → SQLite
```

Code must not depend in the opposite direction. A repository cannot know about Electron windows, and a cassette view cannot decide which song plays next.

## Electron process boundary

- Keep `contextIsolation: true` and `nodeIntegration: false`.
- The renderer must never use `fs`, `child_process`, SQLite or unrestricted Electron APIs.
- Add renderer capabilities through a narrowly named method in `src/preload.js`.
- Validate all IPC arguments in the main process, even when the current renderer is the only caller.
- Do not expose raw `ipcRenderer`, filesystem paths beyond the selected library, database handles or native-process handles.

## File placement

- Application startup and dependency wiring: `src/main/index.js`.
- Window creation: `src/main/window.js`.
- IPC registration grouped by domain: `src/main/ipc/`.
- SQLite access: `src/main/database/`.
- Filesystem, import, analysis and platform operations: `src/main/services/`.
- Domain conversion and value helpers: `src/main/models/`.
- UI event coordination: `src/renderer/controllers/`.
- DOM rendering and visual calculations: `src/renderer/views/`.
- Styles: `src/renderer/styles/`, split by component when a section becomes difficult to scan.

Avoid generic files named `utils.js` or `helpers.js`. Name modules after the domain responsibility they implement.

## State and playback rules

- Playback state has one authoritative owner. Views receive state; they do not infer business state from CSS classes.
- Visual animations must not delay, interrupt or determine audio transitions.
- Manual track selection and automatic advancement remain distinct events.
- Shuffle must select and retain the prepared next track so Smart Fade and telemetry agree on what will play.
- Every new playback path must consider Stop, Pause, seeking, natural completion, manual skip, Repeat and Smart Fade.

## Database rules

- The database remains in Electron's `userData` directory, never inside the `.app` bundle.
- Preserve existing user data across builds and refactors.
- Schema changes must be additive and migrate existing installations.
- New schema work should use numbered, idempotent migrations instead of adding more startup conditionals.
- Use transactions for multi-table writes and queue/playlist reordering.
- Store normalized data once when practical; do not duplicate large cover-art Base64 strings across new tables.

## Telemetry and recommendations

- Listening history is local-only unless an explicit future feature says otherwise.
- Record facts, not inferred preferences: event type, position, duration, source and playback mode.
- Explicit signals such as Like or Radio `+ / −` must remain distinguishable from passive completion or skips.
- Schema and event-name changes must remain backward-compatible with already collected history.
- UI experiments must not leave synthetic events in the user's real listening history.

## UI and styling

- Preserve the physical cassette metaphor while keeping controls understandable.
- Album-derived colors require contrast calculation for every independently colored label area.
- Size text relative to its component or container, not solely to viewport width.
- Test changes in normal, Compact, full-screen, Light and Night modes.
- Decorative animation must respect disabled and paused states.
- Keep text selectable only in actual input fields.

## Native and platform code

- Keep macOS-specific audio and MediaPlayer behavior behind the native-audio service.
- Communication with `AudioEngine.m` uses newline-delimited JSON; new commands and events must be documented on both sides.
- Native failures must not crash the renderer. Return a clear error state and preserve the UI.
- Centralize external binary paths such as FFmpeg before supporting Intel Macs or other platforms.

## Quality bar for changes

Vitest is the default unit-test framework. Place tests in `tests/` with a `.test.js` suffix. Prefer pure deterministic tests, inject randomness when testing Shuffle/Radio, and use in-memory SQLite databases for repository tests. Unit tests must never open or mutate the real database in `userData`.

Do not create Git commits automatically. Changes remain uncommitted on the active branch until the user explicitly requests a commit, even when implementation and verification are complete. Before executing any requested commit, explicitly ask whether the change should update the application version and `CHANGELOG.md`. Assume both are normally required; skip either one only when the user confirms it is unnecessary.

Day-to-day development and visual experimentation happen on the `experimental` branch. Release candidates are merged into `stable` only after explicit user approval. Versioned DMG artifacts must always be built from a clean `stable` checkout, never directly from `experimental`.

`CHANGELOG.md` must be updated with every change. Add the entry under `[Unreleased]` in the same commit as the code, documentation, build, dependency, behavior or data-model change. Use the Keep a Changelog categories `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed` and `Security`; move entries into a dated semantic-version section only when preparing a release.

Before considering a feature complete:

1. Run syntax checks for every changed JavaScript file.
2. Launch the application and verify that the existing library loads from SQLite.
3. Test the affected flow with native ALAC playback when playback code changed.
4. Verify Light/Night and normal/Compact layouts when presentation changed.
5. Confirm that no unintended telemetry or destructive database migration was introduced.
6. Update `README.md`, `GUIDELINES.md` or `TODO.md` when behavior, architecture or roadmap changes.
7. Update the `[Unreleased]` section of `CHANGELOG.md` in the same commit.

Prefer small modules with explicit dependencies. When a file mixes persistence, business logic and DOM manipulation, split it before adding another feature to that area.
