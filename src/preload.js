const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('retroPlayer', {
  chooseLibrary: () => ipcRenderer.invoke('library:choose'),
  loadSavedLibrary: () => ipcRenderer.invoke('library:saved'),
  loadIndexedLibrary: (directory) => ipcRenderer.invoke('library:indexed', directory),
  rescanLibrary: () => ipcRenderer.invoke('library:rescan'),
  scanLibrary: (directory) => ipcRenderer.invoke('library:scan', directory),
  loadLibraryTree: (directory) => ipcRenderer.invoke('library:tree', directory),
  loadFolder: (directory) => ipcRenderer.invoke('library:load-folder', directory),
  listPlaylists: () => ipcRenderer.invoke('playlists:list'),
  loadPlaylistTracks: (playlistId) => ipcRenderer.invoke('playlists:tracks', playlistId),
  importAppleMusicPlaylists: () => ipcRenderer.invoke('playlists:import-apple-music'),
  deletePlaylist: (playlistId) => ipcRenderer.invoke('playlists:delete', playlistId),
  recordPlaybackEvent: (payload) => ipcRenderer.invoke('telemetry:record', payload),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:always-on-top', value),
  setCompact: (value) => ipcRenderer.invoke('window:compact', value),
  getSystemVolume: () => ipcRenderer.invoke('system-volume:get'),
  setSystemVolume: (value) => ipcRenderer.invoke('system-volume:set', value),
  nativeAudioCommand: (action, payload) => ipcRenderer.invoke('native-audio:command', action, payload),
  prepareSmartFade: (current, next) => ipcRenderer.invoke('smart-fade:prepare', current, next),
  onNativeAudioState: (callback) => ipcRenderer.on('native-audio:state', (_event, state) => callback(state))
});
