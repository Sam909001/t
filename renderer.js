const db = require('./db'); // your local database module

// ------------------ Process Barcode ------------------
function processBarcode() {
    const input = document.getElementById('barcodeInput');
    const barcodeArea = document.getElementById('barcode-area');
    const value = input.value.trim();
    if (!value) return;

    // 1️⃣ Add barcode to UI
    const div = document.createElement('div');
    div.textContent = value;
    barcodeArea.appendChild(div);

    // 2️⃣ Save barcode to local DB
    db.addBarcode(value, (err) => {
        if (err) console.error('DB save error:', err);
        else console.log('Saved barcode:', value);
    });

    // 3️⃣ Prepare HTML for direct print
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

    // 4️⃣ Send to Electron main process for direct printing
    window.electronAPI.printBarcode(printHTML);

    // Reset input for next scan
    input.value = '';
    input.focus();
}

// ------------------ Handle Enter key ------------------
document.getElementById('barcodeInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') processBarcode();
});

// ------------------ Optional: Button click ------------------
document.querySelector('.barcode-input button').addEventListener('click', processBarcode);
