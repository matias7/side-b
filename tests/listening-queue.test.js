import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { nextIndex, select } = require('../src/shared/listening-queue');
const a = { path: 'a' }, b = { path: 'b' }, c = { path: 'c' };

describe('consuming listening queue', () => {
  it('archives a skipped current song and consumes only the selected pending entry', () => {
    const state = { tracks: [a, b, c], currentIndex: 0, history: [], playbackHasStarted: true };
    expect(select(state, 2)).toEqual({ tracks: [c, b], currentIndex: 0, history: [a] });
    expect(state.tracks).toEqual([a, b, c]);
  });
  it('does not turn a loaded but unheard song into history', () => {
    expect(select({ tracks: [a, b], currentIndex: 0, history: [], playbackHasStarted: false }, 1).history).toEqual([]);
  });
  it('replays history without removing entries or consuming pending tracks', () => {
    const history = [c];
    const state = { tracks: [a, b, c], currentIndex: 0, history, playbackHasStarted: true };
    const replay = select(state, 2);
    expect(replay.tracks).toEqual([c, b]);
    expect(replay.history).toEqual([c, a]);
    expect(history).toEqual([c]);
  });
  it('keeps repeated paths as separate queue occurrences', () => {
    const state = { tracks: [a, b, a], currentIndex: 0, history: [], playbackHasStarted: true };
    expect(select(state, 1).tracks).toEqual([b, a]);
  });
  it('exhausts Shuffle without reselecting the current or archived tracks', () => {
    let state = { tracks: [a, b, c], currentIndex: 0, history: [], playbackHasStarted: true };
    const heard = [a];
    let index;
    while ((index = nextIndex(state.tracks, state.currentIndex, true, () => .9)) >= 0) {
      state = { ...select(state, index), playbackHasStarted: true };
      heard.push(state.tracks[0]);
    }
    expect(heard).toEqual([a, c, b]);
    expect(state.history).toEqual([a, c]);
    expect(nextIndex([], -1, false)).toBe(-1);
  });
  it('archives each repeat as a separate listen', () => {
    expect(select({ tracks: [a, b], currentIndex: 0, history: [a], playbackHasStarted: true }, 0))
      .toEqual({ tracks: [a, b], currentIndex: 0, history: [a, a] });
  });
  it('ignores a stale transition with no valid target', () => {
    expect(select({ tracks: [a], currentIndex: 0, history: [], playbackHasStarted: true }, -1)).toBeNull();
  });
});
