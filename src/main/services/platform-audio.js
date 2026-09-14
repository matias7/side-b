const { existsSync } = require('node:fs');

function resolveFfmpegPath(platform = process.platform, env = process.env, exists = existsSync) {
  if (env.SIDE_B_FFMPEG_PATH) return env.SIDE_B_FFMPEG_PATH;
  if (platform === 'darwin') {
    for (const candidate of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
      if (exists(candidate)) return candidate;
    }
  }
  return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

// ALAC is a source property; backend selection must never be persisted.
function playbackRoute(filePath, isAlac, platform = process.platform) {
  const nativePlayback = Boolean(isAlac) && platform === 'darwin';
  return {
    nativePlayback,
    url: `retro-media://local/${encodeURIComponent(filePath)}${isAlac && !nativePlayback ? '?transcode=flac' : ''}`
  };
}

module.exports = { resolveFfmpegPath, playbackRoute };
