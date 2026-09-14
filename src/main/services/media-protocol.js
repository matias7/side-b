const { protocol, net } = require('electron');
const { pathToFileURL } = require('node:url');
const { createLosslessCache } = require('./lossless-cache');
const { resolveFfmpegPath } = require('./platform-audio');

function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'retro-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }]);
}

function handleMediaRequests(ffmpegPath = resolveFfmpegPath()) {
  const losslessFile = createLosslessCache(ffmpegPath);
  protocol.handle('retro-media', async (request) => {
    try {
      const mediaUrl = new URL(request.url);
      let filePath = decodeURIComponent(mediaUrl.pathname.slice(1));
      if (mediaUrl.searchParams.get('transcode') === 'flac') filePath = await losslessFile(filePath);
      return net.fetch(pathToFileURL(filePath).toString(), {
        headers: request.headers, signal: request.signal
      });
    } catch (error) {
      console.error('Media playback:', error.message);
      return new Response('Unable to open audio. ALAC on Windows requires FFmpeg.', { status: 500 });
    }
  });
}

module.exports = { registerMediaScheme, handleMediaRequests };
