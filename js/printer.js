// ================== PORTRAIT PRINTER SERVICE FOR ELECTRON ==================
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

    // ---------------- PRINT MULTIPLE LABELS WITH SETTINGS ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("No packages selected for printing.");
            return false;
        }

        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

            // Settings defaults for PORTRAIT
            const fontSize = settings.fontSize || 12;
            const headerSize = Math.max(14, fontSize + 2);
            const barcodeHeight = settings.barcodeHeight || 30;

            // PORTRAIT CSS
            const style = `
                <style>
                @page { 
                    size: 100mm 80mm portrait;  /* PORTRAIT: Taller than wide */
                    margin: 0; 
                }
                
                body { 
                    width: 100mm;     /* Narrow width for portrait */
                    height: 80mm;   /* Tall height for portrait */
                    margin: 0; 
                    padding: 0; 
                    font-family: Arial, Helvetica, sans-serif; 
                    overflow: hidden; 
                }
                
                .label { 
                    width: 100%; 
                    height: 100%; 
                    box-sizing: border-box; 
                    padding: 3mm;
                    display: flex; 
                    flex-direction: column; 
                    justify-content: space-between;
                }
                
                /* HEADER - Stacked vertically */
                .header { 
                    text-align: center; 
                    margin-bottom: 2mm; 
                }
                
                .company-name { 
                    font-size: ${headerSize}px; 
                    font-weight: bold; 
                    margin: 0 0 1mm 0;
                }
                
                .barcode-section { 
                    text-align: center; 
                    margin: 2mm 0; 
                }
                
                .barcode-text { 
                    font-size: ${Math.max(8, fontSize-2)}px; 
                    font-weight: bold; 
                    margin-top: 1mm; 
                }
                
                /* CUSTOMER SECTION - Full width */
                .customer-section {
                    background: #000;
                    color: #fff;
                    padding: 3mm;
                    margin: 2mm 0;
                    text-align: center;
                    border-radius: 2mm;
                    -webkit-print-color-adjust: exact;
                }
                
                .customer-name {
                    font-size: ${headerSize}px;
                    font-weight: bold;
                    margin: 0;
                }
                
                /* ITEMS SECTION - Vertical list */
                .items-section {
                    flex: 1;
                    margin: 2mm 0;
                }
                
                .item-list {
                    border: 3px solid #000;
                    padding: 2mm;
                    border-radius: 2mm;
                }
                
                .item {
                    display: flex;
                    justify-content: space-between;
                    padding: 1mm 0;
                    border-bottom: 1px dotted #ccc;
                    font-size: ${fontSize}px;
                }
                
                .item:last-child {
                    border-bottom: none;
                }
                
                /* FOOTER - Stacked vertically */
                .footer {
                    text-align: center;
                    margin-top: 2mm;
                    padding-top: 2mm;
                    border-top: 1px solid #000;
                    font-size: ${Math.max(10, fontSize-2)}px;
                }
                
                .footer-info {
                    margin: 1mm 0;
                }
                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
                const items = pkg.items || [pkg.product || 'Bilinmeyen Ürün'];

                printWindow.document.write(`
                    <div class="label">
                        <!-- HEADER - VERTICAL STACK -->
                        <div class="header">
                            <div class="company-name">YEDITEPE LAUNDRY</div>
                            <div class="barcode-section">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
                        </div>

                        <!-- CUSTOMER SECTION -->
                        <div class="customer-section">
                            <div class="customer-name">${customerName}</div>
                        </div>

                        <!-- ITEMS SECTION - VERTICAL LIST -->
                        <div class="items-section">
                            <div class="item-list">
                                ${items.map((item, idx) => `
                                    <div class="item">
                                        <span>${item.name || item}</span>
                                        <span>${item.qty || '1'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- FOOTER - VERTICAL STACK -->
                        <div class="footer">
                            <div class="footer-info">${date}</div>
                            <div class="footer-info">Paket No: ${packageNo}</div>
                        </div>
                    </div>
                `);
            });

            printWindow.document.write("</body></html>");
            printWindow.document.close();

            // Generate barcodes
            printWindow.onload = () => {
                packages.forEach((pkg, i) => {
                    const canvas = printWindow.document.getElementById(`barcode-${i}`);
                    if (canvas) {
                        try {
                            JsBarcode(canvas, pkg.package_no || `PKG-${i}`, {
                                format: 'CODE128',
                                width: 1.5,
                                height: barcodeHeight,
                                displayValue: false,
                                margin: 0
                            });
                        } catch (err) {
                            console.error('Barcode generation error:', err);
                        }
                    }
                });

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 500);
            };

            return true;
        } catch (error) {
            console.error("❌ Bulk print error:", error);
            alert("Bulk print error: " + error.message);
            return false;
        }
    }

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

