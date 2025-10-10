// Ensure a global elements object exists and initialize it once
if (!window.elements) window.elements = {};
if (!window._elementsInitialized) {
    document.addEventListener('DOMContentLoaded', function() {
        // initializeElementsObject returns a map and sets elements[...] entries
        try {F
            // Call the existing helper if available
            if (typeof initializeElementsObject === 'function') {
                window.elements = initializeElementsObject();
            } else if (typeof initializeElements === 'function') {
                // fallback to older function name if present
                window.elements = initializeElements();
            } else {
                // Best-effort single element mapping
                window.elements = initializeElements ? initializeElements() : window.elements || {};
            }
        } catch (err) {
            console.error('Failed to initialize elements:', err);
        }
        window._elementsInitialized = true;

        // Attach a single, robust tab click handler AFTER elements exist
        document.querySelectorAll('.tab').forEach(tab => {
            tab.removeEventListener('click', window._procleanTabHandler);
        });
        window._procleanTabHandler = function (e) {
            const tabName = this.getAttribute('data-tab');
            if (!tabName) return;
            // Use the canonical switchTab function; it's defined in app.js
            if (typeof switchTab === 'function') {
                switchTab(tabName);
            } else {
                // Fallback: manually show/hide panes
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                const pane = document.getElementById(tabName + 'Tab');
                if (pane) pane.classList.add('active');
                this.classList.add('active');
            }

            // Trigger the correct populate* after tab change
            switch (tabName) {
                case 'stock':
                    if (typeof populateStockTable === 'function') populateStockTable();
                    break;
                case 'reports':
                    if (typeof populateReportsTable === 'function') populateReportsTable();
                    break;
                case 'shipping':
                    if (typeof populateShippingTable === 'function') populateShippingTable();
                    break;
                case 'packaging':
                    if (typeof populatePackagesTable === 'function') populatePackagesTable();
                    break;
            }
        };
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', window._procleanTabHandler);
        });
    });
}



// 3. ELEMENT EXISTENCE VALIDATION - ADD THIS AT THE BEGINNING
function initializeElements() {
    const elementIds = ['loginScreen', 'appContainer', 'customerSelect'];
    const elements = {};
    
    elementIds.forEach(id => {
        elements[id] = document.getElementById(id);
        if (!elements[id]) {
            console.error(`Element ${id} not found`);
        }
    });
    
    return elements;
}

function initializeElementsObject() {
    const elementMap = {
        loginScreen: 'loginScreen',
        appContainer: 'appContainer',
        loginButton: 'loginBtn',
        emailInput: 'email',
        passwordInput: 'password',
        customerSelect: 'customerSelect',
        personnelSelect: 'personnelSelect',
        currentDate: 'currentDate',
        barcodeInput: 'barcodeInput',
        packagesTableBody: 'packagesTableBody',
        packageDetailContent: 'packageDetailContent',
        shippingFolders: 'shippingFolders',
        stockTableBody: 'stockTableBody',
        customerList: 'customerList',
        allCustomersList: 'allCustomersList',
        toast: 'toast',
        containerNumber: 'containerNumber',
        totalPackages: 'totalPackages',
        shippingFilter: 'shippingFilter',
        stockSearch: 'stockSearch',
        selectAllPackages: 'selectAllPackages',
        quantityInput: 'quantityInput',
        quantityModal: 'quantityModal',
        quantityModalTitle: 'quantityModalTitle',
        scannedBarcodes: 'scannedBarcodes',
        connectionStatus: 'connectionStatus',
        alertContainer: 'alertContainer',
        scannerToggle: 'scannerToggle',
        containerSearch: 'containerSearch',
        settingsModal: 'settingsModal',
        closeSettingsModalBtn: 'closeSettingsModalBtn',
        toggleThemeBtn: 'toggleThemeBtn',
        downloadDataBtn: 'downloadDataBtn',
        changeApiKeyBtn: 'changeApiKeyBtn',
    };
    
    Object.keys(elementMap).forEach(key => {
        const element = document.getElementById(elementMap[key]);
        if (element) {
            elements[key] = element;
        } else {
            console.warn(`Element ${elementMap[key]} not found`);
            elements[key] = null;
        }
    });
    
    return elements;
}

// Profesyonel alert sistemi
// 1. Prevent duplicate alerts with debouncing
let alertQueue = new Set(); // Track active alerts

function showAlert(message, type = 'info', duration = 5000) {
    // Prevent duplicate alerts
    const alertKey = `${message}-${type}`;
    if (alertQueue.has(alertKey)) {
        return; // Already showing this alert
    }
    
    alertQueue.add(alertKey);
    
    if (!elements.alertContainer) {
        console.error('Alert container not found, using console instead');
        console.log(`${type.toUpperCase()}: ${message}`);
        alertQueue.delete(alertKey);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const span = document.createElement('span');
    span.textContent = message;
    
    const button = document.createElement('button');
    button.className = 'alert-close';
    button.textContent = '×';
    
    alert.appendChild(span);
    alert.appendChild(button);
    
    elements.alertContainer.appendChild(alert);
    
    // Close button event
    button.addEventListener('click', () => {
        alert.classList.add('hide');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
                alertQueue.delete(alertKey);
            }
        }, 300);
    });
    
    // Auto close
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.add('hide');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                        alertQueue.delete(alertKey);
                    }
                }, 300);
            }
        }, duration);
    }
    
    return alert;
}

// Yardımcı fonksiyonlar
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Form doğrulama fonksiyonu
let validationTimeout = null;

function validateFormDebounced(inputs, callback) {
    // Clear previous timeout
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }
    
    // Debounce validation
    validationTimeout = setTimeout(() => {
        const isValid = validateForm(inputs);
        if (callback) callback(isValid);
    }, 200);
}


// Barkod tarayıcı modunu aç/kapa
function toggleScannerMode() {
    scannerMode = !scannerMode;
    
    if (scannerMode) {
        elements.barcodeInput.classList.add('scanner-active');
        elements.scannerToggle.innerHTML = '<i class="fas fa-camera"></i> Barkod Tarayıcıyı Kapat';
        elements.barcodeInput.focus();
        showAlert('Barkod tarayıcı modu aktif. Barkodu okutun.', 'info');
    } else {
        elements.barcodeInput.classList.remove('scanner-active');
        elements.scannerToggle.innerHTML = '<i class="fas fa-camera"></i> Barkod Tarayıcıyı Aç';
        showAlert('Barkod tarayıcı modu kapatıldı.', 'info');
    }
}

// Barkod tarayıcı dinleyicisi
let barcodeListenerAttached = false;

function setupBarcodeScanner() {
    if (!elements.barcodeInput) {
        console.error('Barcode input element not found');
        return;
    }
    
    // Prevent multiple listeners
    if (barcodeListenerAttached) {
        return;
    }
    
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    
    // Single event listener
    const barcodeHandler = function(e) {
        const currentTime = Date.now();
        
        if (scannerMode || currentTime - lastKeyTime < 50) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (barcodeBuffer.length > 5) {
                    elements.barcodeInput.value = barcodeBuffer;
                    processBarcode();
                }
                barcodeBuffer = '';
            } else {
                barcodeBuffer += e.key;
            }
        } else {
            barcodeBuffer = '';
        }
        
        lastKeyTime = currentTime;
    };
    
    elements.barcodeInput.addEventListener('keypress', barcodeHandler);
    barcodeListenerAttached = true;
}

// Stok düzenleme fonksiyonları
let currentEditingRow = null;


// Enhanced stock editing functionality
// Enhanced stock editing functionality
function editStockItem(code) {
    console.log('Editing stock item:', code);
    
    // Find the row
    const stockTableBody = document.getElementById('stockTableBody');
    if (!stockTableBody) {
        console.error('Stock table body not found');
        return;
    }
    
    const rows = stockTableBody.querySelectorAll('tr');
    let targetRow = null;
    
    for (let row of rows) {
        const codeCell = row.querySelector('td:first-child');
        if (codeCell && codeCell.textContent.trim() === code) {
            targetRow = row;
            break;
        }
    }
    
    if (!targetRow) {
        showAlert('Stok öğesi bulunamadı: ' + code, 'error');
        return;
    }
    
    const quantityCell = targetRow.querySelector('td:nth-child(3)'); // 3rd column is quantity
    if (!quantityCell) {
        console.error('Quantity cell not found');
        return;
    }
    
    const currentQuantity = parseInt(quantityCell.textContent) || 0;
    
    const newQuantity = prompt(`${code} için yeni miktarı girin:`, currentQuantity);
    
    if (newQuantity === null) {
        return; // User cancelled
    }
    
    const quantity = parseInt(newQuantity);
    
    if (isNaN(quantity) || quantity < 0) {
        showAlert('Geçerli bir miktar girin (0 veya üzeri)', 'error');
        return;
    }
    
    // Update the stock
    updateStockItem(code, quantity, targetRow);
}

async function updateStockItem(code, newQuantity, row) {
    try {
        showAlert('Stok güncelleniyor...', 'info', 1000);
        
        const quantityCell = row.querySelector('td:nth-child(3)');
        const statusCell = row.querySelector('td:nth-child(5)');
        const dateCell = row.querySelector('td:nth-child(6)');
        
        // Update UI immediately
        if (quantityCell) quantityCell.textContent = newQuantity;
        if (dateCell) dateCell.textContent = new Date().toLocaleDateString('tr-TR');
        
        // Update status
        if (statusCell) {
            let statusClass, statusText;
            if (newQuantity === 0) {
                statusClass = 'status-kritik';
                statusText = 'Tükendi';
            } else if (newQuantity < 10) {
                statusClass = 'status-az-stok';
                statusText = 'Az Stok';
            } else if (newQuantity < 50) {
                statusClass = 'status-uyari';
                statusText = 'Düşük';
            } else {
                statusClass = 'status-stokta';
                statusText = 'Stokta';
            }
            
            statusCell.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
        }
        
        // Save to database if online
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('stock_items')
                .update({ 
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('code', code);
                
            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }
            
            showAlert(`✅ Stok güncellendi: ${code} - ${newQuantity} adet`, 'success');
        } else {
            // Save to localStorage for offline mode
            const stockUpdates = JSON.parse(localStorage.getItem('stockUpdates') || '[]');
            stockUpdates.push({
                code: code,
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            });
            localStorage.setItem('stockUpdates', JSON.stringify(stockUpdates));
            
            showAlert(`✅ Stok güncellendi (offline): ${code} - ${newQuantity} adet`, 'success');
        }
        
    } catch (error) {
        console.error('Stock update error:', error);
        showAlert('Stok güncellenirken hata oluştu: ' + error.message, 'error');
        
        // Reload table on error
        if (typeof populateStockTable === 'function') {
            populateStockTable();
        }
    }
}


// Add missing saveStockItem function
async function saveStockItem(code, input) {
    // Prevent multiple saves
    if (input.disabled) {
        return;
    }
    
    const newQuantity = parseInt(input.value);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        showAlert('Geçerli bir sayı girin (0 veya üzeri)', 'error');
        input.focus();
        return;
    }
    
    const originalQuantity = input.getAttribute('data-original');
    
    if (newQuantity.toString() === originalQuantity) {
        cancelEditStockItem(code, originalQuantity);
        return;
    }
    
    try {
        input.disabled = true;
        
        // Only show one loading message
        const loadingAlert = showAlert('Güncelleniyor...', 'info', 1000);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update the UI
        const row = input.closest('tr');
        const quantityCell = row.querySelector('td:nth-child(3)');
        const actionsCell = row.querySelector('td:last-child');
        const statusCell = row.querySelector('td:nth-child(5)');
        const lastUpdateCell = row.querySelector('td:nth-child(6)');
        
        quantityCell.textContent = newQuantity;
        
        if (statusCell) {
            if (newQuantity === 0) {
                statusCell.innerHTML = '<span class="status-badge out-of-stock">Tükendi</span>';
            } else if (newQuantity <= 5) {
                statusCell.innerHTML = '<span class="status-badge low-stock">Düşük</span>';
            } else {
                statusCell.innerHTML = '<span class="status-badge in-stock">Mevcut</span>';
            }
        }
        
        if (lastUpdateCell) {
            lastUpdateCell.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        restoreEditButton(actionsCell, code);
        editingStockItem = null;
        currentEditingRow = null;
        
        showAlert(`Stok güncellendi: ${code} - ${newQuantity} adet`, 'success');
        
    } catch (error) {
        console.error('Stok güncelleme hatası:', error);
        showAlert('Stok güncellenirken hata oluştu: ' + error.message, 'error');
        input.disabled = false;
        input.focus();
    }
}

function cancelEditStockItem(code, originalQuantity) {
    const row = document.querySelector(`tr:has(td:first-child:contains("${code}"))`);
    const quantityInput = row.querySelector('.stock-quantity-input');
    const quantitySpan = row.querySelector('.stock-quantity');
    const editButton = row.querySelector('button');
    const editButtons = row.querySelector('.edit-buttons');
    
    // Değişiklikleri iptal et
    quantityInput.value = originalQuantity;
    quantitySpan.style.display = 'block';
    quantityInput.style.display = 'none';
    editButton.style.display = 'block';
    editButtons.style.display = 'none';
    
    editingStockItem = null;
}

function checkOnlineStatus() {
    if (!navigator.onLine) {
        showAlert("Çevrimdışı Mod: İnternet yok, bazı işlemler çalışmayacak", "error");
        return false;
    }
    return true;
}

// Konteyner detay modalını kapat
function closeContainerDetailModal() {
    document.getElementById('containerDetailModal').style.display = 'none';
    currentContainerDetails = null;
}


// Taranan barkodları göster
function displayScannedBarcodes() {
    const container = document.getElementById('scannedBarcodes');
    container.innerHTML = '';
    
    if (scannedBarcodes.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; font-size:0.8rem;">Henüz barkod taranmadı</p>';
        return;
    }
    
    const list = document.createElement('ul');
    list.style = 'list-style: none; padding: 0; margin: 0; font-size: 0.8rem;';
    
    scannedBarcodes.forEach(barcode => {
        const item = document.createElement('li');
        item.style = 'padding: 5px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;';
        item.innerHTML = `
            <span>${barcode.barcode}</span>
            <span style="color: ${barcode.processed ? 'green' : 'orange'}">
                ${barcode.processed ? 'İşlendi' : 'Beklemede'}
            </span>
        `;
        list.appendChild(item);
    });
    
    container.appendChild(list);
}

function selectCustomerFromModal(customer) {
    selectedCustomer = customer;
    elements.customerSelect.value = customer.id;
    closeModal();
    showAlert(`Müşteri seçildi: ${customer.name}`, 'success');
}
        
