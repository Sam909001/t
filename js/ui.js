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

// Enhanced settings management
function saveAllSettings() {
    try {
        const settings = {
            // Theme settings
            theme: document.getElementById('themeToggle')?.checked ? 'dark' : 'light',
            
            // Printer settings
            printerScaling: document.getElementById('printerScaling')?.value || '100%',
            copies: parseInt(document.getElementById('copiesNumber')?.value) || 1,
            fontName: document.getElementById('fontName')?.value || 'Arial',
            fontSize: parseInt(document.getElementById('fontSize')?.value) || 10,
            orientation: document.getElementById('orientation')?.value || 'portrait',
            marginTop: parseInt(document.getElementById('marginTop')?.value) || 5,
            marginBottom: parseInt(document.getElementById('marginBottom')?.value) || 5,
            labelHeader: document.getElementById('labelHeader')?.value || 'Yeditepe',
            
            // General settings
            language: document.getElementById('languageSelect')?.value || 'tr',
            autoSave: document.getElementById('autoSaveToggle')?.checked !== false,
            
            // Debug settings
            debugMode: document.getElementById('debugModeToggle')?.checked || false
        };

        localStorage.setItem('procleanSettings', JSON.stringify(settings));
        applySettings(settings);
        
        showAlert('Ayarlar başarıyla kaydedildi', 'success');
        
        // Update last saved date
        document.getElementById('lastUpdateDate').textContent = new Date().toLocaleString('tr-TR');
        
        return true;
        
    } catch (error) {
        ErrorHandler.handle(error, 'Ayarları kaydetme');
        return false;
    }
}

function loadAllSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        
        // Theme
        if (document.getElementById('themeToggle')) {
            document.getElementById('themeToggle').checked = savedSettings.theme === 'dark';
            toggleTheme(); // Apply the theme
        }
        
        // Printer settings
        if (savedSettings.printerScaling) {
            document.getElementById('printerScaling').value = savedSettings.printerScaling;
        }
        if (savedSettings.copies) {
            document.getElementById('copiesNumber').value = savedSettings.copies;
        }
        if (savedSettings.fontName) {
            document.getElementById('fontName').value = savedSettings.fontName;
        }
        if (savedSettings.fontSize) {
            document.getElementById('fontSize').value = savedSettings.fontSize;
        }
        if (savedSettings.orientation) {
            document.getElementById('orientation').value = savedSettings.orientation;
        }
        if (savedSettings.marginTop) {
            document.getElementById('marginTop').value = savedSettings.marginTop;
        }
        if (savedSettings.marginBottom) {
            document.getElementById('marginBottom').value = savedSettings.marginBottom;
        }
        if (savedSettings.labelHeader) {
            document.getElementById('labelHeader').value = savedSettings.labelHeader;
        }
        
        // General settings
        if (savedSettings.language) {
            document.getElementById('languageSelect').value = savedSettings.language;
        }
        if (document.getElementById('autoSaveToggle')) {
            document.getElementById('autoSaveToggle').checked = savedSettings.autoSave !== false;
        }
        
        // Debug settings
        if (document.getElementById('debugModeToggle')) {
            document.getElementById('debugModeToggle').checked = savedSettings.debugMode || false;
        }
        
        // Update last saved date display
        document.getElementById('lastUpdateDate').textContent = new Date().toLocaleString('tr-TR');
        
        console.log('Settings loaded successfully');
        return true;
        
    } catch (error) {
        ErrorHandler.handle(error, 'Ayarları yükleme');
        return false;
    }
}

function showSettingsModal() {
    loadAllSettings(); // Load current settings
    checkSystemStatus(); // Update status indicators
    document.getElementById('settingsModal').style.display = 'flex';
}




function showEnhancedSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 90%; max-height: 90vh; width: 1000px; overflow-y: auto;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
                <h2 style="margin: 0;">Gelişmiş Ayarlar</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 2rem;">
                <!-- Sidebar -->
                <div style="border-right: 1px solid #eee; padding-right: 1rem;">
                    <nav style="display: flex; flex-direction: column; gap: 5px;">
                        <button onclick="SettingsNavigation.showSection('general')" class="settings-nav-btn active" data-section="general">
                            <i class="fas fa-cog"></i> Genel
                        </button>
                        <button onclick="SettingsNavigation.showSection('printer')" class="settings-nav-btn" data-section="printer">
                            <i class="fas fa-print"></i> Yazıcı
                        </button>
                        <button onclick="SettingsNavigation.showSection('backup')" class="settings-nav-btn" data-section="backup">
                            <i class="fas fa-database"></i> Yedekleme
                        </button>
                        <button onclick="SettingsNavigation.showSection('users')" class="settings-nav-btn" data-section="users">
                            <i class="fas fa-users"></i> Kullanıcılar
                        </button>
                        <button onclick="SettingsNavigation.showSection('audit')" class="settings-nav-btn" data-section="audit">
                            <i class="fas fa-history"></i> Denetim
                        </button>
                        <button onclick="SettingsNavigation.showSection('advanced')" class="settings-nav-btn" data-section="advanced">
                            <i class="fas fa-tools"></i> Gelişmiş
                        </button>
                    </nav>
                </div>
                
                <!-- Content -->
                <div id="settingsContent">
                    <!-- Content will be loaded by section -->
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    SettingsNavigation.showSection('general');
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
                product: pkg.product,
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
// Enhanced workspace UI initialization
function initializeWorkspaceUI() {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500;
    let retries = 0;

    function attemptInitialization() {
        // Check if workspace indicator already exists
        if (document.getElementById('workspaceIndicator')) {
            console.log('Workspace UI already initialized');
            return true;
        }

        const header = document.querySelector('.app-header');
        if (!header) {
            retries++;
            if (retries < MAX_RETRIES) {
                console.log(`Workspace UI: Header not found, retrying in ${RETRY_DELAY}ms (${retries}/${MAX_RETRIES})`);
                setTimeout(attemptInitialization, RETRY_DELAY);
                return false;
            } else {
                console.error('Workspace UI: Failed to find app header after maximum retries');
                return false;
            }
        }

        try {
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
                cursor: pointer;
            `;
            indicator.title = 'İstasyonu değiştirmek için tıklayın';
            indicator.onclick = () => window.workspaceManager?.showWorkspaceSelection?.();

            // Safe insertion
            const settingsBtn = document.getElementById('settingsBtn');
            if (settingsBtn && settingsBtn.parentNode === header) {
                header.insertBefore(indicator, settingsBtn);
            } else {
                header.appendChild(indicator);
            }

            console.log('Workspace UI initialized successfully');
            updateWorkspaceIndicator();
            return true;
        } catch (error) {
            console.error('Workspace UI initialization error:', error);
            return false;
        }
    }

    return attemptInitialization();
}

// Update workspace indicator with current workspace
function updateWorkspaceIndicator() {
    const indicator = document.getElementById('workspaceIndicator');
    if (!indicator || !window.workspaceManager?.currentWorkspace) return;

    indicator.innerHTML = `
        <i class="fas fa-desktop"></i> 
        ${window.workspaceManager.currentWorkspace.name}
        <span class="workspace-type">${window.workspaceManager.getWorkspaceTypeLabel()}</span>
    `;
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




// Daily File Management
function showDailyFilesModal() {
    const files = ExcelJS.getAllFiles();
    
  const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 90%; max-height: 90vh; width: 1000px; overflow-y: auto;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
                <h2 style="margin: 0;">Gelişmiş Ayarlar</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 2rem;">
                <!-- Sidebar -->
                <div style="border-right: 1px solid #eee; padding-right: 1rem;">
                    <nav style="display: flex; flex-direction: column; gap: 5px;">
                        <button onclick="SettingsNavigation.showSection('general')" class="settings-nav-btn active" data-section="general">
                            <i class="fas fa-cog"></i> Genel
                        </button>
                        <button onclick="SettingsNavigation.showSection('printer')" class="settings-nav-btn" data-section="printer">
                            <i class="fas fa-print"></i> Yazıcı
                        </button>
                        <button onclick="SettingsNavigation.showSection('backup')" class="settings-nav-btn" data-section="backup">
                            <i class="fas fa-database"></i> Yedekleme
                        </button>
                        <button onclick="SettingsNavigation.showSection('users')" class="settings-nav-btn" data-section="users">
                            <i class="fas fa-users"></i> Kullanıcılar
                        </button>
                        <button onclick="SettingsNavigation.showSection('audit')" class="settings-nav-btn" data-section="audit">
                            <i class="fas fa-history"></i> Denetim
                        </button>
                        <button onclick="SettingsNavigation.showSection('advanced')" class="settings-nav-btn" data-section="advanced">
                            <i class="fas fa-tools"></i> Gelişmiş
                        </button>
                    </nav>
                </div>
                
                <!-- Content -->
                <div id="settingsContent">
                    <!-- Content will be loaded by section -->
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    SettingsNavigation.showSection('general');
}

class SettingsNavigation {
    static showSection(sectionName) {
        // Update active nav button
        document.querySelectorAll('.settings-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        // Load section content
        const contentEl = document.getElementById('settingsContent');
        switch(sectionName) {
            case 'general':
                contentEl.innerHTML = this.getGeneralSettings();
                break;
            case 'printer':
                contentEl.innerHTML = this.getPrinterSettings();
                break;
            case 'backup':
                contentEl.innerHTML = this.getBackupSettings();
                break;
            case 'users':
                contentEl.innerHTML = this.getUserSettings();
                break;
            case 'audit':
                contentEl.innerHTML = this.getAuditSettings();
                break;
            case 'advanced':
                contentEl.innerHTML = this.getAdvancedSettings();
                break;
        }
    }
    
    static getGeneralSettings() {
        return `
            <h3>Genel Ayarlar</h3>
            ${getGeneralSettingsHTML()}
        `;
    }
    
    static getPrinterSettings() {
        return `
            <h3>Yazıcı Ayarları</h3>
            ${getPrinterSettingsHTML()}
        `;
    }
    
    static getBackupSettings() {
        return `
            <h3>Yedekleme ve Geri Yükleme</h3>
            <div style="display: grid; gap: 1rem;">
                <div>
                    <button onclick="BackupManager.downloadBackup()" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-download"></i> Tam Yedek İndir
                    </button>
                </div>
                <div>
                    <input type="file" id="restoreFileInput" accept=".json" style="width: 100%; margin-bottom: 10px; padding: 8px;">
                    <button onclick="BackupManager.handleFileUpload()" class="btn btn-warning" style="width: 100%;">
                        <i class="fas fa-upload"></i> Yedek Geri Yükle
                    </button>
                </div>
                <div>
                    <button onclick="BackupManager.showBackupManager()" class="btn btn-info" style="width: 100%;">
                        <i class="fas fa-cog"></i> Yedekleme Yöneticisi
                    </button>
                </div>
            </div>
        `;
    }
    
    static getUserSettings() {
        return `
            <h3>Kullanıcı Yönetimi</h3>
            <div style="display: grid; gap: 1rem;">
                <div>
                    <button onclick="UserManager.showUserManagement()" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-users"></i> Kullanıcıları Yönet
                    </button>
                </div>
                <div style="background: #f5f5f5; padding: 1rem; border-radius: 5px;">
                    <h4>Mevcut Kullanıcı</h4>
                    <p><strong>E-posta:</strong> ${currentUser?.email || 'N/A'}</p>
                    <p><strong>Rol:</strong> ${UserManager.getRoleLabel(localStorage.getItem('proclean_user_role') || 'operator')}</p>
                </div>
            </div>
        `;
    }
    
    static getAuditSettings() {
        return `
            <h3>Denetim Kayıtları</h3>
            <div style="display: grid; gap: 1rem;">
                <div>
                    <button onclick="AuditLogger.showAuditLogs()" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-history"></i> Denetim Kayıtlarını Görüntüle
                    </button>
                </div>
                <div>
                    <button onclick="AuditLogger.exportAuditLogs()" class="btn btn-success" style="width: 100%;">
                        <i class="fas fa-download"></i> Denetim Kayıtlarını İndir
                    </button>
                </div>
                <div>
                    <button onclick="AuditLogger.clearAuditLogs()" class="btn btn-danger" style="width: 100%;">
                        <i class="fas fa-trash"></i> Denetim Kayıtlarını Temizle
                    </button>
                </div>
            </div>
        `;
    }
    
    static getAdvancedSettings() {
        return `
            <h3>Gelişmiş Ayarlar</h3>
            <div style="display: grid; gap: 1rem;">
                <div class="settings-option">
                    <label for="debugModeToggle">Hata Ayıklama Modu</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="debugModeToggle" onchange="toggleDebugMode()">
                        <label for="debugModeToggle" class="toggle-slider"></label>
                    </div>
                </div>
                
                <div class="settings-option">
                    <label for="performanceModeToggle">Performans Modu</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="performanceModeToggle" onchange="togglePerformanceMode()">
                        <label for="performanceModeToggle" class="toggle-slider"></label>
                    </div>
                </div>
                
                <div>
                    <button onclick="runPerformanceTest()" class="btn btn-secondary" style="width: 100%;">
                        <i class="fas fa-tachometer-alt"></i> Performans Testi Çalıştır
                    </button>
                </div>
                
                <div>
                    <button onclick="showConsoleLogs()" class="btn btn-secondary" style="width: 100%;">
                        <i class="fas fa-terminal"></i> Konsol Loglarını Görüntüle
                    </button>
                </div>
            </div>
        `;
    }
}

// Replace the original showSettingsModal function
function showSettingsModal() {
    showEnhancedSettingsModal();
}




// Manual upload function
async function manualUploadToSupabase() {
    try {
        showAlert('Supabase yükleniyor...', 'info');
        
        const files = ExcelJS.getAllFiles();
        let uploadedCount = 0;
        
        for (const file of files) {
            const success = await ExcelJS.uploadToSupabase(file.data, file.date);
            if (success) uploadedCount++;
        }
        
        showAlert(`${uploadedCount} dosya Supabase'e yüklendi`, 'success');
        
    } catch (error) {
        console.error('Manual upload error:', error);
        showAlert('Yükleme hatası: ' + error.message, 'error');
    }
}





// Complete stock editing implementation
let currentEditingStockItem = null;

function editStockItem(stockCode) {
    // Prevent multiple edits
    if (currentEditingStockItem && currentEditingStockItem !== stockCode) {
        showAlert('Önce mevcut düzenlemeyi tamamlayın', 'warning');
        return;
    }

    const row = document.querySelector(`tr:has(td:first-child:contains("${stockCode}"))`);
    if (!row) {
        showAlert('Stok öğesi bulunamadı', 'error');
        return;
    }

    const quantityCell = row.cells[2]; // 3rd column for quantity
    const actionsCell = row.cells[6]; // 7th column for actions
    
    const currentQuantity = parseInt(quantityCell.textContent) || 0;
    
    // Create edit interface
    quantityCell.innerHTML = `
        <input type="number" 
               class="stock-edit-input" 
               value="${currentQuantity}" 
               min="0" 
               style="width: 80px; padding: 4px;"
               onkeypress="handleStockEditKeypress(event, '${stockCode}')">
    `;
    
    actionsCell.innerHTML = `
        <button onclick="saveStockItem('${stockCode}')" class="btn btn-success btn-sm">
            <i class="fas fa-check"></i> Kaydet
        </button>
        <button onclick="cancelStockEdit('${stockCode}', ${currentQuantity})" class="btn btn-secondary btn-sm">
            <i class="fas fa-times"></i> İptal
        </button>
    `;
    
    currentEditingStockItem = stockCode;
    
    // Focus the input
    const input = quantityCell.querySelector('.stock-edit-input');
    if (input) {
        input.focus();
        input.select();
    }
}

function handleStockEditKeypress(event, stockCode) {
    if (event.key === 'Enter') {
        saveStockItem(stockCode);
    } else if (event.key === 'Escape') {
        const row = document.querySelector(`tr:has(td:first-child:contains("${stockCode}"))`);
        const currentQuantity = parseInt(row.cells[2].textContent) || 0;
        cancelStockEdit(stockCode, currentQuantity);
    }
}

async function saveStockItem(stockCode) {
    const row = document.querySelector(`tr:has(td:first-child:contains("${stockCode}"))`);
    if (!row) {
        showAlert('Stok öğesi bulunamadı', 'error');
        return;
    }

    const input = row.querySelector('.stock-edit-input');
    if (!input) {
        showAlert('Düzenleme arayüzü bulunamadı', 'error');
        return;
    }

    const newQuantity = parseInt(input.value);
    if (isNaN(newQuantity) || newQuantity < 0) {
        showAlert('Geçerli bir miktar girin (0 veya üzeri)', 'error');
        input.focus();
        return;
    }

    try {
        showAlert('Stok güncelleniyor...', 'info');
        
        // Update in Supabase if online
        if (supabase && navigator.onLine && !isUsingExcel) {
            const { error } = await supabase
                .from('stock_items')
                .update({ 
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('code', stockCode);

            if (error) throw error;
        } else {
            // Save to offline queue
            saveOfflineData('stockUpdates', {
                code: stockCode,
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            });
        }

        // Update UI
        const quantityCell = row.cells[2];
        const statusCell = row.cells[4];
        const lastUpdateCell = row.cells[5];
        const actionsCell = row.cells[6];

        quantityCell.textContent = newQuantity;
        lastUpdateCell.textContent = new Date().toLocaleDateString('tr-TR');
        
        // Update status
        let statusClass = 'status-stokta';
        let statusText = 'Stokta';
        
        if (newQuantity <= 0) {
            statusClass = 'status-kritik';
            statusText = 'Tükendi';
        } else if (newQuantity < 10) {
            statusClass = 'status-az-stok';
            statusText = 'Az Stok';
        } else if (newQuantity < 50) {
            statusClass = 'status-uyari';
            statusText = 'Düşük';
        }
        
        statusCell.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
        
        // Restore edit button
        actionsCell.innerHTML = `
            <button onclick="editStockItem('${stockCode}')" class="btn btn-primary btn-sm">
                <i class="fas fa-edit"></i> Düzenle
            </button>
        `;

        currentEditingStockItem = null;
        showAlert(`Stok güncellendi: ${stockCode} - ${newQuantity} adet`, 'success');

    } catch (error) {
        console.error('Stock update error:', error);
        showAlert('Stok güncellenirken hata oluştu: ' + error.message, 'error');
    }
}

function cancelStockEdit(stockCode, originalQuantity) {
    const row = document.querySelector(`tr:has(td:first-child:contains("${stockCode}"))`);
    if (!row) return;

    const quantityCell = row.cells[2];
    const actionsCell = row.cells[6];

    quantityCell.textContent = originalQuantity;
    
    actionsCell.innerHTML = `
        <button onclick="editStockItem('${stockCode}')" class="btn btn-primary btn-sm">
            <i class="fas fa-edit"></i> Düzenle
        </button>
    `;

    currentEditingStockItem = null;
}





// Performance optimization utilities
class PerformanceOptimizer {
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static createVirtualScroll(container, items, renderItem, itemHeight = 50, buffer = 5) {
        let visibleStart = 0;
        let visibleEnd = 0;
        
        function updateVisibleItems() {
            const scrollTop = container.scrollTop;
            const visibleHeight = container.clientHeight;
            
            visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            visibleEnd = Math.min(items.length, Math.ceil((scrollTop + visibleHeight) / itemHeight) + buffer);
            
            const visibleItems = items.slice(visibleStart, visibleEnd);
            const offset = visibleStart * itemHeight;
            
            container.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.style.height = `${items.length * itemHeight}px`;
            wrapper.style.position = 'relative';
            
            visibleItems.forEach((item, index) => {
                const element = renderItem(item, visibleStart + index);
                element.style.position = 'absolute';
                element.style.top = `${(visibleStart + index) * itemHeight}px`;
                element.style.width = '100%';
                wrapper.appendChild(element);
            });
            
            container.appendChild(wrapper);
        }
        
        container.addEventListener('scroll', PerformanceOptimizer.throttle(updateVisibleItems, 16));
        updateVisibleItems();
        
        return {
            updateItems: (newItems) => {
                items = newItems;
                updateVisibleItems();
            }
        };
    }
}

// Enhanced table population with debouncing and incremental updates
let tableUpdateQueue = new Set();
let tableUpdateTimeout = null;

async function queueTableUpdate(tableType, force = false) {
    tableUpdateQueue.add(tableType);
    
    if (force) {
        await executeTableUpdates();
    } else {
        clearTimeout(tableUpdateTimeout);
        tableUpdateTimeout = setTimeout(executeTableUpdates, 300);
    }
}

async function executeTableUpdates() {
    if (tableUpdateQueue.size === 0) return;
    
    const updates = Array.from(tableUpdateQueue);
    tableUpdateQueue.clear();
    
    showLoadingState(updates);
    
    try {
        // Batch updates
        if (updates.includes('packages')) {
            await populatePackagesTable();
        }
        if (updates.includes('shipping')) {
            await populateShippingTable();
        }
        if (updates.includes('stock')) {
            await populateStockTable();
        }
        if (updates.includes('reports')) {
            await populateReportsTable();
        }
        
        hideLoadingState();
    } catch (error) {
        ErrorHandler.handle(error, 'Tablo güncelleme');
        hideLoadingState();
    }
}

function showLoadingState(updates) {
    updates.forEach(update => {
        const container = document.getElementById(`${update}Tab`);
        if (container) {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'loading-overlay';
            loadingEl.id = `${update}Loading`;
            loadingEl.innerHTML = '<div class="spinner"></div><p>Yükleniyor...</p>';
            loadingEl.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10;
            `;
            container.style.position = 'relative';
            container.appendChild(loadingEl);
        }
    });
}

function hideLoadingState() {
    document.querySelectorAll('.loading-overlay').forEach(el => el.remove());
}

// Enhanced search with debouncing
const debouncedSearchStock = PerformanceOptimizer.debounce(searchStock, 300);
const debouncedSearchContainers = PerformanceOptimizer.debounce(searchContainers, 300);

// Update search functions to use debounced versions
function setupDebouncedSearch() {
    const stockSearch = document.getElementById('stockSearch');
    const containerSearch = document.getElementById('containerSearch');
    
    if (stockSearch) {
        stockSearch.addEventListener('input', (e) => {
            debouncedSearchStock();
        });
    }
    
    if (containerSearch) {
        containerSearch.addEventListener('input', (e) => {
            debouncedSearchContainers();
        });
    }
}

// Memory leak prevention
function cleanupEventListeners() {
    // Store references to cleanup functions
    if (!window._procleanListeners) {
        window._procleanListeners = new Map();
    }
}

function addSafeEventListener(element, event, handler, options = {}) {
    if (!window._procleanListeners) {
        window._procleanListeners = new Map();
    }
    
    const key = `${element.id}-${event}`;
    element.addEventListener(event, handler, options);
    
    window._procleanListeners.set(key, {
        element,
        event,
        handler,
        options
    });
}

function removeAllEventListeners() {
    if (window._procleanListeners) {
        window._procleanListeners.forEach((listener, key) => {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
        });
        window._procleanListeners.clear();
    }
}

// Call this when switching tabs or closing modals
function cleanupTabListeners(tabName) {
    if (window._procleanListeners) {
        const listenersToRemove = [];
        window._procleanListeners.forEach((listener, key) => {
            if (key.includes(tabName)) {
                listener.element.removeEventListener(listener.event, listener.handler, listener.options);
                listenersToRemove.push(key);
            }
        });
        listenersToRemove.forEach(key => window._procleanListeners.delete(key));
    }
}




// Enhanced UX features
class UXEnhancements {
    static showLoading(message = 'Yükleniyor...') {
        const loadingId = 'global-loading';
        let loadingEl = document.getElementById(loadingId);
        
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = loadingId;
            loadingEl.className = 'global-loading';
            loadingEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px 30px;
                border-radius: 8px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            document.body.appendChild(loadingEl);
        }
        
        loadingEl.innerHTML = `
            <div class="spinner" style="
                width: 20px;
                height: 20px;
                border: 2px solid transparent;
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span>${message}</span>
        `;
        loadingEl.style.display = 'flex';
        
        return loadingId;
    }
    
    static hideLoading(loadingId = 'global-loading') {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
    
    static showUndoAction(message, undoCallback, timeout = 5000) {
        const undoId = 'undo-notification';
        let undoEl = document.getElementById(undoId);
        
        if (!undoEl) {
            undoEl = document.createElement('div');
            undoEl.id = undoId;
            undoEl.className = 'undo-notification';
            undoEl.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(undoEl);
        }
        
        undoEl.innerHTML = `
            <span>${message}</span>
            <button onclick="UXEnhancements.executeUndo()" 
                    style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                Geri Al
            </button>
            <button onclick="UXEnhancements.hideUndo()" 
                    style="background: transparent; color: #ccc; border: none; cursor: pointer; padding: 4px;">
                ×
            </button>
        `;
        undoEl.style.display = 'flex';
        
        // Store undo callback globally
        window._pendingUndo = undoCallback;
        
        // Auto hide after timeout
        setTimeout(() => {
            if (document.getElementById(undoId)?.style.display === 'flex') {
                UXEnhancements.hideUndo();
            }
        }, timeout);
        
        return undoId;
    }
    
    static executeUndo() {
        if (window._pendingUndo) {
            window._pendingUndo();
            window._pendingUndo = null;
        }
        this.hideUndo();
    }
    
    static hideUndo() {
        const undoEl = document.getElementById('undo-notification');
        if (undoEl) {
            undoEl.style.display = 'none';
            window._pendingUndo = null;
        }
    }
    
    static setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveAppState();
                showAlert('Durum kaydedildi', 'success');
            }
            
            // Escape: Close modals
            if (e.key === 'Escape') {
                closeAllModals();
                UXEnhancements.hideUndo();
            }
            
            // Tab navigation in modals
            if (e.key === 'Tab' && e.target.closest('.modal-content')) {
                const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
                const modal = e.target.closest('.modal-content');
                const focusable = Array.from(modal.querySelectorAll(focusableElements));
                const firstElement = focusable[0];
                const lastElement = focusable[focusable.length - 1];
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }
    
    static showConfirmation(message, confirmCallback, cancelCallback = null) {
        return new Promise((resolve) => {
            const confirmationId = 'custom-confirmation';
            let confirmEl = document.getElementById(confirmationId);
            
            if (!confirmEl) {
                confirmEl = document.createElement('div');
                confirmEl.id = confirmationId;
                confirmEl.className = 'custom-confirmation';
                confirmEl.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                `;
                document.body.appendChild(confirmEl);
            }
            
            confirmEl.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
                    <h3 style="margin-top: 0;">Onay</h3>
                    <p>${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1.5rem;">
                        <button onclick="UXEnhancements.handleConfirmation(true)" 
                                style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Evet
                        </button>
                        <button onclick="UXEnhancements.handleConfirmation(false)" 
                                style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Hayır
                        </button>
                    </div>
                </div>
            `;
            confirmEl.style.display = 'flex';
            
            // Store callbacks
            window._confirmationCallbacks = {
                confirm: confirmCallback,
                cancel: cancelCallback,
                resolve: resolve
            };
        });
    }
    
    static handleConfirmation(confirmed) {
        const confirmEl = document.getElementById('custom-confirmation');
        if (confirmEl) {
            confirmEl.style.display = 'none';
        }
        
        if (window._confirmationCallbacks) {
            if (confirmed && window._confirmationCallbacks.confirm) {
                window._confirmationCallbacks.confirm();
            } else if (!confirmed && window._confirmationCallbacks.cancel) {
                window._confirmationCallbacks.cancel();
            }
            window._confirmationCallbacks.resolve(confirmed);
            window._confirmationCallbacks = null;
        }
    }
}

// Enhanced delete functions with undo support
async function deleteSelectedPackagesWithUndo() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    const packageIds = Array.from(checkboxes).map(cb => cb.value);
    const packageData = [];
    
    // Store package data for undo
    checkboxes.forEach(cb => {
        const packageDataStr = cb.getAttribute('data-package');
        if (packageDataStr) {
            packageData.push(JSON.parse(packageDataStr.replace(/&quot;/g, '"')));
        }
    });

    const confirmed = await UXEnhancements.showConfirmation(
        `${packageIds.length} paketi silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    try {
        // Store original data for undo
        const originalData = [...packageData];
        
        // Perform deletion
        await deleteSelectedPackages();
        
        // Show undo option
        UXEnhancements.showUndoAction(
            `${packageIds.length} paket silindi`,
            async () => {
                await restorePackages(originalData);
            },
            10000
        );
    } catch (error) {
        ErrorHandler.handle(error, 'Paket silme');
    }
}

async function restorePackages(packagesData) {
    try {
        UXEnhancements.showLoading('Paketler geri yükleniyor...');
        
        for (const pkg of packagesData) {
            if (supabase && navigator.onLine && !isUsingExcel) {
                const { error } = await supabase
                    .from('packages')
                    .insert([pkg]);
                    
                if (error) {
                    // If Supabase fails, save to Excel
                    await saveToExcel(pkg);
                    addToSyncQueue('add', pkg);
                }
            } else {
                await saveToExcel(pkg);
                addToSyncQueue('add', pkg);
            }
        }
        
        await populatePackagesTable();
        UXEnhancements.hideLoading();
        showAlert(`${packagesData.length} paket geri yüklendi`, 'success');
    } catch (error) {
        UXEnhancements.hideLoading();
        ErrorHandler.handle(error, 'Paketleri geri yükleme');
    }
}

// Replace original delete function calls with undo versions
function setupEnhancedDeletions() {
    // Replace onclick handlers in HTML or add event listeners
    const deleteButtons = document.querySelectorAll('[onclick*="deleteSelectedPackages"]');
    deleteButtons.forEach(btn => {
        btn.setAttribute('onclick', 'deleteSelectedPackagesWithUndo()');
    });
}





// Advanced search and filtering system
class AdvancedSearch {
    static init() {
        this.setupPackageSearch();
        this.setupShippingSearch();
        this.setupStockSearch();
    }
    
    static setupPackageSearch() {
        const searchHTML = `
            <div class="advanced-search-panel" style="margin: 10px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <h4 style="margin-top: 0;">Gelişmiş Paket Arama</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <label>Müşteri</label>
                        <input type="text" id="packageCustomerSearch" placeholder="Müşteri ara..." 
                               style="width: 100%; padding: 5px;">
                    </div>
                    <div>
                        <label>Paket No</label>
                        <input type="text" id="packageNoSearch" placeholder="Paket no ara..." 
                               style="width: 100%; padding: 5px;">
                    </div>
                    <div>
                        <label>Durum</label>
                        <select id="packageStatusSearch" style="width: 100%; padding: 5px;">
                            <option value="">Tümü</option>
                            <option value="beklemede">Beklemede</option>
                            <option value="sevk-edildi">Sevk Edildi</option>
                        </select>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="AdvancedSearch.searchPackages()" class="btn btn-primary">
                        <i class="fas fa-search"></i> Ara
                    </button>
                    <button onclick="AdvancedSearch.clearPackageSearch()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Temizle
                    </button>
                    <button onclick="AdvancedSearch.exportPackageResults()" class="btn btn-success">
                        <i class="fas fa-download"></i> Dışa Aktar
                    </button>
                </div>
            </div>
        `;
        
        const packagesTab = document.getElementById('packagingTab');
        const pendingPackages = packagesTab.querySelector('.pending-packages');
        if (pendingPackages) {
            pendingPackages.insertAdjacentHTML('beforebegin', searchHTML);
        }
    }
    
    static async searchPackages() {
        const customerFilter = document.getElementById('packageCustomerSearch').value.toLowerCase();
        const packageNoFilter = document.getElementById('packageNoSearch').value.toLowerCase();
        const statusFilter = document.getElementById('packageStatusSearch').value;
        
        const rows = document.querySelectorAll('#packagesTableBody tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const customer = row.cells[2].textContent.toLowerCase();
            const packageNo = row.cells[1].textContent.toLowerCase();
            const status = row.cells[5].textContent.toLowerCase();
            
            const customerMatch = !customerFilter || customer.includes(customerFilter);
            const packageNoMatch = !packageNoFilter || packageNo.includes(packageNoFilter);
            const statusMatch = !statusFilter || status.includes(statusFilter);
            
            if (customerMatch && packageNoMatch && statusMatch) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        showAlert(`${visibleCount} paket bulundu`, 'info');
    }
    
    static clearPackageSearch() {
        document.getElementById('packageCustomerSearch').value = '';
        document.getElementById('packageNoSearch').value = '';
        document.getElementById('packageStatusSearch').value = '';
        
        const rows = document.querySelectorAll('#packagesTableBody tr');
        rows.forEach(row => row.style.display = '');
        
        showAlert('Arama temizlendi', 'info');
    }
    
    static async exportPackageResults() {
        const visibleRows = Array.from(document.querySelectorAll('#packagesTableBody tr'))
            .filter(row => row.style.display !== 'none');
            
        if (visibleRows.length === 0) {
            showAlert('Dışa aktarılacak veri yok', 'warning');
            return;
        }
        
        const data = visibleRows.map(row => ({
            package_no: row.cells[1].textContent,
            customer: row.cells[2].textContent,
            product: row.cells[3].textContent,
            quantity: row.cells[4].textContent,
            date: row.cells[5].textContent,
            status: row.cells[6].textContent
        }));
        
        const csv = this.convertToCSV(data);
        this.downloadCSV(csv, 'paket-arama-sonuclari.csv');
        showAlert(`${visibleRows.length} paket dışa aktarıldı`, 'success');
    }
    
    static convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    static downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    static setupShippingSearch() {
        // Similar implementation for shipping search
    }
    
    static setupStockSearch() {
        // Similar implementation for stock search
    }
}




// Bulk operations system
class BulkOperations {
    static init() {
        this.setupBulkPackageActions();
        this.setupBulkStockActions();
    }
    
    static setupBulkPackageActions() {
        const bulkHTML = `
            <div class="bulk-actions-panel" style="margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; display: none;">
                <strong style="margin-right: 15px;">Toplu İşlemler:</strong>
                <button onclick="BulkOperations.bulkUpdateStatus()" class="btn btn-warning btn-sm">
                    <i class="fas fa-exchange-alt"></i> Durum Güncelle
                </button>
                <button onclick="BulkOperations.bulkAssignContainer()" class="btn btn-info btn-sm">
                    <i class="fas fa-box"></i> Konteyner Ata
                </button>
                <button onclick="BulkOperations.bulkExport()" class="btn btn-success btn-sm">
                    <i class="fas fa-file-export"></i> Dışa Aktar
                </button>
                <button onclick="BulkOperations.bulkPrint()" class="btn btn-primary btn-sm">
                    <i class="fas fa-print"></i> Toplu Yazdır
                </button>
                <span id="bulkSelectionCount" style="margin-left: 15px; font-weight: bold;"></span>
                <button onclick="BulkOperations.hideBulkActions()" class="btn btn-secondary btn-sm" style="margin-left: auto;">
                    <i class="fas fa-times"></i> Kapat
                </button>
            </div>
        `;
        
        const packagesTab = document.getElementById('packagingTab');
        const pendingPackages = packagesTab.querySelector('.pending-packages');
        if (pendingPackages) {
            pendingPackages.insertAdjacentHTML('afterbegin', bulkHTML);
        }
        
        // Update selection count when checkboxes change
        document.addEventListener('change', (e) => {
            if (e.target.matches('#packagesTableBody input[type="checkbox"]')) {
                this.updateBulkSelectionCount();
            }
        });
    }
    
    static updateBulkSelectionCount() {
        const selectedCount = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked').length;
        const bulkPanel = document.querySelector('.bulk-actions-panel');
        const countElement = document.getElementById('bulkSelectionCount');
        
        if (selectedCount > 0) {
            bulkPanel.style.display = 'flex';
            bulkPanel.style.alignItems = 'center';
            countElement.textContent = `${selectedCount} öğe seçildi`;
        } else {
            bulkPanel.style.display = 'none';
        }
    }
    
    static hideBulkActions() {
        document.querySelector('.bulk-actions-panel').style.display = 'none';
        document.querySelectorAll('#packagesTableBody input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    }
    
    static async bulkUpdateStatus() {
        const selectedPackages = this.getSelectedPackages();
        if (selectedPackages.length === 0) {
            showAlert('Lütfen paket seçin', 'warning');
            return;
        }
        
        const newStatus = prompt('Yeni durumu girin (beklemede/sevk-edildi):', 'sevk-edildi');
        if (!newStatus) return;
        
        if (!['beklemede', 'sevk-edildi'].includes(newStatus)) {
            showAlert('Geçersiz durum. Sadece "beklemede" veya "sevk-edildi" kullanabilirsiniz.', 'error');
            return;
        }
        
        try {
            UXEnhancements.showLoading('Durum güncelleniyor...');
            
            for (const pkg of selectedPackages) {
                if (supabase && navigator.onLine && !isUsingExcel) {
                    const { error } = await supabase
                        .from('packages')
                        .update({ status: newStatus })
                        .eq('id', pkg.id);
                        
                    if (error) throw error;
                }
                
                // Update local data
                const excelData = await ExcelJS.readFile();
                const updatedData = excelData.map(item => 
                    item.id === pkg.id ? { ...item, status: newStatus } : item
                );
                await ExcelJS.writeFile(ExcelJS.toExcelFormat(updatedData));
            }
            
            await populatePackagesTable();
            UXEnhancements.hideLoading();
            showAlert(`${selectedPackages.length} paketin durumu güncellendi`, 'success');
            
        } catch (error) {
            UXEnhancements.hideLoading();
            ErrorHandler.handle(error, 'Toplu durum güncelleme');
        }
    }
    
    static async bulkAssignContainer() {
        const selectedPackages = this.getSelectedPackages();
        if (selectedPackages.length === 0) {
            showAlert('Lütfen paket seçin', 'warning');
            return;
        }
        
        const containerNo = prompt('Konteyner numarasını girin:');
        if (!containerNo) return;
        
        try {
            UXEnhancements.showLoading('Konteyner atanıyor...');
            
            for (const pkg of selectedPackages) {
                if (supabase && navigator.onLine && !isUsingExcel) {
                    const { error } = await supabase
                        .from('packages')
                        .update({ 
                            container_id: containerNo,
                            status: 'sevk-edildi'
                        })
                        .eq('id', pkg.id);
                        
                    if (error) throw error;
                }
                
                // Update local data
                const excelData = await ExcelJS.readFile();
                const updatedData = excelData.map(item => 
                    item.id === pkg.id ? { 
                        ...item, 
                        container_id: containerNo,
                        status: 'sevk-edildi'
                    } : item
                );
                await ExcelJS.writeFile(ExcelJS.toExcelFormat(updatedData));
            }
            
            await populatePackagesTable();
            UXEnhancements.hideLoading();
            showAlert(`${selectedPackages.length} paket konteynere atandı`, 'success');
            
        } catch (error) {
            UXEnhancements.hideLoading();
            ErrorHandler.handle(error, 'Toplu konteyner atama');
        }
    }
    
    static async bulkExport() {
        const selectedPackages = this.getSelectedPackages();
        if (selectedPackages.length === 0) {
            showAlert('Lütfen paket seçin', 'warning');
            return;
        }
        
        const csv = AdvancedSearch.convertToCSV(selectedPackages);
        AdvancedSearch.downloadCSV(csv, `toplu-paketler-${new Date().toISOString().split('T')[0]}.csv`);
        showAlert(`${selectedPackages.length} paket dışa aktarıldı`, 'success');
    }
    
    static async bulkPrint() {
        const selectedPackages = this.getSelectedPackages();
        if (selectedPackages.length === 0) {
            showAlert('Lütfen paket seçin', 'warning');
            return;
        }
        
        try {
            UXEnhancements.showLoading('Etiketler yazdırılıyor...');
            
            for (const pkg of selectedPackages) {
                await printPackageWithSettings(pkg);
                // Small delay to prevent printer overload
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            UXEnhancements.hideLoading();
            showAlert(`${selectedPackages.length} etiket yazdırma işlemi başlatıldı`, 'success');
            
        } catch (error) {
            UXEnhancements.hideLoading();
            ErrorHandler.handle(error, 'Toplu yazdırma');
        }
    }
    
    static getSelectedPackages() {
        const selectedPackages = [];
        document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked').forEach(checkbox => {
            const packageDataStr = checkbox.getAttribute('data-package');
            if (packageDataStr) {
                selectedPackages.push(JSON.parse(packageDataStr.replace(/&quot;/g, '"')));
            }
        });
        return selectedPackages;
    }
}



// Enhanced backup and restore system
class BackupManager {
    static async createBackup(includeSettings = true, includeAuditLogs = true) {
        try {
            UXEnhancements.showLoading('Yedek oluşturuluyor...');

            const backup = {
                metadata: {
                    version: '2.0.0',
                    created: new Date().toISOString(),
                    createdBy: currentUser?.email || 'unknown',
                    workspace: window.workspaceManager?.currentWorkspace?.name || 'default'
                },
                data: {}
            };

            // Backup packages
            const packages = await ExcelJS.readFile();
            backup.data.packages = packages;

            // Backup settings
            if (includeSettings) {
                backup.data.settings = {
                    appSettings: JSON.parse(localStorage.getItem('procleanSettings') || '{}'),
                    apiKey: localStorage.getItem('procleanApiKey'),
                    appState: JSON.parse(localStorage.getItem('procleanState') || '{}')
                };
            }

            // Backup audit logs
            if (includeAuditLogs) {
                backup.data.auditLogs = JSON.parse(localStorage.getItem('proclean_audit_logs') || '[]');
            }

            // Backup sync queue
            backup.data.syncQueue = JSON.parse(localStorage.getItem('excelSyncQueue') || '[]');

            // Backup workspace configuration
            backup.data.workspace = {
                current: window.workspaceManager?.currentWorkspace,
                all: window.workspaceManager?.availableWorkspaces || []
            };

            UXEnhancements.hideLoading();
            return backup;

        } catch (error) {
            UXEnhancements.hideLoading();
            ErrorHandler.handle(error, 'Yedek oluşturma');
            return null;
        }
    }

    static async downloadBackup() {
        const backup = await this.createBackup(true, true);
        if (!backup) return;

        const backupStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `proclean-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert('Yedek başarıyla indirildi', 'success');
        
        // Log the backup operation
        AuditLogger.log('backup_created', {
            items: backup.data.packages.length,
            includeSettings: true,
            includeAuditLogs: true
        });
    }

    static async restoreBackup(file) {
        try {
            if (!file) {
                showAlert('Lütfen bir yedek dosyası seçin', 'error');
                return;
            }

            const confirmed = await UXEnhancements.showConfirmation(
                'Yedek yüklenecek. Mevcut verilerin üzerine yazılacak. Devam etmek istiyor musunuz?'
            );

            if (!confirmed) return;

            UXEnhancements.showLoading('Yedek yükleniyor...');

            const fileText = await this.readFileAsText(file);
            const backup = JSON.parse(fileText);

            // Validate backup structure
            if (!this.validateBackup(backup)) {
                throw new Error('Geçersiz yedek dosyası formatı');
            }

            // Restore packages
            if (backup.data.packages) {
                await ExcelJS.writeFile(ExcelJS.toExcelFormat(backup.data.packages));
                excelPackages = backup.data.packages;
            }

            // Restore settings
            if (backup.data.settings) {
                if (backup.data.settings.appSettings) {
                    localStorage.setItem('procleanSettings', JSON.stringify(backup.data.settings.appSettings));
                }
                if (backup.data.settings.apiKey) {
                    localStorage.setItem('procleanApiKey', backup.data.settings.apiKey);
                }
                if (backup.data.settings.appState) {
                    localStorage.setItem('procleanState', JSON.stringify(backup.data.settings.appState));
                }
            }

            // Restore audit logs
            if (backup.data.auditLogs) {
                localStorage.setItem('proclean_audit_logs', JSON.stringify(backup.data.auditLogs));
            }

            // Restore sync queue
            if (backup.data.syncQueue) {
                localStorage.setItem('excelSyncQueue', JSON.stringify(backup.data.syncQueue));
            }

            // Restore workspace configuration
            if (backup.data.workspace) {
                localStorage.setItem('proclean_workspaces', JSON.stringify(backup.data.workspace.all));
                if (backup.data.workspace.current) {
                    localStorage.setItem('proclean_current_workspace', backup.data.workspace.current.id);
                }
            }

            // Reload application
            await this.reloadApplication();

            UXEnhancements.hideLoading();
            showAlert('Yedek başarıyla yüklendi', 'success');

            // Log the restore operation
            AuditLogger.log('backup_restored', {
                backupDate: backup.metadata.created,
                items: backup.data.packages?.length || 0
            });

        } catch (error) {
            UXEnhancements.hideLoading();
            ErrorHandler.handle(error, 'Yedek yükleme');
        }
    }

    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    static validateBackup(backup) {
        return backup && 
               backup.metadata && 
               backup.metadata.version && 
               backup.data;
    }

    static async reloadApplication() {
        // Reload all data
        await loadPackagesData();
        await populateStockTable();
        await populateShippingTable();
        
        // Reload settings
        loadAllSettings();
        
        // Reinitialize workspace
        if (window.workspaceManager) {
            await window.workspaceManager.initialize();
        }
    }

    static showBackupManager() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
            align-items: center; z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 600px; width: 90%;">
                <h2 style="margin-top: 0;">Yedekleme ve Geri Yükleme</h2>
                
                <div style="margin-bottom: 2rem;">
                    <h3>Yedek Oluştur</h3>
                    <p>Tüm verilerinizi yedekleyin:</p>
                    <button onclick="BackupManager.downloadBackup()" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                        <i class="fas fa-download"></i> Tam Yedek İndir
                    </button>
                    <small style="color: #666;">Paketler, ayarlar, denetim kayıtları ve senkronizasyon kuyruğu</small>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <h3>Geri Yükle</h3>
                    <p>Önceden oluşturulmuş bir yedeği yükleyin:</p>
                    <input type="file" id="backupFileInput" accept=".json" style="width: 100%; margin-bottom: 10px; padding: 8px;">
                    <button onclick="BackupManager.handleFileUpload()" class="btn btn-warning" style="width: 100%;">
                        <i class="fas fa-upload"></i> Yedek Yükle
                    </button>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <h3>Veri İstatistikleri</h3>
                    <div id="backupStats" style="background: #f5f5f5; padding: 1rem; border-radius: 5px;">
                        <!-- Stats will be populated by JavaScript -->
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="BackupManager.showAuditLogs()" class="btn btn-info">
                        <i class="fas fa-history"></i> Denetim Kayıtları
                    </button>
                    <button onclick="this.closest('.modal').remove()" class="btn btn-secondary" style="margin-left: auto;">
                        Kapat
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.updateBackupStats();
    }

    static async updateBackupStats() {
        const stats = {
            packages: excelPackages.length,
            settings: localStorage.getItem('procleanSettings') ? 1 : 0,
            auditLogs: JSON.parse(localStorage.getItem('proclean_audit_logs') || '[]').length,
            syncQueue: JSON.parse(localStorage.getItem('excelSyncQueue') || '[]').length,
            lastBackup: this.getLastBackupDate()
        };

        const statsHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>Paketler: <strong>${stats.packages}</strong></div>
                <div>Ayarlar: <strong>${stats.settings ? 'Mevcut' : 'Yok'}</strong></div>
                <div>Denetim Kayıtları: <strong>${stats.auditLogs}</strong></div>
                <div>Senkronizasyon Bekleyen: <strong>${stats.syncQueue}</strong></div>
                <div colspan="2">Son Yedek: <strong>${stats.lastBackup}</strong></div>
            </div>
        `;

        const statsEl = document.getElementById('backupStats');
        if (statsEl) {
            statsEl.innerHTML = statsHtml;
        }
    }

    static getLastBackupDate() {
        // This would ideally come from a stored value
        return 'Hiç yedek alınmamış';
    }

    static handleFileUpload() {
        const fileInput = document.getElementById('backupFileInput');
        if (fileInput.files.length > 0) {
            this.restoreBackup(fileInput.files[0]);
        } else {
            showAlert('Lütfen bir dosya seçin', 'error');
        }
    }
}






// Enhanced reports tab with daily file management
function setupDailyReports() {
    const reportsTab = document.getElementById('reportsTab');
    if (!reportsTab) return;

    reportsTab.innerHTML = `
        <div class="reports-container">
            <h3>📊 Günlük Raporlar ve Excel Dosyaları</h3>
            
            <div class="reports-controls" style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <h4>Günlük İşlemler</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <button onclick="exportTodaysReport()" class="btn btn-success">
                        <i class="fas fa-file-excel"></i> Bugünün Raporunu İndir
                    </button>
                    <button onclick="showDailyFilesManager()" class="btn btn-primary">
                        <i class="fas fa-history"></i> Geçmiş Dosyaları Yönet
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="startNewDayManually()" class="btn btn-warning">
                        <i class="fas fa-calendar-day"></i> Yeni Gün Başlat
                    </button>
                    <button onclick="cleanupOldFiles()" class="btn btn-info">
                        <i class="fas fa-broom"></i> Eski Dosyaları Temizle
                    </button>
                </div>
            </div>

            <div id="dailyFilesList" style="margin-top: 20px;">
                <!-- Daily files will be listed here -->
            </div>
        </div>
    `;

    loadDailyFilesList();
}

// Load and display daily files
function loadDailyFilesList() {
    const filesList = document.getElementById('dailyFilesList');
    if (!filesList) return;

    const files = ExcelJS.getAllDailyFiles();
    
    if (files.length === 0) {
        filesList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-file-excel" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h4>Henüz kayıtlı günlük dosya bulunmuyor</h4>
                <p>Günlük raporlar otomatik olarak oluşturulacaktır.</p>
            </div>
        `;
        return;
    }

    let filesHTML = `
        <h4>📁 Kayıtlı Günlük Dosyalar (Son ${files.length} gün)</h4>
        <div class="files-grid" style="display: grid; gap: 10px; margin-top: 15px;">
    `;

    files.forEach(file => {
        const isToday = file.date === ExcelJS.getTodayDateString();
        
        filesHTML += `
            <div class="file-item" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: ${isToday ? '#e8f5e8' : 'white'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h5 style="margin: 0; color: ${isToday ? '#2e7d32' : '#333'};">
                            ${isToday ? '🎯 ' : ''}${file.date}
                            ${isToday ? '<small>(Bugün)</small>' : ''}
                        </h5>
                        <p style="margin: 5px 0; color: #666;">
                            <strong>${file.packageCount}</strong> paket, 
                            <strong>${file.totalQuantity}</strong> toplam adet
                        </p>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="ExcelJS.exportDailyFile('${file.date}')" 
                                class="btn btn-success btn-sm" title="Excel İndir">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="viewDailyFile('${file.date}')" 
                                class="btn btn-primary btn-sm" title="Detayları Gör">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!isToday ? `
                        <button onclick="deleteDailyFile('${file.date}')" 
                                class="btn btn-danger btn-sm" title="Dosyayı Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    filesHTML += '</div>';
    filesList.innerHTML = filesHTML;
}

// Export today's report
function exportTodaysReport() {
    ExcelJS.exportDailyFile(ExcelJS.getTodayDateString());
}

// Start new day manually
function startNewDayManually() {
    if (confirm('Yeni gün başlatmak istediğinize emin misiniz? Bugünkü veriler kaydedilecek ve yeni bir günlük dosya oluşturulacak.')) {
        ExcelJS.startNewDay();
        showAlert('Yeni gün başlatıldı. Bugünkü veriler kaydedildi.', 'success');
        loadDailyFilesList();
    }
}

// Cleanup old files
function cleanupOldFiles() {
    if (confirm('7 günden eski dosyalar silinecek. Devam etmek istiyor musunuz?')) {
        ExcelJS.cleanupOldFiles();
        showAlert('Eski dosyalar temizlendi. Son 7 günün dosyaları korundu.', 'success');
        loadDailyFilesList();
    }
}

// View daily file details
function viewDailyFile(dateString) {
    const files = ExcelJS.getAllDailyFiles();
    const file = files.find(f => f.date === dateString);
    
    if (!file) {
        showAlert('Dosya bulunamadı', 'error');
        return;
    }

    const packageList = file.data.map(pkg => 
        `• ${pkg.package_no}: ${pkg.customer_name || 'Müşteri Yok'} - ${getProductType(pkg)} (${pkg.total_quantity} adet)`
    ).join('\n');

    alert(`📅 ${dateString} Tarihli Rapor\n\n` +
          `Toplam Paket: ${file.packageCount}\n` +
          `Toplam Adet: ${file.totalQuantity}\n\n` +
          `Paketler:\n${packageList || 'Paket bulunamadı'}`);
}

// Delete daily file
function deleteDailyFile(dateString) {
    if (confirm(`${dateString} tarihli dosyayı silmek istediğinize emin misiniz?`)) {
        localStorage.removeItem(`packages_${dateString}.json`);
        showAlert('Dosya silindi', 'success');
        loadDailyFilesList();
    }
}

// Helper function to get product type
function getProductType(packageData) {
    if (packageData.items && Array.isArray(packageData.items) && packageData.items.length > 0) {
        return packageData.items.map(it => it.name).join(', ');
    } else if (packageData.items && typeof packageData.items === 'object') {
        return Object.keys(packageData.items).join(', ');
    } else if (packageData.product) {
        return packageData.product;
    }
    return 'Ürün Yok';
}

