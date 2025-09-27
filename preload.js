const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Monitor ID ---
    setMonitorId: (callback) => ipcRenderer.on('set-monitor-id', (event, id) => callback(id)),

    // --- Packages / Containers ---
    addPackage: (packageData) => ipcRenderer.invoke('add-package', packageData),
    fetchPackages: (monitorId) => ipcRenderer.invoke('fetch-packages', monitorId),

    // --- Print Barcode / Labels ---
    printBarcode: (htmlContent) => ipcRenderer.invoke('print-barcode', htmlContent),
    printLabel: (htmlContent) => ipcRenderer.invoke('print-barcode', htmlContent), // same as barcode for now

    // --- Misc Notifications ---
    showNotification: (title, body) => ipcRenderer.send('showNotification', { title, body }),
});
