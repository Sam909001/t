// Supabase initialization - Varsayılan değerler
const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
let SUPABASE_ANON_KEY = null;
let supabase = null;

// Global state variables
let selectedCustomer = null;
let currentPackage = {};
let currentContainer = null;
let selectedProduct = null;
let currentUser = null;
let scannedBarcodes = [];
let editingStockItem = null;
let scannerMode = false;
let currentContainerDetails = null;
let currentReportData = null;
let selectedPackageForPrinting = null;

// EmailJS initialization
(function() {
    // EmailJS kullanıcı ID'si - KENDİ ID'NİZİ EKLEYİN
    try {
        emailjs.init("jH-KlJ2ffs_lGwfsp");
        console.log('EmailJS initialized successfully');
    } catch (error) {
        console.warn('EmailJS initialization failed:', error);
    }
})();

// Elementleri bir defa tanımla
// scripts/supabase.js

// Global elements cache
const elements = {};

// Modified initializeElementsObject to handle async loading
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
        userRole: 'userRole'
    };
    
    let foundCount = 0;
    let missingCount = 0;
    
    Object.keys(elementMap).forEach(key => {
        const element = document.getElementById(elementMap[key]);
        if (element) {
            elements[key] = element;
            foundCount++;
        } else {
            console.warn(`Element ${elementMap[key]} not found (will retry later)`);
            elements[key] = null;
            missingCount++;
        }
    });
    
    console.log(`Elements initialized: ${foundCount} found, ${missingCount} missing`);
    return elements;
}

// New function to retry finding missing elements
async function retryMissingElements(maxAttempts = 10, interval = 300) {
    const elementMap = {
        // Same mapping as above
        appContainer: 'appContainer',
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
        containerNumber: 'containerNumber',
        totalPackages: 'totalPackages',
        shippingFilter: 'shippingFilter',
        stockSearch: 'stockSearch',
        selectAllPackages: 'selectAllPackages',
        quantityInput: 'quantityInput',
        quantityModal: 'quantityModal',
        quantityModalTitle: 'quantityModalTitle',
        scannedBarcodes: 'scannedBarcodes',
        connectionStatus: 'connectionStatus',
        scannerToggle: 'scannerToggle',
        containerSearch: 'containerSearch',
        userRole: 'userRole'
    };
    
    let attempts = 0;
    const missingElements = Object.keys(elementMap).filter(key => !elements[key]);
    
    if (missingElements.length === 0) {
        console.log('All elements found, no retry needed');
        return true;
    }
    
    console.log(`Retrying ${missingElements.length} missing elements...`);
    
    return new Promise((resolve) => {
        const intervalId = setInterval(() => {
            attempts++;
            let foundNew = false;
            
            missingElements.forEach(key => {
                if (!elements[key]) {
                    const element = document.getElementById(elementMap[key]);
                    if (element) {
                        elements[key] = element;
                        console.log(`Found element: ${elementMap[key]}`);
                        foundNew = true;
                    }
                }
            });
            
            if (missingElements.every(key => elements[key])) {
                clearInterval(intervalId);
                console.log('All missing elements found!');
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.warn(`Could not find all elements after ${maxAttempts} attempts`);
                resolve(false);
            }
        }, interval);
    });
}




// FIXED: Supabase istemcisini başlat - Singleton pattern ile
function initializeSupabase() {
    // Eğer client zaten oluşturulmuşsa ve API key geçerliyse, mevcut olanı döndür
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set, showing modal');
        showApiKeyModal();
        return null;
    }
    
    try {
        // Global supabase değişkenine ata
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        
        // Set up auth listener after successful initialization
        setupAuthListener();
        
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        showAlert('Supabase başlatılamadı. API anahtarını kontrol edin.', 'error');
        showApiKeyModal();
        return null;
    }
}

// FIXED: API anahtarını kaydet ve istemciyi başlat
function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    // Eski client'ı temizle
    supabase = null;
    
    // Yeni API key'i ayarla
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    // Yeni client oluştur
    const newClient = initializeSupabase();
    
    if (newClient) {
        document.getElementById('apiKeyModal').style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
        testConnection();
    } else {
        showAlert('API anahtarı geçersiz. Lütfen kontrol edin.', 'error');
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

// Test connection with better error handling
async function testConnection() {
    if (!supabase) {
        console.warn('Supabase client not initialized for connection test');
        if (typeof showAlert === 'function') {
            showAlert('Supabase istemcisi başlatılmadı. Lütfen API anahtarını girin.', 'error');
        }
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        console.log('Supabase connection test successful:', data);
        if (typeof showAlert === 'function') {
            showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
        }
        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        if (typeof showAlert === 'function') {
            showAlert('Veritabanına bağlanılamıyor. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin.', 'error');
        }
        return false;
    }
}



// Helper functions
function getSupabaseClient() {
    if (!supabase) {
        return initializeSupabase();
    }
    return supabase;
}

function isSupabaseReady() {
    return supabase !== null && SUPABASE_ANON_KEY !== null;
}

// Sayfa yüklendiğinde API anahtarını localStorage'dan yükle ve uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    // Önce elementleri initialize et
    initializeElementsObject();
    
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        console.log('API key loaded from localStorage');
        
        // Supabase'i başlat ve auth listener'ı kur
        const client = initializeSupabase();
        
        if (client) {
            // Bağlantı testi yap
            setTimeout(() => {
                testConnection().then(isConnected => {
                    if (!isConnected) {
                        // Eğer bağlantı başarısızsa API key modalını göster
                        showApiKeyModal();
                    }
                });
            }, 1000);
        }
    } else {
        // API key yoksa modalı göster
        setTimeout(() => {
            showApiKeyModal();
        }, 500);
    }
    
    // Event listener'ları kur
    setupEventListeners();
});

// Event listener'ları kur
function setupEventListeners() {
    // Login butonu
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    // Email ve password inputları için enter key
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    // API key modalı için event listener'lar
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') saveApiKey();
        });
    }
}

// Add this function to supabase.js
function showAlert(message, type = 'info', duration = 3000) {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Try to use existing alert system if available
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, duration);
    } else {
        // Fallback to browser alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
}