// ----------------------
// Helper: Touch keyboard (POS-only) - UI Neutral
// ----------------------
function showTouchKeyboardIfPOS() {
    return new Promise((resolve) => {
        try {
            // More robust touch detection
            const hasTouch = (
                (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) ||
                ('ontouchstart' in window) ||
                (window.DocumentTouch && document instanceof DocumentTouch)
            );

            if (!hasTouch) {
                console.log('🖐️ No touch capability detected - skipping keyboard');
                resolve(false);
                return;
            }

            console.log('🖐️ Touch device detected, opening keyboard...');

            // Multiple execution methods
            const openKeyboard = (method) => {
                const keyboardPath = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\TabTip.exe`;
                
                switch(method) {
                    case 'electronAPI':
                        if (window.electronAPI && window.electronAPI.execCommand) {
                            window.electronAPI.execCommand(`"${keyboardPath}"`)
                                .then(() => {
                                    console.log('✅ Keyboard opened via electronAPI');
                                    resolve(true);
                                })
                                .catch(err => {
                                    console.warn('❌ electronAPI failed:', err);
                                    tryNextMethod();
                                });
                            return;
                        }
                        break;
                        
                    case 'require':
                        try {
                            const { exec } = require('child_process');
                            exec(`"${keyboardPath}"`, (err) => {
                                if (err) {
                                    console.warn('❌ require failed:', err);
                                    tryNextMethod();
                                } else {
                                    console.log('✅ Keyboard opened via require');
                                    resolve(true);
                                }
                            });
                            return;
                        } catch (e) {
                            console.warn('❌ require not available');
                            tryNextMethod();
                        }
                        break;
                        
                    case 'windowRequire':
                        try {
                            const { exec } = window.require('child_process');
                            exec(`"${keyboardPath}"`, (err) => {
                                if (err) {
                                    console.warn('❌ window.require failed:', err);
                                    tryNextMethod();
                                } else {
                                    console.log('✅ Keyboard opened via window.require');
                                    resolve(true);
                                }
                            });
                            return;
                        } catch (e) {
                            console.warn('❌ window.require not available');
                            tryNextMethod();
                        }
                        break;
                }
                
                tryNextMethod();
            };

            let methodIndex = 0;
            const methods = ['electronAPI', 'require', 'windowRequire'];
            
            const tryNextMethod = () => {
                if (methodIndex < methods.length) {
                    openKeyboard(methods[methodIndex++]);
                } else {
                    console.warn('❌ All keyboard methods failed');
                    resolve(false);
                }
            };

            tryNextMethod();

        } catch (err) {
            console.warn("⚠️ showTouchKeyboardIfPOS error:", err);
            resolve(false);
        }
    });
}

function hideTouchKeyboard() {
    try {
        if (typeof process === 'undefined' || process.platform !== 'win32') return;

        let execFunc;
        try {
            execFunc = require('child_process').exec;
        } catch (e) {
            if (window && window.require) {
                try { execFunc = window.require('child_process').exec; } catch (e2) { /* fallback */ }
            }
        }
        if (!execFunc) return;

        execFunc('taskkill /IM TabTip.exe /F', () => { /* ignore errors */ });
    } catch (err) {
        console.warn("⚠️ hideTouchKeyboard error:", err && err.message ? err.message : err);
    }
}

// ----------------------
// Touch Keyboard Testing (Optional - doesn't affect UI)
// ----------------------
window.testTouchKeyboard = function() {
    console.group('🖐️ Touch Keyboard Test');
    console.log('Touch points:', navigator.maxTouchPoints);
    console.log('ontouchstart:', 'ontouchstart' in window);
    console.log('Platform:', navigator.platform);
    console.log('process:', typeof process !== 'undefined' ? process.platform : 'undefined');
    console.log('electronAPI:', !!(window.electronAPI));
    console.groupEnd();
    
    showTouchKeyboardIfPOS();
};

window.simpleTouchTest = function() {
    const hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
    console.log('Touch capability:', hasTouch);
    alert(hasTouch ? 'Touch device detected!' : 'No touch capability');
};



function openQuantityModalFixed(productName) {
    const modal = document.getElementById('quantityModal');
    const input = document.getElementById('quantityInput');
    const title = document.getElementById('quantityModalTitle');
    
    if (!modal || !input || !title) return;
    
    selectedProduct = productName;
    title.textContent = `${productName} - Miktar Girin`;
    input.value = '';
    modal.style.display = 'flex';
    
    // FIX: Prevent freeze in Electron
    if (window.isElectronApp || isTouchDevice()) {
        setTimeout(() => {
            input.focus();
            // Enable touch-friendly input
            input.setAttribute('inputmode', 'numeric');
            input.setAttribute('pattern', '[0-9]*');
        }, 100);
    } else {
        input.focus();
    }
}

function isTouchDevice() {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
}

// Replace all openQuantityModal calls
window.openQuantityModal = openQuantityModalFixed;

function openStatusQuantityModal(status) {
    selectedProduct = status; // reuse the same global
    const titleEl = elements?.quantityModalTitle ?? document.getElementById('quantityModalTitle');
    const inputEl = elements?.quantityInput ?? document.getElementById('quantityInput');
    const modalEl = elements?.quantityModal ?? document.getElementById('quantityModal');

    if (titleEl) titleEl.textContent = `${status} - Adet Girin`;
    if (inputEl) inputEl.value = '';
    const errEl = document.getElementById('quantityError');
    if (errEl) errEl.style.display = 'none';
    if (modalEl) modalEl.style.display = 'flex';

    // Focus + show keyboard (delay to allow modal to open)
    setTimeout(() => {
        if (inputEl) inputEl.focus();
        showTouchKeyboardIfPOS();
    }, 200);
}

function confirmQuantity() {
    const inputEl = elements?.quantityInput ?? document.getElementById('quantityInput');
    const val = inputEl ? inputEl.value : (document.getElementById('quantityInput')?.value || '');
    const quantity = parseInt(val, 10);

    // Validation
    if (!quantity || quantity <= 0) {
        const errEl = document.getElementById('quantityError');
        if (errEl) errEl.style.display = 'block';
        return;
    }

    // Update quantity badge
    const badge = document.getElementById(`${selectedProduct}-quantity`);
    if (badge) {
        const currentQuantity = parseInt(badge.textContent, 10) || 0;
        badge.textContent = currentQuantity + quantity;
    }

    // Add to current package
    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[selectedProduct] = (currentPackage.items[selectedProduct] || 0) + quantity;

    showAlert(`${selectedProduct}: ${quantity} adet eklendi`, 'success');
    // Close modal if you have closeQuantityModal() defined elsewhere
    if (typeof closeQuantityModal === 'function') {
        closeQuantityModal();
    } else {
        // fallback: hide modal element
        const modalEl = elements?.quantityModal ?? document.getElementById('quantityModal');
        if (modalEl) modalEl.style.display = 'none';
    }

    // hide keyboard after confirm (POS only)
    hideTouchKeyboard();
}

// ----------------------
// Manual entry modal
// ----------------------
function openManualEntry() {
    const modal = document.getElementById('manualModal');
    if (modal) {
        modal.style.display = 'flex';
        const prod = document.getElementById('manualProduct');
        if (prod) prod.focus();
    }
}

function closeManualModal() {
    const modal = document.getElementById('manualModal');
    if (modal) modal.style.display = 'none';
}

function addManualProduct() {
    const product = (document.getElementById('manualProduct')?.value || '').trim();
    const quantity = parseInt(document.getElementById('manualQuantity')?.value || '0', 10);

    // Form validation
    if (!validateForm([
        { id: 'manualProduct', errorId: 'manualProductError', type: 'text', required: true },
        { id: 'manualQuantity', errorId: 'manualQuantityError', type: 'number', required: true }
    ])) {
        return;
    }

    // Add to current package
    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[product] = (currentPackage.items[product] || 0) + quantity;

    showAlert(`${product}: ${quantity} adet eklendi`, 'success');

    // Clear form and close modal
    const mp = document.getElementById('manualProduct');
    const mq = document.getElementById('manualQuantity');
    if (mp) mp.value = '';
    if (mq) mq.value = '';
    closeManualModal();
}

// ----------------------
// Extra modal open/close
// ----------------------
function openExtraModal() {
    const modal = document.getElementById('extraModal');
    if (modal) modal.style.display = 'block';
}
function closeExtraModal() {
    const modal = document.getElementById('extraModal');
    if (modal) modal.style.display = 'none';
}

// ----------------------
// Settings modal & load/save
// ----------------------
function showSettingsModal() {
    loadSettings(); // Load current settings
    if (typeof checkSystemStatus === 'function') checkSystemStatus(); // optional
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

    // Theme
    if (settings.theme === 'dark') {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }

    // Language
    if (settings.language) {
        const lang = document.getElementById('languageSelect');
        if (lang) lang.value = settings.language;
    }

    // Auto-save
    const auto = document.getElementById('autoSaveToggle');
    if (auto) auto.checked = settings.autoSave !== false;
}

// ----------------------
// Printer settings load/save
// ----------------------
function loadPrinterSettings(settings) {
    document.getElementById('printerScaling').value = settings.printerScaling || '100%';
    document.getElementById('copiesNumber').value = settings.copies || 1;
    document.getElementById('fontName').value = settings.fontName || 'Arial';
    document.getElementById('fontSize').value = settings.fontSize || 10;
    document.getElementById('orientation').value = settings.orientation || 'portrait';
    document.getElementById('marginTop').value = settings.marginTop ?? 5;
    document.getElementById('marginBottom').value = settings.marginBottom ?? 5;
    document.getElementById('labelHeader').value = settings.labelHeader || 'Yeditepe';
}

function savePrinterSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

    settings.printerScaling = document.getElementById('printerScaling').value;
    settings.copies = parseInt(document.getElementById('copiesNumber').value, 10);
    settings.fontName = document.getElementById('fontName').value;
    settings.fontSize = parseInt(document.getElementById('fontSize').value, 10);
    settings.orientation = document.getElementById('orientation').value;
    settings.marginTop = parseInt(document.getElementById('marginTop').value, 10);
    settings.marginBottom = parseInt(document.getElementById('marginBottom').value, 10);
    settings.labelHeader = document.getElementById('labelHeader').value || 'Yeditepe';

    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    console.log('Printer settings saved', settings);
}

// ----------------------
// INIT
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    loadPrinterSettings(settings);

    const inputIds = [
        'printerScaling', 'copiesNumber', 'fontName',
        'fontSize', 'orientation', 'marginTop', 'marginBottom', 'labelHeader'
    ];

    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', savePrinterSettings);
    });

    const testBtn = document.getElementById('test-printer-yazdir');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            savePrinterSettings();
            const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
            const printerInstance = getPrinter();

            const originalText = testBtn.textContent;
            testBtn.disabled = true;
            testBtn.textContent = 'Test Ediliyor...';

            try {
                // Use labelHeader for test print
                await printerInstance.testPrint(settings, settings.labelHeader);
            } catch (error) {
                console.error('Test print error:', error);
                showAlert('Test yazdırma başarısız: ' + (error.message || error), 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = originalText;
            }
        });
    }
});

// 🟢 Close any modal if user clicks outside
window.addEventListener('click', function(event) {
    const modals = ['manualModal', 'extraModal', 'quantityModal', 'settingsModal'];
    for (const id of modals) {
        const modal = document.getElementById(id);
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    }
});

// ---------------- PRINT PACKAGE WITH SETTINGS ----------------
async function printPackageWithSettings(packageData) {
    try {
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        const printerInstance = getPrinter();

        const barcode = packageData.package_no;
        const labelText = `${packageData.customer_name} - ${packageData.product}`;
        const header = settings.labelHeader || 'Yeditepe';

        return await printerInstance.printBarcode(barcode, labelText, packageData, settings, header);
    } catch (error) {
        console.error('Print with settings error:', error);
        showAlert('Yazdırma hatası: ' + error.message, 'error');
        return false;
    }
}

// Language - SIMULATION MODE to prevent errors
function changeLanguage(lang) {
    // SIMULATION MODE - just log the change without actual implementation
    console.log('Language change simulated:', lang);
    showAlert(`Dil değiştirildi (simülasyon): ${lang}`, 'info');
    
    // Update HTML lang attribute (safe operation)
    if (document.documentElement) {
        document.documentElement.lang = lang || 'tr';
    }
}

// Update font size throughout the application
function updateFontSize(size) {
    const elements = document.querySelectorAll('body, button, input, select, textarea');
    elements.forEach(element => {
        element.style.fontSize = size + 'px';
    });
}

// Update printer settings in real-time
function updatePrinterSettings(settings) {
    if (window.printerElectron && settings) {
        // Update printer instance with new settings
        window.printerElectron.settings = settings;
    }
}

// Setup event listeners for settings changes
function setupSettingsEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
            settings.theme = this.checked ? 'dark' : 'light';
            localStorage.setItem('procleanSettings', JSON.stringify(settings));
            applySettings(settings);
        });
    }
    
    // Real-time settings updates
    const realTimeSettings = ['printerScaling', 'copiesNumber', 'fontSizeSelect', 
                             'printQualitySelect', 'barcodeTypeSelect', 'paperSizeSelect',
                             'printerFontSize', 'printerMargin', 'barcodeHeight', 
                             'labelWidth', 'labelHeight'];
    
    realTimeSettings.forEach(settingId => {
        const element = document.getElementById(settingId);
        if (element) {
            element.addEventListener('change', function() {
                // Auto-save when these settings change
                setTimeout(saveAllSettings, 100);
            });
        }
    });
    
    // Toggle settings
    const toggleSettings = ['soundToggle', 'notificationsToggle', 'backupToggle', 'autoSaveToggle'];
    toggleSettings.forEach(toggleId => {
        const element = document.getElementById(toggleId);
        if (element) {
            element.addEventListener('change', saveAllSettings);
        }
    });
    
    // Language select
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            changeLanguage(this.value);
            saveAllSettings();
        });
    }
}

// Setup auto-save functionality - FIX #4: toggleAutoSave defined
function toggleAutoSave() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    settings.autoSave = !settings.autoSave;
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    if (autoSaveToggle) {
        autoSaveToggle.checked = settings.autoSave;
    }
    
    showAlert(`Otomatik kaydetme ${settings.autoSave ? 'açıldı' : 'kapatıldı'}`, 'info');
    
    if (settings.autoSave) {
        setupAutoSave();
    }
}

function setupAutoSave() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    if (settings.autoSave !== false) { // default enabled
        // Auto-save every 30 seconds
        setInterval(() => {
            if (window.saveAppState) {
                window.saveAppState();
                console.log('Auto-save completed');
            }
        }, 5000);
        
        // Also save on page unload
        window.addEventListener('beforeunload', () => {
            if (window.saveAppState) {
                window.saveAppState();
            }
        });
    }
}

// FIX #3: toggleDebugMode defined
function toggleDebugMode() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    settings.debugMode = !settings.debugMode;
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    
    const debugToggle = document.getElementById('debugToggle');
    if (debugToggle) {
        debugToggle.checked = settings.debugMode;
    }
    
    // Apply debug mode
    if (settings.debugMode) {
        console.log('Debug mode enabled');
        window.DEBUG_MODE = true;
        document.body.classList.add('debug-mode');
        showAlert('Debug modu açıldı - Konsol logları aktif', 'info');
    } else {
        console.log('Debug mode disabled');
        window.DEBUG_MODE = false;
        document.body.classList.remove('debug-mode');
        showAlert('Debug modu kapatıldı', 'info');
    }
}

// FIX #1: runPerformanceTest function
function runPerformanceTest() {
    showAlert('Performans testi başlatılıyor...', 'info');
    
    const startTime = performance.now();
    const results = {
        domOperations: 0,
        calculations: 0,
        localStorage: 0,
        rendering: 0
    };
    
    // Test DOM operations
    const domStart = performance.now();
    for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.innerHTML = `Test element ${i}`;
        document.body.appendChild(div);
        document.body.removeChild(div);
    }
    results.domOperations = performance.now() - domStart;
    
    // Test calculations
    const calcStart = performance.now();
    for (let i = 0; i < 100000; i++) {
        Math.sqrt(i * Math.PI);
    }
    results.calculations = performance.now() - calcStart;
    
    // Test localStorage
    const localStorageStart = performance.now();
    for (let i = 0; i < 1000; i++) {
        localStorage.setItem(`test_${i}`, JSON.stringify({data: i}));
        localStorage.getItem(`test_${i}`);
        localStorage.removeItem(`test_${i}`);
    }
    results.localStorage = performance.now() - localStorageStart;
    
    // Test rendering
    const renderStart = performance.now();
    const testTable = document.createElement('table');
    for (let i = 0; i < 100; i++) {
        const row = testTable.insertRow();
        for (let j = 0; j < 5; j++) {
            const cell = row.insertCell();
            cell.textContent = `Cell ${i}-${j}`;
        }
    }
    document.body.appendChild(testTable);
    document.body.removeChild(testTable);
    results.rendering = performance.now() - renderStart;
    
    const totalTime = performance.now() - startTime;
    
    // Display results
    const resultsWindow = window.open('', '_blank', 'width=600,height=500');
    resultsWindow.document.write(`
        <html>
        <head>
            <title>Performance Test Results</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .result { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                .good { background: #d4edda; }
                .warning { background: #fff3cd; }
                .poor { background: #f8d7da; }
            </style>
        </head>
        <body>
            <h2>Performance Test Results</h2>
            <div class="result ${results.domOperations < 100 ? 'good' : results.domOperations < 200 ? 'warning' : 'poor'}">
                <strong>DOM Operations:</strong> ${results.domOperations.toFixed(2)}ms
            </div>
            <div class="result ${results.calculations < 50 ? 'good' : results.calculations < 100 ? 'warning' : 'poor'}">
                <strong>Mathematical Calculations:</strong> ${results.calculations.toFixed(2)}ms
            </div>
            <div class="result ${results.localStorage < 200 ? 'good' : results.localStorage < 400 ? 'warning' : 'poor'}">
                <strong>LocalStorage Operations:</strong> ${results.localStorage.toFixed(2)}ms
            </div>
            <div class="result ${results.rendering < 100 ? 'good' : results.rendering < 200 ? 'warning' : 'poor'}">
                <strong>Rendering Operations:</strong> ${results.rendering.toFixed(2)}ms
            </div>
            <div class="result">
                <strong>Total Test Time:</strong> ${totalTime.toFixed(2)}ms
            </div>
            <div class="result">
                <strong>Browser:</strong> ${navigator.userAgent}
            </div>
            <div class="result">
                <strong>Memory Usage:</strong> ${performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB` : 'Not available'}
            </div>
            <div class="result">
                <strong>Test Date:</strong> ${new Date().toLocaleString()}
            </div>
        </body>
        </html>
    `);
    
    showAlert(`Performans testi tamamlandı! Toplam süre: ${totalTime.toFixed(2)}ms`, 'success');
    console.log('Performance test results:', results);
}

// FIX #2: showConsoleLogs function
function showConsoleLogs() {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    // Create logs window
    const logsWindow = window.open('', '_blank', 'width=800,height=600');
    logsWindow.document.write(`
        <html>
        <head>
            <title>Console Logs - ProClean</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 10px; background: #1e1e1e; color: #fff; margin: 0; }
                .log-entry { margin: 2px 0; padding: 5px; border-radius: 3px; word-wrap: break-word; }
                .log { background: #2d2d2d; }
                .error { background: #d32f2f; color: white; }
                .warn { background: #ff9800; color: black; }
                .info { background: #2196f3; color: white; }
                .timestamp { color: #888; font-size: 12px; }
                #controls { position: fixed; top: 10px; right: 10px; z-index: 1000; }
                button { margin: 0 5px; padding: 5px 10px; }
                #logs { margin-top: 50px; max-height: calc(100vh - 100px); overflow-y: auto; }
            </style>
        </head>
        <body>
            <div id="controls">
                <button onclick="clearLogs()">Clear Logs</button>
                <button onclick="window.close()">Close</button>
                <button onclick="exportLogs()">Export</button>
            </div>
            <div id="logs"></div>
            <script>
                function clearLogs() {
                    document.getElementById('logs').innerHTML = '';
                }
                function exportLogs() {
                    const logs = document.getElementById('logs').innerText;
                    const blob = new Blob([logs], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'proclean-logs-' + new Date().toISOString().slice(0, 10) + '.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                }
                function addLog(message, type = 'log') {
                    const logs = document.getElementById('logs');
                    const entry = document.createElement('div');
                    entry.className = 'log-entry ' + type;
                    entry.innerHTML = '<span class="timestamp">[' + new Date().toLocaleTimeString() + ']</span> ' + message;
                    logs.appendChild(entry);
                    logs.scrollTop = logs.scrollHeight;
                }
            </script>
        </body>
        </html>
    `);
    
    const logsDiv = logsWindow.document.getElementById('logs');
    
    // Override console methods to show in logs window
    console.log = function(...args) {
        originalLog.apply(console, args);
        if (logsWindow && !logsWindow.closed) {
            logsWindow.addLog(args.join(' '), 'log');
        }
    };
    
    console.error = function(...args) {
        originalError.apply(console, args);
        if (logsWindow && !logsWindow.closed) {
            logsWindow.addLog(args.join(' '), 'error');
        }
    };
    
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        if (logsWindow && !logsWindow.closed) {
            logsWindow.addLog(args.join(' '), 'warn');
        }
    };
    
    console.info = function(...args) {
        originalInfo.apply(console, args);
        if (logsWindow && !logsWindow.closed) {
            logsWindow.addLog(args.join(' '), 'info');
        }
    };
    
    // Restore original console methods when window closes
    logsWindow.addEventListener('beforeunload', () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        console.info = originalInfo;
    });
    
    showAlert('Console logs penceresi açıldı', 'success');
    console.log('Console logs monitoring started');
}

function resetSettings() {
    if (!confirm('Uygulama ayarları varsayılana döndürülecek. Müşteri veya paket verileri silinmeyecek. Devam edilsin mi?')) return;

    try {
        // 🧹 Step 1: Remove all stored setting keys that could be corrupted or user-modified
        const keepKeys = ['packages', 'customers', 'sales', 'workspaces']; // ✅ Keep business data
        const allKeys = Object.keys(localStorage);
        
        for (const key of allKeys) {
            if (!keepKeys.includes(key)) {
                localStorage.removeItem(key);
            }
        }

        // 🧩 Step 2: Recreate clean default settings
        const defaultSettings = {
            theme: 'light',
            printerScaling: '100',
            copies: 1,
            language: 'tr',
            autoSave: true,
            fontSize: '14',
            printQuality: 'normal',
            barcodeType: 'code128',
            paperSize: '80x100',
            soundEnabled: true,
            notificationsEnabled: true,
            backupEnabled: true,
            printerFontSize: '12',
            printerMargin: '3',
            debugMode: false
        };

        // 🧾 Step 3: Save clean settings
        localStorage.setItem('procleanSettings', JSON.stringify(defaultSettings));

        // 🧠 Step 4: Optional cleanup of temporary app caches
        sessionStorage.clear();

        // 🪄 Step 5: Reload settings into UI/system
        if (typeof loadSettings === 'function') {
            loadSettings();
        }

        // 🔄 Step 6: Force full refresh to ensure a clean start
        showAlert('Ayarlar sıfırlandı. Uygulama temizleniyor...', 'info');
        setTimeout(() => location.reload(), 1200);

    } catch (error) {
        console.error('Ayar sıfırlama hatası:', error);
        showAlert('Ayarlar sıfırlanırken hata oluştu', 'error');
    }
}

// Import settings from file
function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const settings = JSON.parse(e.target.result);
            localStorage.setItem('procleanSettings', JSON.stringify(settings));
            applySettings(settings);
            loadSettings();
            showAlert('Ayarlar başarıyla içe aktarıldı', 'success');
        } catch (error) {
            showAlert('Ayar dosyası geçersiz', 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// FIX #6: Save all settings with fixed changeLanguage reference
function saveAllSettings() {
    const settings = {
        theme: document.getElementById('themeToggle')?.checked ? 'dark' : 'light',
        printerScaling: document.getElementById('printerScaling')?.value || '100',
        copies: parseInt(document.getElementById('copiesNumber')?.value) || 1,
        language: document.getElementById('languageSelect')?.value || 'tr',
        autoSave: document.getElementById('autoSaveToggle')?.checked !== false,
        fontSize: document.getElementById('fontSizeSelect')?.value || '14',
        printQuality: document.getElementById('printQualitySelect')?.value || 'normal',
        barcodeType: document.getElementById('barcodeTypeSelect')?.value || 'code128',
        paperSize: document.getElementById('paperSizeSelect')?.value || '80x100',
        soundEnabled: document.getElementById('soundToggle')?.checked !== false,
        notificationsEnabled: document.getElementById('notificationsToggle')?.checked !== false,
        backupEnabled: document.getElementById('backupToggle')?.checked !== false,
        debugMode: document.getElementById('debugToggle')?.checked || false,
        // FIX #7: Real printer settings (not fake)
        printerFontSize: parseInt(document.getElementById('printerFontSize')?.value) || 12,
        printerMargin: parseInt(document.getElementById('printerMargin')?.value) || 3,
        barcodeHeight: parseInt(document.getElementById('barcodeHeight')?.value) || 25,
        labelWidth: parseInt(document.getElementById('labelWidth')?.value) || 100,
        labelHeight: parseInt(document.getElementById('labelHeight')?.value) || 80,
        // Additional real printer settings
        printDensity: document.getElementById('printDensity')?.value || 'medium',
        printSpeed: document.getElementById('printSpeed')?.value || 'normal',
        paperType: document.getElementById('paperType')?.value || 'thermal',
        printerPort: document.getElementById('printerPort')?.value || 'USB001',
        printerModel: document.getElementById('printerModel')?.value || 'Generic'
    };
    
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    applySettings(settings);
    showAlert('Ayarlar kaydedildi', 'success');
    
    // Update printer settings in real-time
    updatePrinterSettings(settings);
}

// Apply settings to the application - FIX #6: Fixed changeLanguage reference
function applySettings(settings) {
    // Apply theme
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.checked = false;
    }
    
    // Apply language (safe simulation mode)
    if (settings.language && typeof changeLanguage === 'function') {
        changeLanguage(settings.language);
    }
    
    // Apply font size
    if (settings.fontSize) {
        document.documentElement.style.setProperty('--base-font-size', settings.fontSize + 'px');
        updateFontSize(settings.fontSize);
    }
    
    // Apply sound settings
    if (settings.soundEnabled !== undefined) {
        window.soundEnabled = settings.soundEnabled;
    }
    
    // Apply notification settings
    if (settings.notificationsEnabled !== undefined) {
        window.notificationsEnabled = settings.notificationsEnabled;
    }
    
    // Apply UI scaling
    if (settings.printerScaling) {
        document.documentElement.style.setProperty('--ui-scale', (parseInt(settings.printerScaling) / 100));
    }
    
    // Apply debug mode
    if (settings.debugMode !== undefined) {
        window.DEBUG_MODE = settings.debugMode;
        if (settings.debugMode) {
            document.body.classList.add('debug-mode');
        } else {
            document.body.classList.remove('debug-mode');
        }
    }
    
    console.log('Settings applied:', settings);
}

function toggleTheme() {
    const isDark = document.getElementById('themeToggle')?.checked;
    document.body.classList.toggle('dark-mode', isDark);
    const themeStatus = document.getElementById('themeStatus');
    if (themeStatus) {
        themeStatus.textContent = isDark ? 'Koyu' : 'Açık';
    }
}

function checkSystemStatus() {
    // --- Database connection ---
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (dbStatus) {
        if (window.supabase) {
            dbStatus.textContent = 'Bağlı';
            dbStatus.className = 'status-indicator connected';
        } else {
            dbStatus.textContent = 'Bağlantı Yok';
            dbStatus.className = 'status-indicator disconnected';
        }
    }

    // --- Printer connection ---
    const printerStatus = document.getElementById('printerConnectionStatus');
    if (printerStatus) {
        const printerInstance = typeof getPrinterElectron === 'function' ? getPrinterElectron() : null;

        if (printerInstance && printerInstance.isConnected) {
            printerStatus.textContent = 'Bağlı';
            printerStatus.className = 'status-indicator connected';
        } else {
            printerStatus.textContent = 'Bağlantı Yok';
            printerStatus.className = 'status-indicator disconnected';
        }
    }
}

async function exportData(format) {
    if (!format) {
        showAlert('⚠️ Format belirtilmedi!', 'error');
        return;
    }

    format = format.toLowerCase().trim();

    try {
        showAlert('📊 Veriler toplanıyor...', 'info');

        // Collect all data from the app
        const allData = await collectAllAppData();

        if (Object.keys(allData).length === 0) {
            showAlert('⚠️ Dışa aktarılacak veri bulunamadı!', 'info');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `proclean_full_backup_${timestamp}`;

        if (format === 'json') {
            await exportToJSON(allData, filename);
        } else if (format === 'excel') {
            await exportToExcel(allData, filename);
        } else {
            showAlert('⚠️ Geçersiz format seçildi! Sadece JSON veya Excel desteklenir.', 'error');
        }

    } catch (error) {
        console.error('Export error:', error);
        showAlert(`❌ Dışa aktarma hatası: ${error.message}`, 'error');
    }
}

// Collect all data from the application
async function collectAllAppData() {
    const allData = {
        metadata: {
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0',
            totalRecords: 0
        },
        settings: {},
        customers: [],
        packages: [],
        containers: [],
        stock: [],
        personnel: [],
        reports: [],
        shipping: [],
        users: [],
        auditLogs: []
    };

    try {
        // 1. Export Settings and Local Storage
        allData.settings = {
            theme: localStorage.getItem('procleanTheme'),
            apiKey: localStorage.getItem('procleanApiKey') ? '***HIDDEN***' : null,
            appState: JSON.parse(localStorage.getItem('procleanState') || '{}'),
            userPreferences: JSON.parse(localStorage.getItem('procleanPreferences') || '{}')
        };

        // 2. Export Customers
        if (window.packages && window.packages.length > 0) {
            const uniqueCustomers = [...new Set(window.packages.map(p => p.customer_name))].filter(Boolean);
            allData.customers = uniqueCustomers.map(name => ({
                name: name,
                totalPackages: window.packages.filter(p => p.customer_name === name).length,
                totalItems: window.packages.filter(p => p.customer_name === name)
                    .reduce((sum, p) => sum + (p.total_quantity || 0), 0)
            }));
        }

        // 3. Export Packages (Current Session)
        if (window.packages) {
            allData.packages = window.packages.map(pkg => ({
                package_no: pkg.package_no,
                customer_name: pkg.customer_name,
                product_names: getProductType(pkg), 
                total_quantity: pkg.total_quantity,
                status: pkg.status,
                container_id: pkg.container_id,
                created_at: pkg.created_at,
                packer: pkg.packer,
                barcode: pkg.barcode
            }));
        }

        // 4. Export Containers
        if (window.containers) {
            allData.containers = window.containers.map(container => ({
                container_no: container.container_no,
                customer: container.customer,
                package_count: container.package_count,
                total_quantity: container.total_quantity,
                status: container.status,
                created_at: container.created_at,
                shipped_at: container.shipped_at
            }));
        }

        // 5. Export Stock Items
        const stockTable = document.getElementById('stockTableBody');
        if (stockTable) {
            const stockRows = Array.from(stockTable.querySelectorAll('tr'));
            allData.stock = stockRows.map(tr => {
                const tds = tr.querySelectorAll('td');
                return {
                    code: tds[0]?.textContent.trim(),
                    name: tds[1]?.textContent.trim(),
                    quantity: parseInt(tds[2]?.textContent) || 0,
                    unit: tds[3]?.textContent.trim(),
                    category: tds[4]?.textContent.trim(),
                    critical_level: parseInt(tds[5]?.textContent) || 0
                };
            }).filter(item => item.code && item.name);
        }

        // 6. Export Personnel
        const personnelSelect = document.getElementById('personnelSelect');
        if (personnelSelect) {
            allData.personnel = Array.from(personnelSelect.options).map(option => ({
                id: option.value,
                name: option.textContent.trim(),
                isActive: option.value === personnelSelect.value
            })).filter(p => p.id); // Remove empty options
        }

        // 7. Export Current Session State
        allData.currentSession = {
            selectedCustomer: window.selectedCustomer,
            currentContainer: window.currentContainer,
            currentPackage: window.currentPackage,
            currentUser: window.currentUser,
            connectionStatus: navigator.onLine ? 'online' : 'offline'
        };

        // 8. Export Shipping/Container Data
        const shippingTable = document.getElementById('shippingTableBody');
        if (shippingTable) {
            const shippingRows = Array.from(shippingTable.querySelectorAll('tr'));
            allData.shipping = shippingRows.map(tr => {
                const tds = tr.querySelectorAll('td');
                const checkbox = tr.querySelector('input[type="checkbox"]');
                return {
                    selected: checkbox?.checked || false,
                    container_no: tds[1]?.textContent.trim(),
                    customer: tds[2]?.textContent.trim(),
                    package_count: parseInt(tds[3]?.textContent) || 0,
                    total_quantity: parseInt(tds[4]?.textContent) || 0,
                    status: tds[5]?.textContent.trim(),
                    created_date: tds[6]?.textContent.trim()
                };
            }).filter(item => item.container_no);
        }

        // 9. Try to fetch additional data from Supabase if available
        if (window.supabase) {
            try {
                // Export users data
                const { data: users } = await supabase
                    .from('users')
                    .select('*')
                    .limit(100); // Limit for safety
                if (users) allData.users = users;

                // Export reports data
                const { data: reports } = await supabase
                    .from('reports')
                    .select('*')
                    .limit(50);
                if (reports) allData.reports = reports;

            } catch (dbError) {
                console.warn('Database export limited:', dbError);
                allData.databaseExport = 'partial - some tables unavailable';
            }
        }

        // 10. Export UI State and Statistics
        allData.uiState = {
            activeTab: document.querySelector('.tab.active')?.getAttribute('data-tab') || 'unknown',
            totalPackagesCount: window.packages ? window.packages.length : 0,
            totalContainersCount: window.containers ? window.containers.length : 0,
            waitingPackages: window.packages ? window.packages.filter(p => !p.container_id).length : 0,
            shippedPackages: window.packages ? window.packages.filter(p => p.container_id).length : 0,
            criticalStockItems: allData.stock.filter(item => item.quantity <= item.critical_level).length
        };

        // Calculate total records
        allData.metadata.totalRecords = 
            allData.packages.length +
            allData.containers.length +
            allData.stock.length +
            allData.customers.length +
            allData.personnel.length +
            allData.users.length +
            allData.reports.length;

        return allData;

    } catch (error) {
        console.error('Data collection error:', error);
        throw new Error(`Veri toplama hatası: ${error.message}`);
    }
}

// Export to JSON function
async function exportToJSON(data, filename) {
    try {
        // Create a pretty-printed JSON string
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { 
            type: 'application/json;charset=utf-8' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert(`✅ Tüm veriler JSON formatında dışa aktarıldı! (${data.metadata.totalRecords} kayıt)`, 'success');
        
        // Optional: Log export summary
        console.log('📊 Export Summary:', {
            packages: data.packages.length,
            containers: data.containers.length,
            stock: data.stock.length,
            customers: data.customers.length,
            personnel: data.personnel.length
        });

    } catch (error) {
        throw new Error(`JSON export failed: ${error.message}`);
    }
}

// Export to Excel function
async function exportToExcel(data, filename) {
    if (typeof XLSX === 'undefined') {
        throw new Error('XLSX kütüphanesi bulunamadı! Lütfen SheetJS kütüphanesini yükleyin.');
    }

    try {
        const wb = XLSX.utils.book_new();
        
        // Create worksheets for each data type
        const sheets = [
            { name: 'Paketler', data: data.packages },
            { name: 'Konteynerler', data: data.containers },
            { name: 'Stok', data: data.stock },
            { name: 'Müşteriler', data: data.customers },
            { name: 'Personel', data: data.personnel },
            { name: 'Raporlar', data: data.reports },
            { name: 'Kullanıcılar', data: data.users },
            { name: 'Ayarlar', data: [data.settings] },
            { name: 'Oturum', data: [data.currentSession] },
            { name: 'UI_Durum', data: [data.uiState] },
            { name: 'Metadata', data: [data.metadata] }
        ];

        // Add each sheet to workbook
        sheets.forEach(sheet => {
            if (sheet.data && sheet.data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheet.data);
                XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            }
        });

        // Export to Excel file
        XLSX.writeFile(wb, `${filename}.xlsx`);
        
        showAlert(`✅ Tüm veriler Excel formatında dışa aktarıldı! (${data.metadata.totalRecords} kayıt, ${sheets.filter(s => s.data.length > 0).length} sayfa)`, 'success');

    } catch (error) {
        throw new Error(`Excel export failed: ${error.message}`);
    }
}

// Quick export functions for specific data types
async function exportPackages(format) {
    if (!window.packages || window.packages.length === 0) {
        showAlert('⚠️ Dışa aktarılacak paket bulunamadı!', 'info');
        return;
    }

    const data = {
        packages: window.packages.map(pkg => ({
            package_no: pkg.package_no,
            customer_name: pkg.customer_name,
            product: pkg.product,
            total_quantity: pkg.total_quantity,
            status: pkg.status,
            container_id: pkg.container_id,
            created_at: pkg.created_at,
            packer: pkg.packer
        })),
        metadata: {
            exportDate: new Date().toISOString(),
            totalPackages: window.packages.length,
            waitingPackages: window.packages.filter(p => !p.container_id).length,
            shippedPackages: window.packages.filter(p => p.container_id).length
        }
    };

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proclean_packages_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showAlert(`✅ Paketler dışa aktarıldı! (${data.packages.length} paket)`, 'success');
    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data.packages);
        XLSX.utils.book_append_sheet(wb, ws, 'Paketler');
        XLSX.writeFile(wb, `proclean_packages_${timestamp}.xlsx`);
        showAlert(`✅ Paketler Excel formatında dışa aktarıldı!`, 'success');
    }
}

// Add to your HTML for easy access:
function addExportButtons() {
    // Create export buttons container if it doesn't exist
    let exportContainer = document.getElementById('export-buttons-container');
    if (!exportContainer) {
        exportContainer = document.createElement('div');
        exportContainer.id = 'export-buttons-container';
        exportContainer.style.margin = '10px 0';
        exportContainer.style.padding = '10px';
        exportContainer.style.border = '1px solid #ddd';
        exportContainer.style.borderRadius = '5px';
        
        // Add to settings panel or wherever appropriate
        const settingsPanel = document.querySelector('.settings-panel') || document.body;
        settingsPanel.appendChild(exportContainer);
    }

    exportContainer.innerHTML = `
        <h4>📊 Veri Dışa Aktarma</h4>
        <button onclick="exportData('json')" class="btn btn-success">📁 Tüm Veriyi JSON Olarak İndir</button>
        <button onclick="exportData('excel')" class="btn btn-primary">📊 Tüm Veriyi Excel Olarak İndir</button>
        <button onclick="exportPackages('json')" class="btn btn-outline-success">📦 Sadece Paketleri JSON İndir</button>
        <button onclick="exportPackages('excel')" class="btn btn-outline-primary">📦 Sadece Paketleri Excel İndir</button>
        <p style="font-size:12px; color:#666; margin-top:5px;">
            Tüm veri: Paketler, konteynerler, stok, müşteriler, personel, ayarlar ve daha fazlası
        </p>
    `;
}

// Initialize export buttons when app loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addExportButtons, 2000); // Add after app initializes
});

function clearFrontendData() {
    const password = prompt('Tüm frontend veriler silinecek. Lütfen şifreyi girin:');

    if (password !== '8823') {
        alert('⚠️ Şifre yanlış! İşlem iptal edildi.');
        return;
    }

    // ------------------- LOCALSTORAGE -------------------
    localStorage.removeItem('procleanState');
    localStorage.removeItem('procleanOfflineData');
    localStorage.removeItem('procleanSettings');

    // ------------------- TABLES -------------------
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
    });

    // ------------------- INPUTS & TEXTAREAS -------------------
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => input.value = '');

    // ------------------- SELECTS -------------------
    const selects = document.querySelectorAll('select');
    selects.forEach(select => select.selectedIndex = 0);

    // ------------------- CONTAINERS -------------------
    const containers = document.querySelectorAll(
        '.container, .packages-container, .reports-container, .stock-container, .stock-items'
    );
    containers.forEach(container => container.innerHTML = '');

    // ------------------- CHECKBOXES / TOGGLES -------------------
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    const toggles = document.querySelectorAll('input[type="radio"]');
    toggles.forEach(toggle => toggle.checked = false);

    showAlert('Tüm frontend veriler temizlendi', 'success');
}

function initializeSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        if (savedSettings && typeof applySettings === 'function') {
            applySettings(savedSettings);
        }
    } catch (error) {
        console.error('⚠️ Error loading settings:', error);
    }
}

function selectPackage(pkg) {
    try {
        // Validate input
        if (!pkg || !pkg.id) {
            console.error('Invalid package data:', pkg);
            showAlert('Geçersiz paket verisi', 'error');
            return;
        }
        
        // Remove selected class from all rows
        document.querySelectorAll('#packagesTableBody tr').forEach(row => {
            row.classList.remove('selected');
        });
        
        // Find and select the target row
        const targetCheckbox = document.querySelector(`#packagesTableBody input[value="${pkg.id}"]`);
        const targetRow = targetCheckbox?.closest('tr');
        
        if (targetRow) {
            targetRow.classList.add('selected');
        } else {
            console.warn('Could not find row for package:', pkg.id);
        }
        
        // Update detail content
        const detailContent = document.getElementById('packageDetailContent');
        if (detailContent) {
            updatePackageDetails(pkg, detailContent);
        }
        
    } catch (error) {
        console.error('Error in selectPackage:', error);
        showAlert('Paket seçilirken hata oluştu', 'error');
    }
}

function updatePackageDetails(pkg, container) {
    // Safe date formatting
    let dateStr = 'N/A';
    if (pkg.created_at) {
        try {
            const date = new Date(pkg.created_at);
            dateStr = isNaN(date.getTime()) ? 'Geçersiz tarih' : date.toLocaleDateString('tr-TR');
        } catch (e) {
            dateStr = 'Geçersiz tarih';
        }
    }

    container.innerHTML = `
        <h4>Paket: ${pkg.package_no || 'N/A'}</h4>
        <p><strong>Müşteri:</strong> ${pkg.customers?.name || 'N/A'}</p>
        <p><strong>Tarih:</strong> ${dateStr}</p>
        <p><strong>Durum:</strong> ${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</p>
        <div class="items-section">
            <div style="display:flex; justify-content:space-between; font-weight:bold; border-bottom:2px solid #000; padding-bottom:0.3rem;">
                <span>Ürün</span>
                <span>Adet</span>
            </div>
        </div>
    `;

    if (Array.isArray(pkg.items) && pkg.items.length > 0) {
        const itemsSection = container.querySelector('.items-section');
        pkg.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.justifyContent = 'space-between';
            itemDiv.style.padding = '0.2rem 0';
            itemDiv.textContent = ''; // We'll use spans
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name || 'Bilinmeyen Ürün';
            const qtySpan = document.createElement('span');
            qtySpan.textContent = item.qty != null ? item.qty : 1;
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(qtySpan);
            itemsSection.appendChild(itemDiv);
        });
    }
}




