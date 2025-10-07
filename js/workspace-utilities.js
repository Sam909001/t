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
        
        // Calculate position based on button group location
        const buttonGroup = document.getElementById('labelControlGroup') || 
                           document.getElementById('printerControlGroup') ||
                           document.querySelector('.button-group') ||
                           document.querySelector('.printer-controls');
        
        let topPosition = '120px'; // Default fallback
        let rightPosition = '20px'; // Default fallback
        
        if (buttonGroup) {
            // Get the position of the button group
            const rect = buttonGroup.getBoundingClientRect();
            topPosition = `${rect.bottom + 10}px`; // 10px below the button group
            rightPosition = `${window.innerWidth - rect.right}px`; // Align with right edge
            console.log('📐 Panel positioned relative to button group:', { top: topPosition, right: rightPosition });
        } else {
            // Try to find the Etiket Ayarları button specifically
            const labelButton = document.getElementById('labelCustomizerToggle');
            if (labelButton) {
                const rect = labelButton.getBoundingClientRect();
                topPosition = `${rect.bottom + 10}px`;
                rightPosition = `${window.innerWidth - rect.right}px`;
                console.log('📐 Panel positioned relative to label button');
            }
        }
        
        panel.style.cssText = `
            position: fixed;
            top: ${topPosition};
            right: ${rightPosition};
            background: white;
            border: 2px solid #007bff;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            min-width: 250px;
            font-family: Arial, sans-serif;
            display: ${this.isPanelVisible() ? 'block' : 'none'};
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                <h4 style="margin: 0; color: #333; font-size: 14px;">
                    <i class="fas fa-tag"></i> Etiket Özelleştirici
                </h4>
                <button id="closeLabelPanel" style="background: none; border: none; color: #666; cursor: pointer; font-size: 16px; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 10px;">
                    <input type="radio" name="labelMode" value="logo" ${!this.useCustomText ? 'checked' : ''} 
                           style="margin-right: 8px;">
                    <span style="font-size: 13px;">Logo Kullan</span>
                </label>
                
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="radio" name="labelMode" value="text" ${this.useCustomText ? 'checked' : ''} 
                           style="margin-right: 8px;">
                    <span style="font-size: 13px;">Özel Metin Kullan</span>
                </label>
            </div>
            
            <div id="customTextSection" style="display: ${this.useCustomText ? 'block' : 'none'}; margin-bottom: 15px;">
                <input type="text" id="customTextInput" 
                       value="${this.customText}" 
                       placeholder="Etiket için özel metin girin..."
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"
                       maxlength="30">
                <small style="color: #666; font-size: 11px;">Maksimum 30 karakter</small>
            </div>
            
            <button id="applyLabelSettings" 
                    style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; transition: background 0.3s;">
                <i class="fas fa-check"></i> Ayarları Uygula
            </button>
            
            <div style="margin-top: 10px; text-align: center;">
                <button id="toggleLabelPanel" 
                        style="background: none; border: none; color: #007bff; cursor: pointer; font-size: 12px; text-decoration: underline; padding: 5px;">
                    <i class="fas fa-eye${this.isPanelVisible() ? '-slash' : ''}"></i> 
                    ${this.isPanelVisible() ? 'Gizle' : 'Göster'}
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners
        this.attachEventListeners();
        
        // Add hover effect to apply button
        const applyBtn = document.getElementById('applyLabelSettings');
        if (applyBtn) {
            applyBtn.addEventListener('mouseover', () => {
                applyBtn.style.background = '#0056b3';
            });
            applyBtn.addEventListener('mouseout', () => {
                applyBtn.style.background = '#007bff';
            });
        }
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
        
        // Close button
        const closeBtn = document.getElementById('closeLabelPanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePanel();
            });
        }
        
        // Toggle visibility button
        const toggleBtn = document.getElementById('toggleLabelPanel');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.togglePanelVisibility();
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
        
        // Close panel after applying settings
        this.hidePanel();
    }
    
    // Apply current mode to label generation
    applyCurrentMode() {
        // This will be used by the label generation functions
        console.log('🎨 Label mode:', this.useCustomText ? `Text: "${this.customText}"` : 'Logo');
    }
    
    // Check if panel should be visible
    isPanelVisible() {
        return localStorage.getItem('label_panel_visible') !== 'false';
    }
    
    // Toggle panel visibility
    togglePanelVisibility() {
        const currentlyVisible = this.isPanelVisible();
        localStorage.setItem('label_panel_visible', (!currentlyVisible).toString());
        
        const panel = document.getElementById('labelCustomizerPanel');
        const toggleBtn = document.getElementById('toggleLabelPanel');
        
        if (panel && toggleBtn) {
            if (currentlyVisible) {
                panel.style.display = 'none';
                toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Göster';
            } else {
                this.showPanel();
            }
        }
    }
    
    // Hide panel
    hidePanel() {
        const panel = document.getElementById('labelCustomizerPanel');
        const toggleBtn = document.getElementById('toggleLabelPanel');
        
        if (panel) {
            panel.style.display = 'none';
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Göster';
        }
        
        localStorage.setItem('label_panel_visible', 'false');
    }
    
    // Show panel with dynamic positioning
    showPanel() {
        const panel = document.getElementById('labelCustomizerPanel');
        if (!panel) return;
        
        // Recalculate position each time panel is shown
        const buttonGroup = document.getElementById('labelControlGroup') || 
                           document.getElementById('printerControlGroup') ||
                           document.querySelector('.button-group') ||
                           document.querySelector('.printer-controls');
        
        let topPosition = '120px';
        let rightPosition = '20px';
        
        if (buttonGroup) {
            const rect = buttonGroup.getBoundingClientRect();
            topPosition = `${rect.bottom + 10}px`;
            rightPosition = `${window.innerWidth - rect.right}px`;
        } else {
            const labelButton = document.getElementById('labelCustomizerToggle');
            if (labelButton) {
                const rect = labelButton.getBoundingClientRect();
                topPosition = `${rect.bottom + 10}px`;
                rightPosition = `${window.innerWidth - rect.right}px`;
            }
        }
        
        panel.style.top = topPosition;
        panel.style.right = rightPosition;
        panel.style.display = 'block';
        
        localStorage.setItem('label_panel_visible', 'true');
        
        const toggleBtn = document.getElementById('toggleLabelPanel');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Gizle';
        }
        
        console.log('📐 Panel shown at position:', { top: topPosition, right: rightPosition });
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
            // For Zebra, we'd need to convert base64 to GRF format
            // This is a simplified version - you might need a proper image converter
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

// Add toggle button to your main UI next to other control buttons
function addLabelCustomizerToggle() {
    if (document.getElementById('labelCustomizerToggle')) {
        return;
    }
    
    // Create or find the button group container
    let buttonGroup = document.getElementById('labelControlGroup');
    
    if (!buttonGroup) {
        buttonGroup = document.createElement('div');
        buttonGroup.id = 'labelControlGroup';
        buttonGroup.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            z-index: 9998;
            background: rgba(255,255,255,0.95);
            padding: 12px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
            backdrop-filter: blur(5px);
        `;
        document.body.appendChild(buttonGroup);
    }
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'labelCustomizerToggle';
    toggleButton.type = 'button';
    toggleButton.innerHTML = '<i class="fas fa-tag"></i> Etiket Ayarları';
    toggleButton.style.cssText = `
        background: #28a745;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 14px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
        min-width: 120px;
        justify-content: center;
    `;
    
    // Add hover effects
    toggleButton.addEventListener('mouseover', () => {
        toggleButton.style.background = '#218838';
        toggleButton.style.transform = 'translateY(-2px)';
        toggleButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    });
    
    toggleButton.addEventListener('mouseout', () => {
        toggleButton.style.background = '#28a745';
        toggleButton.style.transform = 'translateY(0)';
        toggleButton.style.boxShadow = 'none';
    });
    
    toggleButton.addEventListener('click', () => {
        window.labelCustomizer.showPanel();
    });
    
    // Add to button group
    buttonGroup.appendChild(toggleButton);
    
    console.log('✅ Etiket Ayarları button added to control group');
    
    // Ensure the panel is created after the button exists
    setTimeout(() => {
        if (window.labelCustomizer && !document.getElementById('labelCustomizerPanel')) {
            window.labelCustomizer.createControlPanel();
        }
    }, 100);
}

// ==================== INITIALIZATION ====================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // Add the toggle button to UI
        addLabelCustomizerToggle();
        
        // Apply initial panel visibility
        if (window.labelCustomizer && !window.labelCustomizer.isPanelVisible()) {
            const panel = document.getElementById('labelCustomizerPanel');
            if (panel) panel.style.display = 'none';
        }
    }, 1500);
});

// Global function to toggle label customizer
window.toggleLabelCustomizer = function() {
    window.labelCustomizer.togglePanelVisibility();
};

// Global function to get current label mode
window.getCurrentLabelMode = function() {
    return window.labelCustomizer.getLabelContent();
};
