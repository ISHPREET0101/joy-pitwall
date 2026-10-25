const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const DEV_URL = process.env.ELECTRON_START_URL || '';

// Portable mode: keep all app data (IndexedDB, settings) in a folder next to
// the exe so the app is fully plug-and-play — zip the folder, share it, run it
// from a USB stick, and the data travels with it.
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'JOY-Pitwall-Data'));
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#05070b',
    autoHideMenuBar: true,
    title: 'JOY Pitwall',
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });
  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadURL('app://bundle/index.html');
  }
  return win;
}

app.whenReady().then(() => {
  if (!DEV_URL) {
    protocol.handle('app', (req) => {
      try {
        const { pathname } = new URL(req.url);
        const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
        const file = path.join(__dirname, '..', 'dist', rel);
        return net.fetch(pathToFileURL(file).toString());
      } catch (e) {
        return new Response('Not found', { status: 404 });
      }
    });
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
