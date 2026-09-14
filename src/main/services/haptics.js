const path = require('node:path');
const { spawn } = require('node:child_process');

const HAPTIC_PATTERNS = new Set(['hover', 'click', 'levelChange']);

function resolveHapticsPath(app, resourcesPath = process.resourcesPath) {
  return app.isPackaged
    ? path.join(resourcesPath, 'app.asar.unpacked', 'build', 'retro-haptics')
    : path.join(__dirname, '..', '..', '..', 'build', 'retro-haptics');
}

function normalizeHapticPattern(pattern) {
  return HAPTIC_PATTERNS.has(pattern) ? pattern : null;
}

function createHapticsService(app, spawnProcess = spawn, platform = process.platform) {
  let childProcess;

  function start() {
    if (platform !== 'darwin') return false;
    if (childProcess && childProcess.exitCode === null && !childProcess.killed) return true;
    childProcess = spawnProcess(resolveHapticsPath(app), [], { stdio: ['pipe', 'ignore', 'pipe'] });
    childProcess.stderr?.on('data', (chunk) => console.error(`native haptics: ${chunk}`));
    childProcess.on('error', (error) => console.error(`native haptics: ${error.message}`));
    childProcess.on('exit', () => { childProcess = null; });
    return true;
  }

  function trigger(pattern) {
    const normalized = normalizeHapticPattern(pattern);
    if (!normalized || !start() || !childProcess?.stdin?.writable) return false;
    childProcess.stdin.write(`${JSON.stringify({ pattern: normalized })}\n`);
    return true;
  }

  function stop() {
    childProcess?.kill();
    childProcess = null;
  }

  return { trigger, stop };
}

module.exports = { createHapticsService, normalizeHapticPattern, resolveHapticsPath };
