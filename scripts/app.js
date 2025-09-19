// scripts/app.js

// Retry mechanism for DOM elements (also add this to auth.js if not already there)
function waitForElement(id, maxAttempts = 50, interval = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkElement = setInterval(() => {
            attempts++;
            const element = document.getElementById(id);
            if (element) {
                clearInterval(checkElement);
                resolve(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkElement);
                reject(new Error(`Element with ID '${id}' not found after ${maxAttempts} attempts`));
            }
        }, interval);
    });
}

// Safe element operations
async function safeSetElementText(elementId, text, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.textContent = text;
    } catch (error) {
        console.warn(error.message);
    }
}

async function safeSetElementDisplay(elementId, displayValue, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.style.display = displayValue;
    } catch (error) {
        console.warn(error.message);
    }
}

// Initialize application
async function initApp() {
    console.log('Initializing ProClean application...');
    
    try {
        // Önce kritik elementlerin yüklenmesini bekle
        await waitForElement('currentDate');
        await waitForElement('customerSelect');
        await waitForElement('personnelSelect');
        
        // Tarihi güncelle
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            currentDateElement.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        // Dropdown'ları doldur
        await populateCustomers();
        await populatePersonnel();
        
        // Kayıtlı durumu yükle
        loadAppState();
        
        // Verileri yükle
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        // Bağlantı testi
        await testConnection();
        
        // Event listener'ları kur
        setupEventListeners();
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Application initialization failed:', error);
        showAlert('Uygulama başlatılırken hata oluştu. Sayfayı yenileyin.', 'error');
    }
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, starting application setup...');
    
    // Önce elementleri initialize et
    if (typeof initializeElementsObject === 'function') {
        initializeElementsObject();
    }
    
    // API anahtarını yükle ve supabase'i başlat
    if (typeof loadApiKey === 'function') {
        loadApiKey();
    }
    
    // Auth listener'ı kur
    if (typeof setupAuthListener === 'function') {
        setupAuthListener();
    }
    
    // Çevrimdışı desteği etkinleştir
    setupOfflineSupport();
    
    // Auto-save mekanizmasını kur
    setInterval(() => {
        if (typeof saveAppState === 'function') {
            saveAppState();
        }
    }, 5000);
});
