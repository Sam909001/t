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

    async printLabel(pkg, settings = {}) {
        if (!this.isConnected) {
            showAlert('Yazıcı servisi bağlı değil.', 'error');
            return false;
        }

        try {
            const { jsPDF } = window.jspdf;
            
            // ---------------- LABEL SIZE ----------------
            const labelWidth = 100; // 10 cm
            const labelHeight = 80; // 8 cm
            const doc = new jsPDF({ 
                unit: 'mm', 
                format: [labelWidth, labelHeight],
                compress: true // Enable compression for better performance
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // ---------------- FONT SETUP FOR TURKISH CHARACTERS ----------------
            // Use a font that supports Turkish characters
            doc.setFont("helvetica"); // Helvetica supports Turkish characters better than default
            
            // ---------------- CONTENT CONFIGURATION ----------------
            const margin = 5;
            let y = margin;
            
            // Apply user settings if available
            const userFontSize = settings.fontSize || 10;
            const userFontName = settings.fontName || 'helvetica';
            
            // ---------------- HEADER SECTION ----------------
            doc.setFont(userFontName, "bold");
            doc.setFontSize(userFontSize + 2); // Slightly larger for header
            
            // Turkish text with proper encoding
            const headerText = 'Yeditepe Laundry';
            const headerWidth = doc.getTextWidth(headerText);
            doc.text(headerText, (pageWidth - headerWidth) / 2, y);
            y += 8;

            // Divider line
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;

            // ---------------- PACKAGE INFORMATION SECTION ----------------
            doc.setFont(userFontName, "normal");
            doc.setFontSize(userFontSize);
            
            // Format package information with Turkish characters
            const packageInfo = [
                `Paket No: ${pkg.package_no || 'Bilinmiyor'}`,
                `Müşteri: ${pkg.customer_name || 'Bilinmiyor'}`,
                `Ürün: ${pkg.product || 'Bilinmiyor'}`,
                `Tarih: ${pkg.created_at || new Date().toLocaleDateString('tr-TR')}`,
                `Adet: ${pkg.total_quantity || '1'}`
            ];

            // Calculate if we have enough space
            const lineHeight = 5;
            const infoHeight = packageInfo.length * lineHeight;
            const barcodeHeight = 25;
            const totalNeededHeight = y + infoHeight + 10 + barcodeHeight;
            
            // Adjust font size if content doesn't fit
            let currentFontSize = userFontSize;
            if (totalNeededHeight > pageHeight - margin) {
                currentFontSize = Math.max(8, userFontSize - 2);
                doc.setFontSize(currentFontSize);
            }

            // Print package information
            packageInfo.forEach(info => {
                if (y < pageHeight - margin - barcodeHeight - 10) {
                    doc.text(info, margin, y);
                    y += lineHeight;
                }
            });

            y += 3; // Space before barcode

            // ---------------- BARCODE SECTION ----------------
            if (y < pageHeight - barcodeHeight - margin) {
                const canvas = document.createElement('canvas');
                const packageNo = pkg.package_no || 'NO_BARCODE';
                
                // Ensure JsBarcode is available
                if (typeof JsBarcode !== 'undefined') {
                    try {
                        JsBarcode(canvas, packageNo, {
                            format: "CODE128",
                            lineColor: "#000",
                            width: 2,
                            height: barcodeHeight,
                            displayValue: true,
                            fontSize: currentFontSize,
                            font: "Arial", // Use Arial for barcode text to support Turkish
                            text: packageNo, // Explicitly set text
                            textMargin: 2,
                            margin: 0
                        });
                        
                        // Add barcode image to PDF
                        const barcodeWidth = 70; // Fixed width for barcode
                        const barcodeX = (pageWidth - barcodeWidth) / 2;
                        
                        if (canvas.width > 0 && canvas.height > 0) {
                            doc.addImage(canvas, 'PNG', barcodeX, y, barcodeWidth, barcodeHeight);
                        } else {
                            console.warn('Canvas is empty, drawing text instead');
                            doc.text(`BARCODE: ${packageNo}`, pageWidth / 2, y + barcodeHeight / 2, { align: 'center' });
                        }
                    } catch (barcodeError) {
                        console.error('Barcode generation error:', barcodeError);
                        doc.text(`BARCODE: ${packageNo}`, pageWidth / 2, y + barcodeHeight / 2, { align: 'center' });
                    }
                } else {
                    console.warn('JsBarcode not available, using text fallback');
                    doc.text(`BARCODE: ${packageNo}`, pageWidth / 2, y + barcodeHeight / 2, { align: 'center' });
                }
            }

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
            const msg = error.name === 'AbortError' ? 'İstek zaman aşımı. Sunucu yanıt vermiyor.' : error.message;
            showAlert(`Yazdırma hatası: ${msg}`, 'error');
            return false;
        }
    }

    // Test print function with settings
    async testPrint(settings = {}) {
        const testPackage = {
            package_no: 'TEST123456',
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
                total_quantity: '1' // You might want to extract this from your data
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
        showAlert(`✅ ${successCount} etiket başarıyla yazdırıldı!`, 'success');
    } else if (successCount > 0) {
        showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} hata oluştu.`, 'warning');
    } else {
        showAlert(`❌ Hiçbir etiket yazdırılamadı. ${errorCount} hata oluştu.`, 'error');
    }
}

// ================== TEST PRINT WITH SETTINGS ==================
async function testPrintWithSettings() {
    const printerInstance = getPrinter();
    if (!printerInstance) {
        showAlert('Yazıcı servisi başlatılamadı.', 'error');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    const testButton = document.getElementById('test-printer-yazdir');
    const originalText = testButton?.textContent;
    
    if (testButton) {
        testButton.disabled = true;
        testButton.textContent = 'Test Ediliyor...';
    }

    try {
        await printerInstance.testPrint(settings);
    } catch (error) {
        console.error('Test print error:', error);
        showAlert('Test yazdırma başarısız: ' + error.message, 'error');
    } finally {
        if (testButton) {
            testButton.disabled = false;
            testButton.textContent = originalText;
        }
    }
}

// ================== DOM EVENTS ==================
document.addEventListener('DOMContentLoaded', () => {
    initializePrinter();

    // Attach event listeners
    document.getElementById('print-button')?.addEventListener('click', printAllLabels);
    document.getElementById('printer-status')?.addEventListener('click', checkPrinterStatus);
    document.getElementById('test-printer-yazdir')?.addEventListener('click', testPrintWithSettings);

    // Update system status periodically
    checkSystemStatus();
    setInterval(checkSystemStatus, 30000); // Check every 30 seconds
});
