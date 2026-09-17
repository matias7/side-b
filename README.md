# Side B

Side B is a local music player built with Electron and inspired by cassette Walkmans. It targets macOS on Apple Silicon, with experimental Windows support. Album artwork becomes a physical-looking J-card and drives the cassette label palette while the reels and tape reflect playback progress.

Licensed under [GPL-3.0-only](LICENSE). Side B is a beta: Windows packaging and playback still require validation on Windows hardware.

The application is local-first: music, playlists, library indexes and listening history stay on the user's computer.

## Current features

- Recursive indexing of local MP3, AAC, M4A/ALAC, WAV, OGG, FLAC and Opus files.
- Native ALAC playback through an Objective-C `AVAudioPlayer` helper, without runtime conversion.
- Files browser and logical Songs, Artists, Albums and Playlists views.
- Apple Music XML import for regular playlists and aggregate listening statistics.
- Persistent SQLite library and playback-event history.
- Reorderable and paginated Mix-Tape queue, with Save Playlist and Clear controls.
- Local playlists: create, rename, add/remove songs and persist their order.
- Local personalized Radio that uses listening history, Apple Music statistics, Likes, skips and artist/album/genre context to keep one next recommendation ready.
- Individual-song drag and drop from Tapes, plus double-click replacement of the currently inserted song.
- OFF, Shuffle and Radio playback modes, plus explicit Likes.
- Smart Fade with silence detection, level matching and transition events.
- macOS Now Playing integration, media keys and system-volume control.
- Light and Night themes, Compact mode, always-on-top mode and adaptive cassette colors.
- Native macOS trackpad feedback for button hover and press interactions.

## Requirements

- Node.js 24 and npm for development (`.nvmrc` records the supported major).
- macOS 13 or newer on Apple Silicon, plus Xcode Command Line Tools to compile the native helpers.
- FFmpeg for Smart Fade analysis and Windows ALAC fallback. Set `SIDE_B_FFMPEG_PATH` to an executable, install it on PATH, or use Homebrew's default location on macOS.

| Platform | Status | Playback |
| --- | --- | --- |
| macOS 13+ / Apple Silicon | Primary development and DMG target | Electron audio plus native ALAC, Smart Fade and macOS integrations |
| Windows / x64 | Experimental; hardware and installer validation pending | Electron audio, external FFmpeg for ALAC, application volume |
| Linux / Intel macOS | No supported release target yet | Passing unit tests alone does not imply supported playback |

## Development

```bash
npm ci
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

The ARM64 DMG is written to `dist/`. electron-builder may discover a local signing identity automatically; the latest locally built release used an Apple Development certificate. Developer ID distribution signing and notarization are not configured as a reproducible public release process. See [the public-release checklist](docs/PUBLIC_RELEASE.md).

For an unsigned local test build, set `CSC_IDENTITY_AUTO_DISCOVERY=false` before running the build. GitHub CI checks syntax, tests and native compilation without signing or publishing releases.

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
├── shared/                      Pure queue rules shared across processes
└── renderer/
    ├── index.html               View structure
    ├── controllers/             UI orchestration and event handling
    ├── models/                  Pure playback and queue policies
    ├── views/                   Reusable presentation logic
    └── styles/                  Visual system and component styles

native/
├── AudioEngine.m                Native macOS playback and MediaPlayer bridge
└── HapticEngine.m               Native macOS trackpad feedback
```

The renderer never imports Node.js modules or accesses the filesystem directly. Privileged work is requested through the narrow API exposed by `preload.js` and implemented by IPC handlers in the main process.

See [GUIDELINES.md](GUIDELINES.md) before adding features, [CHANGELOG.md](CHANGELOG.md) for release history and [TODO.md](TODO.md) for the current roadmap.

For contributions, start with [CONTRIBUTING.md](CONTRIBUTING.md). Report security concerns using [SECURITY.md](SECURITY.md). Third-party licensing notes are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Project status

Side B is a functional beta. It is intended for local use while playback behavior, library management, recommendations and distribution are developed further.

## Windows (experimental)

On Windows x64, install Node.js 24/npm, then run `npm ci` and `npm start`.
No Xcode or macOS native helpers are required. Run `npm run dist:win` on Windows
from the approved clean stable branch to produce an NSIS installer in `dist/`.
Windows packaging and playback still need validation on a Windows machine.

Windows uses Electron audio. ALAC requires FFmpeg on PATH (`ffmpeg.exe`) or the
`SIDE_B_FFMPEG_PATH` environment variable pointing to the executable. ALAC is
converted losslessly into a temporary FLAC before playback, so initial loading
can be slower; a complete file preserves seeking. The most recent conversion is
cached; the last temporary file may remain after exit. FFmpeg is not bundled.
The volume slider controls application audio on Windows. Native Smart Fade,
macOS Now Playing and trackpad haptics remain macOS-only.
The Windows database is in Electron's userData folder, normally
`%APPDATA%/Side B/side-b-library.sqlite`.

Library, queue and telemetry rules stay shared. Source codec information is
stored independently of runtime backend selection, allowing a future native
Windows engine without duplicating those rules or migrating the library.

## Create and edit playlists

Use **＋ PLAYLIST** below the library search to create a local playlist. The
editor lets you name it, search indexed songs, add or remove tracks, and move
tracks up or down. Empty playlists and repeated songs are supported.
Select a local playlist under **Tapes → Playlists**, then choose **EDIT**.
Changes are saved together; Cancel or Escape discards the draft.

**SAVE PLAYLIST** above the Mix-Tape opens a new playlist with the whole queue
in its current order, including repeated songs. Save Playlist and Clear are hidden in Radio mode. Saving or editing does not alter
the loaded Mix-Tape. To edit an Apple Music import, load it into the Mix-Tape
and save a local copy.

**CLEAR** removes all other tracks from the Mix-Tape and cancels pending Smart
Fade work, preserving the current song, position and playing/paused state. It does not delete music files, playlists, Likes or listening history.
Playlist controls are in the full layout; exit Compact to use them.

## Listening history and queue

The Mix-Tape shows the current song under **NOW PLAYING** and only pending songs
under **UP NEXT**. Playing a pending song removes that occurrence from the queue.
OFF and Shuffle stop when no pending tracks remain; Repeat repeats the current song.

Scroll up to NOW PLAYING, pause briefly, then scroll up again to reveal the session
history. Selecting a history entry replays it without consuming pending songs.
Each listen remains a separate entry, including repeats and skipped songs that
started playing. Only visible history rows are rendered, while all entries remain
in memory. The history survives closing and reopening the macOS window and clears
when Side B quits. Listening statistics remain stored separately in SQLite.

Clear preserves current playback and history. Save Playlist includes the current
song and pending songs, excluding history. Both controls are hidden in Radio.
