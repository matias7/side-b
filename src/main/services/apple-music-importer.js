const fs = require('node:fs/promises');
const { fileURLToPath } = require('node:url');
const { normalizedTrackKey } = require('../models/track');

function createAppleMusicImporter(database) {
  return async function importAppleMusicPlaylists(xmlPath) {
    const { parse } = await import('plist');
    const document = parse(await fs.readFile(xmlPath, 'utf8'));
    const xmlTracks = document.Tracks || {};
    const candidates = (document.Playlists || []).filter((playlist) =>
      !playlist.Master && !playlist.Folder && !playlist['Smart Info'] && !playlist['Smart Criteria'] &&
      !playlist['Distinguished Kind']
    );
    const localRows = database.prepare('SELECT path, title, artist, album FROM tracks').all();
    const exactPaths = new Map(localRows.map((track) => [track.path.normalize('NFC'), track.path]));
    const metadataPaths = new Map();
    localRows.forEach((track) => {
      const key = normalizedTrackKey(track.title, track.artist, track.album);
      if (!metadataPaths.has(key)) metadataPaths.set(key, []);
      metadataPaths.get(key).push(track.path);
    });
    const resolveTrack = (trackId) => {
      const source = xmlTracks[String(trackId)];
      if (!source) return null;
      if (source.Location) {
        try {
          const exact = exactPaths.get(fileURLToPath(source.Location).normalize('NFC'));
          if (exact) return exact;
        } catch {}
      }
      const matches = metadataPaths.get(normalizedTrackKey(source.Name, source.Artist, source.Album));
      return matches?.length === 1 ? matches[0] : null;
    };
    const upsertPlaylist = database.prepare(`
      INSERT INTO playlists(name, source, external_id, updated_at) VALUES (?, 'apple-music', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(source, external_id) DO UPDATE SET name=excluded.name, updated_at=CURRENT_TIMESTAMP RETURNING id
    `);
    const insertTrack = database.prepare('INSERT INTO playlist_tracks(playlist_id, track_path, position) VALUES (?, ?, ?)');
    const upsertStats = database.prepare(`
      INSERT INTO imported_track_stats(track_path, source, play_count, skip_count, last_played_at, last_skipped_at, rating, loved, imported_at)
      VALUES (?, 'apple-music', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(track_path) DO UPDATE SET
        play_count=excluded.play_count, skip_count=excluded.skip_count,
        last_played_at=excluded.last_played_at, last_skipped_at=excluded.last_skipped_at,
        rating=excluded.rating, loved=excluded.loved, imported_at=CURRENT_TIMESTAMP
    `);
    const results = [];
    let statsImported = 0;
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const playlist of candidates) {
        const externalId = String(playlist['Playlist Persistent ID'] || playlist['Playlist ID']);
        const playlistId = upsertPlaylist.get(playlist.Name || 'Untitled Tape', externalId).id;
        database.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(playlistId);
        let matched = 0;
        for (const item of playlist['Playlist Items'] || []) {
          const trackPath = resolveTrack(item['Track ID']);
          if (!trackPath) continue;
          insertTrack.run(playlistId, trackPath, matched++);
        }
        results.push({ name: playlist.Name, total: (playlist['Playlist Items'] || []).length, matched });
      }
      for (const [trackId, source] of Object.entries(xmlTracks)) {
        const trackPath = resolveTrack(trackId);
        if (!trackPath) continue;
        upsertStats.run(
          trackPath, Number(source['Play Count']) || 0, Number(source['Skip Count']) || 0,
          source['Play Date UTC'] || null, source['Skip Date'] || null,
          Number.isFinite(Number(source.Rating)) ? Number(source.Rating) : null,
          source.Loved ? 1 : 0
        );
        statsImported += 1;
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return { imported: results.length, playlists: results, skipped: (document.Playlists || []).length - candidates.length, statsImported };
  };
}

module.exports = { createAppleMusicImporter };
