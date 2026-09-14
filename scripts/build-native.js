const { spawnSync } = require('node:child_process');
if (process.platform === 'darwin') {
  const result = spawnSync('sh', ['scripts/build-native.sh'], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
} else {
  console.log('Using Electron audio; no macOS helpers required.');
}
