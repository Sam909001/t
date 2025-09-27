// ==================== SUPABASE CONFIGURATION (AUTH & STORAGE ONLY) ====================
const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
let SUPABASE_ANON_KEY = null;
let supabase = null;

// ==================== GLOBAL STATE VARIABLES ====================
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
let personnelLoaded = false;
let packagesLoaded = false;
let packagesTableLoading = false;

// ==================== LOCAL EXCEL DATABASE ====================
let localData = {
    packages: [],
    containers: [],
    customers: [],
    personnel: [],
    stock_items: [],
    barcodes: [],
    settings: {}
};

// ==================== EMAILJS INITIALIZATION ====================
(function() {
    emailjs.init("jH-KlJ2ffs_lGwfsp");
})();

// ==================== UI ELEMENTS ====================
const elements = {};
const pageSize = 20;
let isShippingTableLoading = false;
let isStockTableLoading = false;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization...');
    
    // Step 1: Initialize UI elements
    initializeUIElements();
    
    // Step 2: Check for XLSX library
    if (!checkXLSXLibrary()) {
        showAlert('Excel kütüphanesi bulunamadı. Lütfen SheetJS kütüphanesini yükleyin.', 'error');
        return;
    }
    
    // Step 3: Initialize local Excel database
    initializeLocalData();
    
    // Step 4: Check authentication state
    checkAuthState();
    
    console.log('Initialization sequence completed');
});

// ==================== UI INITIALIZATION ====================
function initializeUIElements() {
    elements.customerSelect = document.getElementById('customerSelect');
    elements.personnelSelect = document.getElementById('personnelSelect');
    elements.barcodeInput = document.getElementById('barcodeInput');
    elements.packagesTableBody = document.getElementById('packagesTableBody');
    elements.stockTableBody = document.getElementById('stockTableBody');
    elements.shippingFolders = document.getElementById('shippingFolders');
    elements.shippingFilter = document.getElementById('shippingFilter');
    elements.containerSearch = document.getElementById('containerSearch');
    elements.totalPackages = document.getElementById('totalPackages');
    elements.customerList = document.getElementById('customerList');
    elements.allCustomersList = document.getElementById('allCustomersList');
    
    console.log('UI elements initialized');
}

// ==================== AUTHENTICATION FUNCTIONS ====================
function initializeSupabase() {
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized for auth and storage');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return null;
    }
}

async function checkAuthState() {
    try {
        // Check for saved API key
        const savedApiKey = localStorage.getItem('procleanApiKey');
        
        if (savedApiKey) {
            SUPABASE_ANON_KEY = savedApiKey;
            initializeSupabase();
        }
        
        // Check for saved user session in localStorage
        const savedUserData = localStorage.getItem('procleanCurrentUser');
        if (savedUserData) {
            try {
                currentUser = JSON.parse(savedUserData);
                console.log('User session restored:', currentUser);
                showAppScreen();
                return;
            } catch (error) {
                console.error('Error parsing saved user data:', error);
            }
        }
        
        // Check Supabase auth if available
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user) {
                currentUser = {
                    email: session.user.email,
                    uid: session.user.id,
                    name: session.user.email.split('@')[0],
                    role: 'operator'
                };
                
                localStorage.setItem('procleanCurrentUser', JSON.stringify(currentUser));
                showAppScreen();
                return;
            }
        }
        
        // No valid session, show login
        showLoginScreen();
        
    } catch (error) {
        console.error('Auth state check error:', error);
        showLoginScreen();
    }
}

function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    
    console.log('Showing login screen');
}

async function showAppScreen() {
    console.log('Showing app screen for user:', currentUser);
    
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    
    // Initialize app data
    await initializeAppData();
    
    // Setup daily Excel export
    setupDailyExcelExport();
    
    // Update UI with user info
    updateUserInterface();
}

async function login() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showAlert('E-posta ve şifre gerekli', 'error');
        return;
    }
    
    try {
        // Try Supabase authentication if available
        if (supabase) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (!error && data.user) {
                    currentUser = {
                        email: data.user.email,
                        uid: data.user.id,
                        name: data.user.email.split('@')[0],
                        role: 'operator'
                    };
                } else {
                    throw new Error('Invalid credentials');
                }
            } catch (authError) {
                // Fallback to local auth
                console.log('Supabase auth failed, using local auth');
                currentUser = {
                    email: email,
                    uid: 'local_' + Date.now(),
                    name: email.split('@')[0],
                    role: 'operator'
                };
            }
        } else {
            // Local authentication only
            currentUser = {
                email: email,
                uid: 'local_' + Date.now(),
                name: email.split('@')[0],
                role: 'operator'
            };
        }
        
        // Save user session
        localStorage.setItem('procleanCurrentUser', JSON.stringify(currentUser));
        
        showAlert('Giriş başarılı', 'success');
        showAppScreen();
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Giriş başarısız: ' + error.message, 'error');
    }
}

