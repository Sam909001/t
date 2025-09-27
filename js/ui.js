/// 3. ELEMENT EXISTENCE VALIDATION - ADD THIS AT THE BEGINNING
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
        
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
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

function editStockItem(button, code) {
    // Prevent multiple edits
    if (currentEditingRow && currentEditingRow !== code) {
        showAlert('Önce mevcut düzenlemeyi tamamlayın', 'warning');
        return;
    }
    
    currentEditingRow = code;
    
    const row = button.closest('tr');
    const quantitySpan = row.querySelector('.stock-quantity');
    const quantityInput = row.querySelector('.stock-quantity-input');
    const editButton = row.querySelector('button');
    const editButtons = row.querySelector('.edit-buttons');
    
    // Switch to edit mode
    quantitySpan.style.display = 'none';
    quantityInput.style.display = 'block';
    editButton.style.display = 'none';
    editButtons.style.display = 'flex';
    
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
    
    // Show initial message
    logsWindow.addLog('Console logs started at ' + new Date().toLocaleString(), 'info');
    
    // Restore original console methods when window closes
    const checkWindow = setInterval(() => {
        if (logsWindow.closed) {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            console.info = originalInfo;
            clearInterval(checkWindow);
            showAlert('Console logs window closed', 'info');
        }
    }, 1000);
    
    showAlert('Console logs window opened', 'info');
}

