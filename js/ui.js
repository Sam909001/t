
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
function showAlert(message, type = 'info', duration = 5000) {
    if (!elements.alertContainer) {
        console.error('Alert container not found, using console instead');
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const span = document.createElement('span');
    span.textContent = message; // Use textContent for XSS protection
    
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
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}



        

// Form doğrulama fonksiyonu
function validateForm(inputs) {
    let isValid = true;
    
    inputs.forEach(input => {
        const element = document.getElementById(input.id);
        const errorElement = document.getElementById(input.errorId);
        
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
    
    // Function to load settings
function loadSettings() {
    // Get saved settings from localStorage (or default)
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings')) || {};
    
    // Set checkbox based on saved setting (default: true)
    document.getElementById('autoSaveToggle').checked = savedSettings.autoSave !== false;
}

// Function to save settings
function saveSettings() {
    const autoSave = document.getElementById('autoSaveToggle').checked;
    const settings = {
        autoSave: autoSave
    };
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
}

// Event listener for toggle
document.getElementById('autoSaveToggle').addEventListener('change', function() {
    saveSettings();
    if (this.checked) {
        showAlert('Auto-Save etkinleştirildi.', 'info');
    } else {
        showAlert('Auto-Save devre dışı bırakıldı.', 'info');
    }
});

// Run on page load
document.addEventListener('DOMContentLoaded', loadSettings);


    

// Apply settings to UI and app
function applySettings(settings) {
    // Theme
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('themeToggle').checked = false;
    }

    // Printer scaling
    document.getElementById('printerScaling').value = settings.printerScaling || '100';

    // Copies
    document.getElementById('copiesNumber').value = settings.copies || 1;

    // Language
    document.getElementById('languageSelect').value = settings.language || 'tr';

    // Auto-save
    document.getElementById('autoSaveToggle').checked = settings.autoSave !== false;
}

// Save all settings
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

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings')) || {};
    applySettings(savedSettings);
});

// Optional: Add event listener to Save button
document.getElementById('saveSettingsBtn')?.addEventListener('click', saveAllSettings);



    
function applySettings(settings) {
    // ----------- Theme -----------
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('themeToggle').checked = false;
    }

    // ----------- Language -----------
    if (settings.language) {
        document.getElementById('languageSelect').value = settings.language;
        if (typeof changeLanguage === 'function') {
            changeLanguage(settings.language); // make sure you have this function
        }
    }

    // ----------- Printer Scaling -----------
    if (settings.printerScaling) {
        document.getElementById('printerScaling').value = settings.printerScaling;
        // Apply scaling in your print preview logic if needed
        applyPrinterScaling(settings.printerScaling); // optional function
    }

    // ----------- Copies -----------
    if (settings.copies !== undefined) {
        document.getElementById('copiesNumber').value = settings.copies;
        // Apply in printing logic if needed
    }

    // ----------- Auto-Save -----------
    document.getElementById('autoSaveToggle').checked = settings.autoSave !== false;

    // You can call any additional functions here if needed to apply settings live
}


    




function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = themeToggle.checked;

    // Apply dark/light class
    document.body.classList.toggle('dark-mode', isDark);

    // Update UI status text
    const statusText = document.getElementById('themeStatus');
    if (statusText) {
        statusText.textContent = isDark ? 'Koyu' : 'Açık';
    }

    // Save to localStorage
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings')) || {};
    savedSettings.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('procleanSettings', JSON.stringify(savedSettings));

    // Optional: show feedback
    showAlert(isDark ? 'Koyu tema etkinleştirildi.' : 'Açık tema etkinleştirildi.', 'info');
}

// Make sure the checkbox triggers toggle
document.getElementById('themeToggle').addEventListener('change', toggleTheme);

