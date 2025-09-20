// Supabase initialization - Singleton pattern to prevent multiple instances
const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
let SUPABASE_ANON_KEY = null;
let supabase = null;

// In supabase.js, replace scattered globals with:
const AppState = {
    supabase: null,
    currentUser: null,
    selectedCustomer: null,
    currentPackage: {},
    currentContainer: null,
    selectedProduct: null,
    scannedBarcodes: [],
    editingStockItem: null,
    scannerMode: false,
    currentContainerDetails: null,
    currentReportData: null,
    selectedPackageForPrinting: null
};

// Update all references to use AppState.variableName
// Global elements cache
const elements = {};

// Show alert function - available globally
function showAlert(message, type = 'info', duration = 3000) {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Try to use existing alert system if available
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        alertContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    } else {
        // Fallback: create temporary alert container
        let tempContainer = document.getElementById('tempAlertContainer');
        if (!tempContainer) {
            tempContainer = document.createElement('div');
            tempContainer.id = 'tempAlertContainer';
            tempContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(tempContainer);
        }
        
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : '#3498db'};
            color: white;
            padding: 10px 15px;
            margin: 5px 0;
            border-radius: 5px;
            font-size: 14px;
        `;
        alertDiv.textContent = message;
        tempContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }
}

// EmailJS initialization with error handling
(function() {
    try {
        if (typeof emailjs !== 'undefined') {
            emailjs.init("jH-KlJ2ffs_lGwfsp");
            console.log('EmailJS initialized successfully');
        } else {
            console.warn('EmailJS library not loaded');
        }
    } catch (error) {
        console.warn('EmailJS initialization failed:', error);
    }
})();


// Modified initializeElementsObject - only check for elements that should exist on page load
// Modified initializeElementsObject with retry
function initializeElementsObject(retryCount = 0) {
    const pageLoadElements = {
        loginScreen: 'loginScreen',
        loginButton: 'loginBtn',
        emailInput: 'email',
        passwordInput: 'password',
        apiKeyModal: 'apiKeyModal',
        apiKeyInput: 'apiKeyInput',
        alertContainer: 'alertContainer',
        toast: 'toast',
        logoutBtn: 'logoutBtn',
        settingsBtn: 'settingsBtn',
        userRole: 'userRole',
        offlineIndicator: 'offlineIndicator'
    };

    let foundCount = 0;
    let missingKeys = [];

    // Initialize all as null first
    Object.keys(pageLoadElements).forEach(key => {
        elements[key] = document.getElementById(pageLoadElements[key]) || null;
        if (elements[key]) {
            foundCount++;
        } else {
            missingKeys.push(pageLoadElements[key]);
        }
    });

    if (missingKeys.length > 0) {
        console.warn(
            `Missing elements: ${missingKeys.join(", ")} (try ${retryCount})`
        );
        // retry up to 5 times, waiting 500ms between tries
        if (retryCount < 5) {
            setTimeout(() => initializeElementsObject(retryCount + 1), 500);
        }
    }

    console.log(`Page elements initialized: ${foundCount} found`);
    return elements;
}




// Call this after login to initialize app elements
function initializeAppElements() {
    const appElements = {
        appContainer: 'appContainer',
        customerSelect: 'customerSelect',
        personnelSelect: 'personnelSelect',
        currentDate: 'currentDate',
        barcodeInput: 'barcodeInput',
        packagesTableBody: 'packagesTableBody',
        packageDetailContent: 'packageDetailContent',
        shippingFolders: 'shippingFolders',
        stockTableBody: 'stockTableBody',
        containerNumber: 'containerNumber',
        totalPackages: 'totalPackages',
        shippingFilter: 'shippingFilter',
        stockSearch: 'stockSearch',
        selectAllPackages: 'selectAllPackages',
        scannedBarcodes: 'scannedBarcodes',
        connectionStatus: 'connectionStatus',
        scannerToggle: 'scannerToggle',
        containerSearch: 'containerSearch'
    };
    
    let foundCount = 0;
    
    Object.keys(appElements).forEach(key => {
        const element = document.getElementById(appElements[key]);
        if (element) {
            elements[key] = element;
            foundCount++;
        }
    });
    
    console.log(`App elements initialized: ${foundCount} found`);
    return foundCount;
}

// Call this when modals are needed to initialize modal elements
function initializeModalElements() {
    const modalElements = {
        customerList: 'customerList',
        allCustomersList: 'allCustomersList',
        quantityInput: 'quantityInput',
        quantityModal: 'quantityModal',
        quantityModalTitle: 'quantityModalTitle',
        settingsModal: 'settingsModal',
        closeSettingsModalBtn: 'closeSettingsModalBtn'
    };
    
    let foundCount = 0;
    
    Object.keys(modalElements).forEach(key => {
        if (!elements[key]) { // Only check if not already found
            const element = document.getElementById(modalElements[key]);
            if (element) {
                elements[key] = element;
                foundCount++;
            }
        }
    });
    
    if (foundCount > 0) {
        console.log(`Modal elements initialized: ${foundCount} found`);
    }
    
    return foundCount;
}





// FIXED: Singleton Supabase initialization
function initializeSupabase() {
    // Return existing client if already initialized
    if (supabase) {
        console.log('Using existing Supabase client');
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set');
        return null;
    }
    
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded');
        showAlert('Supabase kütüphanesi yüklenmemiş', 'error');
        return null;
    }
    
    try {
        // Create client only once
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        showAlert('Supabase başlatılamadı: ' + error.message, 'error');
        return null;
    }
}

// API anahtarını kaydet
function saveApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (!apiKeyInput) {
        showAlert('API key input bulunamadı', 'error');
        return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    // API key'i ayarla
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    // Eğer zaten bir client varsa, yeni key ile yeniden başlat
    if (supabase) {
        supabase = null; // Clear existing client
    }
    
    // Yeni client oluştur
    const newClient = initializeSupabase();
    
    if (newClient) {
        document.getElementById('apiKeyModal').style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
        
        // Auth listener'ı kur ve bağlantı test et
        setupAuthListener();
        setTimeout(() => testConnection(), 1000);
    } else {
        showAlert('API anahtarı geçersiz. Lütfen kontrol edin.', 'error');
    }
}

// API anahtarı modalını göster
function showApiKeyModal() {
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    if (apiKeyModal && apiKeyInput) {
        apiKeyInput.value = SUPABASE_ANON_KEY || '';
        apiKeyModal.style.display = 'flex';
    } else {
        console.error('API key modal elements not found');
        // Fallback: prompt user
        const key = prompt('Lütfen Supabase API anahtarınızı girin:');
        if (key) {
            SUPABASE_ANON_KEY = key;
            localStorage.setItem('procleanApiKey', key);
            initializeSupabase();
        }
    }
}

// Test connection with better error handling
async function testConnection() {
    if (!supabase) {
        console.warn('Supabase client not initialized for connection test');
        showAlert('Supabase istemcisi başlatılmadı', 'error');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        console.log('Supabase connection test successful');
        showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        showAlert('Veritabanına bağlanılamıyor. API anahtarınızı kontrol edin.', 'error');
        return false;
    }
}

// Auth listener setup
function setupAuthListener() {
    if (!supabase) {
        console.warn('Cannot setup auth listener: Supabase not initialized');
        return;
    }
    
    try {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change:', event, session?.user?.email || 'No user');
            
            if (session?.user) {
                currentUser = {
                    email: session.user.email,
                    uid: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    role: 'operator' // Default role
                };
                
                // Update UI
                const userRoleElement = document.getElementById('userRole');
                if (userRoleElement) {
                    userRoleElement.textContent = `Operatör: ${currentUser.name}`;
                }
                
                // Show main app
                const loginScreen = document.getElementById('loginScreen');
                const appContainer = document.getElementById('appContainer');
                
                if (loginScreen) loginScreen.style.display = 'none';
                if (appContainer) appContainer.style.display = 'flex';
                
                // Initialize app data
                initializeAppData();
                
            } else {
                // Show login screen
                const loginScreen = document.getElementById('loginScreen');
                const appContainer = document.getElementById('appContainer');
                
                if (loginScreen) loginScreen.style.display = 'flex';
                if (appContainer) appContainer.style.display = 'none';
                
                currentUser = null;
            }
        });
        
        console.log('Auth listener setup complete');
    } catch (error) {
        console.error('Error setting up auth listener:', error);
    }
}

// Login function
async function login() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (!emailInput || !passwordInput) {
        showAlert('Email veya şifre alanı bulunamadı', 'error');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        showAlert('Email ve şifre gereklidir', 'error');
        return;
    }
    
    if (!supabase) {
        showAlert('Önce API anahtarını girin', 'error');
        showApiKeyModal();
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Giriş yapılıyor...';
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) {
            showAlert(`Giriş başarısız: ${error.message}`, 'error');
            return;
        }
        
        if (data.user) {
            showAlert('Giriş başarılı!', 'success');
            // Auth listener will handle the rest
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Giriş sırasında bir hata oluştu', 'error');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Giriş Yap';
        }
    }
}

// Logout function
async function logout() {
    if (!supabase) return;
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showAlert('Başarıyla çıkış yapıldı', 'success');
        
        // Clear form fields
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Çıkış yapılırken bir hata oluştu', 'error');
    }
}

// Initialize app data after login
async function initializeAppData() {
    try {
        console.log('Initializing app data...');
        
        // Set current date
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            currentDateElement.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        // Load customers, personnel, etc.
        // Add your data loading functions here
        
        showAlert('Uygulama verileri yüklendi', 'success', 2000);
        
    } catch (error) {
        console.error('Error initializing app data:', error);
        showAlert('Uygulama verileri yüklenirken hata oluştu', 'error');
    }
}

// Settings functions
function showSettingsModal() {
initializeModalElements();   
    console.log('Opening settings modal...');
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error('Settings modal not found');
        showAlert('Ayarlar modalı bulunamadı', 'error');
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Helper functions
function getSupabaseClient() {
    return supabase;
}

function isSupabaseReady() {
    return supabase !== null && SUPABASE_ANON_KEY !== null;
}

// Event listener setup
function setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
        console.log('Login button listener added');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('Logout button listener added');
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
        console.log('Settings button listener added');
    }
    
    // Close settings modal
    const closeSettingsBtn = document.getElementById('closeSettingsModalBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    
    // Email and password inputs for enter key
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
    
    // API key input for enter key
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveApiKey();
            }
        });
    }
    
    // Modal close on outside click
    window.addEventListener('click', function(event) {
        const settingsModal = document.getElementById('settingsModal');
        const apiKeyModal = document.getElementById('apiKeyModal');
        
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
        
        if (event.target === apiKeyModal) {
            apiKeyModal.style.display = 'none';
        }
    });
    
    console.log('Event listeners setup complete');
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Initializing ProClean application...');
        
        // Initialize elements first
        initializeElementsObject();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load API key and initialize Supabase
        const savedApiKey = localStorage.getItem('procleanApiKey');
        if (savedApiKey) {
            SUPABASE_ANON_KEY = savedApiKey;
            console.log('API key loaded from localStorage');
            
            const client = initializeSupabase();
            if (client) {
                setupAuthListener();
                
                // Test connection after a delay
                setTimeout(() => {
                    testConnection().then(isConnected => {
                        if (!isConnected) {
                            showApiKeyModal();
                        }
                    });
                }, 1000);
            }
        } else {
            console.log('No saved API key found');
            // Show API key modal after a short delay
            setTimeout(() => {
                showApiKeyModal();
            }, 1000);
        }
        
        // Set initial display states
        const loginScreen = document.getElementById('loginScreen');
        const appContainer = document.getElementById('appContainer');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Critical error during initialization:', error);
        showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
        
        // Show fallback UI
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
                <h2 style="color: #e74c3c;">Uygulama Başlatılamadı</h2>
                <p>Bir hata oluştu: ${error.message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Sayfayı Yenile
                </button>
            </div>
        `;
    }
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showAlert('Bir işlem tamamlanamadı. Lütfen tekrar deneyin.', 'error');
});
