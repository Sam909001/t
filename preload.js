const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Monitor ID ---
    setMonitorId: (callback) => ipcRenderer.on('set-monitor-id', (event, id) => callback(id)),

    // --- Packages ---
    fetchPackagesForContainers: ({ containerIds, monitorId }) =>
        ipcRenderer.invoke('fetchPackagesForContainers', { containerIds, monitorId }),
    fetchContainerDetails: ({ containerId, monitorId }) =>
        ipcRenderer.invoke('fetchContainerDetails', { containerId, monitorId }),

    // --- Shipping / Orders ---
    getContainersCount: ({ monitorId, filter }) =>
        ipcRenderer.invoke('getContainersCount', { monitorId, filter }),
    fetchShippingPackages: ({ monitorId, filter }) =>
        ipcRenderer.invoke('fetchShippingPackages', { monitorId, filter }),

    // --- Stock Items ---
    fetchStockItems: ({ monitorId, status }) =>
        ipcRenderer.invoke('fetchStockItems', { monitorId, status }),

    // --- Print Barcode / Labels ---
    printBarcode: (htmlContent) => ipcRenderer.send('printBarcode', htmlContent),
    printLabel: (htmlContent) => ipcRenderer.send('printLabel', htmlContent),

    // --- Misc ---
    showNotification: (title, body) => ipcRenderer.send('showNotification', { title, body }),
});
