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
    // ---------------- PRINT MULTIPLE LABELS WITH SETTINGS ----------------
async printAllLabels(packages, settings = {}) {
    if (!packages || packages.length === 0) {
        alert("No packages selected for printing.");
        return false;
    }

    try {
        // Generate HTML content first
        let htmlContent = `<html><head>...all your <style> here...</head><body>`;
        packages.forEach((pkg, i) => {
            htmlContent += `<div class="label"> ... </div>`; // same as before
        });
        htmlContent += `</body></html>`;

        // If Electron API is available, use it to print directly
        if (window.electronAPI && window.electronAPI.printBarcode) {
            return await window.electronAPI.printBarcode(htmlContent);
        } else {
            // Fallback for browser (opens window)
            const printWindow = window.open("", "_blank");
            if (!printWindow) throw new Error("Popup blocked");
            printWindow.document.write(htmlContent);
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
                setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
            };
        }

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