// FIX #5: exportData function
function exportData() {
    try {
        // Get all data from localStorage
        const exportData = {
            packages: JSON.parse(localStorage.getItem('packages') || '[]'),
            containers: JSON.parse(localStorage.getItem('containers') || '[]'),
            customers: JSON.parse(localStorage.getItem('customers') || '[]'),
            personnel: JSON.parse(localStorage.getItem('personnel') || '[]'),
            stock: JSON.parse(localStorage.getItem('stock') || '[]'),
            settings: JSON.parse(localStorage.getItem('procleanSettings') || '{}'),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Create blob and download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proclean-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showAlert('Veriler başarıyla dışa aktarıldı', 'success');
        console.log('Data exported successfully:', exportData);
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Veri aktarımı başarısız: ' + error.message, 'error');
    }
}

// FIX #6: importData function
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // Validate import data structure
                if (!importData.packages || !importData.containers || !importData.customers) {
                    throw new Error('Geçersiz veri formatı');
                }
                
                // Confirm overwrite
                if (confirm('Mevcut verilerin üzerine yazılacak. Devam etmek istiyor musunuz?')) {
                    // Import data
                    localStorage.setItem('packages', JSON.stringify(importData.packages));
                    localStorage.setItem('containers', JSON.stringify(importData.containers));
                    localStorage.setItem('customers', JSON.stringify(importData.customers));
                    localStorage.setItem('personnel', JSON.stringify(importData.personnel || []));
                    localStorage.setItem('stock', JSON.stringify(importData.stock || []));
                    localStorage.setItem('procleanSettings', JSON.stringify(importData.settings || {}));
                    
                    showAlert('Veriler başarıyla içe aktarıldı', 'success');
                    console.log('Data imported successfully');
                    
                    // Reload the application
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
                
            } catch (error) {
                console.error('Import error:', error);
                showAlert('Veri aktarımı başarısız: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// FIX #7: clearAllData function
function clearAllData() {
    if (confirm('TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Devam etmek istiyor musunuz?')) {
        if (confirm('Son bir kez onaylayın: Tüm paketler, konteynerler, müşteriler ve ayarlar silinecek!')) {
            try {
                // Clear all localStorage data
                localStorage.removeItem('packages');
                localStorage.removeItem('containers');
                localStorage.removeItem('customers');
                localStorage.removeItem('personnel');
                localStorage.removeItem('stock');
                localStorage.removeItem('procleanSettings');
                localStorage.removeItem('appState');
                
                showAlert('Tüm veriler başarıyla temizlendi', 'success');
                console.log('All data cleared');
                
                // Reload the application
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Clear data error:', error);
                showAlert('Veri temizleme başarısız: ' + error.message, 'error');
            }
        }
    }
}

// FIX #8: checkSystemStatus function
function checkSystemStatus() {
    const status = {
        localStorage: false,
        performance: false,
        memory: false,
        connection: false,
        overall: false
    };
    
    // Check localStorage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        status.localStorage = true;
    } catch (e) {
        console.error('LocalStorage test failed:', e);
    }
    
    // Check performance
    status.performance = performance.now() > 0;
    
    // Check memory (if available)
    status.memory = performance.memory ? performance.memory.usedJSHeapSize < performance.memory.jsHeapSizeLimit * 0.9 : true;
    
    // Check connection
    status.connection = navigator.onLine;
    
    // Overall status
    status.overall = status.localStorage && status.performance && status.memory;
    
    // Update UI indicators
    updateStatusIndicators(status);
    
    return status;
}

function updateStatusIndicators(status) {
    const indicators = {
        localStorage: document.getElementById('localStorageStatus'),
        performance: document.getElementById('performanceStatus'),
        memory: document.getElementById('memoryStatus'),
        connection: document.getElementById('connectionStatus'),
        overall: document.getElementById('overallStatus')
    };
    
    Object.keys(indicators).forEach(key => {
        const indicator = indicators[key];
        if (indicator) {
            indicator.className = `status-indicator ${status[key] ? 'online' : 'offline'}`;
            indicator.title = `${key}: ${status[key] ? 'OK' : 'Problem'}`;
        }
    });
}

// FIX #9: saveAllSettings function
function saveAllSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        
        // Get all settings from the form
        const formSettings = {
            theme: document.getElementById('themeToggle')?.checked ? 'dark' : 'light',
            language: document.getElementById('languageSelect')?.value || 'tr',
            autoSave: document.getElementById('autoSaveToggle')?.checked !== false,
            sound: document.getElementById('soundToggle')?.checked !== false,
            notifications: document.getElementById('notificationsToggle')?.checked !== false,
            backup: document.getElementById('backupToggle')?.checked !== false,
            debugMode: document.getElementById('debugToggle')?.checked || false,
            printerScaling: document.getElementById('printerScaling')?.value || '100%',
            copiesNumber: parseInt(document.getElementById('copiesNumber')?.value || '1'),
            fontSizeSelect: document.getElementById('fontSizeSelect')?.value || '14px',
            printQualitySelect: document.getElementById('printQualitySelect')?.value || 'high',
            barcodeTypeSelect: document.getElementById('barcodeTypeSelect')?.value || 'code128',
            paperSizeSelect: document.getElementById('paperSizeSelect')?.value || 'A4',
            printerFontSize: parseInt(document.getElementById('printerFontSize')?.value || '10'),
            printerMargin: parseInt(document.getElementById('printerMargin')?.value || '5'),
            barcodeHeight: parseInt(document.getElementById('barcodeHeight')?.value || '50'),
            labelWidth: parseInt(document.getElementById('labelWidth')?.value || '80'),
            labelHeight: parseInt(document.getElementById('labelHeight')?.value || '50')
        };
        
        // Merge with existing settings
        Object.assign(settings, formSettings);
        
        // Save to localStorage
        localStorage.setItem('procleanSettings', JSON.stringify(settings));
        
        // Apply settings immediately
        applySettings(settings);
        
        console.log('All settings saved:', settings);
        return true;
        
    } catch (error) {
        console.error('Save settings error:', error);
        showAlert('Ayarlar kaydedilirken hata oluştu: ' + error.message, 'error');
        return false;
    }
}

