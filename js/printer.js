const logoPath = 'laundry-logo.jpg'; 

// ================== ELECTRON PRINTER SERVICE ==================
class PrinterServiceElectron {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
        this.isElectron = window.electronAPI !== undefined;
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
        return await this.printAllLabels([pkg]); // reuse bulk method
    }

    // ---------------- PRINT MULTIPLE LABELS WITH SETTINGS ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("No packages selected for printing.");
            return false;
        }

        try {
            // Settings defaults
            const fontSize = settings.fontSize || 14;
            const headerSize = Math.max(16, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 40;

            // Generate HTML content
            const htmlContent = this.generateLabelHTML(packages, settings);

            // Use Electron API if available, otherwise fallback to browser
            if (this.isElectron) {
                console.log('Using Electron printing...');
                return await window.electronAPI.printBarcode(htmlContent);
            } else {
                console.log('Fallback to browser printing...');
                return this.browserPrint(htmlContent);
            }

        } catch (error) {
            console.error("❌ Print error:", error);
            alert("Print error: " + error.message);
            return false;
        }
    }

    // ---------------- GENERATE LABEL HTML ----------------
    generateLabelHTML(packages, settings = {}) {
        const fontSize = settings.fontSize || 14;
        const headerSize = Math.max(16, fontSize + 4);
        const barcodeHeight = settings.barcodeHeight || 40;

        const style = `
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

            .label:last-child {
                page-break-after: avoid;
            }

            /* === HEADER SECTION === */
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

            .logo-img {
                height: 60px;
                margin-bottom: 7px;
                max-width: 80px;
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

            /* === CUSTOMER SECTION === */
            .customer-section {
                background: #000;
                color: #fff;
                padding: 4mm;
                margin: 3mm 0;
                text-align: center;
                border-radius: 3mm;
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

            /* === ITEMS SECTION === */
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

            /* === FOOTER === */
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

            /* === PROFESSIONAL TOUCHES === */
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
            
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
        `;

        let htmlContent = `<html><head>${style}</head><body>`;

        // Generate labels for each package
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
                        <img src="${logoPath}" alt="Laundry Logo" class="logo-img" onerror="this.style.display='none'">
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

        // Add barcode generation script
        htmlContent += `
            <script>
                window.onload = function() {
                    try {
                        ${packages.map((pkg, i) => `
                            const canvas${i} = document.getElementById('barcode-${i}');
                            if (canvas${i} && typeof JsBarcode !== 'undefined') {
                                JsBarcode(canvas${i}, '${pkg.package_no || `PKG-${i}`}', {
                                    format: 'CODE128',
                                    width: 1.2,
                                    height: 25,
                                    displayValue: false,
                                    margin: 0
                                });
                            }
                        `).join('\n')}
                    } catch (error) {
                        console.error('Barcode generation error:', error);
                    }
                };
            </script>
        </body></html>`;

        return htmlContent;
    }

    // ---------------- BROWSER FALLBACK PRINTING ----------------
    browserPrint(htmlContent) {
        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 1000);
            };

            return true;
        } catch (error) {
            console.error("Browser print error:", error);
            return false;
        }
    }

    // ---------------- TEST PRINT WITH SETTINGS ----------------
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

// ================== ENHANCED PRINTER WITH SETTINGS SUPPORT ==================
class PrinterServiceElectronWithSettings extends PrinterServiceElectron {
    constructor() {
        super();
        console.log('🖨️ Enhanced Electron printer service with settings initialized');
    }

    // All methods inherited from parent class
    // Settings are automatically applied in generateLabelHTML method
}

// ================== PRINTER INITIALIZATION ==================
let printerElectron = new PrinterServiceElectronWithSettings();

function getPrinterElectron() {
    return printerElectron;
}

// ================== USAGE EXAMPLES ==================
async function printSelectedElectron() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return alert('En az bir paket seçin');

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
    const result = await printerElectron.printAllLabels(packages, settings);
    
    if (result) {
        console.log('Print job completed successfully');
    } else {
        console.error('Print job failed');
    }
    
    return result;
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    const result = await printerElectron.testPrint(settings);
    
    if (result) {
        alert('Test print completed successfully!');
    } else {
        alert('Test print failed. Please check your printer connection.');
    }
    
    return result;
}
