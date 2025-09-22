// ================== GLOBAL VARIABLES ==================
let printer = null;

// ================== PRINTER SERVICE CLASS ==================
class PrinterService {
    constructor(serverUrl = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        console.log('🖨️ Initializing printer service...');
        this.checkConnection();
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/test`, { signal: AbortSignal.timeout(5000) });
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('Server returned HTML instead of JSON.');
            }

            const data = await response.json();

            if (response.ok) {
                this.isConnected = true;
                this.retryCount = 0;
                this.updateStatus('connected', '✅ Printer server connected');
                console.log('✅ Printer server connected:', data);
            } else {
                this.isConnected = false;
                this.updateStatus('error', '❌ Server responded with error');
            }
        } catch (error) {
            this.isConnected = false;
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.warn(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.checkConnection(), 2000);
            } else {
                const errorMsg = error.name === 'AbortError' ? 'Connection timeout. Server not responding.' : error.message;
                this.updateStatus('error', `❌ Printer server error: ${errorMsg}`);
                console.error('❌ Printer server error:', error);
            }
        }
    }

    updateStatus(status, message) {
        const indicator = document.getElementById('printer-indicator');
        const text = document.getElementById('printer-text');
        if (indicator && text) {
            indicator.textContent = status === 'connected' ? '🟢' : '🔴';
            text.textContent = message;
        }
        console.log(`Printer status: ${status} - ${message}`);
    }

    async printLabel(pkg, settings = {}) {
        if (!this.isConnected) {
            showAlert('Yazıcı servisi bağlı değil.', 'error');
            return false;
        }

        try {
            const { jsPDF } = window.jspdf;
// ---------------- LABEL SIZE ----------------
// ---------------- LABEL SIZE ----------------
const labelWidth = 100; // 10 cm
const labelHeight = 80; // 8 cm
const doc = new jsPDF({
    unit: 'mm',
    format: [labelWidth, labelHeight],
    orientation: 'portrait'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();

// ---------------- FONT SETUP ----------------
if (settings.base64Font) {
    doc.addFileToVFS("Roboto-Regular.ttf", settings.base64Font);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
}

// ---------------- HEADER + INFO ----------------
const headerText = 'Yeditepe Laundry';
const headerFontSize = 14;
const infoLines = [
    `Müşteri: ${pkg.customer_name || 'Bilinmiyor'}`,
    `Ürün: ${pkg.product || 'Bilinmiyor'}`,
    `Tarih: ${pkg.created_at || new Date().toLocaleDateString()}`
];
const infoFontSize = 12;
const lineSpacing = 6;
const spacingBeforeBarcode = 4;

// ---------------- BARCODE ----------------
const canvas = document.createElement('canvas');
const packageNo = pkg.package_no || 'NO_BARCODE';
JsBarcode(canvas, packageNo, {
    format: "CODE128",
    lineColor: "#000",
    width: 2,
    height: 35,
    displayValue: true,
    fontSize: 12,
    margin: 0
});
const barcodeWidth = 70; // 7 cm
const barcodeHeight = 35;

// ---------------- TOTAL HEIGHT ----------------
const totalContentHeight = headerFontSize + (infoLines.length * lineSpacing) + spacingBeforeBarcode + barcodeHeight;

// ---------------- START Y ----------------
let y = (pageHeight - totalContentHeight) / 2;

// ---------------- DRAW HEADER ----------------
doc.setFont("Roboto", "bold");
doc.setFontSize(headerFontSize);
doc.text(headerText, pageWidth / 2, y, { align: 'center' });
y += headerFontSize + 2;

// ---------------- DRAW INFO ----------------
doc.setFont("Roboto", "normal");
doc.setFontSize(infoFontSize);
infoLines.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += lineSpacing;
});

y += spacingBeforeBarcode;

// ---------------- DRAW BARCODE ----------------
doc.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - barcodeWidth) / 2, y, barcodeWidth, barcodeHeight);


// Start Y so that everything is vertically centered
let y = (pageHeight - totalContentHeight) / 2;

// ---------------- DRAW HEADER ----------------
doc.setFont("Roboto", "bold");
doc.setFontSize(headerFontSize);
doc.text(headerText, pageWidth / 2, y, { align: 'center' });
y += headerFontSize + 2;

// ---------------- DRAW PACKAGE INFO ----------------
doc.setFont("Roboto", "normal");
doc.setFontSize(infoFontSize);
infoLines.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += lineSpacing;
});

y += spacingBeforeBarcode;

// ---------------- DRAW BARCODE ----------------
doc.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - barcodeWidth) / 2, y, barcodeWidth, barcodeHeight);


            // ---------------- SEND TO PRINTER ----------------
            const pdfBase64 = doc.output('datauristring');
            const response = await fetch(`${this.serverUrl}/api/print/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfData: pdfBase64,
                    copies: settings.copies || 1,
                    scaling: settings.printerScaling || '100%'
                }),
                signal: AbortSignal.timeout(15000)
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const htmlResponse = await response.text();
                console.error('Server returned HTML:', htmlResponse.substring(0, 500));
                throw new Error('Server returned HTML instead of JSON.');
            }

            const result = await response.json();
            if (result.success) {
                console.log(`✅ Label printed: ${packageNo}`);
                return true;
            } else {
                console.error(`❌ Print failed: ${result.error}`);
                showAlert(`Yazdırma hatası: ${result.error}`, 'error');
                return false;
            }

        } catch (error) {
            console.error('❌ Print error:', error);
            const msg = error.name === 'AbortError' ? 'İstek zaman aşımı. Sunucu yanıt vermiyor.' : error.message;
            showAlert(`Yazdırma hatası: ${msg}`, 'error');
            return false;
        }
    }
}

