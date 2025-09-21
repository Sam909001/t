// Complete UI functions including all original functions plus fixes
// Global variables
let elements = {};
let editingStockItem = null;
let selectedProduct = null;
let currentPackage = { items: {} };
let scannerMode = false;
let scannedBarcodes = [];
let selectedCustomer = null;
let currentContainerDetails = null;

// 1. ELEMENT INITIALIZATION FUNCTIONS (from original)
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

// 2. ALERT SYSTEM (from original)
function showAlert(message, type = 'info', duration = 5000) {
    if (!elements.alertContainer) {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            elements.alertContainer = alertContainer;
        } else {
            console.error('Alert container not found, using console instead');
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
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

// 3. TOAST FUNCTION (from original)
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        // Fallback to showAlert if toast element doesn't exist
        showAlert(message, type);
    }
}

// 4. FORM VALIDATION (from original)
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

// 5. API KEY FUNCTIONS (from original)
function showApiKeyModal() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.value = SUPABASE_ANON_KEY || '';
        document.getElementById('apiKeyModal').style.display = 'flex';
    }
}

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

// 6. BARCODE SCANNER FUNCTIONS (from original)
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

// Add missing processBarcode function
function processBarcode() {
    const barcodeInput = elements.barcodeInput || document.getElementById('barcodeInput');
    if (!barcodeInput || !barcodeInput.value) return;
    
    const barcode = barcodeInput.value.trim();
    scannedBarcodes.push({
        barcode: barcode,
        timestamp: Date.now(),
        processed: false
    });
    
    showAlert(`Barkod tarandı: ${barcode}`, 'success');
    barcodeInput.value = '';
    displayScannedBarcodes();
}

// 7. STOCK EDITING FUNCTIONS (from original - improved)
function editStockItem(button, code) {
    if (editingStockItem) {
        showAlert('Başka bir öğe düzenleniyor. Önce onu kaydedin veya iptal edin.', 'warning');
        return;
    }
    
    const row = button.closest('tr');
    const quantityCell = row.querySelector('td:nth-child(3)');
    const actionsCell = row.querySelector('td:last-child');
    
    if (!quantityCell || !actionsCell) {
        console.error('Required cells not found');
        return;
    }
    
    const currentQuantity = quantityCell.textContent.trim();
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentQuantity;
    input.className = 'stock-quantity-input';
    input.style.width = '80px';
    input.min = '0';
    input.setAttribute('data-original', currentQuantity);
    
    // Replace cell content with input
    quantityCell.innerHTML = '';
    quantityCell.appendChild(input);
    
    // Create save and cancel buttons
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Kaydet';
    saveBtn.className = 'btn btn-success btn-sm';
    saveBtn.onclick = () => saveStockItem(code, input);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> İptal';
    cancelBtn.className = 'btn btn-secondary btn-sm';
    cancelBtn.onclick = () => cancelEditStockItem(code, currentQuantity);
    
    // Replace actions cell content
    actionsCell.innerHTML = '';
    actionsCell.appendChild(saveBtn);
    actionsCell.appendChild(document.createTextNode(' '));
    actionsCell.appendChild(cancelBtn);
    
    editingStockItem = code;
    input.focus();
    input.select();
    
    // Handle Enter/Escape keys
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveStockItem(code, input);
        } else if (e.key === 'Escape') {
            cancelEditStockItem(code, currentQuantity);
        }
    });
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
    const rows = document.querySelectorAll('#stockTableBody tr');
    let row = null;
    
    for (let r of rows) {
        if (r.cells[0] && r.cells[0].textContent.trim() === code) {
            row = r;
            break;
        }
    }
    
    if (!row) {
        console.error(`Row not found for code: ${code}`);
        editingStockItem = null;
        return;
    }
    
    const quantityCell = row.querySelector('td:nth-child(3)');
    const actionsCell = row.querySelector('td:last-child');
    
    if (!quantityCell || !actionsCell) {
        console.error('Required cells not found for cancel operation');
        return;
    }
    
    quantityCell.textContent = originalQuantity;
    restoreEditButton(actionsCell, code);
    editingStockItem = null;
    
    showAlert('Düzenleme iptal edildi', 'info');
}

