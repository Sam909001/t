// Global variables
let elements = {}; // Initialize elements object
let scannerMode = false;
let scannedBarcodes = [];
let editingStockItem = null;
let selectedCustomer = null;
let selectedProduct = null;
let currentPackage = {};
let SUPABASE_ANON_KEY = localStorage.getItem('supabaseKey') || '';

// Initialize elements when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeElementsObject();
    setupEventListeners();
    setupBarcodeScanner();
    checkOnlineStatus();
    displayScannedBarcodes();
});

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

// Setup event listeners for buttons and interactive elements
function setupEventListeners() {
    // API Key related
    if (elements.changeApiKeyBtn) {
        elements.changeApiKeyBtn.addEventListener('click', showApiKeyModal);
    }
    
    // Scanner toggle
    if (elements.scannerToggle) {
        elements.scannerToggle.addEventListener('click', toggleScannerMode);
    }
    
    // Container search
    if (elements.containerSearch) {
        elements.containerSearch.addEventListener('input', searchContainers);
    }
    
    // Stock search
    if (elements.stockSearch) {
        elements.stockSearch.addEventListener('input', searchStock);
    }
    
    // Package selection
    if (elements.selectAllPackages) {
        elements.selectAllPackages.addEventListener('change', toggleSelectAll);
    }
    
    // Settings modal
    if (elements.toggleThemeBtn) {
        elements.toggleThemeBtn.addEventListener('click', showSettingsModal);
    }
    
    if (elements.closeSettingsModalBtn) {
        elements.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    }
    
    // Add more event listeners as needed
    
    // Initialize settings
    initializeSettings();
}

// Profesyonel alert sistemi
function showAlert(message, type = 'info', duration = 5000) {
    if (!elements.alertContainer) {
        console.error('Alert container not found, using console instead');
        console.log(`${type.toUpperCase()}: ${message}`);
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
                    }
                }, 300);
            }
        }, duration);
    }
    
    return alert;
}

