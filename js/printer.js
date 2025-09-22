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
    



async printLabel(pkg, settings = null) {
    if (!this.isConnected) {
        console.error('❌ Printer not connected');
        showAlert('Yazıcı servisi bağlı değil. Lütfen Node.js sunucusunun çalıştığından emin olun.', 'error');
        return false;
    }

    // Load settings from localStorage if not passed
    if (!settings) {
        settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    }

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
        let yPosition = settings.marginTop !== undefined ? settings.marginTop : 8;

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
            if (pkg.customer_name) doc.text(`Müşteri: ${pkg.customer_name}`, 5, yPosition);
            yPosition += 6;
            if (pkg.product) doc.text(`Ürün: ${pkg.product}`, 5, yPosition);
            yPosition += 6;
            if (pkg.created_at) doc.text(`Tarih: ${pkg.created_at}`, 5, yPosition);
            yPosition += 10;
        }

        // --- Barcode ---
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, pkg.package_no, {
            format: "CODE128",
            lineColor: "#000",
            width: settings.barcodeWidthFactor || 2,   // user can tweak
            height: settings.barcodeHeight || 25,
            displayValue: true,
            fontSize: settings.barcodeFontSize || 10,
            margin: 0
        });
        const barcodeDataUrl = canvas.toDataURL('image/png');

        const barcodeWidth = settings.barcodePrintWidth || (pageWidth - 10); // almost full width
        doc.addImage(barcodeDataUrl, 'PNG', (pageWidth - barcodeWidth) / 2, yPosition, barcodeWidth, settings.barcodeHeight || 25);

        // --- Generate PDF base64 ---
        const pdfBase64 = doc.output('datauristring');

        // --- Send to printer ---
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
            throw new Error('Server returned HTML instead of JSON. Check server endpoint.');
        }

        const result = await response.json();
        if (result.success) {
            console.log(`✅ Print successful: ${pkg.package_no}`);
            return true;
        } else {
            console.error(`❌ Print failed: ${result.error}`);
            showAlert(`❌ Yazdırma hatası: ${result.error}`, 'error');
            return false;
        }

    } catch (error) {
        console.error('❌ Print error:', error);
        let userMessage = 'Yazdırma hatası: ';
        if (error.name === 'AbortError') userMessage += 'İstek zaman aşımı. Sunucu yanıt vermiyor.';
        else userMessage += error.message;
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

    // Load user settings once
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

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

            // Call the unified printLabel function with user settings
            const printResult = await printerInstance.printLabel(pkg, settings);

            if (printResult) {
                successCount++;
                console.log(`✅ Label ${i + 1} printed successfully`);
                
                // Visual feedback - mark row as printed
                row.style.backgroundColor = '#e8f5e8';
                setTimeout(() => row.style.backgroundColor = '', 2000);
            } else {
                errorCount++;
                console.log(`❌ Failed to print label ${i + 1}`);
                
                // Visual feedback - mark row as error
                row.style.backgroundColor = '#ffebee';
                setTimeout(() => row.style.backgroundColor = '', 2000);
            }

            // Delay between prints
            if (i < checkboxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

        } catch (error) {
            console.error(`❌ Error processing label ${i + 1}:`, error);
            errorCount++;
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
document.addEventListener('DOMContentLoaded', () => {
    initializePrinterService();

    // Buttons
    const testBtn = document.getElementById('test-printer');
    const testBtn2 = document.getElementById('test-printer-yazdir');
    const printBtn = document.getElementById('print-button');
    const statusBtn = document.getElementById('printer-status');

    if (testBtn) testBtn.addEventListener('click', testPrinter);
    if (testBtn2) testBtn2.addEventListener('click', testPrinter);
    if (printBtn) printBtn.addEventListener('click', printAllLabels);
    if (statusBtn) statusBtn.addEventListener('click', checkPrinterStatus);
});

