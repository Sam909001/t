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


    
    
    // Language
if (settings.language) {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = settings.language;
    } else {
        console.warn('⚠️ languageSelect element not found, skipping language assignment.');
    }
}


    
    
// Auto-save
const autoSaveToggle = document.getElementById('autoSaveToggle');
if (autoSaveToggle) {
    // Default to true if settings.autoSave is undefined
    autoSaveToggle.checked = settings.autoSave !== false;
} else {
    console.warn('⚠️ autoSaveToggle element not found, skipping auto-save assignment.');
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
    // --- Database connection ---
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (supabase) {
        dbStatus.textContent = 'Bağlı';
        dbStatus.className = 'status-indicator connected';
    } else {
        dbStatus.textContent = 'Bağlantı Yok';
        dbStatus.className = 'status-indicator disconnected';
    }

    // --- Printer connection ---
    const printerStatus = document.getElementById('printerConnectionStatus');
    const printerInstance = getPrinterElectron(); // <-- Electron printer

    if (printerInstance && printerInstance.isConnected) {
        printerStatus.textContent = 'Bağlı';
        printerStatus.className = 'status-indicator connected';
    } else {
        printerStatus.textContent = 'Bağlantı Yok';
        printerStatus.className = 'status-indicator disconnected';
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
    
    // Create elements safely
    container.innerHTML = `
        <h4>Paket: ${pkg.package_no || 'N/A'}</h4>
        <p><strong>Müşteri:</strong> ${pkg.customers?.name || 'N/A'}</p>
        <p><strong>Toplam Adet:</strong> ${pkg.total_quantity || 0}</p>
        <p><strong>Tarih:</strong> ${dateStr}</p>
        <p><strong>Durum:</strong> ${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</p>
    `;
    
    // Add items list if exists
    if (pkg.items && typeof pkg.items === 'object' && Object.keys(pkg.items).length > 0) {
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
        total_quantity: selectedRow.cells[3].textContent.trim(), // now as text
        created_at: selectedRow.cells[4].textContent
    };
}




// ================== Barcode Generator ==================
function generateBarcode(text) {
    try {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        JsBarcode(svg, text, {
            format: "CODE128",
            lineColor: "#000",
            width: 3,
            height: 25,
            displayValue: true,
            fontSize: 10,
            margin: 0
        });
        return svg.outerHTML;
    } catch (error) {
        console.error('Barkod oluşturma hatası:', error);
        return `<div style="color:red; border:1px solid red; padding:5px;">Barkod oluşturulamadı: ${text}</div>`;
    }
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



