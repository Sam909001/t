const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Secure Storage
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  storeClearAll: () => ipcRenderer.invoke('store-clear-all'),

  // Printing
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printToSpecificPrinter: (htmlContent, printerName) => 
    ipcRenderer.invoke('print-to-specific-printer', htmlContent, printerName),
  printBarcode: (htmlContent) => 
    ipcRenderer.invoke('print-barcode', htmlContent),
  testPrint: (htmlContent, printerName) => 
    ipcRenderer.invoke('test-print', htmlContent, printerName),
  debugPrinters: () => ipcRenderer.invoke('debug-printers'),

  // File System
  saveExcelToNetwork: (excelData, filename) => 
    ipcRenderer.invoke('save-excel-to-network', excelData, filename),
  saveExcelLocally: (excelData, filename) => 
    ipcRenderer.invoke('save-excel-locally', excelData, filename),
  openFileLocation: (filePath) => 
    ipcRenderer.invoke('open-file-location', filePath),
  testNetworkConnection: () => 
    ipcRenderer.invoke('test-network-connection'),

  // App Info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path')
});

// Log for debugging
console.log('✅ Preload script loaded - Electron API available');
