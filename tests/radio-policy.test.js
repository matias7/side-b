import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const { migrate } = require('../src/main/database/connection');
const { createRadioRepository } = require('../src/main/database/radio-repository');
const { scoreRadioCandidate } = require('../src/main/models/radio-policy');

describe('Radio policy', () => {
  it('prefers musical context and explicit positive signals', () => {
    const anchor = { artist: 'Anchor', album: 'Origin', genre: 'Rock' };
    const related = scoreRadioCandidate({ artist: 'Other', album: 'Elsewhere', genre: 'Rock', loved: 1 }, anchor, { random: () => 0 });
    const unrelated = scoreRadioCandidate({ artist: 'Other', album: 'Elsewhere', genre: 'Ambient' }, anchor, { random: () => 0 });
    expect(related).toBeGreaterThan(unrelated);
  });

  it('strongly penalizes a contextual negative vote', () => {
    const anchor = { artist: 'Anchor', album: 'Origin', genre: 'Rock' };
    const accepted = scoreRadioCandidate({ genre: 'Rock' }, anchor, { random: () => 0 });
    const rejected = scoreRadioCandidate({ genre: 'Rock', contextNegativeVotes: 1 }, anchor, { random: () => 0 });
    expect(rejected).toBeLessThan(accepted);
  });
});

describe('Radio repository', () => {
  let database;
  let radio;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    migrate(database);
    radio = createRadioRepository(database, { random: () => 0 });
    const insert = database.prepare(`
      INSERT INTO tracks(path, modified_at, file_size, title, artist, album, genre, duration, native_playback)
      VALUES (?, 1, 1, ?, ?, ?, ?, 180, 1)
    `);
    insert.run('/anchor.m4a', 'Anchor', 'Band A', 'A', 'Rock');
    insert.run('/related.m4a', 'Related', 'Band B', 'B', 'Rock');
    insert.run('/other.m4a', 'Other', 'Band C', 'C', 'Ambient');
  });

  afterEach(() => database.close());

  it('excludes the current song and prefers a matching genre', () => {
    expect(radio.recommend({ currentPath: '/anchor.m4a' }).track.path).toBe('/related.m4a');
  });

  it('uses negative feedback to replace a recommendation', () => {
    radio.recordFeedback('/anchor.m4a', '/related.m4a', -1);
    expect(radio.recommend({ currentPath: '/anchor.m4a' }).track.path).toBe('/other.m4a');
  });

  it('uses shared playlists as musical context when genres are missing', () => {
    database.prepare("UPDATE tracks SET genre = ''").run();
    database.prepare("UPDATE tracks SET year = CASE path WHEN '/anchor.m4a' THEN 1967 WHEN '/related.m4a' THEN 1970 ELSE 2020 END").run();
    const firstPlaylist = database.prepare("INSERT INTO playlists(name) VALUES ('Soul') RETURNING id").get().id;
    const secondPlaylist = database.prepare("INSERT INTO playlists(name) VALUES ('Dance') RETURNING id").get().id;
    const add = database.prepare('INSERT INTO playlist_tracks(playlist_id, track_path, position) VALUES (?, ?, ?)');
    add.run(firstPlaylist, '/anchor.m4a', 0);
    add.run(firstPlaylist, '/related.m4a', 1);
    add.run(secondPlaylist, '/other.m4a', 0);
    const recommendation = radio.recommend({ currentPath: '/anchor.m4a' });
    expect(recommendation.track.path).toBe('/related.m4a');
    expect(recommendation.context.sharedPlaylists).toBe(1);
  });
});
