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
                throw new Error('Server returned HTML instead of JSON. Check server URL.');
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
            
            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.warn(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.checkConnection(), 2000);
            } else {
                const errorMsg = error.name === 'AbortError' 
                    ? 'Connection timeout. Server not responding.' 
                    : error.message;
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
    
    async printBarcode(barcode, text = '', packageInfo = null) {
        if (!this.isConnected) {
            console.error('❌ Printer not connected');
            showAlert('Yazıcı servisi bağlı değil. Lütfen Node.js sunucusunun çalıştığından emin olun.', 'error');
            return false;
        }
        
        try {
            console.log(`🖨️ Printing: ${barcode} - ${text}`);
            
            // Generate a professional PDF label (8x10 cm = 80x100 mm)
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ 
                unit: 'mm', 
                format: [70, 90], // 8x10 cm
                orientation: 'portrait'
            });
            
            // Set margins
            const margin = 5;
            let yPosition = margin;
            
            // Company header with larger font
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Yeditep Laundry', 40, yPosition, { align: 'center' });
            yPosition += 8;
            
            // Divider line
            doc.line(margin, yPosition, 80 - margin, yPosition);
            yPosition += 5;
            
            // Package info section
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            
            if (packageInfo) {
                // Customer name (truncate if too long)
                const customerName = packageInfo.customer_name || 'Müşteri';
                const truncatedCustomer = customerName.length > 25 ? customerName.substring(0, 22) + '...' : customerName;
                doc.text('MÜŞTERİ:', margin, yPosition);
                doc.setFont('helvetica', 'normal');
                doc.text(truncatedCustomer, 25, yPosition);
                yPosition += 5;
                
                // Product name (truncate if too long)
                doc.setFont('helvetica', 'bold');
                const productName = packageInfo.product || 'Ürün';
                const truncatedProduct = productName.length > 25 ? productName.substring(0, 22) + '...' : productName;
                doc.text('ÜRÜN:', margin, yPosition);
                doc.setFont('helvetica', 'normal');
                doc.text(truncatedProduct, 25, yPosition);
                yPosition += 5;
                
                // Date
                doc.setFont('helvetica', 'bold');
                const date = packageInfo.created_at ? new Date(packageInfo.created_at).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
                doc.text('TARİH:', margin, yPosition);
                doc.setFont('helvetica', 'normal');
                doc.text(date, 25, yPosition);
                yPosition += 5;
            }
            
            // Divider before barcode
            doc.line(margin, yPosition, 80 - margin, yPosition);
            yPosition += 5;
            
            // Large barcode
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, barcode, {
                format: "CODE128",
                width: 2.5, // Wider bars
                height: 30, // Taller barcode
                displayValue: false, // We'll add the number separately
                fontSize: 12,
                margin: 0
            });
            
            const barcodeDataUrl = canvas.toDataURL('image/png');
            doc.addImage(barcodeDataUrl, 'PNG', margin, yPosition, 70, 25); // Wider barcode
            yPosition += 28;
            
            // Barcode number below (centered)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(barcode, 40, yPosition, { align: 'center' });
            yPosition += 7;
            
            // Additional text if provided
            if (text) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                const truncatedText = text.length > 35 ? text.substring(0, 32) + '...' : text;
                doc.text(truncatedText, 40, yPosition, { align: 'center' });
                yPosition += 6;
            }
            
            // Footer with company info
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            
            // Convert to base64
            const pdfBase64 = doc.output('datauristring');
            
            // Send to PDF print endpoint
            const response = await fetch(`${this.serverUrl}/api/print/pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pdfData: pdfBase64,
                    copies: 1,
                    scaling: 'fit'
                }),
                signal: AbortSignal.timeout(15000) // 15 second timeout
            });
            
            // Check if response is HTML instead of JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const htmlResponse = await response.text();
                console.error('Server returned HTML:', htmlResponse.substring(0, 500));
                throw new Error('Server returned HTML instead of JSON. Check server endpoint.');
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Print successful: ${barcode}`);
                return true;
            } else {
                console.error(`❌ Print failed: ${result.error}`);
                showAlert(`❌ Yazdırma hatası: ${result.error}`, 'error');
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Print error:`, error);
            let userMessage = 'Yazdırma hatası: ';
            if (error.name === 'AbortError') {
                userMessage += 'İstek zaman aşımı. Sunucu yanıt vermiyor.';
            } else {
                userMessage += error.message;
            }
            showAlert(userMessage, 'error');
            return false;
        }
    }

    async testPrint(settings = null) {
    // Use passed settings or fallback to saved settings
    if (!settings) {
        settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    }

    const testBarcode = '123456789';
    const testText = `Test Etiketi - ${new Date().toLocaleTimeString('tr-TR')}`;

    // Create sample package info for test
    const testPackageInfo = {
        customer_name: 'Test Müşteri',
        product: 'Test Ürün',
        created_at: new Date().toISOString()
    };

    console.log('🧪 Testing printer with current user settings...', settings);

    // Prepare printing options based on settings
    const printOptions = {
        scaling: settings.printerScaling || '100%',
        copies: settings.copies || 1,
        fontName: settings.fontName || 'Arial',
        fontSize: settings.fontSize || 10,
        orientation: settings.orientation || 'portrait',
        marginTop: settings.marginTop !== undefined ? settings.marginTop : 5,
        marginBottom: settings.marginBottom !== undefined ? settings.marginBottom : 5
    };

    // Call your existing printBarcode function with options
    const result = await this.printBarcode(testBarcode, testText, testPackageInfo, printOptions);

    if (result) {
        showAlert('✅ Test yazdırma başarılı! Kullanıcı ayarları uygulandı.', 'success');
    } else {
        showAlert('❌ Test yazdırma başarısız!', 'error');
    }

    return result;
}



    
    
    async printPDFLabel(pkg) {
        if (!this.isConnected) {
            showAlert('Yazıcı servisi bağlı değil', 'error');
            return false;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: [100, 80] });

            doc.setFont(undefined, 'bold');
            doc.setFontSize(16);
            doc.text('ProClean', 5, 10);

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');

            let y = 20;
            doc.text(`Paket No: ${pkg.package_no}`, 5, y); y += 6;
            doc.text(`Müşteri: ${pkg.customer_name}`, 5, y); y += 6;
            doc.text(`Ürün: ${pkg.product}`, 5, y); y += 6;
            doc.text(`Tarih: ${pkg.created_at}`, 5, y); y += 10;

            const canvas = document.createElement('canvas');
            JsBarcode(canvas, pkg.package_no, {
                format: "CODE128",
                lineColor: "#000",
                width: 3,
                height: 25,
                displayValue: true,
                fontSize: 10,
                margin: 0
            });
            const barcodeDataUrl = canvas.toDataURL('image/png');
            doc.addImage(barcodeDataUrl, 'PNG', 5, y, 90, 25);

            const pdfBase64 = doc.output('datauristring');
            const res = await fetch(`${this.serverUrl}/api/print/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfData: pdfBase64, copies: 1 })
            });

            const result = await res.json();
            if (result.success) return true;
            else throw new Error(result.error || 'Bilinmeyen PDF yazdırma hatası');

        } catch (e) {
            console.error('❌ PDF yazdırma hatası:', e);
            showAlert(`❌ PDF yazdırma hatası: ${e.message}`, 'error');
            return false;
        }
    }
}

