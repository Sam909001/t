const logoPath = 'laundry-logo.jpg';

// ================== ELECTRON PRINTER SERVICE ==================
class PrinterServiceElectron {
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
                width: 1.2,
                height: 25,
                displayValue: false,
                margin: 0
            });
            return svg.outerHTML;
        } catch (error) {
            console.error('Barcode generation error:', error);
            return `<div style="border:1px solid #000; padding:5px; text-align:center;">${barcodeText}</div>`;
        }
    }

    // ---------------- PRINT ALL LABELS ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("Yazdırılacak paket bulunamadı.");
            return false;
        }

        try {
            let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Barkod Etiketleri</title>
            <style>
                @page { size: 150mm 115mm portrait; margin:0; }
                body { width:150mm; height:115mm; margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#000; background:#fff; }
                .label { width:100%; height:100%; box-sizing:border-box; padding:10mm; display:flex; flex-direction:column; justify-content:space-between; border:4px solid #000; page-break-after:always; }
                .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5mm; padding-bottom:3mm; border-bottom:4px solid #000; }
                .company-info { flex:3; }
                .company-name { font-size:22px; font-weight:900; margin:0; line-height:1.1; letter-spacing:1px; }
                .company-subtitle { font-size:20px; font-weight:500; color:#666; margin:1mm 0 0 0; letter-spacing:0.5px; }
                .barcode-section { text-align:right; flex-shrink:0; }
                .barcode { max-width:40mm; height:20mm; }
                .barcode-text { font-size:17px; font-weight:700; margin-top:1mm; color:#000; font-family:'Courier New', monospace; letter-spacing:0.5px; }
                .customer-section { background:#000; color:#fff; padding:4mm; margin:3mm 0; text-align:center; border-radius:3mm; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
                .customer-name { font-size:22px; font-weight:700; margin:0; line-height:1.2; text-transform:uppercase; letter-spacing:0.5px; }
                .items-section { flex:1; margin:3mm 0; }
                .item-list { background:#fff; padding:3mm; border-radius:2mm; border:1px solid #000; }
                .item { display:flex; justify-content:space-between; align-items:center; padding:1.5mm 0; border-bottom:1px solid #000; font-size:18px; }
                .item:last-child { border-bottom:none; }
                .item-name { font-weight:600; }
                .item-qty { font-weight:700; color:#000; background:#fff; padding:1mm 2mm; border-radius:2mm; border:1px solid #000; font-size:15px; min-width:15mm; text-align:center; }
                .footer { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:3mm; border-top:2px solid #ddd; font-size:15px; color:#666; }
                .date-info { font-weight:500; }
            </style>
            </head><body>`;

            packages.forEach((pkg, i) => {
                const packageNo = pkg.package_no || `PKG-${Date.now()}-${i}`;
                const customerName = pkg.customer_name || 'Bilinmeyen Müşteri';
                const date = pkg.created_at || new Date().toLocaleDateString('tr-TR');
                const items = pkg.items || [pkg.product || 'Bilinmeyen Ürün'];
                const barcodeSVG = this.generateBarcodeSVG(packageNo, settings);

                htmlContent += `
                <div class="label">
                    <div class="header">
                        <div class="company-info">
                            <h1 class="company-name">YEDITEPE LAUNDRY</h1>
                            <p class="company-subtitle">Professional Laundry Services</p>
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
                    <div class="footer"><span class="date-info">${date}</span></div>
                </div>`;
            });

            htmlContent += `</body></html>`;

            if (window.electronAPI && window.electronAPI.printBarcode) {
                console.log('Sending print request to Electron...');
                return await window.electronAPI.printBarcode(htmlContent);
            } else {
                console.error('Electron API not available');
                this.fallbackPrint(htmlContent);
                return false;
            }

        } catch (error) {
            console.error("❌ Print error:", error);
            alert("Yazdırma hatası: " + error.message);
            return false;
        }
    }

    // ---------------- FALLBACK PRINT ----------------
    fallbackPrint(htmlContent) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                setTimeout(() => printWindow.close(), 1000);
            }, 500);
        }
    }

    // ---------------- TEST PRINT ----------------
    async testPrint(settings = {}) {
        const testPackage = {
            package_no: 'TEST123456',
            customer_name: 'Test Müşteri',
            items: [
                { name: 'Büyük Çarşaf', qty: 2 },
                { name: 'Havlu', qty: 5 }
            ],
            created_at: new Date().toLocaleDateString('tr-TR')
        };
        return await this.printAllLabels([testPackage], settings);
    }

    // ---------------- PRINT SINGLE LABEL ----------------
    async printLabel(pkg) {
        return await this.printAllLabels([pkg]);
    }
}

// ================== PRINTER INITIALIZATION ==================
let printerElectron = new PrinterServiceElectron();

function getPrinterElectron() {
    return printerElectron;
}

// ================== USAGE FUNCTIONS ==================
async function printSelectedElectron() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('En az bir paket seçin');
        return;
    }

    const packages = Array.from(checkboxes).map((checkbox, i) => {
        const row = checkbox.closest('tr');
        const productText = row.cells[3]?.textContent?.trim() || 'Bilinmeyen Ürün';
        return {
            package_no: row.cells[1]?.textContent?.trim() || `PKG-${Date.now()}-${i}`,
            customer_name: row.cells[2]?.textContent?.trim() || 'Bilinmeyen Müşteri',
            items: [{ name: productText, qty: 1 }],
            created_at: row.cells[4]?.textContent?.trim() || new Date().toLocaleDateString('tr-TR')
        };
    });

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.printAllLabels(packages, settings);
}

async function testPrintWithSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    await printerElectron.testPrint(settings);
}

// ================== ATTACH BUTTON CLICK AFTER DOM ==================
document.addEventListener('DOMContentLoaded', () => {
    const printBtn = document.getElementById('printSelectedElectronBtn');
    if (printBtn) printBtn.addEventListener('click', printSelectedElectron);
});

// ================== EXPORT / GLOBAL ==================
window.printSelectedElectron = printSelectedElectron;
window.testPrintWithSettings = testPrintWithSettings;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrinterServiceElectron, getPrinterElectron };
}
