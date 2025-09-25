const logoPath = 'laundry-logo.jpg';

// ================== ELECTRON PRINTER SERVICE ==================
class PrinterServiceElectron {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
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
        return await this.printAllLabels([pkg]);
    }

    // ---------------- ELECTRON PRINT FUNCTION ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("Yazdırılacak paket bulunamadı.");
            return false;
        }

        try {
            // Apply settings or use defaults
            const fontSize = settings.fontSize || 14;
            const headerSize = Math.max(16, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 40;

            // Generate HTML content for all labels
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Barkod Etiketleri</title>
                    <style>
                        @page { 
                            size: 150mm 115mm portrait;
                            margin: 0;
                        }
                        body { 
                            width: 150mm;
                            height: 115mm;
                            margin: 0;
                            padding: 0;
                            overflow: hidden;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: #fff;
                            color: #000;
                        }
                        .label {
                            width: 100%;
                            height: 100%;
                            box-sizing: border-box;
                            padding: 10mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            border: 4px solid #000;
                            position: relative;
                            page-break-after: always;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 5mm;
                            padding-bottom: 3mm;
                            border-bottom: 4px solid #000;
                        }
                        .company-info {
                            flex: 3;
                        }
                        .company-name {
                            font-size: 22px;
                            font-weight: 900;
                            color: #000;
                            letter-spacing: 1px;
                            margin: 0;
                            line-height: 1.1;
                        }
                        .company-subtitle {
                            font-size: 20px;
                            color: #666;
                            margin: 1mm 0 0 0;
                            font-weight: 500;
                            letter-spacing: 0.5px;
                        }
                        .barcode-section {
                            text-align: right;
                            flex-shrink: 0;
                        }
                        .barcode {
                            max-width: 40mm;
                            height: 20mm;
                        }
                        .barcode-text {
                            font-size: 17px;
                            font-weight: 700;
                            margin-top: 1mm;
                            color: #000;
                            font-family: 'Courier New', monospace;
                            letter-spacing: 0.5px;
                        }
                        .customer-section {
                            background: #000;
                            color: #fff;
                            padding: 4mm;
                            margin: 3mm 0;
                            text-align: center;
                            border-radius: 3mm;
                            box-shadow: 0 3px 5px rgba(0,0,0,0.2);
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .customer-name {
                            font-size: 22px;
                            font-weight: 700;
                            margin: 0;
                            line-height: 1.2;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .items-section {
                            flex: 1;
                            margin: 3mm 0;
                        }
                        .item-list {
                            background: #fff;
                            padding: 3mm;
                            border-radius: 2mm;
                            border: 1px solid #000;
                        }
                        .item {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 1.5mm 0;
                            border-bottom: 1px solid #000;
                            font-size: 22px;
                        }
                        .item:last-child {
                            border-bottom: none;
                        }
                        .item-name {
                            font-weight: 600;
                            color: #000;
                        }
                        .item-qty {
                            font-weight: 700;
                            color: #000;
                            background: #fff;
                            padding: 1mm 2mm;
                            border-radius: 2mm;
                            border: 1px solid #000;
                            font-size: 15px;
                            min-width: 15mm;
                            text-align: center;
                        }
                        .footer {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-top: auto;
                            padding-top: 3mm;
                            border-top: 2px solid #ddd;
                            font-size: 15px;
                            color: #666;
                        }
                        .date-info {
                            font-weight: 500;
                        }
                        .package-info {
                            font-weight: 700;
                            color: #000;
                            background: #f0f0f0;
                            padding: 1mm 3mm;
                            border-radius: 2mm;
                            border: 2px solid #ddd;
                        }
                        .label::before {
                            content: "";
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            height: 5px;
                            background: linear-gradient(90deg, #000 0%, #333 50%, #000 100%);
                        }
                        .label::after {
                            content: "";
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            height: 3px;
                            background: linear-gradient(90deg, #000 0%, #333 50%, #000 100%);
                        }
                    </style>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                </head>
                <body>
            `;

            // Generate label HTML for each package
            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
                const items = pkg.items || [pkg.product || 'Bilinmeyen Ürün'];

                htmlContent += `
                    <div class="label">
                        <!-- HEADER SECTION -->
                        <div class="header">
                            <div class="company-info">
                                <h1 class="company-name">YEDITEPE LAUNDRY</h1>
                                <p class="company-subtitle">Professional Laundry Services</p>
                            </div>
                            <div class="barcode-section">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
                        </div>

                        <!-- CUSTOMER SECTION -->
                        <div class="customer-section">
                            <h2 class="customer-name">${customerName}</h2>
                        </div>

                        <!-- ITEMS SECTION -->
                        <div class="items-section">
                            <div class="item-list">
                                ${items.map(item => {
                                    const name = item?.name || item;
                                    const qty = item?.qty != null ? item.qty : 1;
                                    return `<div class="item"><span class="item-name">${name}</span><span class="item-qty">${qty} AD</span></div>`;
                                }).join('')}
                            </div>
                        </div>

                        <!-- FOOTER -->
                        <div class="footer">
                            <span class="date-info">${date}</span>
                        </div>
                    </div>
                `;
            });

            htmlContent += `
                <script>
                    // Generate barcodes after page loads
                    document.addEventListener('DOMContentLoaded', function() {
                        ${packages.map((pkg, i) => `
                            try {
                                const canvas${i} = document.getElementById('barcode-${i}');
                                if (canvas${i}) {
                                    JsBarcode(canvas${i}, '${pkg.package_no || ''}', {
                                        format: 'CODE128',
                                        width: 1.2,
                                        height: 25,
                                        displayValue: false,
                                        margin: 0
                                    });
                                }
                            } catch (error) {
                                console.error('Barcode error ${i}:', error);
                            }
                        `).join('')}
                        
                        // Auto-print after barcodes are generated
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    });
                <\/script>
                </body>
                </html>
            `;

            // Send to Electron for printing
            if (window.electronAPI && window.electronAPI.printBarcode) {
                const success = await window.electronAPI.printBarcode(htmlContent);
                return success;
            } else {
                console.error('Electron API not available');
                return false;
            }

        } catch (error) {
            console.error("❌ Print error:", error);
            alert("Yazdırma hatası: " + error.message);
            return false;
        }
    }

    // ---------------- TEST PRINT ----------------
    async testPrint(settings = {}) {
        const testPackage = {
            package_no: 'TEST123456',
            customer_name: 'Test Müşteri',
            product: 'Test Ürün',
            created_at: new Date().toLocaleDateString('tr-TR')
        };
        return await this.printAllLabels([testPackage], settings);
    }
}

// ================== PRINTER INITIALIZATION ==================
let printerElectron = new PrinterServiceElectron();

function getPrinterElectron() {
    return printerElectron;
}

// ================== USAGE EXAMPLES ==================
async function printSelectedElectron() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('En az bir paket seçin');
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

    // Get saved settings
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    // Show loading state
    const printBtn = document.getElementById('printBarcodeBtn');
    if (printBtn) {
        const originalText = printBtn.innerHTML;
        printBtn.disabled = true;
        printBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yazdırılıyor...';
        
        try {
            await printerElectron.printAllLabels(packages, settings);
        } finally {
            printBtn.disabled = false;
            printBtn.innerHTML = originalText;
        }
    } else {
        await printerElectron.printAllLabels(packages, settings);
    }
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.testPrint(settings);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrinterServiceElectron, getPrinterElectron };
}
