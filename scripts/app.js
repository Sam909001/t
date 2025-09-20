// Initialize application
async function initApp() {
    console.log('Initializing ProClean application...');
    
    try {
        // First initialize elements (will show warnings for missing ones)
        initializeElementsObject();
        
        // Wait for components to load and retry missing elements
        const success = await retryMissingElements(15, 500); // 15 attempts, 500ms interval
        
        if (!success) {
            console.warn('Some elements still missing, but continuing initialization');
        }
        
        // Now it's safe to work with elements
        await safeSetElementText('currentDate', new Date().toLocaleDateString('tr-TR'));
        
        // Only try to populate if elements exist
        if (elements.customerSelect) {
            await populateCustomers();
        }
        
        if (elements.personnelSelect) {
            await populatePersonnel();
        }
        
        // Load saved state
        loadAppState();
        
        // Load data tables if elements exist
        if (elements.packagesTableBody) {
            await populatePackagesTable();
        }
        
        if (elements.stockTableBody) {
            await populateStockTable();
        }
        
        if (elements.shippingFolders) {
            await populateShippingTable();
        }
        
        // Test connection
        await testConnection();
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Application initialization failed:', error);
        showAlert('Uygulama başlatılırken hata oluştu. Sayfayı yenileyin.', 'error');
    }
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
                <h3>Önemli Note:</h3>
                <p>API anahtarınızı asla paylaşmayın ve gizli tutun.</p>
            </div>
        </body>
        </html>
    `);
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

// Event listener'ları kur
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Tab click events
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }
    
    // Quantity modal enter key
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
        quantityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') confirmQuantity();
        });
    }
    
    // Barcode input enter key
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') processBarcode();
        });
    }
    
    // Customer select change
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.addEventListener('change', function() {
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
    }
    
    console.log('Event listeners setup completed');
}

// Tab değiştirme fonksiyonu
function switchTab(tabName) {
    // Tüm tab panellerini gizle
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Tüm tabları deaktive et
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Seçili tabı ve paneli aktif et
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedPane = document.getElementById(`${tabName}Tab`);
    
    if (selectedTab && selectedPane) {
        selectedTab.classList.add('active');
        selectedPane.classList.add('active');
    }
}

// State management functions
function saveAppState() {
    const state = {
        selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
        selectedPersonnelId: document.getElementById('personnelSelect')?.value,
        currentContainer: currentContainer,
    };
    localStorage.setItem('procleanState', JSON.stringify(state));
}

function loadAppState() {
    const savedState = localStorage.getItem('procleanState');
    if (savedState) {
        const state = JSON.parse(savedState);
        
        // Müşteri seçimini geri yükle
        if (state.selectedCustomerId) {
            const customerSelect = document.getElementById('customerSelect');
            if (customerSelect) {
                customerSelect.value = state.selectedCustomerId;
                const option = customerSelect.querySelector(`option[value="${state.selectedCustomerId}"]`);
                if (option) {
                    selectedCustomer = {
                        id: state.selectedCustomerId,
                        name: option.textContent.split(' (')[0],
                        code: option.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                    };
                }
            }
        }
        
        // Personel seçimini geri yükle
        if (state.selectedPersonnelId) {
            const personnelSelect = document.getElementById('personnelSelect');
            if (personnelSelect) {
                personnelSelect.value = state.selectedPersonnelId;
            }
        }
        
        // Konteyner bilgisini geri yükle
        if (state.currentContainer) {
            currentContainer = state.currentContainer;
            const containerNumber = document.getElementById('containerNumber');
            if (containerNumber) {
                containerNumber.textContent = currentContainer;
            }
        }
    }
}

// Çevrimdışı destek
function setupOfflineSupport() {
    window.addEventListener('online', () => {
        const offlineIndicator = document.getElementById('offlineIndicator');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (offlineIndicator) offlineIndicator.style.display = 'none';
        if (connectionStatus) connectionStatus.textContent = 'Çevrimiçi';
        
        showAlert('Çevrimiçi moda geçildi. Veriler senkronize ediliyor...', 'success');
        syncOfflineData();
    });

    window.addEventListener('offline', () => {
        const offlineIndicator = document.getElementById('offlineIndicator');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (offlineIndicator) offlineIndicator.style.display = 'block';
        if (connectionStatus) connectionStatus.textContent = 'Çevrimdışı';
        
        showAlert('Çevrimdışı moda geçildi. Değişiklikler internet bağlantısı sağlandığında senkronize edilecek.', 'warning');
    });

    // Başlangıçta çevrimiçi durumu kontrol et
    if (!navigator.onLine) {
        const offlineIndicator = document.getElementById('offlineIndicator');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (offlineIndicator) offlineIndicator.style.display = 'block';
        if (connectionStatus) connectionStatus.textContent = 'Çevrimdışı';
    }
}

// Çevrimdışı verileri senkronize et
async function syncOfflineData() {
    const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
    
    if (Object.keys(offlineData).length === 0) return;
    
    showAlert('Çevrimdışı veriler senkronize ediliyor...', 'warning');
    
    try {
        // Paketleri senkronize et
        if (offlineData.packages && offlineData.packages.length > 0) {
            for (const pkg of offlineData.packages) {
                const { error } = await supabase
                    .from('packages')
                    .insert([pkg]);
                
                if (error) console.error('Paket senkronizasyon hatası:', error);
            }
        }
        
        // Barkodları senkronize et
        if (offlineData.barcodes && offlineData.barcodes.length > 0) {
            for (const barcode of offlineData.barcodes) {
                const { error } = await supabase
                    .from('barcodes')
                    .insert([barcode]);
                
                if (error) console.error('Barkod senkronizasyon hatası:', error);
            }
        }
        
        // Stok güncellemelerini senkronize et
        if (offlineData.stockUpdates && offlineData.stockUpdates.length > 0) {
            for (const update of offlineData.stockUpdates) {
                const { error } = await supabase
                    .from('stock_items')
                    .update({ quantity: update.quantity })
                    .eq('code', update.code);
                
                if (error) console.error('Stok senkronizasyon hatası:', error);
            }
        }
        
        // Başarılı senkronizasyondan sonra çevrimdışı verileri temizle
        localStorage.removeItem('procleanOfflineData');
        showAlert('Çevrimdışı veriler başarıyla senkronize edildi', 'success');
        
    } catch (error) {
        console.error('Senkronizasyon hatası:', error);
        showAlert('Veri senkronizasyonu sırasında hata oluştu', 'error');
    }
}

// Çevrimdışı veri kaydetme
function saveOfflineData(type, data) {
    const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
    
    if (!offlineData[type]) {
        offlineData[type] = [];
    }
    
    offlineData[type].push(data);
    localStorage.setItem('procleanOfflineData', JSON.stringify(offlineData));
}

// Data loading functions
async function populateCustomers() {
    try {
        if (!elements.customerSelect) {
            console.error('Customer select element not found');
            showAlert('Müşteri seçim alanı bulunamadı', 'error');
            return;
        }
        
        // Clear dropdown
        elements.customerSelect.innerHTML = '<option value="">Müşteri seçin...</option>';
        
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (error) {
            handleSupabaseError(error, 'Müşteri yükleme');
            return;
        }

        if (customers && customers.length > 0) {
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.code})`;
                elements.customerSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error in populateCustomers:', error);
        showAlert('Müşteri yükleme hatası: ' + error.message, 'error');
    }
}

