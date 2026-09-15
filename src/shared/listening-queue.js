// Pure queue rules shared by the main process and the browser renderer.
(function (root) {
  function nextIndex(tracks, currentIndex, shuffle, random = Math.random) {
    const pending = tracks.map((_, index) => index).filter(index => index !== currentIndex);
    if (!pending.length) return -1;
    return pending[shuffle ? Math.min(pending.length - 1, Math.floor(random() * pending.length)) : 0];
  }

  function select({ tracks, currentIndex, history, playbackHasStarted }, targetIndex) {
    const selected = tracks[targetIndex];
    if (!selected) return null;
    const outgoing = tracks[currentIndex];
    const nextHistory = outgoing && playbackHasStarted ? [...history, outgoing] : history;
    return {
      tracks: [selected, ...tracks.filter((_, index) => index !== currentIndex && index !== targetIndex)],
      currentIndex: 0,
      history: nextHistory
    };
  }
  const api = { nextIndex, select };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SideBListeningQueue = api;
})(globalThis);
