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

        // Shared CSS - Updated to 10cm width × 8cm height portrait
        const style = `
            <style>
            @page { size: 100mm 80mm portrait; margin: 0; }
            body { width: 100mm; height: 80mm; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; overflow: hidden; }
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

            // Updated CSS for 10cm width × 8cm height portrait
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
                    padding: 4mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border: 4px solid #000;
                    position: relative;
                }

                /* === HEADER SECTION === */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 3mm;
                    padding-bottom: 2mm;
                    border-bottom: 3px solid #000;
                }

                .company-info {
                    flex: 3;
                }

                .company-name {
                    font-size: 18px;
                    font-weight: 900;
                    color: #000;
                    letter-spacing: 1px;
                    margin: 0;
                    line-height: 1.1;
                }

                .company-subtitle {
                    font-size: 12px;
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
                    max-width: 25mm;
                    height: auto;
                }

                .barcode-text {
                    font-size: 11px;
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
                    padding: 2mm;
                    margin: 2mm 0;
                    text-align: center;
                    border-radius: 2mm;
                    box-shadow: 0 2px 3px rgba(0,0,0,0.2);
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .customer-name {
                    font-size: 16px;
                    font-weight: 700;
                    margin: 0;
                    line-height: 1.2;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* === ITEMS SECTION === */
                .items-section {
                    flex: 1;
                    margin: 2mm 0;
                }

                .item-list {
                    background: #f8f9fa;
                    padding: 2mm;
                    border-radius: 2mm;
                    border: 2px solid #e9ecef;
                }

                .item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1mm 0;
                    border-bottom: 1px dotted #ccc;
                    font-size: 13px;
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
                    border: 1px solid #ddd;
                    font-size: 12px;
                    min-width: 12mm;
                    text-align: center;
                }

                /* === FOOTER === */
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: auto;
                    padding-top: 2mm;
                    border-top: 2px solid #ddd;
                    font-size: 12px;
                    color: #666;
                }

                .date-info {
                    font-weight: 500;
                }

                .package-info {
                    font-weight: 700;
                    color: #000;
                    background: #f0f0f0;
                    padding: 1mm 2mm;
                    border-radius: 2mm;
                    border: 1px solid #ddd;
                }

                /* === PROFESSIONAL TOUCHES === */
                .label::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #000 0%, #333 50%, #000 100%);
                }

                .label::after {
                    content: "";
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #000 0%, #333 50%, #000 100%);
                }
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
                            <div class="company-info">
                                <div class="company-name">YOUR COMPANY</div>
                                <div class="company-subtitle">Package Service</div>
                            </div>
                            <div class="barcode-section">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
                        </div>

                        <!-- CUSTOMER SECTION -->
                        <div class="customer-section">
                            <div class="customer-name">${customerName}</div>
                        </div>

                        <!-- ITEMS SECTION -->
                        <div class="items-section">
                            <div class="item-list">
                                ${items.map(item => `
                                    <div class="item">
                                        <span class="item-name">${item.name || item}</span>
                                        <span class="item-qty">${item.qty || '1'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- FOOTER -->
                        <div class="footer">
                            <span class="date-info">${date}</span>
                            <span class="package-info">Paket ${i + 1}</span>
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
                                width: 1.5,
                                height: barcodeHeight * 0.7, // Adjusted for smaller label
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
            console.error("❌ Enhanced bulk print error:", error);
            alert("Enhanced bulk print error: " + error.message);
            return false;
        }
    }
}
