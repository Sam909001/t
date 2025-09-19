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
const elements = {};

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
        userRole: 'userRole' // ← ADDED THIS MISSING ELEMENT
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
        showAlert('Supabase istemcisi başlatılmadı. Lütfen API anahtarını girin.', 'error');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        
        if (error) {
            console.error('Supabase connection test failed:', error);
            
            if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                showAlert('API anahtarı geçersiz. Lütfen yeni bir anahtar girin.', 'error');
                showApiKeyModal();
            } else {
                showAlert('Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.', 'error');
            }
            
            return false;
        }
        
        console.log('Supabase connection test successful:', data);
        showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
        return true;
        
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        showAlert('Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.', 'error');
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
