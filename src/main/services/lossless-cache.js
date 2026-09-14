const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

// Complete FLAC files allow Chromium to seek using range requests.
// Keep only the most recent conversion; never change the original file.
function createLosslessCache(ffmpegPath) {
  let tail = Promise.resolve();
  let cached = null;
  return function convert(filePath) {
    const job = tail.then(async () => {
      const stat = await fs.stat(filePath);
      const key = JSON.stringify([filePath, stat.size, stat.mtimeMs]);
      if (cached?.key === key) return cached.file;
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'side-b-audio-'));
      const file = path.join(directory, 'audio.flac');
      try {
        await new Promise((resolve, reject) => {
          const child = spawn(ffmpegPath, ['-nostdin', '-hide_banner', '-loglevel', 'error',
            '-i', filePath, '-map', '0:a:0', '-c:a', 'flac', file],
          { stdio: 'ignore', windowsHide: true });
          child.on('error', reject);
          child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}`)));
        });
      } catch (error) {
        await fs.rm(directory, { recursive: true, force: true });
        throw error;
      }
      if (cached) await fs.rm(cached.directory, { recursive: true, force: true }).catch(() => {});
      cached = { key, file, directory };
      return file;
    });
    tail = job.catch(() => {});
    return job;
  };
}

module.exports = { createLosslessCache };
