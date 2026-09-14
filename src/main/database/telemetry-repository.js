const ALLOWED_EVENTS = new Set([
  'track_loaded', 'play_started', 'paused', 'resumed', 'stopped', 'seeked',
  'skipped', 'play_completed', 'repeat_started', 'manual_selection',
  'auto_advanced', 'crossfade_started', 'crossfade_completed',
  'mix_tape_loaded', 'shuffle_changed', 'playback_mode_changed', 'repeat_changed', 'smart_fade_changed',
  'mix_tape_track_added', 'liked', 'unliked', 'radio_recommended', 'radio_feedback'
]);

function createTelemetryRepository(database) {
  return {
    record(payload) {
      if (!payload || !ALLOWED_EVENTS.has(payload.eventType) || typeof payload.sessionId !== 'string') return false;
      const track = payload.track || {};
      let details = null;
      try { details = payload.details ? JSON.stringify(payload.details).slice(0, 8000) : null; } catch {}
      database.prepare(`
        INSERT INTO playback_events(
          session_id, playback_id, track_path, title, artist, album, event_type,
          position_seconds, duration_seconds, source_type, source_name,
          shuffle_enabled, repeat_enabled, smart_fade_enabled, details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        payload.sessionId.slice(0, 80), String(payload.playbackId || '').slice(0, 80) || null,
        track.path || null, track.title || null, track.artist || null, track.album || null,
        payload.eventType, Math.max(0, Number(payload.position) || 0), Math.max(0, Number(payload.duration || track.duration) || 0),
        String(payload.sourceType || '').slice(0, 40) || null, String(payload.sourceName || '').slice(0, 300) || null,
        payload.shuffle ? 1 : 0, payload.repeat ? 1 : 0, payload.smartFade ? 1 : 0, details
      );
      return true;
    }
  };
}

module.exports = { createTelemetryRepository };
