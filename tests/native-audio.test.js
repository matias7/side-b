import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { resolveNativeAudioPath } = require('../src/main/services/native-audio');

describe('native audio executable path', () => {
  it('uses the unpacked application resources in a packaged build', () => {
    expect(resolveNativeAudioPath({ isPackaged: true }, '/Applications/Side B.app/Contents/Resources')).toBe(
      path.join('/Applications/Side B.app/Contents/Resources', 'app.asar.unpacked', 'build', 'retro-audio')
    );
  });

  it('uses the project build directory in development', () => {
    expect(resolveNativeAudioPath({ isPackaged: false }, '/ignored')).toBe(path.resolve('build/retro-audio'));
  });
});
