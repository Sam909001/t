const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printBarcode: (htmlContent) => ipcRenderer.invoke('print-barcode', htmlContent)
});