// ================== PRINTER INITIALIZATION ==================
function initializePrinter() {
    if (!printer) printer = new PrinterService();
    return printer;
}

function getPrinter() {
    return printer || initializePrinter();
}

// ================== SYSTEM STATUS ==================
function checkSystemStatus() {
    // Database status
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (typeof supabase !== 'undefined') {
        dbStatus.textContent = 'Bağlı';
        dbStatus.className = 'status-indicator connected';
    } else {
        dbStatus.textContent = 'Bağlantı Yok';
        dbStatus.className = 'status-indicator disconnected';
    }

    // Printer status
    const printerStatus = document.getElementById('printerConnectionStatus');
    const printerInstance = getPrinter();
    if (printerInstance && printerInstance.isConnected) {
        printerStatus.textContent = 'Bağlı';
        printerStatus.className = 'status-indicator connected';
    } else {
        printerStatus.textContent = 'Bağlantı Yok';
        printerStatus.className = 'status-indicator disconnected';
    }
}

// ================== CHECK PRINTER STATUS ==================
function checkPrinterStatus() {
    const printerInstance = getPrinter();
    if (printerInstance && printerInstance.isConnected) {
        alert('Printer bağlı ✅');
    } else {
        alert('Printer bağlı değil ❌');
    }
}

// ================== PRINT ALL LABELS ==================
async function printAllLabels() {
    const printerInstance = getPrinter();
    if (!printerInstance) return showAlert('Yazıcı servisi başlatılamadı.', 'error');

    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return showAlert('Etiket yazdırmak için en az bir paket seçin', 'error');

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    let success = 0, error = 0;

    showAlert(`${checkboxes.length} paket etiketi yazdırılıyor...`, 'info', 5000);

    for (let i = 0; i < checkboxes.length; i++) {
        const row = checkboxes[i].closest('tr');
        if (!row) { error++; continue; }

        const pkg = {
            package_no: row.cells[1]?.textContent?.trim() || 'NO_BARCODE',
            customer_name: row.cells[2]?.textContent?.trim() || 'Bilinmiyor',
            product: row.cells[3]?.textContent?.trim() || 'Bilinmiyor',
            created_at: row.cells[4]?.textContent?.trim() || new Date().toLocaleDateString()
        };

        const dynamicSettings = {
            ...settings,
            fontSize: settings.fontSize || Math.max(10, settings.labelWidth / 10),
            headerFontSize: settings.headerFontSize || Math.max(12, settings.labelWidth / 8),
            barcodeHeight: settings.barcodeHeight || (settings.labelHeight / 3),
            barcodePrintWidth: settings.barcodePrintWidth || (settings.labelWidth * 0.8)
        };

        const result = await printerInstance.printLabel(pkg, dynamicSettings);

        if (result) {
            success++;
            row.style.backgroundColor = '#e8f5e8';
            setTimeout(() => row.style.backgroundColor = '', 2000);
        } else {
            error++;
            row.style.backgroundColor = '#ffebee';
            setTimeout(() => row.style.backgroundColor = '', 2000);
        }

        if (i < checkboxes.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    if (success > 0 && error === 0) showAlert(`✅ ${success} etiket başarıyla yazdırıldı!`, 'success');
    else if (success > 0) showAlert(`⚠️ ${success} etiket yazdırıldı, ${error} hata oluştu.`, 'warning');
    else showAlert(`❌ Hiçbir etiket yazdırılamadı. ${error} hata oluştu.`, 'error');

    console.log(`Print job completed: ${success} success, ${error} errors`);
}

// ================== DOM EVENTS ==================
document.addEventListener('DOMContentLoaded', () => {
    initializePrinter();

    document.getElementById('print-button')?.addEventListener('click', printAllLabels);
    document.getElementById('printer-status')?.addEventListener('click', checkPrinterStatus);

    // Optional: update system status periodically
    checkSystemStatus();
    setInterval(checkSystemStatus, 5000);
});
