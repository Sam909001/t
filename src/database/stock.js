class StockManager {
    constructor() {
        this.stock = [];
        this.stockCache = new Map();
        this.lowStockThreshold = 5;
        this.criticalStockThreshold = 2;
    }

    // Basit bildirim fonksiyonu
    showNotification(message, type = 'info', duration = 3000) {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Tarayıcı bildirimi göster (izin verilmişse)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('ProClean', { body: message });
        }
        
        // Basit bir alert kutusu göster
        alert(`${type.toUpperCase()}: ${message}`);
    }

    // Create stock item
    async createStock(stockData) {
        try {
            // AuthManager kontrolü
            if (typeof AuthManager !== 'undefined' && AuthManager.requirePermission) {
                AuthManager.requirePermission('manage_stock');
            }

            // DatabaseManager kontrolü
            let dbReady = false;
            if (typeof DatabaseManager !== 'undefined' && DatabaseManager.isReady) {
                dbReady = DatabaseManager.isReady();
            }

            const newItem = {
                id: Date.now().toString(),
                product_name: stockData.product_name,
                product_code: stockData.product_code || '',
                quantity: parseInt(stockData.quantity) || 0,
                min_quantity: parseInt(stockData.min_quantity) || this.lowStockThreshold,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (dbReady) {
                await DatabaseManager.query('stock', 'insert', { data: newItem });
            } else {
                // Queue for offline sync
                if (typeof OfflineManager !== 'undefined' && OfflineManager.queueForSync) {
                    OfflineManager.queueForSync({
                        type: 'create_stock',
                        data: newItem
                    });
                }
            }

            // Add to local cache
            this.stock.push(newItem);
            this.stockCache.set(newItem.id, newItem);

            // Update offline storage
            if (typeof OfflineManager !== 'undefined' && OfflineManager.storeOfflineData) {
                OfflineManager.storeOfflineData('stock', this.stock);
            }

            // Refresh table
            if (this.populateStockTable) {
                await this.populateStockTable();
            }

            this.showNotification('Stok eklendi', 'success');
            return newItem;
        } catch (error) {
            console.error('Error creating stock:', error);
            this.showNotification('Stok eklenemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Update stock item
    async updateStock(stockId, updates) {
        try {
            // AuthManager kontrolü
            if (typeof AuthManager !== 'undefined' && AuthManager.requirePermission) {
                AuthManager.requirePermission('manage_stock');
            }

            const item = this.stockCache.get(stockId);
            if (!item) {
                throw new Error('Stok kalemi bulunamadı');
            }

            // DatabaseManager kontrolü
            let dbReady = false;
            if (typeof DatabaseManager !== 'undefined' && DatabaseManager.isReady) {
                dbReady = DatabaseManager.isReady();
            }

            if (dbReady) {
                await DatabaseManager.query('stock', 'update', {
                    data: { ...updates, updated_at: new Date().toISOString() },
                    filter: { id: stockId }
                });
            } else {
                // Queue for offline sync
                if (typeof OfflineManager !== 'undefined' && OfflineManager.queueForSync) {
                    OfflineManager.queueForSync({
                        type: 'update_stock',
                        data: { id: stockId, ...updates }
                    });
                }
            }

            // Update local cache
            const updatedItem = { ...item, ...updates, updated_at: new Date().toISOString() };
            this.stockCache.set(stockId, updatedItem);
            
            // Update stock array
            const index = this.stock.findIndex(s => s.id === stockId);
            if (index !== -1) {
                this.stock[index] = updatedItem;
            }

            // Update offline storage
            if (typeof OfflineManager !== 'undefined' && OfflineManager.storeOfflineData) {
                OfflineManager.storeOfflineData('stock', this.stock);
            }
            
            // Refresh table
            if (this.populateStockTable) {
                await this.populateStockTable();
            }
            
            this.showNotification('Stok güncellendi', 'success');
            return updatedItem;
        } catch (error) {
            console.error('Error updating stock:', error);
            this.showNotification('Stok güncellenemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Delete stock item
    async deleteStock(stockId) {
        try {
            // AuthManager kontrolü
            if (typeof AuthManager !== 'undefined' && AuthManager.requirePermission) {
                AuthManager.requirePermission('manage_stock');
            }

            const item = this.stockCache.get(stockId);
            if (!item) {
                throw new Error('Stok kalemi bulunamadı');
            }

            // Show confirmation
            const confirmed = confirm(
                `"${item.product_name}" stok kalemini silmek istediğinizden emin misiniz?`
            );

            if (!confirmed) return false;

            // DatabaseManager kontrolü
            let dbReady = false;
            if (typeof DatabaseManager !== 'undefined' && DatabaseManager.isReady) {
                dbReady = DatabaseManager.isReady();
            }

            if (dbReady) {
                await DatabaseManager.query('stock', 'delete', {
                    filter: { id: stockId }
                });
            } else {
                // Queue for offline sync
                if (typeof OfflineManager !== 'undefined' && OfflineManager.queueForSync) {
                    OfflineManager.queueForSync({
                        type: 'delete_stock',
                        data: { id: stockId }
                    });
                }
            }

            // Remove from local cache
            this.stockCache.delete(stockId);
            this.stock = this.stock.filter(s => s.id !== stockId);

            // Update offline storage
            if (typeof OfflineManager !== 'undefined' && OfflineManager.storeOfflineData) {
                OfflineManager.storeOfflineData('stock', this.stock);
            }
            
            // Refresh table
            if (this.populateStockTable) {
                await this.populateStockTable();
            }
            
            this.showNotification('Stok silindi', 'success');
            return true;
        } catch (error) {
            console.error('Error deleting stock:', error);
            this.showNotification('Stok silinemedi: ' + error.message, 'error');
            return false;
        }
    }

    // Adjust stock quantity
    async adjustStock(stockId) {
        const item = this.stockCache.get(stockId);
        if (!item) {
            this.showNotification('Stok kalemi bulunamadı', 'error');
            return;
        }

        // Show quantity adjustment modal
        const newQuantity = prompt(
            `"${item.product_name}" için yeni miktar girin (Mevcut: ${item.quantity}):`,
            item.quantity.toString()
        );
        
        if (newQuantity === null) return; // Kullanıcı iptal etti
        
        const quantity = parseInt(newQuantity);
        if (isNaN(quantity) || quantity < 0) {
            this.showNotification('Geçerli bir miktar girin', 'error');
            return;
        }

        try {
            await this.updateStock(stockId, { quantity });
        } catch (error) {
            console.error('Error adjusting stock:', error);
        }
    }

    // Edit stock item
    editStock(stockId) {
        const item = this.stockCache.get(stockId);
        if (!item) {
            this.showNotification('Stok kalemi bulunamadı', 'error');
            return;
        }

        // Show edit modal
        const newName = prompt('Yeni ürün adı:', item.product_name);
        if (newName !== null && newName.trim() !== '') {
            this.updateStock(stockId, { product_name: newName });
        }
    }

    // Search stock
    searchStock(query) {
        if (!query) return this.stock;

        const searchTerm = query.toLowerCase();
        return this.stock.filter(item => 
            item.product_name.toLowerCase().includes(searchTerm) ||
            (item.product_code && item.product_code.toLowerCase().includes(searchTerm))
        );
    }

    // Setup stock search
    setupStockSearch() {
        const searchInput = document.getElementById('stockSearch');
        if (!searchInput) return;

        const debouncedSearch = this.debounce(async (query) => {
            const filteredStock = this.searchStock(query);
            await this.displayFilteredStock(filteredStock);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    // Debounce utility function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Display filtered stock
    async displayFilteredStock(filteredStock) {
        const originalStock = [...this.stock];
        this.stock = filteredStock;
        
        if (this.populateStockTable) {
            await this.populateStockTable();
        }
        
        this.stock = originalStock;
    }

    // Get low stock items
    getLowStockItems() {
        return this.stock.filter(item => {
            const minQuantity = item.min_quantity || this.lowStockThreshold;
            return item.quantity <= minQuantity;
        });
    }

    // Get critical stock items
    getCriticalStockItems() {
        return this.stock.filter(item => item.quantity <= this.criticalStockThreshold);
    }

    // Check stock levels and alert
    checkStockLevels() {
        const criticalItems = this.getCriticalStockItems();
        const lowItems = this.getLowStockItems();

        if (criticalItems.length > 0) {
            this.showNotification(
                `${criticalItems.length} ürünün stoku kritik seviyede!`, 
                'error'
            );
        } else if (lowItems.length > 0) {
            this.showNotification(
                `${lowItems.length} ürünün stoku az seviyede`, 
                'warning'
            );
        }
    }

    // Import stock from CSV
    async importStockFromCSV(file) {
        try {
            // AuthManager kontrolü
            if (typeof AuthManager !== 'undefined' && AuthManager.requirePermission) {
                AuthManager.requirePermission('manage_stock');
            }

            const text = await file.text();
            const lines = text.split('\n');
            
            if (lines.length < 2) {
                throw new Error('CSV dosyası en az 2 satır içermelidir');
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const requiredHeaders = ['product_name', 'quantity'];
            
            for (const required of requiredHeaders) {
                if (!headers.includes(required)) {
                    throw new Error(`Gerekli sütun bulunamadı: ${required}`);
                }
            }

            const importedItems = [];
            const errors = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                try {
                    const values = line.split(',').map(v => v.trim());
                    const item = {};

                    headers.forEach((header, index) => {
                        item[header] = values[index] || '';
                    });

                    // Validate and convert
                    if (!item.product_name) {
                        throw new Error(`Satır ${i + 1}: Ürün adı boş olamaz`);
                    }

                    item.quantity = parseInt(item.quantity) || 0;
                    item.min_quantity = parseInt(item.min_quantity) || this.lowStockThreshold;

                    importedItems.push(item);
                } catch (error) {
                    errors.push(`Satır ${i + 1}: ${error.message}`);
                }
            }

            if (errors.length > 0) {
                console.warn('Import errors:', errors);
                this.showNotification(
                    `${errors.length} satırda hata oluştu. Konsolu kontrol edin.`,
                    'warning'
                );
            }

            // Import valid items
            let successCount = 0;
            for (const item of importedItems) {
                try {
                    await this.createStock(item);
                    successCount++;
                } catch (error) {
                    console.error('Error importing item:', item, error);
                }
            }

            this.showNotification(
                `${successCount} stok kalemi başarıyla içe aktarıldı`,
                'success'
            );

        } catch (error) {
            console.error('Error importing stock:', error);
            this.showNotification('İçe aktarma başarısız: ' + error.message, 'error');
        }
    }

    // Export stock to CSV
    exportStockCSV() {
        const csvData = this.stock.map(item => ({
            'Ürün Kodu': item.product_code || '',
            'Ürün Adı': item.product_name,
            'Miktar': item.quantity,
            'Minimum Miktar': item.min_quantity || '',
            'Durum': this.getStockStatus(item),
            'Son Güncelleme': this.formatDateTime(item.updated_at || item.created_at)
        }));

        this.downloadCSV(csvData, `stok_${this.formatDate(new Date())}.csv`);
    }

    // Format date
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Format date time
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    }

    // Download CSV
    downloadCSV(data, filename) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Convert to CSV
    convertToCSV(objArray) {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        
        // Headers
        const headers = Object.keys(array[0]);
        str += headers.join(',') + '\r\n';
        
        // Rows
        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (let j = 0; j < headers.length; j++) {
                if (line !== '') line += ',';
                
                // Değeri string'e çevir ve tırnak içine al
                const value = array[i][headers[j]] || '';
                line += `"${value.toString().replace(/"/g, '""')}"`;
            }
            str += line + '\r\n';
        }
        
        return str;
    }

    // Get file extension
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    // Get stock status
    getStockStatus(item) {
        if (item.quantity <= this.criticalStockThreshold) {
            return 'Kritik';
        } else if (item.quantity <= (item.min_quantity || this.lowStockThreshold)) {
            return 'Az';
        } else {
            return 'Yeterli';
        }
    }

    // Get stock statistics
    getStockStats() {
        const total = this.stock.length;
        const inStock = this.stock.filter(item => item.quantity > (item.min_quantity || this.lowStockThreshold)).length;
        const lowStock = this.getLowStockItems().length;
        const criticalStock = this.getCriticalStockItems().length;
        const totalQuantity = this.stock.reduce((sum, item) => sum + item.quantity, 0);

        return {
            total,
            inStock,
            lowStock,
            criticalStock,
            totalQuantity
        };
    }

    // Setup file upload handler
    setupFileUpload() {
        const fileInput = document.getElementById('stockFileInput');
        if (!fileInput) return;

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const extension = this.getFileExtension(file.name);
            
            try {
                if (extension === 'csv') {
                    await this.importStockFromCSV(file);
                } else if (extension === 'xlsx' || extension === 'xls') {
                    // Excel import would require additional library
                    this.showNotification('Excel desteği henüz eklenmedi. CSV kullanın.', 'warning');
                } else {
                    throw new Error('Desteklenmeyen dosya formatı. CSV veya Excel kullanın.');
                }
            } catch (error) {
                console.error('File upload error:', error);
                this.showNotification('Dosya yükleme hatası: ' + error.message, 'error');
            }

            // Reset file input
            fileInput.value = '';
        });
    }

    // Get stock item by product name
    getStockByProductName(productName) {
        return this.stock.find(item => 
            item.product_name.toLowerCase() === productName.toLowerCase()
        );
    }

    // Reduce stock (when package is created)
    async reduceStock(productName, quantity) {
        const item = this.getStockByProductName(productName);
        if (!item) {
            console.warn(`Stock item not found: ${productName}`);
            return false;
        }

        if (item.quantity < quantity) {
            this.showNotification(
                `Yetersiz stok: ${productName} (Mevcut: ${item.quantity}, İstenen: ${quantity})`,
                'warning'
            );
            return false;
        }

        try {
            const newQuantity = item.quantity - quantity;
            await this.updateStock(item.id, { quantity: newQuantity });
            
            // Check if stock is now low
            if (newQuantity <= (item.min_quantity || this.lowStockThreshold)) {
                this.showNotification(
                    `${productName} stoku azaldı (Kalan: ${newQuantity})`,
                    'warning'
                );
            }

            return true;
        } catch (error) {
            console.error('Error reducing stock:', error);
            return false;
        }
    }

    // Get all stock items (for external use)
    getAllStock() {
        return [...this.stock];
    }

    // Load stock from data
    loadStockData(stockData) {
        this.stock = stockData;
        
        // Update cache
        this.stockCache.clear();
        this.stock.forEach(item => {
            this.stockCache.set(item.id, item);
        });
        
        // Check stock levels
        this.checkStockLevels();
    }

    // Initialize stock management
    init() {
        this.setupStockSearch();
        this.setupFileUpload();
        console.log('StockManager initialized');
    }
}

// Create global instance
window.StockManager = new StockManager();