async function populatePersonnel() {
    try {
        // Dropdown'u temizle
        elements.personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';
        
        const { data: personnel, error } = await supabase
            .from('personnel')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading personnel:', error);
            // Add default current user
            const option = document.createElement('option');
            option.value = currentUser?.uid || 'default';
            option.textContent = currentUser?.name || 'Mevcut Kullanıcı';
            option.selected = true;
            elements.personnelSelect.appendChild(option);
            return;
        }

        if (personnel && personnel.length > 0) {
            personnel.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                elements.personnelSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error in populatePersonnel:', error);
        // Add default current user
        const option = document.createElement('option');
        option.value = currentUser?.uid || 'default';
        option.textContent = currentUser?.name || 'Mevcut Kullanıcı';
        option.selected = true;
        elements.personnelSelect.appendChild(option);
    }
}

// Yardımcı fonksiyonlar
function closeAllModals() {
    const modals = [
        'customerModal', 'allCustomersModal', 'emailModal', 
        'quantityModal', 'manualModal', 'containerDetailModal', 'settingsModal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    });
}

function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
});

// Sayfa yüklendiğinde çalışacak ana fonksiyon
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded, starting application setup...');
    
    // Wait a bit for all elements to be available
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize elements
    if (typeof initializeElementsObject === 'function') {
        initializeElementsObject();
    }
    
    // Retry missing elements with more attempts
    await retryMissingElements(20, 300);
    
    // Load API key and initialize Supabase
    if (typeof loadApiKey === 'function') {
        loadApiKey();
    }
    
    if (typeof initializeSupabase === 'function') {
        initializeSupabase();
    }
    
    // Setup auth listener
    if (typeof setupAuthListener === 'function') {
        setupAuthListener();
    }
    
    // Setup offline support
    setupOfflineSupport();
    
    // Setup event listeners
    if (typeof setupEventListeners === 'function') {
        setupEventListeners();
    }
    
    // Check if user is already logged in
    if (supabase && currentUser) {
        await initApp();
    }
});