async function logout() {
    try {
        localStorage.removeItem('procleanCurrentUser');
        
        if (supabase) {
            await supabase.auth.signOut();
        }
        
        currentUser = null;
        showLoginScreen();
        showAlert('Çıkış yapıldı', 'success');
        
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Çıkış yapılırken hata oluştu', 'error');
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput')?.value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    const newClient = initializeSupabase();
    
    if (newClient) {
        const modal = document.getElementById('apiKeyModal');
        if (modal) modal.style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
    }
}

// ==================== LOCAL EXCEL DATABASE FUNCTIONS ====================
function initializeLocalData() {
    console.log('Initializing local Excel database...');
    
    const savedData = localStorage.getItem('procleanLocalData');
    
    if (savedData) {
        try {
            localData = JSON.parse(savedData);
            console.log('Existing data loaded:', {
                customers: localData.customers?.length || 0,
                personnel: localData.personnel?.length || 0,
                packages: localData.packages?.length || 0
            });
        } catch (error) {
            console.error('Error parsing local data, creating default:', error);
            localData = createDefaultData();
        }
    } else {
        console.log('No existing data, creating default');
        localData = createDefaultData();
    }
    
    // Ensure all required data exists
    if (!localData.customers || localData.customers.length === 0) {
        localData.customers = [
            {
                id: '1',
                name: 'Yeditepe Otel',
                code: 'YEDITEPE',
                email: 'info@yeditepe.com',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Marmara Otel',
                code: 'MARMARA',
                email: 'info@marmara.com',
                created_at: new Date().toISOString()
            }
        ];
    }
    
    if (!localData.personnel || localData.personnel.length === 0) {
        localData.personnel = [
            {
                id: '1',
                name: 'Ahmet Yılmaz',
                role: 'Operator',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Mehmet Demir',
                role: 'Supervisor',
                created_at: new Date().toISOString()
            }
        ];
    }
    
    // Ensure other arrays exist
    if (!localData.packages) localData.packages = [];
    if (!localData.containers) localData.containers = [];
    if (!localData.stock_items) localData.stock_items = [];
    if (!localData.barcodes) localData.barcodes = [];
    if (!localData.settings) localData.settings = {};
    
    saveLocalData();
    console.log('Local Excel database initialized');
}

function createDefaultData() {
    return {
        packages: [],
        customers: [
            {
                id: '1',
                name: 'Örnek Otel',
                code: 'OTEL001',
                email: 'info@ornekotel.com',
                created_at: new Date().toISOString()
            }
        ],
        personnel: [
            {
                id: '1',
                name: 'Admin Kullanıcı',
                role: 'Admin',
                created_at: new Date().toISOString()
            }
        ],
        containers: [],
        stock_items: [
            {
                id: '1',
                code: 'ITM001',
                name: 'Deterjan',
                quantity: 50,
                unit: 'Adet',
                updated_at: new Date().toISOString()
            }
        ],
        barcodes: [],
        settings: {
            lastBackup: null,
            autoBackup: true,
            dailyExportEnabled: true
        }
    };
}

function saveLocalData() {
    try {
        localStorage.setItem('procleanLocalData', JSON.stringify(localData));
        console.log('Local data saved');
    } catch (error) {
        console.error('Error saving local data:', error);
        showAlert('Veri kaydedilirken hata oluştu', 'error');
    }
}

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ==================== APP DATA INITIALIZATION ====================
async function initializeAppData() {
    console.log('Initializing app data...');
    
    try {
        // Populate all dropdowns and tables from Excel database
        await populateCustomers();
        await populatePersonnel();
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        // Set up form event listeners
        initializeFormElements();
        
        console.log('App data initialization completed');
    } catch (error) {
        console.error('Error initializing app data:', error);
        showAlert('Veri yükleme hatası', 'error');
    }
}

function initializeFormElements() {
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.addEventListener('change', function() {
            const customerId = this.value;
            if (customerId) {
                selectedCustomer = localData.customers.find(c => c.id === customerId);
                console.log('Customer selected:', selectedCustomer);
            } else {
                selectedCustomer = null;
            }
        });
    }
    
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                processBarcode();
            }
        });
    }
    
    console.log('Form elements initialized');
}

