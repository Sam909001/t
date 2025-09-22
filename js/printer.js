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
            if (contentType && contentType.includes('text/html')) throw new Error('Server returned HTML instead of JSON.');

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

    // ================== PRINT LABEL ==================
    async printLabel(pkg, settings = null) {
        if (!this.isConnected) {
            showAlert('Yazıcı servisi bağlı değil. Lütfen Node.js sunucusunun çalıştığından emin olun.', 'error');
            return false;
        }

        if (!settings) settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

        try {
            const { jsPDF } = window.jspdf;

            // Label size
            const labelWidth = settings.labelWidth || 70;  // mm
            const labelHeight = settings.labelHeight || 90; // mm
            const doc = new jsPDF({
                unit: 'mm',
                format: [labelWidth, labelHeight],
                orientation: settings.orientation || 'portrait'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            let yPosition = settings.marginTop || 8;

            // --- Header ---
            const headerText = settings.headerText || 'Yeditep Laundry';
            doc.setFont(settings.fontName || 'helvetica', 'bold');
            doc.setFontSize(settings.headerFontSize || 12);
            doc.text(headerText, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += (settings.headerFontSize || 12) + 4;

            // --- Package info ---
            doc.setFont(settings.fontName || 'helvetica', 'normal');
            doc.setFontSize(settings.fontSize || 11);
            if (pkg) {
                const infoLines = [
                    `Müşteri: ${pkg.customer_name || ''}`,
                    `Ürün: ${pkg.product || ''}`,
                    `Tarih: ${pkg.created_at || ''}`
                ];
                infoLines.forEach(line => {
                    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
                    yPosition += 6;
                });
                yPosition += 4;
            }

            // --- Barcode ---
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, pkg.package_no, {
                format: "CODE128",
                lineColor: "#000",
                width: settings.barcodeWidthFactor || 2,
                height: settings.barcodeHeight || 25,
                displayValue: true,
                fontSize: settings.barcodeFontSize || 10,
                margin: 0
            });
            const barcodeDataUrl = canvas.toDataURL('image/png');
            const barcodeWidth = settings.barcodePrintWidth || (pageWidth - 10); // almost full width
            doc.addImage(barcodeDataUrl, 'PNG', (pageWidth - barcodeWidth) / 2, yPosition, barcodeWidth, settings.barcodeHeight || 25);

            // --- Generate PDF and send to server ---
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
                throw new Error('Server returned HTML instead of JSON: ' + htmlResponse.substring(0, 500));
            }

            const result = await response.json();
            if (result.success) {
                console.log(`✅ Print successful: ${pkg.package_no}`);
                return true;
            } else {
                showAlert(`❌ Yazdırma hatası: ${result.error}`, 'error');
                return false;
            }

        } catch (error) {
            console.error('❌ Print error:', error);
            const userMessage = error.name === 'AbortError'
                ? 'Yazdırma hatası: İstek zaman aşımı. Sunucu yanıt vermiyor.'
                : 'Yazdırma hatası: ' + error.message;
            showAlert(userMessage, 'error');
            return false;
        }
    }
}

// ================== PRINTER FUNCTIONS ==================
function initializePrinter() {
    if (!printer) printer = new PrinterService();
    return printer;
}

function getPrinter() {
    if (!printer) return initializePrinter();
    return printer;
}

async function printAllLabels() {
    console.log('🚀 Starting printAllLabels...');
    const printerInstance = getPrinter();
    if (!printerInstance) return showAlert('Yazıcı servisi başlatılamadı.', 'error');

    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (!checkboxes.length) return showAlert('Etiket yazdırmak için en az bir paket seçin', 'error');

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    let successCount = 0, errorCount = 0;

    showAlert(`${checkboxes.length} paket etiketi yazdırılıyor...`, 'info', 5000);

    for (let i = 0; i < checkboxes.length; i++) {
        const cb = checkboxes[i];
        const row = cb.closest('tr');
        if (!row) { errorCount++; continue; }

        const pkg = {
            package_no: row.cells[1]?.textContent?.trim() || 'NO_BARCODE',
            customer_name: row.cells[2]?.textContent?.trim() || 'NO_CUSTOMER',
            product: row.cells[3]?.textContent?.trim() || 'NO_PRODUCT',
            created_at: row.cells[4]?.textContent?.trim() || new Date().toISOString()
        };

        const printResult = await printerInstance.printLabel(pkg, settings);
        if (printResult) {
            successCount++;
            row.style.backgroundColor = '#e8f5e8';
            setTimeout(() => row.style.backgroundColor = '', 2000);
        } else {
            errorCount++;
            row.style.backgroundColor = '#ffebee';
            setTimeout(() => row.style.backgroundColor = '', 2000);
        }

        if (i < checkboxes.length - 1) await new Promise(res => setTimeout(res, 1500));
    }

    if (successCount && !errorCount) showAlert(`✅ ${successCount} etiket başarıyla yazdırıldı!`, 'success');
    else if (successCount && errorCount) showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} hata oluştu.`, 'warning');
    else showAlert(`❌ Hiçbir etiket yazdırılamadı. ${errorCount} hata oluştu.`, 'error');

    console.log(`Print job completed: ${successCount} success, ${errorCount} errors`);
}

// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', () => {
    initializePrinter();
    document.getElementById('print-button')?.addEventListener('click', printAllLabels);
});
