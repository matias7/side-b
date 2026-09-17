# Security

Side B is beta software. Fixes target current development and the next release;
older releases do not have a guaranteed backport or response-time commitment.

## Reporting a vulnerability

Use the repository's **Security → Report a vulnerability** option when available.
Include affected versions, reproduction steps using synthetic data, and impact.
Do not open a public issue with an exploit or attach private music, databases,
credentials, or a complete Apple Music export.

If private reporting is unavailable, open an issue requesting a private contact
channel without disclosing the vulnerability. Maintainers must enable private
vulnerability reporting before the first public launch.

## Local data and scope

Playback events, imported statistics, playlists and the library index are stored
locally. Likes and appearance settings also use Electron's local storage. The
visible session history lives in memory. There is no intentional analytics upload
or music upload in the application. Dependency installation and builds use network
downloads. Sanitize logs and screenshots before sharing them.

Relevant review areas include the renderer/preload IPC boundary, local media
protocol, native JSON commands, metadata/XML parsing and external process calls.
Context isolation alone is not a substitute for validating paths and payloads.

See [docs/PUBLIC_RELEASE.md](docs/PUBLIC_RELEASE.md) for the outstanding review
items recorded before public launch. `npm audit` is one input, not a complete
security assessment.
