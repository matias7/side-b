import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createWakeLockService } = require('../src/main/services/wake-lock');

describe('display wake lock', () => {
  let activeIds;
  let blocker;
  let wakeLock;

  beforeEach(() => {
    activeIds = new Set();
    blocker = {
      start: vi.fn(() => { activeIds.add(7); return 7; }),
      stop: vi.fn((id) => activeIds.delete(id)),
      isStarted: vi.fn((id) => activeIds.has(id))
    };
    wakeLock = createWakeLockService(blocker);
  });

  it('uses prevent-display-sleep and reports the active state', () => {
    expect(wakeLock.setEnabled(true)).toBe(true);
    expect(blocker.start).toHaveBeenCalledWith('prevent-display-sleep');
    expect(wakeLock.isActive()).toBe(true);
  });

  it('does not create duplicate blockers', () => {
    wakeLock.setEnabled(true);
    wakeLock.setEnabled(true);
    expect(blocker.start).toHaveBeenCalledTimes(1);
  });

  it('releases the blocker when disabled or stopped', () => {
    wakeLock.setEnabled(true);
    expect(wakeLock.setEnabled(false)).toBe(false);
    expect(blocker.stop).toHaveBeenCalledWith(7);
    wakeLock.setEnabled(true);
    wakeLock.stop();
    expect(wakeLock.isActive()).toBe(false);
  });
});
