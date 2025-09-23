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

    // ---------------- PRINT MULTIPLE LABELS ----------------
    async printAllLabels(packages) {
        if (!packages || packages.length === 0) {
            alert("No packages selected for printing.");
            return false;
        }

        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

             const style = `
                <style>
                    @page {
                        size: 100mm 80mm landscape;
                        margin: 0;
                    }
                    
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    
                    body { 
                        font-family: Arial, Helvetica, sans-serif; 
                        margin: 0; 
                        padding: 0;
                        width: 100mm;
                        height: 80mm;
                        overflow: hidden;
                    }
                    
                    .label {
                        width: 100mm;
                        height: 80mm;
                        border: 1px solid #000;
                        padding: 2mm;
                        box-sizing: border-box;
                        margin: 0;
                        page-break-after: always;
                        display: grid;
                        grid-template-columns: 1fr auto;
                        grid-template-rows: auto 1fr;
                        gap: 1mm;
                        overflow: hidden;
                    }
                    
                    .label:last-child {
                        page-break-after: avoid;
                    }
 
                    .header { 
                        font-weight: bold; 
                        font-size: 18px; 
                        text-align: center; 
                        grid-column: 1 / -1;
                        margin-bottom: 1mm;
                        line-height: 1.1;
                        padding: 1mm 0;
                    }
                    
                    .info-section {
                        display: flex;
                        flex-direction: column;
                        justify-content: space-evenly;
                        padding-right: 2mm;
                        min-height: 0;
                    }
                    
                    .info { 
                        font-size: 15px; 
                        text-align: left;
                        line-height: 1.2;
                        margin: 1mm 0;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-weight: 500;
                    }
                    
                    .barcode-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-width: 35mm;
                        padding-left: 2mm;
                    }
                    
                    .barcode { 
                        max-width: 32mm;
                        max-height: 45mm;
                        width: 100%;
                    }
                    
                    .barcode-text { 
                        text-align: center; 
                        font-size: 11px; 
                        margin-top: 1mm;
                        font-weight: bold;
                        word-break: break-all;
                        max-width: 32mm;
                    }
                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            packages.forEach((pkg, i) => {
                // Adjust text lengths for horizontal layout
                const customerName = (pkg.customer_name || '').substring(0, 35);
                const product = (pkg.product || '').substring(0, 30);
                const packageNo = pkg.package_no || '';
                const date = pkg.created_at || '';

                printWindow.document.write(`
                    <div class="label">
                        <div class="header">YEDITEPE LAUNDRY</div>
                        <div class="info-section">
                            <div class="info">Müşteri: ${customerName}</div>
                            <div class="info">Ürün: ${product}</div>
                            <div class="info">Tarih: ${date}</div>
                        </div>
                        <div class="barcode-container">
                            <canvas id="barcode-${i}" class="barcode"></canvas>
                            <div class="barcode-text">${packageNo}</div>
                        </div>
                    </div>
                `);
            });

            printWindow.document.write("</body></html>");
            printWindow.document.close();

            // Wait until the new window loads, then render barcodes
            printWindow.onload = () => {
                packages.forEach((pkg, i) => {
                    const canvas = printWindow.document.getElementById(`barcode-${i}`);
                    if (canvas) {
                        try {
                            JsBarcode(canvas, pkg.package_no || '', {
                                format: 'CODE128',
                                width: 1.8,
                                height: 40,
                                displayValue: false,
                                margin: 0,
                                fontSize: 10
                            });
                        } catch (error) {
                            console.error('Barcode generation error:', error);
                        }
                    }
                });

                // Small delay to ensure rendering is complete
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
                        size: 100mm 80mm landscape;
                        margin: 0;
                    }
                    
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    
                    body { 
                        font-family: ${settings.fontName || 'Arial'}, Helvetica, sans-serif; 
                        margin: 0; 
                        padding: 0;
                        width: 100mm;
                        height: 80mm;
                        overflow: hidden;
                    }
                    
                    .label {
                        width: 100mm;
                        height: 80mm;
                        border: 1px solid #000;
                        padding: ${margin}mm;
                        box-sizing: border-box;
                        margin: 0;
                        page-break-after: always;
                        display: grid;
                        grid-template-columns: 1fr auto;
                        grid-template-rows: auto 1fr;
                        gap: 1mm;
                        overflow: hidden;
                    }
                    
                    .label:last-child {
                        page-break-after: avoid;
                    }
 
                    .header { 
                        font-weight: bold; 
                        font-size: ${headerSize}px; 
                        text-align: center; 
                        grid-column: 1 / -1;
                        margin-bottom: 1mm;
                        line-height: 1.1;
                        padding: 1mm 0;
                    }
                    
                    .info-section {
                        display: flex;
                        flex-direction: column;
                        justify-content: space-evenly;
                        padding-right: 2mm;
                        min-height: 0;
                    }
                    
                    .info { 
                        font-size: ${fontSize}px; 
                        text-align: left;
                        line-height: 1.2;
                        margin: 1mm 0;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-weight: 500;
                    }
                    
                    .barcode-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-width: 35mm;
                        padding-left: 2mm;
                    }
                    
                    .barcode { 
                        max-width: 32mm;
                        max-height: ${barcodeHeight + 5}mm;
                        width: 100%;
                    }
                    
                    .barcode-text { 
                        text-align: center; 
                        font-size: ${Math.max(9, fontSize - 3)}px; 
                        margin-top: 1mm;
                        font-weight: bold;
                        word-break: break-all;
                        max-width: 32mm;
                    }
                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            packages.forEach((pkg, i) => {
                const customerName = (pkg.customer_name || '').substring(0, 35);
                const product = (pkg.product || '').substring(0, 30);
                const packageNo = pkg.package_no || '';
                const date = pkg.created_at || '';

                printWindow.document.write(`
                    <div class="label">
                        <div class="header">YEDITEPE LAUNDRY</div>
                        <div class="info-section">
                            <div class="info">Müşteri: ${customerName}</div>
                            <div class="info">Ürün: ${product}</div>
                            <div class="info">Tarih: ${date}</div>
                        </div>
                        <div class="barcode-container">
                            <canvas id="barcode-${i}" class="barcode"></canvas>
                            <div class="barcode-text">${packageNo}</div>
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
                                width: 1.8,
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
