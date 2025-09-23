// ================== PRINTER SERVICE FOR ELECTRON ==================
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
                    body { font-family: Arial, Helvetica, sans-serif; margin:0; padding:5px; }
                    .label {
                        width: 100mm; height: 80mm;
                        border: 1px solid #000;
                        padding:5px; box-sizing:border-box;
                        margin: 10px auto;
                        page-break-after: always;
                    }
                    .header { font-weight:bold; font-size:14px; text-align:center; margin-bottom:5px; }
                    .info { font-size:11px; margin-bottom:4px; text-align:left; }
                    .barcode { display:block; margin:5px auto; }
                    .barcode-text { text-align:center; font-size:9px; margin-top:2px; }
                </style>
            `;

            printWindow.document.write(`<html><head>${style}</head><body>`);

            packages.forEach((pkg, i) => {
                printWindow.document.write(`
                    <div class="label">
                        <div class="header">YEDITEPE LAUNDRY</div>
                        <div class="info">Müşteri: ${pkg.customer_name || ''}</div>
                        <div class="info">Ürün: ${pkg.product || ''}</div>
                        <div class="info">Tarih: ${pkg.created_at || ''}</div>
                        <canvas id="barcode-${i}" class="barcode"></canvas>
                        <div class="barcode-text">${pkg.package_no || ''}</div>
                    </div>
                `);
            });

            printWindow.document.write("</body></html>");
            printWindow.document.close();

            // Wait until the new window loads, then render barcodes
            printWindow.onload = () => {
                packages.forEach((pkg, i) => {
                    const canvas = printWindow.document.getElementById(`barcode-${i}`);
                    JsBarcode(canvas, pkg.package_no || '', {
                        format: 'CODE128',
                        width: 2,
                        height: 25,
                        displayValue: false,
                        margin: 0
                    });
                });

                printWindow.focus();
                printWindow.print();
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
let printerElectron = new PrinterServiceElectron();
function getPrinterElectron() {
    return printerElectron;
}

// ================== HTML BUTTON EXAMPLES ==================
// <button onclick="printSelectedElectron()">Yazdır</button>

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

    await printerElectron.printAllLabels(packages);
}
