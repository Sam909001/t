// ================== PRINTER SERVICE FOR ELECTRON ==================
class PrinterServiceElectron {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
        this.printQueue = [];
        this.isPrinting = false;
    }

    // ---------------- TEST PRINT ----------------
    async testPrint() {
        const testPackage = {
            package_no: 'TEST123456ÇŞĞİÖÜ',
            customer_name: 'Test Müşteri - ÇŞĞİÖÜ',
            product: 'Test Ürün - çşğıöü',
            created_at: new Date().toLocaleDateString('tr-TR')
        };
        return await this.printLabel(testPackage);
    }

    // ---------------- PRINT SINGLE LABEL ----------------
    async printLabel(pkg) {
        try {
            // Create a temporary window for printing
            const printWindow = window.open('', '_blank', 'width=400,height=400');
            if (!printWindow) {
                throw new Error('Popup blocked. Please allow popups for printing.');
            }

            const style = `
                <style>
                    @media print {
                        body { margin: 0; padding: 0; }
                        .label-container { 
                            display: grid; 
                            grid-template-columns: repeat(2, 1fr); 
                            gap: 2mm; 
                            padding: 5mm;
                            width: 210mm; /* A4 width */
                        }
                        .label { 
                            width: 100mm; 
                            height: 80mm; 
                            border: 1px solid #000; 
                            padding: 3mm; 
                            box-sizing: border-box; 
                            page-break-inside: avoid;
                        }
                        .header { font-weight: bold; font-size: 12px; text-align: center; margin-bottom: 3px; }
                        .info { font-size: 10px; margin-bottom: 2px; text-align: left; }
                        .barcode { display: block; margin: 2px auto; }
                        .barcode-text { text-align: center; font-size: 8px; margin-top: 1px; }
                    }
                    @media screen {
                        .label-container { display: block; }
                        .label { margin: 10px; }
                    }
                </style>
            `;

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Labels</title>
                    ${style}
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                </head>
                <body>
                    <div class="label-container">
                        <div class="label">
                            <div class="header">YEDITEPE LAUNDRY</div>
                            <div class="info"><strong>Müşteri:</strong> ${this.escapeHtml(pkg.customer_name || '')}</div>
                            <div class="info"><strong>Ürün:</strong> ${this.escapeHtml(pkg.product || '')}</div>
                            <div class="info"><strong>Tarih:</strong> ${this.escapeHtml(pkg.created_at || '')}</div>
                            <canvas id="barcodeCanvas" class="barcode"></canvas>
                            <div class="barcode-text">${this.escapeHtml(pkg.package_no || '')}</div>
                        </div>
                    </div>
                    <script>
                        // Generate barcode when page loads
                        window.onload = function() {
                            try {
                                JsBarcode('#barcodeCanvas', '${this.escapeHtml(pkg.package_no || '')}', {
                                    format: 'CODE128',
                                    width: 2,
                                    height: 25,
                                    displayValue: false,
                                    margin: 0
                                });
                                
                                // Auto-print after a short delay
                                setTimeout(() => {
                                    window.print();
                                    setTimeout(() => {
                                        window.close();
                                    }, 500);
                                }, 300);
                            } catch(error) {
                                console.error('Barcode error:', error);
                                window.print();
                                setTimeout(() => window.close(), 500);
                            }
                        };
                    <\/script>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            console.log('✅ Label sent to printer:', pkg.package_no);
            return true;
        } catch (error) {
            console.error('❌ Electron print error:', error);
            showAlert(`Yazdırma hatası: ${error.message}`, 'error');
            return false;
        }
    }

    // ---------------- PRINT MULTIPLE LABELS SIMULTANEOUSLY ----------------
    async printMultipleLabels(packages, labelsPerPage = 2) {
        try {
            if (!packages || packages.length === 0) {
                throw new Error('Yazdırılacak paket bulunamadı');
            }

            // Create a temporary window for printing
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                throw new Error('Popup blocked. Please allow popups for printing.');
            }

            const style = `
                <style>
                    @media print {
                        body { margin: 0; padding: 0; }
                        .label-container { 
                            display: grid; 
                            grid-template-columns: repeat(${labelsPerPage}, 1fr); 
                            gap: 2mm; 
                            padding: 5mm;
                            width: 210mm; /* A4 width */
                        }
                        .label { 
                            width: ${labelsPerPage === 2 ? '100mm' : '70mm'}; 
                            height: 80mm; 
                            border: 1px solid #000; 
                            padding: 3mm; 
                            box-sizing: border-box; 
                            page-break-inside: avoid;
                            font-family: Arial, sans-serif;
                        }
                        .header { font-weight: bold; font-size: 12px; text-align: center; margin-bottom: 3px; }
                        .info { font-size: 10px; margin-bottom: 2px; text-align: left; }
                        .barcode { display: block; margin: 2px auto; }
                        .barcode-text { text-align: center; font-size: 8px; margin-top: 1px; }
                        .page-break { page-break-after: always; }
                    }
                    @media screen {
                        .label-container { display: block; }
                        .label { margin: 10px; display: inline-block; }
                    }
                </style>
            `;

            let labelsHTML = '';
            packages.forEach((pkg, index) => {
                if (index > 0 && index % (labelsPerPage * 3) === 0) {
                    labelsHTML += '<div class="page-break"></div>';
                }
                
                labelsHTML += `
                    <div class="label">
                        <div class="header">YEDITEPE LAUNDRY</div>
                        <div class="info"><strong>Paket No:</strong> ${this.escapeHtml(pkg.package_no || '')}</div>
                        <div class="info"><strong>Müşteri:</strong> ${this.escapeHtml(pkg.customer_name || '')}</div>
                        <div class="info"><strong>Ürün:</strong> ${this.escapeHtml(pkg.product || '')}</div>
                        <div class="info"><strong>Tarih:</strong> ${this.escapeHtml(pkg.created_at || '')}</div>
                        <canvas id="barcodeCanvas${index}" class="barcode"></canvas>
                        <div class="barcode-text">${this.escapeHtml(pkg.package_no || '')}</div>
                    </div>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Multiple Labels</title>
                    ${style}
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                </head>
                <body>
                    <div class="label-container">
                        ${labelsHTML}
                    </div>
                    <script>
                        // Generate barcodes when page loads
                        window.onload = function() {
                            const packages = ${JSON.stringify(packages)};
                            
                            packages.forEach((pkg, index) => {
                                try {
                                    JsBarcode('#barcodeCanvas' + index, '${this.escapeHtml(pkg.package_no || '')}', {
                                        format: 'CODE128',
                                        width: 2,
                                        height: 20,
                                        displayValue: false,
                                        margin: 0
                                    });
                                } catch(error) {
                                    console.error('Barcode error for package ' + index + ':', error);
                                }
                            });
                            
                            // Auto-print after a short delay
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => {
                                    window.close();
                                }, 1000);
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            console.log(`✅ ${packages.length} labels sent to printer simultaneously`);
            showAlert(`${packages.length} etiket yazdırılıyor...`, 'success');
            return true;
        } catch (error) {
            console.error('❌ Multiple labels print error:', error);
            showAlert(`Çoklu yazdırma hatası: ${error.message}`, 'error');
            return false;
        }
    }

    // ---------------- PRINT ALL LABELS (BATCH) ----------------
    async printAllLabels(packages, labelsPerPage = 2) {
        if (!packages || packages.length === 0) {
            showAlert('Yazdırılacak paket bulunamadı', 'error');
            return { successCount: 0, errorCount: 0 };
        }

        // Ask user how many labels per page
        const userChoice = prompt(`Kaç etiket bir sayfada yazdırılsın?\n(2: Büyük etiket, 3: Küçük etiket)`, '2');
        const selectedPerPage = userChoice === '3' ? 3 : 2;

        showAlert(`${packages.length} etiket hazırlanıyor...`, 'info');

        try {
            const result = await this.printMultipleLabels(packages, selectedPerPage);
            if (result) {
                return { successCount: packages.length, errorCount: 0 };
            } else {
                return { successCount: 0, errorCount: packages.length };
            }
        } catch (error) {
            console.error('Batch print error:', error);
            return { successCount: 0, errorCount: packages.length };
        }
    }

    // ---------------- UTILITY FUNCTIONS ----------------
    escapeHtml(text) {
        if (typeof text !== 'string') return String(text);
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---------------- PRINTER STATUS ----------------
    async checkPrinterStatus() {
        return new Promise((resolve) => {
            // Simulate printer check
            setTimeout(() => {
                resolve({
                    connected: this.isConnected,
                    status: 'ready',
                    name: 'Electron Printer'
                });
            }, 100);
        });
    }
}

// ================== PRINTER INITIALIZATION ==================
let printerElectron = new PrinterServiceElectron();

function getPrinterElectron() {
    return printerElectron;
}

// ================== BUTTON EVENT HANDLERS ==================

// Test Printer Button
document.addEventListener('DOMContentLoaded', function() {
    // Test Printer Button
    const testPrinterBtn = document.getElementById('test-printer');
    if (testPrinterBtn) {
        testPrinterBtn.addEventListener('click', async function() {
            showAlert('Yazıcı test ediliyor...', 'info');
            const result = await printerElectron.testPrint();
            if (result) {
                showAlert('Yazıcı testi başarılı!', 'success');
            } else {
                showAlert('Yazıcı testi başarısız!', 'error');
            }
        });
    }

    // Test Yazdır Button
    const testYazdirBtn = document.getElementById('test-printer-yazdir');
    if (testYazdirBtn) {
        testYazdirBtn.addEventListener('click', async function() {
            showAlert('Test etiketleri yazdırılıyor...', 'info');
            
            // Create multiple test packages
            const testPackages = [
                {
                    package_no: 'TEST001-ÇŞĞİÖÜ',
                    customer_name: 'Test Müşteri 1',
                    product: 'Test Ürün - çşğıöü',
                    created_at: new Date().toLocaleDateString('tr-TR')
                },
                {
                    package_no: 'TEST002-ÇŞĞİÖÜ',
                    customer_name: 'Test Müşteri 2',
                    product: 'Test Ürün - çşğıöü',
                    created_at: new Date().toLocaleDateString('tr-TR')
                },
                {
                    package_no: 'TEST003-ÇŞĞİÖÜ',
                    customer_name: 'Test Müşteri 3',
                    product: 'Test Ürün - çşğıöü',
                    created_at: new Date().toLocaleDateString('tr-TR')
                }
            ];

            const result = await printerElectron.printMultipleLabels(testPackages, 2);
            if (result) {
                showAlert('Test etiketleri başarıyla yazdırıldı!', 'success');
            } else {
                showAlert('Test etiketleri yazdırılamadı!', 'error');
            }
        });
    }

    // Print Selected Packages Button
    const printSelectedBtn = document.getElementById('print-selected-btn');
    if (printSelectedBtn) {
        printSelectedBtn.addEventListener('click', printSelectedElectron);
    }
});

// ================== PRINT SELECTED PACKAGES FUNCTION ==================
async function printSelectedElectron() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        showAlert('Lütfen yazdırılacak paketleri seçin', 'warning');
        return;
    }

    const packages = Array.from(checkboxes).map((checkbox, i) => {
        const row = checkbox.closest('tr');
        return {
            package_no: row.cells[1]?.textContent?.trim() || `PKG-${Date.now()}-${i}`,
            customer_name: row.cells[2]?.textContent?.trim() || 'Bilinmeyen Müşteri',
            product: row.cells[3]?.textContent?.trim() || 'Bilinmeyen Ürün',
            created_at: row.cells[4]?.textContent?.trim() || new Date().toLocaleDateString('tr-TR')
        };
    });

    showAlert(`${packages.length} paket yazdırılıyor...`, 'info');
    
    const result = await printerElectron.printAllLabels(packages);
    
    if (result.successCount > 0) {
        showAlert(`${result.successCount} etiket başarıyla yazdırıldı`, 'success');
    }
    
    if (result.errorCount > 0) {
        showAlert(`${result.errorCount} etiket yazdırılamadı`, 'error');
    }
}

// ================== QUICK PRINT FUNCTION ==================
async function quickPrintPackage(packageData) {
    if (!packageData) {
        showAlert('Paket verisi bulunamadı', 'error');
        return false;
    }

    showAlert('Paket etiketi yazdırılıyor...', 'info');
    const result = await printerElectron.printLabel(packageData);
    
    if (result) {
        showAlert('Etiket yazdırıldı', 'success');
    } else {
        showAlert('Etiket yazdırılamadı', 'error');
    }
    
    return result;
}

// ================== GLOBAL EXPORTS (for Electron) ==================
if (typeof window !== 'undefined') {
    window.PrinterServiceElectron = PrinterServiceElectron;
    window.getPrinterElectron = getPrinterElectron;
    window.printSelectedElectron = printSelectedElectron;
    window.quickPrintPackage = quickPrintPackage;
}
