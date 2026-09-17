# Contributing to Side B

Side B is a local-first music player built with Electron. Small bug fixes,
accessibility improvements, tests and platform reports are welcome. Discuss
large features in an issue before investing in an implementation.

## Development setup

Use Node.js 24 and npm. With nvm installed, run `nvm install` and `nvm use`.
Run `npm ci`, then `npm start`. On macOS, install Xcode Command Line Tools first.
FFmpeg is required for Smart Fade analysis and Windows ALAC conversion; see README.md.

The app can open the same userData directory as an installed build. Back up that
directory before testing data changes. Automated tests use in-memory databases;
never point tests at a personal library. Use synthetic audio for playback tests.

## Pull requests

1. Branch from `experimental` and target it with your pull request.
2. Follow [GUIDELINES.md](GUIDELINES.md) for architecture and data handling.
3. Keep the change focused. Add regression coverage for changed behavior.
4. Run `npm run check` and `npm test`. Run `npm run build:native` for native changes.
5. Update the Unreleased section of CHANGELOG.md. Maintainers handle release versions.

For playback changes, check pause, resume, stop, seek, manual skip, completion,
Repeat, Shuffle, Radio, history replay and Smart Fade cancellation. For UI changes,
check Light/Night, normal/Compact and full-screen layouts. Describe checks you
could not run rather than implying all platforms were tested.

Never include music files, private databases, Apple Music exports, personal paths
or album artwork you cannot redistribute. Contributions must be yours to license
under GPL-3.0-only; dependencies retain their own licenses.

## Project layout

- `src/main/`: application setup, IPC, platform services and SQLite repositories.
- `src/preload.js`: narrow bridge between Electron's processes.
- `src/renderer/`: controllers, views, models and styles.
- `src/shared/`: pure rules used by both processes.
- `native/`: macOS audio and haptic helpers.
- `tests/`: automated checks with synthetic data.
- `docs/`: release preparation and maintenance notes.

Be respectful and specific in reviews. Explain the behavior you want to improve,
give others room to disagree, and keep discussions about the work. Maintainers may
remove harassment, spam or disclosure of other people's private information.
