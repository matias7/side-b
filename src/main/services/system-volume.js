const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

async function getSystemVolume() {
  if (process.platform !== 'darwin') return null;
  const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', 'output volume of (get volume settings)']);
  return Number(stdout.trim());
}

async function setSystemVolume(value) {
  if (process.platform !== 'darwin') return null;
  const volume = Math.max(0, Math.min(100, Math.round(Number(value))));
  await execFileAsync('/usr/bin/osascript', ['-e', `set volume output volume ${volume}`]);
  return volume;
}

module.exports = { getSystemVolume, setSystemVolume };