// Apply saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings')) || {};
    if (savedSettings.theme === 'dark') {
        document.getElementById('themeToggle').checked = true;
        document.body.classList.add('dark-mode');
        document.getElementById('themeStatus').textContent = 'Koyu';
    } else {
        document.getElementById('themeToggle').checked = false;
        document.body.classList.remove('dark-mode');
        document.getElementById('themeStatus').textContent = 'Açık';
    }
});


    
async function checkSystemStatus() {
    const dbStatus = document.getElementById('dbConnectionStatus');

    if (!supabase) {
        dbStatus.textContent = 'Bağlantı Yok';
        dbStatus.className = 'status-indicator disconnected';
        return;
    }

    try {
        // Test query: fetch 1 row from a known table
        const { data, error } = await supabase.from('packages').select('id').limit(1);

        if (error) {
            dbStatus.textContent = 'Bağlantı Yok';
            dbStatus.className = 'status-indicator disconnected';
            console.error('Supabase connection error:', error);
        } else {
            dbStatus.textContent = 'Bağlı';
            dbStatus.className = 'status-indicator connected';
        }
    } catch (err) {
        dbStatus.textContent = 'Bağlantı Yok';
        dbStatus.className = 'status-indicator disconnected';
        console.error('Unexpected error:', err);
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', checkSystemStatus);

// Optional: periodically check every 30 seconds
setInterval(checkSystemStatus, 30000);



    
   async function checkPrinterStatus() {
    const printerStatus = document.getElementById('printerConnectionStatus');

    try {
        // If you're using a printer library, replace this with actual connection test
        // Example: await printer.testConnection() or check printer.isConnected
        let isConnected = false;

        if (printer && typeof printer.isConnected !== 'undefined') {
            isConnected = printer.isConnected;
        } else if (printer && typeof printer.testConnection === 'function') {
            isConnected = await printer.testConnection(); // hypothetical async test
        }

        if (isConnected) {
            printerStatus.textContent = 'Bağlı';
            printerStatus.className = 'status-indicator connected';
        } else {
            printerStatus.textContent = 'Bağlantı Yok';
            printerStatus.className = 'status-indicator disconnected';
        }
    } catch (err) {
        printerStatus.textContent = 'Bağlantı Yok';
        printerStatus.className = 'status-indicator disconnected';
        console.error('Printer connection error:', err);
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', checkPrinterStatus);

// Optional: refresh every 30 seconds
setInterval(checkPrinterStatus, 30000);


    



async function exportData(format) {
    showAlert(`${format.toUpperCase()} formatında veri indirme hazırlanıyor...`, 'info');

    try {
        // Example: fetch data from Supabase table 'packages'
        const { data, error } = await supabase.from('packages').select('*');
        if (error) throw error;

        let fileContent, mimeType, fileName;

        if (format.toLowerCase() === 'json') {
            fileContent = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            fileName = 'packages.json';
        } else if (format.toLowerCase() === 'csv') {
            // Convert array of objects to CSV
            const headers = Object.keys(data[0] || {});
            const rows = data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','));
            fileContent = [headers.join(','), ...rows].join('\n');
            mimeType = 'text/csv';
            fileName = 'packages.csv';
        } else {
            showAlert('Desteklenmeyen format: ' + format, 'error');
            return;
        }

        // Trigger download
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert(`${fileName} indirildi.`, 'success');
    } catch (err) {
        console.error('Export error:', err);
        showAlert('Veri indirme sırasında hata oluştu.', 'error');
    }
}


    

function clearLocalData() {
    if (confirm('Tüm yerel veriler silinecek. Emin misiniz?')) {
        // Remove all stored ProClean data
        localStorage.removeItem('procleanState');
        localStorage.removeItem('procleanOfflineData');
        localStorage.removeItem('procleanSettings');

        // Optional: reset UI elements to defaults
        const themeToggle = document.getElementById('themeToggle');
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        const printerScaling = document.getElementById('printerScaling');
        const copiesNumber = document.getElementById('copiesNumber');
        const languageSelect = document.getElementById('languageSelect');

        if (themeToggle) themeToggle.checked = false;
        if (autoSaveToggle) autoSaveToggle.checked = true;
        if (printerScaling) printerScaling.value = '100';
        if (copiesNumber) copiesNumber.value = '1';
        if (languageSelect) languageSelect.value = 'tr';

        // Reset theme
        document.body.classList.remove('dark-mode');
        const themeStatus = document.getElementById('themeStatus');
        if (themeStatus) themeStatus.textContent = 'Açık';

        // Show success message
        showAlert('Yerel veriler temizlendi ve varsayılan ayarlar uygulandı.', 'success');
    }
}

// Optional: attach to a button
document.getElementById('clearDataBtn')?.addEventListener('click', clearLocalData);



    

// Initialize settings on app load
function initializeSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');

    // Set default values if not present
    const defaultSettings = {
        theme: 'light',
        language: 'tr',
        printerScaling: '100',
        copies: 1,
        autoSave: true
    };

    const settings = { ...defaultSettings, ...savedSettings };

    // Apply settings to the UI and app
    applySettings(settings);
}

// Run on page load
document.addEventListener('DOMContentLoaded', initializeSettings);



    




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
            rows[i].classList.add('selected'); // FIXED: removed extra "class."
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




