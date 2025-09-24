// ================== FIXED PRINTER SERVICE FOR ELECTRON ==================
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
        return await this.printAllLabels([pkg]); // reuse bulk method
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

        // Settings defaults
        const fontSize = settings.fontSize || 14;
        const headerSize = Math.max(16, fontSize + 4);
        const barcodeHeight = settings.barcodeHeight || 40;

        // Shared CSS
        const style = `
            <style>
            @page { size: 100mm 110mm portrait; margin: 0; }
            body { width: 100mm; height: 110mm; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; overflow: hidden; }
            .label { width: 100%; height: 100%; box-sizing: border-box; padding: 4mm; display: flex; flex-direction: column; justify-content: flex-start; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4mm; font-size: ${headerSize}px; font-weight: bold; }
            .barcode-text { font-size: ${Math.max(8, fontSize-4)}px; font-weight: bold; margin-top: 1mm; }
            .hotel-name { background: #000; color: #fff; font-weight: bold; font-size: ${headerSize}px; text-align: center; padding: 2mm; margin-bottom: 4mm; }
            .item-list { width: 100%; margin-bottom: 4mm; font-size: ${fontSize}px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2mm 0; }
            .item { display: flex; justify-content: space-between; padding: 1mm 0; }
            .footer { display: flex; justify-content: space-between; font-size: ${Math.max(10, fontSize-2)}px; margin-top: auto; }
            </style>
        `;

        printWindow.document.write(`<html><head>${style}</head><body>`);

        // Loop through packages to write HTML
        packages.forEach((pkg, i) => {
            const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
            const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
            const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
            const items = pkg.items || [pkg.product || 'Bilinmeyen Ürün'];

            printWindow.document.write(`
                <div class="label">
                    <!-- HEADER -->
                    <div class="header">
                        <div>${customerName}</div>
                        <div>
                            <canvas id="barcode-${i}" class="barcode"></canvas>
                            <div class="barcode-text">${packageNo}</div>
                        </div>
                    </div>

                    <!-- HOTEL NAME -->
                    <div class="hotel-name">${customerName}</div>

                    <!-- ITEM LIST -->
                    <div class="item-list">
                        ${items.map(item => `
                            <div class="item">
                                <span>${item.name || item}</span>
                                <span>${item.qty || '1'}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- FOOTER -->
                    <div class="footer">
                        <span>${date}</span>
                        <span>Paket ${i + 1}</span>
                    </div>
                </div>
            `);
        });

        printWindow.document.write("</body></html>");
        printWindow.document.close();

        // Generate barcodes and trigger print
        printWindow.onload = () => {
            packages.forEach((pkg, i) => {
                const canvas = printWindow.document.getElementById(`barcode-${i}`);
                if (canvas) {
                    try {
                        JsBarcode(canvas, pkg.package_no || `PKG-${i}`, {
                            format: 'CODE128',
                            width: 1.8,
                            height: barcodeHeight,
                            displayValue: false,
                            margin: 0,
                            fontSize: Math.max(8, fontSize-4)
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




// ================== ENHANCED PRINTER WITH SETTINGS SUPPORT ==================
class PrinterServiceElectronWithSettings extends PrinterServiceElectron {
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("No packages selected for printing.");
            return false;
        }

        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

            // Apply settings or use defaults
            const fontSize = settings.fontSize || 14;
            const headerSize = Math.max(16, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 40;
            const margin = settings.margin || 2;

            const style = `
                <style>
                @page {
                    size: 100mm 80mm portrait;
                    margin: 0;
                }

                body {
                    width: 100mm;
                    height: 80mm;
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
                    padding: 12mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border: 6px solid #000;
                    position: relative;
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
                    font-size: 18px;
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
                    max-width: 45mm;
                    height: 20mm;
                }

                .barcode-text {
                    font-size: 16px;
                    font-weight: 700;
                    margin-top: 1mm;
                    color: #000;
                    font-family: 'Courier New', monospace;
                    letter-spacing: 0.5px;
                }

                /* === CUSTOMER SECTION === */
               .customer-section {
    background: #000; /* solid black for printing */
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

                /* === ITEMS SECTION === */
                .items-section {
                    flex: 3;
                    margin: 3mm 0;
                }

                .item-list {
                    background: #f8f9fa;
                    padding: 3mm;
                    border-radius: 2mm;
                    border: 5px solid #e9ecef;
                }

                .item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5mm 0;
                    border-bottom: 2px dotted #ccc;
                    font-size: 17px;
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
                    padding: 1mm 2mm;
                    border-radius: 2mm;
                    border: 4px solid #ddd;
                    font-size: 17px;
                    min-width: 20mm;
                    text-align: center;
                }

                /* === FOOTER === */
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: auto;
                    padding-top: 3mm;
                    border-top: 4px solid #ddd;
                    font-size: 18px;
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
                    border: 4px solid #ddd;
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
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            // FIXED: Loop through packages to write HTML (moved the template inside forEach)
            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
                const items = pkg.items || [pkg.product || 'Bilinmeyen Ürün'];

                printWindow.document.write(`
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
                                ${items.map((item, idx) => `
                                    <div class="item">
                                        <span class="item-name">${item.name || item}</span>
                                        <span class="item-qty">${item.qty || '1 AD'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- FOOTER -->
                        <div class="footer">
                            <span class="date-info">${date}</span>
                            <span class="package-info">PAKET #${i + 1}</span>
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
                                height: 25,
                                displayValue: false,
                                margin: 0,
                                fontSize: Math.max(8, fontSize - 4)
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

    // Test print with settings
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

    // Get saved settings
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.printAllLabels(packages, settings);
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.testPrint(settings);
}
