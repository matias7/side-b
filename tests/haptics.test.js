import { EventEmitter } from 'node:events';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createHapticsService,
  normalizeHapticPattern,
  resolveHapticsPath
} = require('../src/main/services/haptics');

describe('native haptics service', () => {
  it('accepts only known haptic patterns', () => {
    expect(normalizeHapticPattern('hover')).toBe('hover');
    expect(normalizeHapticPattern('click')).toBe('click');
    expect(normalizeHapticPattern('unknown')).toBeNull();
  });

  it('resolves development and packaged helper paths', () => {
    expect(resolveHapticsPath({ isPackaged: false })).toBe(path.resolve('build/retro-haptics'));
    expect(resolveHapticsPath({ isPackaged: true }, '/App/Resources'))
      .toBe(path.join('/App/Resources', 'app.asar.unpacked', 'build', 'retro-haptics'));
  });

  it('starts lazily and sends validated patterns to the helper', () => {
    const child = new EventEmitter();
    child.exitCode = null;
    child.killed = false;
    child.stdin = { writable: true, write: vi.fn() };
    child.stderr = new EventEmitter();
    child.kill = vi.fn();
    const spawnProcess = vi.fn(() => child);
    const service = createHapticsService({ isPackaged: false }, spawnProcess, 'darwin');

    expect(service.trigger('click')).toBe(true);
    expect(service.trigger('hover')).toBe(true);
    expect(service.trigger('invalid')).toBe(false);
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(child.stdin.write).toHaveBeenNthCalledWith(1, '{"pattern":"click"}\n');
    expect(child.stdin.write).toHaveBeenNthCalledWith(2, '{"pattern":"hover"}\n');

    service.stop();
    expect(child.kill).toHaveBeenCalledOnce();
  });

  it('falls back silently outside macOS', () => {
    const spawnProcess = vi.fn();
    const service = createHapticsService({ isPackaged: false }, spawnProcess, 'linux');
    expect(service.trigger('click')).toBe(false);
    expect(spawnProcess).not.toHaveBeenCalled();
  });
});