function applySettings(settings) {
    // Apply theme
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Apply font size
    if (settings.fontSizeSelect) {
        document.documentElement.style.fontSize = settings.fontSizeSelect;
    }
    
    // Apply debug mode
    if (settings.debugMode) {
        window.DEBUG_MODE = true;
        document.body.classList.add('debug-mode');
    } else {
        window.DEBUG_MODE = false;
        document.body.classList.remove('debug-mode');
    }
    
    // Apply other settings as needed
    console.log('Settings applied:', settings);
}

// FIX #10: setupSettingsEventListeners function (already defined above)
// This function is now complete with all necessary event listeners

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Setup event listeners
    setupSettingsEventListeners();
    
    // Check system status
    checkSystemStatus();
    
    // Setup auto-save if enabled
    setupAutoSave();
    
    console.log('Settings system initialized');
});

// Add this function to handle Excel export
function exportToExcel() {
    try {
        // Get current date for filename
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Get all data from localStorage
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Create worksheets for each data type
        if (packages.length > 0) {
            const wsPackages = XLSX.utils.json_to_sheet(packages);
            XLSX.utils.book_append_sheet(wb, wsPackages, 'Packages');
        }
        
        if (containers.length > 0) {
            const wsContainers = XLSX.utils.json_to_sheet(containers);
            XLSX.utils.book_append_sheet(wb, wsContainers, 'Containers');
        }
        
        if (customers.length > 0) {
            const wsCustomers = XLSX.utils.json_to_sheet(customers);
            XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
        }
        
        if (stock.length > 0) {
            const wsStock = XLSX.utils.json_to_sheet(stock);
            XLSX.utils.book_append_sheet(wb, wsStock, 'Stock');
        }
        
        // Add summary sheet
        const summaryData = [
            ['Data Type', 'Count', 'Export Date'],
            ['Packages', packages.length, new Date().toLocaleString()],
            ['Containers', containers.length, new Date().toLocaleString()],
            ['Customers', customers.length, new Date().toLocaleString()],
            ['Stock Items', stock.length, new Date().toLocaleString()]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        
        // Generate filename with date
        const filename = `proclean_data_${dateString}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showAlert(`Excel dosyası başarıyla oluşturuldu: ${filename}`, 'success');
        
        // Auto-backup to Supabase if available
        if (window.supabase && SUPABASE_ANON_KEY) {
            backupToSupabase();
        }
        
    } catch (error) {
        console.error('Excel export error:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu: ' + error.message, 'error');
    }
}

// Auto-save Excel file daily
function setupDailyAutoSave() {
    // Check if we need to save today
    const lastSaveDate = localStorage.getItem('lastExcelSaveDate');
    const today = new Date().toDateString();
    
    if (lastSaveDate !== today) {
        // Save Excel file
        exportToExcel();
        
        // Update last save date
        localStorage.setItem('lastExcelSaveDate', today);
        
        console.log('Daily auto-save completed');
    }
}

// Initialize auto-save on app start
document.addEventListener('DOMContentLoaded', function() {
    // Run auto-save check after 5 seconds (wait for app to load)
    setTimeout(setupDailyAutoSave, 5000);
    
    // Also set up daily check (every 24 hours)
    setInterval(setupDailyAutoSave, 24 * 60 * 60 * 1000);
});

// Add export button to UI
function addExportButton() {
    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportExcelBtn';
    exportBtn.className = 'btn btn-success';
    exportBtn.innerHTML = '<i class="fas fa-file-excel"></i> Excel\'e Aktar';
    exportBtn.onclick = exportToExcel;
    
    // Add to settings modal or main UI
    const settingsSection = document.querySelector('.settings-section');
    if (settingsSection) {
        settingsSection.appendChild(exportBtn);
    } else {
        // Add to main UI if settings section not found
        document.body.appendChild(exportBtn);
        exportBtn.style.position = 'fixed';
        exportBtn.style.bottom = '20px';
        exportBtn.style.right = '20px';
        exportBtn.style.zIndex = '1000';
    }
}

// Initialize export button when DOM is ready
document.addEventListener('DOMContentLoaded', addExportButton);
