// ==================== WORKSTATION PRINTER TEST FUNCTIONS ====================

// Test function for workstation printing system
window.testWorkstationPrinting = function() {
    if (window.workspaceManager?.currentWorkspace) {
        const printer = window.workspaceManager.getCurrentPrinterConfig();
        console.log(`🎯 Current workstation: ${window.workspaceManager.currentWorkspace.name}`);
        console.log(`🖨️ Assigned printer: ${printer.name}`);
        console.log(`🔧 Printer type: ${printer.type}`);
        console.log(`📝 Description: ${printer.description}`);
        
        return {
            workstation: window.workspaceManager.currentWorkspace.name,
            printer: printer.name,
            type: printer.type,
            description: printer.description
        };
    } else {
        console.log('❌ No workspace selected');
        return null;
    }
};

// Function to test all workstation printers
window.showAllWorkstationPrinters = function() {
    const allPrinters = window.workspaceManager.getAllPrinterConfigs();
    console.log('🏢 All Workstation Printers:');
    allPrinters.forEach((printer, index) => {
        console.log(`  ${index + 1}. ${printer.workspaceName} (${printer.workspaceId}) → ${printer.name} [${printer.type}]`);
        console.log(`     Description: ${printer.description}`);
    });
    return allPrinters;
};

// Enhanced workspace validation function
function validateWorkspaceAccessStrict(data, tableName = 'packages') {
    if (!window.workspaceManager) {
        console.error('🚨 Workspace manager not initialized');
        return false;
    }
    
    return window.workspaceManager.validateDataAccess(tableName, data);
}



// ==================== WORKSTATION PRINTER FUNCTIONS ====================

// Global printer functions
async function printForCurrentWorkstation(packageData) {
    if (!window.workspaceManager?.currentWorkspace) {
        showAlert('Önce çalışma istasyonu seçin', 'error');
        return false;
    }

    const printerConfig = window.workspaceManager.getCurrentPrinterConfig();
    console.log(`🖨️ Printing from ${window.workspaceManager.currentWorkspace.name} on ${printerConfig.name}`);

    try {
        // Generate and print label
        const success = await generateAndPrintLabel(packageData, printerConfig);
        
        if (success) {
            showAlert(`Etiket yazdırıldı: ${printerConfig.name}`, 'success');
        }
        
        return success;
    } catch (error) {
        console.error('Print error:', error);
        showAlert(`Yazdırma hatası: ${error.message}`, 'error');
        return false;
    }
}

async function generateAndPrintLabel(packageData, printerConfig) {
    // Generate label content based on printer type
    const labelContent = generateLabelContent(packageData, printerConfig);
    
    // Send to printer
    return await sendToPrinter(labelContent, printerConfig);
}

function generateLabelContent(packageData, printerConfig) {
    const workspace = window.workspaceManager.currentWorkspace;
    const itemsText = packageData.items_display || 'Ürün bilgisi yok';
    const date = new Date().toLocaleDateString('tr-TR');
    
    switch (printerConfig.type) {
        case 'argox':
            return `
SIZE ${printerConfig.paperWidth} mm, ${printerConfig.paperHeight} mm
GAP 2 mm, 0 mm
CLS
TEXT 10,10,"0",0,1,1,"${workspace.name}"
TEXT 10,40,"0",0,1,1,"${packageData.package_no}"
TEXT 10,70,"0",0,1,1,"${packageData.customer_name}"
TEXT 10,100,"0",0,1,1,"${itemsText}"
TEXT 10,130,"0",0,1,1,"Toplam: ${packageData.total_quantity}"
TEXT 10,160,"0",0,1,1,"${date}"
BARCODE 10,190,"128",40,1,0,2,2,"${packageData.package_no}"
PRINT 1
`;
        case 'zebra':
            return `
^XA
^FO20,20^A0N,25,25^FD${workspace.name}^FS
^FO20,50^A0N,20,20^FD${packageData.package_no}^FS
^FO20,80^A0N,20,20^FD${packageData.customer_name}^FS
^FO20,110^A0N,15,15^FD${itemsText}^FS
^FO20,140^A0N,20,20^FDToplam: ${packageData.total_quantity}^FS
^FO20,170^A0N,15,15^FD${date}^FS
^FO20,200^BY2^BCN,40,Y,N,N^FD${packageData.package_no}^FS
^XZ
`;
        default:
            // Generic label for browser printing
            return 'generic';
    }
}

