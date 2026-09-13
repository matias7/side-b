# Changelog

All notable changes to Side B will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