function getSelectedPackage() {
    const selectedRow = document.querySelector('#packagesTableBody tr.selected');
    if (!selectedRow) return null;
    
    const packageId = selectedRow.querySelector('input[type="checkbox"]').value;
    
    return {
        id: packageId,
        package_no: selectedRow.cells[1].textContent,
        customers: { name: selectedRow.cells[2].textContent },
        total_quantity: selectedRow.cells[3].textContent.trim(), // now as text
        created_at: selectedRow.cells[4].textContent
    };
}


// Stock operations
function searchStock() {
    if (!elements.stockSearch) {
        console.error('Stock search input not found');
        return;
    }
    
    if (!elements.stockTableBody) {
        console.error('Stock table body not found');
        return;
    }
    
    const searchTerm = elements.stockSearch.value.toLowerCase();
    const rows = elements.stockTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function clearStockSearch() {
    elements.stockSearch.value = '';
    const rows = elements.stockTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        row.style.display = '';
    });
}



// ==================== WORKSPACE UI FUNCTIONS ====================
// Add this at the BOTTOM of ui.js (after all existing functions)

function initializeWorkspaceUI() {
    // Create workspace indicator if it doesn't exist
    if (!document.getElementById('workspaceIndicator')) {
        const header = document.querySelector('.app-header');
        if (header) {
            const indicator = document.createElement('div');
            indicator.id = 'workspaceIndicator';
            indicator.className = 'workspace-indicator';
            indicator.style.cssText = `
                padding: 0.5rem 1rem;
                background: var(--primary);
                color: white;
                border-radius: 20px;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-left: auto;
                margin-right: 1rem;
            `;
            
            // Simply append to header - safer approach
            header.appendChild(indicator);
        }
    }
    
    // Add workspace switching capability
    addWorkspaceSwitchHandler();
}



function addWorkspaceSwitchHandler() {
    const indicator = document.getElementById('workspaceIndicator');
    if (indicator) {
        indicator.style.cursor = 'pointer';
        indicator.title = 'İstasyonu değiştirmek için tıklayın';
        indicator.onclick = () => window.workspaceManager.showWorkspaceSelection();
    }
}

// Modify existing UI functions to respect workspace permissions
function setupWorkspaceAwareUI() {
    // Hide/show UI elements based on workspace permissions
    const updateUIVisibility = () => {
        if (!window.workspaceManager?.currentWorkspace) return;
        
        const canCreatePackages = window.workspaceManager.canPerformAction('create_package');
        const canShipPackages = window.workspaceManager.canPerformAction('ship_packages');
        const canViewReports = window.workspaceManager.canPerformAction('view_reports');
        
        // Show/hide package creation UI
        const packageCreationSection = document.querySelector('.package-creation-section, .package-controls');
        if (packageCreationSection) {
            packageCreationSection.style.display = canCreatePackages ? 'block' : 'none';
        }
        
        // Show/hide complete package button
        const completeBtn = document.querySelector('button[onclick*="completePackage"]');
        if (completeBtn) {
            completeBtn.style.display = canCreatePackages ? 'inline-block' : 'none';
        }
        
        // Show/hide shipping buttons
        const shippingButtons = document.querySelectorAll('.shipping-action, .ship-container-btn');
        shippingButtons.forEach(btn => {
            btn.style.display = canShipPackages ? 'inline-block' : 'none';
        });
        
        // Show/hide reports tab
        const reportsTab = document.querySelector('[data-tab="reports"]');
        if (reportsTab) {
            reportsTab.style.display = canViewReports ? 'flex' : 'none';
        }
        
        console.log(`UI updated for ${window.workspaceManager.currentWorkspace.name}:`, {
            canCreatePackages,
            canShipPackages,
            canViewReports
        });
    };
    
    // Update UI when workspace changes
    if (window.workspaceManager) {
        window.workspaceManager.onWorkspaceChange = updateUIVisibility;
    }
    
    // Initial update
    setTimeout(updateUIVisibility, 1000);
}




// ui (24).js (Add this function to the file)

/**
 * Extracts item names from a package object for use in reports.
 * Handles both array-based and object-based item structures (the likely cause of the issue).
 * @param {object} packageData - The package object containing item details.
 * @returns {string} - Comma-separated list of product names (e.g., "Büyük çarşaf, Havlu").
 */
