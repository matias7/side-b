const { protocol, net } = require('electron');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const { Readable } = require('node:stream');

function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'retro-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }]);
}

function handleMediaRequests(ffmpegPath = '/opt/homebrew/bin/ffmpeg') {
  protocol.handle('retro-media', async (request) => {
    const mediaUrl = new URL(request.url);
    const filePath = decodeURIComponent(mediaUrl.pathname.slice(1));
    if (mediaUrl.searchParams.get('transcode') === 'flac') {
      const ffmpeg = spawn(ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-i', filePath,
        '-map', '0:a:0', '-c:a', 'flac', '-f', 'flac', 'pipe:1'
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      request.signal.addEventListener('abort', () => ffmpeg.kill());
      ffmpeg.stderr.on('data', (chunk) => console.error(`ffmpeg: ${chunk}`));
      return new Response(Readable.toWeb(ffmpeg.stdout), {
        headers: { 'Content-Type': 'audio/flac', 'Cache-Control': 'no-store' }
      });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

module.exports = { registerMediaScheme, handleMediaRequests };
