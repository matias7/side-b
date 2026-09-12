function storedTrack(row) {
  return {
    id: row.path,
    path: row.path,
    url: `retro-media://local/${encodeURIComponent(row.path)}`,
    nativePlayback: Boolean(row.native_playback),
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    cover: row.cover || null
  };
}

function normalizedTrackKey(title, artist, album) {
  return [title, artist, album]
    .map((value) => String(value || '').normalize('NFC').trim().toLocaleLowerCase())
    .join('\u0000');
}

module.exports = { storedTrack, normalizedTrackKey };
