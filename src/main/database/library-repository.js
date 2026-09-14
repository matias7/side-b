const { storedTrack } = require('../models/track');

function createLibraryRepository(database) {
  return {
    saveState(directory, tree) {
      database.prepare(`
        INSERT INTO library_state(singleton, root_path, tree_json, scanned_at)
        VALUES (1, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(singleton) DO UPDATE SET
          root_path=excluded.root_path, tree_json=excluded.tree_json, scanned_at=CURRENT_TIMESTAMP
      `).run(directory, JSON.stringify(tree));
    },

    savedState() {
      const row = database.prepare('SELECT root_path, tree_json FROM library_state WHERE singleton = 1').get();
      if (!row) return null;
      try { return { directory: row.root_path, tree: JSON.parse(row.tree_json) }; } catch { return null; }
    },

    tracksForRoot(directory) {
      return database.prepare(`
        SELECT tracks.* FROM library_tracks
        JOIN tracks ON tracks.path = library_tracks.track_path
        WHERE library_tracks.root_path = ? ORDER BY library_tracks.position
      `).all(directory).map(storedTrack);
    },

    cachedTrack(filePath) {
      const row = database.prepare('SELECT * FROM tracks WHERE path = ?').get(filePath);
      return row ? { row, track: storedTrack(row) } : null;
    },

    saveTrack(filePath, stats, track) {
      database.prepare(`
        INSERT INTO tracks(path, modified_at, file_size, title, artist, album, genre, year, duration, cover, native_playback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          modified_at=excluded.modified_at, file_size=excluded.file_size,
          title=excluded.title, artist=excluded.artist, album=excluded.album, genre=excluded.genre, year=excluded.year,
          duration=excluded.duration, cover=excluded.cover, native_playback=excluded.native_playback
      `).run(filePath, stats.mtimeMs, stats.size, track.title, track.artist, track.album, track.genre || '', track.year || null, track.duration, track.cover, track.nativePlayback ? 1 : 0);
    },

    replaceRootTracks(directory, tracks) {
      const insert = database.prepare('INSERT INTO library_tracks(root_path, track_path, position) VALUES (?, ?, ?)');
      database.exec('BEGIN IMMEDIATE');
      try {
        database.prepare('DELETE FROM library_tracks WHERE root_path = ?').run(directory);
        tracks.forEach((track, position) => insert.run(directory, track.path, position));
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }
  };
}

module.exports = { createLibraryRepository };
