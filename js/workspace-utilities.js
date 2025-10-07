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







// ==================== PERMANENT BUTTON INTEGRATION ====================

// Function to permanently add the button to your existing UI
function integrateLabelCustomizerButton() {
    console.log('🔧 Integrating label customizer button...');
    
    // Strategy 1: Add next to Check Status button in settings modal
    const checkStatusBtn = findCheckStatusButton();
    if (checkStatusBtn) {
        addButtonNextToCheckStatus(checkStatusBtn);
        return;
    }
    
    // Strategy 2: Add to settings modal directly
    const settingsModal = findSettingsModal();
    if (settingsModal) {
        addButtonToSettingsModal(settingsModal);
        return;
    }
    
    // Strategy 3: Add to main toolbar/header
    const toolbar = findToolbar();
    if (toolbar) {
        addButtonToToolbar(toolbar);
        return;
    }
    
    // Strategy 4: Last resort - fixed position but permanent
    createPermanentButton();
}

// Find the Check Status button
function findCheckStatusButton() {
    const selectors = [
        '#checkStatusBtn',
        '[onclick*="checkStatus"]',
        'button:contains("Durum")',
        'button:contains("Check Status")',
        'button:contains("Status")',
        '.status-btn',
        '.check-status-btn'
    ];
    
    for (let selector of selectors) {
        if (selector.includes('contains')) {
            // Text-based search
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.textContent.includes('Durum') || btn.textContent.includes('Check Status') || btn.textContent.includes('Status')) {
                    return btn;
                }
            }
        } else {
            const element = document.querySelector(selector);
            if (element) return element;
        }
    }
    return null;
}

// Find settings modal
function findSettingsModal() {
    const selectors = [
        '#settingsModal',
        '.settings-modal',
        '[data-modal="settings"]',
        '#settingsDialog',
        '.modal-settings'
    ];
    
    for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    return null;
}

// Find main toolbar
function findToolbar() {
    const selectors = [
        '.toolbar',
        '.header-actions',
        '.page-actions',
        '.actions',
        '.btn-group',
        '.button-group',
        '.main-tools'
    ];
    
    for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    return null;
}

// Add button next to Check Status button
function addButtonNextToCheckStatus(checkStatusBtn) {
    const existingBtn = document.getElementById('labelCustomizerToggle');
    if (existingBtn) existingBtn.remove();
    
    const labelBtn = createLabelButton();
    
    // Insert after check status button
    checkStatusBtn.parentNode.insertBefore(labelBtn, checkStatusBtn.nextSibling);
    
    console.log('✅ Label button placed next to Check Status button');
}

// Add button to settings modal
function addButtonToSettingsModal(settingsModal) {
    const existingBtn = document.getElementById('labelCustomizerToggle');
    if (existingBtn) existingBtn.remove();
    
    const labelBtn = createLabelButton();
    
    // Try to find button container in modal
    const modalFooter = settingsModal.querySelector('.modal-footer, .modal-actions, .btn-container');
    if (modalFooter) {
        modalFooter.prepend(labelBtn);
    } else {
        // Add to modal body
        const modalBody = settingsModal.querySelector('.modal-body') || settingsModal;
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin: 15px 0; padding: 10px 0; border-top: 1px solid #eee;';
        buttonContainer.appendChild(labelBtn);
        modalBody.appendChild(buttonContainer);
    }
    
    console.log('✅ Label button added to settings modal');
}

// Add button to toolbar
function addButtonToToolbar(toolbar) {
    const existingBtn = document.getElementById('labelCustomizerToggle');
    if (existingBtn) existingBtn.remove();
    
    const labelBtn = createLabelButton();
    toolbar.appendChild(labelBtn);
    
    console.log('✅ Label button added to toolbar');
}

// Create permanent fixed button
function createPermanentButton() {
    const existingBtn = document.getElementById('labelCustomizerToggle');
    if (existingBtn) existingBtn.remove();
    
    const labelBtn = createLabelButton();
    labelBtn.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 10px 15px;
        cursor: pointer;
        z-index: 9998;
        font-size: 13px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: inline-flex;
        align-items: center;
        gap: 5px;
    `;
    
    document.body.appendChild(labelBtn);
    console.log('✅ Permanent label button created');
}

// Create the label button element
function createLabelButton() {
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
        transition: all 0.3s ease;
    `;
    
    // Add hover effects
    button.addEventListener('mouseenter', function() {
        this.style.background = '#218838';
        this.style.transform = 'translateY(-1px)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.background = '#28a745';
        this.style.transform = 'translateY(0)';
    });
    
    button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.labelCustomizer.showPanel();
    });
    
    return button;
}

