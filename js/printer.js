///////////// ----------------- LOGO PATHS -----------------
const logoPath = 'file:///C:/Users/munze/OneDrive/Documents/ElectronApp/t/laundry-logo.png';
const logoBase64 = "data:image/jpeg;base64,..."; // Replace with your actual base64 string
const logoPathFinal = (typeof window !== 'undefined' && window.electronAPI) ? logoPath : logoBase64;

// ================== GLOBAL FUNCTIONS - DEFINED FIRST ==================
window.printSelectedElectron = async function() {
    console.log('🖨️ printSelectedElectron called');
    
    // --- 1. Workspace Validation and Printer Configuration Retrieval ---
    if (!window.workspaceManager?.currentWorkspace) {
        console.error('❌ No workspace selected');
        showAlert('Önce çalışma istasyonu seçin!', 'error');
        await window.workspaceManager.showWorkspaceSelection?.();
        return false;
    }
    
    // Retrieve the printer config for the current workspace
    const workspacePrinterConfig = window.workspaceManager.getCurrentPrinterConfig();
    
    // The specific system name is required for printing (e.g., 'EPSON_TM-T88V')
    if (!workspacePrinterConfig || !workspacePrinterConfig.selectedPrinterName) {
        showAlert('Çalışma istasyonu için geçerli bir yazıcı seçimi yapılmamış. Lütfen ayarları kontrol edin.', 'error');
        return false;
    }
    
    const printerSystemName = workspacePrinterConfig.selectedPrinterName;
    const printerFriendlyName = workspacePrinterConfig.name || printerSystemName;

    console.log(`🖨️ Printing job targeting printer: ${printerSystemName}`);
    
    // --- 2. Existing Printer Service Check ---
    if (!window.printerElectron) {
        console.log('🔄 Initializing printer service...');
        if (typeof PrinterServiceElectronWithSettings !== 'undefined') {
            window.printerElectron = new PrinterServiceElectronWithSettings();
        } else {
            showAlert('Yazıcı modülü yüklenemedi', 'error');
            return false;
        }
    }
    
    // Get selected packages
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('En az bir paket seçin', 'error');
        return false;
    }

    // Process packages (data extraction logic remains the same)
    const packages = Array.from(checkboxes).map((checkbox, i) => {
        const row = checkbox.closest('tr');
        const packageNo = row.cells[1]?.textContent?.trim() || `PKG-${Date.now()}-${i}`;
        const customerName = row.cells[2]?.textContent?.trim() || 'Bilinmeyen Müşteri';
        
        let items = [];
        
        // Method 1: Check data attribute
        const itemsData = row.getAttribute('data-items');
        if (itemsData) {
            try {
                items = JSON.parse(itemsData);
                console.log('✅ Found items in data attribute:', items);
            } catch (e) {
                console.error('Error parsing items data:', e);
            }
        }
        
        // Method 2: Extract from product and quantity columns
        if (items.length === 0) {
            const productText = row.cells[3]?.textContent?.trim();
            const qtyText = row.cells[4]?.textContent?.trim();
            
            if (productText) {
                const products = productText.split(/[,;]/).map(p => p.trim()).filter(p => p);
                const quantities = qtyText ? qtyText.split(/[,;]/).map(q => parseInt(q.trim()) || 1) : [1];
                
                items = products.map((product, index) => ({
                    name: product,
                    qty: quantities[index] || 1
                }));
                
                console.log('✅ Extracted items from columns:', items);
            }
        }
        
        // Method 3: Fallback to single item
        if (items.length === 0) {
            const productText = row.cells[3]?.textContent?.trim() || 'Bilinmeyen Ürün';
            const qtyText = row.cells[4]?.textContent?.trim();
            const qty = qtyText ? parseInt(qtyText) : 1;
            
            items = [{ name: productText, qty: qty }];
            console.log('✅ Using single item fallback:', items);
        }

        return {
            package_no: packageNo,
            customer_name: customerName,
            items: items,
            created_at: new Date().toLocaleDateString('tr-TR')
        };
    });

    // Get global settings
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

    // --- 3. CRITICAL FIX: Populate settings with the validated printer configuration ---
    // This correctly prepares the settings object with all necessary printer info.
    settings.workspace = {
        id: window.workspaceManager.currentWorkspace.id,
        name: window.workspaceManager.currentWorkspace.name,
        printer: {
            ...workspacePrinterConfig,
            systemName: printerSystemName // Explicitly pass the required system name
        }
    };
    
    console.log(`🖨️ Printing from ${settings.workspace.name} on ${printerFriendlyName}`);

    // Update UI
    const printBtn = document.getElementById('printBarcodeBtn');
    let originalText = '';
    
    if (printBtn) {
        originalText = printBtn.innerHTML;
        printBtn.disabled = true;
        // Use the friendly name for UI feedback
        printBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${printerFriendlyName} ile yazdırılıyor...`;
    }

    try {
        console.log('📦 Final packages to print:', packages);
        console.log('🖨️ Printer settings being passed:', settings);
        
        // Call the printer service, which will now find printer.systemName in the settings object
        const success = await window.printerElectron.printAllLabels(packages, settings);
        
        if (success) {
            showAlert(`Etiketler ${printerFriendlyName} yazıcısına gönderildi ✅`, 'success');
        } else {
            showAlert('Yazdırma başarısız', 'error');
        }
        
        return success;
        
    } catch (error) {
        console.error('❌ Print error:', error);
        showAlert(`Yazdırma hatası: ${error.message}`, 'error');
        return false;
        
    } finally {
        // Restore button state
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.innerHTML = originalText || 'Etiket Yazdır';
        }
    }
};


window.testPrintWithSettings = async function() {
    console.log('🧪 testPrintWithSettings called');
    
    // --- FIX: Ensure workspace context is also passed for test prints ---
    if (!window.workspaceManager?.currentWorkspace) {
        showAlert('Test yazdırmadan önce çalışma istasyonu seçin!', 'error');
        return false;
    }
    const workspacePrinterConfig = window.workspaceManager.getCurrentPrinterConfig();
    if (!workspacePrinterConfig || !workspacePrinterConfig.selectedPrinterName) {
        showAlert('Çalışma istasyonu için geçerli bir yazıcı seçimi yapılmamış.', 'error');
        return false;
    }

    if (!window.printerElectron) {
        window.printerElectron = new PrinterServiceElectronWithSettings();
    }
    
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    // Add current workspace context to settings for the test print
    settings.workspace = {
        id: window.workspaceManager.currentWorkspace.id,
        name: window.workspaceManager.currentWorkspace.name,
        printer: {
            ...workspacePrinterConfig,
            systemName: workspacePrinterConfig.selectedPrinterName
        }
    };

    return await window.printerElectron.testPrint(settings);
};

window.getPrinterElectron = function() {
    if (!window.printerElectron) {
        window.printerElectron = new PrinterServiceElectronWithSettings();
    }
    return window.printerElectron;
};

// ================== ENHANCED PRINTER SERVICE FOR ELECTRON ==================
class PrinterServiceElectronWithSettings {
    constructor() {
        console.log('🖨️ Electron printer service initialized');
        this.isConnected = true;
    }

    async checkPrinterCapabilities() {
        try {
            const capabilities = {
                hasSpecificPrinter: !!(window.electronAPI && window.electronAPI.printToSpecificPrinter),
                hasGetPrinters: !!(window.electronAPI && window.electronAPI.getPrinters),
                hasPrintBarcode: !!(window.electronAPI && window.electronAPI.printBarcode),
                electronAPI: !!window.electronAPI
            };
            
            console.log('🖨️ Printer capabilities:', capabilities);
            return capabilities;
        } catch (error) {
            console.error('Error checking printer capabilities:', error);
            return {
                hasSpecificPrinter: false,
                hasGetPrinters: false,
                hasPrintBarcode: false,
                electronAPI: false
            };
        }
    }

    // ---------------- GENERATE BARCODE SVG ----------------
    generateBarcodeSVG(barcodeText, settings = {}) {
        try {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            JsBarcode(svg, barcodeText, {
                format: 'CODE128',
                width: 1.0,
                height: 30,
                displayValue: true,
                text: barcodeText,
                fontSize: 12,
                textMargin: 1,
                fontOptions: "bold",
                font: "Courier New",
                textAlign: "center",
                textPosition: "bottom",
                margin: 0,
                background: "transparent",
                lineColor: "#000"
            });
            
            svg.setAttribute('width', '45mm');
            svg.setAttribute('height', '18mm');
            svg.style.cssText = 'display:block;margin:0;padding:0;border:0;vertical-align:top;line-height:0;';
            
            return svg.outerHTML;
        } catch (error) {
            console.error('Barcode generation error:', error);
            return `<div style="border:1px solid #000; padding:1px; text-align:center; font-family:monospace; margin:0; line-height:1; height:18mm; font-size:10px;">
                        <div style="height:14mm; background: repeating-linear-gradient(90deg, #000 0px, #000 1px, #fff 1px, #fff 2px);"></div>
                        <div style="font-weight:bold;">${barcodeText}</div>
                    </div>`;
        }
    }

    // ---------------- GET AVAILABLE PRINTERS ----------------
    async getAvailablePrinters() {
        try {
            if (window.electronAPI && window.electronAPI.getPrinters) {
                const printers = await window.electronAPI.getPrinters();
                console.log('🖨️ Available printers:', printers);
                return printers;
            } else {
                console.warn('⚠️ getPrinters API not available');
                return [];
            }
        } catch (error) {
            console.error('❌ Error getting printers:', error);
            return [];
        }
    }

    // ---------------- PRINT TO SPECIFIC PRINTER ----------------
    async printToSpecificPrinter(htmlContent, printerName) {
        try {
            if (window.electronAPI && window.electronAPI.printToSpecificPrinter) {
                return await window.electronAPI.printToSpecificPrinter(htmlContent, printerName);
            } else {
                console.warn('⚠️ printToSpecificPrinter not available, using default');
                return await window.electronAPI.printBarcode(htmlContent);
            }
        } catch (error) {
            console.error('❌ Specific printer error:', error);
            throw error;
        }
    }
    
    // ---------------- PRINT MULTIPLE LABELS ----------------
    async printAllLabels(packages, settings = {}) {
        if (!packages || packages.length === 0) {
            alert("Yazdırılacak paket bulunamadı.");
            return false;
        }

        try {
            // ** THE CRITICAL FIX IS HERE **
            // We now correctly read the 'systemName' passed from the global function.
            let targetPrinterName = null;
            if (settings.workspace && settings.workspace.printer && settings.workspace.printer.systemName) {
                targetPrinterName = settings.workspace.printer.systemName;
                console.log(`🎯 Using workstation printer system name: ${targetPrinterName} for workspace: ${settings.workspace.name}`);
            } else {
                console.log('ℹ️ No workstation printer specified, will use system default');
            }

            const MAX_ITEMS_PER_LABEL = 8;

            let htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    @page { 
        size: 105mm 76mm portrait; 
        margin: 0; 
    }
    body { 
        width: 105mm; 
        height: 76mm; 
        margin: 0; 
        padding: 0; 
        font-family: 'Arial', sans-serif;
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        font-size: 10px;
        line-height: 1.2;
    }
    
    .label { 
        width: 100%; 
        height: 100%; 
        padding: 3mm;
        display: flex; 
        flex-direction: column;
        justify-content: space-between;
        border: 1px solid #000;
        box-sizing: border-box; 
        page-break-after: always; 
    }
    
    .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        padding-bottom: 1mm; 
        margin-bottom: 1mm; 
        border-bottom: 1px solid #000; 
    }
    
    .logo-img { 
        width: 50mm;
        height: 22mm; 
        object-fit: contain; 
    }
    
    .barcode-section { 
        text-align: right; 
        display: flex; 
        flex-direction: column; 
        align-items: flex-end; 
    }
    
    .barcode { 
        display: block; 
        margin: 0; 
        padding: 0; 
        line-height: 0; 
    }
    
    .barcode svg { 
        width: 55mm; 
        height: 20mm !important; 
        display: block; 
        margin: 0; 
        padding: 0; 
    }
    
    .customer-section { 
        background: #000; 
        color: #fff; 
        padding: 2mm 0;
        text-align: center; 
        margin: 0.5mm 0;
        font-size: 16px;
        line-height: 1.3;
    }
    
    .customer-name { 
        margin: 0; 
        font-weight: bold; 
        letter-spacing: 0.5px; 
        padding: 0 2mm;
    }
    
    .items-section { 
        flex: 1; 
        margin: 1mm 0;
        display: flex;
        flex-direction: column;
        gap: 0.5mm;
        min-height: 25mm;
    }
    
    .item-row { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        width: 100%; 
        padding: 0.5mm 1mm;
        background: #f8f8f8; 
        border: 0.5px solid #ccc; 
        border-radius: 1px; 
        font-size: 15px;
        box-sizing: border-box;
        min-height: 4mm;
        page-break-inside: avoid;
    }
    
    .item-name { 
        font-weight: 600; 
        flex: 1;
        text-align: left;
        word-break: break-word;
        padding-right: 1mm;
    }
    
    .item-qty { 
        font-weight: bold; 
        font-size: 15px; 
        min-width: 12mm; 
        text-align: center; 
        background: #e0e0e0; 
        padding: 0.3mm 1mm; 
        border-radius: 1px; 
        border: 0.5px solid #999;
        white-space: nowrap;
    }
    
    .footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        font-size: 15px;
        color: #333;
        margin-top: 0.5mm;
        padding-top: 0.5mm;
        border-top: 0.5px solid #ccc;
        line-height: 1.3;
        position: relative;
    }

    .total-info {
        font-weight: bold;
        background: #333;
        color: #fff;
        padding: 0.3mm 1mm;
        border-radius: 1px;
        position: relative;
        top: -0.5mm;
    }

    .date-info {
        margin-top: 1mm;
        font-weight: 600;
        text-align: left;
        font-size: 12px;
    }

</style>
</head>
<body>
`;

            for (const pkg of packages) {
                const packageNo = pkg.package_no || '';
                const customerName = pkg.customer_name || '';
                
                console.log('📦 Package data received:', pkg);
                
                let items = [];
                
                if (pkg.items && Array.isArray(pkg.items)) {
                    if (pkg.items.length > 0 && pkg.items[0].name) {
                        items = pkg.items;
                    } else if (pkg.items.length > 0 && typeof pkg.items[0] === 'string') {
                        items = pkg.items.map(item => ({ name: item, qty: 1 }));
                    }
                }
                
                if (items.length === 0 && pkg.product) {
                    items = [{ name: pkg.product, qty: pkg.qty || 1 }];
                }
                
                if (items.length === 0) {
                    items = [{ name: 'Ürün belirtilmemiş', qty: 1 }];
                }

                console.log('📋 Final items to print:', items);

                const now = new Date();
                const dateStr = now.toLocaleDateString('tr-TR');
                const timeStr = now.toLocaleTimeString('tr-TR', { hour12: false, hour: '2-digit', minute: '2-digit' });
                const dateTime = `${dateStr} ${timeStr}`;

                const barcodeSVG = this.generateBarcodeSVG(packageNo, settings);
                const totalItems = items.reduce((sum, item) => sum + (item.qty || 1), 0);

                for (let i = 0; i < items.length; i += MAX_ITEMS_PER_LABEL) {
                    const chunk = items.slice(i, i + MAX_ITEMS_PER_LABEL);
                    
                    const itemHTML = chunk.map((item, index) => {
                        const totalQty = item.qty || 1;
                        return `
                        <div class="item-row">
                            <span class="item-name">${item.name}</span>
                            <span class="item-qty">${totalQty} AD</span>
                        </div>`;
                    }).join('');

                    // ** IMPROVEMENT: Use the dynamic logoPathFinal variable **
                    htmlContent += `
<div class="label">
    <div class="header">
        <div class="logo-section"><img src="${logoPathFinal}" class="logo-img" onerror="this.style.display='none'"></div>
        <div class="barcode-section"><div class="barcode">${barcodeSVG}</div></div>
    </div>
    <div class="customer-section">
        <h2 class="customer-name">${customerName}</h2>
    </div>
    <div class="items-section">
        ${itemHTML}
    </div>
    <div class="footer">
        <span class="total-info">Toplam: ${totalItems} adet</span>
    </div>
    <div class="date-info">${dateTime}</div>
</div>`;
                }
            }

            htmlContent += `</body></html>`;

            if (window.electronAPI && window.electronAPI.printBarcode) {
                console.log('🖨️ Using Electron printing...');
                
                // If we have a target printer from the workspace, use the specific print function.
                if (targetPrinterName && window.electronAPI.printToSpecificPrinter) {
                    console.log(`🎯 Sending to specific printer: ${targetPrinterName}`);
                    return await window.electronAPI.printToSpecificPrinter(htmlContent, targetPrinterName);
                } else {
                    // Fallback to default printer if no target is set or the specific function isn't available.
                    console.warn(`⚠️ Specific printer "${targetPrinterName}" not found or API is unavailable. Using default printer.`);
                    return await window.electronAPI.printBarcode(htmlContent);
                }
            } else {
                console.log('⚠️ Using browser fallback print');
                return this.browserFallbackPrint(htmlContent);
            }

        } catch (error) {
            console.error("❌ Print error:", error);
            alert("Yazdırma hatası: " + error.message);
            return false;
        }
    }
    
    // ---------------- BROWSER FALLBACK PRINT ----------------
    browserFallbackPrint(htmlContent) {
        return new Promise((resolve) => {
            try {
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                    throw new Error("Popup blocked");
                }

                printWindow.document.write(htmlContent);
                printWindow.document.close();

                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        setTimeout(() => {
                            printWindow.close();
                            resolve(true);
                        }, 1000);
                    }, 500);
                };
            } catch (error) {
                console.error("❌ Browser fallback print error:", error);
                resolve(false);
            }
        });
    }

    // ---------------- PRINT SINGLE LABEL ----------------
    async printLabel(pkg, settings = {}) {
        return await this.printAllLabels([pkg], settings);
    }

   // ---------------- TEST PRINT ----------------
    async testPrint(settings = {}) {
        let workstationInfo = ' (Default)';
        let printerName = 'default printer';
        
        if (settings.workspace && settings.workspace.printer) {
            workstationInfo = ` (${settings.workspace.name})`;
            printerName = settings.workspace.printer.name || 'default printer';
        }
        
        const testPackage = {
            package_no: 'TEST123456',
            customer_name: 'GRAND HOTEL İSTANBUL',
            items: [
                { name: 'Büyük Çarşaf', qty: 10 },
                { name: 'Havlu', qty: 20 },
                { name: 'Yastık Kılıfı', qty: 15 },
                { name: 'Nevresim Takımı', qty: 5 },
                { name: 'Bornoz', qty: 8 },
                { name: 'Küçük Havlu', qty: 12 },
                { name: 'Peştemal', qty: 6 },
                { name: 'Masa Örtüsü', qty: 4 }
            ],
            created_at: new Date().toLocaleDateString('tr-TR')
        };
        
        console.log(`🧪 Starting test print for workspace${workstationInfo} on printer "${printerName}"...`);
        const success = await this.printAllLabels([testPackage], settings);
        
        if (success) {
            console.log('✅ Test print completed successfully');
        } else {
            console.error('❌ Test print failed');
        }
        
        return success;
    }
}
// ================== HELPER FUNCTIONS ==================
function showAlert(message, type = "info") {
    // Assuming alertContainer is available in the DOM
    const alertContainer = document.getElementById('alertContainer') || document.body;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        z-index: 10000;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
    `;
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ================== INITIALIZATION ==================
document.addEventListener("DOMContentLoaded", function() {
    console.log("🖨️ Enhanced printer module initialized");
    
    // This logic ensures the printer service is aware of the workspace manager
    const initPrinterSystem = () => {
        if (!window.workspaceManager) {
            setTimeout(initPrinterSystem, 100); // Wait until workspaceManager is loaded
            return;
        }
        
        console.log("🎯 Workspace manager ready, initializing printer service...");
        if (!window.printerElectron) {
            window.printerElectron = new PrinterServiceElectronWithSettings();
        }
    };
    
    initPrinterSystem();

    // Event Listeners for buttons
    const setupButtonListener = (id, callback) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', async function() {
                this.disabled = true;
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
                try {
                    await callback();
                } catch (error) {
                    console.error(`Error on button ${id} click:`, error);
                    showAlert(`Bir hata oluştu: ${error.message}`, 'error');
                } finally {
                    this.disabled = false;
                    this.innerHTML = originalText;
                }
            });
        }
    };

    setupButtonListener('test-printer', window.testPrintWithSettings);
    setupButtonListener('test-printer-yazdir', window.testPrintWithSettings);
    
    const printBarcodeBtn = document.getElementById('printBarcodeBtn');
    if (printBarcodeBtn) {
        printBarcodeBtn.addEventListener('click', () => {
            console.log('🖨️ Print button clicked');
            if (window.printSelectedElectron) {
                window.printSelectedElectron();
            } else {
                showAlert('Print fonksiyonu yüklenmedi. Sayfayı yenileyin.', 'error');
                console.error('printSelectedElectron not found on window');
            }
        });
    }
});

// Debug log to verify functions are loaded
console.log('Printer functions loaded:', {
    printSelectedElectron: typeof window.printSelectedElectron,
    testPrintWithSettings: typeof window.testPrintWithSettings,
    getPrinterElectron: typeof window.getPrinterElectron
});

// Export for Node.js context (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        PrinterServiceElectronWithSettings, 
    };
}

// Temporary debug function
window.debugPrintingSystem = function() {
    console.log('🔧 Printing System Debug:');
    console.log('- Workspace Manager:', window.workspaceManager ? 'Loaded' : 'Not Found');
    console.log('- Current Workspace:', window.workspaceManager?.currentWorkspace || 'None Selected');
    console.log('- Printer Electron Service:', window.printerElectron ? 'Initialized' : 'Not Initialized');
    console.log('- Print Function:', typeof window.printSelectedElectron);
    
    if (window.workspaceManager?.currentWorkspace) {
        const printerConfig = window.workspaceManager.getCurrentPrinterConfig();
        console.log('- Current Printer Config:', printerConfig);
        console.log(`  - Friendly Name: ${printerConfig?.name}`);
        console.log(`  - System Name: ${printerConfig?.selectedPrinterName}`);
    }
    
    if (window.electronAPI) {
        console.log('- Electron API:', {
            printBarcode: !!window.electronAPI.printBarcode,
            getPrinters: !!window.electronAPI.getPrinters,
            printToSpecificPrinter: !!window.electronAPI.printToSpecificPrinter
        });
    } else {
        console.log('- Electron API: Not Found');
    }
};
