// Offline mode management
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineData = new Map();
        this.syncQueue = [];
        this.offlineIndicator = null;
        this.listeners = [];
    }

    init() {
        this.offlineIndicator = document.getElementById('offlineIndicator');
        
        // Setup online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Load offline data from localStorage
        this.loadOfflineData();
        
        // Initial status check
        this.updateOnlineStatus();
        
        console.log('OfflineManager initialized');
    }

    handleOnline() {
        console.log('Connection restored');
        this.isOnline = true;
        this.updateOnlineStatus();
        this.syncOfflineData();
        NotificationManager.showAlert('Bağlantı yeniden kuruldu', 'success');
    }

    handleOffline() {
        console.log('Connection lost');
        this.isOnline = false;
        this.updateOnlineStatus();
        NotificationManager.showAlert('Bağlantı kesildi - Çevrimdışı modda çalışıyor', 'warning');
    }

    updateOnlineStatus() {
        // Update connection status indicator
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            if (this.isOnline) {
                statusElement.textContent = 'Çevrimiçi';
                statusElement.className = 'connection-status online';
            } else {
                statusElement.textContent = 'Çevrimdışı';
                statusElement.className = 'connection-status offline';
            }
        }

        // Show/hide offline indicator
        if (this.offlineIndicator) {
            this.offlineIndicator.style.display = this.isOnline ? 'none' : 'block';
        }

        // Notify listeners
        this.listeners.forEach(listener => {
            try {
                listener(this.isOnline);
            } catch (error) {
                console.error('Error in offline status listener:', error);
            }
        });
    }

    // Add listener for online status changes
    addStatusListener(callback) {
        this.listeners.push(callback);
    }

    // Remove status listener
    removeStatusListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    // Store data for offline use
    storeOfflineData(key, data) {
        this.offlineData.set(key, {
            data: data,
            timestamp: Date.now(),
            synced: false
        });
        this.saveOfflineData();
    }

    // Get offline data
    getOfflineData(key) {
        const item = this.offlineData.get(key);
        return item ? item.data : null;
    }

    // Queue operation for when online
    queueForSync(operation) {
        operation.id = Helpers.generateId();
        operation.timestamp = Date.now();
        operation.retries = 0;
        
        this.syncQueue.push(operation);
        this.saveOfflineData();
        
        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncOfflineData();
        }
        
        return operation.id;
    }

    // Sync offline data when connection is restored
    async syncOfflineData() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log(`Syncing ${this.syncQueue.length} offline operations`);
        NotificationManager.showProgress('Çevrimdışı veriler senkronize ediliyor...', 0);

        const totalOperations = this.syncQueue.length;
        let completedOperations = 0;

        for (let i = this.syncQueue.length - 1; i >= 0; i--) {
            const operation = this.syncQueue[i];
            
            try {
                const success = await this.executeSyncOperation(operation);
                if (success) {
                    this.syncQueue.splice(i, 1);
                    completedOperations++;
                } else {
                    operation.retries++;
                    if (operation.retries >= 3) {
                        console.warn('Operation failed after 3 retries, removing:', operation);
                        this.syncQueue.splice(i, 1);
                        completedOperations++;
                    }
                }
            } catch (error) {
                console.error('Sync operation failed:', error);
                operation.retries++;
                if (operation.retries >= 3) {
                    this.syncQueue.splice(i, 1);
                    completedOperations++;
                }
            }

            // Update progress
            const progress = (completedOperations / totalOperations) * 100;
            NotificationManager.updateProgress(progress);
        }

        this.saveOfflineData();
        
        if (completedOperations > 0) {
            NotificationManager.showAlert(`${completedOperations} işlem senkronize edildi`, 'success');
        }
    }

    // Execute a single sync operation
    async executeSyncOperation(operation) {
        switch (operation.type) {
            case 'create_package':
                return await PackageManager.createPackage(operation.data);
            
            case 'update_package':
                return await PackageManager.updatePackage(operation.data.id, operation.data);
            
            case 'delete_package':
                return await PackageManager.deletePackage(operation.data.id);
            
            case 'update_stock':
                return await StockManager.updateStock(operation.data.id, operation.data.quantity);
            
            case 'create_customer':
                return await CustomerManager.createCustomer(operation.data);
            
            default:
                console.warn('Unknown sync operation type:', operation.type);
                return false;
        }
    }

    // Save offline data to localStorage
    saveOfflineData() {
        try {
            const data = {
                offlineData: Array.from(this.offlineData.entries()),
                syncQueue: this.syncQueue
            };
            localStorage.setItem('procleanOfflineData', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving offline data:', error);
        }
    }

    // Load offline data from localStorage
    loadOfflineData() {
        try {
            const savedData = localStorage.getItem('procleanOfflineData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.offlineData = new Map(data.offlineData || []);
                this.syncQueue = data.syncQueue || [];
                console.log(`Loaded ${this.offlineData.size} offline items and ${this.syncQueue.length} sync operations`);
            }
        } catch (error) {
            console.error('Error loading offline data:', error);
            this.offlineData = new Map();
            this.syncQueue = [];
        }
    }

    // Clear offline data
    clearOfflineData() {
        this.offlineData.clear();
        this.syncQueue = [];
        localStorage.removeItem('procleanOfflineData');
        console.log('Offline data cleared');
    }

    // Get offline statistics
    getOfflineStats() {
        return {
            isOnline: this.isOnline,
            offlineItems: this.offlineData.size,
            queuedOperations: this.syncQueue.length,
            oldestOperation: this.syncQueue.length > 0 ? 
                Math.min(...this.syncQueue.map(op => op.timestamp)) : null
        };
    }

    // Check if we have offline data for a specific key
    hasOfflineData(key) {
        return this.offlineData.has(key);
    }

    // Get all offline keys
    getOfflineKeys() {
        return Array.from(this.offlineData.keys());
    }

    // Force online status (for testing)
    setOnlineStatus(status) {
        const wasOnline = this.isOnline;
        this.isOnline = status;
        
        if (wasOnline !== status) {
            if (status) {
                this.handleOnline();
            } else {
                this.handleOffline();
            }
        }
    }

    // Check if operation can be performed offline
    canPerformOffline(operationType) {
        const offlineCapableOperations = [
            'view_packages',
            'view_stock',
            'view_customers',
            'create_package_draft',
            'search_local'
        ];
        return offlineCapableOperations.includes(operationType);
    }

    // Show offline notice for operations that require connection
    showOfflineNotice(message = 'Bu işlem için internet bağlantısı gerekiyor') {
        NotificationManager.showAlert(message, 'warning');
    }
}

// Create global instance
window.OfflineManager = new OfflineManager();
