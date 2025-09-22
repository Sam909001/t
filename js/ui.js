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




// Add missing saveStockItem function
async function saveStockItem(code, input) {
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
        showAlert('Güncelleniyor...', 'info', 1000);
        
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


function loadPrinterSettings(settings) {
    // Scaling / label size
    if (settings.printerScaling) {
        document.getElementById('printerScaling').value = settings.printerScaling;
    } else {
        document.getElementById('printerScaling').value = '100%';
    }

    // Copies
    if (settings.copies) {
        document.getElementById('copiesNumber').value = settings.copies;
    } else {
        document.getElementById('copiesNumber').value = 1;
    }

    // Font
    if (settings.fontName) {
        document.getElementById('fontName').value = settings.fontName;
    } else {
        document.getElementById('fontName').value = 'Arial';
    }

    // Font size
    if (settings.fontSize) {
        document.getElementById('fontSize').value = settings.fontSize;
    } else {
        document.getElementById('fontSize').value = 10;
    }

    // Orientation
    if (settings.orientation) {
        document.getElementById('orientation').value = settings.orientation;
    } else {
        document.getElementById('orientation').value = 'portrait';
    }

    // Margins
    if (settings.marginTop !== undefined) {
        document.getElementById('marginTop').value = settings.marginTop;
    } else {
        document.getElementById('marginTop').value = 5;
    }

    if (settings.marginBottom !== undefined) {
        document.getElementById('marginBottom').value = settings.marginBottom;
    } else {
        document.getElementById('marginBottom').value = 5;
    }
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

    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    console.log('Printer settings saved', settings);
}

    

// Attach Test Yazdır button to use the current settings
document.addEventListener('DOMContentLoaded', () => {
    // Load all settings first
    loadSettings();

    // Attach change listeners to save settings automatically
    const inputIds = [
        'printerScaling', 'copiesNumber', 'fontName',
        'fontSize', 'orientation', 'marginTop', 'marginBottom'
    ];

    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', savePrinterSettings);
    });

    // Attach Test Yazdır button
    const testBtn = document.getElementById('test-printer-yazdir');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            // Save current settings first
            savePrinterSettings();
            
            // Get the current settings
            const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
            const printerInstance = getPrinter();

            const originalText = testBtn.textContent;
            testBtn.disabled = true;
            testBtn.textContent = 'Test Ediliyor...';

            try {
                // Call the testPrint function with the current settings
                await printerInstance.testPrint(settings);
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


    // Function to print a package with current settings
async function printPackageWithSettings(packageData) {
    try {
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        const printerInstance = getPrinter();
        
        const barcode = packageData.package_no;
        const labelText = `${packageData.customer_name} - ${packageData.product}`;
        
        return await printerInstance.printBarcode(barcode, labelText, packageData, settings);
    } catch (error) {
        console.error('Print with settings error:', error);
        showAlert('Yazdırma hatası: ' + error.message, 'error');
        return false;
    }
}

// Update the printAllLabels function to use settings
async function printAllLabels() {
    console.log('🚀 Starting printAllLabels function...');
    
    const printerInstance = getPrinter();
    
    if (!printerInstance) {
        console.error('❌ Printer service not initialized');
        showAlert('Yazıcı servisi başlatılamadı. Sayfayı yenileyin ve tekrar deneyin.', 'error');
        return;
    }
    
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    console.log(`📦 Found ${checkboxes.length} selected packages`);
    
    if (checkboxes.length === 0) {
        showAlert('Etiket yazdırmak için en az bir paket seçin', 'error');
        return;
    }

    // Load current settings
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    let successCount = 0;
    let errorCount = 0;

    showAlert(`${checkboxes.length} paket etiketi yazdırılıyor...`, 'info', 5000);

    for (let i = 0; i < checkboxes.length; i++) {
        const cb = checkboxes[i];
        
        try {
            const row = cb.closest('tr');
            if (!row) {
                console.warn(`⚠️ Row not found for checkbox ${i}`);
                errorCount++;
                continue;
            }

            const pkg = {
                package_no: row.cells[1]?.textContent?.trim() || 'NO_BARCODE',
                customer_name: row.cells[2]?.textContent?.trim() || 'NO_CUSTOMER', 
                product: row.cells[3]?.textContent?.trim() || 'NO_PRODUCT',
                created_at: row.cells[4]?.textContent?.trim() || new Date().toISOString()
            };

            console.log(`📦 Processing package ${i + 1}:`, pkg);

            // Print with current settings
            const printResult = await printerInstance.printBarcode(
                pkg.package_no, 
                `${pkg.customer_name} - ${pkg.product}`, 
                pkg,
                settings
            );

            if (printResult) {
                successCount++;
                console.log(`✅ Label ${i + 1} printed successfully`);
                
                // Visual feedback - mark row as printed
                row.style.backgroundColor = '#e8f5e8';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            } else {
                errorCount++;
                console.log(`❌ Failed to print label ${i + 1}`);
                
                // Visual feedback - mark row as error
                row.style.backgroundColor = '#ffebee';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            }

            // Delay between prints
            if (i < checkboxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

        } catch (error) {
            console.error(`❌ Error processing label ${i + 1}:`, error);
            errorCount++;
            continue;
        }
    }

    if (successCount > 0 && errorCount === 0) {
        showAlert(`✅ ${successCount} etiket başarıyla yazdırıldı!`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showAlert(`⚠️ ${successCount} etiket yazdırıldı, ${errorCount} hata oluştu.`, 'warning');
    } else {
        showAlert(`❌ Hiçbir etiket yazdırılamadı. ${errorCount} hata oluştu.`, 'error');
    }

    console.log(`Print job completed: ${successCount} success, ${errorCount} errors`);
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
    if (!format) {
        showAlert('⚠️ Format belirtilmedi!', 'error');
        return;
    }

    format = format.toLowerCase().trim();

    const table = document.getElementById('stockTableBody');
    if (!table) {
        showAlert('⚠️ Stok tablosu bulunamadı!', 'error');
        return;
    }

    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
    );

    if (rows.length === 0) {
        showAlert('⚠️ Tablo boş, veri yok!', 'info');
        return;
    }

    if (format === 'json') {
        // Convert table to JSON array
        const headers = Array.from(document.querySelectorAll('.stock-table thead th')).map(th => th.textContent.trim());
        const jsonData = rows.map(row => {
            const obj = {};
            row.forEach((cell, i) => {
                obj[headers[i]] = cell;
            });
            return obj;
        });

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stok_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showAlert('✅ JSON dosyası indirildi!', 'success');
    }

    else if (format === 'excel') {
        if (typeof XLSX === 'undefined') {
            showAlert('⚠️ XLSX kütüphanesi bulunamadı! Yükleyin.', 'error');
            return;
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stoklar');
        XLSX.writeFile(wb, `stok_${new Date().toISOString().slice(0,10)}.xlsx`);
        showAlert('✅ Excel dosyası indirildi!', 'success');
    }

    else {
        showAlert('⚠️ Geçersiz format seçildi!', 'error');
    }
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



