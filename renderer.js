// Remove old db/addUser example if not needed
// const db = require('./db');
// document.getElementById('addBtn').onclick = ...

// Barcode processing and one-click print
function processBarcode() {
    const input = document.getElementById('barcodeInput');
    const barcodeArea = document.getElementById('barcode-area');
    const value = input.value.trim();
    if (!value) return;

    // Add barcode to display
    const div = document.createElement('div');
    div.textContent = value;
    barcodeArea.appendChild(div);

    input.value = '';
    input.focus();

    // Prepare HTML for printing
    const printHTML = `
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    div { margin-bottom: 5px; font-size: 14px; }
                </style>
            </head>
            <body>
                ${barcodeArea.innerHTML}
            </body>
        </html>
    `;

    // Send to Electron main process
    window.electronAPI.printBarcode(printHTML);
}

// Optional: handle Enter key
document.getElementById('barcodeInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') processBarcode();
});
