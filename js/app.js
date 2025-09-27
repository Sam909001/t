// Sayfa yüklendiğinde API anahtarını localStorage'dan yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
        console.log('API key loaded from localStorage');
    }
});

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

// Initialize application
async function initApp() {
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
    
    // Initialize local storage data
    initializeLocalStorage();
    
    // Populate dropdowns from local storage
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load data from local storage
    await populatePackagesTable();
    await populateStockTable();
    await populateShippingTable();
    
    // Test connection (optional - for backup only)
    await testConnection();
    
    // Set up auto-save
    setInterval(saveAppState, 5000); // Save every 5 seconds
    
    // Set up offline support
    setupOfflineSupport();
    
    // Set up barcode scanner listener
    setupBarcodeScanner();
    
    // Start daily auto-clear
    scheduleDailyClear();
    
    // Setup daily Excel auto-save
    setupDailyExcelAutoSave();
}

// Initialize local storage with sample data if empty
function initializeLocalStorage() {
    console.log('Initializing local storage...');
    
    // Check if data already exists
    if (localStorage.getItem('packages') && localStorage.getItem('customers')) {
        console.log('Data already exists in local storage');
        return;
    }
    
    // Sample customers
    const sampleCustomers = [
        { id: 1, name: 'Yeditepe', code: 'YEDITEPE', contact: 'Ahmet Yılmaz', phone: '555-0101' },
        { id: 2, name: 'Marmara', code: 'MARMARA', contact: 'Mehmet Demir', phone: '555-0102' },
        { id: 3, name: 'İstanbul', code: 'ISTANBUL', contact: 'Ayşe Kaya', phone: '555-0103' }
    ];
    
    // Sample personnel
    const samplePersonnel = [
        { id: 1, name: 'Ali Veli', role: 'Operator' },
        { id: 2, name: 'Fatma Yıldız', role: 'Supervisor' },
        { id: 3, name: 'Mustafa Şen', role: 'Manager' }
    ];
    
    // Sample containers
    const sampleContainers = [
        { id: 1, container_no: 'CONT-001', customer_id: 1, status: 'active', created_at: new Date().toISOString() },
        { id: 2, container_no: 'CONT-002', customer_id: 2, status: 'active', created_at: new Date().toISOString() }
    ];
    
    // Sample packages
    const samplePackages = [
        { 
            id: 1, 
            package_no: 'PKG-001', 
            customer_id: 1, 
            container_id: 1, 
            product: 'T-Shirt', 
            quantity: 10, 
            status: 'processed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];
    
    // Sample stock
    const sampleStock = [
        { code: 'TSHIRT-RED-M', name: 'Red T-Shirt Medium', quantity: 100, last_updated: new Date().toISOString() },
        { code: 'TSHIRT-BLUE-L', name: 'Blue T-Shirt Large', quantity: 75, last_updated: new Date().toISOString() }
    ];
    
    // Save to localStorage
    localStorage.setItem('customers', JSON.stringify(sampleCustomers));
    localStorage.setItem('personnel', JSON.stringify(samplePersonnel));
    localStorage.setItem('containers', JSON.stringify(sampleContainers));
    localStorage.setItem('packages', JSON.stringify(samplePackages));
    localStorage.setItem('stock', JSON.stringify(sampleStock));
    
    console.log('Sample data initialized in local storage');
}

// Data retrieval functions - Modified to use localStorage first
async function getPackages() {
    try {
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        console.log('Retrieved packages from localStorage:', packages.length);
        return packages;
    } catch (error) {
        console.error('Error getting packages from localStorage:', error);
        return [];
    }
}

async function getContainers() {
    try {
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        console.log('Retrieved containers from localStorage:', containers.length);
        return containers;
    } catch (error) {
        console.error('Error getting containers from localStorage:', error);
        return [];
    }
}

async function getCustomers() {
    try {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        console.log('Retrieved customers from localStorage:', customers.length);
        return customers;
    } catch (error) {
        console.error('Error getting customers from localStorage:', error);
        return [];
    }
}

async function getPersonnel() {
    try {
        const personnel = JSON.parse(localStorage.getItem('personnel') || '[]');
        console.log('Retrieved personnel from localStorage:', personnel.length);
        return personnel;
    } catch (error) {
        console.error('Error getting personnel from localStorage:', error);
        return [];
    }
}

async function getStock() {
    try {
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        console.log('Retrieved stock from localStorage:', stock.length);
        return stock;
    } catch (error) {
        console.error('Error getting stock from localStorage:', error);
        return [];
    }
}

// Data saving functions - Modified to save locally and backup to Supabase
async function savePackage(packageData) {
    try {
        // Get existing packages
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        
        // Add new package
        const newPackage = {
            ...packageData,
            id: packages.length > 0 ? Math.max(...packages.map(p => p.id)) + 1 : 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        packages.push(newPackage);
        
        // Save to localStorage
        localStorage.setItem('packages', JSON.stringify(packages));
        console.log('Package saved to localStorage:', newPackage);
        
        // Backup to Supabase if available
        await backupToSupabase('packages', newPackage);
        
        return newPackage;
        
    } catch (error) {
        console.error('Error saving package:', error);
        throw error;
    }
}

async function saveContainer(containerData) {
    try {
        // Get existing containers
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        
        // Add new container
        const newContainer = {
            ...containerData,
            id: containers.length > 0 ? Math.max(...containers.map(c => c.id)) + 1 : 1,
            created_at: new Date().toISOString()
        };
        
        containers.push(newContainer);
        
        // Save to localStorage
        localStorage.setItem('containers', JSON.stringify(containers));
        console.log('Container saved to localStorage:', newContainer);
        
        // Backup to Supabase if available
        await backupToSupabase('containers', newContainer);
        
        return newContainer;
        
    } catch (error) {
        console.error('Error saving container:', error);
        throw error;
    }
}

async function updatePackage(packageId, updates) {
    try {
        // Get existing packages
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        
        // Find and update package
        const packageIndex = packages.findIndex(p => p.id === packageId);
        if (packageIndex === -1) {
            throw new Error('Package not found');
        }
        
        packages[packageIndex] = {
            ...packages[packageIndex],
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('packages', JSON.stringify(packages));
        console.log('Package updated in localStorage:', packages[packageIndex]);
        
        // Backup to Supabase if available
        await backupToSupabase('packages', packages[packageIndex], 'update');
        
        return packages[packageIndex];
        
    } catch (error) {
        console.error('Error updating package:', error);
        throw error;
    }
}

async function updateContainer(containerId, updates) {
    try {
        // Get existing containers
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        
        // Find and update container
        const containerIndex = containers.findIndex(c => c.id === containerId);
        if (containerIndex === -1) {
            throw new Error('Container not found');
        }
        
        containers[containerIndex] = {
            ...containers[containerIndex],
            ...updates
        };
        
        // Save to localStorage
        localStorage.setItem('containers', JSON.stringify(containers));
        console.log('Container updated in localStorage:', containers[containerIndex]);
        
        // Backup to Supabase if available
        await backupToSupabase('containers', containers[containerIndex], 'update');
        
        return containers[containerIndex];
        
    } catch (error) {
        console.error('Error updating container:', error);
        throw error;
    }
}

async function updateStockItem(code, quantity) {
    try {
        // Get existing stock
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        
        // Find and update stock item
        const stockIndex = stock.findIndex(s => s.code === code);
        if (stockIndex === -1) {
            // Add new stock item if not found
            const newStockItem = {
                code: code,
                name: code, // You might want to get the name from somewhere
                quantity: quantity,
                last_updated: new Date().toISOString()
            };
            
            stock.push(newStockItem);
        } else {
            // Update existing stock item
            stock[stockIndex] = {
                ...stock[stockIndex],
                quantity: quantity,
                last_updated: new Date().toISOString()
            };
        }
        
        // Save to localStorage
        localStorage.setItem('stock', JSON.stringify(stock));
        console.log('Stock updated in localStorage:', stock[stockIndex || stock.length - 1]);
        
        // Backup to Supabase if available
        await backupToSupabase('stock', stock[stockIndex || stock.length - 1], stockIndex === -1 ? 'insert' : 'update');
        
        return stock[stockIndex || stock.length - 1];
        
    } catch (error) {
        console.error('Error updating stock:', error);
        throw error;
    }
}

// Backup functions for Supabase (optional)
async function backupToSupabase(table, data, operation = 'insert') {
    // Only backup if Supabase is configured
    if (!window.supabase || !SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, skipping backup');
        return;
    }
    
    try {
        if (operation === 'insert') {
            const { error } = await window.supabase
                .from(table)
                .insert([data]);
            
            if (error) throw error;
            console.log(`Data backed up to Supabase (${table}):`, data);
        } else if (operation === 'update') {
            const { error } = await window.supabase
                .from(table)
                .update(data)
                .eq('id', data.id);
            
            if (error) throw error;
            console.log(`Data updated in Supabase (${table}):`, data);
        }
    } catch (error) {
        console.error(`Error backing up to Supabase (${table}):`, error);
        // Don't throw error - local storage is primary, Supabase is backup only
    }
}

// Setup daily Excel auto-save
function setupDailyExcelAutoSave() {
    // Check if we need to save today
    const lastSaveDate = localStorage.getItem('lastExcelSaveDate');
    const today = new Date().toDateString();
    
    if (lastSaveDate !== today) {
        // Wait 10 seconds after app load, then save
        setTimeout(() => {
            if (window.exportToExcel) {
                window.exportToExcel();
                localStorage.setItem('lastExcelSaveDate', today);
                console.log('Daily auto-save completed');
            }
        }, 10000);
    }
    
    // Set up daily check (every 24 hours)
    setInterval(() => {
        const currentDate = new Date().toDateString();
        const lastSave = localStorage.getItem('lastExcelSaveDate');
        
        if (lastSave !== currentDate && window.exportToExcel) {
            window.exportToExcel();
            localStorage.setItem('lastExcelSaveDate', currentDate);
        }
    }, 24 * 60 * 60 * 1000);
}

// Storage bucket kontrolü ve oluşturma fonksiyonu
async function setupStorageBucket() {
    try {
        // Storage bucket var mı kontrol et
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.warn('Bucket listeleme hatası:', bucketsError);
            return false;
        }
        
        const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports');
        
        if (!reportsBucketExists) {
            console.log('Reports bucket bulunamadı, oluşturuluyor...');
            // Bucket oluşturmaya çalış (admin yetkisi gerektirir)
            try {
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                    allowedMimeTypes: ['application/pdf']
                });
                
                if (createError) {
                    console.warn('Bucket oluşturulamadı:', createError);
                    return false;
                }
                
                console.log('Reports bucket oluşturuldu:', newBucket);
                return true;
            } catch (createError) {
                console.warn('Bucket oluşturma hatası:', createError);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.warn('Storage setup hatası:', error);
        return false;
    }
}

// Rest of your existing app.js functions remain the same...
// [Keep all your existing functions like previewReport, createNewContainer, etc.]

// Initialize auth state listener
function setupAuthListener() {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user');
        
        if (session) {
            currentUser = {
                email: session.user.email,
                uid: session.user.id,
                name: session.user.email.split('@')[0]
            };
            
            document.getElementById('userRole').textContent = `Operatör: ${currentUser.name}`;
            document.getElementById('loginScreen').style.display = "none";
            document.getElementById('appContainer').style.display = "flex";
            
            initApp();
        } else {
            document.getElementById('loginScreen').style.display = "flex";
            document.getElementById('appContainer').style.display = "none";
        }
    });
}

// Load API key from localStorage
function loadApiKey() {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        return true;
    }
    return false;
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            console.log('Settings button clicked');
            showSettingsModal();
        });
        console.log('Settings button listener added successfully');
    } else {
        console.error('Settings button not found in DOM');
    }

    // Close settings modal
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsModal);
    }

    try {
        console.log('Initializing ProClean application...');
        
        // Initialize elements first
        initializeElementsObject();
        
        // Check critical elements exist before adding listeners
        const loginBtn = elements.loginButton;
        const emailInput = elements.emailInput;
        const passwordInput = elements.passwordInput;
        
        if (loginBtn) {
            loginBtn.addEventListener('click', login);
            console.log('Login button listener added');
        } else {
            console.error('Login button not found - check HTML structure');
            showAlert('Giriş butonu bulunamadı', 'error');
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Enter key listeners
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
        
        // Quantity modal enter key
        if (elements.quantityInput) {
            elements.quantityInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmQuantity();
                }
            });
        }
        
        // Customer select change listener
        if (elements.customerSelect) {
            elements.customerSelect.addEventListener('change', function() {
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
        
        // Tab click events
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (tabName) {
                    switchTab(tabName);
                }
            });
        });

        function applySavedTheme() {
            const savedTheme = localStorage.getItem('procleanTheme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
            }
        }

        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('procleanTheme', 'dark');
                showAlert('Koyu tema etkinleştirildi.', 'info');
            } else {
                localStorage.setItem('procleanTheme', 'light');
                showAlert('Açık tema etkinleştirildi.', 'info');
            }
        }
        
        // API key initialization
        if (loadApiKey()) {
            supabase = initializeSupabase();
            if (supabase) {
                setupAuthListener();
                console.log('Supabase client initialized successfully');
            } else {
                console.warn('Failed to initialize Supabase client');
            }
        } else {
            console.log('No saved API key found, showing API key modal');
            showApiKeyModal();
        }

        // Initialize settings when app loads
        initializeSettings();

        // Add settings button event listener
        document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
        document.getElementById('closeSettingsModalBtn').addEventListener('click', closeSettingsModal);

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === document.getElementById('settingsModal')) {
                closeSettingsModal();
            }
        });
        
        // Set initial display states
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
        }
        if (elements.appContainer) {
            elements.appContainer.style.display = 'none';
        }
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Critical error during DOMContentLoaded:', error);
        showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
    }
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
});
