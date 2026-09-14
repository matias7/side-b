import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createPlaybackSession } = require('../src/main/services/playback-session');

describe('playback window session', () => {
  const baseState = {
    tracks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    currentIndex: 1,
    currentPage: 0,
    queuedNextIndex: 2,
    playbackId: 'playback-1',
    playbackHasStarted: true,
    mixSource: { type: 'playlist', name: 'Road Trip' },
    shuffle: true,
    repeat: false
  };

  it('restores the queue, current track and latest native state', () => {
    const session = createPlaybackSession();
    expect(session.update(baseState)).toBe(true);
    expect(session.snapshot({ event: 'state', playing: true, currentTime: 42, duration: 180 })).toMatchObject({
      tracks: baseState.tracks,
      currentIndex: 1,
      playbackId: 'playback-1',
      mixSource: { type: 'playlist', name: 'Road Trip' },
      playbackMode: 'shuffle',
      shuffle: true,
      nativeState: { event: 'state', playing: true, currentTime: 42, duration: 180 }
    });
  });

  it('persists Radio as a playback mode', () => {
    const session = createPlaybackSession();
    session.update({ ...baseState, playbackMode: 'radio', shuffle: false });
    expect(session.snapshot(null).playbackMode).toBe('radio');
  });

  it('advances the remembered track when a crossfade completes without a window', () => {
    const session = createPlaybackSession();
    session.update(baseState);
    session.handleNativeState({ event: 'transitioned' });
    const restored = session.snapshot();
    expect(restored.currentIndex).toBe(2);
    expect(restored.queuedNextIndex).toBe(-1);
    expect(restored.playbackId).not.toBe('playback-1');
  });

  it('rejects malformed updates', () => {
    const session = createPlaybackSession();
    expect(session.update(null)).toBe(false);
    expect(session.update({ tracks: 'not-an-array' })).toBe(false);
    expect(session.snapshot()).toBeNull();
  });
});
