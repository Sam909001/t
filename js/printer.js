// ----------------- LOGO PATHS -----------------
const logoPath = 'file:///C:/Users/munze/OneDrive/Documents/ElectronApp/t/laundry-logo.jpg';
const logoBase64 = "data:image/jpeg;base64,...";
const logoPathFinal = (typeof window !== 'undefined' && window.electronAPI) ? logoPath : logoBase64;

// ================== ENHANCED PRINTER SERVICE FOR ELECTRON ==================
class PrinterServiceElectronWithSettings {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
    }

    // ---------------- GENERATE BARCODE SVG ----------------
    generateBarcodeSVG(barcodeText, settings = {}) {
        try {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            JsBarcode(svg, barcodeText, {
                format: 'CODE128',
                width: 1.0,                              // Thinner bars
                height: 40,                              // Exactly 2cm when scaled
                displayValue: false,
                margin: 0,                               // No margin
                background: "transparent",
                lineColor: "#000"
            });
            
            // Force exact dimensions and remove all spacing
            svg.setAttribute('width', '45mm');
            svg.setAttribute('height', '20mm');           // Exactly 2cm
            svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width') || 200} ${svg.getAttribute('height') || 40}`);
            svg.style.cssText = 'display:block;margin:0;padding:0;border:0;vertical-align:top;line-height:0;';
            
            return svg.outerHTML;
        } catch (error) {
            console.error('Barcode generation error:', error);
            return `<div style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace; margin:0; line-height:1; height:20mm;">${barcodeText}</div>`;
        }
    }

    // ---------------- PRINT MULTIPLE LABELS ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("Yazdırılacak paket bulunamadı.");
            return false;
        }

        try {
            const fontSize = settings.fontSize || 14;

            // Generate complete HTML
            let htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    @page { size: 100mm 78mm portrait; margin: 0; }
    body { 
        width: 100mm; height: 78mm; margin: 0; padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .label {
        width: 100%; height: 100%;
        padding: 6mm;
        display: flex; flex-direction: column;
        justify-content: space-between;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        box-sizing: border-box;
        page-break-after: always;
        position: relative;
    }
    .header {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding-bottom: 3mm; margin-bottom: 3mm;
        border-bottom: 2px solid #000;
    }
    .logo-img { 
        width: 35mm;
        height: 20mm;
        object-fit: contain;
    }
    .barcode-section {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0;
        line-height: 0;
        font-size: 0;
        position: relative;                 /* For absolute positioning */
    }
    .barcode {
        display: block;
        margin: 0;
        padding: 0;
        line-height: 0;
        font-size: 0;
        height: 20mm;
        overflow: hidden;
        position: relative;
    }
    .barcode svg {
        width: 45mm;
        height: 20mm !important;
        display: block;
        margin: 0;
        padding: 0;
        vertical-align: top;
        border: 0;
        outline: 0;
        position: relative;
        top: 0;
    }
    .barcode-text {
        font-size: 13px;
        font-weight: 700;
        margin: 0;
        padding: 0;
        color: #000;
        font-family: 'Courier New', monospace;
        line-height: 1;
        display: block;
        height: auto;
        position: absolute;              /* Absolute positioning */
        bottom: -15px;                   /* Position it at bottom of barcode */
        right: 0;                        /* Align to right */
        white-space: nowrap;             /* Prevent text wrapping */
    }
    .customer-section {
        background: #000; color: #fff;
        padding: 4mm 0; text-align: center;
    }
    .customer-name { 
        margin:0; font-size:20px; font-weight:800; letter-spacing:1px; 
    }
    .items-section { flex: 1; margin: 3mm 0; }
    .item-list { padding: 2mm 0; }
    .item { 
        display: flex; justify-content: space-between; 
        align-items: center; font-size: 15px; 
    }
    .item-name { font-weight: 600; }
    .item-qty { 
        font-weight: 700; border: 1px solid #000; 
        font-size: 13px; min-width: 14mm; text-align: center; 
    }
    .footer { 
        display: flex; justify-content: flex-start; 
        align-items: center; font-size: 14px; color: #333; 
    }
    .date-info { font-weight: 600; }
</style>
</head>
<body>
`;

            // Loop through packages
            for (const pkg of packages) {
                const packageNo = pkg.package_no || '';
                const customerName = pkg.customer_name || '';
                const items = pkg.items || [];
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
                const barcodeSVG = this.generateBarcodeSVG(packageNo, settings);

                htmlContent += `
<div class="label">
    <div class="header">
        <div class="logo-section">
            <img src="${logoPath}" class="logo-img">
        </div>
        <div class="barcode-section">
            <div class="barcode">${barcodeSVG}</div>
            <div class="barcode-text">${packageNo}</div>
        </div>
    </div>

    <div class="customer-section">
        <h2 class="customer-name">${customerName}</h2>
    </div>

    <div class="items-section">
        <div class="item-list">
            ${items.map(item => {
                const name = item?.name || item;
                const qty = item?.qty != null ? item.qty : 1;
                return `<div class="item"><span class="item-name">${name}</span><span class="item-qty">${qty} AD</span></div>`;
            }).join('')}
        </div>
    </div>

    <div class="footer">
        <span class="date-info">${date}</span>
    </div>
</div>`;
            }

            htmlContent += `</body></html>`;

            // Print using Electron API or browser fallback
            if (window.electronAPI && window.electronAPI.printBarcode) {
                console.log('🖨️ Using Electron printing...');
                return await window.electronAPI.printBarcode(htmlContent);
            } else {
                console.log('⚠️ Using browser fallback print');
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
                    throw new Error("Popup blocked");
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

// ================== USAGE FUNCTIONS (GLOBAL SCOPE) ==================
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

// ================== HELPER FUNCTIONS ==================
function showAlert(message, type = "info") {
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

// ================== BUTTON BINDINGS ==================
document.addEventListener("DOMContentLoaded", () => {
    // Test printer button in printer status section
    const btnTestPrinter = document.getElementById("test-printer");
    if (btnTestPrinter) {
        btnTestPrinter.addEventListener("click", async () => {
            btnTestPrinter.disabled = true;
            btnTestPrinter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test Yazdırılıyor...';
            
            try {
                const success = await testPrintWithSettings();
                
                if (success) {
                    showAlert("Test etiketi başarıyla yazdırıldı", "success");
                } else {
                    showAlert("Test yazdırma başarısız oldu", "error");
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
                const success = await testPrintWithSettings();
                
                if (success) {
                    showAlert("Test etiketi başarıyla yazdırıldı", "success");
                } else {
                    showAlert("Test yazdırma başarısız oldu", "error");
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

// ================== GLOBAL EXPORTS ==================
window.printSelectedElectron = printSelectedElectron;
window.testPrintWithSettings = testPrintWithSettings;
window.getPrinterElectron = getPrinterElectron;

// Debug log
console.log('Printer functions loaded:', {
    printSelectedElectron: typeof printSelectedElectron,
    testPrintWithSettings: typeof testPrintWithSettings,
    getPrinterElectron: typeof getPrinterElectron
});