function updateUserInterface() {
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement && currentUser) {
        userRoleElement.textContent = `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

// ==================== EXCEL EXPORT FUNCTIONS ====================
function checkXLSXLibrary() {
    if (typeof XLSX === 'undefined') {
        console.error('XLSX library not loaded');
        return false;
    }
    return true;
}

function setupDailyExcelExport() {
    const today = new Date().toDateString();
    const lastExport = localStorage.getItem('lastExcelExport');
    
    if (lastExport !== today) {
        setTimeout(() => {
            exportAllDataToExcel();
            localStorage.setItem('lastExcelExport', today);
        }, 5000);
    }
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
        exportAllDataToExcel();
        localStorage.setItem('lastExcelExport', new Date().toDateString());
        setInterval(exportAllDataToExcel, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

function exportAllDataToExcel(manual = false) {
    if (!checkXLSXLibrary()) return;
    
    try {
        const wb = XLSX.utils.book_new();
        const timestamp = new Date().toISOString().slice(0, 10);
        
        const worksheets = [
            { name: 'Packages', data: localData.packages },
            { name: 'Customers', data: localData.customers },
            { name: 'Personnel', data: localData.personnel },
            { name: 'Containers', data: localData.containers },
            { name: 'Stock', data: localData.stock_items },
            { name: 'Barcodes', data: localData.barcodes },
            { name: 'Summary', data: [generateSummaryData()] }
        ];
        
        worksheets.forEach(sheet => {
            if (sheet.data && sheet.data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheet.data);
                XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            }
        });
        
        XLSX.writeFile(wb, `ProClean_Data_${timestamp}.xlsx`);
        
        if (manual) {
            showAlert('Excel dosyası başarıyla kaydedildi', 'success');
        }
        
        // Upload to Supabase storage if available
        if (supabase && manual) {
            uploadExcelToSupabase(wb, `ProClean_Data_${timestamp}.xlsx`);
        }
        
    } catch (error) {
        console.error('Excel export error:', error);
        showAlert('Excel export hatası: ' + error.message, 'error');
    }
}

async function uploadExcelToSupabase(workbook, fileName) {
    if (!supabase) return;
    
    try {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const { error } = await supabase.storage
            .from('daily-data')
            .upload(fileName, blob, { upsert: true });
        
        if (error) throw error;
        console.log('Excel uploaded to Supabase storage');
        
    } catch (error) {
        console.error('Supabase upload error:', error);
    }
}

function generateSummaryData() {
    return {
        export_date: new Date().toISOString(),
        total_packages: localData.packages.length,
        waiting_packages: localData.packages.filter(p => p.status === 'beklemede').length,
        shipped_packages: localData.packages.filter(p => p.status === 'sevk-edildi').length,
        total_customers: localData.customers.length,
        total_containers: localData.containers.length,
        total_stock_items: localData.stock_items.length,
        low_stock_items: localData.stock_items.filter(item => item.quantity < 10).length
    };
}

// ==================== CUSTOMER MANAGEMENT ====================
async function populateCustomers() {
    try {
        console.log('Populating customers dropdown...');
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) {
            console.error('Customer select element not found');
            return;
        }
        
        const currentValue = customerSelect.value;
        customerSelect.innerHTML = '<option value="">Müşteri Seç</option>';
        
        if (!localData.customers || localData.customers.length === 0) {
            console.warn('No customers available');
            return;
        }
        
        localData.customers.forEach(customer => {
            const opt = document.createElement('option');
            opt.value = customer.id;
            opt.textContent = `${customer.name} (${customer.code})`;
            customerSelect.appendChild(opt);
        });
        
        if (currentValue && localData.customers.some(c => c.id === currentValue)) {
            customerSelect.value = currentValue;
        }
        
        console.log(`Populated ${localData.customers.length} customers`);
    } catch (error) {
        console.error('populateCustomers error:', error);
    }
}

async function addNewCustomer() {
    const code = document.getElementById('newCustomerCode')?.value.trim();
    const name = document.getElementById('newCustomerName')?.value.trim();
    const email = document.getElementById('newCustomerEmail')?.value.trim();
    
    if (!code || !name) {
        showAlert('Müşteri kodu ve adı gerekli', 'error');
        return;
    }
    
    try {
        const newCustomer = {
            id: generateId(),
            code: code,
            name: name,
            email: email || null,
            created_at: new Date().toISOString()
        };
        
        localData.customers.push(newCustomer);
        saveLocalData();
        
        showAlert('Müşteri başarıyla eklendi', 'success');
        
        // Clear form
        document.getElementById('newCustomerCode').value = '';
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerEmail').value = '';
        
        await populateCustomers();
        await showAllCustomers();
        
    } catch (error) {
        console.error('Error adding customer:', error);
        showAlert('Müşteri ekleme hatası', 'error');
    }
}

async function deleteCustomer(customerId) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    
    try {
        localData.customers = localData.customers.filter(c => c.id !== customerId);
        saveLocalData();
        
        showAlert('Müşteri başarıyla silindi', 'success');
        await populateCustomers();
        await showAllCustomers();
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        showAlert('Müşteri silme hatası', 'error');
    }
}

async function showCustomers() {
    try {
        if (!elements.customerList) return;
        
        elements.customerList.innerHTML = '';
        
        localData.customers.forEach(customer => {
            const div = document.createElement('div');
            div.className = 'customer-item';
            div.innerHTML = `
                <div>
                    <strong>${customer.name}</strong><br>
                    <small>${customer.code}</small>
                </div>
            `;
            div.onclick = () => selectCustomerFromModal(customer);
            elements.customerList.appendChild(div);
        });
        
        const modal = document.getElementById('customerModal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error showing customers:', error);
        showAlert('Müşteri listesi yükleme hatası', 'error');
    }
}

async function showAllCustomers() {
    try {
        if (!elements.allCustomersList) return;
        
        elements.allCustomersList.innerHTML = '';
        
        localData.customers.forEach(customer => {
            const div = document.createElement('div');
            div.className = 'customer-item';
            div.innerHTML = `
                <div>
                    <strong>${customer.name}</strong> (${customer.code})<br>
                    <small>${customer.email || 'E-posta yok'}</small>
                </div>
                <button onclick="deleteCustomer('${customer.id}')" class="btn btn-danger btn-sm">Sil</button>
            `;
            elements.allCustomersList.appendChild(div);
        });
        
        const modal = document.getElementById('allCustomersModal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error showing all customers:', error);
        showAlert('Müşteri yönetimi yükleme hatası', 'error');
    }
}

function selectCustomerFromModal(customer) {
    selectedCustomer = customer;
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.value = customer.id;
    }
    const modal = document.getElementById('customerModal');
    if (modal) modal.style.display = 'none';
}

// ==================== PERSONNEL MANAGEMENT ====================
async function populatePersonnel() {
    try {
        console.log('Populating personnel dropdown...');
        const personnelSelect = document.getElementById('personnelSelect');
        if (!personnelSelect) {
            console.error('Personnel select element not found');
            return;
        }
        
        const currentValue = personnelSelect.value;
        personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';
        
        if (!localData.personnel || localData.personnel.length === 0) {
            console.warn('No personnel available');
            return;
        }
        
        localData.personnel.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.name;
            personnelSelect.appendChild(option);
        });
        
        if (currentValue && localData.personnel.some(p => p.id === currentValue)) {
            personnelSelect.value = currentValue;
        }
        
        console.log(`Populated ${localData.personnel.length} personnel`);
    } catch (error) {
        console.error('populatePersonnel error:', error);
    }
}

// ==================== PACKAGE MANAGEMENT ====================
async function populatePackagesTable() {
    if (packagesTableLoading) return;
    packagesTableLoading = true;
    
    try {
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');
        
        if (!tableBody) {
            console.error('Package table body not found');
            return;
        }
        
        tableBody.innerHTML = '';
        if (totalPackagesElement) totalPackagesElement.textContent = '0';
        
        const waitingPackages = localData.packages.filter(pkg => 
            pkg.status === 'beklemede' && !pkg.container_id
        );
        
        if (waitingPackages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            return;
        }
        
        waitingPackages.forEach(pkg => {
            const row = document.createElement('tr');
            const customer = localData.customers.find(c => c.id === pkg.customer_id);
            const customerName = customer ? customer.name : 'Bilinmeyen Müşteri';
            
            let itemsArray = [];
            if (pkg.items && Array.isArray(pkg.items)) {
                itemsArray = pkg.items;
            } else if (pkg.items && typeof pkg.items === 'object') {
                itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ name, qty }));
            }
            
            const packageWithCustomer = {
                ...pkg,
                customers: { name: customerName },
                items: itemsArray
            };
            
            const packageJsonEscaped = JSON.stringify(packageWithCustomer)
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            row.innerHTML = `
                <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
                <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
                <td>${escapeHtml(customerName)}</td>
                <td>${escapeHtml(itemsArray.map(it => it.name).join(', '))}</td>
                <td>${escapeHtml(itemsArray.map(it => it.qty).join(', '))}</td>
                <td>${pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td><span class="status-${pkg.status || 'beklemede'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
            `;
            
            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') selectPackage(packageWithCustomer);
            });
            
            tableBody.appendChild(row);
        });
        
        if (totalPackagesElement) {
            totalPackagesElement.textContent = waitingPackages.length.toString();
        }
        
        console.log(`Package table populated with ${waitingPackages.length} packages`);
        
    } catch (error) {
        console.error('Error populating packages table:', error);
        showAlert('Paket tablosu yükleme hatası', 'error');
    } finally {
        packagesTableLoading = false;
    }
}

async function completePackage() {
    if (!selectedCustomer) {
        showAlert('Önce müşteri seçin', 'error');
        return;
    }
    
    if (!currentPackage.items || Object.keys(currentPackage.items).length === 0) {
        showAlert('Pakete ürün ekleyin', 'error');
        return;
    }
    
    try {
        const packageNo = `PKG-${Date.now()}`;
        const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);
        const selectedPersonnel = elements.personnelSelect?.value;
        
        const packageData = {
            id: generateId(),
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            items: currentPackage.items,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            container_id: null
        };
        
        localData.packages.push(packageData);
        saveLocalData();
        
        showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');
        
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');

        // Mark scanned barcodes as processed
        scannedBarcodes.forEach(barcode => barcode.processed = true);
        scannedBarcodes = [];
        displayScannedBarcodes();

        await populatePackagesTable();

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası', 'error');
    }
}

async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

    try {
        const packageIds = Array.from(checkboxes).map(cb => cb.value);
        localData.packages = localData.packages.filter(pkg => !packageIds.includes(pkg.id));
        saveLocalData();

        showAlert(`${packageIds.length} paket silindi`, 'success');
        await populatePackagesTable();

    } catch (error) {
        console.error('Error in deleteSelectedPackages:', error);
        showAlert('Paket silme hatası', 'error');
    }
}

// Stock Items
async function populateStockTable() {
    if (isStockTableLoading) return;
    isStockTableLoading = true;
    
    try {
        elements.stockTableBody.innerHTML = '';
        
        if (localData.stock_items.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Stok verisi yok</td>';
            elements.stockTableBody.appendChild(row);
            return;
        }

        localData.stock_items.forEach(item => {
            const row = document.createElement('tr');
            
            // Determine stock status
            let statusClass = 'status-stokta';
            let statusText = 'Stokta';
            
            if (item.quantity <= 0) {
                statusClass = 'status-kritik';
                statusText = 'Kritik';
            } else if (item.quantity < 10) {
                statusClass = 'status-az-stok';
                statusText = 'Az Stok';
            }
            
            row.innerHTML = `
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td class="editable-cell">
                    <span class="stock-quantity">${item.quantity}</span>
                    <input type="number" class="stock-quantity-input" value="${item.quantity}" style="display:none;" data-original="${item.quantity}">
                </td>
                <td>${item.unit || 'Adet'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>
                    <button onclick="editStockItem(this, '${item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                    <div class="edit-buttons" style="display:none;">
                        <button onclick="saveStockItem('${item.code}', this.parentNode.parentNode.querySelector('.stock-quantity-input'))" class="btn btn-success btn-sm">Kaydet</button>
                        <button onclick="cancelEditStockItem('${item.code}', ${item.quantity})" class="btn btn-secondary btn-sm">İptal</button>
                    </div>
                </td>
            `;
            elements.stockTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error in populateStockTable:', error);
        showAlert('Stok tablosu yükleme hatası', 'error');
    } finally {
        isStockTableLoading = false;
    }
}

async function saveStockItem(code, input) {
    const newQuantity = parseInt(input.value);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        showAlert('Geçerli bir miktar girin', 'error');
        return;
    }
    
    try {
        // Find and update the stock item
        const itemIndex = localData.stock_items.findIndex(item => item.code === code);
        if (itemIndex !== -1) {
            localData.stock_items[itemIndex].quantity = newQuantity;
            localData.stock_items[itemIndex].updated_at = new Date().toISOString();
            saveLocalData();
        }
        
        showAlert(`Stok güncellendi: ${code}`, 'success');
        
        // Update UI
        const row = input.closest('tr');
        const quantitySpan = row.querySelector('.stock-quantity');
        const editButton = row.querySelector('button');
        const editButtons = row.querySelector('.edit-buttons');
        
        quantitySpan.textContent = newQuantity;
        quantitySpan.style.display = 'block';
        input.style.display = 'none';
        editButton.style.display = 'block';
        editButtons.style.display = 'none';
        
        // Update status
        const statusCell = row.querySelector('td:nth-child(5) span');
        if (newQuantity <= 0) {
            statusCell.className = 'status-kritik';
            statusCell.textContent = 'Kritik';
        } else if (newQuantity < 10) {
            statusCell.className = 'status-az-stok';
            statusCell.textContent = 'Az Stok';
        } else {
            statusCell.className = 'status-stokta';
            statusCell.textContent = 'Stokta';
        }
        
        editingStockItem = null;
        
    } catch (error) {
        console.error('Error updating stock:', error);
        showAlert('Stok güncellenirken hata oluştu', 'error');
    }
}

// Shipping operations
async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
            return;
        }

        // Calculate total quantity
        const totalQuantity = selectedPackages.reduce((sum, packageId) => {
            const pkg = localData.packages.find(p => p.id === packageId);
            return sum + (pkg ? pkg.total_quantity : 0);
        }, 0);

        // Create new container
        let containerId;
        if (!containerNo) {
            const timestamp = new Date().getTime();
            containerNo = `CONT-${timestamp.toString().slice(-6)}`;
        }

        containerId = generateId();
        const newContainer = {
            id: containerId,
            container_no: containerNo,
            customer: selectedCustomer?.name || '',
            package_count: selectedPackages.length,
            total_quantity: totalQuantity,
            status: 'sevk-edildi',
            created_at: new Date().toISOString()
        };

        localData.containers.push(newContainer);

        // Update packages
        selectedPackages.forEach(packageId => {
            const packageIndex = localData.packages.findIndex(p => p.id === packageId);
            if (packageIndex !== -1) {
                localData.packages[packageIndex].container_id = containerId;
                localData.packages[packageIndex].status = 'sevk-edildi';
            }
        });

        saveLocalData();

        showAlert(`${selectedPackages.length} paket doğrudan sevk edildi (Konteyner: ${containerNo})`, 'success');
        
        // Refresh tables
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler sevk edilirken hata oluştu: ' + error.message, 'error');
    }
}

async function populateShippingTable(page = 0) {
    if (isShippingTableLoading) return;
    isShippingTableLoading = true;

    try {
        elements.shippingFolders.innerHTML = '';

        const filter = elements.shippingFilter?.value || 'all';
        
        let filteredContainers = localData.containers;
        if (filter !== 'all') {
            filteredContainers = localData.containers.filter(c => c.status === filter);
        }

        // Pagination
        const from = page * pageSize;
        const to = from + pageSize;
        const paginatedContainers = filteredContainers.slice(from, to);

        if (paginatedContainers.length === 0) {
            elements.shippingFolders.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Sevkiyat verisi yok</p>';
            return;
        }

        // Add packages to containers
        paginatedContainers.forEach(container => {
            container.packages = localData.packages.filter(p => p.container_id === container.id);
        });

        // Group by customer
        const customersMap = {};
        paginatedContainers.forEach(container => {
            let customerName = 'Diğer';
            if (container.packages.length > 0) {
                const customerIds = [...new Set(container.packages.map(p => p.customer_id))];
                const customerNames = customerIds.map(id => {
                    const customer = localData.customers.find(c => c.id === id);
                    return customer ? customer.name : 'Bilinmeyen';
                });
                customerName = customerNames.join(', ');
            }
            if (!customersMap[customerName]) customersMap[customerName] = [];
            customersMap[customerName].push(container);
        });

        // Render folders
        Object.entries(customersMap).forEach(([customerName, customerContainers]) => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'customer-folder';

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.innerHTML = `
                <span>${customerName}</span>
                <span class="folder-toggle"><i class="fas fa-chevron-right"></i></span>
            `;

            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';

            const table = document.createElement('table');
            table.className = 'package-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th><input type="checkbox" class="select-all-customer" onchange="toggleSelectAllCustomer(this)"></th>
                        <th>Konteyner No</th>
                        <th>Paket Sayısı</th>
                        <th>Toplam Adet</th>
                        <th>Tarih</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${customerContainers.map(container => `
                        <tr>
                            <td><input type="checkbox" value="${container.id}" class="container-checkbox"></td>
                            <td>${container.container_no}</td>
                            <td>${container.packages.length}</td>
                            <td>${container.packages.reduce((sum, p) => sum + (p.total_quantity || 0), 0)}</td>
                            <td>${container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                            <td><span class="status-${container.status}">${container.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                            <td>
                                <button onclick="viewContainerDetails('${container.id}')" class="btn btn-primary btn-sm">Detay</button>
                                <button onclick="sendToRamp('${container.container_no}')" class="btn btn-warning btn-sm">Paket Ekle</button>
                                <button onclick="shipContainer('${container.container_no}')" class="btn btn-success btn-sm">Sevk Et</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            folderContent.appendChild(table);
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(folderContent);

            folderHeader.addEventListener('click', () => {
                folderDiv.classList.toggle('folder-open');
                folderContent.style.display = folderDiv.classList.contains('folder-open') ? 'block' : 'none';
            });

            elements.shippingFolders.appendChild(folderDiv);
        });

        // Render pagination
        renderPagination(filteredContainers.length, page);

    } catch (error) {
        console.error('Error in populateShippingTable:', error);
        showAlert('Sevkiyat tablosu yükleme hatası', 'error');
    } finally {
        isShippingTableLoading = false;
    }
}

async function viewContainerDetails(containerId) {
    try {
        const container = localData.containers.find(c => c.id === containerId);
        if (!container) throw new Error('Container not found');
        
        container.packages = localData.packages.filter(p => p.container_id === containerId);
        
        // Add customer info to packages
        container.packages.forEach(pkg => {
            const customer = localData.customers.find(c => c.id === pkg.customer_id);
            pkg.customers = customer ? { name: customer.name, code: customer.code } : { name: 'N/A', code: 'N/A' };
        });
        
        currentContainerDetails = container;
        
        const modalTitle = document.getElementById('containerDetailTitle');
        const modalContent = document.getElementById('containerDetailContent');
        
        modalTitle.textContent = `Konteyner: ${container.container_no}`;
        
        let contentHTML = `
            <p><strong>Durum:</strong> <span class="container-status status-${container.status}">${container.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></p>
            <p><strong>Oluşturulma Tarihi:</strong> ${new Date(container.created_at).toLocaleDateString('tr-TR')}</p>
            <p><strong>Paket Sayısı:</strong> ${container.package_count || 0}</p>
            <p><strong>Toplam Adet:</strong> ${container.total_quantity || 0}</p>
        `;
        
        if (container.packages && container.packages.length > 0) {
            contentHTML += `
                <h4>Paketler</h4>
                <table class="package-table">
                    <thead>
                        <tr>
                            <th>Paket No</th>
                            <th>Müşteri</th>
                            <th>Adet</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${container.packages.map(pkg => `
                            <tr>
                                <td>${pkg.package_no}</td>
                                <td>${pkg.customers?.name || 'N/A'}</td>
                                <td>${pkg.total_quantity}</td>
                                <td><span class="status-${pkg.status}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        modalContent.innerHTML = contentHTML;
        document.getElementById('containerDetailModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading container details:', error);
        showAlert('Konteyner detayları yüklenirken hata oluştu', 'error');
    }
}

async function shipContainer(containerNo) {
    try {
        const containerIndex = localData.containers.findIndex(c => c.container_no === containerNo);
        if (containerIndex === -1) throw new Error('Container not found');

        localData.containers[containerIndex].status = 'sevk-edildi';
        saveLocalData();

        showAlert(`Konteyner ${containerNo} sevk edildi`, 'success');
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error shipping container:', error);
        showAlert('Konteyner sevk edilirken hata oluştu: ' + error.message, 'error');
    }
}

// Barcode operations
async function processBarcode() {
    if (!elements.barcodeInput) {
        showAlert('Barkod girişi bulunamadı', 'error');
        return;
    }
    
    const barcode = elements.barcodeInput.value.trim();
    if (!barcode) {
        showAlert('Barkod girin', 'error');
        return;
    }

    if (!selectedCustomer) {
        showAlert('Önce müşteri seçin', 'error');
        return;
    }

    try {
        const barcodeData = {
            id: generateId(),
            barcode: barcode,
            customer_id: selectedCustomer.id,
            scanned_at: new Date().toISOString(),
            processed: false
        };

        localData.barcodes.push(barcodeData);
        scannedBarcodes.push(barcodeData);
        saveLocalData();

        showAlert(`Barkod kaydedildi: ${barcode}`, 'success');

        elements.barcodeInput.value = '';
        if (elements.barcodeInput.focus) {
            elements.barcodeInput.focus();
        }
        
        displayScannedBarcodes();
        
    } catch (error) {
        console.error('Barkod işleme hatası:', error);
        showAlert('Barkod işlenirken bir hata oluştu: ' + error.message, 'error');
    }
}

// ==================== SUPABASE BACKUP FUNCTIONS ====================

// Supabase initialization - Keep for backup functionality
function initializeSupabase() {
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized for backup');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return null;
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    const newClient = initializeSupabase();
    
    if (newClient) {
        document.getElementById('apiKeyModal').style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
        testConnection();
    }
}

async function testConnection() {
    if (!supabase) {
        showAlert('Supabase istemcisi başlatılmadı', 'error');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        showAlert('Veritabanına bağlanılamıyor. API anahtarınızı kontrol edin.', 'error');
        return false;
    }
}

// Backup functions
async function backupToSupabase() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok. Yedekleme yapılamıyor.', 'error');
        return;
    }

    try {
        // Backup each data type
        const backupPromises = [];

        // Backup customers
        if (localData.customers.length > 0) {
            backupPromises.push(
                supabase.from('customers').upsert(localData.customers, { onConflict: 'id' })
            );
        }

        // Backup packages
        if (localData.packages.length > 0) {
            backupPromises.push(
                supabase.from('packages').upsert(localData.packages, { onConflict: 'id' })
            );
        }

        // Backup containers
        if (localData.containers.length > 0) {
            backupPromises.push(
                supabase.from('containers').upsert(localData.containers, { onConflict: 'id' })
            );
        }

        // Backup personnel
        if (localData.personnel.length > 0) {
            backupPromises.push(
                supabase.from('personnel').upsert(localData.personnel, { onConflict: 'id' })
            );
        }

        // Backup stock items
        if (localData.stock_items.length > 0) {
            backupPromises.push(
                supabase.from('stock_items').upsert(localData.stock_items, { onConflict: 'id' })
            );
        }

        await Promise.all(backupPromises);
        
        localData.settings.lastBackup = new Date().toISOString();
        saveLocalData();
        
        showAlert('Veriler Supabase\'e yedeklendi', 'success');
        
    } catch (error) {
        console.error('Backup error:', error);
        showAlert('Yedekleme hatası: ' + error.message, 'error');
    }
}

