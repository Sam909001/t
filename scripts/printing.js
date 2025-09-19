// ================== Printer Service Class ==================
class PrinterService {
    constructor(serverUrl = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
        this.isConnected = false;
        console.log('🖨️ Initializing printer service...');
        this.checkConnection();
    }
    
    async checkConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/test`);
            const data = await response.json();
            
            if (response.ok) {
                this.isConnected = true;
                this.updateStatus('connected', '✅ Printer server connected');
                console.log('✅ Printer server connected:', data);
            } else {
                this.isConnected = false;
                this.updateStatus('error', '❌ Server responded with error');
            }
        } catch (error) {
            this.isConnected = false;
            this.updateStatus('error', '❌ Printer server not found');
            console.error('❌ Printer server error:', error);
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
    
    async printBarcode(barcode, text = '') {
        if (!this.isConnected) {
            console.error('❌ Printer not connected');
            // Check if showAlert function exists globally before calling it
            if (typeof showAlert === 'function') {
                showAlert('Printer server is not connected. Please check if the Node.js server is running.', 'error');
            }
            return false;
        }
        
        try {
            console.log(`🖨️ Printing: ${barcode} - ${text}`);
            
            const response = await fetch(`${this.serverUrl}/api/print/barcode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    barcode: barcode,
                    text: text,
                    copies: 1
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Print successful: ${barcode}`);
                return true;
            } else {
                console.error(`❌ Print failed: ${result.error}`);
                if (typeof showAlert === 'function') {
                    showAlert(`❌ Print failed: ${result.error}`, 'error');
                }
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Print error:`, error);
            if (typeof showAlert === 'function') {
                showAlert(`❌ Print error: ${error.message}`, 'error');
            }
            return false;
        }
    }

    // Add testPrint method to PrinterService class
    async testPrint() {
        const testBarcode = '123456789';
        const testText = `Test - ${new Date().toLocaleTimeString()}`;
        console.log('🧪 Testing printer...');
        const result = await this.printBarcode(testBarcode, testText);
        
        if (typeof showAlert === 'function') {
            if (result) {
                showAlert('✅ Test print successful!', 'success');
            } else {
                showAlert('❌ Test print failed!', 'error');
            }
        }
        
        return result;
    }

    // ----------------- PDF Printing -----------------
    async printPDFLabel(pkg) {
        if (!this.isConnected) {
            // FIX: The original code used `this.showAlert`, which is not a method of this class.
            // It should call the global `showAlert` function.
            if (typeof showAlert === 'function') {
                showAlert('Printer server is not connected', 'error');
            }
            return false;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: [100, 80] }); // 10x8 cm

            // Thicker fonts
            doc.setFont(undefined, 'bold');
            doc.setFontSize(16);
            doc.text('ProClean', 5, 10);

            // Package info
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');

            let y = 20;
            doc.text(`Package No: ${pkg.package_no}`, 5, y); y += 6;
            doc.text(`Customer: ${pkg.customer_name}`, 5, y); y += 6;
            doc.text(`Product: ${pkg.product}`, 5, y); y += 6;
            doc.text(`Date: ${pkg.created_at}`, 5, y); y += 10;

            // Barcode
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
            doc.addImage(barcodeDataUrl, 'PNG', 5, y, 90, 25); // fit in page

            const pdfBase64 = doc.output('datauristring');
            const res = await fetch(`${this.serverUrl}/api/print/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfData: pdfBase64, copies: 1 })
            });

            const result = await res.json();
            if (result.success) return true;
            else throw new Error(result.error || 'Unknown PDF print error');

        } catch (e) {
            console.error('❌ PDF print failed:', e);
            if (typeof showAlert === 'function') {
                showAlert(`❌ PDF print failed: ${e.message}`, 'error');
            }
            return false;
        }
    }
}

// Initialize printer service
let printer = null;

// Test printer function
async function testPrinter() {
    console.log('🧪 Test printer button clicked');
    
    if (!printer) {
        console.log('⚠️ Printer not initialized, trying to initialize...');
        printer = new PrinterService();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const testBtn = document.getElementById('test-printer');
    if (testBtn) {
        const originalText = testBtn.textContent;
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        
        await printer.testPrint();
        
        testBtn.disabled = false;
        testBtn.textContent = originalText;
    }
}

// Check printer status function
function checkPrinterStatus() {
    console.log('🔍 Checking printer status...');
    
    if (!printer) {
        console.log('❌ Printer not defined');
        showAlert('Yazıcı servisi başlatılmamış', 'error');
        return false;
    }
    
    console.log(`📊 Printer status:`, {
        defined: !!printer,
        connected: printer.isConnected,
        serverUrl: printer.serverUrl
    });
    
    showAlert(`Yazıcı durumu: ${printer.isConnected ? 'Bağlı' : 'Bağlı Değil'}`, 
              printer.isConnected ? 'success' : 'error');
    
    return printer.isConnected;
}

// Initialize printer when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other initializations
    setTimeout(() => {
        console.log('📄 Initializing printer service...');
        printer = new PrinterService();
    }, 1000);
});

// ================== Print All Labels ==================
async function printAllLabels() {
    console.log('🚀 Starting printAllLabels function...');
    
    // Check if printer is defined and connected
    if (typeof printer === 'undefined' || !printer) {
        console.error('❌ Printer service not initialized');
        showAlert('Yazıcı servisi başlatılmamış. Sayfayı yenileyin ve tekrar deneyin.', 'error');
        return;
    }
    
    if (!printer.isConnected) {
        showAlert('Yazıcı servisi bağlı değil. Lütfen Node.js sunucusunun çalıştığından emin olun.', 'error');
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

            // Get package data from row cells - FIXED INDICES
            const pkg = {
                package_no: row.cells[1]?.textContent?.trim() || 'NO_BARCODE',
                customer_name: row.cells[2]?.textContent?.trim() || 'NO_CUSTOMER', 
                product: row.cells[3]?.textContent?.trim() || 'NO_PRODUCT',
                created_at: row.cells[4]?.textContent?.trim() || 'NO_DATE'
            };

            console.log(`📦 Processing package ${i + 1}:`, pkg);

            const labelText = `${pkg.customer_name} - ${pkg.product}`;
            const barcode = pkg.package_no;

            const printResult = await printer.printBarcode(barcode, labelText);

            if (printResult) {
                successCount++;
                console.log(`✅ Label ${i + 1} printed successfully`);
            } else {
                errorCount++;
                console.log(`❌ Failed to print label ${i + 1}`);
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

    // Show final results
    if (successCount > 0 && errorCount === 0) {
        showAlert(`✅ ${successCount} etiket başarıyla yazdırıldı!`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} hata oluştu.`, 'warning');
    } else {
        showAlert(`❌ Hiçbir etiket yazdırılamadı. ${errorCount} hata oluştu.`, 'error');
    }

    console.log(`Print job completed: ${successCount} success, ${errorCount} errors`);
}
