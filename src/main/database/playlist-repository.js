const { storedTrack } = require('../models/track');

function createPlaylistRepository(database) {
  return {
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
