// Printing management
class PrinterManager {
    constructor() {
        this.isConnected = false;
        this.printerSettings = {
            scaling: '100%',
            copies: 1,
            paperSize: 'A4'
        };
        this.loadSettings();
    }

    // Load printer settings
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('procleanPrinterSettings') || '{}');
            this.printerSettings = { ...this.printerSettings, ...settings };
        } catch (error) {
            console.error('Error loading printer settings:', error);
        }
    }

    // Save printer settings
    saveSettings() {
        try {
            localStorage.setItem('procleanPrinterSettings', JSON.stringify(this.printerSettings));
        } catch (error) {
            console.error('Error saving printer settings:', error);
        }
    }

    // Check printer connection
    checkConnection() {
        // In a real implementation, this would check actual printer connectivity
        this.isConnected = true; // Simulate connection
        
        const printerStatus = document.getElementById('printerConnectionStatus');
        if (printerStatus) {
            if (this.isConnected) {
                printerStatus.textContent = 'Bağlı';
                printerStatus.className = 'status-indicator connected';
            } else {
                printerStatus.textContent = 'Bağlantı Yok';
                printerStatus.className = 'status-indicator disconnected';
            }
        }

        return this.isConnected;
    }

    // Print package label
    async printPackageLabel(packageData) {
        try {
            if (!this.checkConnection()) {
                NotificationManager.showAlert('Yazıcı bağlantısı bulunamadı', 'error');
                return false;
            }

            const customer = await CustomerManager.getCustomer(packageData.customer_id);
            if (!customer) {
                throw new Error('Müşteri bilgileri bulunamadı');
            }

            // Generate label content
            const labelHTML = this.generateLabelHTML(packageData, customer);
            
            // Print using browser print functionality
            this.printHTML(labelHTML);
            
            NotificationManager.showAlert('Etiket yazdırılıyor...', 'info');
            return true;
        } catch (error) {
            console.error('Error printing package label:', error);
            NotificationManager.showAlert('Etiket yazdırılamadı: ' + error.message, 'error');
            return false;
        }
    }

    // Generate label HTML
    generateLabelHTML(packageData, customer) {
        const now = new Date();
        const barcodeData = packageData.barcode;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Paket Etiketi</title>
                <style>
                    @page {
                        size: 10cm 7cm;
                        margin: 0.5cm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        line-height: 1.3;
                        margin: 0;
                        padding: 0;
                    }
                    .label {
                        width: 100%;
                        height: 100%;
                        border: 2px solid #000;
                        padding: 0.3cm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 1px solid #000;
                        padding-bottom: 0.2cm;
                        margin-bottom: 0.3cm;
                    }
                    .company-name {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 0.1cm;
                    }
                    .info-section {
                        margin-bottom: 0.3cm;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 0.1cm;
                    }
                    .barcode-section {
                        text-align: center;
                        margin-top: auto;
                        padding-top: 0.2cm;
                        border-top: 1px solid #000;
                    }
                    .barcode {
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        margin-top: 0.2cm;
                    }
                    .small-text {
                        font-size: 10px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="label">
                    <div class="header">
                        <div class="company-name">ProClean</div>
                        <div class="small-text">Profesyonel Çamaşırhane</div>
                    </div>
                    
                                       <div class="info-section">
                        <div class="info-row">
                            <strong>Müşteri:</strong>
                            <span>${customer.name}</span>
                        </div>
                        <div class="info-row">
                            <strong>Müşteri Kodu:</strong>
                            <span>${customer.code}</span>
                        </div>
                        <div class="info-row">
                            <strong>Ürün:</strong>
                            <span>${packageData.product_name}</span>
                        </div>
                        <div class="info-row">
                            <strong>Adet:</strong>
                            <span>${packageData.quantity}</span>
                        </div>
                        <div class="info-row">
                            <strong>Tarih:</strong>
                            <span>${Helpers.formatDate(now)}</span>
                        </div>
                        <div class="info-row">
                            <strong>Saat:</strong>
                            <span>${Helpers.formatTime(now)}</span>
                        </div>
                    </div>
                    
                    <div class="barcode-section">
                        <div class="small-text">Barkod</div>
                        <div class="barcode">${barcodeData}</div>
                        <canvas id="barcode-canvas" style="margin-top: 0.2cm;"></canvas>
                    </div>
                </div>
                
                <script src="libs/JsBarcode.all.min.js"></script>
                <script>
                    window.onload = function() {
                        try {
                            JsBarcode("#barcode-canvas", "${barcodeData}", {
                                format: "CODE128",
                                width: 1.5,
                                height: 30,
                                displayValue: false
                            });
                        } catch (error) {
                            console.error('Barcode generation error:', error);
                        }
                        
                        // Auto print after short delay
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
    }

    // Print HTML content
    printHTML(htmlContent) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }

    // Print multiple package labels
    async printMultipleLabels(packages) {
        try {
            if (!this.checkConnection()) {
                NotificationManager.showAlert('Yazıcı bağlantısı bulunamadı', 'error');
                return false;
            }

            if (!packages || packages.length === 0) {
                NotificationManager.showAlert('Yazdırılacak paket seçin', 'warning');
                return false;
            }

            let allLabelsHTML = '';
            
            for (const pkg of packages) {
                const customer = await CustomerManager.getCustomer(pkg.customer_id);
                if (customer) {
                    const labelHTML = this.generateLabelHTML(pkg, customer);
                    allLabelsHTML += labelHTML + '<div style="page-break-after: always;"></div>';
                }
            }

            this.printHTML(allLabelsHTML);
            
            NotificationManager.showAlert(`${packages.length} etiket yazdırılıyor...`, 'info');
            return true;
        } catch (error) {
            console.error('Error printing multiple labels:', error);
            NotificationManager.showAlert('Etiketler yazdırılamadı: ' + error.message, 'error');
            return false;
        }
    }

    // Print container summary
    async printContainerSummary(container) {
        try {
            if (!this.checkConnection()) {
                NotificationManager.showAlert('Yazıcı bağlantısı bulunamadı', 'error');
                return false;
            }

            const packages = await ContainerManager.getContainerPackages(container.id);
            if (!packages || packages.length === 0) {
                NotificationManager.showAlert('Konteynerde paket bulunamadı', 'warning');
                return false;
            }

            // Group packages by customer
            const packagesByCustomer = Helpers.groupBy(packages, 'customer_id');
            
            let summaryHTML = this.generateContainerSummaryHTML(container, packagesByCustomer);
            this.printHTML(summaryHTML);
            
            NotificationManager.showAlert('Konteyner özeti yazdırılıyor...', 'info');
            return true;
        } catch (error) {
            console.error('Error printing container summary:', error);
            NotificationManager.showAlert('Konteyner özeti yazdırılamadı: ' + error.message, 'error');
            return false;
        }
    }

    // Generate container summary HTML
    generateContainerSummaryHTML(container, packagesByCustomer) {
        const now = new Date();
        const totalPackages = Object.values(packagesByCustomer).flat().length;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Konteyner Özeti</title>
                <style>
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 1rem;
                        margin-bottom: 2rem;
                    }
                    .company-name {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                    }
                    .document-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                    }
                    .info-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        margin-bottom: 2rem;
                        padding: 1rem;
                        background: #f8f9fa;
                        border-radius: 5px;
                    }
                    .info-item {
                        margin-bottom: 0.5rem;
                    }
                    .customer-section {
                        margin-bottom: 1.5rem;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        padding: 1rem;
                    }
                    .customer-header {
                        font-weight: bold;
                        font-size: 14px;
                        color: #2c3e50;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 0.5rem;
                        margin-bottom: 0.5rem;
                    }
                    .package-item {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr;
                        gap: 1rem;
                        padding: 0.3rem 0;
                        border-bottom: 1px solid #eee;
                    }
                    .package-header {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr;
                        gap: 1rem;
                        font-weight: bold;
                        padding: 0.5rem 0;
                        border-bottom: 2px solid #333;
                        margin-bottom: 0.5rem;
                    }
                    .summary-section {
                        margin-top: 2rem;
                        padding: 1rem;
                        background: #e9ecef;
                        border-radius: 5px;
                        text-align: center;
                    }
                    .summary-number {
                        font-size: 36px;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">ProClean</div>
                    <div>Profesyonel Çamaşırhane Yönetim Sistemi</div>
                    <div class="document-title">KONTEYNER ÖZETİ</div>
                </div>
                
                <div class="info-section">
                    <div>
                        <div class="info-item"><strong>Konteyner No:</strong> ${container.container_number}</div>
                        <div class="info-item"><strong>Durum:</strong> ${container.status}</div>
                        <div class="info-item"><strong>Oluşturulma:</strong> ${Helpers.formatDateTime(container.created_at)}</div>
                    </div>
                    <div>
                        <div class="info-item"><strong>Yazdırma Tarihi:</strong> ${Helpers.formatDateTime(now)}</div>
                        <div class="info-item"><strong>Toplam Paket:</strong> ${totalPackages}</div>
                        <div class="info-item"><strong>Müşteri Sayısı:</strong> ${Object.keys(packagesByCustomer).length}</div>
                    </div>
                </div>

                ${Object.entries(packagesByCustomer).map(([customerId, customerPackages]) => {
                    const customer = customerPackages[0].customers;
                    const customerTotal = customerPackages.reduce((sum, pkg) => sum + pkg.quantity, 0);
                    
                    return `
                        <div class="customer-section">
                            <div class="customer-header">
                                ${customer?.name || 'Bilinmeyen Müşteri'} (${customer?.code || '-'}) - Toplam: ${customerTotal} adet
                            </div>
                            <div class="package-header">
                                <div>Ürün Adı</div>
                                <div>Adet</div>
                                <div>Barkod</div>
                            </div>
                            ${customerPackages.map(pkg => `
                                <div class="package-item">
                                    <div>${pkg.product_name}</div>
                                    <div>${pkg.quantity}</div>
                                    <div style="font-family: monospace; font-size: 10px;">${pkg.barcode}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}

                <div class="summary-section">
                    <div>TOPLAM PAKET SAYISI</div>
                    <div class="summary-number">${totalPackages}</div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
    }

    // Print stock report
    async printStockReport() {
        try {
            if (!this.checkConnection()) {
                NotificationManager.showAlert('Yazıcı bağlantısı bulunamadı', 'error');
                return false;
            }

            const stock = StockManager.getAllStock();
            if (!stock || stock.length === 0) {
                NotificationManager.showAlert('Stok verisi bulunamadı', 'warning');
                return false;
            }

            const reportHTML = this.generateStockReportHTML(stock);
            this.printHTML(reportHTML);
            
            NotificationManager.showAlert('Stok raporu yazdırılıyor...', 'info');
            return true;
        } catch (error) {
            console.error('Error printing stock report:', error);
            NotificationManager.showAlert('Stok raporu yazdırılamadı: ' + error.message, 'error');
            return false;
        }
    }

    // Generate stock report HTML
    generateStockReportHTML(stock) {
        const now = new Date();
        const lowStock = stock.filter(item => {
            const minQuantity = item.min_quantity || 10;
            return item.quantity <= minQuantity;
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stok Raporu</title>
                <style>
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 1rem;
                        margin-bottom: 2rem;
                    }
                    .company-name {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                    }
                    .document-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 1rem;
                        margin-bottom: 2rem;
                    }
                    .summary-card {
                        text-align: center;
                        padding: 1rem;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    }
                    .summary-number {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    .stock-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 2rem;
                    }
                    .stock-table th,
                    .stock-table td {
                        padding: 0.5rem;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    .stock-table th {
                        background: #f8f9fa;
                        font-weight: bold;
                        border-bottom: 2px solid #333;
                    }
                    .status-kritik {
                        background: #e74c3c;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 10px;
                    }
                    .status-az-stok {
                        background: #f39c12;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 10px;
                    }
                    .status-stokta {
                        background: #2ecc71;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 10px;
                    }
                    .low-stock-section {
                        margin-top: 2rem;
                        padding: 1rem;
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">ProClean</div>
                    <div>Profesyonel Çamaşırhane Yönetim Sistemi</div>
                    <div class="document-title">STOK RAPORU</div>
                    <div>Rapor Tarihi: ${Helpers.formatDateTime(now)}</div>
                </div>
                
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-number">${stock.length}</div>
                        <div>Toplam Ürün</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">${stock.reduce((sum, item) => sum + item.quantity, 0)}</div>
                        <div>Toplam Adet</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">${lowStock.length}</div>
                        <div>Az Stok</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">${stock.filter(item => item.quantity <= 5).length}</div>
                        <div>Kritik Stok</div>
                    </div>
                </div>

                <table class="stock-table">
                    <thead>
                        <tr>
                            <th>Ürün Kodu</th>
                            <th>Ürün Adı</th>
                            <th>Miktar</th>
                            <th>Min. Miktar</th>
                            <th>Durum</th>
                            <th>Son Güncelleme</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stock.map(item => {
                            const status = StockManager.getStockStatus(item);
                            const statusClass = StockManager.getStockStatusClass(status);
                            
                            return `
                                <tr>
                                    <td>${item.product_code || '-'}</td>
                                    <td>${item.product_name}</td>
                                    <td style="text-align: center;">${item.quantity}</td>
                                    <td style="text-align: center;">${item.min_quantity || '-'}</td>
                                    <td><span class="${statusClass}">${status}</span></td>
                                    <td>${Helpers.formatDate(item.updated_at || item.created_at)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                ${lowStock.length > 0 ? `
                    <div class="low-stock-section">
                        <h3>⚠️ DİKKAT: Az Stok Uyarısı</h3>
                        <p>Aşağıdaki ürünlerin stok seviyeleri minimum seviyenin altında veya kritik seviyede:</p>
                        <ul>
                            ${lowStock.map(item => `
                                <li><strong>${item.product_name}</strong> - Mevcut: ${item.quantity}, Minimum: ${item.min_quantity || 10}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
    }

    // Update printer settings
    updateSettings(newSettings) {
        this.printerSettings = { ...this.printerSettings, ...newSettings };
        this.saveSettings();
        
        const printerScaling = document.getElementById('printerScaling');
        const copiesNumber = document.getElementById('copiesNumber');
        
        if (printerScaling) printerScaling.value = this.printerSettings.scaling;
        if (copiesNumber) copiesNumber.value = this.printerSettings.copies;
        
        console.log('Printer settings updated:', this.printerSettings);
    }

    // Get printer settings
    getSettings() {
        return { ...this.printerSettings };
    }

    // Initialize printer manager
    init() {
        this.checkConnection();
        console.log('PrinterManager initialized');
    }
}

// Create global instance
window.PrinterManager = new PrinterManager();