async function sendToPrinter(labelContent, printerConfig) {
    if (printerConfig.connection === 'network' && printerConfig.ip) {
        // Network printing
        return await printViaNetwork(labelContent, printerConfig);
    } else {
        // Browser printing (fallback)
        return await printViaBrowser(labelContent, printerConfig);
    }
}

async function printViaNetwork(labelContent, printerConfig) {
    try {
        const response = await fetch(`http://${printerConfig.ip}:9100`, {
            method: 'POST',
            body: labelContent,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Network print error:', error);
        return false;
    }
}

async function printViaBrowser(labelContent, printerConfig) {
    return new Promise((resolve) => {
        const printWindow = window.open('', '_blank');
        const packageData = window.currentPackage || {};
        const customer = window.selectedCustomer || {};
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Label - ${printerConfig.name}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 10mm;
                            transform: scale(0.8);
                        }
                        .label { 
                            border: 1px dashed #ccc; 
                            padding: 10px; 
                            margin: 10px 0;
                            width: ${printerConfig.paperWidth}mm;
                            min-height: ${printerConfig.paperHeight}mm;
                        }
                        .workspace { font-weight: bold; font-size: 16px; }
                        .package-no { font-size: 14px; margin: 5px 0; }
                        .customer { font-size: 12px; margin: 5px 0; }
                        .items { font-size: 11px; margin: 5px 0; }
                        .total { font-size: 12px; font-weight: bold; }
                        .date { font-size: 10px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="workspace">${window.workspaceManager.currentWorkspace.name}</div>
                        <div class="package-no">${packageData.package_no || 'PKG-XXXX'}</div>
                        <div class="customer">${customer.name || 'Müşteri'}</div>
                        <div class="items">${Object.entries(packageData.items || {}).map(([p, q]) => `${p}: ${q}`).join(', ')}</div>
                        <div class="total">Toplam: ${Object.values(packageData.items || {}).reduce((a, b) => a + b, 0)} adet</div>
                        <div class="date">${new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(() => {
                                window.close();
                                window.opener.postMessage('print_complete', '*');
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        
        // Listen for print completion
        window.addEventListener('message', function(event) {
            if (event.data === 'print_complete') {
                resolve(true);
            }
        });
        
        // Fallback timeout
        setTimeout(() => resolve(true), 3000);
    });
}

// Test printer for current workstation
async function testCurrentWorkstationPrinter() {
    if (!window.workspaceManager?.currentWorkspace) {
        showAlert('Önce çalışma istasyonu seçin', 'error');
        return;
    }
    
    await window.workspaceManager.testCurrentPrinter();
}




// Enhanced workspace filter for all queries
function getStrictWorkspaceFilter(tableName) {
    if (!window.workspaceManager) {
        console.error('🚨 Workspace manager not initialized for filter');
        return {};
    }
    
    return window.workspaceManager.createWorkspaceFilter(tableName);
}






// ==================== ROBUST LABEL CUSTOMIZER SYSTEM ====================

// Global variable to track initialization
window.labelCustomizerInitialized = false;

// Simple LabelCustomizer class with essential methods
class LabelCustomizer {
    constructor() {
        this.useCustomText = false;
        this.customText = '';
        this.storageKey = 'label_customizer_settings';
        this.logoBase64 = 'YOUR_BASE64_LOGO_HERE';
        
        this.loadSettings();
        this.initializeUI();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const settings = JSON.parse(saved);
                this.useCustomText = settings.useCustomText || false;
                this.customText = settings.customText || '';
            }
        } catch (error) {
            console.error('Error loading label settings:', error);
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                useCustomText: this.useCustomText,
                customText: this.customText
            };
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving label settings:', error);
        }
    }
    
    initializeUI() {
        this.createControlPanel();
    }
    
    createControlPanel() {
        if (document.getElementById('labelCustomizerPanel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'labelCustomizerPanel';
        panel.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            min-width: 250px;
            font-family: Arial, sans-serif;
            display: none;
        `;
        
        panel.innerHTML = `
            <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                <h4 style="margin: 0; color: #333; font-size: 14px;">
                    <i class="fas fa-tag"></i> Etiket Özelleştirici
                </h4>
                <button id="closeLabelPanel" style="background: none; border: none; color: #666; cursor: pointer; font-size: 16px;">
                    ×
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 10px;">
                    <input type="radio" name="labelMode" value="logo" ${!this.useCustomText ? 'checked' : ''} style="margin-right: 8px;">
                    <span style="font-size: 13px;">Logo Kullan</span>
                </label>
                
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="radio" name="labelMode" value="text" ${this.useCustomText ? 'checked' : ''} style="margin-right: 8px;">
                    <span style="font-size: 13px;">Özel Metin Kullan</span>
                </label>
            </div>
            
            <div id="customTextSection" style="display: ${this.useCustomText ? 'block' : 'none'}; margin-bottom: 15px;">
                <input type="text" id="customTextInput" value="${this.customText}" placeholder="Etiket için özel metin girin..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" maxlength="30">
                <small style="color: #666; font-size: 11px;">Maksimum 30 karakter</small>
            </div>
            
            <button id="applyLabelSettings" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                <i class="fas fa-check"></i> Ayarları Uygula
            </button>
        `;
        
        document.body.appendChild(panel);
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        // Radio buttons
        document.querySelectorAll('input[name="labelMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('customTextSection').style.display = e.target.value === 'text' ? 'block' : 'none';
            });
        });
        
        // Apply button
        const applyBtn = document.getElementById('applyLabelSettings');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySettings());
        }
        
        // Close button
        const closeBtn = document.getElementById('closeLabelPanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePanel());
        }
        
        // Enter key in text input
        const textInput = document.getElementById('customTextInput');
        if (textInput) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.applySettings();
            });
        }
    }
    
    applySettings() {
        const selectedMode = document.querySelector('input[name="labelMode"]:checked').value;
        this.useCustomText = selectedMode === 'text';
        
        if (this.useCustomText) {
            const textInput = document.getElementById('customTextInput');
            if (textInput) {
                this.customText = textInput.value.trim();
                if (!this.customText) {
                    alert('Lütfen özel metin girin');
                    return;
                }
            }
        }
        
        this.saveSettings();
        alert(this.useCustomText ? `Etiket metni ayarlandı: "${this.customText}"` : 'Logo moduna geçildi');
    }
    
    showPanel() {
        const panel = document.getElementById('labelCustomizerPanel');
        if (panel) panel.style.display = 'block';
    }
    
    hidePanel() {
        const panel = document.getElementById('labelCustomizerPanel');
        if (panel) panel.style.display = 'none';
    }
    
    getLabelContent() {
        return this.useCustomText ? { type: 'text', content: this.customText } : { type: 'logo', content: this.logoBase64 };
    }
}

// ==================== SIMPLE BUTTON CREATION ====================

function createSimpleLabelButton() {
    const button = document.createElement('button');
    button.id = 'labelCustomizerToggle';
    button.type = 'button';
    button.innerHTML = '<i class="fas fa-tag"></i> Etiket Ayarları';
    button.style.cssText = `
        background: #28a745;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
        margin: 5px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    `;
    
    button.onclick = function() {
        if (window.labelCustomizer) {
            window.labelCustomizer.showPanel();
        } else {
            alert('Label customizer henüz yüklenmedi. Lütfen bekleyin...');
        }
    };
    
    return button;
}

// ==================== DIRECT BUTTON PLACEMENT ====================

function placeLabelButtonNow() {
    console.log('📍 Placing label button...');
    
    // Remove existing button if any
    const existingBtn = document.getElementById('labelCustomizerToggle');
    if (existingBtn) existingBtn.remove();
    
    // Create new button
    const labelBtn = createSimpleLabelButton();
    
    // Try to find the best place for the button
    let placed = false;
    
    // Strategy 1: Look for check status button and place next to it
    const buttons = document.querySelectorAll('button');
    for (let btn of buttons) {
        if (btn.textContent.includes('Durum') || btn.textContent.includes('Check Status') || 
            btn.textContent.includes('Yazdır') || btn.textContent.includes('Print') ||
            btn.id.includes('status') || btn.id.includes('print')) {
            
            btn.parentNode.insertBefore(labelBtn, btn.nextSibling);
            console.log('✅ Button placed next to:', btn.textContent || btn.id);
            placed = true;
            break;
        }
    }
    
    // Strategy 2: Look for button containers
    if (!placed) {
        const containers = document.querySelectorAll('.btn-group, .button-group, .actions, .tools, .modal-footer, .toolbar');
        for (let container of containers) {
            container.appendChild(labelBtn);
            console.log('✅ Button placed in container:', container.className);
            placed = true;
            break;
        }
    }
    
    // Strategy 3: Fixed position as last resort
    if (!placed) {
        labelBtn.style.position = 'fixed';
        labelBtn.style.top = '70px';
        labelBtn.style.right = '20px';
        labelBtn.style.zIndex = '9998';
        document.body.appendChild(labelBtn);
        console.log('✅ Button placed in fixed position');
    }
    
    return labelBtn;
}

// ==================== SIMPLE INITIALIZATION ====================

function initializeLabelCustomizerSimple() {
    console.log('🚀 Starting label customizer initialization...');
    
    // Step 1: Place the button immediately
    const button = placeLabelButtonNow();
    console.log('✅ Button placed');
    
    // Step 2: Initialize the LabelCustomizer class
    try {
        if (!window.labelCustomizer) {
            window.labelCustomizer = new LabelCustomizer();
            console.log('✅ LabelCustomizer class initialized');
        }
        
        // Step 3: Update button click handler to use the initialized class
        button.onclick = function() {
            if (window.labelCustomizer) {
                window.labelCustomizer.showPanel();
            }
        };
        
        window.labelCustomizerInitialized = true;
        console.log('🎉 Label customizer fully initialized!');
        
    } catch (error) {
        console.error('❌ Error initializing LabelCustomizer:', error);
    }
}

// ==================== IMMEDIATE EXECUTION ====================

// Run immediately - don't wait for events
console.log('🔧 Setting up label customizer...');

// Place button immediately
setTimeout(initializeLabelCustomizerSimple, 100);

// Also try after a short delay in case DOM isn't ready
setTimeout(initializeLabelCustomizerSimple, 1000);

// And one more time after everything should be loaded
setTimeout(initializeLabelCustomizerSimple, 3000);

// ==================== MANUAL COMMANDS ====================

// Command to force show the button
window.showLabelButton = function() {
    placeLabelButtonNow();
    console.log('✅ Label button should be visible now');
};

// Command to test the system
window.testLabelSystem = function() {
    console.log('🧪 Testing Label System:');
    console.log('- Button exists:', !!document.getElementById('labelCustomizerToggle'));
    console.log('- Panel exists:', !!document.getElementById('labelCustomizerPanel'));
    console.log('- LabelCustomizer initialized:', !!window.labelCustomizer);
    console.log('- Global initialized flag:', window.labelCustomizerInitialized);
};

// Command to force initialization
window.initLabelNow = initializeLabelCustomizerSimple;

// Run the test to see current status
setTimeout(() => {
    window.testLabelSystem();
}, 2000);