// ================== ENHANCED PORTRAIT PRINTER ==================
class PrinterServiceElectronWithSettings extends PrinterServiceElectron {
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("No packages selected for printing.");
            return false;
        }

        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

            // PORTRAIT settings
            const fontSize = settings.fontSize || 12;
            const headerSize = Math.max(16, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 35;

            const style = `
                <style>
                @page {
                    size: 80mm 120mm portrait;  /* PORTRAIT: Tall and narrow */
                    margin: 0;
                }

                body {
                    width: 80mm;      /* Narrow for portrait */
                    height: 120mm;    /* Tall for portrait */
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
                    padding: 4mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border: 2px solid #000;
                    position: relative;
                }

                /* === HEADER SECTION - VERTICAL STACK === */
                .header {
                    text-align: center;
                    margin-bottom: 3mm;
                    padding-bottom: 2mm;
                    border-bottom: 2px solid #000;
                }

                .company-name {
                    font-size: ${headerSize}px;
                    font-weight: 900;
                    color: #000;
                    margin: 0 0 1mm 0;
                    line-height: 1.1;
                }

                .company-subtitle {
                    font-size: ${Math.max(10, fontSize-2)}px;
                    color: #666;
                    margin: 0;
                }

                .barcode-section {
                    margin: 3mm 0;
                }

                .barcode {
                    max-width: 60mm;
                    height: auto;
                }

                .barcode-text {
                    font-size: ${Math.max(10, fontSize-2)}px;
                    font-weight: 700;
                    margin-top: 1mm;
                    color: #000;
                    font-family: 'Courier New', monospace;
                }

                /* === CUSTOMER SECTION === */
                .customer-section {
                    background: #000;
                    color: #fff;
                    padding: 3mm;
                    margin: 2mm 0;
                    text-align: center;
                    border-radius: 2mm;
                    -webkit-print-color-adjust: exact;
                }

                .customer-name {
                    font-size: ${headerSize}px;
                    font-weight: 700;
                    margin: 0;
                    line-height: 1.2;
                }

                /* === ITEMS SECTION - VERTICAL LIST === */
                .items-section {
                    flex: 1;
                    margin: 2mm 0;
                }

                .item-list {
                    background: #f8f9fa;
                    padding: 2mm;
                    border-radius: 2mm;
                    border: 1px solid #e9ecef;
                }

                .item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1mm 0;
                    border-bottom: 1px dotted #ccc;
                    font-size: ${fontSize}px;
                }

                .item:last-child {
                    border-bottom: none;
                }

                .item-name {
                    font-weight: 600;
                    color: #333;
                }

                .item-qty {
                    font-weight: 700;
                    color: #000;
                    background: #fff;
                    padding: 0.5mm 1.5mm;
                    border-radius: 1mm;
                    border: 1px solid #ddd;
                    min-width: 12mm;
                    text-align: center;
                }

                /* === FOOTER - VERTICAL STACK === */
                .footer {
                    text-align: center;
                    margin-top: 2mm;
                    padding-top: 2mm;
                    border-top: 1px solid #ddd;
                    font-size: ${Math.max(10, fontSize-2)}px;
                    color: #666;
                }

                .footer-info {
                    margin: 0.5mm 0;
                }

                .package-info {
                    font-weight: 700;
                    color: #000;
                }

                /* === PORTRAIT-SPECIFIC STYLING === */
                .label::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: #000;
                }

                .label::after {
                    content: "";
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: #000;
                }

                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
                const items = pkg.items || [pkg.product || 'Bilinmeyen Ürün'];

                printWindow.document.write(`
                    <div class="label">
                        <!-- HEADER SECTION - VERTICAL -->
                        <div class="header">
                            <h1 class="company-name">YEDITEPE LAUNDRY</h1>
                            <p class="company-subtitle">Professional Laundry Services</p>
                            <div class="barcode-section">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
                        </div>

                        <!-- CUSTOMER SECTION -->
                        <div class="customer-section">
                            <h2 class="customer-name">${customerName}</h2>
                        </div>

                        <!-- ITEMS SECTION - VERTICAL -->
                        <div class="items-section">
                            <div class="item-list">
                                ${items.map((item, idx) => `
                                    <div class="item">
                                        <span class="item-name">${item.name || item}</span>
                                        <span class="item-qty">${item.qty || '1'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- FOOTER - VERTICAL -->
                        <div class="footer">
                            <div class="footer-info">${date}</div>
                            <div class="footer-info package-info">PAKET #${i + 1}</div>
                        </div>
                    </div>
                `);
            });

            printWindow.document.write("</body></html>");
            printWindow.document.close();

            printWindow.onload = () => {
                packages.forEach((pkg, i) => {
                    const canvas = printWindow.document.getElementById(`barcode-${i}`);
                    if (canvas) {
                        try {
                            JsBarcode(canvas, pkg.package_no || '', {
                                format: 'CODE128',
                                width: 1.2,
                                height: barcodeHeight,
                                displayValue: false,
                                margin: 0
                            });
                        } catch (error) {
                            console.error('Barcode generation error:', error);
                        }
                    }
                });

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 500);
            };

            return true;
        } catch (error) {
            console.error("❌ Bulk print error:", error);
            alert("Bulk print error: " + error.message);
            return false;
        }
    }

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

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.printAllLabels(packages, settings);
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.testPrint(settings);
}
