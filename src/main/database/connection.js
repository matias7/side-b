const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

let database;

function migrate(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS tracks (
      path TEXT PRIMARY KEY,
      modified_at REAL NOT NULL,
      file_size INTEGER NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT NOT NULL,
      genre TEXT,
      year INTEGER,
      duration REAL NOT NULL,
      cover TEXT,
      native_playback INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS tracks_artist ON tracks(artist COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS tracks_album ON tracks(album COLLATE NOCASE);
    CREATE TABLE IF NOT EXISTS library_state (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      root_path TEXT NOT NULL,
      tree_json TEXT NOT NULL,
      scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS library_tracks (
      root_path TEXT NOT NULL,
      track_path TEXT NOT NULL REFERENCES tracks(path) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (root_path, track_path)
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      track_path TEXT NOT NULL REFERENCES tracks(path) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, position)
    );
    CREATE TABLE IF NOT EXISTS playback_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      playback_id TEXT,
      track_path TEXT,
      title TEXT,
      artist TEXT,
      album TEXT,
      event_type TEXT NOT NULL,
      position_seconds REAL NOT NULL DEFAULT 0,
      duration_seconds REAL NOT NULL DEFAULT 0,
      source_type TEXT,
      source_name TEXT,
      shuffle_enabled INTEGER NOT NULL DEFAULT 0,
      repeat_enabled INTEGER NOT NULL DEFAULT 0,
      smart_fade_enabled INTEGER NOT NULL DEFAULT 0,
      details_json TEXT,
      occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS playback_events_track ON playback_events(track_path, occurred_at);
    CREATE INDEX IF NOT EXISTS playback_events_session ON playback_events(session_id, occurred_at);
    CREATE INDEX IF NOT EXISTS playback_events_type ON playback_events(event_type, occurred_at);
    CREATE TABLE IF NOT EXISTS imported_track_stats (
      track_path TEXT PRIMARY KEY REFERENCES tracks(path) ON DELETE CASCADE,
      source TEXT NOT NULL,
      play_count INTEGER NOT NULL DEFAULT 0,
      skip_count INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT,
      last_skipped_at TEXT,
      rating INTEGER,
      loved INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS radio_feedback (
      anchor_path TEXT NOT NULL,
      candidate_path TEXT NOT NULL REFERENCES tracks(path) ON DELETE CASCADE,
      vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
      vote_count INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (anchor_path, candidate_path, vote)
    );
    CREATE INDEX IF NOT EXISTS radio_feedback_candidate ON radio_feedback(candidate_path);
  `);

  const trackColumns = new Set(db.prepare('PRAGMA table_info(tracks)').all().map((column) => column.name));
  if (!trackColumns.has('genre')) db.exec('ALTER TABLE tracks ADD COLUMN genre TEXT');
  if (!trackColumns.has('year')) db.exec('ALTER TABLE tracks ADD COLUMN year INTEGER');

  const playlistColumns = new Set(db.prepare('PRAGMA table_info(playlists)').all().map((column) => column.name));
  if (!playlistColumns.has('source')) db.exec('ALTER TABLE playlists ADD COLUMN source TEXT');
  if (!playlistColumns.has('external_id')) db.exec('ALTER TABLE playlists ADD COLUMN external_id TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS playlists_external ON playlists(source, external_id)');
}

function getDatabase(app) {
  if (database) return database;
  database = new DatabaseSync(path.join(app.getPath('userData'), 'side-b-library.sqlite'));
  migrate(database);
  return database;
}

function closeDatabase() {
  database?.close();
  database = null;
}

module.exports = { getDatabase, closeDatabase, migrate };
