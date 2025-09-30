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
        apiKeyModal: 'apiKeyModal',
        apiKeyInput: 'apiKeyInput',
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


// API anahtarı modalını göster
function showApiKeyModal() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.value = SUPABASE_ANON_KEY || '';
        document.getElementById('apiKeyModal').style.display = 'flex';
    }
}

// API anahtarı yardımı göster
function showApiKeyHelp() {
    const helpWindow = window.open('', '_blank');
    helpWindow.document.write(`
        <html>
        <head>
            <title>Supabase API Anahtarı Alma Rehberi</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #2c3e50; }
                .step { margin-bottom: 20px; padding: 15px; background: #f5f7fa; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>Supabase API Anahtarı Nasıl Alınır?</h1>
            <div class="step">
                <h3>1. Supabase hesabınıza giriş yapın</h3>
                <p><a href="https://supabase.com/dashboard" target="_blank">https://supabase.com/dashboard</a></p>
            </div>
            <div class="step">
                <h3>2. Projenizi seçin veya yeni proje oluşturun</h3>
            </div>
            <div class="step">
                <h3>3. Sol menüden Settings (Ayarlar) seçeneğine tıklayın</h3>
            </div>
            <div class="step">
                <h3>4. API sekmesine gidin</h3>
            </div>
            <div class="step">
                <h3>5. "Project API Keys" bölümündeki "anon" veya "public" anahtarını kopyalayın</h3>
                <p>Bu anahtarı uygulamadaki API anahtarı alanına yapıştırın.</p>
            </div>
            <div class="step">
                <h3>Önemli Not:</h3>
                <p>API anahtarınızı asla paylaşmayın ve gizli tutun.</p>
            </div>
        </body>
        </html>
    `);
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

function editStockItem(code) {
    // Prevent multiple edits
    if (currentEditingRow && currentEditingRow !== code) {
        showAlert('Önce mevcut düzenlemeyi tamamlayın', 'warning');
        return;
    }
    
    currentEditingRow = code;
    
    const row = document.querySelector(`tr:has(td:first-child:contains("${code}"))`);
    if (!row) {
        console.error('Stock row not found for code:', code);
        return;
    }
    
    const quantitySpan = row.querySelector('.stock-quantity');
    const quantityInput = row.querySelector('.stock-quantity-input');
    const editButton = row.querySelector('button');
    const editButtons = row.querySelector('.edit-buttons');
    
    if (!quantitySpan || !quantityInput) {
        console.error('Stock edit elements not found');
        return;
    }
    
    // Switch to edit mode
    quantitySpan.style.display = 'none';
    quantityInput.style.display = 'block';
    if (editButton) editButton.style.display = 'none';
    if (editButtons) editButtons.style.display = 'flex';
    
    editingStockItem = code;
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

// Müşteri klasöründeki tüm konteynerleri seç
function toggleSelectAllCustomer(checkbox) {
    const folder = checkbox.closest('.customer-folder');
    const checkboxes = folder.querySelectorAll('.container-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
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
        
// Package operations
function openQuantityModal(product) {
    selectedProduct = product;
    elements.quantityModalTitle.textContent = `${product} - Adet Girin`;
    elements.quantityInput.value = '';
    document.getElementById('quantityError').style.display = 'none';
    elements.quantityModal.style.display = 'flex';
    elements.quantityInput.focus();
}


function openStatusQuantityModal(status) {
    selectedProduct = status; // 👈 reuse the same global
    elements.quantityModalTitle.textContent = `${status} - Adet Girin`;
    elements.quantityInput.value = '';
    document.getElementById('quantityError').style.display = 'none';
    elements.quantityModal.style.display = 'flex';
    elements.quantityInput.focus();
}



function confirmQuantity() {
    const quantity = parseInt(elements.quantityInput.value);
    
    // Doğrulama
    if (!quantity || quantity <= 0) {
        document.getElementById('quantityError').style.display = 'block';
        return;
    }

    // Update quantity badge
    const badge = document.getElementById(`${selectedProduct}-quantity`);
    if (badge) {
        const currentQuantity = parseInt(badge.textContent) || 0;
        badge.textContent = currentQuantity + quantity;
    }

    // Add to current package
    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[selectedProduct] = (currentPackage.items[selectedProduct] || 0) + quantity;

    showAlert(`${selectedProduct}: ${quantity} adet eklendi`, 'success');
    closeQuantityModal();
}
        
function openManualEntry() {
    document.getElementById('manualModal').style.display = 'flex';
    document.getElementById('manualProduct').focus();
}
        
function addManualProduct() {
    const product = document.getElementById('manualProduct').value.trim();
    const quantity = parseInt(document.getElementById('manualQuantity').value);

    // Form doğrulama
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
    
    // Clear form
    document.getElementById('manualProduct').value = '';
    document.getElementById('manualQuantity').value = '';
    closeManualModal();
}


// Open Extra Modal
function openExtraModal() {
    document.getElementById('extraModal').style.display = 'block';
}

// Close Extra Modal
function closeExtraModal() {
    document.getElementById('extraModal').style.display = 'none';
}


// Settings functions
function showSettingsModal() {
    loadSettings(); // Load current settings
    checkSystemStatus(); // Update status indicators
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function loadSettings() {
    // Load saved settings from localStorage
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

    // Theme
    if (settings.theme === 'dark') {
        document.getElementById('themeToggle').checked = true;
        document.body.classList.add('dark-mode');
    }

    // Language
    if (settings.language) {
        document.getElementById('languageSelect').value = settings.language;
    }
    
    // Auto-save
    document.getElementById('autoSaveToggle').checked = settings.autoSave !== false;
}

// ---------------- LOAD SETTINGS ----------------
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

// ---------------- SAVE SETTINGS ----------------
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

// ---------------- INIT ----------------
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
                showAlert('Test yazdırma başarısız: ' + error.message, 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = originalText;
            }
        });
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
        }, 30000);
        
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

// Reset settings to defaults
function resetSettings() {
    if (confirm('Tüm ayarlar varsayılan değerlere sıfırlanacak. Emin misiniz?')) {
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
            barcodeHeight: '25',
            labelWidth: '100',
            labelHeight: '80',
            debugMode: false
        };
        
        localStorage.setItem('procleanSettings', JSON.stringify(defaultSettings));
        applySettings(defaultSettings);
        loadSettings();
        
        showAlert('Ayarlar varsayılan değerlere sıfırlandı', 'success');
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
                product: pkg.item_type || '', // fallback to empty string if missing
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

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
    const selectAll = document.getElementById('selectAllPackages').checked;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
    });
}

function updatePackageSelection() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    
    document.getElementById('selectAllPackages').checked = checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
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
