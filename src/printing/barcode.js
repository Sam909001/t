// Barcode management and generation
class BarcodeManager {
    constructor() {
        this.barcodeInput = null;
        this.scannedCodes = [];
        this.scannerMode = false;
    }

    // Initialize barcode manager
    init() {
        this.barcodeInput = document.getElementById('barcodeInput');
        this.setupBarcodeInput();
        this.setupScannerToggle();
        console.log('BarcodeManager initialized');
    }

    // Setup barcode input handlers
    setupBarcodeInput() {
        if (!this.barcodeInput) return;

        // Clear input on focus
        this.barcodeInput.addEventListener('focus', () => {
            this.barcodeInput.select();
        });

        // Process barcode on enter
        this.barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.processBarcode();
            }
        });

        // Barcode submit button
        const barcodeSubmit = document.getElementById('barcodeSubmit');
        if (barcodeSubmit) {
            barcodeSubmit.addEventListener('click', () => {
                this.processBarcode();
            });
        }
    }

    // Setup scanner toggle
    setupScannerToggle() {
        const scannerToggle = document.getElementById('scannerToggle');
        if (scannerToggle) {
            scannerToggle.addEventListener('click', () => {
                this.toggleScanner();
            });
        }
    }

    // Process scanned/entered barcode
    async processBarcode() {
        if (!this.barcodeInput) return;

        const barcodeValue = this.barcodeInput.value.trim();
        if (!barcodeValue) {
            NotificationManager.showAlert('Lütfen bir barkod girin', 'warning');
            return;
        }

        try {
            // Check if barcode already exists
            const existingPackage = PackageManager.getPackageByBarcode(barcodeValue);
            
            if (existingPackage) {
                // Handle existing package
                await this.handleExistingPackage(existingPackage);
            } else {
                // Create new package
                await this.handleNewBarcode(barcodeValue);
            }

            // Add to scanned codes list
            this.addToScannedList(barcodeValue);
            
            // Clear input for next scan
            this.barcodeInput.value = '';
            this.barcodeInput.focus();

        } catch (error) {
            console.error('Error processing barcode:', error);
            NotificationManager.showAlert('Barkod işlenirken hata oluştu', 'error');
        }
    }

    // Handle existing package
    async handleExistingPackage(pkg) {
        // Show package information
        NotificationManager.showAlert(
            `Paket bulundu: ${pkg.product_name} (${pkg.customers?.name || 'Bilinmeyen Müşteri'})`,
            'info'
        );

        // Select the package in the table
        PackageManager.selectPackage(pkg.id);
        
        // Ask what to do with existing package
        NotificationManager.showConfirm(
            `Bu paket zaten mevcut. Ne yapmak istiyorsunuz?\n\nÜrün: ${pkg.product_name}\nMüşteri: ${pkg.customers?.name || 'Bilinmeyen'}\nAdet: ${pkg.quantity}`,
            () => {
                // Show edit modal
                ModalManager.showPackageEditModal(pkg);
            },
            () => {
                // Do nothing, just close
                console.log('User cancelled package action');
            }
        );
    }

    // Handle new barcode
    async handleNewBarcode(barcode) {
        // Check if customer is selected
        if (!app.selectedCustomer) {
            NotificationManager.showAlert('Önce müşteri seçin', 'warning');
            return;
        }

        // Show quantity modal for new package
        ModalManager.showQuantityModal(
            'Yeni Paket - Adet Girin',
            async (quantity) => {
                await this.createPackageFromBarcode(barcode, quantity);
            }
        );
    }

    // Create package from barcode
    async createPackageFromBarcode(barcode, quantity) {
        try {
            // Get product name (this could be enhanced to lookup product database)
            const productName = await this.getProductNameForBarcode(barcode);
            
            const packageData = {
                customer_id: app.selectedCustomer.id,
                product_name: productName,
                quantity: parseInt(quantity),
                barcode: barcode,
                container_id: ContainerManager.getCurrentContainer()?.id || null
            };

            const newPackage = await PackageManager.createPackage(packageData);
            
            if (newPackage) {
                // Try to reduce stock if product exists
                await StockManager.reduceStock(productName, quantity);
                
                NotificationManager.showAlert(
                    `Paket oluşturuldu: ${productName} (${quantity} adet)`,
                    'success'
                );
            }

        } catch (error) {
            console.error('Error creating package from barcode:', error);
            NotificationManager.showAlert('Paket oluşturulamadı: ' + error.message, 'error');
        }
    }

    // Get product name for barcode (could be enhanced with product database)
    async getProductNameForBarcode(barcode) {
        // Simple implementation - ask user for product name
        return new Promise((resolve) => {
            NotificationManager.showPrompt(
                'Ürün adını girin:',
                '',
                (productName) => {
                    if (productName.trim()) {
                        resolve(productName.trim());
                    } else {
                        resolve('Tanımlanmamış Ürün');
                    }
                },
                () => resolve('Tanımlanmamış Ürün')
            );
        });
    }

    // Add barcode to scanned list
    addToScannedList(barcode) {
        // Add to beginning of array
        this.scannedCodes.unshift({
            barcode: barcode,
            timestamp: new Date(),
            id: Helpers.generateId()
        });

        // Keep only last 20 scans
        if (this.scannedCodes.length > 20) {
            this.scannedCodes = this.scannedCodes.slice(0, 20);
        }

        // Update UI
        this.updateScannedList();
    }

    // Update scanned list UI
    updateScannedList() {
        const scannedContainer = document.getElementById('scannedBarcodes');
        if (!scannedContainer) return;

        if (this.scannedCodes.length === 0) {
            scannedContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Henüz barkod okutulmadı</p>';
            return;
        }

                scannedContainer.innerHTML = `
            <div style="margin-bottom: 0.5rem; font-weight: bold; font-size: 0.9rem;">
                Son Okutulan Barkodlar (${this.scannedCodes.length})
            </div>
            ${this.scannedCodes.map(scan => `
                <div style="
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    padding: 0.3rem 0.5rem; 
                    margin: 0.2rem 0; 
                    background: #f8f9fa; 
                    border-radius: 3px;
                    font-size: 0.8rem;
                ">
                    <span style="font-family: monospace; font-weight: bold;">
                        ${this.truncateBarcode(scan.barcode)}
                    </span>
                    <span style="color: #666; font-size: 0.7rem;">
                        ${Helpers.formatTime(scan.timestamp)}
                    </span>
                </div>
            `).join('')}
        `;
    }

    // Truncate barcode for display
    truncateBarcode(barcode) {
        if (barcode.length > 12) {
            return barcode.substring(0, 8) + '...';
        }
        return barcode;
    }

    // Toggle camera scanner
    toggleScanner() {
        this.scannerMode = !this.scannerMode;
        
        const scannerToggle = document.getElementById('scannerToggle');
        if (scannerToggle) {
            if (this.scannerMode) {
                scannerToggle.innerHTML = '<i class="fas fa-camera"></i> Kamerayı Kapat';
                scannerToggle.classList.add('btn-danger');
                scannerToggle.classList.remove('btn-secondary');
                this.startCameraScanner();
            } else {
                scannerToggle.innerHTML = '<i class="fas fa-camera"></i> Kamera Tarayıcı';
                scannerToggle.classList.remove('btn-danger');
                scannerToggle.classList.add('btn-secondary');
                this.stopCameraScanner();
            }
        }
    }

    // Start camera scanner
    startCameraScanner() {
        // This would require a barcode scanning library like QuaggaJS or ZXing
        // For now, we'll show a placeholder
        NotificationManager.showAlert('Kamera tarayıcı özelliği yakında eklenecek', 'info');
        
        // Reset scanner mode since we're not actually starting it
        this.scannerMode = false;
        this.toggleScanner();
    }

    // Stop camera scanner
    stopCameraScanner() {
        // Implementation for stopping camera scanner
        console.log('Camera scanner stopped');
    }

    // Generate barcode for package
    generateBarcode(prefix = 'PC') {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }

    // Validate barcode format
    validateBarcode(barcode) {
        // Basic validation - at least 6 characters, alphanumeric
        const barcodeRegex = /^[A-Za-z0-9]{6,}$/;
        return barcodeRegex.test(barcode);
    }

    // Create barcode image using JsBarcode
    createBarcodeImage(barcodeValue, options = {}) {
        try {
            if (typeof JsBarcode === 'undefined') {
                console.warn('JsBarcode library not loaded');
                return null;
            }

            const canvas = document.createElement('canvas');
            const defaultOptions = {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 12,
                textAlign: "center",
                textPosition: "bottom"
            };

            JsBarcode(canvas, barcodeValue, { ...defaultOptions, ...options });
            return canvas.toDataURL();
        } catch (error) {
            console.error('Error creating barcode image:', error);
            return null;
        }
    }

    // Get quick buttons for common products
    updateQuickButtons() {
        const quickButtonsContainer = document.getElementById('quickButtons');
        if (!quickButtonsContainer) return;

        // Get recent products from packages
        const recentProducts = this.getRecentProducts();
        
        if (recentProducts.length === 0) {
            quickButtonsContainer.innerHTML = '<p style="text-align: center; color: #666; font-size: 0.8rem;">Henüz hızlı buton yok</p>';
            return;
        }

        quickButtonsContainer.innerHTML = recentProducts.map(product => `
            <button class="quick-btn" onclick="BarcodeManager.selectQuickProduct('${product.name}', ${product.count})">
                <div>${Helpers.truncateText(product.name, 15)}</div>
                <span class="quantity-badge">${product.count}</span>
            </button>
        `).join('');
    }

    // Get recent products for quick buttons
    getRecentProducts() {
        const packages = PackageManager.getAllPackages();
        const productCounts = {};

        // Count products from recent packages
        packages.slice(0, 50).forEach(pkg => {
            const productName = pkg.product_name;
            productCounts[productName] = (productCounts[productName] || 0) + 1;
        });

        // Convert to array and sort by count
        return Object.entries(productCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 9); // Max 9 buttons for 3x3 grid
    }

    // Select quick product
    async selectQuickProduct(productName, count) {
        if (!app.selectedCustomer) {
            NotificationManager.showAlert('Önce müşteri seçin', 'warning');
            return;
        }

        // Show quantity modal
        ModalManager.showQuantityModal(
            `${productName} - Adet Girin`,
            async (quantity) => {
                try {
                    const barcode = this.generateBarcode();
                    
                    const packageData = {
                        customer_id: app.selectedCustomer.id,
                        product_name: productName,
                        quantity: parseInt(quantity),
                        barcode: barcode,
                        container_id: ContainerManager.getCurrentContainer()?.id || null
                    };

                    const newPackage = await PackageManager.createPackage(packageData);
                    
                    if (newPackage) {
                        // Try to reduce stock
                        await StockManager.reduceStock(productName, quantity);
                        
                        // Add to scanned list
                        this.addToScannedList(barcode);
                        
                        NotificationManager.showAlert(
                            `Paket oluşturuldu: ${productName} (${quantity} adet)`,
                            'success'
                        );
                    }

                } catch (error) {
                    console.error('Error creating package from quick button:', error);
                    NotificationManager.showAlert('Paket oluşturulamadı: ' + error.message, 'error');
                }
            }
        );
    }

    // Clear scanned list
    clearScannedList() {
        this.scannedCodes = [];
        this.updateScannedList();
        NotificationManager.showAlert('Barkod listesi temizlendi', 'info');
    }

    // Export scanned barcodes
    exportScannedBarcodes() {
        if (this.scannedCodes.length === 0) {
            NotificationManager.showAlert('Dışa aktarılacak barkod bulunamadı', 'warning');
            return;
        }

        const csvData = this.scannedCodes.map(scan => ({
            'Barkod': scan.barcode,
            'Tarih': Helpers.formatDate(scan.timestamp),
            'Saat': Helpers.formatTime(scan.timestamp)
        }));

        Helpers.downloadCSV(csvData, `okutulan_barkodlar_${Helpers.formatDate(new Date())}.csv`);
    }

    // Search packages by barcode
    searchByBarcode(barcode) {
        const packages = PackageManager.getAllPackages();
        return packages.filter(pkg => 
            pkg.barcode.toLowerCase().includes(barcode.toLowerCase())
        );
    }

    // Get barcode statistics
    getBarcodeStats() {
        return {
            totalScanned: this.scannedCodes.length,
            lastScan: this.scannedCodes.length > 0 ? this.scannedCodes[0].timestamp : null,
            scannerActive: this.scannerMode
        };
    }

    // Setup barcode shortcuts
    setupBarcodeShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F2 - Focus barcode input
            if (e.key === 'F2') {
                e.preventDefault();
                if (this.barcodeInput) {
                    this.barcodeInput.focus();
                    this.barcodeInput.select();
                }
            }
            
            // F3 - Toggle scanner
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggleScanner();
            }
            
            // Escape - Clear barcode input
            if (e.key === 'Escape' && this.barcodeInput === document.activeElement) {
                this.barcodeInput.value = '';
            }
        });
    }

    // Initialize barcode manager
    init() {
        this.barcodeInput = document.getElementById('barcodeInput');
        this.setupBarcodeInput();
        this.setupScannerToggle();
        this.setupBarcodeShortcuts();
        this.updateQuickButtons();
        console.log('BarcodeManager initialized');
    }
}

// Create global instance
window.BarcodeManager = new BarcodeManager();