// ================== PRINTER FUNCTIONS ==================
function initializePrinter() {
    if (!printer) {
        console.log('📄 Initializing printer service...');
        printer = new PrinterService();
    }
    return printer;
}

function getPrinter() {
    if (!printer) {
        return initializePrinter();
    }
    return printer;
}

async function testPrinter(event) {
    console.log('🧪 Test printer button clicked');

    const printerInstance = getPrinter();

    // Use the clicked button
    const testBtn = event.currentTarget;
    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    testBtn.textContent = 'Test Ediliyor...';

    await printerInstance.testPrint();

    testBtn.disabled = false;
    testBtn.textContent = originalText;
}

// Attach listeners
document.addEventListener('DOMContentLoaded', () => {
    const btn1 = document.getElementById('test-printer');
    if (btn1) btn1.addEventListener('click', testPrinter);

    const btn2 = document.getElementById('test-printer-yazdir');
    if (btn2) btn2.addEventListener('click', testPrinter);
});





function checkPrinterStatus() {
    console.log('🔍 Checking printer status...');
    
    const printerInstance = getPrinter();
    
    if (!printerInstance) {
        console.log('❌ Printer not defined');
        showAlert('Yazıcı servisi başlatılamadı', 'error');
        return false;
    }
    
    console.log(`📊 Printer status:`, {
        defined: !!printerInstance,
        connected: printerInstance.isConnected,
        serverUrl: printerInstance.serverUrl
    });
    
    showAlert(`Yazıcı durumu: ${printerInstance.isConnected ? 'Bağlı' : 'Bağlı Değil'}`, 
              printerInstance.isConnected ? 'success' : 'error');
    
    return printerInstance.isConnected;
}

