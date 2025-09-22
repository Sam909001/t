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
            showAlert('Yazıcı servisi bağlı değil.', 'error');
            return false;
        }

        try {
            const { jsPDF } = window.jspdf;

            // ---------------- EXACT LABEL SIZE: 10cm x 8cm ----------------
            const labelWidth = 100;  // 10cm in mm
            const labelHeight = 80;  // 8cm in mm
            
            const doc = new jsPDF({
                unit: 'mm',
                format: [labelWidth, labelHeight],
                compress: true
            });

            // ---------------- FONT SETUP FOR TURKISH CHARACTERS ----------------
            doc.setFont('helvetica', 'normal');
            
            // Set document properties
            doc.setProperties({
                title: 'Etiket',
                subject: 'Paket Etiketi',
                author: 'Yeditepe Laundry',
                keywords: 'etiket, paket',
                creator: 'Yeditepe Laundry System'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 3; // Smaller margin for 10x8cm
            let y = margin + 3;

            // ---------------- COMPANY HEADER ----------------
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const headerText = 'YEDITEPE LAUNDRY';
            doc.text(headerText, pageWidth / 2, y, { align: 'center' });
            y += 6;

            // Underline
            doc.setLineWidth(0.3);
            doc.line(margin + 5, y, pageWidth - margin - 5, y);
            y += 8;

            // ---------------- PACKAGE INFORMATION ----------------
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            const infoLines = [
                `Müşteri: ${pkg.customer_name || 'Bilinmiyor'}`,
                `Ürün: ${pkg.product || 'Bilinmiyor'}`,
                `Tarih: ${pkg.created_at || new Date().toLocaleDateString('tr-TR')}`
            ];

            const lineSpacing = 5;
            infoLines.forEach(line => {
                // Check if text fits within label width
                const textWidth = doc.getTextWidth(line);
                if (textWidth > (pageWidth - 2 * margin)) {
                    // Split long text into multiple lines
                    const splitText = doc.splitTextToSize(line, pageWidth - 2 * margin);
                    splitText.forEach(splitLine => {
                        doc.text(splitLine, margin, y);
                        y += lineSpacing;
                    });
                } else {
                    doc.text(line, margin, y);
                    y += lineSpacing;
                }
            });

            y += 3;

            // ---------------- BARCODE SECTION ----------------
            const packageNo = pkg.package_no || 'NO_BARCODE';
            const sanitizedPackageNo = this.sanitizeBarcodeText(packageNo);

            const canvas = document.createElement('canvas');
            try {
                JsBarcode(canvas, sanitizedPackageNo, {
                    format: 'CODE128',
                    lineColor: '#000',
                    width: 1.8, // Smaller width for 10x8cm
                    height: 25,  // Smaller height for 10x8cm
                    displayValue: false,
                    fontSize: 12,
                    margin: 0,
                    textMargin: 0
                });

                const barcodeWidth = 55; // Fit within 10cm width
                const barcodeHeight = 15; // Fit within 8cm height
                const barcodeX = (pageWidth - barcodeWidth) / 2;
                
                // Ensure barcode fits within remaining space
                if (y + barcodeHeight + 10 < pageHeight - margin) {
                    doc.addImage(canvas.toDataURL('image/png'), 'PNG', barcodeX, y, barcodeWidth, barcodeHeight);
                    y += barcodeHeight + 3;
                    
                    // Barcode number below
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.text(packageNo, pageWidth / 2, y, { align: 'center' });
                }

            } catch (barcodeError) {
                console.error('Barcode generation error:', barcodeError);
                // Fallback: just show package number
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(`Paket No: ${packageNo}`, pageWidth / 2, y, { align: 'center' });
            }

            // ---------------- BORDER FOR EXACT 10x8cm ----------------
            doc.setLineWidth(0.5);
            doc.rect(1, 1, labelWidth - 2, labelHeight - 2);

            // ---------------- SEND TO PRINTER ----------------
            const pdfBase64 = doc.output('datauristring');
            const response = await fetch(`${this.serverUrl}/api/print/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfData: pdfBase64,
                    copies: settings.copies || 1,
                    scaling: 'noscale', // No scaling to maintain exact 10x8cm
                    centered: true
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

            const result = await printerInstance.printLabel(pkg, settings);

            if (result) {
                successCount++;
                // Visual feedback
                row.style.backgroundColor = '#e8f5e8';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            } else {
                errorCount++;
                row.style.backgroundColor = '#ffebee';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            }

            // Small delay between prints to prevent overwhelming the printer
            if (i < checkboxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error) {
            console.error(`Error printing label ${i + 1}:`, error);
            errorCount++;
        }
    }

    // Show final result
    if (successCount > 0 && errorCount === 0) {
        showAlert(`✅ Tüm etiketler başarıyla yazdırıldı (${successCount} adet)`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} etiket başarısız`, 'warning');
    } else {
        showAlert(`❌ Hiçbir etiket yazdırılamadı (${errorCount} hata)`, 'error');
    }
}
