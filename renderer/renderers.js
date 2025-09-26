const db = require('./db'); /// your local database module

// =========================
// Electron Direct Printing
// =========================

// Grab the print button and barcode input
// renderer.js

const barcodeInput = document.getElementById('barcodeInput');
const barcodeSearchBtn = document.getElementById('barcodeSearchBtn');
const printBtn = document.getElementById('printBarcodeBtn');
const barcodeArea = document.getElementById('barcode-area');

// ---------------- Process Barcode ----------------
function processBarcode() {
    const value = barcodeInput.value.trim();
    if (!value) return;

    // Clear previous content
    barcodeArea.innerHTML = '';

    // Generate barcode using JsBarcode
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, { format: "CODE128", width: 2, height: 50 });
    barcodeArea.appendChild(svg);

    // Optional: auto-print on scan
    window.electronAPI.printBarcode(`
        <html>
            <head><title>Barcode</title></head>
            <body>${barcodeArea.outerHTML}</body>
        </html>
    `);

    // Clear input
    barcodeInput.value = '';
}

// ---------------- Event listeners ----------------
barcodeSearchBtn.addEventListener('click', processBarcode);

barcodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processBarcode();
});

printBtn.addEventListener('click', async () => {
    if (!barcodeArea.innerHTML) {
        alert('Barkod yok!');
        return;
    }

    // Show loading state
    const originalText = printBtn.innerHTML;
    printBtn.disabled = true;
    printBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yazdırılıyor...';

    try {
        // Create a clean HTML for printing
        const printHTML = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Barkod Etiketi</title>
                    <style>
                        @media print {
                            body { 
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            svg { 
                                display: block !important;
                                margin: 0 auto !important;
                                max-width: 100% !important;
                                height: auto !important;
                            }
                        }
                        body { 
                            margin: 0;
                            padding: 10mm;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                        }
                    </style>
                </head>
                <body>
                    ${barcodeArea.innerHTML}
                </body>
            </html>
        `;

        console.log('Starting print process...');
        const success = await window.electronAPI.printBarcode(printHTML);
        
        if (success) {
            console.log('Print completed successfully');
        } else {
            alert('Yazdırma başarısız oldu! Yazıcıyı kontrol edin.');
        }
        
    } catch (error) {
        console.error('Print error:', error);
        alert('Yazdırma hatası: ' + error.message);
    } finally {
        // Reset button state
        printBtn.disabled = false;
        printBtn.innerHTML = originalText;
    }
});
