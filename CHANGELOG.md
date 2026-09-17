# Changelog

All notable changes to Side B will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-09-17

### Changed

- Update `plist` to 5.0.0 and Vitest to 5.0.0 after the Dependabot merges.
- Add the public GitHub repository, issue tracker and homepage to package metadata.

### Fixed

- Restore Apple Music XML imports after the `plist` 5 upgrade by loading its ESM parser.

## [0.5.1] - 2026-09-17

### Added

- GPL-3.0-only license, third-party notices, contributor/security documentation and a public-release preparation checklist.
- GitHub issue and pull-request templates, three-platform CI and weekly Dependabot configuration.
- Node.js 24 development baseline and shared editor/line-ending settings.

### Changed

- Upgrade Electron from 38 to 44.4.1, replacing its vulnerable `extract-zip` dependency with Electron's internal extractor; `npm audit` reports no vulnerabilities. The minimum macOS version is now 13.
- Corrected platform, Radio, FFmpeg and signing documentation; use npm ci for contributor setup.
- Include license notices in application packaging and compile native helpers before npm run dev.

### Fixed

- Remove personal playlist-name exclusions and their implicit deletion from Apple Music imports; filter only unsupported playlist types.
- Remove macOS-only assumptions from cross-platform repository and haptics tests; syntax-check scripts and tests as well as application source.

## [0.5.0] - 2026-09-15

### Added

- Session-only listening history above the pending queue, with virtualized rows and replay without consuming pending tracks.

- Added a NOW PLAYING scroll boundary: the first upward gesture stops at the queue start, and a separate upward gesture reveals session history.
- Local playlist editor with names, library search, song insertion/removal and persistent ordering, including empty playlists and repeated tracks.
- Mix-Tape Save Playlist and Clear buttons; Clear preserves the current song and playback position while removing other tracks; both buttons are hidden in Radio.

### Changed

- Playing a pending song consumes that queue entry; OFF and Shuffle stop when no pending songs remain.
- Current playback, pending songs and listening history are presented separately. Each replay becomes a new listening entry.
- Removed cross-restart session restoration from the roadmap; history survives macOS window reopening but resets when the app quits.

### Fixed

- Cancel pending Smart Fade analysis when clearing upcoming tracks without stopping current playback.
- Fit the cassette to the available deck height and reserve footer space to prevent the center panel from overflowing.
- Invalidate delayed native crossfade callbacks after cancel, stop or loading another track.

## [0.4.1] - 2026-09-14

### Added

- Added experimental support for Windows: x64 NSIS packaging and platform-aware startup, Electron playback routing, local playback volume and seekable lossless ALAC fallback through FFmpeg.
- Centralized FFmpeg discovery with PATH, Intel/Apple Silicon and `SIDE_B_FFMPEG_PATH` support.
- Added native macOS trackpad feedback for button hover and press interactions, with a persistent `HAPTIC` control and silent fallback.
- Added drag-and-drop insertion of individual library songs into any Mix-Tape position.
- Added double-click replacement of the current cassette song while preserving the rest of the Mix-Tape.
- Added a persistent Like control with explicit `liked` and `unliked` telemetry.
- Added an `OFF / SHUFFLE / RADIO` playback-mode selector.
- Added local personalized Radio with an infinite one-track recommendation queue, contextual scoring and explicit `+ / −` feedback.
- Added genre metadata to the persistent library index for better Radio continuity after a library Scan.
- Added release-year metadata to the library index as a Radio fallback when genre tags are unavailable.

### Changed

- Added a mandatory pre-commit release check to confirm whether the application version and changelog need updating.
- Enabled the Radio position in the playback-mode selector and made it preserve only the current and recommended tracks.
- Expanded the Radio roadmap with a text-first AI host prototype, optional sourced enrichment and pluggable speech synthesis.
- Defined the Radio Host as a source-grounded editorial system with narrative connection discovery, silence as a valid choice, anti-repetition memory and separate quality/factuality feedback.
- Expanded the roadmap with a common cassette-presentation interface and distinct Single Cassette and Album Cassette behaviors.
- Marked native macOS trackpad haptics as implemented in the interaction roadmap.
- Replaced the transport Shuffle button with Like and moved Shuffle into the playback-mode selector.
- Moved the playback-mode selector into the center of the cassette deck header beside the `RP-80` model label.

### Fixed

- Recalculate the Radio recommendation when a library song replaces the current track via double-click.
- Prevent unrelated exploratory Radio choices from outranking candidates connected by genre, artist, album or a shared playlist.
- Require temporal compatibility before treating a shared playlist as sufficient Radio context.

## [0.3.0] - 2026-09-13

### Added

- `AWAKE` window control backed by Electron's display-sleep blocker, preserving its state when the macOS window is closed and reopened.
- Physical compact-cassette geometry and proportional reel-pack calculations.

### Changed

- Documented the explicit-authorization requirement for creating Git commits.
- Made the cassette and J-card resize as one aspect-locked component in normal and compact layouts.
- Scaled cassette internals from the component width instead of mixing viewport, pixel and percentage units.
- Reduced the full tape-pack diameter to 75% of the physical maximum for the one-song-per-cassette presentation.

## [0.2.1] - 2026-09-12

### Added

- Git repository workflow with `stable` and `experimental` branches.
- Project contribution and architecture guidelines.
- Keep a Changelog release history.
- Main-process playback-session state for rebuilding renderer windows without restarting native playback.

### Fixed

- Restored the active Mix-Tape, artwork, adaptive cassette colors, metadata, playback position and transport state after closing and reopening the macOS window, while safely ignoring native playback events until the new window exists.

## [0.2.0] - 2026-09-12

### Added

- Night theme with a persistent Light/Night preference.
- J-card album artwork presentation behind the cassette.
- Album-derived cassette colors with independent contrast calculation for label regions.
- Local playback telemetry for future recommendations.
- Apple Music listening-statistics import.
- Vitest suite covering playback policy, Mix-Tape ordering, SQLite repositories, telemetry, Apple Music import and packaged native-audio paths.
- `npm run check`, `npm test` and `npm run test:watch` development commands.
- MVC-inspired project structure with dedicated controllers, views, models, repositories, services and IPC registration.

### Changed

- Reworked cassette reel and tape geometry to keep the tape behind the visible cassette window.
- Scaled cassette metadata relative to the cassette container instead of the application viewport.
- Moved the SQLite database layer, media scanner, Apple Music importer, audio analysis and native playback bridge into focused modules.
- Updated project documentation for the current architecture and local-first data model.

### Fixed

- Corrected text contrast independently for the album, artist and song label backgrounds.
- Corrected the packaged path resolution for the native `retro-audio` helper.
- Reported native helper launch failures back to the renderer instead of failing silently.
- Preserved database and native-audio services when reopening the application on macOS after closing its last window.

## [0.1.0] - 2026-09-10

### Added

- Initial Side B Electron beta for local music playback.
- Native ALAC/M4A playback through an Objective-C `AVAudioPlayer` helper.
- Recursive local-library indexing with persistent SQLite storage.
- Files, Songs, Artists and Albums navigation.
- Apple Music XML import for regular playlists.
- Paginated and reorderable Mix-Tape queue.
- Animated cassette reels and playback-progress tape geometry.
- Smart Fade with silence detection, gain matching and transition indication.
- macOS Now Playing, media-key and system-volume integration.
- Compact and always-on-top modes.
