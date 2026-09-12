import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const { migrate } = require('../src/main/database/connection');
const { createTelemetryRepository } = require('../src/main/database/telemetry-repository');

describe('telemetry repository', () => {
  let database;
  let telemetry;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    migrate(database);
    telemetry = createTelemetryRepository(database);
  });

  afterEach(() => database.close());

  it('records a valid playback event with its context', () => {
    expect(telemetry.record({
      sessionId: 'session-1',
      playbackId: 'playback-1',
      eventType: 'play_started',
      track: { path: '/music/a.m4a', title: 'A', artist: 'Artist', album: 'Album', duration: 180 },
      position: 4,
      sourceType: 'playlist',
      sourceName: 'Rock',
      shuffle: true,
      repeat: false,
      smartFade: true,
      details: { reason: 'transport' }
    })).toBe(true);
    expect(database.prepare('SELECT * FROM playback_events').get()).toMatchObject({
      event_type: 'play_started',
      track_path: '/music/a.m4a',
      position_seconds: 4,
      duration_seconds: 180,
      source_type: 'playlist',
      shuffle_enabled: 1,
      repeat_enabled: 0,
      smart_fade_enabled: 1,
      details_json: '{"reason":"transport"}'
    });
  });

  it('rejects unknown events and missing sessions', () => {
    expect(telemetry.record({ sessionId: 'session', eventType: 'invented' })).toBe(false);
    expect(telemetry.record({ eventType: 'paused' })).toBe(false);
    expect(database.prepare('SELECT COUNT(*) AS count FROM playback_events').get().count).toBe(0);
  });

  it('normalizes negative positions and durations', () => {
    telemetry.record({ sessionId: 'session', eventType: 'stopped', position: -10, duration: -2 });
    expect(database.prepare('SELECT position_seconds, duration_seconds FROM playback_events').get()).toEqual({
      position_seconds: 0,
      duration_seconds: 0
    });
  });
});
