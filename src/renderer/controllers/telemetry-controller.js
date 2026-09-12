export function createTelemetryController(getContext) {
  const sessionId = crypto.randomUUID();

  return function recordPlaybackEvent(eventType, details = {}, trackOverride, overrides = {}) {
    const context = getContext();
    const track = trackOverride === undefined ? context.track : trackOverride;
    window.retroPlayer.recordPlaybackEvent({
      sessionId,
      playbackId: context.playbackId,
      eventType,
      track: track ? {
        path: track.path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration
      } : null,
      position: overrides.position ?? context.position,
      duration: overrides.duration ?? (track?.duration || context.duration || 0),
      sourceType: context.source.type,
      sourceName: context.source.name,
      shuffle: context.shuffle,
      repeat: context.repeat,
      smartFade: context.smartFade,
      details
    }).catch(console.error);
  };
}
