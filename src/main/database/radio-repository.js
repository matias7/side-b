const { storedTrack } = require('../models/track');
const { scoreRadioCandidate, sharesGenre, yearDistance } = require('../models/radio-policy');

function createRadioRepository(database, options = {}) {
  const random = options.random || Math.random;

  function candidates(anchorPath) {
    return database.prepare(`
      SELECT tracks.*,
        COALESCE(imported_track_stats.play_count, 0) AS play_count,
        COALESCE(imported_track_stats.skip_count, 0) AS imported_skips,
        imported_track_stats.rating, imported_track_stats.loved,
        SUM(CASE WHEN playback_events.event_type = 'play_completed' THEN 1 ELSE 0 END) AS completions,
        SUM(CASE WHEN playback_events.event_type = 'skipped' THEN 1 ELSE 0 END) AS event_skips,
        SUM(CASE WHEN playback_events.event_type = 'liked' THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN playback_events.event_type = 'unliked' THEN 1 ELSE 0 END) AS unlikes,
        MAX(playback_events.occurred_at) AS last_played_at,
        COALESCE((SELECT SUM(vote_count) FROM radio_feedback WHERE candidate_path = tracks.path AND vote = 1), 0) AS positive_votes,
        COALESCE((SELECT SUM(vote_count) FROM radio_feedback WHERE candidate_path = tracks.path AND vote = -1), 0) AS negative_votes,
        COALESCE((SELECT SUM(vote_count) FROM radio_feedback WHERE anchor_path = ? AND candidate_path = tracks.path AND vote = 1), 0) AS context_positive_votes,
        COALESCE((SELECT SUM(vote_count) FROM radio_feedback WHERE anchor_path = ? AND candidate_path = tracks.path AND vote = -1), 0) AS context_negative_votes
        , COALESCE((
          SELECT COUNT(*) FROM playlist_tracks candidate_playlist
          WHERE candidate_playlist.track_path = tracks.path
            AND candidate_playlist.playlist_id IN (
              SELECT anchor_playlist.playlist_id FROM playlist_tracks anchor_playlist WHERE anchor_playlist.track_path = ?
            )
        ), 0) AS shared_playlists
      FROM tracks
      LEFT JOIN imported_track_stats ON imported_track_stats.track_path = tracks.path
      LEFT JOIN playback_events ON playback_events.track_path = tracks.path
      GROUP BY tracks.path
    `).all(anchorPath || '', anchorPath || '', anchorPath || '');
  }

  return {
    recommend({ currentPath, excludePaths = [] } = {}) {
      const anchorRow = currentPath ? database.prepare('SELECT * FROM tracks WHERE path = ?').get(currentPath) : null;
      const excluded = new Set([currentPath, ...excludePaths].filter(Boolean));
      const available = candidates(currentPath).filter((row) => !excluded.has(row.path));
      const withoutContextualRejections = available.filter((row) => Number(row.context_negative_votes || 0) === 0);
      const eligible = withoutContextualRejections.length ? withoutContextualRejections : available;
      const strongContext = eligible.filter((row) => anchorRow && (
        sharesGenre(row.genre, anchorRow.genre) ||
        (row.artist && row.artist.toLocaleLowerCase() === anchorRow.artist?.toLocaleLowerCase()) ||
        (row.album && row.album.toLocaleLowerCase() === anchorRow.album?.toLocaleLowerCase())
      ));
      const playlistAndEraContext = eligible.filter((row) => {
        const distance = yearDistance(row.year, anchorRow?.year);
        return Number(row.shared_playlists || 0) > 0 && distance !== null && distance <= 10;
      });
      const eraContext = eligible.filter((row) => {
        const distance = yearDistance(row.year, anchorRow?.year);
        return distance !== null && distance <= 5;
      });
      const pool = strongContext.length ? strongContext
        : (playlistAndEraContext.length ? playlistAndEraContext : (eraContext.length ? eraContext : eligible));
      const ranked = pool.map((row) => ({
        row,
        score: scoreRadioCandidate({
          ...row,
          playCount: row.play_count,
          skips: Number(row.imported_skips || 0) + Number(row.event_skips || 0),
          lastPlayedAt: row.last_played_at,
          positiveVotes: row.positive_votes,
          negativeVotes: row.negative_votes,
          contextPositiveVotes: row.context_positive_votes,
          contextNegativeVotes: row.context_negative_votes,
          sharedPlaylists: row.shared_playlists
        }, anchorRow, { random })
      })).sort((left, right) => right.score - left.score);
      return ranked[0] ? {
        track: storedTrack(ranked[0].row),
        score: ranked[0].score,
        context: {
          sharedGenre: sharesGenre(ranked[0].row.genre, anchorRow?.genre),
          sharedPlaylists: Number(ranked[0].row.shared_playlists || 0),
          yearDistance: yearDistance(ranked[0].row.year, anchorRow?.year),
          sameArtist: ranked[0].row.artist?.toLocaleLowerCase() === anchorRow?.artist?.toLocaleLowerCase(),
          sameAlbum: ranked[0].row.album?.toLocaleLowerCase() === anchorRow?.album?.toLocaleLowerCase()
        }
      } : null;
    },

    recordFeedback(anchorPath, candidatePath, vote) {
      if (!anchorPath || !candidatePath || ![-1, 1].includes(vote)) return false;
      database.prepare(`
        INSERT INTO radio_feedback(anchor_path, candidate_path, vote, vote_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(anchor_path, candidate_path, vote) DO UPDATE SET
          vote_count=vote_count + 1, updated_at=CURRENT_TIMESTAMP
      `).run(anchorPath, candidatePath, vote);
      return true;
    }
  };
}

module.exports = { createRadioRepository };