// Yardımcı fonksiyonlar
function showToast(message, type = 'info') {
    if (!elements.toast) {
        console.error('Toast element not found');
        return;
    }
    
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// Form doğrulama fonksiyonu
function validateForm(inputs) {
    let isValid = true;
    
    inputs.forEach(input => {
        const element = document.getElementById(input.id);
        const errorElement = document.getElementById(input.errorId);
        
        if (!element || !errorElement) {
            console.error(`Form element or error element not found for ${input.id}`);
            return;
        }
        
        if (input.required && !element.value.trim()) {
            element.classList.add('invalid');
            errorElement.style.display = 'block';
            isValid = false;
        } else if (input.type === 'email' && element.value.trim() && !isValidEmail(element.value)) {
            element.classList.add('invalid');
            errorElement.style.display = 'block';
            errorElement.textContent = 'Geçerli bir e-posta adresi girin';
            isValid = false;
        } else if (input.type === 'number' && element.value && (!Number.isInteger(Number(element.value)) || Number(element.value) < 1)) {
            element.classList.add('invalid');
            errorElement.style.display = 'block';
            errorElement.textContent = 'Geçerli bir sayı girin';
            isValid = false;
        } else {
            element.classList.remove('invalid');
            errorElement.style.display = 'none';
        }
    });
    
    return isValid;
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
      function setupBarcodeScanner() {
    if (!elements.barcodeInput) {
        console.error('Barcode input element not found');
        return;
    }
    
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    
    elements.barcodeInput.addEventListener('keypress', function(e) {
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
    });
}



function processBarcode() {
    // Implement barcode processing logic here
    console.log('Processing barcode:', elements.barcodeInput.value);
    // Add your barcode processing code
}

function checkOnlineStatus() {
    if (!navigator.onLine) {
        showAlert("Çevrimdışı Mod: İnternet yok, bazı işlemler çalışmayacak", "error");
        return false;
    }
    return true;
}

// Konteyner ara
function searchContainers() {
    const searchTerm = elements.containerSearch.value.toLowerCase();
    const folders = document.querySelectorAll('.customer-folder');
    
    folders.forEach(folder => {
        const containerRows = folder.querySelectorAll('tbody tr');
        let hasVisibleRows = false;
        
        containerRows.forEach(row => {
            const containerNo = row.cells[1].textContent.toLowerCase();
            if (containerNo.includes(searchTerm)) {
                row.style.display = '';
                hasVisibleRows = true;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Eğer bu klasörde görünebilir satır yoksa, klasörü gizle
        const folderHeader = folder.querySelector('.folder-header');
        if (hasVisibleRows) {
            folder.style.display = 'block';
            folderHeader.style.display = 'flex';
        } else {
            folder.style.display = 'none';
        }
    });
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
    if (!container) return;
    
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

// Stok düzenleme fonksiyonları
function editStockItem(button, code) {
    const row = button.closest('tr');
    const quantitySpan = row.querySelector('.stock-quantity');
    const quantityInput = row.querySelector('.stock-quantity-input');
    const editButton = row.querySelector('button');
    const editButtons = row.querySelector('.edit-buttons');
    
    // Düzenleme moduna geç
    quantitySpan.style.display = 'none';
    quantityInput.style.display = 'block';
    editButton.style.display = 'none';
    editButtons.style.display = 'flex';
    
    editingStockItem = code;
}

function cancelEditStockItem(code, originalQuantity) {
    const row = document.querySelector(`tr:has(td:first-child:contains("${code}"))`);
    if (!row) return;
    
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

function selectCustomerFromModal(customer) {
    selectedCustomer = customer;
    elements.customerSelect.value = customer.id;
    closeModal();
    showAlert(`Müşteri seçildi: ${customer.name}`, 'success');
}

function closeModal() {
    // Implement modal closing logic
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
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

function closeQuantityModal() {
    elements.quantityModal.style.display = 'none';
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

function closeManualModal() {
    document.getElementById('manualModal').style.display = 'none';
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
    
    // Printer settings
    if (settings.printerScaling) {
        document.getElementById('printerScaling').value = settings.printerScaling;
    }
    
    if (settings.copies) {
        document.getElementById('copiesNumber').value = settings.copies;
    }
    
    // Language
    if (settings.language) {
        document.getElementById('languageSelect').value = settings.language;
    }
    
    // Auto-save
    document.getElementById('autoSaveToggle').checked = settings.autoSave !== false;
}

function saveAllSettings() {
    const settings = {
        theme: document.getElementById('themeToggle').checked ? 'dark' : 'light',
        printerScaling: document.getElementById('printerScaling').value,
        copies: parseInt(document.getElementById('copiesNumber').value),
        language: document.getElementById('languageSelect').value,
        autoSave: document.getElementById('autoSaveToggle').checked
    };
    
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    applySettings(settings);
    showAlert('Ayarlar kaydedildi', 'success');
}

function applySettings(settings) {
    // Apply theme
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Apply language (you'll need to implement language files)
    if (settings.language) {
        changeLanguage(settings.language);
    }
}

function toggleTheme() {
    const isDark = document.getElementById('themeToggle').checked;
    document.body.classList.toggle('dark-mode', isDark);
    document.getElementById('themeStatus').textContent = isDark ? 'Koyu' : 'Açık';
}

function checkSystemStatus() {
    // Check database connection
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (supabase) {
        dbStatus.textContent = 'Bağlı';
        dbStatus.className = 'status-indicator connected';
    } else {
        dbStatus.textContent = 'Bağlantı Yok';
        dbStatus.className = 'status-indicator disconnected';
    }
    
    // Check printer connection
    const printerStatus = document.getElementById('printerConnectionStatus');
    if (printer && printer.isConnected) {
        printerStatus.textContent = 'Bağlı';
        printerStatus.className = 'status-indicator connected';
    } else {
        printerStatus.textContent = 'Bağlantı Yok';
        printerStatus.className = 'status-indicator disconnected';
    }
}

function exportData(format) {
    // Implementation for data export
    showAlert(`${format.toUpperCase()} formatında veri indirme hazırlanıyor...`, 'info');
    // Add your export logic here
}

function clearLocalData() {
    if (confirm('Tüm yerel veriler silinecek. Emin misiniz?')) {
        localStorage.removeItem('procleanState');
        localStorage.removeItem('procleanOfflineData');
        localStorage.removeItem('procleanSettings');
        showAlert('Yerel veriler temizlendi', 'success');
    }
}

// Initialize settings on app load
function initializeSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    applySettings(savedSettings);
}


function selectPackage(pkg) {
    // Remove selected class from all rows
    document.querySelectorAll('#packagesTableBody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
    // Add selected class to the clicked row
    const rows = document.querySelectorAll('#packagesTableBody tr');
    for (let i = 0; i < rows.length; i++) {
        const checkbox = rows[i].querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.value === pkg.id) {
            rows[i].classList.add('selected');
            break;
        }
    }
    
    const detailContent = document.getElementById('packageDetailContent');
    if (detailContent) {
        detailContent.innerHTML = `
            <h4>Paket: ${pkg.package_no}</h4>
            <p><strong>Müşteri:</strong> ${pkg.customers?.name || 'N/A'}</p>
            <p><strong>Toplam Adet:</strong> ${pkg.total_quantity}</p>
            <p><strong>Tarih:</strong> ${new Date(pkg.created_at).toLocaleDateString('tr-TR')}</p>
            <p><strong>Durum:</strong> ${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</p>
            ${pkg.items ? `
                <h5>Ürünler:</h5>
                <ul>
                    ${Object.entries(pkg.items).map(([product, quantity]) => 
                        `<li>${escapeHtml(product)}: ${quantity} adet</li>`
                    ).join('')}
                </ul>
            ` : ''}
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
