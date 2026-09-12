import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const { migrate } = require('../src/main/database/connection');
const { createLibraryRepository } = require('../src/main/database/library-repository');
const { createPlaylistRepository } = require('../src/main/database/playlist-repository');

describe('SQLite repositories', () => {
  let database;
  let library;
  let playlists;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    migrate(database);
    library = createLibraryRepository(database);
    playlists = createPlaylistRepository(database);
  });

  afterEach(() => database.close());

  function insertTrack(filePath, title = 'Track') {
    database.prepare(`
      INSERT INTO tracks(path, modified_at, file_size, title, artist, album, duration, cover, native_playback)
      VALUES (?, 10, 20, ?, 'Artist', 'Album', 180, NULL, 1)
    `).run(filePath, title);
  }

  it('stores and restores the selected library tree', () => {
    const tree = { name: 'Music', path: '/music', totalTrackCount: 2, children: [] };
    library.saveState('/music', tree);
    expect(library.savedState()).toEqual({ directory: '/music', tree });
  });

  it('replaces root tracks transactionally and preserves order', () => {
    insertTrack('/music/a.m4a', 'A');
    insertTrack('/music/b.m4a', 'B');
    library.replaceRootTracks('/music', [{ path: '/music/b.m4a' }, { path: '/music/a.m4a' }]);
    expect(library.tracksForRoot('/music').map((track) => track.title)).toEqual(['B', 'A']);
  });

  it('maps cached native tracks back to renderer models', () => {
    insertTrack('/music/a.m4a', 'A');
    expect(library.cachedTrack('/music/a.m4a').track).toMatchObject({
      id: '/music/a.m4a',
      title: 'A',
      nativePlayback: true
    });
  });

  it('lists playlist counts and ordered tracks', () => {
    insertTrack('/music/a.m4a', 'A');
    insertTrack('/music/b.m4a', 'B');
    const playlistId = database.prepare("INSERT INTO playlists(name, source) VALUES ('Road Trip', 'side-b') RETURNING id").get().id;
    const insert = database.prepare('INSERT INTO playlist_tracks(playlist_id, track_path, position) VALUES (?, ?, ?)');
    insert.run(playlistId, '/music/b.m4a', 0);
    insert.run(playlistId, '/music/a.m4a', 1);
    expect(playlists.list()).toEqual([{ id: playlistId, name: 'Road Trip', source: 'side-b', trackCount: 2 }]);
    expect(playlists.tracks(playlistId).map((track) => track.title)).toEqual(['B', 'A']);
  });

  it('deletes a playlist and cascades its track references', () => {
    insertTrack('/music/a.m4a');
    const playlistId = database.prepare("INSERT INTO playlists(name) VALUES ('Temporary') RETURNING id").get().id;
    database.prepare('INSERT INTO playlist_tracks(playlist_id, track_path, position) VALUES (?, ?, 0)').run(playlistId, '/music/a.m4a');
    expect(playlists.delete(playlistId)).toBe(true);
    expect(database.prepare('SELECT COUNT(*) AS count FROM playlist_tracks').get().count).toBe(0);
  });
});
