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
    expect(restored.currentIndex).toBe(0);
    expect(restored.tracks).toEqual([{ id: 'c' }, { id: 'a' }]);
    expect(restored.history).toEqual([{ id: 'b' }]);
    expect(restored.queuedNextIndex).toBe(-1);
    expect(restored.playbackId).not.toBe('playback-1');
  });

  it('keeps a cleared queue empty after a late transition event', () => {
    const session = createPlaybackSession();
    session.update(baseState);
    session.update({ tracks: [], currentIndex: -1, queuedNextIndex: -1 });
    session.handleNativeState({ event: 'transitioned' });
    expect(session.snapshot()).toMatchObject({ tracks: [], currentIndex: -1, queuedNextIndex: -1 });
  });

  it('keeps history in the running session only', () => {
    const session = createPlaybackSession();
    session.update({ ...baseState, history: [{ id: 'heard' }] });
    expect(session.snapshot().history).toEqual([{ id: 'heard' }]);
    expect(createPlaybackSession().snapshot()).toBeNull();
  });

  it('rejects malformed updates', () => {
    const session = createPlaybackSession();
    expect(session.update(null)).toBe(false);
    expect(session.update({ tracks: 'not-an-array' })).toBe(false);
    expect(session.snapshot()).toBeNull();
  });
});
