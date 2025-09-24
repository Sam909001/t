const db = require('./db'); // your local database module

// =========================
// Electron Direct Printing
// =========================

// Grab the print button and barcode input
const printBtn = document.getElementById('printBarcodeBtn');
const barcodeInput = document.getElementById('barcodeInput');
const barcodeArea = document.getElementById('barcode-area');

// Helper function to send HTML to Electron
function printBarcodeHTML(htmlContent) {
  window.electronAPI.printBarcode(`
    <html>
      <head>
        <title>Barcode</title>
      </head>
      <body>${htmlContent}</body>
    </html>
  `);
}

// -------------------------
// Print Button Click
// -------------------------
printBtn.addEventListener('click', () => {
  if (!barcodeArea || !barcodeArea.innerHTML.trim()) {
    alert('Yazdırılacak barkod bulunamadı!');
    return;
  }
  printBarcodeHTML(barcodeArea.outerHTML);
});

// -------------------------
// Barcode Input Enter Key
// -------------------------
barcodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();

    // Optional: generate barcode HTML if not already in barcodeArea
    const code = barcodeInput.value.trim();
    if (!code) return;

    barcodeArea.innerHTML = `<div style="font-size:16px; font-weight:bold;">${code}</div>`;

    printBarcodeHTML(barcodeArea.outerHTML);

    // Clear input
    barcodeInput.value = '';
  }
});

// -------------------------
// Process Barcode Function
// -------------------------
function processBarcode() {
  const code = barcodeInput.value.trim();
  if (!code) {
    alert('Barkod girin veya okutun!');
    return;
  }

  // Display in barcode area
  barcodeArea.innerHTML = `<div style="font-size:16px; font-weight:bold;">${code}</div>`;

  // Send directly to Electron
  printBarcodeHTML(barcodeArea.outerHTML);

  // Clear input
  barcodeInput.value = '';
}
