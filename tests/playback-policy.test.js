import { describe, expect, it } from 'vitest';
import { clearUpcomingTracks, chooseNextTrackIndex, insertTrack, moveTrack, replaceTrack } from '../src/renderer/models/playback-policy.js';

describe('chooseNextTrackIndex', () => {
  it('keeps the current index when the queue has fewer than two tracks', () => {
    expect(chooseNextTrackIndex({ trackCount: 0, currentIndex: -1, shuffle: false })).toBe(-1);
    expect(chooseNextTrackIndex({ trackCount: 1, currentIndex: 0, shuffle: true })).toBe(0);
  });

  it('advances in order when shuffle is disabled', () => {
    expect(chooseNextTrackIndex({ trackCount: 4, currentIndex: 1, shuffle: false })).toBe(2);
  });

  it('wraps to the beginning of the queue', () => {
    expect(chooseNextTrackIndex({ trackCount: 4, currentIndex: 3, shuffle: false })).toBe(0);
  });

  it('never returns the current track in shuffle mode', () => {
    for (const random of [0, .24, .5, .75, .999]) {
      expect(chooseNextTrackIndex({ trackCount: 5, currentIndex: 2, shuffle: true, random: () => random })).not.toBe(2);
    }
  });

  it('can select every other index in shuffle mode', () => {
    const results = [0, .26, .51, .99].map((random) =>
      chooseNextTrackIndex({ trackCount: 5, currentIndex: 2, shuffle: true, random: () => random })
    );
    expect(new Set(results)).toEqual(new Set([0, 1, 3, 4]));
  });
});

describe('moveTrack', () => {
  const queue = ['a', 'b', 'c', 'd'];

  it('moves a track forward using insertion semantics', () => {
    expect(moveTrack(queue, 1, 4)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('moves a track backward', () => {
    expect(moveTrack(queue, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps destinations to queue bounds', () => {
    expect(moveTrack(queue, 2, -10)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveTrack(queue, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('does not mutate the source queue', () => {
    const result = moveTrack(queue, 0, 2);
    expect(queue).toEqual(['a', 'b', 'c', 'd']);
    expect(result).not.toBe(queue);
  });
});

describe('library interactions', () => {
  it('inserts a library track without mutating the Mix-Tape', () => {
    const queue = ['a', 'c'];
    expect(insertTrack(queue, 'b', 1)).toEqual(['a', 'b', 'c']);
    expect(queue).toEqual(['a', 'c']);
  });

  it('replaces only the current cassette track', () => {
    const queue = ['a', 'b', 'c'];
    expect(replaceTrack(queue, 1, 'x')).toEqual(['a', 'x', 'c']);
    expect(queue).toEqual(['a', 'b', 'c']);
  });
});

describe('clear upcoming tracks', () => {
  it('preserves the current track object and leaves the source queue unchanged', () => {
    const tracks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const cleared = clearUpcomingTracks(tracks, 1);
    expect(cleared).toEqual({ tracks: [tracks[1]], currentIndex: 0 });
    expect(cleared.tracks[0]).toBe(tracks[1]);
    expect(tracks).toHaveLength(3);
  });
  it('clears an unloaded queue and safely accepts an empty queue', () => {
    expect(clearUpcomingTracks([{ id: 'a' }], -1)).toEqual({ tracks: [], currentIndex: -1 });
    expect(clearUpcomingTracks([], -1)).toEqual({ tracks: [], currentIndex: -1 });
  });
});
