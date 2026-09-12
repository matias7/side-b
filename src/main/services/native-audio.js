const path = require('node:path');
const { spawn } = require('node:child_process');

function resolveNativeAudioPath(app, resourcesPath = process.resourcesPath) {
  return app.isPackaged
    ? path.join(resourcesPath, 'app.asar.unpacked', 'build', 'retro-audio')
    : path.join(__dirname, '..', '..', '..', 'build', 'retro-audio');
}

function createNativeAudioService(app, onState) {
  let childProcess;

  function start() {
    if (childProcess && childProcess.exitCode === null && !childProcess.killed) return;
    const executable = resolveNativeAudioPath(app);
    childProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let pending = '';
    childProcess.stdout.on('data', (chunk) => {
      pending += chunk.toString();
      const lines = pending.split('\n');
      pending = lines.pop();
      for (const line of lines) {
        try { onState(JSON.parse(line)); } catch {}
      }
    });
    childProcess.stderr.on('data', (chunk) => console.error(`native audio: ${chunk}`));
    childProcess.on('error', (error) => onState({ event: 'error', message: error.message }));
    childProcess.on('exit', () => { childProcess = null; });
  }

  function send(action, extra = {}) {
    start();
    childProcess.stdin.write(`${JSON.stringify({ action, ...extra })}\n`);
  }

  function stop() {
    childProcess?.kill();
    childProcess = null;
  }

  return { start, send, stop };
}

module.exports = { createNativeAudioService, resolveNativeAudioPath };
