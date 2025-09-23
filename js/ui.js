// ================== ELEMENT INITIALIZATION ==================
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

// ================== ALERT AND NOTIFICATION SYSTEM ==================
let alertQueue = new Set();

function showAlert(message, type = 'info', duration = 5000) {
    const alertKey = `${message}-${type}`;
    if (alertQueue.has(alertKey)) return;
    
    alertQueue.add(alertKey);
    
    if (!elements.alertContainer) {
        console.log(`${type.toUpperCase()}: ${message}`);
        alertQueue.delete(alertKey);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button class="alert-close">×</button>
    `;
    
    elements.alertContainer.appendChild(alert);
    
    const closeBtn = alert.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alert.classList.add('hide');
        setTimeout(() => {
            alert.remove();
            alertQueue.delete(alertKey);
        }, 300);
    });
    
    if (duration > 0) {
        setTimeout(() => {
            alert.classList.add('hide');
            setTimeout(() => {
                alert.remove();
                alertQueue.delete(alertKey);
            }, 300);
        }, duration);
    }
    
    return alert;
}

function showToast(message, type = 'info') {
    if (!elements.toast) return;
    
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ================== VALIDATION AND UTILITY FUNCTIONS ==================
let validationTimeout = null;

function validateFormDebounced(inputs, callback) {
    if (validationTimeout) clearTimeout(validationTimeout);
    
    validationTimeout = setTimeout(() => {
        const isValid = validateForm(inputs);
        if (callback) callback(isValid);
    }, 200);
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkOnlineStatus() {
    if (!navigator.onLine) {
        showAlert("Çevrimdışı Mod: İnternet yok, bazı işlemler çalışmayacak", "error");
        return false;
    }
    return true;
}

// ================== MODAL MANAGEMENT ==================
function showApiKeyModal() {
    if (!elements.apiKeyInput) return;
    
    elements.apiKeyInput.value = SUPABASE_ANON_KEY || '';
    elements.apiKeyModal.style.display = 'flex';
}

function closeModal() {
    if (elements.apiKeyModal) elements.apiKeyModal.style.display = 'none';
}

function closeAllModals() {
    const modals = ['customerModal', 'allCustomersModal', 'emailModal', 'quantityModal', 'manualModal', 'containerDetailModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    });
}

function closeQuantityModal() {
    if (elements.quantityModal) elements.quantityModal.style.display = 'none';
}

function closeManualModal() {
    const manualModal = document.getElementById('manualModal');
    if (manualModal) manualModal.style.display = 'none';
}

function closeContainerDetailModal() {
    const modal = document.getElementById('containerDetailModal');
    if (modal) modal.style.display = 'none';
}

// ================== API KEY MANAGEMENT ==================
function showApiKeyHelp() {
    const helpWindow = window.open('', '_blank');
    helpWindow.document.write(`
        <html>
        <head><title>Supabase API Anahtarı Alma Rehberi</title></head>
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
                <h3>5. "Project API Keys" bölümündeki "anon" anahtarını kopyalayın</h3>
            </div>
        </body>
        </html>
    `);
}

// ================== BARCODE SCANNER FUNCTIONS ==================
let barcodeListenerAttached = false;
let scannerMode = false;

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

function setupBarcodeScanner() {
    if (!elements.barcodeInput || barcodeListenerAttached) return;
    
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    
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

function displayScannedBarcodes() {
    if (!elements.scannedBarcodes) return;
    
    elements.scannedBarcodes.innerHTML = '';
    
    if (scannedBarcodes.length === 0) {
        elements.scannedBarcodes.innerHTML = '<p style="color:#666; text-align:center; font-size:0.8rem;">Henüz barkod taranmadı</p>';
        return;
    }
    
    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; padding: 0; margin: 0; font-size: 0.8rem;';
    
    scannedBarcodes.forEach(barcode => {
        const item = document.createElement('li');
        item.style.cssText = 'padding: 5px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;';
        item.innerHTML = `
            <span>${barcode.barcode}</span>
            <span style="color: ${barcode.processed ? 'green' : 'orange'}">
                ${barcode.processed ? 'İşlendi' : 'Beklemede'}
            </span>
        `;
        list.appendChild(item);
    });
    
    elements.scannedBarcodes.appendChild(list);
}

// ================== PACKAGE OPERATIONS ==================
function selectPackage(pkg) {
    if (!pkg || !pkg.id) {
        console.error('Invalid package data:', pkg);
        return;
    }
    
    document.querySelectorAll('#packagesTableBody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
    const targetCheckbox = document.querySelector(`#packagesTableBody input[value="${pkg.id}"]`);
    const targetRow = targetCheckbox?.closest('tr');
    
    if (targetRow) targetRow.classList.add('selected');
    
    if (elements.packageDetailContent) {
        updatePackageDetails(pkg, elements.packageDetailContent);
    }
}

function updatePackageDetails(pkg, container) {
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
        <p><strong>Toplam Adet:</strong> ${pkg.total_quantity || 0}</p>
        <p><strong>Tarih:</strong> ${dateStr}</p>
        <p><strong>Durum:</strong> ${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</p>
    `;
    
    if (pkg.items && Object.keys(pkg.items).length > 0) {
        const itemsHeader = document.createElement('h5');
        itemsHeader.textContent = 'Ürünler:';
        container.appendChild(itemsHeader);
        
        const itemsList = document.createElement('ul');
        Object.entries(pkg.items).forEach(([product, quantity]) => {
            const li = document.createElement('li');
            li.textContent = `${product}: ${quantity} adet`;
            itemsList.appendChild(li);
        });
        container.appendChild(itemsList);
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
        total_quantity: selectedRow.cells[3].textContent.trim(),
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
    
    if (elements.selectAllPackages) {
        elements.selectAllPackages.checked = checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
    }
}

function openQuantityModal(product) {
    selectedProduct = product;
    if (elements.quantityModalTitle) {
        elements.quantityModalTitle.textContent = `${product} - Adet Girin`;
    }
    if (elements.quantityInput) {
        elements.quantityInput.value = '';
        elements.quantityInput.focus();
    }
    document.getElementById('quantityError').style.display = 'none';
    if (elements.quantityModal) {
        elements.quantityModal.style.display = 'flex';
    }
}

function confirmQuantity() {
    if (!elements.quantityInput) return;
    
    const quantity = parseInt(elements.quantityInput.value);
    
    if (!quantity || quantity <= 0) {
        document.getElementById('quantityError').style.display = 'block';
        return;
    }

    const badge = document.getElementById(`${selectedProduct}-quantity`);
    if (badge) {
        const currentQuantity = parseInt(badge.textContent) || 0;
        badge.textContent = currentQuantity + quantity;
    }

    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[selectedProduct] = (currentPackage.items[selectedProduct] || 0) + quantity;

    showAlert(`${selectedProduct}: ${quantity} adet eklendi`, 'success');
    closeQuantityModal();
}

function openManualEntry() {
    const manualModal = document.getElementById('manualModal');
    if (manualModal) {
        manualModal.style.display = 'flex';
        document.getElementById('manualProduct').focus();
    }
}

function addManualProduct() {
    const product = document.getElementById('manualProduct').value.trim();
    const quantity = parseInt(document.getElementById('manualQuantity').value);

    if (!product || !quantity || quantity <= 0) {
        showAlert('Lütfen geçerli ürün adı ve miktar girin', 'error');
        return;
    }

    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[product] = (currentPackage.items[product] || 0) + quantity;

    showAlert(`${product}: ${quantity} adet eklendi`, 'success');
    
    document.getElementById('manualProduct').value = '';
    document.getElementById('manualQuantity').value = '';
    closeManualModal();
}

function selectCustomerFromModal(customer) {
    selectedCustomer = customer;
    if (elements.customerSelect) {
        elements.customerSelect.value = customer.id;
    }
    closeModal();
    showAlert(`Müşteri seçildi: ${customer.name}`, 'success');
}

// ================== STOCK OPERATIONS ==================
let currentEditingRow = null;
let editingStockItem = null;

function editStockItem(button, code) {
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
    
    if (quantitySpan) quantitySpan.style.display = 'none';
    if (quantityInput) quantityInput.style.display = 'block';
    if (editButton) editButton.style.display = 'none';
    if (editButtons) editButtons.style.display = 'flex';
    
    editingStockItem = code;
}

async function saveStockItem(code, input) {
    if (input.disabled) return;
    
    const newQuantity = parseInt(input.value);
    if (isNaN(newQuantity) || newQuantity < 0) {
        showAlert('Geçerli bir sayı girin (0 veya üzeri)', 'error');
        input.focus();
        return;
    }
    
    try {
        input.disabled = true;
        showAlert('Güncelleniyor...', 'info', 1000);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const row = input.closest('tr');
        const quantityCell = row.querySelector('td:nth-child(3)');
        const statusCell = row.querySelector('td:nth-child(5)');
        const lastUpdateCell = row.querySelector('td:nth-child(6)');
        
        if (quantityCell) quantityCell.textContent = newQuantity;
        
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
        
        cancelEditStockItem(code, newQuantity);
        showAlert(`Stok güncellendi: ${code} - ${newQuantity} adet`, 'success');
        
    } catch (error) {
        console.error('Stok güncelleme hatası:', error);
        showAlert('Stok güncellenirken hata oluştu', 'error');
        input.disabled = false;
    }
}

function cancelEditStockItem(code, quantity) {
    const row = document.querySelector(`tr:has(td:first-child:contains("${code}"))`);
    if (!row) return;
    
    const quantityInput = row.querySelector('.stock-quantity-input');
    const quantitySpan = row.querySelector('.stock-quantity');
    const editButton = row.querySelector('button');
    const editButtons = row.querySelector('.edit-buttons');
    
    if (quantityInput) {
        quantityInput.value = quantity;
        quantityInput.style.display = 'none';
    }
    if (quantitySpan) quantitySpan.style.display = 'block';
    if (editButton) editButton.style.display = 'block';
    if (editButtons) editButtons.style.display = 'none';
    
    editingStockItem = null;
    currentEditingRow = null;
}

function searchStock() {
    if (!elements.stockSearch || !elements.stockTableBody) return;
    
    const searchTerm = elements.stockSearch.value.toLowerCase();
    const rows = elements.stockTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function clearStockSearch() {
    if (!elements.stockSearch) return;
    
    elements.stockSearch.value = '';
    const rows = elements.stockTableBody.querySelectorAll('tr');
    rows.forEach(row => row.style.display = '');
}

// ================== CONTAINER OPERATIONS ==================
function toggleSelectAllCustomer(checkbox) {
    const folder = checkbox.closest('.customer-folder');
    const checkboxes = folder.querySelectorAll('.container-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function loadCurrentContainer() {
    showAlert('Mevcut konteyner yüklendi', 'success');
}

// ================== SETTINGS MANAGEMENT ==================
function initializeSettings() {
    loadSettings();
    setupSettingsEventListeners();
    setupAutoSave();
}

function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    if (savedSettings.theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (document.getElementById('themeToggle')) {
            document.getElementById('themeToggle').checked = true;
        }
    }
    
    if (document.getElementById('printerScaling') && savedSettings.printerScaling) {
        document.getElementById('printerScaling').value = savedSettings.printerScaling;
    }
    
    if (document.getElementById('copiesNumber') && savedSettings.copies) {
        document.getElementById('copiesNumber').value = savedSettings.copies || 1;
    }
    
    if (document.getElementById('languageSelect') && savedSettings.language) {
        document.getElementById('languageSelect').value = savedSettings.language;
        changeLanguage(savedSettings.language);
    }
    
    if (document.getElementById('autoSaveToggle')) {
        document.getElementById('autoSaveToggle').checked = savedSettings.autoSave !== false;
    }
}

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
        printerFontSize: document.getElementById('printerFontSize')?.value || '12',
        printerMargin: document.getElementById('printerMargin')?.value || '3',
        barcodeHeight: document.getElementById('barcodeHeight')?.value || '25',
        labelWidth: document.getElementById('labelWidth')?.value || '100',
        labelHeight: document.getElementById('labelHeight')?.value || '80'
    };
    
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    applySettings(settings);
    showAlert('Ayarlar kaydedildi', 'success');
    updatePrinterSettings(settings);
}

function applySettings(settings) {
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (document.getElementById('themeToggle')) {
            document.getElementById('themeToggle').checked = true;
        }
    } else {
        document.body.classList.remove('dark-mode');
        if (document.getElementById('themeToggle')) {
            document.getElementById('themeToggle').checked = false;
        }
    }
    
    if (settings.language) {
        changeLanguage(settings.language);
    }
    
    if (settings.fontSize) {
        document.documentElement.style.setProperty('--base-font-size', settings.fontSize + 'px');
        updateFontSize(settings.fontSize);
    }
    
    if (settings.soundEnabled !== undefined) {
        window.soundEnabled = settings.soundEnabled;
    }
    
    if (settings.notificationsEnabled !== undefined) {
        window.notificationsEnabled = settings.notificationsEnabled;
    }
    
    if (settings.printerScaling) {
        document.documentElement.style.setProperty('--ui-scale', (parseInt(settings.printerScaling) / 100));
    }
}

function changeLanguage(lang) {
    const translations = {
        tr: {
            'appTitle': 'ProClean Çamaşırhane Yönetimi',
            'loginTitle': 'Giriş Yap',
            'customerSelect': 'Müşteri Seçin',
            'packageNo': 'Paket No',
            'customer': 'Müşteri',
            'product': 'Ürün',
            'quantity': 'Adet',
            'date': 'Tarih',
            'status': 'Durum',
            'actions': 'İşlemler',
            'save': 'Kaydet',
            'print': 'Yazdır',
            'delete': 'Sil',
            'update': 'Güncelle',
            'cancel': 'İptal',
            'confirm': 'Onayla',
            'settings': 'Ayarlar',
            'theme': 'Tema',
            'language': 'Dil',
            'printer': 'Yazıcı',
            'autoSave': 'Otomatik Kaydet',
            'darkMode': 'Koyu Tema',
            'lightMode': 'Açık Tema',
            'turkish': 'Türkçe',
            'english': 'İngilizce'
        },
        en: {
            'appTitle': 'ProClean Laundry Management',
            'loginTitle': 'Login',
            'customerSelect': 'Select Customer',
            'packageNo': 'Package No',
            'customer': 'Customer',
            'product': 'Product',
            'quantity': 'Quantity',
            'date': 'Date',
            'status': 'Status',
            'actions': 'Actions',
            'save': 'Save',
            'print': 'Print',
            'delete': 'Delete',
            'update': 'Update',
            'cancel': 'Cancel',
            'confirm': 'Confirm',
            'settings': 'Settings',
            'theme': 'Theme',
            'language': 'Language',
            'printer': 'Printer',
            'autoSave': 'Auto Save',
            'darkMode': 'Dark Mode',
            'lightMode': 'Light Mode',
            'turkish': 'Turkish',
            'english': 'English'
        }
    };
    
    const translation = translations[lang] || translations['tr'];
    
    Object.keys(translation).forEach(key => {
        const elements = document.querySelectorAll(`[data-i18n="${key}"]`);
        elements.forEach(element => {
            element.textContent = translation[key];
        });
        
        const inputElements = document.querySelectorAll(`[data-i18n-placeholder="${key}"]`);
        inputElements.forEach(element => {
            element.placeholder = translation[key];
        });
        
        const titleElements = document.querySelectorAll(`[data-i18n-title="${key}"]`);
        titleElements.forEach(element => {
            element.title = translation[key];
        });
    });
    
    document.documentElement.lang = lang;
}

function updateFontSize(size) {
    const elements = document.querySelectorAll('body, button, input, select, textarea');
    elements.forEach(element => {
        element.style.fontSize = size + 'px';
    });
}

function updatePrinterSettings(settings) {
    if (window.printerElectron && settings) {
        window.printerElectron.settings = settings;
    }
}

function setupSettingsEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
            settings.theme = this.checked ? 'dark' : 'light';
            localStorage.setItem('procleanSettings', JSON.stringify(settings));
            applySettings(settings);
        });
    }
    
    const realTimeSettings = ['printerScaling', 'copiesNumber', 'fontSizeSelect', 'printQualitySelect', 'barcodeTypeSelect', 'paperSizeSelect', 'printerFontSize', 'printerMargin', 'barcodeHeight', 'labelWidth', 'labelHeight'];
    
    realTimeSettings.forEach(settingId => {
        const element = document.getElementById(settingId);
        if (element) {
            element.addEventListener('change', function() {
                setTimeout(saveAllSettings, 100);
            });
        }
    });
    
    const toggleSettings = ['soundToggle', 'notificationsToggle', 'backupToggle', 'autoSaveToggle'];
    toggleSettings.forEach(toggleId => {
        const element = document.getElementById(toggleId);
        if (element) {
            element.addEventListener('change', saveAllSettings);
        }
    });
    
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            changeLanguage(this.value);
            saveAllSettings();
        });
    }
}

function setupAutoSave() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    if (settings.autoSave !== false) {
        setInterval(() => {
            if (window.saveAppState) {
                window.saveAppState();
            }
        }, 30000);
        
        window.addEventListener('beforeunload', () => {
            if (window.saveAppState) {
                window.saveAppState();
            }
        });
    }
}

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
            labelHeight: '80'
        };
        
        localStorage.setItem('procleanSettings', JSON.stringify(defaultSettings));
        applySettings(defaultSettings);
        loadSettings();
        showAlert('Ayarlar varsayılan değerlere sıfırlandı', 'success');
    }
}

function exportSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `proclean_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showAlert('Ayarlar dışa aktarıldı', 'success');
}

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
    event.target.value = '';
}

function showSettingsModal() {
    loadSettings();
    checkSystemStatus();
    if (elements.settingsModal) {
        elements.settingsModal.style.display = 'flex';
        elements.settingsModal.classList.add('show');
    }
}

function closeSettingsModal() {
    if (elements.settingsModal) {
        elements.settingsModal.style.display = 'none';
        elements.settingsModal.classList.remove('show');
        saveAllSettings();
    }
}

function toggleTheme() {
    const isDark = document.getElementById('themeToggle').checked;
    document.body.classList.toggle('dark-mode', isDark);
    const themeStatus = document.getElementById('themeStatus');
    if (themeStatus) {
        themeStatus.textContent = isDark ? 'Koyu' : 'Açık';
    }
}

function checkSystemStatus() {
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (dbStatus) {
        if (supabase) {
            dbStatus.textContent = 'Bağlı';
            dbStatus.className = 'status-indicator connected';
        } else {
            dbStatus.textContent = 'Bağlantı Yok';
            dbStatus.className = 'status-indicator disconnected';
        }
    }

    const printerStatus = document.getElementById('printerConnectionStatus');
    if (printerStatus) {
        const printerInstance = getPrinterElectron();
        if (printerInstance && printerInstance.isConnected) {
            printerStatus.textContent = 'Bağlı';
            printerStatus.className = 'status-indicator connected';
        } else {
            printerStatus.textContent = 'Bağlantı Yok';
            printerStatus.className = 'status-indicator disconnected';
        }
    }
}

// ================== DATA EXPORT FUNCTIONS ==================
async function exportData(format) {
    if (!format) {
        showAlert('⚠️ Format belirtilmedi!', 'error');
        return;
    }

    format = format.toLowerCase().trim();

    try {
        showAlert('📊 Veriler toplanıyor...', 'info');
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

async function collectAllAppData() {
    const allData = {
        metadata: { exportDate: new Date().toISOString(), appVersion: '1.0.0', totalRecords: 0 },
        settings: {}, customers: [], packages: [], containers: [], stock: [], personnel: [],
        reports: [], shipping: [], users: [], auditLogs: []
    };

    try {
        allData.settings = {
            theme: localStorage.getItem('procleanTheme'),
            apiKey: localStorage.getItem('procleanApiKey') ? '***HIDDEN***' : null,
            appState: JSON.parse(localStorage.getItem('procleanState') || '{}'),
            userPreferences: JSON.parse(localStorage.getItem('procleanPreferences') || '{}')
        };

        if (window.packages && window.packages.length > 0) {
            const uniqueCustomers = [...new Set(window.packages.map(p => p.customer_name))].filter(Boolean);
            allData.customers = uniqueCustomers.map(name => ({
                name: name,
                totalPackages: window.packages.filter(p => p.customer_name === name).length,
                totalItems: window.packages.filter(p => p.customer_name === name)
                    .reduce((sum, p) => sum + (p.total_quantity || 0), 0)
            }));
        }

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

        const personnelSelect = document.getElementById('personnelSelect');
        if (personnelSelect) {
            allData.personnel = Array.from(personnelSelect.options).map(option => ({
                id: option.value,
                name: option.textContent.trim(),
                isActive: option.value === personnelSelect.value
            })).filter(p => p.id);
        }

        allData.currentSession = {
            selectedCustomer: window.selectedCustomer,
            currentContainer: window.currentContainer,
            currentPackage: window.currentPackage,
            currentUser: window.currentUser,
            connectionStatus: navigator.onLine ? 'online' : 'offline'
        };

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

        if (window.supabase) {
            try {
                const { data: users } = await supabase.from('users').select('*').limit(100);
                if (users) allData.users = users;

                const { data: reports } = await supabase.from('reports').select('*').limit(50);
                if (reports) allData.reports = reports;
            } catch (dbError) {
                console.warn('Database export limited:', dbError);
                allData.databaseExport = 'partial - some tables unavailable';
            }
        }

        allData.uiState = {
            activeTab: document.querySelector('.tab.active')?.getAttribute('data-tab') || 'unknown',
            totalPackagesCount: window.packages ? window.packages.length : 0,
            totalContainersCount: window.containers ? window.containers.length : 0,
            waitingPackages: window.packages ? window.packages.filter(p => !p.container_id).length : 0,
            shippedPackages: window.packages ? window.packages.filter(p => p.container_id).length : 0,
            criticalStockItems: allData.stock.filter(item => item.quantity <= item.critical_level).length
        };

        allData.metadata.totalRecords = 
            allData.packages.length + allData.containers.length + allData.stock.length +
            allData.customers.length + allData.personnel.length + allData.users.length + allData.reports.length;

        return allData;

    } catch (error) {
        console.error('Data collection error:', error);
        throw new Error(`Veri toplama hatası: ${error.message}`);
    }
}

async function exportToJSON(data, filename) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert(`✅ Tüm veriler JSON formatında dışa aktarıldı! (${data.metadata.totalRecords} kayıt)`, 'success');
        
    } catch (error) {
        throw new Error(`JSON export failed: ${error.message}`);
    }
}

async function exportToExcel(data, filename) {
    if (typeof XLSX === 'undefined') {
        throw new Error('XLSX kütüphanesi bulunamadı! Lütfen SheetJS kütüphanesini yükleyin.');
    }

    try {
        const wb = XLSX.utils.book_new();
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

        sheets.forEach(sheet => {
            if (sheet.data && sheet.data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheet.data);
                XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            }
        });

        XLSX.writeFile(wb, `${filename}.xlsx`);
        showAlert(`✅ Tüm veriler Excel formatında dışa aktarıldı! (${data.metadata.totalRecords} kayıt)`, 'success');

    } catch (error) {
        throw new Error(`Excel export failed: ${error.message}`);
    }
}

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

