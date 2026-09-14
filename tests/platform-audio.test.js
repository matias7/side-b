import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { playbackRoute, resolveFfmpegPath } = require('../src/main/services/platform-audio');
const { createNativeAudioService } = require('../src/main/services/native-audio');
const { createAudioAnalyzer } = require('../src/main/services/audio-analysis');

describe('platform audio selection', () => {
  it('keeps macOS ALAC native and routes Windows ALAC through a seekable FLAC', () => {
    const file = 'C:\\Music\\Álbum #1\\song.m4a';
    expect(playbackRoute(file, true, 'darwin').nativePlayback).toBe(true);
    const windows = playbackRoute(file, true, 'win32');
    expect(windows.nativePlayback).toBe(false);
    const url = new URL(windows.url);
    expect(decodeURIComponent(url.pathname.slice(1))).toBe(file);
    expect(url.searchParams.get('transcode')).toBe('flac');
    expect(playbackRoute(file, false, 'win32').url).not.toContain('?');
  });
  it('resolves explicit FFmpeg overrides, Intel Macs and Windows PATH', () => {
    expect(resolveFfmpegPath('win32', { SIDE_B_FFMPEG_PATH: 'C:\\tools\\ffmpeg.exe' })).toBe('C:\\tools\\ffmpeg.exe');
    expect(resolveFfmpegPath('win32', {})).toBe('ffmpeg.exe');
    expect(resolveFfmpegPath('darwin', {}, value => value.startsWith('/usr/local'))).toBe('/usr/local/bin/ffmpeg');
  });
  it('never starts the macOS helper on Windows even for unconditional queue commands', () => {
    const service = createNativeAudioService({}, () => { throw new Error('Unexpected event'); }, 'win32');
    service.start();
    expect(service.send('cancelNext')).toBe(false);
    expect(service.getState()).toBeNull();
    service.stop();
  });
  it('settles audio analysis when FFmpeg is unavailable', async () => {
    await expect(createAudioAnalyzer('/missing-side-b-test/ffmpeg')('missing.m4a', 120))
      .resolves.toEqual({ introEnd: 0, outroStart: 120, mean: -18 });
  });
});
