const path = require('node:path');
const { BrowserWindow } = require('electron');

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: '#191815',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  return window;
}

module.exports = { createMainWindow };