async function restoreFromSupabase() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok', 'error');
        return;
    }

    if (!confirm('Yerel veriler Supabase verilerle değiştirilecek. Emin misiniz?')) return;

    try {
        // Restore each data type
        const { data: customers } = await supabase.from('customers').select('*');
        const { data: packages } = await supabase.from('packages').select('*');
        const { data: containers } = await supabase.from('containers').select('*');
        const { data: personnel } = await supabase.from('personnel').select('*');
        const { data: stock_items } = await supabase.from('stock_items').select('*');

        localData.customers = customers || [];
        localData.packages = packages || [];
        localData.containers = containers || [];
        localData.personnel = personnel || [];
        localData.stock_items = stock_items || [];
        
        saveLocalData();
        
        // Refresh all tables
        await populateCustomers();
        await populatePersonnel();
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        showAlert('Veriler Supabase\'den geri yüklendi', 'success');
        
    } catch (error) {
        console.error('Restore error:', error);
        showAlert('Geri yükleme hatası: ' + error.message, 'error');
    }
}



// Add this function right after your existing utility functions
function updateUserInterface() {
    // Update user role display
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement && currentUser) {
        userRoleElement.textContent = 
            `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
    }
    
    // Update current date fields
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
    
    // Apply role-based permissions
    if (typeof applyRoleBasedPermissions === 'function') {
        applyRoleBasedPermissions(currentUser.role);
    }
}




// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function renderPagination(totalCount, page) {
    let paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'pagination';
        paginationDiv.style.textAlign = 'center';
        paginationDiv.style.marginTop = '10px';
        elements.shippingFolders.appendChild(paginationDiv);
    }
    paginationDiv.innerHTML = '';

    const totalPages = Math.ceil(totalCount / pageSize);

    if (page > 0) {
        const prev = document.createElement('button');
        prev.textContent = '◀ Geri';
        prev.onclick = () => populateShippingTable(page - 1);
        paginationDiv.appendChild(prev);
    }

    paginationDiv.append(` Sayfa ${page + 1} / ${totalPages} `);

    if (page < totalPages - 1) {
        const next = document.createElement('button');
        next.textContent = 'İleri ▶';
        next.onclick = () => populateShippingTable(page + 1);
        paginationDiv.appendChild(next);
    }
}

function filterShipping() {
    populateShippingTable();
}

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
        
        const folderHeader = folder.querySelector('.folder-header');
        if (hasVisibleRows) {
            folder.style.display = 'block';
            folderHeader.style.display = 'flex';
        } else {
            folder.style.display = 'none';
        }
    });
}




// Add this function to persist user session
function setupAuthPersistence() {
    // Check for existing session on page load
    const savedSession = localStorage.getItem('supabase.auth.token');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData && sessionData.access_token) {
                // Set current user from saved session
                currentUser = {
                    email: sessionData.user?.email || 'user@example.com',
                    uid: sessionData.user?.id || 'unknown',
                    name: sessionData.user?.email?.split('@')[0] || 'User'
                };
                console.log('User session restored:', currentUser);
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            currentUser = null;
        }
    }
    
    // Also check for our custom user storage
    const savedUser = localStorage.getItem('procleanCurrentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('User data restored from custom storage:', currentUser);
        } catch (error) {
            console.error('Error restoring custom user data:', error);
            currentUser = null;
        }
    }
}









// Global variables for pagination and loading states
const pageSize = 20;
let isShippingTableLoading = false;
let isStockTableLoading = false;

// ==================== CORRECTED INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting corrected initialization...');
    
    // Step 1: Initialize UI elements first
    initializeUIElements();
    
    // Step 2: Check for XLSX library
    if (!checkXLSXLibrary()) {
        showAlert('Excel kütüphanesi bulunamadı. Lütfen SheetJS kütüphanesini yükleyin.', 'error');
    }
    
    // Step 3: Initialize local data
    initializeLocalData();
    
    // Step 4: Load saved API key (for backups only)
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
    }
    
    // Step 5: Check if user is already logged in via Supabase auth
    checkAuthState();
    
    console.log('Initialization sequence completed');
});

// Check authentication state using Supabase
async function checkAuthState() {
    try {
        // Initialize Supabase first
        if (!supabase) {
            const client = initializeSupabase();
            if (!client) {
                console.log('Supabase not initialized, showing login screen');
                showLoginScreen();
                return;
            }
        }
        
        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            showLoginScreen();
            return;
        }
        
        if (session && session.user) {
            // User is logged in - get additional user info
            const { data: userData, error: userError } = await supabase
                .from('personnel')
                .select('role, name')
                .eq('email', session.user.email)
                .single();
                
            if (userError) {
                console.error('Error fetching user data:', userError);
            }
            
            currentUser = {
                email: session.user.email,
                uid: session.user.id,
                name: userData?.name || session.user.email.split('@')[0],
                role: userData?.role || 'operator'
            };
            
            showAppScreen();
        } else {
            showLoginScreen();
        }
        
    } catch (error) {
        console.error('Auth state check error:', error);
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    console.log('Showing login screen');
}

async function showAppScreen() {
    console.log('Showing app screen for user:', currentUser);
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    // Initialize form elements
    initializeFormElements();
    
    // Load app data
    await initializeAppData();
    
    // Setup daily Excel export
    setupDailyExcelExport();
    
    // Update UI with user info
    updateUserInterface();
}
