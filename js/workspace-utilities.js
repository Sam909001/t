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
    return window.labelCustomizer.generateLabelContent(packageData, printerConfig);
}
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


// ==================== LOGO/TEXT TOGGLE SYSTEM ====================

class LabelCustomizer {
    constructor() {
        this.useCustomText = false;
        this.customText = '';
        this.storageKey = 'label_customizer_settings';
        this.logoBase64 = 'YOUR_BASE64_LOGO_HERE'; // Your existing base64 logo
        
        this.loadSettings();
        this.initializeUI();
    }
    
    // Load settings from localStorage
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
    
    // Save settings to localStorage
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
    
    // Initialize the toggle UI
    initializeUI() {
        // Create the control panel
        this.createControlPanel();
        
        // Apply initial state
        this.applyCurrentMode();
    }
    
    // Create the toggle control panel
    createControlPanel() {
        // Check if panel already exists
        if (document.getElementById('labelCustomizerPanel')) {
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'labelCustomizerPanel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #007bff;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 300px;
            font-family: Arial, sans-serif;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; color: #333; font-size: 16px;">
                    <i class="fas fa-tag"></i> Etiket Özelleştirici
                </h3>
                <button id="closeLabelPanel" style="background: none; border: none; color: #666; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 12px; padding: 8px; border-radius: 5px; transition: background 0.3s;">
                    <input type="radio" name="labelMode" value="logo" ${!this.useCustomText ? 'checked' : ''} 
                           style="margin-right: 10px;">
                    <span style="font-size: 14px; font-weight: 500;">Logo Kullan</span>
                </label>
                
                <label style="display: flex; align-items: center; cursor: pointer; padding: 8px; border-radius: 5px; transition: background 0.3s;">
                    <input type="radio" name="labelMode" value="text" ${this.useCustomText ? 'checked' : ''} 
                           style="margin-right: 10px;">
                    <span style="font-size: 14px; font-weight: 500;">Özel Metin Kullan</span>
                </label>
            </div>
            
            <div id="customTextSection" style="display: ${this.useCustomText ? 'block' : 'none'}; margin-bottom: 20px;">
                <input type="text" id="customTextInput" 
                       value="${this.customText}" 
                       placeholder="Etiket için özel metin girin..."
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; margin-bottom: 5px;"
                       maxlength="30">
                <small style="color: #666; font-size: 12px;">Maksimum 30 karakter</small>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button id="applyLabelSettings" 
                        style="flex: 1; padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background 0.3s;">
                    <i class="fas fa-check"></i> Ayarları Uygula
                </button>
                <button id="testLabelSettings" 
                        style="flex: 1; padding: 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background 0.3s;">
                    <i class="fas fa-print"></i> Test Et
                </button>
            </div>
            
            <div style="text-align: center; padding-top: 15px; border-top: 1px solid #eee;">
                <button id="closeLabelPanelBottom" 
                        style="background: #6c757d; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-size: 13px;">
                    <i class="fas fa-times"></i> Kapat
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners
        this.attachEventListeners();
        
        // Add hover effects
        this.addHoverEffects();
    }
    
    // Attach event listeners to the control panel
    attachEventListeners() {
        // Radio button changes
        const radioButtons = document.querySelectorAll('input[name="labelMode"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const showTextSection = e.target.value === 'text';
                document.getElementById('customTextSection').style.display = showTextSection ? 'block' : 'none';
                
                // Auto-focus on text input when text mode is selected
                if (showTextSection) {
                    setTimeout(() => {
                        const textInput = document.getElementById('customTextInput');
                        if (textInput) textInput.focus();
                    }, 100);
                }
            });
        });
        
        // Apply button
        const applyBtn = document.getElementById('applyLabelSettings');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySettings();
            });
        }
        
        // Test button
        const testBtn = document.getElementById('testLabelSettings');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testLabelSettings();
            });
        }
        
        // Close buttons
        const closeBtn = document.getElementById('closeLabelPanel');
        const closeBtnBottom = document.getElementById('closeLabelPanelBottom');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePanel();
            });
        }
        
        if (closeBtnBottom) {
            closeBtnBottom.addEventListener('click', () => {
                this.hidePanel();
            });
        }
        
        // Enter key in text input
        const textInput = document.getElementById('customTextInput');
        if (textInput) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applySettings();
                }
            });
        }
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('labelCustomizerPanel');
            if (panel && e.target === panel) {
                this.hidePanel();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hidePanel();
            }
        });
    }
    
    // Add hover effects
    addHoverEffects() {
        const applyBtn = document.getElementById('applyLabelSettings');
        const testBtn = document.getElementById('testLabelSettings');
        
        if (applyBtn) {
            applyBtn.addEventListener('mouseover', () => {
                applyBtn.style.background = '#0056b3';
            });
            applyBtn.addEventListener('mouseout', () => {
                applyBtn.style.background = '#007bff';
            });
        }
        
        if (testBtn) {
            testBtn.addEventListener('mouseover', () => {
                testBtn.style.background = '#218838';
            });
            testBtn.addEventListener('mouseout', () => {
                testBtn.style.background = '#28a745';
            });
        }
        
        // Add hover effects to radio labels
        const radioLabels = document.querySelectorAll('label');
        radioLabels.forEach(label => {
            label.addEventListener('mouseover', () => {
                label.style.background = '#f8f9fa';
            });
            label.addEventListener('mouseout', () => {
                label.style.background = 'transparent';
            });
        });
    }
    
    // Apply the settings
    applySettings() {
        const selectedMode = document.querySelector('input[name="labelMode"]:checked');
        if (!selectedMode) {
            showAlert('Lütfen bir mod seçin', 'error');
            return;
        }
        
        this.useCustomText = selectedMode.value === 'text';
        
        if (this.useCustomText) {
            const textInput = document.getElementById('customTextInput');
            if (textInput) {
                this.customText = textInput.value.trim();
                if (!this.customText) {
                    showAlert('Lütfen özel metin girin', 'error');
                    textInput.focus();
                    return;
                }
                if (this.customText.length > 30) {
                    showAlert('Metin 30 karakterden uzun olamaz', 'error');
                    textInput.focus();
                    return;
                }
            }
        }
        
        this.saveSettings();
        this.applyCurrentMode();
        
        showAlert(
            this.useCustomText ? 
            `Etiket metni ayarlandı: "${this.customText}"` : 
            'Logo moduna geçildi', 
            'success'
        );
        
        console.log('✅ Label settings applied:', {
            useCustomText: this.useCustomText,
            customText: this.customText
        });
    }
    
    // Test label settings
    testLabelSettings() {
        const selectedMode = document.querySelector('input[name="labelMode"]:checked');
        if (!selectedMode) {
            showAlert('Lütfen bir mod seçin', 'error');
            return;
        }
        
        const useText = selectedMode.value === 'text';
        let customText = '';
        
        if (useText) {
            const textInput = document.getElementById('customTextInput');
            if (textInput) {
                customText = textInput.value.trim();
                if (!customText) {
                    showAlert('Lütfen özel metin girin', 'error');
                    textInput.focus();
                    return;
                }
            }
        }
        
        // Create test package data
        const testPackage = {
            package_no: 'TEST-001',
            customer_name: 'Test Müşteri',
            items_display: 'Test Ürün: 5 adet',
            total_quantity: 5,
            items: { 'Test Ürün': 5 }
        };
        
        // Get current printer config
        const printerConfig = window.workspaceManager?.getCurrentPrinterConfig?.() || {
            type: 'generic',
            paperWidth: 50,
            paperHeight: 30
        };
        
        // Generate and test label
        const labelContent = this.generateLabelContent(testPackage, printerConfig);
        console.log('🧪 Test label content:', labelContent);
        
        showAlert(
            useText ? 
            `Test etiketi oluşturuldu: "${customText}"` : 
            'Logo ile test etiketi oluşturuldu', 
            'success'
        );
    }
    
    // Apply current mode to label generation
    applyCurrentMode() {
        console.log('🎨 Label mode:', this.useCustomText ? `Text: "${this.customText}"` : 'Logo');
    }
    
    // Show panel
    showPanel() {
        const panel = document.getElementById('labelCustomizerPanel');
        if (!panel) {
            this.createControlPanel();
            return;
        }
        
        panel.style.display = 'block';
        
        // Add overlay
        this.addOverlay();
    }
    
    // Hide panel
    hidePanel() {
        const panel = document.getElementById('labelCustomizerPanel');
        if (panel) {
            panel.style.display = 'none';
        }
        
        // Remove overlay
        this.removeOverlay();
    }
    
    // Add overlay
    addOverlay() {
        if (document.getElementById('labelCustomizerOverlay')) {
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'labelCustomizerOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        
        document.body.appendChild(overlay);
    }
    
    // Remove overlay
    removeOverlay() {
        const overlay = document.getElementById('labelCustomizerOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    // Get current label content (logo or text)
    getLabelContent() {
        if (this.useCustomText && this.customText) {
            return {
                type: 'text',
                content: this.customText
            };
        } else {
            return {
                type: 'logo',
                content: this.logoBase64
            };
        }
    }
    
    // Generate label content for different printer types
    generateLabelContent(packageData, printerConfig) {
        const workspace = window.workspaceManager?.currentWorkspace || { name: 'İstasyon' };
        const itemsText = packageData.items_display || 'Ürün bilgisi yok';
        const date = new Date().toLocaleDateString('tr-TR');
        const labelContent = this.getLabelContent();
        
        switch (printerConfig.type) {
            case 'argox':
                return this.generateArgoxLabel(workspace, packageData, itemsText, date, labelContent, printerConfig);
            case 'zebra':
                return this.generateZebraLabel(workspace, packageData, itemsText, date, labelContent, printerConfig);
            default:
                return this.generateGenericLabel(workspace, packageData, itemsText, date, labelContent, printerConfig);
        }
    }
    
    // Generate Argox label content
    generateArgoxLabel(workspace, packageData, itemsText, date, labelContent, printerConfig) {
        let label = `
SIZE ${printerConfig.paperWidth} mm, ${printerConfig.paperHeight} mm
GAP 2 mm, 0 mm
CLS
`;
        
        if (labelContent.type === 'logo' && labelContent.content) {
            label += `BITMAP 10,10,${printerConfig.paperWidth - 20},40,1,${labelContent.content}\n`;
        } else {
            label += `TEXT 10,10,"0",0,2,2,"${labelContent.content}"\n`;
        }
        
        label += `
TEXT 10,60,"0",0,1,1,"${workspace.name}"
TEXT 10,90,"0",0,1,1,"${packageData.package_no}"
TEXT 10,120,"0",0,1,1,"${packageData.customer_name}"
TEXT 10,150,"0",0,1,1,"${itemsText}"
TEXT 10,180,"0",0,1,1,"Toplam: ${packageData.total_quantity}"
TEXT 10,210,"0",0,1,1,"${date}"
BARCODE 10,240,"128",40,1,0,2,2,"${packageData.package_no}"
PRINT 1
`;
        
        return label;
    }
    
    // Generate Zebra label content
    generateZebraLabel(workspace, packageData, itemsText, date, labelContent, printerConfig) {
        let label = `^XA\n`;
        
        if (labelContent.type === 'logo' && labelContent.content) {
            label += `^FO20,20^GFA,...\n`; // Placeholder for logo
        } else {
            label += `^FO20,20^A0N,25,25^FD${labelContent.content}^FS\n`;
        }
        
        label += `
^FO20,70^A0N,20,20^FD${workspace.name}^FS
^FO20,100^A0N,20,20^FD${packageData.package_no}^FS
^FO20,130^A0N,20,20^FD${packageData.customer_name}^FS
^FO20,160^A0N,15,15^FD${itemsText}^FS
^FO20,190^A0N,20,20^FDToplam: ${packageData.total_quantity}^FS
^FO20,220^A0N,15,15^FD${date}^FS
^FO20,250^BY2^BCN,40,Y,N,N^FD${packageData.package_no}^FS
^XZ
`;
        
        return label;
    }
    
    // Generate generic label content for browser printing
    generateGenericLabel(workspace, packageData, itemsText, date, labelContent, printerConfig) {
        let logoOrText = '';
        
        if (labelContent.type === 'logo' && labelContent.content) {
            logoOrText = `<img src="data:image/png;base64,${labelContent.content}" 
                              style="max-width: 100%; height: 40px; margin-bottom: 10px;" 
                              alt="Company Logo">`;
        } else {
            logoOrText = `<div style="font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 10px;">
                            ${labelContent.content}
                          </div>`;
        }
        
        return `
            <div class="label" style="border: 1px dashed #ccc; padding: 10px; margin: 10px 0; width: ${printerConfig.paperWidth}mm; min-height: ${printerConfig.paperHeight}mm;">
                ${logoOrText}
                <div class="workspace" style="font-weight: bold; font-size: 16px;">${workspace.name}</div>
                <div class="package-no" style="font-size: 14px; margin: 5px 0;">${packageData.package_no || 'PKG-XXXX'}</div>
                <div class="customer" style="font-size: 12px; margin: 5px 0;">${packageData.customer_name || 'Müşteri'}</div>
                <div class="items" style="font-size: 11px; margin: 5px 0;">${Object.entries(packageData.items || {}).map(([p, q]) => `${p}: ${q}`).join(', ')}</div>
                <div class="total" style="font-size: 12px; font-weight: bold;">Toplam: ${Object.values(packageData.items || {}).reduce((a, b) => a + b, 0)} adet</div>
                <div class="date" style="font-size: 10px; color: #666;">${date}</div>
            </div>
        `;
    }
}

// ==================== INTEGRATION WITH EXISTING CODE ====================

// Initialize label customizer
window.labelCustomizer = new LabelCustomizer();

// Replace the existing generateLabelContent function in workspace-utilities.js
function generateLabelContent(packageData, printerConfig) {
    return window.labelCustomizer.generateLabelContent(packageData, printerConfig);
}

// Add button to settings modal or existing UI
function addLabelCustomizerToSettings() {
    // Look for existing settings modal or create a button in main UI
    const settingsModal = document.querySelector('.settings-modal, .modal, #settingsModal');
    
    if (settingsModal) {
        // Add to existing settings modal
        addToSettingsModal(settingsModal);
    } else {
        // Add to main UI as a standalone button
        addToMainUI();
    }
}

// Add to existing settings modal
function addToSettingsModal(settingsModal) {
    const labelSection = document.createElement('div');
    labelSection.style.cssText = `
        margin: 15px 0;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #f8f9fa;
    `;
    
    labelSection.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
            <i class="fas fa-tag"></i> Etiket Ayarları
        </h4>
        <button onclick="window.labelCustomizer.showPanel()" 
                style="width: 100%; padding: 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;">
            <i class="fas fa-cog"></i> Etiket Özelleştirici'yi Aç
        </button>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
            Logo ve metin ayarlarını değiştirin
        </div>
    `;
    
    settingsModal.appendChild(labelSection);
}

// Add to main UI as standalone button
function addToMainUI() {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-tag"></i> Etiket Ayarları';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        z-index: 9998;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    button.addEventListener('click', () => {
        window.labelCustomizer.showPanel();
    });
    
    button.addEventListener('mouseover', () => {
        button.style.background = '#218838';
        button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseout', () => {
        button.style.background = '#28a745';
        button.style.transform = 'translateY(0)';
    });
    
    document.body.appendChild(button);
}

// ==================== INITIALIZATION ====================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        addLabelCustomizerToSettings();
    }, 2000);
});

// Global function to show label customizer
window.showLabelCustomizer = function() {
    window.labelCustomizer.showPanel();
};
