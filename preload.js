const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printBarcode: (htmlContent) => ipcRenderer.send('print-barcode', htmlContent)
});
