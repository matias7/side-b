const { storedTrack } = require('../models/track');

function createPlaylistRepository(database) {
  return {
    save(payload) {
      const { id = null, name, paths } = payload || {};
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 120
        || !Array.isArray(paths) || paths.length > 10000
        || paths.some((value) => typeof value !== 'string' || !value)
        || (id !== null && (!Number.isSafeInteger(id) || id <= 0))) {
        throw new Error('Enter a name (up to 120 characters) and valid library tracks.');
      }
      database.exec('BEGIN IMMEDIATE');
      try {
        let playlistId = id;
        if (id !== null) {
          const playlist = database.prepare('SELECT source FROM playlists WHERE id = ?').get(id);
          if (!playlist || playlist.source !== 'local') throw new Error('Only local playlists can be edited. Save an imported playlist as a new copy.');
          database.prepare('UPDATE playlists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name.trim(), id);
          database.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(id);
        } else {
          playlistId = Number(database.prepare("INSERT INTO playlists(name, source) VALUES (?, 'local')").run(name.trim()).lastInsertRowid);
        }
        const exists = database.prepare('SELECT 1 FROM tracks WHERE path = ?');
        const insert = database.prepare('INSERT INTO playlist_tracks(playlist_id, track_path, position) VALUES (?, ?, ?)');
        paths.forEach((filePath, position) => {
          if (!exists.get(filePath)) throw new Error('A song is no longer in the library. Scan the library and try again.');
          insert.run(playlistId, filePath, position);
        });
        database.exec('COMMIT');
        return { id: playlistId, name: name.trim(), trackCount: paths.length, source: 'local' };
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },

    list() {
      return database.prepare(`
        SELECT playlists.id, playlists.name, playlists.source, COUNT(playlist_tracks.position) AS track_count
        FROM playlists LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
        GROUP BY playlists.id ORDER BY playlists.name COLLATE NOCASE
      `).all().map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        source: playlist.source,
        trackCount: playlist.track_count
      }));
    },

    tracks(playlistId) {
      return database.prepare(`
        SELECT tracks.* FROM playlist_tracks
        JOIN tracks ON tracks.path = playlist_tracks.track_path
        WHERE playlist_tracks.playlist_id = ? ORDER BY playlist_tracks.position
      `).all(playlistId).map(storedTrack);
    },

    delete(playlistId) {
      return database.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId).changes > 0;
    }
  };
}

module.exports = { createPlaylistRepository };
