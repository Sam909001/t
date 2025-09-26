const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printBarcode: (htmlContent) => ipcRenderer.invoke('print-barcode', htmlContent),
  onPrintError: (callback) => ipcRenderer.on('print-error', (event, error) => callback(error)),

  // NEW: receive unique monitor ID from main process
  setMonitorId: (callback) => ipcRenderer.on('set-monitor-id', (event, id) => callback(id)),

  // optional: invoke SQLite IPC calls
  fetchPackagesForContainers: (containerIds) => ipcRenderer.invoke('fetchPackagesForContainers', containerIds),
  getContainersCount: (monitorId, filter) => ipcRenderer.invoke('getContainersCount', monitorId, filter),
});
