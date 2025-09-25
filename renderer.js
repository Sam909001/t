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

printBtn.addEventListener('click', () => {
    if (!barcodeArea.innerHTML) {
        alert('Barkod yok!');
        return;
    }

    // Create a cleaner HTML for printing
    const printHTML = `
        <html>
            <head>
                <title>Barkod Etiketi</title>
                <style>
                    body { 
                        margin: 0; 
                        padding: 10px; 
                        font-family: Arial, sans-serif;
                        text-align: center;
                    }
                    svg { 
                        display: block; 
                        margin: 0 auto;
                    }
                </style>
            </head>
            <body>
                ${barcodeArea.innerHTML}
            </body>
        </html>
    `;

    window.electronAPI.printBarcode(printHTML);
});
