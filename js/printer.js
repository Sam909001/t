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
                        size: 80mm 100mm portrait; /* 8x10 cm sticker size */
                        margin: 2mm; /* Small margin to prevent edge cutoff */
                    }
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    body {
                        width: 80mm;
                        height: 100mm;
                        margin: 0;
                        padding: 0;
                        font-family: 'Arial', sans-serif;
                        overflow: hidden;
                    }
                    .label {
                        width: 76mm; /* Account for page margins */
                        height: 96mm; /* Account for page margins */
                        border: 1px solid #333;
                        box-sizing: border-box;
                        margin: 0;
                        padding: 3mm;
                        page-break-after: always;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        background: white;
                    }
                    .label:last-child {
                        page-break-after: avoid;
                    }
                    .header {
                        font-weight: bold;
                        font-size: 16px;
                        text-align: center;
                        margin-bottom: 4mm;
                        padding: 2mm 0;
                        border-bottom: 2px solid #333;
                        letter-spacing: 1px;
                        line-height: 1.2;
                        color: #333;
                        text-transform: uppercase;
                    }
                    
                    .content-area {
                        display: flex;
                        flex: 1;
                        gap: 3mm;
                    }
                    
                    .info-section {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-around;
                        min-height: 0;
                    }
                    
                    .info { 
                        font-size: 12px; 
                        text-align: left;
                        line-height: 1.3;
                        margin: 2mm 0;
                        font-weight: 500;
                        color: #333;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    .info strong {
                        font-weight: 700;
                        color: #000;
                    }
                    
                    .barcode-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        width: 28mm;
                        flex-shrink: 0;
                    }
                    
                    .barcode { 
                        width: 26mm;
                        height: auto;
                        max-height: 35mm;
                        border: 1px solid #ddd;
                        background: white;
                        padding: 1mm;
                    }
                    
                    .barcode-text { 
                        text-align: center; 
                        font-size: 9px; 
                        margin-top: 2mm;
                        font-weight: bold;
                        word-break: break-all;
                        max-width: 26mm;
                        line-height: 1.1;
                        color: #333;
                    }
                    /* Professional styling touches */
                    .label::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 1mm;
                        background: linear-gradient(90deg, #333 0%, #666 50%, #333 100%);
                    }
                </style>
            `;
            printWindow.document.write(`<html><head>${style}</head><body>`);
            packages.forEach((pkg, i) => {
                // Proper text length limits for the label size
                const customerName = (pkg.customer_name || '').substring(0, 25);
                const product = (pkg.product || '').substring(0, 20);
                const packageNo = pkg.package_no || '';
                const date = pkg.created_at || '';
                printWindow.document.write(`
                    <div class="label">
                        <div class="header">YEDITEPE LAUNDRY</div>
                        <div class="content-area">
                            <div class="info-section">
                                <div class="info"><strong>Müşteri:</strong><br>${customerName}</div>
                                <div class="info"><strong>Ürün:</strong><br>${product}</div>
                                <div class="info"><strong>Tarih:</strong><br>${date}</div>
                            </div>
                            <div class="barcode-container">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
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
                                width: 1.5,
                                height: 35,
                                displayValue: false,
                                margin: 2,
                                fontSize: 8
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
            const fontSize = settings.fontSize || 12;
            const headerSize = Math.max(14, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 35;
            const margin = settings.margin || 3;
            const style = `
                <style>
                    @page {
                        size: 80mm 100mm portrait; /* 8x10 cm sticker size */
                        margin: 2mm;
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
                        width: 80mm;
                        height: 100mm;
                        overflow: hidden;
                    }
                    
                    .label {
                        width: 76mm; /* Account for page margins */
                        height: 96mm; /* Account for page margins */
                        border: 1px solid #333;
                        padding: ${margin}mm;
                        box-sizing: border-box;
                        margin: 0;
                        page-break-after: always;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        background: white;
                        overflow: hidden;
                    }
                    
                    .label:last-child {
                        page-break-after: avoid;
                    }
 
                    .header { 
                        font-weight: bold; 
                        font-size: ${headerSize}px; 
                        text-align: center; 
                        margin-bottom: 4mm;
                        padding: 2mm 0;
                        border-bottom: 2px solid #333;
                        letter-spacing: 1px;
                        line-height: 1.2;
                        color: #333;
                        text-transform: uppercase;
                    }
                    
                    .content-area {
                        display: flex;
                        flex: 1;
                        gap: 3mm;
                    }
                    
                    .info-section {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-around;
                        min-height: 0;
                    }
                    
                    .info { 
                        font-size: ${fontSize}px; 
                        text-align: left;
                        line-height: 1.3;
                        margin: 2mm 0;
                        font-weight: 500;
                        color: #333;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    .info strong {
                        font-weight: 700;
                        color: #000;
                    }
                    
                    .barcode-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        width: 28mm;
                        flex-shrink: 0;
                    }
                    
                    .barcode { 
                        width: 26mm;
                        height: auto;
                        max-height: ${barcodeHeight + 5}mm;
                        border: 1px solid #ddd;
                        background: white;
                        padding: 1mm;
                    }
                    
                    .barcode-text { 
                        text-align: center; 
                        font-size: ${Math.max(8, fontSize - 3)}px; 
                        margin-top: 2mm;
                        font-weight: bold;
                        word-break: break-all;
                        max-width: 26mm;
                        line-height: 1.1;
                        color: #333;
                    }
                    /* Professional styling touches */
                    .label::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 1mm;
                        background: linear-gradient(90deg, #333 0%, #666 50%, #333 100%);
                    }
                </style>
            `;
            printWindow.document.write(`<html><head>${style}</head><body>`);
            packages.forEach((pkg, i) => {
                const customerName = (pkg.customer_name || '').substring(0, 25);
                const product = (pkg.product || '').substring(0, 20);
                const packageNo = pkg.package_no || '';
                const date = pkg.created_at || '';
                printWindow.document.write(`
                    <div class="label">
                        <div class="header">YEDITEPE LAUNDRY</div>
                        <div class="content-area">
                            <div class="info-section">
                                <div class="info"><strong>Müşteri:</strong><br>${customerName}</div>
                                <div class="info"><strong>Ürün:</strong><br>${product}</div>
                                <div class="info"><strong>Tarih:</strong><br>${date}</div>
                            </div>
                            <div class="barcode-container">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
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
                                width: 1.5,
                                height: barcodeHeight,
                                displayValue: false,
                                margin: 2,
                                fontSize: 8
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
