const logoPath = 'laundry-logo.jpg'; 

// ================== ENHANCED PRINTER SERVICE FOR ELECTRON ==================
class PrinterServiceElectronWithSettings {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
    }

    // ---------------- PRINT SINGLE LABEL ----------------
    async printLabel(pkg, settings = {}) {
        return await this.printAllLabels([pkg], settings); // reuse bulk method
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

            // Settings or defaults
            const fontSize = settings.fontSize || 14;
            const headerSize = Math.max(16, fontSize + 4);
            const barcodeHeight = settings.barcodeHeight || 25;
            const margin = settings.margin || 2;

            const style = `
                <style>
                @page { size: 150mm 115mm portrait; margin: 0; }
                body { width: 150mm; height: 115mm; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; background: #fff; overflow: hidden; }
                .label { width: 100%; height: 100%; box-sizing: border-box; padding: 10mm; display: flex; flex-direction: column; justify-content: space-between; border: 4px solid #000; position: relative; }
                
                /* HEADER */
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 4px solid #000; }
                .barcode-section { text-align: right; flex-shrink: 0; }
                .barcode { max-width: 80mm; height: 20mm; }
                .barcode-text { font-size: 18px; font-weight: 700; margin-top: 1mm; color: #000; font-family: 'Courier New', monospace; letter-spacing: 0.5px; }

                /* CUSTOMER SECTION */
                .customer-section { background: #000; color: #fff; padding: 4mm; margin: 3mm 0; text-align: center; border-radius: 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .customer-name { font-size: 22px; font-weight: 700; margin: 0; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.5px; }

                /* ITEMS SECTION */
                .items-section { flex: 1; margin: 3mm 0; }
                .item-list { background: #fff; padding: 3mm; border-radius: 2mm; border: 1px solid #000; }
                .item { display: flex; justify-content: space-between; align-items: center; padding: 1.5mm 0; border-bottom: 1px solid #000; font-size: 22px; }
                .item:last-child { border-bottom: none; }
                .item-name { font-weight: 600; color: #000; }
                .item-qty { font-weight: 700; color: #000; background: #fff; padding: 1mm 2mm; border-radius: 2mm; border: 1px solid #000; font-size: 15px; min-width: 15mm; text-align: center; }

                /* FOOTER */
                .footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 3mm; border-top: 2px solid #ddd; font-size: 15px; color: #666; }
                .date-info { font-weight: 500; }

                /* PROFESSIONAL TOUCHES */
                .label::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, #000 0%, #333 50%, #000 100%); }
                .label::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #000 0%, #333 50%, #000 100%); }
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
                        <!-- HEADER -->
                        <div class="header">
                            <img src="${logoPath}" alt="Laundry Logo" style="height:120px; margin-bottom:12px;">
                            <div class="barcode-section">
                                <canvas id="barcode-${i}" class="barcode"></canvas>
                                <div class="barcode-text">${packageNo}</div>
                            </div>
                        </div>

                        <!-- CUSTOMER -->
                        <div class="customer-section">
                            <h2 class="customer-name">${customerName}</h2>
                        </div>

                        <!-- ITEMS -->
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
let printerElectron = new PrinterServiceElectronWithSettings();
function getPrinterElectron() { return printerElectron; }

// ================== USAGE FUNCTIONS ==================
async function printSelectedElectron() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return alert('En az bir paket seçin');

    const packages = Array.from(checkboxes).map((checkbox, i) => {
        const row = checkbox.closest('tr');
        const itemName = row.cells[3]?.textContent?.trim() || 'Bilinmeyen Ürün';
        const itemQty = parseInt(row.cells[4]?.textContent?.trim()) || 1;
        return {
            package_no: row.cells[1]?.textContent?.trim() || `PKG-${Date.now()}-${i}`,
            customer_name: row.cells[2]?.textContent?.trim() || 'Bilinmeyen Müşteri',
            items: [{ name: itemName, qty: itemQty }],
            created_at: row.cells[5]?.textContent?.trim() || new Date().toLocaleDateString('tr-TR')
        };
    });

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.printAllLabels(packages, settings);
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.testPrint(settings);
}

// ================== BUTTON BINDINGS ==================
document.addEventListener("DOMContentLoaded", () => {
    const btnTestPrinter = document.getElementById("test-printer");
    const btnTestYazdir = document.getElementById("test-printer-yazdir");

    if (btnTestPrinter) btnTestPrinter.addEventListener("click", async () => {
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        await printerElectron.testPrint(settings);
        showAlert("Test etiketi başarıyla yazdırıldı ✅", "success");
    });

    if (btnTestYazdir) btnTestYazdir.addEventListener("click", async () => {
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        await printerElectron.testPrint(settings);
        showAlert("Test etiketi başarıyla yazdırıldı ✅", "success");
    });
});

// ================== GLOBAL EXPORT ==================
window.printSelectedElectron = printSelectedElectron;
window.testPrintWithSettings = testPrintWithSettings;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrinterServiceElectronWithSettings, getPrinterElectron };
}
