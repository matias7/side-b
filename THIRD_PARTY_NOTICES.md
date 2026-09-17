# Third-party components

Side B's own source is licensed under GPL-3.0-only. Third-party components keep
their original licenses. This overview does not replace their full notices.

| Component | Role | License declared by the package |
| --- | --- | --- |
| Electron | Desktop runtime | MIT, with bundled Chromium/Node.js and other notices |
| music-metadata | Audio metadata parsing | MIT |
| plist | Apple Music property-list parsing | MIT |
| electron-builder | Packaging tool | MIT |
| Vitest | Test runner | MIT |

The exact dependency versions are recorded in `package-lock.json`. Retain the
license files supplied with dependencies and Electron when distributing builds.
Review transitive dependency notices for each release.

FFmpeg is an external executable and is not bundled by this repository. Its build
configuration determines its licensing; review it before introducing bundled
FFmpeg distribution. Apple frameworks are provided by macOS and are not bundled.

Music, album artwork and Apple Music library exports supplied by users are not
part of Side B's license. Public screenshots and fixtures should use artwork and
audio the contributor has the right to distribute. Side B is not affiliated with
or endorsed by Apple.
