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

// Initialize application
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