function restoreEditButton(actionsCell, code) {
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Düzenle';
    editBtn.className = 'btn btn-primary btn-sm';
    editBtn.onclick = () => editStockItem(editBtn, code);
    
    actionsCell.innerHTML = '';
    actionsCell.appendChild(editBtn);
}

// 8. CONTAINER FUNCTIONS (from original)
function closeContainerDetailModal() {
    const modal = document.getElementById('containerDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentContainerDetails = null;
}

function toggleSelectAllCustomer(checkbox) {
    const folder = checkbox.closest('.customer-folder');
    const checkboxes = folder.querySelectorAll('.container-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

// 9. SCANNED BARCODES DISPLAY (from original)
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
            <span>${escapeHtml(barcode.barcode)}</span>
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

// 10. PACKAGE OPERATIONS (from original)
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
    
    // Validation
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
    const quantityModal = elements.quantityModal || document.getElementById('quantityModal');
    if (quantityModal) {
        quantityModal.style.display = 'none';
    }
    selectedProduct = null;
}

function openManualEntry() {
    document.getElementById('manualModal').style.display = 'flex';
    document.getElementById('manualProduct').focus();
}

function closeManualModal() {
    const manualModal = document.getElementById('manualModal');
    if (manualModal) {
        manualModal.style.display = 'none';
    }
}

function addManualProduct() {
    const product = document.getElementById('manualProduct').value.trim();
    const quantity = parseInt(document.getElementById('manualQuantity').value);

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
    
    // Clear form
    document.getElementById('manualProduct').value = '';
    document.getElementById('manualQuantity').value = '';
    closeManualModal();
}

// 11. SETTINGS FUNCTIONS (from original)
function showSettingsModal() {
    loadSettings();
    checkSystemStatus();
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    
    if (settings.theme === 'dark') {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }
    
    if (settings.printerScaling) {
        const printerScaling = document.getElementById('printerScaling');
        if (printerScaling) printerScaling.value = settings.printerScaling;
    }
    
    if (settings.copies) {
        const copiesNumber = document.getElementById('copiesNumber');
        if (copiesNumber) copiesNumber.value = settings.copies;
    }
    
    if (settings.language) {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) languageSelect.value = settings.language;
    }
    
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    if (autoSaveToggle) autoSaveToggle.checked = settings.autoSave !== false;
}

function saveAllSettings() {
    const themeToggle = document.getElementById('themeToggle');
    const printerScaling = document.getElementById('printerScaling');
    const copiesNumber = document.getElementById('copiesNumber');
    const languageSelect = document.getElementById('languageSelect');
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    
    const settings = {
        theme: themeToggle && themeToggle.checked ? 'dark' : 'light',
        printerScaling: printerScaling ? printerScaling.value : '100',
        copies: copiesNumber ? parseInt(copiesNumber.value) : 1,
        language: languageSelect ? languageSelect.value : 'tr',
        autoSave: autoSaveToggle ? autoSaveToggle.checked : true
    };
    
    localStorage.setItem('procleanSettings', JSON.stringify(settings));
    applySettings(settings);
    showAlert('Ayarlar kaydedildi', 'success');
}

function applySettings(settings) {
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    if (settings.language) {
        changeLanguage(settings.language);
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeStatus = document.getElementById('themeStatus');
    
    const isDark = themeToggle && themeToggle.checked;
    document.body.classList.toggle('dark-mode', isDark);
    if (themeStatus) {
        themeStatus.textContent = isDark ? 'Koyu' : 'Açık';
    }
}

function checkSystemStatus() {
    const dbStatus = document.getElementById('dbConnectionStatus');
    if (dbStatus) {
        if (typeof supabase !== 'undefined' && supabase) {
            dbStatus.textContent = 'Bağlı';
            dbStatus.className = 'status-indicator connected';
        } else {
            dbStatus.textContent = 'Bağlantı Yok';
            dbStatus.className = 'status-indicator disconnected';
        }
    }
    
    const printerStatus = document.getElementById('printerConnectionStatus');
    if (printerStatus) {
        if (typeof printer !== 'undefined' && printer && printer.isConnected) {
            printerStatus.textContent = 'Bağlı';
            printerStatus.className = 'status-indicator connected';
        } else {
            printerStatus.textContent = 'Bağlantı Yok';
            printerStatus.className = 'status-indicator disconnected';
        }
    }
}

function exportData(format) {
    showAlert(`${format.toUpperCase()} formatında veri indirme hazırlanıyor...`, 'info');
}

function clearLocalData() {
    if (confirm('Tüm yerel veriler silinecek. Emin misiniz?')) {
        localStorage.removeItem('procleanState');
        localStorage.removeItem('procleanOfflineData');
        localStorage.removeItem('procleanSettings');
        showAlert('Yerel veriler temizlendi', 'success');
    }
}

function initializeSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    applySettings(savedSettings);
}

// 12. PACKAGE SELECTION FUNCTIONS (from original)
function selectPackage(pkg) {
    document.querySelectorAll('#packagesTableBody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
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

// 13. BARCODE GENERATOR (from original)
function generateBarcode(text) {
    try {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        if (typeof JsBarcode !== 'undefined') {
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
        } else {
            return `<div style="color:red; border:1px solid red; padding:5px;">JsBarcode kütüphanesi yüklenmedi: ${text}</div>`;
        }
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

// 14. STOCK SEARCH FUNCTIONS (from original)
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
    if (elements.stockSearch) {
        elements.stockSearch.value = '';
    }
    
    if (elements.stockTableBody) {
        const rows = elements.stockTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.display = '';
        });
    }
}

// 15. UTILITY FUNCTIONS
function checkOnlineStatus() {
    if (!navigator.onLine) {
        showAlert("Çevrimdışı Mod: İnternet yok, bazı işlemler çalışmayacak", "error");
        return false;
    }
    return true;
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 16. HELPER FUNCTIONS FOR MISSING FUNCTIONALITY
function changeLanguage(language) {
    // Placeholder for language change functionality
    console.log(`Language changed to: ${language}`);
}

// 17. INITIALIZATION FUNCTION
function initializeUI() {
    try {
        initializeElementsObject();
        setupBarcodeScanner();
        initializeSettings();
        
        // Add global error handler if not already present
        if (!window.globalErrorHandlerAdded) {
            window.addEventListener('error', function(e) {
                console.error('Global error:', e.error);
                if (typeof showAlert === 'function') {
                    showAlert('Bir hata oluştu: ' + e.error.message, 'error');
                }
            });
            window.globalErrorHandlerAdded = true;
        }
        
        console.log('UI initialized successfully');
    } catch (error) {
        console.error('UI initialization error:', error);
    }
}

// 18. AUTO-INITIALIZE WHEN DOM IS READY
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}

// 19. EXPORT FUNCTIONS TO GLOBAL SCOPE
window.showAlert = showAlert;
window.showToast = showToast;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.confirmQuantity = confirmQuantity;
window.openManualEntry = openManualEntry;
window.closeManualModal = closeManualModal;
window.addManualProduct = addManualProduct;
window.toggleScannerMode = toggleScannerMode;
window.processBarcode = processBarcode;
window.searchStock = searchStock;
window.clearStockSearch = clearStockSearch;
window.toggleSelectAll = toggleSelectAll;
window.updatePackageSelection = updatePackageSelection;
window.closeModal = closeModal;
window.validateForm = validateForm;
window.isValidEmail = isValidEmail;
window.checkOnlineStatus = checkOnlineStatus;
window.escapeHtml = escapeHtml;
window.editStockItem = editStockItem;
window.saveStockItem = saveStockItem;
window.cancelEditStockItem = cancelEditStockItem;
window.selectPackage = selectPackage;
window.getSelectedPackage = getSelectedPackage;
window.generateBarcode = generateBarcode;
window.showApiKeyModal = showApiKeyModal;
window.showApiKeyHelp = showApiKeyHelp;
window.setupBarcodeScanner = setupBarcodeScanner;
window.displayScannedBarcodes = displayScannedBarcodes;
window.selectCustomerFromModal = selectCustomerFromModal;
window.closeContainerDetailModal = closeContainerDetailModal;
window.toggleSelectAllCustomer = toggleSelectAllCustomer;
window.showSettingsModal = showSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.loadSettings = loadSettings;
window.saveAllSettings = saveAllSettings;
window.applySettings = applySettings;
window.toggleTheme = toggleTheme;
window.checkSystemStatus = checkSystemStatus;
window.exportData = exportData;
window.clearLocalData = clearLocalData;
window.initializeSettings = initializeSettings;
window.initializeElements = initializeElements;
window.initializeElementsObject = initializeElementsObject;
