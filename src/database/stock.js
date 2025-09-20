    // Update stock item
    async updateStock(stockId, updates) {
        try {
            AuthManager.requirePermission('manage_stock');

            const item = this.stockCache.get(stockId);
            if (!item) {
                throw new Error('Stok kalemi bulunamadı');
            }

            if (DatabaseManager.isReady()) {
                await DatabaseManager.query('stock', 'update', {
                    data: { ...updates, updated_at: new Date().toISOString() },
                    filter: { id: stockId }
                });

                // Update local cache
                const updatedItem = { ...item, ...updates };
                this.stockCache.set(stockId, updatedItem);
                
                // Update stock array
                const index = this.stock.findIndex(s => s.id === stockId);
                if (index !== -1) {
                    this.stock[index] = updatedItem;
                }

                // Update offline storage
                OfflineManager.storeOfflineData('stock', this.stock);
                
                // Refresh table
                await this.populateStockTable();
                
                NotificationManager.showAlert('Stok güncellendi', 'success');
                return updatedItem;
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'update_stock',
                    data: { id: stockId, ...updates }
                });
                
                NotificationManager.showAlert('Stok güncellendi (çevrimdışı)', 'info');
                return item;
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            NotificationManager.showAlert('Stok güncellenemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Delete stock item
    async deleteStock(stockId) {
        try {
            AuthManager.requirePermission('manage_stock');

            const item = this.stockCache.get(stockId);
            if (!item) {
                throw new Error('Stok kalemi bulunamadı');
            }

            // Show confirmation
            const confirmed = await new Promise(resolve => {
                NotificationManager.showConfirm(
                    `"${item.product_name}" stok kalemini silmek istediğinizden emin misiniz?`,
                    () => resolve(true),
                    () => resolve(false)
                );
            });

            if (!confirmed) return false;

            if (DatabaseManager.isReady()) {
                await DatabaseManager.query('stock', 'delete', {
                    filter: { id: stockId }
                });

                // Remove from local cache
                this.stockCache.delete(stockId);
                this.stock = this.stock.filter(s => s.id !== stockId);

                // Update offline storage
                OfflineManager.storeOfflineData('stock', this.stock);
                
                // Refresh table
                await this.populateStockTable();
                
                NotificationManager.showAlert('Stok silindi', 'success');
                return true;
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'delete_stock',
                    data: { id: stockId }
                });
                
                NotificationManager.showAlert('Stok silindi (çevrimdışı)', 'info');
                return true;
            }
        } catch (error) {
            console.error('Error deleting stock:', error);
            NotificationManager.showAlert('Stok silinemedi: ' + error.message, 'error');
            return false;
        }
    }

    // Adjust stock quantity
    async adjustStock(stockId) {
        const item = this.stockCache.get(stockId);
        if (!item) {
            NotificationManager.showAlert('Stok kalemi bulunamadı', 'error');
            return;
        }

        // Show quantity adjustment modal
        NotificationManager.showPrompt(
            `"${item.product_name}" için yeni miktar girin (Mevcut: ${item.quantity}):`,
            item.quantity.toString(),
            async (newQuantity) => {
                const quantity = parseInt(newQuantity);
                if (isNaN(quantity) || quantity < 0) {
                    NotificationManager.showAlert('Geçerli bir miktar girin', 'error');
                    return;
                }

                try {
                    await this.updateStock(stockId, { quantity });
                } catch (error) {
                    console.error('Error adjusting stock:', error);
                }
            }
        );
    }

    // Edit stock item
    editStock(stockId) {
        const item = this.stockCache.get(stockId);
        if (!item) {
            NotificationManager.showAlert('Stok kalemi bulunamadı', 'error');
            return;
        }

        // Show edit modal (to be implemented in modals.js)
        ModalManager.showStockEditModal(item);
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

        const debouncedSearch = Helpers.debounce(async (query) => {
            const filteredStock = this.searchStock(query);
            await this.displayFilteredStock(filteredStock);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    // Display filtered stock
    async displayFilteredStock(filteredStock) {
        const originalStock = this.stock;
        this.stock = filteredStock;
        await this.populateStockTable();
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
            NotificationManager.showAlert(
                `${criticalItems.length} ürünün stoku kritik seviyede!`, 
                'error', 
                5000
            );
        } else if (lowItems.length > 0) {
            NotificationManager.showAlert(
                `${lowItems.length} ürünün stoku az seviyede`, 
                'warning',
                4000
            );
        }
    }

    // Import stock from CSV
    async importStockFromCSV(file) {
        try {
            AuthManager.requirePermission('manage_stock');

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
                NotificationManager.showAlert(
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

            NotificationManager.showAlert(
                `${successCount} stok kalemi başarıyla içe aktarıldı`,
                'success'
            );

        } catch (error) {
            console.error('Error importing stock:', error);
            NotificationManager.showAlert('İçe aktarma başarısız: ' + error.message, 'error');
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
            'Son Güncelleme': Helpers.formatDateTime(item.updated_at || item.created_at)
        }));

        Helpers.downloadCSV(csvData, `stok_${Helpers.formatDate(new Date())}.csv`);
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

            const extension = Helpers.getFileExtension(file.name);
            
            try {
                if (extension === 'csv') {
                    await this.importStockFromCSV(file);
                } else if (extension === 'xlsx' || extension === 'xls') {
                    // Excel import would require additional library
                    NotificationManager.showAlert('Excel desteği henüz eklenmedi. CSV kullanın.', 'warning');
                } else {
                    throw new Error('Desteklenmeyen dosya formatı. CSV veya Excel kullanın.');
                }
            } catch (error) {
                console.error('File upload error:', error);
                NotificationManager.showAlert('Dosya yükleme hatası: ' + error.message, 'error');
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
            NotificationManager.showAlert(
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
                NotificationManager.showAlert(
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

    // Initialize stock management
    init() {
        this.setupStockSearch();
        this.setupFileUpload();
        console.log('StockManager initialized');
    }
}

// Create global instance
window.StockManager = new StockManager();
