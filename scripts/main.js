// Initialize application
async function initApp() {
    initializeElementsObject();
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
    
    // Populate dropdowns
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load data
    await populatePackagesTable();
    await populateStockTable();
    await populateShippingTable();
    
    // Test connection
    await testConnection();
    
    // Set up auto-save
    setInterval(saveAppState, 5000); // Save every 5 seconds
    
    // Set up offline support
    setupOfflineSupport();
    
    // Set up barcode scanner listener
    setupBarcodeScanner();
}

// State management functions
function saveAppState() {
    const state = {
        selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
        selectedPersonnelId: elements.personnelSelect.value,
        currentContainer: currentContainer,
    };
    localStorage.setItem('procleanState', JSON.stringify(state));
}

function loadAppState() {
    const savedState = localStorage.getItem('procleanState');
    if (savedState) {
        const state = JSON.parse(savedState);
        
        // Restore customer selection
        if (state.selectedCustomerId) {
            elements.customerSelect.value = state.selectedCustomerId;
            // Find and set the selectedCustomer object
            const option = elements.customerSelect.querySelector(`option[value="${state.selectedCustomerId}"]`);
            if (option) {
                selectedCustomer = {
                    id: state.selectedCustomerId,
                    name: option.textContent.split(' (')[0],
                    code: option.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                };
            }
        }
        
        // Restore personnel selection
        if (state.selectedPersonnelId) {
            elements.personnelSelect.value = state.selectedPersonnelId;
        }
        
        // Restore current container
        if (state.currentContainer) {
            currentContainer = state.currentContainer;
            elements.containerNumber.textContent = currentContainer;
        }
    }
}

function clearAppState() {
    localStorage.removeItem('procleanState');
    selectedCustomer = null;
    elements.customerSelect.value = '';
    elements.personnelSelect.value = '';
    currentContainer = null;
    elements.containerNumber.textContent = 'Yok';
    currentPackage = {};
    
    // Reset quantity badges
    document.querySelectorAll('.quantity-badge').forEach(badge => {
        badge.textContent = '0';
    });
    
    // Clear package details
    document.getElementById('packageDetailContent').innerHTML = 
        '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';
}

// Çevrimdışı destek
function setupOfflineSupport() {
    window.addEventListener('online', () => {
        document.getElementById('offlineIndicator').style.display = 'none';
        elements.connectionStatus.textContent = 'Çevrimiçi';
        showAlert('Çevrimiçi moda geçildi. Veriler senkronize ediliyor...', 'success');
        syncOfflineData();
    });

    window.addEventListener('offline', () => {
        document.getElementById('offlineIndicator').style.display = 'block';
        elements.connectionStatus.textContent = 'Çevrimdışı';
        showAlert('Çevrimdışı moda geçildi. Değişiklikler internet bağlantısı sağlandığında senkronize edilecek.', 'warning');
    });

    // Başlangıçta çevrimiçi durumu kontrol et
    if (!navigator.onLine) {
        document.getElementById('offlineIndicator').style.display = 'block';
        elements.connectionStatus.textContent = 'Çevrimdışı';
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

// Tab click events
function switchTab(tabName) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate selected tab
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedPane = document.getElementById(`${tabName}Tab`);
    
    if (selectedTab && selectedPane) {
        selectedTab.classList.add('active');
        selectedPane.classList.add('active');
    }
}

// Utility functions
function closeAllModals() {
    document.getElementById('customerModal').style.display = 'none';
    document.getElementById('allCustomersModal').style.display = 'none';
    document.getElementById('emailModal').style.display = 'none';
    document.getElementById('quantityModal').style.display = 'none';
    document.getElementById('manualModal').style.display = 'none';
    document.getElementById('containerDetailModal').style.display = 'none';
}

function closeModal() {
    document.getElementById('customerModal').style.display = 'none';
}

function closeAllCustomersModal() {
    document.getElementById('allCustomersModal').style.display = 'none';
}

function closeQuantityModal() {
    document.getElementById('quantityModal').style.display = 'none';
}

function closeManualModal() {
    document.getElementById('manualModal').style.display = 'none';
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn('Email modal not found');
    }
}

function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
            errorError.style.display = 'block';
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

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function checkOnlineStatus() {
    if (!navigator.onLine) {
        showAlert("Çevrimdışı Mod: İnternet yok, bazı işlemler çalışmayacak", "error");
        return false;
    }
    return true;
}

// API hata yönetimi
function handleSupabaseError(error, context) {
    console.error(`Supabase error in ${context}:`, error);
    
    let userMessage = `${context} sırasında bir hata oluştu.`;
    
    if (error.code === '42501') {
        userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
    } else if (error.code === '42P01') {
        userMessage = 'Veritabanı tablosu bulunamadı. Lütfen yönetici ile iletişime geçin.';
    } else if (error.code === '08006') {
        userMessage = 'Veritabanı bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
    } else if (error.message) {
        userMessage += ' ' + error.message;
    }
    
    showAlert(userMessage, 'error');
    
    // Switch to offline mode if connection issue
    if (!navigator.onLine && elements.connectionStatus) {
        elements.connectionStatus.textContent = 'Çevrimdışı';
        document.getElementById('offlineIndicator')?.style.setProperty('display', 'block');
    }
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
});

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // API anahtarını yükle ve supabase'i başlat
    if (loadApiKey()) {
        supabase = initializeSupabase();
        if (supabase) {
            setupAuthListener();
        }
    } else {
        showApiKeyModal();
    }
    
     // Login button event
    document.getElementById('loginBtn').addEventListener('click', login);
    
    // Logout button event
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Enter key for login
    document.getElementById('email').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    // Quantity modal enter key
    if (elements.quantityInput) {
        elements.quantityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') confirmQuantity();
        });
    }
    
    // Barcode input enter key
    if (elements.barcodeInput) {
        elements.barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') processBarcode();
        });
    }
    
    // Tab click events
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Customer select change
    if (elements.customerSelect) {
        elements.customerSelect.addEventListener('change', function() {
            const customerId = this.value;
            if (customerId) {
                // Find customer from populated options
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
    
    // Initial state
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';

    console.log('ProClean application initialized with Supabase authentication');
});

// scripts/main.js

// Add this function to check if elements exist before accessing them
function ensureElementLoaded(id, callback, maxAttempts = 50, interval = 100) {
    let attempts = 0;
    const checkExist = setInterval(function() {
        attempts++;
        const element = document.getElementById(id);
        if (element) {
            clearInterval(checkExist);
            callback(element);
        } else if (attempts >= maxAttempts) {
            clearInterval(checkExist);
            console.error(`Element with ID '${id}' not found after ${maxAttempts} attempts`);
        }
    }, interval);
}

// Modify your initApp function
async function initApp() {
    initializeElementsObject();
    
    // Wait for elements to be loaded before accessing them
    ensureElementLoaded('currentDate', (element) => {
        element.textContent = new Date().toLocaleDateString('tr-TR');
    });
    
    // Populate dropdowns
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load data
    await populatePackagesTable();
    await populateStockTable();
    await populateShippingTable();
    
    // Test connection
    await testConnection();
    
    // Set up auto-save
    setInterval(saveAppState, 5000);
    
    // Set up offline support
    setupOfflineSupport();
    
    // Set up barcode scanner listener
    setupBarcodeScanner();
}
