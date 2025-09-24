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
// ================== ENHANCED PRINTER WITH REAL ITEM QUANTITIES ==================
class PrinterServiceElectronWithSettings extends PrinterServiceElectron {
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("No packages selected for printing.");
            return false;
        }

        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

            const fontSize = settings.fontSize || 14;
            const headerSize = Math.max(16, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 40;

            const style = `
                <style>
                    @page { size: 150mm 110mm portrait; margin: 0; }
                    body { width: 150mm; height: 110mm; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; overflow: hidden; }
                    .label { width: 100%; height: 100%; padding: 10mm; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid #000; position: relative; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 5mm; }
                    .customer-section { background: #000; color: #fff; text-align: center; padding: 4mm; margin: 3mm 0; }
                    .items-section { margin: 3mm 0; }
                    .item-list { border: 1px solid #ddd; border-radius: 2mm; padding: 2mm; }
                    .item { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px dotted #ccc; }
                    .item:last-child { border-bottom: none; }
                    .item-name { font-weight: 600; }
                    .item-qty { font-weight: 700; text-align: center; min-width: 15mm; }
                    .footer { margin-top: auto; border-top: 1px solid #ddd; padding-top: 2mm; font-size: 12px; color: #666; display: flex; justify-content: space-between; }
                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');

                // Ensure items array structure
                const items = Array.isArray(pkg.items) ? pkg.items : [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];

                printWindow.document.write(`
                    <div class="label">
                        <div class="header">
                            <div>${customerName}</div>
                            <div>
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
                        </div>

                        <div class="customer-section">${customerName}</div>

                        <div class="items-section">
                            <div class="item-list">
                                ${items.map(item => {
                                    const name = item?.name || item; // fallback
                                    const qty = item?.qty != null ? item.qty : 1; // safe fallback
                                    return `<div class="item"><span class="item-name">${name}</span><span class="item-qty">${qty} AD</span></div>`;
                                }).join('')}
                            </div>
                        </div>

                        <div class="footer">
                            <span>${date}</span>
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
