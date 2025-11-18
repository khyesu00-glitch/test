const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const FileOrganizer = require('./organizer/fileOrganizer');

let mainWindow;
const organizer = new FileOrganizer();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('renderer/index.html');

  // 개발 모드에서만 DevTools 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 핸들러들
ipcMain.handle('get-downloads-path', async () => {
  return path.join(os.homedir(), 'Downloads');
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('scan-folder', async (event, folderPath) => {
  try {
    const preview = await organizer.scanFolder(folderPath);
    return { success: true, data: preview };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('organize-files', async (event, folderPath, options) => {
  try {
    const result = await organizer.organizeFiles(folderPath, options);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', async () => {
  return organizer.getSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  organizer.updateSettings(settings);
  return { success: true };
});
