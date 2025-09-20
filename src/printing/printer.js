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
                            <strong>Kod:</strong>
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
                    </div>
                    
                    <div class="barcode-section">
                        <div class="small-text">Barkod</div>
                        <div class="barcode" id="barcode-display">${barcodeData}</div>
                    </div>
                </div>
                
                <script>
                    // Auto-print when loaded
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

    // Print HTML content
    printHTML(htmlContent) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }

    // Print multiple labels
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

            const loading = NotificationManager.showLoading(`${packages.length} etiket hazırlanıyor...`);

            // Generate all labels HTML
            let allLabelsHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Toplu Etiket Yazdırma</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                        }
                        .page-break {
                            page-break-after: always;
                        }
                        .label {
                            width: 8cm;
                            height: 6cm;
                            border: 2px solid #000;
                            padding: 0.3cm;
                            margin: 0.5cm;
                            display: inline-block;
                            vertical-align: top;
                            box-sizing: border-box;
                            font-size: 11px;
                            line-height: 1.2;
                        }
                        .header {
                            text-align: center;
                            border-bottom: 1px solid #000;
                            padding-bottom: 0.2cm;
                            margin-bottom: 0.2cm;
                        }
                        .company-name {
                            font-size: 14px;
                            font-weight: bold;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 0.1cm;
                        }
                        .barcode-section {
                            text-align: center;
                            margin-top: 0.3cm;
                            padding-top: 0.2cm;
                            border-top: 1px solid #000;
                        }
                        .barcode {
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            font-weight: bold;
                            letter-spacing: 1px;
                        }
                        .small-text {
                            font-size: 9px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
            `;

            for (let i = 0; i < packages.length; i++) {
                const pkg = packages[i];
                const customer = await CustomerManager.getCustomer(pkg.customer_id);
                
                if (customer) {
                    allLabelsHTML += `
                        <div class="label">
                            <div class="header">
                                <div class="company-name">ProClean</div>
                                <div class="small-text">Profesyonel Çamaşırhane</div>
                            </div>
                            
                            <div class="info-row">
                                <strong>Müşteri:</strong>
                                <span>${customer.name}</span>
                            </div>
                            <div class="info-row">
                                <strong>Kod:</strong>
                                <span>${customer.code}</span>
                            </div>
                            <div class="info-row">
                                <strong>Ürün:</strong>
                                <span>${pkg.product_name}</span>
                            </div>
                            <div class="info-row">
                                <strong>Adet:</strong>
                                <span>${pkg.quantity}</span>
                            </div>
                            <div class="info-row">
                                <strong>Tarih:</strong>
                                <span>${Helpers.formatDate(new Date())}</span>
                            </div>
                            
                            <div class="barcode-section">
                                <div class="small-text">Barkod</div>
                                <div class="barcode">${pkg.barcode}</div>
                            </div>
                        </div>
                    `;
                }

                // Add page break every 6 labels
                if ((i + 1) % 6 === 0 && i < packages.length - 1) {
                    allLabelsHTML += '<div class="page-break"></div>';
                }
            }

            allLabelsHTML += `
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 1000);
                        };
                    </script>
                </body>
                </html>
            `;

            NotificationManager.hideLoading();
            this.printHTML(allLabelsHTML);
            
            NotificationManager.showAlert(`${packages.length} etiket yazdırılıyor...`, 'success');
            return true;
        } catch (error) {
            NotificationManager.hideLoading();
            console.error('Error printing multiple labels:', error);
            NotificationManager.showAlert('Toplu etiket yazdırma hatası: ' + error.message, 'error');
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
            const customerSummaries = await Promise.all(
                Object.entries(packagesByCustomer).map(async ([customerId, customerPackages]) => {
                    const customer = await CustomerManager.getCustomer(customerId);
                    return {
                        customer: customer || { name: 'Bilinmeyen', code: '-' },
                        packages: customerPackages,
                        totalQuantity: customerPackages.reduce((sum, pkg) => sum + pkg.quantity, 0)
                    };
                })
            );

            const summaryHTML = this.generateContainerSummaryHTML(container, customerSummaries);
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
    generateContainerSummaryHTML(container, customerSummaries) {
        const totalPackages = customerSummaries.reduce((sum, cs) => sum + cs.packages.length, 0);
        const totalQuantity = customerSummaries.reduce((sum, cs) => sum + cs.totalQuantity, 0);

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
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #000;
                        padding-bottom: 1cm;
                        margin-bottom: 1cm;
                    }
                    .company-name {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 0.5cm;
                    }
                    .document-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 0.3cm;
                    }
                    .container-info {
                        background: #f5f5f5;
                        padding: 1cm;
                        margin-bottom: 1cm;
                        border-radius: 5px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0.5cm;
                    }
                    .summary-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 1cm;
                    }
                    .summary-table th,
                    .summary-table td {
                        border: 1px solid #ddd;
                        padding: 0.3cm;
                        text-align: left;
                    }
                    .summary-table th {
                        background: #f0f0f0;
                        font-weight: bold;
                    }
                    .total-row {
                        font-weight: bold;
                        background: #e8f4fd;
                    }
                    .footer {
                        position: fixed;
                        bottom: 2cm;
                        left: 2cm;
                        right: 2cm;
                        text-align: center;
                        border-top: 1px solid #ccc;
                        padding-top: 0.5cm;
                        font-size: 10px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">ProClean</div>
                    <div>Profesyonel Çamaşırhane Yönetim Sistemi</div>
                    <div class="document-title">Konteyner Sevkiyat Özeti</div>
                </div>

                <div class="container-info">
                    <div class="info-grid">
                        <div>
                            <strong>Konteyner No:</strong> ${container.container_number}<br>
                            <strong>Oluşturulma:</strong> ${Helpers.formatDateTime(container.created_at)}<br>
                            <strong>Kapanma:</strong> ${Helpers.formatDateTime(container.closed_at || new Date())}
                        </div>
                        <div>
                            <strong>Toplam Paket:</strong> ${totalPackages}<br>
                            <strong>Toplam Adet:</strong> ${totalQuantity}<br>
                            <strong>Müşteri Sayısı:</strong> ${customerSummaries.length}
                        </div>
                    </div>
                </div>

                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Müşteri</th>
                            <th>Müşteri Kodu</th>
                            <th>Paket Sayısı</th>
                            <th>Toplam Adet</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerSummaries.map(cs => `
                            <tr>
                                <td>${cs.customer.name}</td>
                                <td>${cs.customer.code}</td>
                                <td>${cs.packages.length}</td>
                                <td>${cs.totalQuantity}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2"><strong>TOPLAM</strong></td>
                            <td><strong>${totalPackages}</strong></td>
                            <td><strong>${totalQuantity}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    ProClean © ${new Date().getFullYear()} | Yazdırılma: ${Helpers.formatDateTime(new Date())}
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 1000);
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
        
        NotificationManager.showAlert('Yazıcı ayarları güncellendi', 'success');
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
