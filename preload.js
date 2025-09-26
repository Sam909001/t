const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Printing
    printBarcode: (htmlContent) => ipcRenderer.invoke('print-barcode', htmlContent),
    onPrintError: (callback) => ipcRenderer.on('print-error', (event, error) => callback(error)),

    // Per-monitor ID
    setMonitorId: (callback) => ipcRenderer.on('set-monitor-id', (event, id) => callback(id)),

    // SQLite / data fetching APIs
    fetchPackagesForContainers: (containerIds) => ipcRenderer.invoke('fetchPackagesForContainers', containerIds),
    getContainersCount: (monitorId, filter) => ipcRenderer.invoke('getContainersCount', monitorId, filter),
    fetchCustomers: (monitorId) => ipcRenderer.invoke('fetch-customers', monitorId),
    fetchPersonnel: (monitorId) => ipcRenderer.invoke('fetch-personnel', monitorId),
    fetchPackages: (monitorId) => ipcRenderer.invoke('fetch-packages', monitorId),
    calculateTotalQuantity: (packageIds) => ipcRenderer.invoke('calculate-total-quantity', packageIds),
    fetchContainerDetails: (containerId, monitorId) => ipcRenderer.invoke('fetch-container-details', containerId, monitorId),
    fetchStockItems: (monitorId) => ipcRenderer.invoke('fetch-stock-items', monitorId)
});
