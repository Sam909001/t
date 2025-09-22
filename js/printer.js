// ================== PRINTER SERVICE FOR ELECTRON ==================
class PrinterServiceElectron {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true; // Electron printing is always available if app runs
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
        try {
            // Create a temporary window for printing
            const printWindow = window.open('', '', 'width=400,height=400');
            if (!printWindow) throw new Error('Popup blocked');

            const style = `
                <style>
                    body { font-family: Arial, Helvetica, sans-serif; margin:0; padding:5px; }
                    .label { width: 100mm; height: 80mm; border: 1px solid #000; padding:5px; box-sizing:border-box; }
                    .header { font-weight:bold; font-size:14px; text-align:center; margin-bottom:5px; }
                    .info { font-size:11px; margin-bottom:4px; text-align:left; }
                    .barcode { display:block; margin:5px auto; }
                    .barcode-text { text-align:center; font-size:9px; margin-top:2px; }
                </style>
            `;

            const html = `
                ${style}
                <div class="label">
                    <div class="header">YEDITEPE LAUNDRY</div>
                    <div class="info">Müşteri: ${pkg.customer_name || ''}</div>
                    <div class="info">Ürün: ${pkg.product || ''}</div>
                    <div class="info">Tarih: ${pkg.created_at || ''}</div>
                    <canvas id="barcodeCanvas" class="barcode"></canvas>
                    <div class="barcode-text">${pkg.package_no || ''}</div>
                </div>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            // Generate barcode using JsBarcode inside the popup
            const canvas = printWindow.document.getElementById('barcodeCanvas');
            JsBarcode(canvas, pkg.package_no || '', {
                format: 'CODE128',
                width: 2,
                height: 25,
                displayValue: false,
                margin: 0
            });

            // Wait a moment to render barcode
            await new Promise(resolve => setTimeout(resolve, 200));

            // Trigger printing
            printWindow.focus();
            printWindow.print();
            printWindow.close();

            console.log('✅ Label sent to printer:', pkg.package_no);
            return true;
        } catch (error) {
            console.error('❌ Electron print error:', error);
            return false;
        }
    }

    // ---------------- PRINT MULTIPLE LABELS ----------------
    async printAllLabels(packages) {
        let successCount = 0;
        let errorCount = 0;

        for (let pkg of packages) {
            const result = await this.printLabel(pkg);
            if (result) successCount++;
            else errorCount++;

            // Small delay to avoid printer overload
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        console.log(`🖨️ Printing finished: ${successCount} success, ${errorCount} failed`);
        return { successCount, errorCount };
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
