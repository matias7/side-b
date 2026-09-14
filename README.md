# Side B

Side B is a macOS local music player built with Electron and inspired by cassette Walkmans. Album artwork becomes a physical-looking J-card and drives the cassette label palette while the reels and tape reflect playback progress.

The application is local-first: music, playlists, library indexes and listening history stay on the user's Mac.

## Current features

- Recursive indexing of local MP3, AAC, M4A/ALAC, WAV, OGG, FLAC and Opus files.
- Native ALAC playback through an Objective-C `AVAudioPlayer` helper, without runtime conversion.
- Files browser and logical Songs, Artists, Albums and Playlists views.
- Apple Music XML import for regular playlists and aggregate listening statistics.
- Persistent SQLite library and playback-event history.
- Reorderable and paginated Mix-Tape queue.
- Individual-song drag and drop from Tapes, plus double-click replacement of the currently inserted song.
- OFF/Shuffle playback modes and persistent explicit Likes, with the future Radio position reserved in the interface.
- Smart Fade with silence detection, level matching and transition events.
- macOS Now Playing integration, media keys and system-volume control.
- Light and Night themes, Compact mode, always-on-top mode and adaptive cassette colors.
- Native macOS trackpad feedback for button hover and press interactions.

## Requirements

- macOS on Apple Silicon.
- Node.js and npm.
- Xcode Command Line Tools for compiling the native audio helper.
- FFmpeg installed at `/opt/homebrew/bin/ffmpeg` for Smart Fade analysis and non-native fallback processing.

## Development

```bash
npm install
npm start
```

`npm start` compiles `native/AudioEngine.m` and launches Electron. The existing SQLite database is stored outside the application bundle at:

```text
~/Library/Application Support/Side B/side-b-library.sqlite
```

Replacing or rebuilding the application therefore does not erase the library or listening history.

## Tests

```bash
npm test
npm run test:watch
npm run check
```

Vitest currently covers playback sequencing, Shuffle exclusions, Mix-Tape reordering, SQLite repositories, telemetry validation and Apple Music playlist/statistics import. All database tests use isolated in-memory SQLite databases and never touch the user's real library.

## Build a DMG

Release DMGs are built only from the `stable` branch after the approved `experimental` changes have been merged and validated.

```bash
npm run dist:mac
```

The unsigned ARM64 DMG is written to `dist/`. Signing and notarization are not configured yet.

## Architecture

Side B follows an MVC-inspired desktop architecture with an explicit Electron process boundary:

```text
src/
├── main/
│   ├── index.js                 Application composition root
│   ├── window.js                BrowserWindow construction
│   ├── ipc/                     Renderer-facing use cases
│   ├── database/                SQLite connection and repositories
│   ├── models/                  Shared domain representations
│   └── services/                Library, audio and import operations
├── preload.js                   Restricted IPC bridge
└── renderer/
    ├── index.html               View structure
    ├── controllers/             UI orchestration and event handling
    ├── models/                  Pure playback and queue policies
    ├── views/                   Reusable presentation logic
    └── styles/                  Visual system and component styles

native/
└── AudioEngine.m                Native macOS playback and MediaPlayer bridge
```

The renderer never imports Node.js modules or accesses the filesystem directly. Privileged work is requested through the narrow API exposed by `preload.js` and implemented by IPC handlers in the main process.

See [GUIDELINES.md](GUIDELINES.md) before adding features, [CHANGELOG.md](CHANGELOG.md) for release history and [TODO.md](TODO.md) for the current roadmap.

## Project status

Side B is a functional beta. It is intended for local use while playback behavior, library management, recommendations and distribution are developed further.
