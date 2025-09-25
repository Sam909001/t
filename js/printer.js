const logoPath = 'laundry-logo.jpg';

// ================== ENHANCED PRINTER SERVICE FOR ELECTRON ==================
class PrinterServiceElectronWithSettings {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
    }

    // ---------------- GENERATE BARCODE SVG ----------------
    generateBarcodeSVG(barcodeText, settings = {}) {
        try {
            // Create a temporary SVG element
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            JsBarcode(svg, barcodeText, {
                format: 'CODE128',
                width: settings.barcodeWidth || 1.2,
                height: settings.barcodeHeight || 25,
                displayValue: false,
                margin: 0
            });
            return svg.outerHTML;
        } catch (error) {
            console.error('Barcode generation error:', error);
            // Fallback: simple text representation
            return `<div style="border:1px solid #000; padding:5px; text-align:center; font-family:monospace;">${barcodeText}</div>`;
        }
    }

    // ---------------- PRINT MULTIPLE LABELS ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("Yazdırılacak paket bulunamadı.");
            return false;
        }

        try {
            // Apply settings or use defaults
            const fontSize = settings.fontSize || 14;
            const headerSize = Math.max(16, fontSize + 4);

            // Enhanced CSS styling matching your HTML structure
            const style = `
                <style>
                    @page { 
                        size: 150mm 115mm portrait;
                        margin: 0;
                    }
                    body { 
                        width: 150mm;
                        height: 115mm;
                        margin: 0;
                        padding: 0;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: #fff;
                        color: #000;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .label {
                        width: 100%;
                        height: 100%;
                        box-sizing: border-box;
                        padding: 10mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        border: 4px solid #000;
                        position: relative;
                        page-break-after: always;
                    }
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
                        font-size: 20px;
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
                        max-width: 40mm;
                        height: 20mm;
                    }
                    .barcode-text {
                        font-size: 17px;
                        font-weight: 700;
                        margin-top: 1mm;
                        color: #000;
                        font-family: 'Courier New', monospace;
                        letter-spacing: 0.5px;
                    }
                    .customer-section {
                        background: #000;
                        color: #fff;
                        padding: 4mm;
                        margin: 3mm 0;
                        text-align: center;
                        border-radius: 3mm;
                        box-shadow: 0 3px 5px rgba(0,0,0,0.2);
                    }
                    .customer-name {
                        font-size: 22px;
                        font-weight: 700;
                        margin: 0;
                        line-height: 1.2;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .items-section {
                        flex: 1;
                        margin: 3mm 0;
                    }
                    .item-list {
                        background: #fff;
                        padding: 3mm;
                        border-radius: 2mm;
                        border: 1px solid #000;
                    }
                    .item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.5mm 0;
                        border-bottom: 1px solid #000;
                        font-size: 18px;
                    }
                    .item:last-child {
                        border-bottom: none;
                    }
                    .item-name {
                        font-weight: 600;
                        color: #000;
                    }
                    .item-qty {
                        font-weight: 700;
                        color: #000;
                        background: #fff;
                        padding: 1mm 2mm;
                        border-radius: 2mm;
                        border: 1px solid #000;
                        font-size: 15px;
                        min-width: 15mm;
                        text-align: center;
                    }
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: auto;
                        padding-top: 3mm;
                        border-top: 2px solid #ddd;
                        font-size: 15px;
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
                        border: 2px solid #ddd;
                    }
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
                    .logo-img {
                        height: 60px;
                        margin-bottom: 7px;
                    }
                </style>
            `;

            // Build HTML for all labels
            let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Barkod Etiketleri</title>${style}</head><body>`;

            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const items = pkg.items || [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');

                // Generate barcode SVG
                const barcodeSVG = this.generateBarcodeSVG(packageNo, settings);

                htmlContent += `
                    <div class="label">
                        <!-- HEADER SECTION -->
                        <div class="header">
                            <div class="company-info">
                                <h1 class="company-name">YEDITEPE LAUNDRY</h1>
                                <p class="company-subtitle">Professional Laundry Services</p>
                            </div>
                            <img src="${logoPath}" alt="Laundry Logo" class="logo-img">
                            <div class="barcode-section">
                                <div class="barcode">${barcodeSVG}</div>
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
                            <span class="package-info">${packageNo}</span>
                        </div>
                    </div>
                `;
            });

            htmlContent += `</body></html>`;

            // Use Electron API for printing
            if (window.electronAPI && window.electronAPI.printBarcode) {
                console.log('🖨️ Sending print request to Electron...');
                const success = await window.electronAPI.printBarcode(htmlContent);
                if (success) {
                    console.log('✅ Print completed successfully');
                } else {
                    console.error('❌ Print failed');
                }
                return success;
            } else {
                // Fallback to browser printing
                console.warn('⚠️ Electron API not available, using browser fallback');
                return this.browserFallbackPrint(htmlContent);
            }

        } catch (error) {
            console.error("❌ Print error:", error);
            alert("Yazdırma hatası: " + error.message);
            return false;
        }
    }

    // ---------------- BROWSER FALLBACK PRINT ----------------
    browserFallbackPrint(htmlContent) {
        return new Promise((resolve) => {
            try {
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                    throw new Error("Popup blocked. Please allow popups for printing.");
                }

                printWindow.document.write(htmlContent);
                printWindow.document.close();

                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        setTimeout(() => {
                            printWindow.close();
                            resolve(true);
                        }, 1000);
                    }, 500);
                };
            } catch (error) {
                console.error("❌ Browser fallback print error:", error);
                resolve(false);
            }
        });
    }

    // ---------------- PRINT SINGLE LABEL ----------------
    async printLabel(pkg, settings = {}) {
        return await this.printAllLabels([pkg], settings);
    }

    // ---------------- TEST PRINT ----------------
    async testPrint(settings = {}) {
        const testPackage = {
            package_no: 'TEST123456',
            customer_name: 'Test Müşteri - ÇŞĞİÖÜ',
            items: [
                { name: 'Büyük Çarşaf - çşğıöü', qty: 2 },
                { name: 'Havlu', qty: 5 },
                { name: 'Yastık Kılıfı', qty: 3 }
            ],
            created_at: new Date().toLocaleDateString('tr-TR')
        };
        
        console.log('🧪 Starting test print...');
        const success = await this.printAllLabels([testPackage], settings);
        
        if (success) {
            console.log('✅ Test print completed successfully');
        } else {
            console.error('❌ Test print failed');
        }
        
        return success;
    }
}

// ================== PRINTER INITIALIZATION ==================
let printerElectron = new PrinterServiceElectronWithSettings();

function getPrinterElectron() {
    return printerElectron;
}

// ================== USAGE FUNCTIONS ==================
async function printSelectedElectron() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('En az bir paket seçin');
        return false;
    }

    const packages = Array.from(checkboxes).map((checkbox, i) => {
        const row = checkbox.closest('tr');
        const productText = row.cells[3]?.textContent?.trim() || 'Bilinmeyen Ürün';
        const qtyText = row.cells[4]?.textContent?.trim();
        const qty = qtyText ? parseInt(qtyText) : 1;
        
        return {
            package_no: row.cells[1]?.textContent?.trim() || `PKG-${Date.now()}-${i}`,
            customer_name: row.cells[2]?.textContent?.trim() || 'Bilinmeyen Müşteri',
            items: [{ name: productText, qty: qty }],
            created_at: row.cells[5]?.textContent?.trim() || new Date().toLocaleDateString('tr-TR')
        };
    });

    // Get saved settings
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    // Show loading state
    const printBtn = document.getElementById('printBarcodeBtn');
    let originalText = '';
    
    if (printBtn) {
        originalText = printBtn.innerHTML;
        printBtn.disabled = true;
        printBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yazdırılıyor...';
    }

    try {
        const success = await printerElectron.printAllLabels(packages, settings);
        return success;
    } catch (error) {
        console.error('Print error:', error);
        alert('Yazdırma hatası: ' + error.message);
        return false;
    } finally {
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.innerHTML = originalText;
        }
    }
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    return await printerElectron.testPrint(settings);
}

// ================== BUTTON BINDINGS ==================
document.addEventListener("DOMContentLoaded", () => {
    // Test printer button in printer status section
    const btnTestPrinter = document.getElementById("test-printer");
    if (btnTestPrinter) {
        btnTestPrinter.addEventListener("click", async () => {
            btnTestPrinter.disabled = true;
            btnTestPrinter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test Yazdırılıyor...';
            
            try {
                const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
                const success = await printerElectron.testPrint(settings);
                
                if (success) {
                    showAlert("Test etiketi başarıyla yazdırıldı ✅", "success");
                } else {
                    showAlert("Test yazdırma başarısız oldu ❌", "error");
                }
            } catch (error) {
                console.error('Test print error:', error);
                showAlert("Test yazdırma hatası: " + error.message, "error");
            } finally {
                btnTestPrinter.disabled = false;
                btnTestPrinter.innerHTML = 'Test Printer';
            }
        });
    }

    // Test printer button in settings
    const btnTestYazdir = document.getElementById("test-printer-yazdir");
    if (btnTestYazdir) {
        btnTestYazdir.addEventListener("click", async () => {
            btnTestYazdir.disabled = true;
            btnTestYazdir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test Yazdırılıyor...';
            
            try {
                const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
                const success = await printerElectron.testPrint(settings);
                
                if (success) {
                    showAlert("Test etiketi başarıyla yazdırıldı ✅", "success");
                } else {
                    showAlert("Test yazdırma başarısız oldu ❌", "error");
                }
            } catch (error) {
                console.error('Test print error:', error);
                showAlert("Test yazdırma hatası: " + error.message, "error");
            } finally {
                btnTestYazdir.disabled = false;
                btnTestYazdir.innerHTML = 'Test Yazdır';
            }
        });
    }

    // Print barcode button
    const printBarcodeBtn = document.getElementById('printBarcodeBtn');
    if (printBarcodeBtn) {
        printBarcodeBtn.addEventListener('click', printSelectedElectron);
    }
});

// ================== HELPER FUNCTIONS ==================
function showAlert(message, type = "info") {
    // Use your existing alert system or create a simple one
    const alertContainer = document.getElementById('alertContainer') || document.body;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        z-index: 10000;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
    `;
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ================== GLOBAL EXPORT ==================
window.printSelectedElectron = printSelectedElectron;
window.testPrintWithSettings = testPrintWithSettings;
window.getPrinterElectron = getPrinterElectron;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrinterServiceElectronWithSettings, getPrinterElectron };
}
