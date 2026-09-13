function createWakeLockService(powerSaveBlocker) {
  let blockerId = null;

  function isActive() {
    return blockerId !== null && powerSaveBlocker.isStarted(blockerId);
  }

  function setEnabled(enabled) {
    if (enabled && !isActive()) blockerId = powerSaveBlocker.start('prevent-display-sleep');
    if (!enabled && blockerId !== null) {
      if (powerSaveBlocker.isStarted(blockerId)) powerSaveBlocker.stop(blockerId);
      blockerId = null;
    }
    return isActive();
  }

  function stop() {
    setEnabled(false);
  }

  return { isActive, setEnabled, stop };
}

module.exports = { createWakeLockService };
