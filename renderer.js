const db = require('./db'); // your local database module

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
                        body { 
                            margin: 0; 
                            padding: 20px; 
                            font-family: Arial, sans-serif;
                            text-align: center;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                        }
                        svg { 
                            display: block; 
                            margin: 0 auto;
                            max-width: 100%;
                            height: auto;
                        }
                        @media print {
                            body { 
                                margin: 0;
                                padding: 10mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div>${barcodeArea.innerHTML}</div>
                </body>
            </html>
        `;

        console.log('Sending print request...');
        const success = await window.electronAPI.printBarcode(printHTML);
        
        if (success) {
            console.log('Print completed successfully');
            // Optional: Show success message
            showToast('Etiket yazdırıldı!', 'success');
        } else {
            console.error('Print returned false');
            alert('Yazdırma başarısız oldu! Lütfen yazıcıyı kontrol edin.');
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

// Add toast notification function
function showToast(message, type = 'info') {
    // You can implement a toast notification here
    console.log(`${type}: ${message}`);
}

// Test function to check if electronAPI is available
function testElectronAPI() {
    console.log('Testing electronAPI...');
    console.log('window.electronAPI:', window.electronAPI);
    console.log('window.electronAPI.printBarcode:', window.electronAPI?.printBarcode);
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(testElectronAPI, 1000);
});