function getProductType(packageData) {
    if (!packageData || !packageData.items) {
        return 'Ürün Yok';
    }

    // 1. CRITICAL: Handle the structure where items is an OBJECT (most common for scanned inventory)
    if (typeof packageData.items === 'object' && !Array.isArray(packageData.items) && Object.keys(packageData.items).length > 0) {
        // Return the keys (which are the product names) joined by a comma
        return Object.keys(packageData.items).join(', '); 
    }
    
    // 2. Handle the case where items is an ARRAY of objects (for compatibility)
    if (Array.isArray(packageData.items) && packageData.items.length > 0) {
        // Return the 'name' property of the objects
        return packageData.items.map(it => it.name).join(', ');
    }
    
    // 3. Fallback
    if (packageData.product) {
        return packageData.product;
    }
    
    return 'Ürün Yok';
}




// Keyboard shortcuts setup
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // F2 - Paketle (Complete Package)
        if (e.key === 'F2') {
            e.preventDefault();
            if (typeof completePackage === 'function') {
                completePackage();
            }
        }
        
        // F4 - Etiketi Yazdır (Print Label)
        if (e.key === 'F4') {
            e.preventDefault();
            const selectedPackage = getSelectedPackage();
            if (selectedPackage && typeof printPackageWithSettings === 'function') {
                printPackageWithSettings(selectedPackage);
            } else {
                showAlert('Önce bir paket seçin', 'warning');
            }
        }
        
        // F8 - Sil (Delete)
        if (e.key === 'F8') {
            e.preventDefault();
            if (confirm('Seçili öğeleri silmek istediğinize emin misiniz?')) {
                if (typeof deleteSelectedPackages === 'function') {
                    deleteSelectedPackages();
                }
            }
        }
        
        // F9 - Rampa Gönder (Send to Ramp)
        if (e.key === 'F9') {
            e.preventDefault();
            if (typeof sendToRamp === 'function') {
                sendToRamp();
            }
        }
        
        // Ctrl+Q - Tümünü Seç (Select All)
        if (e.ctrlKey && e.key === 'q') {
            e.preventDefault();
            const selectAllCheckbox = document.getElementById('selectAllPackages');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = !selectAllCheckbox.checked;
                toggleSelectAll();
            }
        }
    });
}

// Call this in initialization
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupKeyboardShortcuts, 1000);
});



// ==================== EVENT LISTENER MANAGEMENT ====================

// Add this to ui.js after existing functions

class EventListenerManager {
    constructor() {
        this.listeners = new Map();
        this.initialized = false;
    }

    // Initialize all event listeners once
    initializeEventListeners() {
        if (this.initialized) {
            console.warn('⚠️ Event listeners already initialized');
            return;
        }

        this.cleanupAllListeners();
        this.setupCoreListeners();
        this.initialized = true;
        
        console.log('✅ Event listeners initialized');
    }

    // Setup core application listeners
    setupCoreListeners() {
        // Settings button
        this.addListener('settingsBtn', 'click', showSettingsModal);
        
        // Close settings modal
        this.addListener('closeSettingsModalBtn', 'click', closeSettingsModal);
        
        // Login button and form
        this.addListener('loginBtn', 'click', login);
        this.addListener('email', 'keypress', (e) => {
            if (e.key === 'Enter') login();
        });
        this.addListener('password', 'keypress', (e) => {
            if (e.key === 'Enter') login();
        });
        
        // Quantity modal
        this.addListener('quantityInput', 'keypress', (e) => {
            if (e.key === 'Enter') confirmQuantity();
        });
        
        // Customer select
        this.addListener('customerSelect', 'change', function() {
            const customerId = this.value;
            if (customerId) {
                const selectedOption = this.options[this.selectedIndex];
                selectedCustomer = {
                    id: customerId,
                    name: selectedOption.textContent.split(' (')[0],
                    code: selectedOption.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                };
                showAlert(`Müşteri seçildi: ${selectedCustomer.name}`, 'success');
            } else {
                selectedCustomer = null;
            }
        });
        
        // Tab system
        document.querySelectorAll('.tab').forEach(tab => {
            this.addListener(tab, 'click', function() {
                const tabName = this.getAttribute('data-tab');
                if (tabName) switchTab(tabName);
            });
        });
        
        // Close modal when clicking outside
        this.addListener(window, 'click', function(event) {
            if (event.target === document.getElementById('settingsModal')) {
                closeSettingsModal();
            }
        });
        
        // Online/offline detection
        this.addListener(window, 'online', this.handleOnlineStatus);
        this.addListener(window, 'offline', this.handleOfflineStatus);
        
        // Barcode scanner (single instance)
        this.setupBarcodeScanner();
    }

    // Add listener with tracking
    addListener(elementOrId, event, handler) {
        const element = typeof elementOrId === 'string' 
            ? document.getElementById(elementOrId)
            : elementOrId;
            
        if (!element) {
            console.warn(`⚠️ Element not found for listener: ${elementOrId}`);
            return;
        }
        
        const key = `${element.id || 'anonymous'}_${event}`;
        
        // Remove existing listener first
        if (this.listeners.has(key)) {
            const { element: oldElement, event: oldEvent, handler: oldHandler } = this.listeners.get(key);
            oldElement.removeEventListener(oldEvent, oldHandler);
        }
        
        // Add new listener
        element.addEventListener(event, handler);
        this.listeners.set(key, { element, event, handler });
    }

    // Handle online status
    handleOnlineStatus() {
        document.getElementById('offlineIndicator').style.display = 'none';
        if (elements.connectionStatus) {
            elements.connectionStatus.textContent = 'Çevrimiçi';
        }
        showAlert('Çevrimiçi moda geçildi. Veriler senkronize ediliyor...', 'success');
        
        // Trigger sync after coming online
        setTimeout(() => {
            if (excelSyncQueue.length > 0) {
                syncExcelWithSupabase();
            }
        }, 2000);
    }

    // Handle offline status
    handleOfflineStatus() {
        document.getElementById('offlineIndicator').style.display = 'block';
        if (elements.connectionStatus) {
            elements.connectionStatus.textContent = 'Çevrimdışı';
        }
        showAlert('Çevrimdışı moda geçildi. Değişiklikler internet bağlantısı sağlandığında senkronize edilecek.', 'warning');
    }

    // Fixed barcode scanner setup
    setupBarcodeScanner() {
        if (!elements.barcodeInput) {
            console.error('Barcode input element not found');
            return;
        }
        
        // Remove any existing listeners
        this.removeBarcodeListeners();
        
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();
        
        const barcodeHandler = (e) => {
            const currentTime = Date.now();
            
            if (scannerMode || currentTime - lastKeyTime < 50) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (barcodeBuffer.length > 5) {
                        elements.barcodeInput.value = barcodeBuffer;
                        processBarcode();
                    }
                    barcodeBuffer = '';
                } else {
                    barcodeBuffer += e.key;
                }
            } else {
                barcodeBuffer = '';
            }
            
            lastKeyTime = currentTime;
        };
        
        this.addListener(elements.barcodeInput, 'keypress', barcodeHandler);
        console.log('✅ Barcode scanner listener setup complete');
    }

    // Remove barcode listeners specifically
    removeBarcodeListeners() {
        const barcodeKeys = Array.from(this.listeners.keys()).filter(key => 
            key.includes('barcode') || key.includes('anonymous_keypress')
        );
        
        barcodeKeys.forEach(key => {
            const { element, event, handler } = this.listeners.get(key);
            element.removeEventListener(event, handler);
            this.listeners.delete(key);
        });
    }

    // Cleanup all listeners
    cleanupAllListeners() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners.clear();
        this.initialized = false;
        
        console.log('🧹 All event listeners cleaned up');
    }

    // Reinitialize listeners (for page transitions)
    reinitialize() {
        this.cleanupAllListeners();
        this.initializeEventListeners();
    }
}

// Initialize event listener manager
const eventListenerManager = new EventListenerManager();

// Replace the existing setupEventListeners function
function setupEventListeners() {
    eventListenerManager.initializeEventListeners();
}

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    eventListenerManager.cleanupAllListeners();
});

// Add to initializeElementsObject() or setupEventListeners()
const selectAllCheckbox = document.getElementById('selectAllPackages');
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
    console.log('✅ Select all checkbox listener attached');
}
// ==================== PERFORMANCE OPTIMIZATION ====================

// Add this to ui.js

class PerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleFlags = new Map();
        this.largeDataCache = new Map();
    }

    // Debounce function for search and filter
    debounce(func, delay, context) {
        const key = func.name || 'anonymous';
        
        return (...args) => {
            clearTimeout(this.debounceTimers.get(key));
            
            const timer = setTimeout(() => {
                func.apply(context, args);
                this.debounceTimers.delete(key);
            }, delay);
            
            this.debounceTimers.set(key, timer);
        };
    }

    // Throttle function for scroll and resize
    throttle(func, delay, context) {
        const key = func.name || 'anonymous';
        
        return (...args) => {
            if (this.throttleFlags.get(key)) return;
            
            this.throttleFlags.set(key, true);
            func.apply(context, args);
            
            setTimeout(() => {
                this.throttleFlags.delete(key);
            }, delay);
        };
    }

    // Optimize large dataset rendering
    optimizeTableRendering(data, containerId, renderFunction, chunkSize = 50) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear container
        container.innerHTML = '';
        
        // Render in chunks for better performance
        let currentIndex = 0;
        
        const renderChunk = () => {
            const chunk = data.slice(currentIndex, currentIndex + chunkSize);
            
            chunk.forEach(item => {
                const element = renderFunction(item);
                if (element) {
                    container.appendChild(element);
                }
            });
            
            currentIndex += chunkSize;
            
            if (currentIndex < data.length) {
                requestAnimationFrame(renderChunk);
            }
        };
        
        renderChunk();
    }

    // Cache expensive operations
    memoize(func, keyGenerator) {
        return (...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            
            if (this.largeDataCache.has(key)) {
                return this.largeDataCache.get(key);
            }
            
            const result = func(...args);
            this.largeDataCache.set(key, result);
            
            return result;
        };
    }

    // Cleanup memory
    cleanupMemory() {
        // Clear debounce timers
        this.debounceTimers.forEach((timer, key) => {
            clearTimeout(timer);
        });
        this.debounceTimers.clear();
        
        // Clear throttle flags
        this.throttleFlags.clear();
        
        // Clear old cache entries (keep only last 100)
        if (this.largeDataCache.size > 100) {
            const keys = Array.from(this.largeDataCache.keys());
            const keysToDelete = keys.slice(0, keys.length - 100);
            
            keysToDelete.forEach(key => {
                this.largeDataCache.delete(key);
            });
        }
        
        console.log('🧹 Memory cleanup completed');
    }
}

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Optimized search function
const debouncedSearchPackages = performanceOptimizer.debounce(function(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        safePopulatePackagesTable();
        return;
    }
    
    const filteredPackages = window.packages.filter(pkg => 
        pkg.package_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.packer?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    populatePackagesTable(filteredPackages);
}, 300);

// Optimized filter function
const debouncedFilterPackages = performanceOptimizer.debounce(function(filters) {
    let filteredPackages = window.packages;
    
    if (filters.customer) {
        filteredPackages = filteredPackages.filter(pkg => 
            pkg.customer_id === filters.customer
        );
    }
    
    if (filters.status) {
        filteredPackages = filteredPackages.filter(pkg => 
            pkg.status === filters.status
        );
    }
    
    if (filters.dateFrom) {
        filteredPackages = filteredPackages.filter(pkg => 
            new Date(pkg.created_at) >= new Date(filters.dateFrom)
        );
    }
    
    populatePackagesTable(filteredPackages);
}, 300);

// Replace existing search and filter event listeners
function setupOptimizedEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            debouncedSearchPackages(e.target.value);
        });
    }
    
    // Filter inputs
    const customerFilter = document.getElementById('customerFilter');
    const statusFilter = document.getElementById('statusFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    
    const applyFilters = () => {
        const filters = {
            customer: customerFilter?.value,
            status: statusFilter?.value,
            dateFrom: dateFromFilter?.value
        };
        
        debouncedFilterPackages(filters);
    };
    
    if (customerFilter) customerFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (dateFromFilter) dateFromFilter.addEventListener('change', applyFilters);
}

// Memory cleanup on page unload
window.addEventListener('beforeunload', () => {
    performanceOptimizer.cleanupMemory();
});

// Periodic memory cleanup
setInterval(() => {
    performanceOptimizer.cleanupMemory();
}, 30000); // Every 30 seconds



// ==================== USER EXPERIENCE ENHANCEMENTS ====================

// Add this to ui.js

class UXEnhancer {
    constructor() {
        this.loadingStates = new Map();
        this.autoSaveTimers = new Map();
        this.bulkOperations = new Set();
    }

    // Loading states management
    showLoading(elementId, message = 'Yükleniyor...') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const originalContent = element.innerHTML;
        const loadingId = `loading-${elementId}-${Date.now()}`;
        
        this.loadingStates.set(elementId, {
            originalContent: originalContent,
            loadingId: loadingId
        });
        
