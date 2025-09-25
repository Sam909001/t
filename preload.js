const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printBarcode: (htmlContent) => ipcRenderer.invoke('print-barcode', htmlContent),
  
  // Add error listener
  onPrintError: (callback) => ipcRenderer.on('print-error', callback)
});
