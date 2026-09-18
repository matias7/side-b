# Public release preparation

Review date: 2026-09-17. This is a limited repository-readiness review, not a full
security audit or a statement that every platform is supported.

## Prepared in the repository

- GPL-3.0-only license and package metadata; license and notices included in packaging.
- Contributor guide, security policy, issue forms and a pull-request template.
- Node.js 24 baseline, reproducible `npm ci` setup and cross-platform text settings.
- CI for macOS, Windows and Linux: syntax, unit tests and native compilation.
- Weekly dependency and GitHub Actions update proposals through Dependabot.
- Portable path expectations in tests and syntax checks across source, scripts and tests.
- Removed personal playlist-name exclusions and automatic deletion of those imports.

The public repository is `matias7/side-b`, with `stable` as its default branch.
The first GitHub CI jobs passed on macOS, Windows and Linux for both branches.
Later Dependabot upgrades required an ESM import change for `plist` 5, included
in 0.5.2; review CI again after the fix is pushed to `experimental`.
The local repository uses its matching SSH key without changing other projects.

## Resolve before promoting public binaries

- [x] Upgrade Electron and its download dependencies from 38.8.6 to 44.4.1.
  The old `extract-zip` dependency was replaced by Electron's internal extractor.
  `npm audit` now reports zero vulnerabilities, and syntax, unit tests and native
  compilation pass on Node.js 24. An unsigned macOS arm64 application also packages
  successfully. Keep manual macOS audio, IPC and window checks in the release
  procedure below before promoting binaries. Electron 44 requires macOS 13 or newer.
- [ ] Review the local media protocol and IPC path boundaries. Currently decoded
  media URLs go directly to file loading, and native audio payloads are forwarded
  after validating the action name. Restrict reads to indexed/authorized tracks,
  validate payload shape and numbers, validate IPC senders, and explicitly reject
  unexpected navigation/new windows before advertising hardened untrusted-file use.
- [ ] Validate Windows startup, installation, seeking, ALAC conversion and uninstall
  on Windows hardware. CI compilation is not playback validation.
- [ ] Configure Developer ID signing/notarization for macOS distribution, or clearly
  label builds as unnotarized. Never commit certificates or publish developer logs
  containing signing identities.
- [ ] Verify third-party notices in the final bundle. Publish corresponding source
  with each GPL binary release: tag the exact commit and make its source archive,
  lockfile, native source and build instructions available alongside the installer.

## Public repository settings and follow-ups

- [x] Choose the owner/repository name and add real `repository`, `bugs` and
  `homepage` package URLs: `matias7/side-b`.
- [x] Confirm redistribution permission for `assets/side-b-icon.png`; the
  maintainer confirmed it can be published under GPL-3.0. Use original/synthetic
  art for any future screenshots instead of album covers unless permission exists.
- [x] Decide whether to keep existing commit author email addresses public. The
  maintainer accepts publishing the personal email already present in history.
- [ ] Enable private vulnerability reporting and dependency/security alerts.
- [x] Select `stable` as the release/default branch; route normal contributions to
  `experimental`.
- [ ] Protect both branches and require the CI checks.
- [x] Review the first three-platform CI run: all six platform jobs passed.
  Configure Actions approval for outside contributors as appropriate. Workflows
  use read-only permissions and do not publish.
- [ ] Publish a demo screenshot with original assets and a short first-release note
  listing the supported platform and the known Windows/Like limitations.

The review examined all eight reachable commits for tracked environment files,
databases, signing keys, audio and build outputs. A full-history Gitleaks 8.30.1
scan found no leaks. No scanner can prove the absence of every possible credential;
inspect any future added files before publishing them.

## Useful follow-up refactors

The main/renderer/preload separation is worth retaining. Avoid a wholesale rewrite
just to publish the code. Split `app-controller.js` into playback, library navigation
and queue controllers as those areas change; it currently mixes their orchestration.
Split the dense CSS by component. Move future database changes to numbered migrations
instead of expanding the current startup migration function.

The Like indicator currently reads localStorage while listening events are stored
in SQLite. Consolidating durable Like state into SQLite remains a separate known
follow-up, not a completed fix in this preparation.

## Release procedure

1. Resolve the relevant items above and run `npm ci`, `npm run check`, `npm test`
   and `npm audit`. Review advisories for all dependencies, including development
   dependencies used to download/package the shipped runtime.
2. Complete the manual platform checks in GUIDELINES.md and record their scope.
3. Update the version and CHANGELOG.md, commit on experimental and review the merge.
4. Build from a clean stable checkout on the target platform; verify installer
   integrity and launch the packaged application. Keep generated binaries out of Git.
5. Publish the exact source tag and corresponding installer as a GitHub Release.
