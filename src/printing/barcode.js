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
                    background: #f8f9fa;
                    padding: 0.5rem;
                    margin: 0.3rem 0;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    border-left: 3px solid #3498db;
                ">
                    <div style="font-family: monospace; font-weight: bold;">${scan.barcode}</div>
                    <div style="color: #666; font-size: 0.7rem;">${Helpers.formatTime(scan.timestamp)}</div>
                </div>
            `).join('')}
            <button onclick="BarcodeManager.clearScannedList()" class="btn btn-sm btn-secondary" style="width: 100%; margin-top: 0.5rem; font-size: 0.8rem;">
                Listeyi Temizle
            </button>
        `;
    }

    // Clear scanned list
    clearScannedList() {
        this.scannedCodes = [];
        this.updateScannedList();
        NotificationManager.showAlert('Barkod listesi temizlendi', 'info');
    }

    // Toggle scanner mode
    toggleScanner() {
        this.scannerMode = !this.scannerMode;
        
        const scannerToggle = document.getElementById('scannerToggle');
        if (scannerToggle) {
            if (this.scannerMode) {
                scannerToggle.innerHTML = '<i class="fas fa-camera-slash"></i> Kamerayı Kapat';
                scannerToggle.classList.remove('btn-secondary');
                scannerToggle.classList.add('btn-danger');
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
        // This would require a QR/Barcode scanning library like QuaggaJS or ZXing
        // For now, we'll show a placeholder
        NotificationManager.showAlert('Kamera tarayıcı özelliği geliştirme aşamasında', 'info');
        
        // In a real implementation, you would:
        // 1. Request camera permission
        // 2. Initialize barcode scanning library
        // 3. Start video stream
        // 4. Process detected barcodes
    }

    // Stop camera scanner
    stopCameraScanner() {
        // Stop video stream and clean up resources
        console.log('Camera scanner stopped');
    }

    // Generate barcode
    generateBarcode(prefix = 'PC') {
        return Helpers.generateBarcode(prefix);
    }

    // Generate barcode image
    generateBarcodeImage(text, elementId) {
        try {
            if (typeof JsBarcode === 'undefined') {
                console.error('JsBarcode library not loaded');
                return false;
            }

            const element = document.getElementById(elementId);
            if (!element) {
                console.error('Barcode element not found:', elementId);
                return false;
            }

            JsBarcode(element, text, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 10
            });

            return true;
        } catch (error) {
            console.error('Error generating barcode image:', error);
            return false;
        }
    }

    // Validate barcode format
    validateBarcode(barcode) {
        // Basic validation - can be enhanced based on specific barcode formats
        if (!barcode || typeof barcode !== 'string') {
            return { valid: false, error: 'Geçersiz barkod formatı' };
        }

        const trimmed = barcode.trim();
        if (trimmed.length < 3) {
            return { valid: false, error: 'Barkod çok kısa' };
        }

        if (trimmed.length > 50) {
            return { valid: false, error: 'Barkod çok uzun' };
        }

        // Check for valid characters (alphanumeric)
        if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
            return { valid: false, error: 'Barkod sadece harf ve rakam içermelidir' };
        }

        return { valid: true, barcode: trimmed };
    }

    // Bulk barcode generation
    generateBulkBarcodes(count, prefix = 'PC') {
        const barcodes = [];
        for (let i = 0; i < count; i++) {
            barcodes.push(this.generateBarcode(prefix));
        }
        return barcodes;
    }

    // Export scanned barcodes
    exportScannedBarcodes() {
        if (this.scannedCodes.length === 0) {
            NotificationManager.showAlert('Dışa aktarılacak barkod bulunamadı', 'warning');
            return;
        }

        const csvData = this.scannedCodes.map(scan => ({
            'Barkod': scan.barcode,
            'Okutma Zamanı': Helpers.formatDateTime(scan.timestamp)
        }));

        Helpers.downloadCSV(csvData, `okutulan_barkodlar_${Helpers.formatDate(new Date())}.csv`);
        NotificationManager.showAlert('Barkod listesi dışa aktarıldı', 'success');
    }

    // Get scanning statistics
    getScanningStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayScans = this.scannedCodes.filter(scan => 
            scan.timestamp >= today
        ).length;

        return {
            totalScans: this.scannedCodes.length,
            todayScans: todayScans,
            lastScan: this.scannedCodes.length > 0 ? this.scannedCodes[0].timestamp : null
        };
    }

    // Focus barcode input
    focusInput() {
        if (this.barcodeInput) {
            this.barcodeInput.focus();
            this.barcodeInput.select();
        }
    }

    // Get scanned codes list
    getScannedCodes() {
        return [...this.scannedCodes];
    }
}

// Create global instance
window.BarcodeManager = new BarcodeManager();
