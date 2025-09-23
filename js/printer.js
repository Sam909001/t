// ================== SINGLE LABEL PRINTER FOR ELECTRON ==================
class PrinterServiceElectron {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
    }

    // ---------------- PRINT SINGLE LABEL ----------------
    async printLabel(pkg, settings = {}) {
        if (!this.isConnected) {
            alert("Yazıcı servisi bağlı değil.");
            return false;
        }

        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");

            // Ayarlar
            const fontSize = settings.fontSize || 9;
            const headerSize = Math.max(10, fontSize + 3);
            const barcodeHeight = settings.barcodeHeight || 15;
            const margin = settings.margin || 3;

            const style = `
                <style>
                    @page { size: 100mm 80mm; margin: 0; }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: ${settings.fontName || 'Arial'}, Helvetica, sans-serif; margin:0; padding:0; width:100mm; height:80mm; }
                    .label {
                        width: 100mm;
                        height: 80mm;
                        border: 1px solid #000;
                        padding: ${margin}mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        overflow: hidden;
                    }
                    .header { font-weight:bold; font-size:${headerSize}px; text-align:center; line-height:1.2; margin-bottom:2mm; }
                    .info { font-size:${fontSize}px; line-height:1.1; }
                    .barcode-container { flex:1; display:flex; justify-content:center; align-items:center; margin:2mm 0; }
                    .barcode { max-width:90mm; max-height:${barcodeHeight+5}mm; }
                    .barcode-text { text-align:center; font-size:${Math.max(6,fontSize-2)}px; margin-top:1mm; font-weight:bold; }
                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            const customerName = (pkg.customer_name || '').substring(0, 30);
            const product = (pkg.product || '').substring(0, 25);
            const packageNo = pkg.package_no || '';
            const date = pkg.created_at || '';

            printWindow.document.write(`
                <div class="label">
                    <div class="header">YEDITEPE LAUNDRY</div>
                    <div class="info">Müşteri: ${customerName}</div>
                    <div class="info">Ürün: ${product}</div>
                    <div class="info">Tarih: ${date}</div>
                    <div class="barcode-container">
                        <canvas id="barcode" class="barcode"></canvas>
                        <div class="barcode-text">${packageNo}</div>
                    </div>
                </div>
            `);

            printWindow.document.write("</body></html>");
            printWindow.document.close();

            printWindow.onload = () => {
                const canvas = printWindow.document.getElementById('barcode');
                if (canvas) {
                    try {
                        JsBarcode(canvas, packageNo, {
                            format: 'CODE128',
                            width: 1.5,
                            height: barcodeHeight,
                            displayValue: false,
                            margin: 0,
                            fontSize: Math.max(6,fontSize-2)
                        });
                    } catch(e) {
                        console.error('Barcode generation error:', e);
                    }
                }
                setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
            };

            return true;
        } catch (error) {
            console.error("❌ Print error:", error);
            alert("Print error: " + error.message);
            return false;
        }
    }

    // ---------------- TEST PRINT ----------------
    async testPrint(settings = {}) {
        const testPkg = {
            package_no: 'TEST123456',
            customer_name: 'Test Müşteri',
            product: 'Test Ürün',
            created_at: new Date().toLocaleDateString('tr-TR')
        };
        return this.printLabel(testPkg, settings);
    }

    // ---------------- PRINT SELECTED PACKAGES FROM TABLE ----------------
    async printSelectedFromTable(tableBodyId = 'packagesTableBody') {
        const checkboxes = document.querySelectorAll(`#${tableBodyId} input[type="checkbox"]:checked`);
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

        // Kaydedilmiş ayarları al
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

        // Tek tek yazdır (her paket kendi penceresinde)
        for (let pkg of packages) {
            await this.printLabel(pkg, settings);
        }
    }
}

// ================== PRINTER INITIALIZATION ==================
let printerElectron = new PrinterServiceElectron();

function getPrinterElectron() {
    return printerElectron;
}

// ================== USAGE EXAMPLES ==================

// Test yazdırma
async function testPrintWithSettings() {
    await printerElectron.testPrint();
}

// Tablodan seçilen paketleri yazdırma
async function printSelectedElectron() {
    await printerElectron.printSelectedFromTable();
}
