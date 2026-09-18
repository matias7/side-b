import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as plist from 'plist';

const require = createRequire(import.meta.url);
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const { migrate } = require('../src/main/database/connection');
const { createAppleMusicImporter } = require('../src/main/services/apple-music-importer');

describe('Apple Music importer', () => {
  let database;
  let temporaryDirectory;

  beforeEach(async () => {
    database = new DatabaseSync(':memory:');
    migrate(database);
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'side-b-test-'));
  });

  afterEach(async () => {
    database.close();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('imports regular playlists, skips excluded ones and links local statistics', async () => {
    const trackPath = path.join(temporaryDirectory, 'Song.m4a');
    database.prepare(`
      INSERT INTO tracks(path, modified_at, file_size, title, artist, album, duration, cover, native_playback)
      VALUES (?, 1, 1, 'Song', 'Artist', 'Album', 200, NULL, 1)
    `).run(trackPath);
    const xml = plist.build({
      Tracks: {
        1: {
          Name: 'Song', Artist: 'Artist', Album: 'Album',
          Location: pathToFileURL(trackPath).toString(),
          'Play Count': 7, 'Skip Count': 2, Loved: true
        }
      },
      Playlists: [
        { Name: 'Favorites', 'Playlist ID': 10, 'Playlist Items': [{ 'Track ID': 1 }] },
        { Name: 'Rock 1', 'Playlist ID': 11, 'Playlist Items': [{ 'Track ID': 1 }] },
        { Name: 'Smart', 'Playlist ID': 12, 'Smart Info': Buffer.from('smart'), 'Playlist Items': [{ 'Track ID': 1 }] }
      ]
    });
    const xmlPath = path.join(temporaryDirectory, 'Library.xml');
    await fs.writeFile(xmlPath, xml);

    const result = await createAppleMusicImporter(database)(xmlPath);
    expect(result).toMatchObject({ imported: 2, skipped: 1, statsImported: 1 });
    expect(result.playlists[0]).toEqual({ name: 'Favorites', total: 1, matched: 1 });
    expect(database.prepare('SELECT name FROM playlists ORDER BY id').all()).toEqual([{ name: 'Favorites' }, { name: 'Rock 1' }]);
    expect(database.prepare('SELECT play_count, skip_count, loved FROM imported_track_stats').get()).toEqual({
      play_count: 7,
      skip_count: 2,
      loved: 1
    });
  });

  it('falls back to an unambiguous metadata match when paths differ', async () => {
    database.prepare(`
      INSERT INTO tracks(path, modified_at, file_size, title, artist, album, duration, cover, native_playback)
      VALUES ('/local/Song.m4a', 1, 1, 'Song', 'Artist', 'Album', 200, NULL, 1)
    `).run();
    const xmlPath = path.join(temporaryDirectory, 'Library.xml');
    await fs.writeFile(xmlPath, plist.build({
      Tracks: { 1: { Name: 'Song', Artist: 'Artist', Album: 'Album', Location: 'file:///missing/Song.m4a' } },
      Playlists: [{ Name: 'Imported', 'Playlist ID': 1, 'Playlist Items': [{ 'Track ID': 1 }] }]
    }));
    const result = await createAppleMusicImporter(database)(xmlPath);
    expect(result.playlists[0].matched).toBe(1);
    expect(database.prepare('SELECT track_path FROM playlist_tracks').get().track_path).toBe('/local/Song.m4a');
  });
});
