const path = require('node:path');
const { dialog, ipcMain } = require('electron');
const { getSystemVolume, setSystemVolume } = require('../services/system-volume');

function validDirectory(directory) {
  return typeof directory === 'string' && path.isAbsolute(directory);
}

function registerIpcHandlers({
  getWindow,
  libraryRepository,
  playlistRepository,
  telemetryRepository,
  libraryService,
  importAppleMusicPlaylists,
  analyzeAudio,
  nativeAudio,
  playbackSession,
  wakeLock
}) {
  ipcMain.handle('library:choose', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openDirectory'],
      title: 'Choose a music folder'
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const directory = result.filePaths[0];
    const [tree] = await Promise.all([libraryService.buildFolderTree(directory), libraryService.index(directory)]);
    libraryRepository.saveState(directory, tree);
    return { directory, tree };
  });

  ipcMain.handle('library:saved', () => libraryRepository.savedState());
  ipcMain.handle('library:indexed', (_event, directory) => {
    if (!validDirectory(directory)) return null;
    const tracks = libraryRepository.tracksForRoot(directory);
    return tracks.length ? { directory, tracks } : null;
  });
  ipcMain.handle('library:rescan', async () => {
    const saved = libraryRepository.savedState();
    if (!saved?.directory) return null;
    try {
      const [tree, library] = await Promise.all([
        libraryService.buildFolderTree(saved.directory),
        libraryService.index(saved.directory)
      ]);
      libraryRepository.saveState(saved.directory, tree);
      return { directory: saved.directory, tree, tracks: library.tracks };
    } catch { return null; }
  });
  ipcMain.handle('library:tree', async (_event, directory) => {
    if (!validDirectory(directory)) return null;
    try {
      const [tree] = await Promise.all([libraryService.buildFolderTree(directory), libraryService.index(directory)]);
      libraryRepository.saveState(directory, tree);
      return { directory, tree };
    } catch { return null; }
  });
  ipcMain.handle('library:load-folder', async (_event, directory) => {
    if (!validDirectory(directory)) return null;
    try { return await libraryService.scan(directory); } catch { return null; }
  });
  ipcMain.handle('library:scan', async (_event, directory) => {
    if (!validDirectory(directory)) return null;
    try { return await libraryService.scan(directory); } catch { return null; }
  });

  ipcMain.handle('playlists:list', () => playlistRepository.list());
  ipcMain.handle('playlists:tracks', (_event, playlistId) => {
    const id = Number(playlistId);
    return Number.isInteger(id) && id > 0 ? playlistRepository.tracks(id) : [];
  });
  ipcMain.handle('playlists:import-apple-music', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openFile'],
      title: 'Import Apple Music playlists',
      filters: [{ name: 'Apple Music Library XML', extensions: ['xml'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    try { return await importAppleMusicPlaylists(result.filePaths[0]); }
    catch (error) { return { error: error.message }; }
  });
  ipcMain.handle('playlists:delete', (_event, playlistId) => {
    const id = Number(playlistId);
    return Number.isInteger(id) && id > 0 ? playlistRepository.delete(id) : false;
  });

  ipcMain.handle('telemetry:record', (_event, payload) => telemetryRepository.record(payload));
  ipcMain.handle('playback-session:update', (_event, payload) => playbackSession.update(payload));
  ipcMain.handle('playback-session:restore', () => playbackSession.snapshot(nativeAudio.getState()));
  ipcMain.handle('window:always-on-top', (_event, value) => {
    const window = getWindow();
    window.setAlwaysOnTop(Boolean(value), 'floating');
    return window.isAlwaysOnTop();
  });
  ipcMain.handle('window:keep-awake', (_event, value) => {
    return typeof value === 'boolean' ? wakeLock.setEnabled(value) : wakeLock.isActive();
  });
  ipcMain.handle('window:compact', (_event, compact) => {
    const window = getWindow();
    if (compact) {
      window.setMinimumSize(520, 540);
      window.setSize(520, 540, true);
    } else {
      window.setMinimumSize(860, 620);
      window.setSize(1180, 780, true);
    }
  });
  ipcMain.handle('system-volume:get', getSystemVolume);
  ipcMain.handle('system-volume:set', (_event, value) => setSystemVolume(value));
  ipcMain.handle('native-audio:command', (_event, action, payload = {}) => {
    if (!['load', 'play', 'pause', 'stop', 'seek', 'prepareNext', 'cancelNext', 'clearNowPlaying'].includes(action)) return false;
    nativeAudio.send(action, payload);
    return true;
  });
  ipcMain.handle('smart-fade:prepare', async (_event, current, next) => {
    if (!current?.path || !next?.path) return false;
    const [currentAnalysis, nextAnalysis] = await Promise.all([
      analyzeAudio(current.path, current.duration),
      analyzeAudio(next.path, next.duration)
    ]);
    const nextGain = Math.max(.65, Math.min(1, Math.pow(10, (currentAnalysis.mean - nextAnalysis.mean) / 20)));
    nativeAudio.send('prepareNext', {
      path: next.path,
      metadata: next.nowPlaying,
      currentEnd: currentAnalysis.outroStart,
      nextStart: nextAnalysis.introEnd,
      fadeDuration: 5,
      nextGain
    });
    return true;
  });
}

module.exports = { registerIpcHandlers };
