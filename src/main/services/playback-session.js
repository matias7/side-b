const listeningQueue = require('../../shared/listening-queue');
const { randomUUID } = require('node:crypto');

function createPlaybackSession() {
  let state = null;

  function update(payload) {
    if (!payload || !Array.isArray(payload.tracks)) return false;
    const currentIndex = Number(payload.currentIndex);
    const queuedNextIndex = Number(payload.queuedNextIndex);
    state = {
      tracks: payload.tracks,
      history: Array.isArray(payload.history) ? payload.history : [],
      currentIndex: Number.isInteger(currentIndex) ? currentIndex : -1,
      currentPage: Math.max(0, Number(payload.currentPage) || 0),
      queuedNextIndex: Number.isInteger(queuedNextIndex) ? queuedNextIndex : -1,
      playbackId: typeof payload.playbackId === 'string' ? payload.playbackId : null,
      playbackHasStarted: Boolean(payload.playbackHasStarted),
      mixSource: {
        type: String(payload.mixSource?.type || 'unknown').slice(0, 40),
        name: payload.mixSource?.name == null ? null : String(payload.mixSource.name).slice(0, 300)
      },
      playbackMode: ['shuffle', 'radio'].includes(payload.playbackMode) ? payload.playbackMode : (payload.shuffle ? 'shuffle' : 'off'),
      shuffle: Boolean(payload.shuffle),
      repeat: Boolean(payload.repeat)
    };
    return true;
  }

  function handleNativeState(nativeState) {
    if (!state || nativeState?.event !== 'transitioned') return;
    if (state.queuedNextIndex >= 0 && state.queuedNextIndex < state.tracks.length) {
      Object.assign(state, listeningQueue.select(state, state.queuedNextIndex));
      state.currentPage = 0;
      state.queuedNextIndex = -1;
      state.playbackId = randomUUID();
      state.playbackHasStarted = true;
    }
  }

  function snapshot(nativeState = null) {
    return state ? { ...state, tracks: state.tracks.slice(), nativeState } : null;
  }

  return { update, handleNativeState, snapshot };
}

module.exports = { createPlaybackSession };