        element.innerHTML = `
            <div id="${loadingId}" class="loading-state">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;
        
        element.disabled = true;
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const loadingState = this.loadingStates.get(elementId);
        if (loadingState) {
            const loadingElement = document.getElementById(loadingState.loadingId);
            if (loadingElement) {
                loadingElement.remove();
            }
            
            element.innerHTML = loadingState.originalContent;
            this.loadingStates.delete(elementId);
        }
        
        element.disabled = false;
    }

    // Auto-save functionality
    enableAutoSave(formId, saveFunction, delay = 2000) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Clear existing timer
        if (this.autoSaveTimers.has(formId)) {
            clearTimeout(this.autoSaveTimers.get(formId));
        }
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.debouncedAutoSave(formId, saveFunction, delay);
            });
        });
    }

    debouncedAutoSave(formId, saveFunction, delay) {
        // Clear existing timer
        if (this.autoSaveTimers.has(formId)) {
            clearTimeout(this.autoSaveTimers.get(formId));
        }
        
        // Set new timer
        const timer = setTimeout(async () => {
            try {
                this.showAutoSaveIndicator(formId, 'saving');
                await saveFunction();
                this.showAutoSaveIndicator(formId, 'saved');
            } catch (error) {
                this.showAutoSaveIndicator(formId, 'error');
            }
        }, delay);
        
        this.autoSaveTimers.set(formId, timer);
    }

    showAutoSaveIndicator(formId, state) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        let indicator = form.querySelector('.auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'auto-save-indicator';
            form.appendChild(indicator);
        }
        
        const states = {
            saving: { text: 'Kaydediliyor...', className: 'saving' },
            saved: { text: 'Kaydedildi', className: 'saved' },
            error: { text: 'Kaydedilemedi', className: 'error' }
        };
        
        const currentState = states[state] || states.saving;
        indicator.textContent = currentState.text;
        indicator.className = `auto-save-indicator ${currentState.className}`;
        
        // Hide saved indicator after 2 seconds
        if (state === 'saved') {
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 300);
            }, 2000);
        }
    }

    // Bulk operations
    enableBulkSelection(tableId, options = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        // Add select all checkbox to header
        const headerRow = table.querySelector('thead tr');
        if (headerRow && !table.querySelector('.bulk-select-header')) {
            const selectAllTh = document.createElement('th');
            selectAllTh.className = 'bulk-select-header';
            selectAllTh.innerHTML = `
                <input type="checkbox" id="selectAll-${tableId}" 
                       onchange="toggleSelectAll('${tableId}')">
            `;
            headerRow.insertBefore(selectAllTh, headerRow.firstChild);
        }
        
        // Add checkboxes to each row
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            if (!row.querySelector('.bulk-select-cell')) {
                const selectTd = document.createElement('td');
                selectTd.className = 'bulk-select-cell';
                selectTd.innerHTML = `
                    <input type="checkbox" class="row-select" 
                           data-row-index="${index}"
                           onchange="updateBulkActions('${tableId}')">
                `;
                row.insertBefore(selectTd, row.firstChild);
            }
        });
        
        // Add bulk actions toolbar
        this.createBulkActionsToolbar(tableId, options.actions);
    }

    createBulkActionsToolbar(tableId, actions = []) {
        const existingToolbar = document.getElementById(`bulk-actions-${tableId}`);
        if (existingToolbar) existingToolbar.remove();
        
        const defaultActions = [
            { id: 'delete', label: 'Sil', action: () => this.bulkDelete(tableId) },
            { id: 'export', label: 'Dışa Aktar', action: () => this.bulkExport(tableId) },
            { id: 'status', label: 'Durumu Değiştir', action: () => this.bulkStatusChange(tableId) }
        ];
        
        const toolbarActions = actions.length > 0 ? actions : defaultActions;
        
        const toolbar = document.createElement('div');
        toolbar.id = `bulk-actions-${tableId}`;
        toolbar.className = 'bulk-actions-toolbar';
        toolbar.style.display = 'none';
        toolbar.innerHTML = `
            <div class="bulk-selection-count">
                <span id="selectedCount-${tableId}">0</span> öğe seçildi
            </div>
            <div class="bulk-action-buttons">
                ${toolbarActions.map(action => `
                    <button type="button" class="btn btn-secondary btn-sm"
                            onclick="${action.action}">
                        ${action.label}
                    </button>
                `).join('')}
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        onclick="clearSelection('${tableId}')">
                    Temizle
                </button>
            </div>
        `;
        
        table.parentNode.insertBefore(toolbar, table);
    }

    // Keyboard navigation
    enableKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals
            if (e.key === 'Escape') {
                this.closeOpenModals();
            }
            
            // Ctrl+S for save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.triggerAutoSave();
            }
            
            // Tab navigation enhancement
            if (e.key === 'Tab') {
                this.enhanceTabNavigation(e);
            }
        });
    }

    closeOpenModals() {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector('[data-dismiss="modal"], .close');
            if (closeBtn) {
                closeBtn.click();
            }
        });
    }

    enhanceTabNavigation(e) {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }

    // Progress indicators for long operations
    showProgress(operationId, message, total = 100) {
        const progressId = `progress-${operationId}`;
        let progressContainer = document.getElementById(progressId);
        
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = progressId;
            progressContainer.className = 'progress-container';
            progressContainer.innerHTML = `
                <div class="progress-message">${message}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-percentage">0%</div>
            `;
            document.body.appendChild(progressContainer);
        }
        
        return {
            update: (current) => {
                const percentage = Math.min(100, Math.round((current / total) * 100));
                const fill = progressContainer.querySelector('.progress-fill');
                const percentageText = progressContainer.querySelector('.progress-percentage');
                
                if (fill) fill.style.width = `${percentage}%`;
                if (percentageText) percentageText.textContent = `${percentage}%`;
            },
            complete: () => {
                setTimeout(() => {
                    if (progressContainer.parentNode) {
                        progressContainer.parentNode.removeChild(progressContainer);
                    }
                }, 1000);
            },
            error: (errorMessage) => {
                progressContainer.innerHTML = `
                    <div class="progress-error">${errorMessage}</div>
                `;
                setTimeout(() => {
                    if (progressContainer.parentNode) {
                        progressContainer.parentNode.removeChild(progressContainer);
                    }
                }, 3000);
            }
        };
    }
}

// Initialize UX enhancer
const uxEnhancer = new UXEnhancer();


// Enhanced sync with progress indicator
async function syncWithProgress() {
    const progress = uxEnhancer.showProgress(
        'sync', 
        'Veriler senkronize ediliyor...', 
        excelSyncQueue.length
    );
    
    try {
        let processed = 0;
        
        for (const operation of excelSyncQueue) {
            await atomicSyncManager.executeSingleOperation(operation);
            processed++;
            progress.update(processed);
        }
        
        progress.complete();
        showAlert('Senkronizasyon başarıyla tamamlandı!', 'success');
        
    } catch (error) {
        progress.error('Senkronizasyon sırasında hata oluştu');
        showAlert('Senkronizasyon tamamlanamadı', 'error');
    }
}





// ==================== DATA VALIDATION & SANITIZATION ====================

// Add this to ui.js

class DataValidator {
    // Validate package data before save
    static validatePackageData(packageData) {
        const errors = [];
        
        // Required fields
        if (!packageData.id) errors.push('Package ID is required');
        if (!packageData.package_no) errors.push('Package number is required');
        if (!packageData.customer_id) errors.push('Customer is required');
        if (!packageData.workspace_id) errors.push('Workspace is required');
        
        // Items validation
        if (!packageData.items || Object.keys(packageData.items).length === 0) {
            errors.push('Package must contain at least one item');
        } else {
            for (const [product, quantity] of Object.entries(packageData.items)) {
                if (typeof quantity !== 'number' || quantity < 1) {
                    errors.push(`Invalid quantity for ${product}: ${quantity}`);
                }
            }
        }
        
        // Quantity validation
        if (typeof packageData.total_quantity !== 'number' || packageData.total_quantity < 1) {
            errors.push(`Invalid total quantity: ${packageData.total_quantity}`);
        }
        
        // Date validation
        if (!packageData.created_at || isNaN(new Date(packageData.created_at).getTime())) {
            errors.push('Invalid creation date');
        }
        
        if (errors.length > 0) {
            throw new Error(`Package validation failed: ${errors.join(', ')}`);
        }
        
        return true;
    }
    
    // Sanitize package data
    static sanitizePackageData(packageData) {
        const sanitized = { ...packageData };
        
        // Trim string fields
        if (sanitized.package_no) sanitized.package_no = sanitized.package_no.trim();
        if (sanitized.customer_name) sanitized.customer_name = sanitized.customer_name.trim();
        if (sanitized.customer_code) sanitized.customer_code = sanitized.customer_code.trim();
        if (sanitized.packer) sanitized.packer = sanitized.packer.trim();
        
        // Ensure numeric fields
        sanitized.total_quantity = Number(sanitized.total_quantity) || 0;
        
        // Sanitize items
        if (sanitized.items && typeof sanitized.items === 'object') {
            const sanitizedItems = {};
            for (const [product, quantity] of Object.entries(sanitized.items)) {
                const cleanProduct = product.trim();
                const cleanQuantity = Math.max(0, Number(quantity) || 0);
                if (cleanQuantity > 0) {
                    sanitizedItems[cleanProduct] = cleanQuantity;
                }
            }
            sanitized.items = sanitizedItems;
        }
        
        // Ensure workspace data
        if (!sanitized.workspace_id && window.workspaceManager?.currentWorkspace) {
            sanitized.workspace_id = window.workspaceManager.currentWorkspace.id;
        }
        
        return sanitized;
    }
    
    // Validate form inputs
    static validateForm(inputs) {
        let isValid = true;
        
        inputs.forEach(inputConfig => {
            const element = document.getElementById(inputConfig.id);
            const errorElement = document.getElementById(inputConfig.errorId);
            
            if (!element) return;
            
            const value = element.value.trim();
            let inputValid = true;
            let errorMessage = '';
            
            // Required field validation
            if (inputConfig.required && !value) {
                inputValid = false;
                errorMessage = 'Bu alan zorunludur';
            }
            // Email validation
            else if (inputConfig.type === 'email' && value && !this.isValidEmail(value)) {
                inputValid = false;
                errorMessage = 'Geçerli bir e-posta adresi girin';
            }
            // Number validation
            else if (inputConfig.type === 'number' && value) {
                const numValue = Number(value);
                if (isNaN(numValue) || numValue < 0) {
                    inputValid = false;
                    errorMessage = 'Geçerli bir sayı girin';
                }
            }
            
            // Update UI
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = inputValid ? 'none' : 'block';
            }
            
            element.classList.toggle('error', !inputValid);
            
            if (!inputValid) isValid = false;
        });
        
        return isValid;
    }
    
    // Email validation
    static isValidEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}

// Reports tab functionality fixes
async function populateReportsTable() {
    const reportsTableBody = document.getElementById('reportsTableBody');
    
    if (!reportsTableBody) {
        console.error('Reports table body not found');
        return;
    }
    
    try {
        showAlert('Raporlar yükleniyor...', 'info', 1000);
        
        let reports = [];
        
        // Get reports from localStorage
        const localReports = Object.keys(localStorage)
            .filter(key => key.startsWith('report_'))
            .map(key => {
                try {
                    return JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    return null;
                }
            })
            .filter(report => report !== null);
        
        reports = localReports;
        
        // Also get from Supabase if available
        if (supabase && navigator.onLine) {
            const { data: supabaseReports, error } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (!error && supabaseReports) {
                reports = [...reports, ...supabaseReports];
            }
        }
        
        // Sort by date
        reports.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
        
        if (reports.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Henüz rapor yok</td></tr>';
            return;
        }
        
        // Populate table with real data
        reportsTableBody.innerHTML = reports.map(report => {
            const reportDate = report.date || report.created_at;
            const fileName = report.fileName || 'Rapor';
            const packageCount = report.packageCount || 0;
            const totalQuantity = report.totalQuantity || 0;
            
            return `
                <tr>
                    <td>${new Date(reportDate).toLocaleDateString('tr-TR')}</td>
                    <td>${fileName}</td>
                    <td>${packageCount}</td>
                    <td>${totalQuantity}</td>
                    <td>
                        <button onclick="viewReport('${fileName}')" class="btn btn-sm btn-primary">
                            <i class="fas fa-eye"></i> Görüntüle
                        </button>
                        <button onclick="downloadReport('${fileName}')" class="btn btn-sm btn-success">
                            <i class="fas fa-download"></i> İndir
                        </button>
                        <button onclick="deleteReport('${fileName}')" class="btn btn-sm btn-danger">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading reports:', error);
        showAlert('Raporlar yüklenirken hata oluştu', 'error');
        reportsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Raporlar yüklenirken hata oluştu</td></tr>';
    }
}

async function viewReport(reportId) {
    try {
        const fileName = `report_${reportId}`;
        const reportData = localStorage.getItem(fileName);
        
        if (!reportData) {
            // Try to get from Supabase
            if (supabase && navigator.onLine) {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('fileName', reportId)
                    .single();
                    
                if (!error && data) {
                    displayReportModal(data);
                    return;
                }
            }
            
            showAlert('Rapor bulunamadı', 'error');
            return;
        }
        
        const report = JSON.parse(reportData);
        displayReportModal(report);
        
    } catch (error) {
        showAlert('Rapor görüntülenirken hata: ' + error.message, 'error');
    }
}