// ==================== ENHANCED INITIALIZATION ====================

// Wait for the page to fully load and then integrate the button
function initializePermanentButton() {
    console.log('🎯 Initializing permanent label customizer button...');
    
    // Try immediate integration
    integrateLabelCustomizerButton();
    
    // If not successful, wait a bit and try again (for dynamic UIs)
    setTimeout(() => {
        if (!document.getElementById('labelCustomizerToggle')) {
            console.log('🔄 Retrying button integration...');
            integrateLabelCustomizerButton();
        }
    }, 1000);
    
    // Final attempt after longer delay
    setTimeout(() => {
        if (!document.getElementById('labelCustomizerToggle')) {
            console.log('⚡ Final integration attempt...');
            integrateLabelCustomizerButton();
        }
        
        // Verify success
        const btn = document.getElementById('labelCustomizerToggle');
        if (btn) {
            console.log('🎉 Permanent label button integrated successfully!');
            // Make sure it stays even if content changes
            observeDOMChanges();
        } else {
            console.error('❌ Failed to integrate label button');
        }
    }, 3000);
}

// Observe DOM changes to ensure button stays
function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        let buttonExists = document.getElementById('labelCustomizerToggle');
        
        mutations.forEach(function(mutation) {
            // If our button was removed, re-add it
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach(function(node) {
                    if (node.id === 'labelCustomizerToggle') {
                        console.log('🔄 Label button was removed, re-adding...');
                        setTimeout(integrateLabelCustomizerButton, 100);
                    }
                });
            }
        });
        
        // If button doesn't exist anymore, re-add it
        if (!buttonExists) {
            console.log('🔄 Label button missing, re-integrating...');
            setTimeout(integrateLabelCustomizerButton, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePermanentButton);
} else {
    initializePermanentButton();
}

// Also initialize when window loads
window.addEventListener('load', initializePermanentButton);

// Re-initialize when settings modal opens (common in SPA)
function watchForSettingsModal() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.id === 'settingsModal' || target.classList.contains('settings-modal')) {
                    if (target.style.display !== 'none') {
                        // Settings modal just opened, ensure our button is there
                        setTimeout(integrateLabelCustomizerButton, 100);
                    }
                }
            }
        });
    });
    
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
    });
}

// Start watching for modal openings
setTimeout(watchForSettingsModal, 2000);

// ==================== MANUAL PLACEMENT HELPERS ====================

// If automatic placement doesn't work, use these manual commands:

// Place next to Check Status button (if you can find it)
window.placeNextToCheckStatus = function() {
    const checkStatusBtn = findCheckStatusButton();
    if (checkStatusBtn) {
        addButtonNextToCheckStatus(checkStatusBtn);
    } else {
        console.log('❌ Check Status button not found');
    }
};

// Place in settings modal
window.placeInSettingsModal = function() {
    const settingsModal = findSettingsModal();
    if (settingsModal) {
        addButtonToSettingsModal(settingsModal);
    } else {
        console.log('❌ Settings modal not found');
    }
};

// Force create permanent button
window.createPermanentLabelButton = function() {
    createPermanentButton();
};

// Debug current UI structure
window.debugUIStructure = function() {
    console.group('🔍 UI Structure Debug');
    
    // Check for common UI elements
    const elements = {
        'Check Status Button': findCheckStatusButton(),
        'Settings Modal': findSettingsModal(),
        'Toolbar': findToolbar(),
        'Existing Label Button': document.getElementById('labelCustomizerToggle')
    };
    
    Object.entries(elements).forEach(([name, element]) => {
        console.log(`${name}:`, element ? 'FOUND' : 'NOT FOUND');
        if (element) {
            console.log('  Element:', element);
            console.log('  HTML:', element.outerHTML);
        }
    });
    
    console.groupEnd();
};
