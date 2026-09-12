# Changelog

All notable changes to Side B will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Git repository workflow with `stable` and `experimental` branches.
- Project contribution and architecture guidelines.
- Keep a Changelog release history.

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