async function printAllLabels() {
    console.log('🚀 Starting printAllLabels function...');
    
    const printerInstance = getPrinter();
    
    if (!printerInstance) {
        console.error('❌ Printer service not initialized');
        showAlert('Yazıcı servisi başlatılamadı. Sayfayı yenileyin ve tekrar deneyin.', 'error');
        return;
    }
    
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    console.log(`📦 Found ${checkboxes.length} selected packages`);
    
    if (checkboxes.length === 0) {
        showAlert('Etiket yazdırmak için en az bir paket seçin', 'error');
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    showAlert(`${checkboxes.length} paket etiketi yazdırılıyor...`, 'info', 5000);

    for (let i = 0; i < checkboxes.length; i++) {
        const cb = checkboxes[i];
        
        try {
            const row = cb.closest('tr');
            if (!row) {
                console.warn(`⚠️ Row not found for checkbox ${i}`);
                errorCount++;
                continue;
            }

            const pkg = {
                package_no: row.cells[1]?.textContent?.trim() || 'NO_BARCODE',
                customer_name: row.cells[2]?.textContent?.trim() || 'NO_CUSTOMER', 
                product: row.cells[3]?.textContent?.trim() || 'NO_PRODUCT',
                created_at: row.cells[4]?.textContent?.trim() || new Date().toISOString()
            };

            console.log(`📦 Processing package ${i + 1}:`, pkg);

            const labelText = `${pkg.customer_name} - ${pkg.product}`;
            const barcode = pkg.package_no;

            // Pass the package info to include in the label
            const printResult = await printerInstance.printBarcode(barcode, labelText, pkg);

            if (printResult) {
                successCount++;
                console.log(`✅ Label ${i + 1} printed successfully`);
                
                // Visual feedback - mark row as printed
                row.style.backgroundColor = '#e8f5e8';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            } else {
                errorCount++;
                console.log(`❌ Failed to print label ${i + 1}`);
                
                // Visual feedback - mark row as error
                row.style.backgroundColor = '#ffebee';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            }

            // Delay between prints
            if (i < checkboxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

        } catch (error) {
            console.error(`❌ Error processing label ${i + 1}:`, error);
            errorCount++;
            continue;
        }
    }

    if (successCount > 0 && errorCount === 0) {
        showAlert(`✅ ${successCount} etiket başarıyla yazdırıldı!`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} hata oluştu.`, 'warning');
    } else {
        showAlert(`❌ Hiçbir etiket yazdırılamadı. ${errorCount} hata oluştu.`, 'error');
    }

    console.log(`Print job completed: ${successCount} success, ${errorCount} errors`);
}

// ================== INITIALIZATION ==================
function initializePrinterService() {
    setTimeout(() => {
        initializePrinter();
    }, 1000);
}

// ================== EVENT LISTENERS ==================
document.addEventListener('DOMContentLoaded', function() {
    initializePrinterService();
    
    // Add event listeners for printer buttons
    const testBtn = document.getElementById('test-printer');
    const printBtn = document.getElementById('print-button');
    const statusBtn = document.getElementById('printer-status');
    
    if (testBtn) testBtn.addEventListener('click', testPrinter);
    if (printBtn) printBtn.addEventListener('click', printAllLabels);
    if (statusBtn) statusBtn.addEventListener('click', checkPrinterStatus);
});