function displayReportModal(report) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center;';
    modal.innerHTML = `
        <div style="background:white; padding:2rem; border-radius:8px; max-width:800px; max-height:80vh; overflow:auto;">
            <h3>${report.fileName || 'Rapor'}</h3>
            <p><strong>Tarih:</strong> ${new Date(report.date || report.created_at).toLocaleDateString('tr-TR')}</p>
            <p><strong>Paket Sayısı:</strong> ${report.packageCount || 0}</p>
            <p><strong>Toplam Adet:</strong> ${report.totalQuantity || 0}</p>
            ${report.type ? `<p><strong>Tür:</strong> ${report.type}</p>` : ''}
            <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">Kapat</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function downloadReport(reportId) {
    try {
        let reportData = null;
        
        // First try localStorage
        const fileName = `report_${reportId}`;
        const localData = localStorage.getItem(fileName);
        
        if (localData) {
            reportData = JSON.parse(localData);
        } 
        // Then try Supabase
        else if (supabase && navigator.onLine) {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('fileName', reportId)
                .single();
                
            if (!error && data) {
                reportData = data;
            }
        }
        
        if (!reportData) {
            showAlert('Rapor bulunamadı', 'error');
            return;
        }
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showAlert('Rapor indirildi', 'success');
    } catch (error) {
        showAlert('İndirme hatası: ' + error.message, 'error');
    }
}

// Delete report
async function deleteReport(fileName) {
    if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const reportKey = `report_${fileName}`;
        localStorage.removeItem(reportKey);
        
        // Also delete from Supabase if exists
        if (supabase && navigator.onLine) {
            await supabase
                .from('reports')
                .delete()
                .eq('fileName', fileName);
        }
        
        showAlert('Rapor silindi', 'success');
        await populateReportsTable();
        
    } catch (error) {
        console.error('Error deleting report:', error);
        showAlert('Rapor silinirken hata oluştu', 'error');
    }
}

// Add to ui.js - Fix select all functionality

// Remove any existing conflicting functions first
if (window.toggleSelectAll) delete window.toggleSelectAll;
if (window.toggleSelectAllPackages) delete window.toggleSelectAllPackages;
if (window.toggleSelectAllContainers) delete window.toggleSelectAllContainers;
if (window.toggleSelectAllCustomer) delete window.toggleSelectAllCustomer;

// MAIN FUNCTION: Select All for Packages (works with your HTML)
window.toggleSelectAllPackages = function(source) {
    try {
        console.log('toggleSelectAllPackages called with:', source);
        
        // Handle both event object and checkbox element
        const checkbox = source && source.target ? source.target : source;
        const isChecked = checkbox ? checkbox.checked : false;
        
        if (!checkbox) {
            console.error('No checkbox found in toggleSelectAllPackages');
            return;
        }
        
        const packageCheckboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
        
        packageCheckboxes.forEach(cb => {
            cb.checked = isChecked;
        });
        
        console.log(`${isChecked ? '✅ Selected' : '❌ Deselected'} ${packageCheckboxes.length} packages`);
        
        // Update selection UI
        if (typeof updatePackageSelection === 'function') {
            updatePackageSelection();
        }
        
    } catch (error) {
        console.error('❌ Error in toggleSelectAllPackages:', error);
    }
};

// MAIN FUNCTION: Select All for Containers
window.toggleSelectAllContainers = function(source) {
    try {
        console.log('toggleSelectAllContainers called with:', source);
        
        // Handle both event object and checkbox element
        const checkbox = source && source.target ? source.target : source;
        const isChecked = checkbox ? checkbox.checked : false;
        
        if (!checkbox) {
            console.error('No checkbox found in toggleSelectAllContainers');
            return;
        }
        
        const containerCheckboxes = document.querySelectorAll('.container-checkbox');
        
        containerCheckboxes.forEach(cb => {
            cb.checked = isChecked;
        });
        
        console.log(`${isChecked ? '✅ Selected' : '❌ Deselected'} ${containerCheckboxes.length} containers`);
        
        // Update selection UI
        if (typeof updateContainerSelection === 'function') {
            updateContainerSelection();
        }
        
    } catch (error) {
        console.error('❌ Error in toggleSelectAllContainers:', error);
    }
};

// ENHANCED VERSION: toggleSelectAllCustomer with better error handling
window.toggleSelectAllCustomer = function(source) {
    try {
        console.log('toggleSelectAllCustomer called with:', source);
        
        // Handle case where function is called before fully loaded
        if (!source) {
            console.warn('⚠️ toggleSelectAllCustomer called without source parameter');
            return;
        }
        
        const checkbox = source;
        const isChecked = checkbox.checked;
        const folder = checkbox.closest('.customer-folder');
        
        if (!folder) {
            console.error('❌ Customer folder not found for checkbox:', checkbox);
            return;
        }
        
        const containerCheckboxes = folder.querySelectorAll('.container-checkbox');
        
        containerCheckboxes.forEach(cb => {
            cb.checked = isChecked;
        });
        
        console.log(`✅ ${isChecked ? 'Selected' : 'Deselected'} ${containerCheckboxes.length} containers in customer folder`);
        
    } catch (error) {
        console.error('❌ Error in toggleSelectAllCustomer:', error);
    }
};

// FIXED GENERIC FUNCTION: Works with your HTML that calls toggleSelectAll() without parameters
window.toggleSelectAll = function() {
    try {
        console.log('toggleSelectAll called');
        
        // Get the event that triggered this function
        const event = window.event || arguments.callee.caller.arguments[0];
        if (!event) {
            console.error('No event found in toggleSelectAll');
            return;
        }
        
        const checkbox = event.target || event.srcElement;
        if (!checkbox) {
            console.error('No checkbox found in toggleSelectAll');
            return;
        }
        
        const isChecked = checkbox.checked;
        
        // Determine which table based on checkbox ID
        if (checkbox.id === 'selectAllPackages') {
            const packageCheckboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
            packageCheckboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            console.log(`${isChecked ? '✅ Selected' : '❌ Deselected'} ${packageCheckboxes.length} packages`);
            
            if (typeof updatePackageSelection === 'function') {
                updatePackageSelection();
            }
        }
        else if (checkbox.id === 'selectAllContainers') {
            const containerCheckboxes = document.querySelectorAll('.container-checkbox');
            containerCheckboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            console.log(`${isChecked ? '✅ Selected' : '❌ Deselected'} ${containerCheckboxes.length} containers`);
            
            if (typeof updateContainerSelection === 'function') {
                updateContainerSelection();
            }
        }
        else {
            console.warn('⚠️ Unknown checkbox ID in toggleSelectAll:', checkbox.id);
        }
        
    } catch (error) {
        console.error('❌ Error in toggleSelectAll:', error);
    }
};

// Update package selection count and select-all checkbox state
function updatePackageSelection() {
    try {
        const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
        const checkedBoxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
        
        const selectAllCheckbox = document.getElementById('selectAllPackages');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
        }
        
        console.log(`📦 Packages selected: ${checkedBoxes.length}/${checkboxes.length}`);
        
    } catch (error) {
        console.error('❌ Error in updatePackageSelection:', error);
    }
}

// Update container selection count and select-all checkbox state
function updateContainerSelection() {
    try {
        const checkboxes = document.querySelectorAll('.container-checkbox');
        const checkedBoxes = document.querySelectorAll('.container-checkbox:checked');
        
        const selectAllCheckbox = document.getElementById('selectAllContainers');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
        }
        
        console.log(`📦 Containers selected: ${checkedBoxes.length}/${checkboxes.length}`);
        
    } catch (error) {
        console.error('❌ Error in updateContainerSelection:', error);
    }
}

// Setup event listeners for individual checkboxes
function setupSelectionListeners() {
    try {
        console.log('🔧 Setting up selection listeners...');
        
        // Package checkboxes
        const packageCheckboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
        packageCheckboxes.forEach(checkbox => {
            checkbox.removeEventListener('change', handlePackageCheckboxChange);
            checkbox.addEventListener('change', handlePackageCheckboxChange);
        });
        
        // Container checkboxes
        const containerCheckboxes = document.querySelectorAll('.container-checkbox');
        containerCheckboxes.forEach(checkbox => {
            checkbox.removeEventListener('change', handleContainerCheckboxChange);
            checkbox.addEventListener('change', handleContainerCheckboxChange);
        });
        
        console.log(`✅ Setup ${packageCheckboxes.length} package and ${containerCheckboxes.length} container listeners`);
        
    } catch (error) {
        console.error('❌ Error setting up selection listeners:', error);
    }
}

// Handle individual package checkbox changes
function handlePackageCheckboxChange(event) {
    if (typeof updatePackageSelection === 'function') {
        updatePackageSelection();
    }
}

// Handle individual container checkbox changes
function handleContainerCheckboxChange(event) {
    if (typeof updateContainerSelection === 'function') {
        updateContainerSelection();
    }
}

// Initialize selection system
function initializeSelectionSystem() {
    try {
        console.log('🚀 Initializing selection system...');
        
        // Setup listeners
        setupSelectionListeners();
        
        // Initial updates
        updatePackageSelection();
        updateContainerSelection();
        
        console.log('✅ Selection system initialized');
        
    } catch (error) {
        console.error('❌ Error initializing selection system:', error);
    }
}

// Call this when your table data loads
function refreshSelectionSystem() {
    setTimeout(() => {
        setupSelectionListeners();
        updatePackageSelection();
        updateContainerSelection();
    }, 100);
}

// Test function to verify everything works
function testSelectionSystem() {
    try {
        console.log('🧪 Testing selection system...');
        
        const selectAllPackages = document.getElementById('selectAllPackages');
        const selectAllContainers = document.getElementById('selectAllContainers');
        
        if (selectAllPackages) {
            console.log('✅ selectAllPackages element found');
        } else {
            console.log('❌ selectAllPackages element not found');
        }
        
        if (selectAllContainers) {
            console.log('✅ selectAllContainers element found');
        } else {
            console.log('❌ selectAllContainers element not found');
        }
        
        // Test package checkboxes
        const packageCheckboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
        console.log(`📦 Package checkboxes: ${packageCheckboxes.length}`);
        
        // Test container checkboxes
        const containerCheckboxes = document.querySelectorAll('.container-checkbox');
        console.log(`📦 Container checkboxes: ${containerCheckboxes.length}`);
        
        console.log('✅ Selection system test completed');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Quick fix for immediate use
function quickFixSelection() {
    try {
        console.log('🔧 Applying quick selection fix...');
        
        // Ensure all functions are available
        if (!window.toggleSelectAll) {
            window.toggleSelectAll = function() {
                const event = window.event;
                if (event && event.target) {
                    const checkbox = event.target;
                    const isChecked = checkbox.checked;
                    
                    if (checkbox.id === 'selectAllPackages') {
                        const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
                        checkboxes.forEach(cb => cb.checked = isChecked);
                        console.log(`${isChecked ? 'Selected' : 'Deselected'} ${checkboxes.length} packages`);
                    }
                }
            };
        }
        
        console.log('✅ Quick fix applied!');
        
    } catch (error) {
        console.error('❌ Quick fix error:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeSelectionSystem();
        quickFixSelection();
    });
} else {
    initializeSelectionSystem();
    quickFixSelection();
}

// Export for testing
window.testSelectionSystem = testSelectionSystem;
window.refreshSelectionSystem = refreshSelectionSystem;
// ==================== REAL DATA COLLECTION FUNCTIONS ====================

// ✅ FUNCTION: Get all packages (real data only)
async function getAllPackages() {
    try {
        // Try multiple sources for REAL data
        if (window.packages && Array.isArray(window.packages) && window.packages.length > 0) {
            return window.packages;
        }
        
        // Try to get from Excel data (real packages)
        try {
            const excelPackages = await ExcelJS.readFile();
            if (excelPackages && excelPackages.length > 0) {
                return excelPackages;
            }
        } catch (excelError) {
            console.log('No Excel packages found:', excelError);
        }
        
        // Try localStorage
        const localData = localStorage.getItem('proclean_packages') || 
                         localStorage.getItem('packages') ||
                         localStorage.getItem('excelData');
        
        if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
        
        // Try Supabase if available
        if (supabase && !isUsingExcel) {
            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (!error && data && data.length > 0) {
                return data;
            }
        }
        
        console.log('❌ No real packages found, returning empty array');
        return []; // Return empty instead of sample data
        
    } catch (error) {
        console.error('Error in getAllPackages:', error);
        return []; // Return empty instead of sample data
    }
}

// ✅ FUNCTION: Get all stock (real data only)
async function getAllStock() {
    try {
        // Try to get REAL stock data first
        if (window.stockData && Array.isArray(window.stockData) && window.stockData.length > 0) {
            return window.stockData;
        }
        
        // Try localStorage for real stock
        const localData = localStorage.getItem('proclean_stock') || 
                         localStorage.getItem('stockData');
        
        if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
        
        // Try Supabase if available
        if (supabase && !isUsingExcel) {
            const { data, error } = await supabase
                .from('stock')
                .select('*')
                .order('name');
                
            if (!error && data && data.length > 0) {
                return data;
            }
        }
        
        // Try to get from table as fallback
        const stockTable = document.getElementById('stockTableBody');
        if (stockTable) {
            const rows = stockTable.querySelectorAll('tr');
            const stockData = [];
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const code = cells[0]?.textContent?.trim();
                    const name = cells[1]?.textContent?.trim();
                    const quantity = parseInt(cells[2]?.textContent) || 0;
                    
                    // Only add if we have real data
                    if (code && name) {
                        stockData.push({
                            code: code,
                            name: name,
                            quantity: quantity,
                            unit: cells[3]?.textContent?.trim() || 'adet',
                            status: cells[4]?.textContent?.trim() || 'Stokta'
                        });
                    }
                }
            });
            
            if (stockData.length > 0) {
                return stockData;
            }
        }
        
        console.log('❌ No real stock data found');
        return []; // Return empty instead of sample data
        
    } catch (error) {
        console.error('Error in getAllStock:', error);
        return []; // Return empty instead of sample data
    }
}

// ✅ FIXED: Get all shipping data (real data only)
async function getAllShippingData() {
    console.log('🔄 getAllShippingData() called');
    
    try {
        // FIRST: Try to get from current window state (most reliable)
        if (window.containers && Array.isArray(window.containers) && window.containers.length > 0) {
            console.log(`✅ Found ${window.containers.length} containers in window.containers`);
            return window.containers;
        }
        
        // SECOND: Try to extract from existing DOM (fallback)
        const shippingFolders = document.getElementById('shippingFolders');
        if (shippingFolders && shippingFolders.innerHTML.includes('customer-folder')) {
            console.log('✅ Found existing shipping data in DOM');
            
            // Extract containers from existing DOM structure
            const containers = extractContainersFromDOM();
            if (containers.length > 0) {
                console.log(`✅ Extracted ${containers.length} containers from DOM`);
                return containers;
            }
        }
        
        // THIRD: Try Supabase
        if (supabase && !isUsingExcel) {
            console.log('🔄 Trying Supabase for containers...');
            const { data, error } = await supabase
                .from('containers')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (!error && data && data.length > 0) {
                console.log(`✅ Found ${data.length} containers from Supabase`);
                window.containers = data; // Cache for future use
                return data;
            } else if (error) {
                console.warn('Supabase containers error:', error);
            }
        }
        
        console.log('❌ No containers found through any method');
        return [];
        
    } catch (error) {
        console.error('Error in getAllShippingData:', error);
        return [];
    }
}

// Helper function to extract containers from existing DOM
function extractContainersFromDOM() {
    const containers = [];
    const customerFolders = document.querySelectorAll('.customer-folder');
    
    customerFolders.forEach(folder => {
        const containerRows = folder.querySelectorAll('tbody tr');
        
        containerRows.forEach(row => {
            const checkbox = row.querySelector('.container-checkbox');
            const containerNo = row.querySelector('td:nth-child(2) strong')?.textContent;
            const packageCount = row.querySelector('td:nth-child(3)')?.textContent;
            const totalQuantity = row.querySelector('td:nth-child(4)')?.textContent;
            const date = row.querySelector('td:nth-child(5)')?.textContent;
            const statusElement = row.querySelector('td:nth-child(6) span');
            const status = statusElement?.className.includes('sevk-edildi') ? 'sevk-edildi' : 'beklemede';
            
            if (containerNo && checkbox) {
                containers.push({
                    id: checkbox.value,
                    container_no: containerNo,
                    package_count: parseInt(packageCount) || 0,
                    total_quantity: parseInt(totalQuantity) || 0,
                    status: status,
                    customer: folder.querySelector('strong')?.textContent || 'Unknown',
                    created_at: date ? convertToISODate(date) : new Date().toISOString()
                });
            }
        });
    });
    
    return containers;
}

// Helper to convert DD.MM.YYYY to ISO date
function convertToISODate(dateString) {
    const parts = dateString.split('.');
    if (parts.length === 3) {
        return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00.000Z`;
    }
    return new Date().toISOString();
}
// ✅ FUNCTION: Get all reports (real data only)
async function getAllReports() {
    try {
        // Try to get actual reports data
        if (window.reportsData && Array.isArray(window.reportsData) && window.reportsData.length > 0) {
            return window.reportsData;
        }
        
        const localData = localStorage.getItem('proclean_reports') || 
                         localStorage.getItem('reportsData');
        
        if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
        
        // Try to get reports from localStorage backup
        const reportKeys = Object.keys(localStorage).filter(key => key.startsWith('report_'));
        if (reportKeys.length > 0) {
            const reports = reportKeys.map(key => {
                try {
                    return JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
            
            if (reports.length > 0) {
                return reports;
            }
        }
        
        console.log('❌ No real reports data found');
        return []; // Return empty instead of sample data
        
    } catch (error) {
        console.error('Error in getAllReports:', error);
        return []; // Return empty instead of sample data
    }
}

// ✅ FUNCTION: Get all customers (real data only)
async function getAllCustomers() {
    try {
        console.log('📋 Fetching real customers data...');
        
        // Try to get customers from Supabase first
        if (supabase && !isUsingExcel) {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');
                
            if (!error && data && data.length > 0) {
                console.log(`✅ Found ${data.length} real customers from Supabase`);
                return data;
            }
        }
        
        // Fallback: Get customers from packages data
        const packages = await getAllPackages();
        const uniqueCustomers = [...new Set(packages.map(pkg => pkg.customer_name).filter(Boolean))];
        
        if (uniqueCustomers.length > 0) {
            const customerList = uniqueCustomers.map((name, index) => ({
                customer_code: `CUST-${String(index + 1).padStart(3, '0')}`,
                customer_name: name,
                phone: '',
                email: ''
            }));
            console.log(`✅ Found ${customerList.length} customers from packages`);
            return customerList;
        }
        
        console.log('❌ No real customers found');
        return [];
        
    } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
}

// ✅ FUNCTION: Get product type for display
function getProductType(package) {
    if (!package) return 'N/A';
    
    // Handle different package item structures
    if (package.items && typeof package.items === 'object') {
        if (Array.isArray(package.items)) {
            // Array of items
            return package.items.map(item => item.name || 'Ürün').join(', ');
        } else {
            // Object with product:quantity pairs
            return Object.keys(package.items).join(', ');
        }
    }
    
    return package.product || package.product_name || 'N/A';
}

// Excel Preview Function (Updated to only show real data)
function previewExcelData() {
    console.log('📊 Excel Preview triggered');
    
    try {
        showAlert('Excel verileri hazırlanıyor...', 'info');
        
        // Create preview modal
        const modal = document.createElement('div');
        modal.id = 'excelPreviewModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 95%; max-height: 90%; width: 900px; overflow: hidden; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 2px solid #217346; padding-bottom: 1rem;">
                    <h3 style="color: #217346; margin: 0;">
                        <i class="fas fa-file-excel" style="margin-right: 10px;"></i>Excel Veri Önizleme
                    </h3>
                    <button onclick="document.getElementById('excelPreviewModal').remove()" 
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                
                <div style="flex: 1; overflow: auto; margin-bottom: 1rem;">
                    <div class="preview-tabs" style="display: flex; border-bottom: 1px solid #ddd; margin-bottom: 1rem;">
                        <button class="tab-button active" onclick="switchPreviewTab('packages')" 
                                style="padding: 10px 20px; border: none; background: none; cursor: pointer; border-bottom: 3px solid #217346;">
                            Paketler
                        </button>
                        <button class="tab-button" onclick="switchPreviewTab('stock')" 
                                style="padding: 10px 20px; border: none; background: none; cursor: pointer;">
                            Stok
                        </button>
                        <button class="tab-button" onclick="switchPreviewTab('customers')" 
                                style="padding: 10px 20px; border: none; background: none; cursor: pointer;">
                            Müşteriler
                        </button>
                    </div>
                    
                    <div id="previewContent" style="min-height: 300px;">
                        <div style="text-align: center; padding: 3rem; color: #666;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>Veriler yükleniyor...</p>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #ddd; padding-top: 1rem;">
                    <button onclick="exportDataFromPreview()" 
                            class="btn btn-success" 
                            style="background-color: #217346; border-color: #217346;">
                        <i class="fas fa-download"></i> Excel Olarak İndir
                    </button>
                    <button onclick="document.getElementById('excelPreviewModal').remove()" 
                            class="btn btn-secondary">
                        Kapat
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load initial data
        setTimeout(() => {
            switchPreviewTab('packages');
        }, 100);
        
    } catch (error) {
        console.error('Excel preview error:', error);
        showAlert('Excel önizleme oluşturulurken hata oluştu: ' + error.message, 'error');
    }
}

// Switch between preview tabs
function switchPreviewTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.style.borderBottom = '3px solid transparent';
        btn.style.color = '#666';
    });
    
    const activeBtn = document.querySelector(`.tab-button[onclick*="${tabName}"]`);
    if (activeBtn) {
        activeBtn.style.borderBottom = '3px solid #217346';
        activeBtn.style.color = '#217346';
    }
    
    // Show loading
    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;
    
    previewContent.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
            <p>${getTabTitle(tabName)} yükleniyor...</p>
        </div>
    `;
    
    // Load tab content
    setTimeout(() => {
        loadPreviewTabContent(tabName);
    }, 500);
}

function getTabTitle(tabName) {
    const titles = {
        'packages': 'Paketler',
        'stock': 'Stok Öğeleri',
        'customers': 'Müşteriler'
    };
    return titles[tabName] || 'Veriler';
}

// Load content for each tab (Only real data)
async function loadPreviewTabContent(tabName) {
    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;
    
    try {
        let data = [];
        let columns = [];
        
        switch (tabName) {
            case 'packages':
                data = await getAllPackages();
                columns = ['Paket No', 'Müşteri', 'Ürünler', 'Toplam Adet', 'Durum', 'Paketleyen', 'Tarih'];
                break;
                
            case 'stock':
                data = await getAllStock();
                columns = ['Stok Kodu', 'Ürün Adı', 'Miktar', 'Birim', 'Durum'];
                break;
                
            case 'customers':
                data = await getAllCustomers();
                columns = ['Müşteri Kodu', 'Müşteri Adı', 'Telefon', 'E-posta'];
                break;
        }
        
        if (data.length === 0) {
            previewContent.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>Bu kategoride henüz veri bulunamadı</p>
                    <p style="font-size: 0.9rem; margin-top: 1rem;">Veri ekledikten sonra burada görünecektir.</p>
                </div>
            `;
            return;
        }
        
        // Create table with real data
        let tableHTML = `
            <div style="overflow: auto; max-height: 400px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead style="background: #f8f9fa; position: sticky; top: 0;">
                        <tr>
                            ${columns.map(col => `<th style="padding: 12px; text-align: left; border-bottom: 2px solid #217346; color: #217346;">${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.forEach((item, index) => {
            tableHTML += '<tr style="border-bottom: 1px solid #eee;">';
            
            switch (tabName) {
                case 'packages':
                    tableHTML += `
                        <td style="padding: 10px;">${item.package_no || 'N/A'}</td>
                        <td style="padding: 10px;">${item.customer_name || 'N/A'}</td>
                        <td style="padding: 10px;">${getProductType(item) || 'N/A'}</td>
                        <td style="padding: 10px; text-align: center;">${item.total_quantity || 0}</td>
                        <td style="padding: 10px;">
                            <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; 
                                background: ${item.status === 'sevk-edildi' ? '#d4edda' : '#fff3cd'}; 
                                color: ${item.status === 'sevk-edildi' ? '#155724' : '#856404'};">
                                ${item.status === 'sevk-edildi' ? 'Sevk Edildi' : 'Beklemede'}
                            </span>
                        </td>
                        <td style="padding: 10px;">${item.packer || 'N/A'}</td>
                        <td style="padding: 10px;">${item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                    `;
                    break;
                    
                case 'stock':
                    tableHTML += `
                        <td style="padding: 10px;">${item.code || 'N/A'}</td>
                        <td style="padding: 10px;">${item.name || 'N/A'}</td>
                        <td style="padding: 10px; text-align: center;">${item.quantity || 0}</td>
                        <td style="padding: 10px;">${item.unit || 'adet'}</td>
                        <td style="padding: 10px;">
                            <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;
                                background: ${item.quantity > 10 ? '#d4edda' : item.quantity > 0 ? '#fff3cd' : '#f8d7da'};
                                color: ${item.quantity > 10 ? '#155724' : item.quantity > 0 ? '#856404' : '#721c24'};">
                                ${item.quantity > 10 ? 'Stokta' : item.quantity > 0 ? 'Az Stok' : 'Tükendi'}
                            </span>
                        </td>
                    `;
                    break;
                    
                case 'customers':
                    tableHTML += `
                        <td style="padding: 10px;">${item.customer_code || item.code || 'N/A'}</td>
                        <td style="padding: 10px;">${item.customer_name || item.name || 'N/A'}</td>
                        <td style="padding: 10px;">${item.phone || item.telephone || 'N/A'}</td>
                        <td style="padding: 10px;">${item.email || 'N/A'}</td>
                    `;
                    break;
            }
            
            tableHTML += '</tr>';
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 1rem; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>Toplam: ${data.length} kayıt</strong>
            </div>
        `;
        
        previewContent.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Error loading preview tab:', error);
        previewContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Veriler yüklenirken hata oluştu: ${error.message}</p>
            </div>
        `;
    }
}

// Export data from preview
function exportDataFromPreview() {
    showAlert('Excel dosyası indiriliyor...', 'info');
    
    // Use the existing export function
    if (typeof exportData === 'function') {
        exportData('excel');
    } else {
        showAlert('Excel export özelliği şu anda kullanılamıyor', 'error');
    }
    
    // Close the modal after a delay
    setTimeout(() => {
        const modal = document.getElementById('excelPreviewModal');
        if (modal) modal.remove();
    }, 1000);
}

// Make functions globally available
window.previewExcelData = previewExcelData;
window.switchPreviewTab = switchPreviewTab;
window.exportDataFromPreview = exportDataFromPreview;
window.loadPreviewTabContent = loadPreviewTabContent;
window.getAllPackages = getAllPackages;
window.getAllStock = getAllStock;
window.getAllCustomers = getAllCustomers;
window.getAllShippingData = getAllShippingData;
window.getAllReports = getAllReports;
window.getProductType = getProductType;

console.log('✅ Fixed data collection functions loaded - No fake data');



// ==================== EXCEL BUTTONS - GUARANTEED WORKING VERSION ====================
console.log("🚀 Loading Excel buttons script...");

// ✅ STEP 1: Define all functions in global scope IMMEDIATELY
window.refreshExcelData = async function() {
    console.log('🔄 refreshExcelData called!');
    
    const refreshBtn = document.getElementById('refreshExcelBtn');
    
    try {
        alert('Excel verileri güncelleniyor...');
        
        // Show loading state
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
            refreshBtn.disabled = true;
        }
        
        // 1. Sync with Supabase first
        if (typeof supabase !== 'undefined' && navigator.onLine && typeof syncExcelWithSupabase === 'function') {
            console.log('🔄 Syncing with Supabase...');
            await syncExcelWithSupabase();
        }
        
        // 2. Reload packages data
        if (typeof loadPackagesData === 'function') {
            await loadPackagesData();
        }
        
        // 3. Refresh all tables
        if (typeof populatePackagesTable === 'function') await populatePackagesTable();
        if (typeof populateStockTable === 'function') await populateStockTable();
        if (typeof populateShippingTable === 'function') await populateShippingTable();
        
        // 4. Update storage indicator
        if (typeof updateStorageIndicator === 'function') {
            updateStorageIndicator();
        }
        
        alert('✅ Excel verileri başarıyla güncellendi!');
        console.log('✅ Refresh completed');
        
    } catch (error) {
        console.error('❌ Excel refresh error:', error);
        alert('Excel güncelleme hatası: ' + error.message);
    } finally {
        // Restore button state
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Güncelle';
            refreshBtn.disabled = false;
        }
    }
};

