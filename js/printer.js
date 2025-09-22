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



      async testPrint(settings = null) {
        if (!settings) settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        const testPackageInfo = {
            package_no: '123456789',
            customer_name: 'Test Müşteri',
            product: 'Test Ürün',
            created_at: new Date().toISOString()
        };
        return await this.printLabel(testPackageInfo, settings);
    }
}



    // ================== PRINT LABEL ==================
 async printLabel(pkg, settings = null) {
    if (!this.isConnected) {
        showAlert('Yazıcı servisi bağlı değil.', 'error');
        return false;
    }

    if (!settings) {
        settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    }

    try {
        const { jsPDF } = window.jspdf;

        // ---------------- LABEL SIZE ----------------
        const labelWidth = settings.labelWidth || 100;  // mm
        const labelHeight = settings.labelHeight || 80; // mm
        const doc = new jsPDF({
            unit: 'mm',
            format: [labelWidth, labelHeight],
            orientation: settings.orientation || 'portrait'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = settings.marginTop !== undefined ? settings.marginTop : 8;

        // ---------------- FONT SETUP ----------------
        // Turkish-compatible font (Roboto example)
        // Make sure to replace <BASE64_FONT_STRING> with actual Base64 of your font
        doc.addFileToVFS("Roboto-Regular.ttf", "<BASE64_FONT_STRING>");
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto", "normal");
        doc.setFontSize(settings.fontSize || 12);

        // ---------------- HEADER ----------------
        const headerText = settings.headerText || 'Yeditep Laundry';
        doc.setFont("Roboto", "bold");
        doc.setFontSize(settings.headerFontSize || 14);
        doc.text(headerText, pageWidth / 2, y, { align: 'center' });
        y += (settings.headerFontSize || 14) + 6;

        // ---------------- PACKAGE INFO ----------------
        doc.setFont("Roboto", "normal");
        doc.setFontSize(settings.fontSize || 12);
        if (pkg) {
            const infoLines = [
                `Müşteri: ${pkg.customer_name || ''}`,
                `Ürün: ${pkg.product || ''}`,
                `Tarih: ${pkg.created_at || ''}`
            ];
            infoLines.forEach(line => {
                doc.text(line, pageWidth / 2, y, { align: 'center' });
                y += 6;
            });
            y += 4; // spacing before barcode
        }

        // ---------------- BARCODE ----------------
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, pkg.package_no, {
            format: "CODE128",
            lineColor: "#000",
            width: settings.barcodeWidthFactor || 2,
            height: settings.barcodeHeight || 35,
            displayValue: true,
            fontSize: settings.barcodeFontSize || 12,
            margin: 0
        });

        const barcodeDataUrl = canvas.toDataURL('image/png');
        const barcodeWidth = settings.barcodePrintWidth || (pageWidth * 0.8);
        doc.addImage(barcodeDataUrl, 'PNG', (pageWidth - barcodeWidth) / 2, y, barcodeWidth, settings.barcodeHeight || 35);

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
            console.log(`✅ Label printed: ${pkg.package_no}`);
            return true;
        } else {
            console.error(`❌ Print failed: ${result.error}`);
            showAlert(`Yazdırma hatası: ${result.error}`, 'error');
            return false;
        }

    } catch (error) {
        console.error('❌ Print error:', error);
        const msg = error.name === 'AbortError'
            ? 'İstek zaman aşımı. Sunucu yanıt vermiyor.'
            : error.message;
        showAlert(`Yazdırma hatası: ${msg}`, 'error');
        return false;
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
    const printerInstance = getPrinter();
    if (!printerInstance) return showAlert('Yazıcı servisi başlatılamadı.', 'error');

    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return showAlert('Etiket yazdırmak için en az bir paket seçin', 'error');

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    let success = 0, error = 0;

    showAlert(`${checkboxes.length} paket etiketi yazdırılıyor...`, 'info', 5000);

    // Loop through selected packages
    for (let i = 0; i < checkboxes.length; i++) {
        const row = checkboxes[i].closest('tr');
        if (!row) { error++; continue; }

        const pkg = {
            package_no: row.cells[1]?.textContent?.trim() || 'NO_BARCODE',
            customer_name: row.cells[2]?.textContent?.trim() || 'NO_CUSTOMER',
            product: row.cells[3]?.textContent?.trim() || 'NO_PRODUCT',
            created_at: row.cells[4]?.textContent?.trim() || new Date().toISOString()
        };

        // Adjust settings dynamically for each label if needed
        const dynamicSettings = {
            ...settings,
            // Optionally scale font and barcode based on label size
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

        // Optional: small delay between prints to prevent printer overload
        if (i < checkboxes.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    // Final alert
    if (success > 0 && error === 0) showAlert(`✅ ${success} etiket başarıyla yazdırıldı!`, 'success');
    else if (success > 0) showAlert(`⚠️ ${success} etiket yazdırıldı, ${error} hata oluştu.`, 'warning');
    else showAlert(`❌ Hiçbir etiket yazdırılamadı. ${error} hata oluştu.`, 'error');

    console.log(`Print job completed: ${success} success, ${error} errors`);
}




// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', () => {
    initializePrinter();

    const printBtn = document.getElementById('print-button');
    if (printBtn) {
        printBtn.addEventListener('click', async () => {
            try {
                await printAllLabels();
            } catch (e) {
                console.error('❌ printAllLabels failed:', e);
                showAlert('Etiket yazdırılırken bir hata oluştu.', 'error');
            }
        });
    }
});
