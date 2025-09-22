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
            const response = await fetch(`${this.serverUrl}/api/test`, { 
                signal: AbortSignal.timeout(5000) 
            });
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

    // Helper function to sanitize barcode text
    sanitizeBarcodeText(text) {
        // Replace Turkish characters with their ASCII equivalents for barcode
        const replacements = {
            'ı': 'i', 'İ': 'I',
            'ğ': 'g', 'Ğ': 'G',
            'ü': 'u', 'Ü': 'U',
            'ş': 's', 'Ş': 'S',
            'ö': 'o', 'Ö': 'O',
            'ç': 'c', 'Ç': 'C'
        };
        
        return text.replace(/[ıİğĞüÜşŞöÖçÇ]/g, char => replacements[char] || char);
    }

    async printLabel(pkg, settings = {}) {
    if (!this.isConnected) {
        console.warn('Yazıcı servisi bağlı değil, atlanıyor.');
        return false; // bypass error
    }

    try {
        const { jsPDF } = window.jspdf;

        // Label size: 10x8cm
        const labelWidth = 100;
        const labelHeight = 80;
        const doc = new jsPDF({ unit: 'mm', format: [labelWidth, labelHeight], compress: true });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 2; // very small margin
        let y = margin;

        // ---------------- HEADER ----------------
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('YEDITEPE LAUNDRY', pageWidth / 2, y, { align: 'center' });
        y += 6;

        // underline
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        // ---------------- PACKAGE INFO ----------------
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const infoLines = [
            `Müşteri: ${pkg.customer_name || 'Bilinmiyor'}`,
            `Ürün: ${pkg.product || 'Bilinmiyor'}`,
            `Tarih: ${pkg.created_at || new Date().toLocaleDateString('tr-TR')}`
        ];

        infoLines.forEach(line => {
            const splitText = doc.splitTextToSize(line, pageWidth - 2 * margin);
            splitText.forEach(splitLine => {
                doc.text(splitLine, margin, y);
                y += 5;
            });
        });

        y += 2;

        // ---------------- BARCODE ----------------
        const packageNo = pkg.package_no || 'NO_BARCODE';
        const sanitized = this.sanitizeBarcodeText(packageNo);
        const canvas = document.createElement('canvas');

        try {
            JsBarcode(canvas, sanitized, {
                format: 'CODE128',
                width: 1.8,
                height: 25,
                displayValue: false,
                margin: 0,
                textMargin: 0
            });
            const barcodeWidth = 55;
            const barcodeHeight = 15;
            const barcodeX = (pageWidth - barcodeWidth) / 2;

            if (y + barcodeHeight + 5 < pageHeight - margin) {
                doc.addImage(canvas.toDataURL('image/png'), 'PNG', barcodeX, y, barcodeWidth, barcodeHeight);
                y += barcodeHeight + 3;
                doc.setFontSize(9);
                doc.text(packageNo, pageWidth / 2, y, { align: 'center' });
            }
        } catch (barcodeError) {
            console.warn('Barcode error bypassed:', barcodeError);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(packageNo, pageWidth / 2, y, { align: 'center' });
            y += 5;
        }

        // ---------------- BORDER ----------------
        doc.setLineWidth(0.5);
        doc.rect(1, 1, labelWidth - 2, labelHeight - 2);

        // ---------------- SEND TO PRINTER ----------------
        const pdfBase64 = doc.output('datauristring');
        try {
            const response = await fetch(`${this.serverUrl}/api/print/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfData: pdfBase64,
                    copies: settings.copies || 1,
                    scaling: 'none', // no scaling
                    centered: false   // start from top-left
                }),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                console.warn('Printer server returned non-OK status:', response.status);
                return false;
            }

            const result = await response.json().catch(() => ({ success: false }));
            return result.success || false;

        } catch (fetchError) {
            console.warn('Printer request failed, bypassed:', fetchError);
            return false; // bypass error
        }

    } catch (error) {
        console.error('PrintLabel error bypassed:', error);
        return false; // bypass error
    }
}



    
    // Test print function with settings
    async testPrint(settings = {}) {
        const testPackage = {
            package_no: 'TEST123456ÇŞĞİÖÜ',
            customer_name: 'Test Müşteri - ÇŞĞİÖÜ',
            product: 'Test Ürün - çşğıöü',
            created_at: new Date().toLocaleDateString('tr-TR'),
            total_quantity: '5'
        };

        console.log('🧪 Testing printer with Turkish characters...');
        return await this.printLabel(testPackage, settings);
    }
}

// ================== PRINTER INITIALIZATION ==================
function initializePrinter() {
    if (!printer) {
        printer = new PrinterService();
    }
    return printer;
}

function getPrinter() {
    return printer || initializePrinter();
}

// ================== SYSTEM STATUS ==================
function checkSystemStatus() {
    // Database status
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (typeof supabase !== 'undefined' && supabase) {
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
        showAlert('Yazıcı bağlı ✅', 'success');
    } else {
        showAlert('Yazıcı bağlı değil ❌', 'error');
    }
}

// ================== PRINT ALL LABELS ==================
async function printAllLabels() {
    const printerInstance = getPrinter();
    if (!printerInstance) {
        showAlert('Yazıcı servisi başlatılamadı.', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Etiket yazdırmak için en az bir paket seçin', 'error');
        return;
    }

    // Load user settings
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    let successCount = 0;
    let errorCount = 0;

    showAlert(`${checkboxes.length} paket etiketi yazdırılıyor...`, 'info', 5000);

    for (let i = 0; i < checkboxes.length; i++) {
        const checkbox = checkboxes[i];
        const row = checkbox.closest('tr');
        
        if (!row) {
            errorCount++;
            continue;
        }

        try {
            // Extract package data from table row
            const pkg = {
                package_no: row.cells[1]?.textContent?.trim() || `PKG-${Date.now()}-${i}`,
                customer_name: row.cells[2]?.textContent?.trim() || 'Bilinmeyen Müşteri',
                product: row.cells[3]?.textContent?.trim() || 'Bilinmeyen Ürün',
                created_at: row.cells[4]?.textContent?.trim() || new Date().toLocaleDateString('tr-TR'),
                total_quantity: '1'
            };

            // Try to print label, bypass errors
            const result = await printerInstance.printLabel(pkg, settings);

            if (result) {
                successCount++;
                row.style.backgroundColor = '#e8f5e8'; // green feedback
            } else {
                errorCount++;
                row.style.backgroundColor = '#ffebee'; // red feedback
            }

            // Reset row background after short delay
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 2000);

            // Small delay to avoid overwhelming the printer
            if (i < checkboxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }

        } catch (error) {
            console.warn(`Label ${i + 1} printing bypassed due to error:`, error);
            errorCount++;
        }
    }

    // ---------------- SHOW FINAL RESULT ----------------
    if (successCount > 0 && errorCount === 0) {
        showAlert(`✅ Tüm etiketler başarıyla yazdırıldı (${successCount} adet)`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} etiket başarısız`, 'warning');
    } else {
        showAlert(`❌ Hiçbir etiket yazdırılamadı (${errorCount} hata)`, 'error');
    }
}
