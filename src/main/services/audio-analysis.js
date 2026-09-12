const { spawn } = require('node:child_process');

function createAudioAnalyzer(ffmpegPath = '/opt/homebrew/bin/ffmpeg') {
  const cache = new Map();
  return function analyze(filePath, duration) {
    if (cache.has(filePath)) return cache.get(filePath);
    const analysis = new Promise((resolve) => {
      const process = spawn(ffmpegPath, ['-hide_banner', '-i', filePath, '-af', 'silencedetect=noise=-42dB:d=0.25,volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
      let output = '';
      process.stderr.on('data', (chunk) => { output += chunk.toString(); });
      process.on('close', () => {
        const starts = [...output.matchAll(/silence_start: ([\d.]+)/g)].map((match) => Number(match[1]));
        const ends = [...output.matchAll(/silence_end: ([\d.]+)/g)].map((match) => Number(match[1]));
        const mean = Number(output.match(/mean_volume: ([-\d.]+) dB/)?.[1] ?? -18);
        const introEnd = starts[0] <= 0.1 ? (ends[0] || 0) : 0;
        const lastStart = starts.at(-1);
        const outroStart = Number.isFinite(lastStart) && lastStart > duration * .55 ? lastStart : duration;
        resolve({ introEnd, outroStart, mean });
      });
    });
    cache.set(filePath, analysis);
    return analysis;
  };
}

module.exports = { createAudioAnalyzer };