window.clearExcelData = async function() {
    console.log('🗑️ clearExcelData called!');
    
    const clearBtn = document.getElementById('clearExcelBtn');
    
    try {
        alert('Excel verileri temizleniyor...');
        
        // Show loading state
        if (clearBtn) {
            clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Temizleniyor...';
            clearBtn.disabled = true;
        }
        
        // 1. Clear Excel storage
        if (typeof ExcelJS !== 'undefined' && ExcelJS.clearFile) {
            await ExcelJS.clearFile();
            console.log('✅ Excel file cleared');
        } else {
            // Fallback: Clear from localStorage
            const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
            localStorage.removeItem(`excelPackages_${workspaceId}`);
            localStorage.removeItem(`excelPackages`);
            console.log('✅ Excel data cleared from localStorage');
        }
        
        // 2. Clear sync queue
        if (window.excelSyncQueue) {
            window.excelSyncQueue = [];
            localStorage.removeItem('excelSyncQueue');
            console.log('✅ Sync queue cleared');
        }
        
        // 3. Reset application state
        if (typeof clearAppState === 'function') {
            clearAppState();
        }
        
        // 4. Refresh all tables
        if (typeof populatePackagesTable === 'function') await populatePackagesTable();
        if (typeof populateStockTable === 'function') await populateStockTable();
        if (typeof populateShippingTable === 'function') await populateShippingTable();
        
        // 5. Update storage indicator
        if (typeof updateStorageIndicator === 'function') {
            updateStorageIndicator();
        }
        
        alert('✅ Excel verileri başarıyla temizlendi!');
        console.log('✅ Clear completed');
        
    } catch (error) {
        console.error('❌ Excel clear error:', error);
        alert('Excel temizleme hatası: ' + error.message);
    } finally {
        // Restore button state
        if (clearBtn) {
            clearBtn.innerHTML = '<i class="fas fa-trash"></i> Temizle';
            clearBtn.disabled = false;
        }
    }
};

window.clearExcelWithPassword = async function() {
    console.log('🔒 clearExcelWithPassword called!');
    
    // Try PasswordGuard first
    if (typeof window.clearExcelDataWithAuth === 'function') {
        console.log('Using PasswordGuard...');
        await window.clearExcelDataWithAuth();
    } else {
        // Fallback: Simple password prompt
        console.log('Using simple password...');
        const password = prompt('Excel verilerini temizlemek için şifre girin (9494):');
        
        if (password === '9494') {
            await window.clearExcelData();
        } else if (password !== null) {
            alert('Hatalı şifre! İşlem iptal edildi.');
        }
    }
};

console.log('✅ Functions defined in global scope!');

// ✅ STEP 2: Attach event listeners when DOM is ready
function attachExcelButtonListeners() {
    console.log("🔗 Attaching button listeners...");
    
    const refreshBtn = document.getElementById('refreshExcelBtn');
    const clearBtn = document.getElementById('clearExcelBtn');
    
    if (!refreshBtn) {
        console.error("❌ Refresh button not found!");
        return false;
    }
    
    if (!clearBtn) {
        console.error("❌ Clear button not found!");
        return false;
    }
    
    console.log("✅ Both buttons found in DOM");
    
    // Remove any existing listeners first
    refreshBtn.replaceWith(refreshBtn.cloneNode(true));
    clearBtn.replaceWith(clearBtn.cloneNode(true));
    
    // Get fresh references
    const newRefreshBtn = document.getElementById('refreshExcelBtn');
    const newClearBtn = document.getElementById('clearExcelBtn');
    
    // REFRESH BUTTON
    newRefreshBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 REFRESH CLICKED!");
        if (typeof window.refreshExcelData === 'function') {
            window.refreshExcelData();
        } else {
            alert('Refresh function not loaded!');
        }
    };
    
    // CLEAR BUTTON
    newClearBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 CLEAR CLICKED!");
        if (typeof window.clearExcelWithPassword === 'function') {
            window.clearExcelWithPassword();
        } else {
            alert('Clear function not loaded!');
        }
    };
    
    console.log("✅ Button listeners attached successfully!");
    return true;
}

// ✅ STEP 3: Multiple attachment attempts
function initializeExcelButtons() {
    console.log("🔄 Initializing Excel buttons...");
    
    // Try immediately
    if (attachExcelButtonListeners()) {
        console.log("✅ Buttons initialized on first try!");
        return;
    }
    
    // Retry with delays
    const retryAttempts = [100, 500, 1000, 2000, 5000];
    
    retryAttempts.forEach(delay => {
        setTimeout(() => {
            console.log(`🔄 Retry after ${delay}ms...`);
            if (attachExcelButtonListeners()) {
                console.log(`✅ Buttons initialized after ${delay}ms!`);
            }
        }, delay);
    });
}

// ✅ STEP 4: Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExcelButtons);
} else {
    initializeExcelButtons();
}

// ✅ STEP 5: Final fallback - expose initialization function globally
window.initializeExcelButtons = initializeExcelButtons;

console.log("✅ Excel buttons script loaded completely!");
console.log("🔧 Manual fix: Run initializeExcelButtons() in console if needed");




// Enhanced clearAppState function
function clearAppState() {
    console.log('🔄 Clearing application state...');
    
    // Clear global variables
    window.packages = [];
    window.containers = [];
    window.currentPackage = {};
    
    // Clear selected customer
    if (window.selectedCustomer) {
        window.selectedCustomer = null;
    }
    
    // Clear current container
    if (window.currentContainer) {
        window.currentContainer = null;
    }
    
    // Reset UI elements
    const elements = {
        customerSelect: '',
        personnelSelect: '',
        containerNumber: 'Yok',
        totalPackages: '0'
    };
    
    Object.keys(elements).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.tagName === 'SELECT') {
                element.value = '';
            } else {
                element.textContent = elements[key];
            }
        }
    });
    
    // Reset quantity badges
    document.querySelectorAll('.quantity-badge').forEach(badge => {
        badge.textContent = '0';
    });
    
    // Clear package details
    const packageDetail = document.getElementById('packageDetailContent');
    if (packageDetail) {
        packageDetail.innerHTML = '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';
    }
    
    console.log('✅ Application state cleared');
}

// Make functions globally available
window.clearExcelDataWithAuth = clearExcelDataWithAuth;
window.refreshExcelData = refreshExcelData;
window.clearExcelData = clearExcelData;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeExcelButtons, 3000);
});




/**
 * Toggles the selection state of all individual customer checkboxes 
 * based on the state of the 'Select All' checkbox.
 * * @param {HTMLInputElement} selectAllCheckbox - The 'Select All' checkbox element that triggered the change.
 */
function toggleSelectAllCustomer(selectAllCheckbox) {
    const isChecked = selectAllCheckbox.checked;
    
    // Assuming your individual customer checkboxes have a common class like 'customer-checkbox'
    const customerCheckboxes = document.querySelectorAll('.customer-checkbox');
    
    customerCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });

    console.log('Select all customers toggled:', isChecked);
}

// Make the function globally accessible to the HTML
window.toggleSelectAllCustomer = toggleSelectAllCustomer;