function addExportButtons() {
    let exportContainer = document.getElementById('export-buttons-container');
    if (!exportContainer) {
        exportContainer = document.createElement('div');
        exportContainer.id = 'export-buttons-container';
        exportContainer.style.cssText = 'margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;';
        
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

// ================== CLEANUP FUNCTIONS ==================
function clearFrontendData() {
    const password = prompt('Tüm frontend veriler silinecek. Lütfen şifreyi girin:');

    if (password !== '8823') {
        alert('⚠️ Şifre yanlış! İşlem iptal edildi.');
        return;
    }

    localStorage.removeItem('procleanState');
    localStorage.removeItem('procleanOfflineData');
    localStorage.removeItem('procleanSettings');

    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
    });

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => input.value = '');

    const selects = document.querySelectorAll('select');
    selects.forEach(select => select.selectedIndex = 0);

    const containers = document.querySelectorAll('.container, .packages-container, .reports-container, .stock-container, .stock-items');
    containers.forEach(container => container.innerHTML = '');

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    const toggles = document.querySelectorAll('input[type="radio"]');
    toggles.forEach(toggle => toggle.checked = false);

    showAlert('Tüm frontend veriler temizlendi', 'success');
}

// ================== PRINTER SETTINGS ==================
function loadPrinterSettings(settings) {
    const elements = {
        printerScaling: 'printerScaling',
        copiesNumber: 'copiesNumber',
        fontName: 'fontName',
        fontSize: 'fontSize',
        orientation: 'orientation',
        marginTop: 'marginTop',
        marginBottom: 'marginBottom',
        labelHeader: 'labelHeader'
    };

    Object.keys(elements).forEach(key => {
        const element = document.getElementById(elements[key]);
        if (element && settings[key]) {
            element.value = settings[key];
        }
    });
}

function savePrinterSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

    settings.printerScaling = document.getElementById('printerScaling')?.value;
    settings.copies = parseInt(document.getElementById('copiesNumber')?.value, 10);
    settings.fontName = document.getElementById('fontName')?.value;
    settings.fontSize = parseInt(document.getElementById('fontSize')?.value, 10);
    settings.orientation = document.getElementById('orientation')?.value;
    settings.marginTop = parseInt(document.getElementById('marginTop')?.value, 10);
    settings.marginBottom = parseInt(document.getElementById('marginBottom')?.value, 10);
    settings.labelHeader = document.getElementById('labelHeader')?.value || 'Yeditepe';

    localStorage.setItem('procleanSettings', JSON.stringify(settings));
}

// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', function() {
    initializeElementsObject();
    initializeSettings();
    setupBarcodeScanner();
    
    setTimeout(addExportButtons, 2000);

    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('settingsModal')) {
            closeSettingsModal();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeSettingsModal();
        }
    });

    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    loadPrinterSettings(settings);

    const inputIds = ['printerScaling', 'copiesNumber', 'fontName', 'fontSize', 'orientation', 'marginTop', 'marginBottom', 'labelHeader'];
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
