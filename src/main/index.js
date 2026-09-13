const { app, BrowserWindow } = require('electron');
const { getDatabase, closeDatabase } = require('./database/connection');
const { createLibraryRepository } = require('./database/library-repository');
const { createPlaylistRepository } = require('./database/playlist-repository');
const { createTelemetryRepository } = require('./database/telemetry-repository');
const { createLibraryService } = require('./services/library-service');
const { createAppleMusicImporter } = require('./services/apple-music-importer');
const { createAudioAnalyzer } = require('./services/audio-analysis');
const { createNativeAudioService } = require('./services/native-audio');
const { createPlaybackSession } = require('./services/playback-session');
const { registerMediaScheme, handleMediaRequests } = require('./services/media-protocol');
const { registerIpcHandlers } = require('./ipc/register-handlers');
const { createMainWindow } = require('./window');

registerMediaScheme();

let mainWindow;
let nativeAudio;
const playbackSession = createPlaybackSession();

function openMainWindow() {
  mainWindow = createMainWindow();
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

app.whenReady().then(() => {
  const database = getDatabase(app);
  const libraryRepository = createLibraryRepository(database);
  const playlistRepository = createPlaylistRepository(database);
  const telemetryRepository = createTelemetryRepository(database);
  const libraryService = createLibraryService(libraryRepository);

  handleMediaRequests();
  openMainWindow();
  nativeAudio = createNativeAudioService(app, (state) => {
    playbackSession.handleNativeState(state);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('native-audio:state', state);
  });
  registerIpcHandlers({
    getWindow: () => mainWindow,
    libraryRepository,
    playlistRepository,
    telemetryRepository,
    libraryService,
    importAppleMusicPlaylists: createAppleMusicImporter(database),
    analyzeAudio: createAudioAnalyzer(),
    nativeAudio,
    playbackSession
  });
  nativeAudio.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  nativeAudio?.stop();
  closeDatabase();
});
