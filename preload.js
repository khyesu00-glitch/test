const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  organizeFiles: (folderPath, options) => ipcRenderer.invoke('organize-files', folderPath, options),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings)
});
