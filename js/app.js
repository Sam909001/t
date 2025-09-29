// ==================== APP.JS - FIXED VERSION ====================

// State management functions
function saveAppState() {
    const state = {
        selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
        selectedPersonnelId: elements.personnelSelect?.value || null,
        currentContainer: currentContainer,
        isUsingExcel: isUsingExcel
    };
    localStorage.setItem('procleanState', JSON.stringify(state));
}

function loadAppState() {
    const savedState = localStorage.getItem('procleanState');
    if (!savedState) return;
    
    try {
        const state = JSON.parse(savedState);
        
        // Restore customer selection
        if (state.selectedCustomerId && elements.customerSelect) {
            elements.customerSelect.value = state.selectedCustomerId;
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
        if (state.selectedPersonnelId && elements.personnelSelect) {
            elements.personnelSelect.value = state.selectedPersonnelId;
        }
        
        // Restore current container
        if (state.currentContainer && elements.containerNumber) {
            currentContainer = state.currentContainer;
            elements.containerNumber.textContent = currentContainer;
        }
        
        // Restore Excel mode
        if (state.isUsingExcel !== undefined) {
            isUsingExcel = state.isUsingExcel;
            updateStorageIndicator();
        }
    } catch (error) {
        console.error('Error loading app state:', error);
    }
}

function clearAppState() {
    localStorage.removeItem('procleanState');
    selectedCustomer = null;
    if (elements.customerSelect) elements.customerSelect.value = '';
    if (elements.personnelSelect) elements.personnelSelect.value = '';
    currentContainer = null;
    if (elements.containerNumber) elements.containerNumber.textContent = 'Yok';
    currentPackage = {};
    
    document.querySelectorAll('.quantity-badge').forEach(badge => {
        badge.textContent = '0';
    });
    
    const packageDetail = document.getElementById('packageDetailContent');
    if (packageDetail) {
        packageDetail.innerHTML = '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';
    }
}

// Initialize application - FIXED with workspace support
async function initApp() {
    try {
        console.log('🔧 Initializing app...');
        
        // Set current date
        if (elements.currentDate) {
            elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        // Update storage indicator
        updateStorageIndicator();
        
        // Populate dropdowns (these now work with Supabase first, then fallback)
        await populateCustomers();
        await populatePersonnel();
        
        // Load saved state
        loadAppState();
        
        // Load workspace-specific data
        await loadPackagesData();
        await populateStockTable();
        await populateShippingTable();
        
        // Test Supabase connection
        if (supabase) {
            await testConnection();
        }
        
        // Set up auto-save
        setInterval(saveAppState, 30000); // Every 30 seconds
        
        // Set up offline support
        setupOfflineSupport();
        
        // Set up barcode scanner
        setupBarcodeScanner();
        
        // Start daily auto-clear
        scheduleDailyClear();
        
        const workspaceName = window.workspaceManager?.currentWorkspace?.name || 'Default';
        console.log(`✅ App initialized for workspace: ${workspaceName}`);
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showAlert('Uygulama başlatılırken hata oluştu', 'error');
    }
}

// FIXED: Load packages data with proper workspace filtering
async function loadPackagesData() {
    try {
        console.log('📦 Loading packages data...');
        
        const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
        let packages = [];
        
        // Try loading from workspace-specific localStorage
        const storageKey = `excelPackages_${workspaceId}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
            try {
                packages = JSON.parse(savedData);
                console.log(`Loaded ${packages.length} packages from workspace: ${workspaceId}`);
            } catch (parseError) {
                console.error('Error parsing saved packages:', parseError);
                packages = [];
            }
        }
        
        // Update global excelPackages
        excelPackages = packages;
        
        // Try to load from Supabase if online
        if (supabase && navigator.onLine && !isUsingExcel) {
            try {
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select('*, customers(name, code)')
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false });
                
                if (!error && supabasePackages && supabasePackages.length > 0) {
                    console.log(`Loaded ${supabasePackages.length} packages from Supabase`);
                    
                    // Merge packages (Supabase takes priority)
                    const mergedPackages = mergePackages(packages, supabasePackages);
                    excelPackages = mergedPackages;
                    
                    // Save merged data back to workspace storage
                    localStorage.setItem(storageKey, JSON.stringify(mergedPackages));
                }
            } catch (supabaseError) {
                console.warn('Supabase load failed, using local data:', supabaseError);
                isUsingExcel = true;
            }
        }
        
        // Populate the table
        await populatePackagesTable();
        
    } catch (error) {
        console.error('Error loading packages data:', error);
        showAlert('Paket verileri yüklenirken hata oluştu', 'error');
    }
}

// Helper function to merge packages
function mergePackages(localPackages, supabasePackages) {
    const merged = [...localPackages];
    const localIds = new Set(localPackages.map(p => p.id));
    
    supabasePackages.forEach(pkg => {
        if (!localIds.has(pkg.id)) {
            merged.push(pkg);
        }
    });
    
    return merged;
}

// Storage bucket setup
async function setupStorageBucket() {
    if (!supabase) {
        console.warn('Supabase not initialized, skipping storage bucket setup');
        return false;
    }
    
    try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.warn('Bucket listing error:', bucketsError);
            return false;
        }
        
        const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports');
        
        if (!reportsBucketExists) {
            console.log('Reports bucket not found, attempting to create...');
            const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
                public: true,
                fileSizeLimit: 5242880,
                allowedMimeTypes: ['application/pdf']
            });
            
            if (createError) {
                console.warn('Could not create bucket:', createError);
                return false;
            }
            
            console.log('Reports bucket created');
            return true;
        }
        
        return true;
    } catch (error) {
        console.warn('Storage setup error:', error);
        return false;
    }
}

// Container operations
function loadCurrentContainer() {
    showAlert('Mevcut konteyner yüklendi', 'success');
}

async function createNewContainer() {
    try {
        const timestamp = new Date().getTime();
        const containerNo = `CONT-${timestamp.toString().slice(-6)}`;

        const containerData = {
            id: generateId(),
            container_no: containerNo,
            customer: null,
            package_count: 0,
            total_quantity: 0,
            status: 'beklemede',
            created_at: new Date().toISOString()
        };

        // Save to localData
        localData.containers.push(containerData);
        saveLocalData();

        if (elements.containerNumber) {
            elements.containerNumber.textContent = containerNo;
        }
        currentContainer = containerNo;
        saveAppState();

        showAlert(`Yeni konteyner oluşturuldu: ${containerNo}`, 'success');
        await populateShippingTable();

    } catch (error) {
        console.error('Error creating container:', error);
        showAlert('Konteyner oluşturulurken hata oluştu', 'error');
    }
}

async function deleteContainer() {
    const selectedContainers = Array.from(document.querySelectorAll('.container-checkbox:checked'))
        .map(cb => cb.value);
        
    if (selectedContainers.length === 0) {
        showAlert('Silinecek konteyner seçin', 'error');
        return;
    }

    if (!confirm(`${selectedContainers.length} konteyneri silmek istediğinize emin misiniz?`)) return;

    try {
        // Update packages
        localData.packages.forEach(pkg => {
            if (selectedContainers.includes(pkg.container_id)) {
                pkg.container_id = null;
                pkg.status = 'beklemede';
            }
        });

        // Delete containers
        localData.containers = localData.containers.filter(c => !selectedContainers.includes(c.id));
        saveLocalData();

        // Reset current container if deleted
        if (currentContainer && selectedContainers.includes(currentContainer)) {
            currentContainer = null;
            if (elements.containerNumber) {
                elements.containerNumber.textContent = 'Yok';
            }
            saveAppState();
        }
        
        showAlert(`${selectedContainers.length} konteyner silindi`, 'success');
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error deleting container:', error);
        showAlert('Konteyner silinirken hata oluştu', 'error');
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedPane = document.getElementById(`${tabName}Tab`);
    
    if (selectedTab && selectedPane) {
        selectedTab.classList.add('active');
        selectedPane.classList.add('active');
        
        setTimeout(() => {
            switch(tabName) {
                case 'shipping':
                    populateShippingTable();
                    break;
                case 'stock':
                    populateStockTable();
                    break;
                case 'reports':
                    if (typeof populateReportsTable === 'function') {
                        populateReportsTable();
                    }
                    break;
            }
        }, 100);
    }
}

// Modal functions
function closeAllModals() {
    const modals = [
        'customerModal', 'allCustomersModal', 'emailModal',
        'quantityModal', 'manualModal', 'containerDetailModal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    });
}

function closeModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.style.display = 'none';
}

function closeAllCustomersModal() {
    const modal = document.getElementById('allCustomersModal');
    if (modal) modal.style.display = 'none';
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) modal.style.display = 'none';
}

function closeManualModal() {
    const modal = document.getElementById('manualModal');
    if (modal) modal.style.display = 'none';
}

// Auth functions
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
            
            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent = `Operatör: ${currentUser.name}`;
            }
            
            document.getElementById('loginScreen').style.display = "none";
            document.getElementById('appContainer').style.display = "flex";
            
            initApp();
        } else {
            document.getElementById('loginScreen').style.display = "flex";
            document.getElementById('appContainer').style.display = "none";
        }
    });
}

function loadApiKey() {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey && savedApiKey.length > 20) {
        SUPABASE_ANON_KEY = savedApiKey;
        return true;
    }
    return false;
}

// Daily auto-clear
function clearDailyAppState() {
    console.log('[Daily Clear] Clearing frontend state...');
    
    localStorage.removeItem('procleanState');
    selectedCustomer = null;
    currentContainer = null;
    currentPackage = {};

    if (elements.customerSelect) elements.customerSelect.value = '';
    if (elements.personnelSelect) elements.personnelSelect.value = '';
    if (elements.containerNumber) elements.containerNumber.textContent = 'Yok';
    
    document.querySelectorAll('.quantity-badge').forEach(b => b.textContent = '0');
    
    const packageDetail = document.getElementById('packageDetailContent');
    if (packageDetail) {
        packageDetail.innerHTML = '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';
    }

    loadTodaysData();
}

async function loadTodaysData() {
    try {
        console.log('[Daily Clear] Loading today\'s data...');
        await populatePackagesTable();
        await populateShippingTable();
        console.log('[Daily Clear] Data reloaded');
    } catch (error) {
        console.error('Error loading today\'s data:', error);
    }
}

function scheduleDailyClear() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = nextMidnight - now;

    console.log(`[Daily Clear] Next clear in ${Math.round(msUntilMidnight / 1000)} seconds`);

    setTimeout(() => {
        clearDailyAppState();
        scheduleDailyClear();
    }, msUntilMidnight);
}

// Storage indicator update
function updateStorageIndicator() {
    const indicator = document.getElementById('storageIndicator');
    if (!indicator) return;
    
    if (isUsingExcel || !supabase || !navigator.onLine) {
        indicator.innerHTML = '<i class="fas fa-file-excel"></i> Excel Modu';
        indicator.className = 'storage-indicator excel-mode';
    } else {
        indicator.innerHTML = '<i class="fas fa-database"></i> Supabase Modu';
        indicator.className = 'storage-indicator supabase-mode';
    }
}

// Manual sync
async function manualSync() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok', 'error');
        return;
    }
    
    if (!navigator.onLine) {
        showAlert('İnternet bağlantısı yok', 'error');
        return;
    }
    
    showAlert('Manuel senkronizasyon başlatılıyor...', 'info');
    
    const success = await syncExcelWithSupabase();
    if (success) {
        isUsingExcel = false;
        updateStorageIndicator();
        await loadPackagesData();
    }
}

// Event listeners setup
function setupEventListeners() {
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }

    // Close settings
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsModal);
    }

    // Login button
    if (elements.loginButton) {
        elements.loginButton.addEventListener('click', login);
    }

    // Enter key for login
    if (elements.emailInput) {
        elements.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && typeof login === 'function') login();
        });
    }
    
    if (elements.passwordInput) {
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && typeof login === 'function') login();
        });
    }

    // Quantity modal
    if (elements.quantityInput) {
        elements.quantityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && typeof confirmQuantity === 'function') confirmQuantity();
        });
    }

    // Customer select
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

    // Tab clicks
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) switchTab(tabName);
        });
    });
}

function initializeApiAndAuth() {
    if (loadApiKey()) {
        const client = initializeSupabase();
        if (client) {
            setupAuthListener();
            console.log('✅ Supabase client initialized');
        }
    } else {
        if (typeof showApiKeyModal === 'function') {
            showApiKeyModal();
        }
    }
}

// SINGLE DOMContentLoaded - This is the ONLY one that should exist
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting ProClean application...');

    try {
        // 1. Initialize workspace FIRST
        if (!window.workspaceManager) {
            window.workspaceManager = new WorkspaceManager();
        }
        await window.workspaceManager.initialize();
        console.log('✅ Workspace initialized:', window.workspaceManager.currentWorkspace.name);

        // 2. Initialize UI elements
        initializeElementsObject();
        
        // 3. Initialize workspace UI
        if (typeof initializeWorkspaceUI === 'function') {
            initializeWorkspaceUI();
        }
        if (typeof setupWorkspaceAwareUI === 'function') {
            setupWorkspaceAwareUI();
        }

        // 4. Setup event listeners
        setupEventListeners();
        
        // 5. Initialize API and auth
        initializeApiAndAuth();

        // 6. Initialize settings
        if (typeof initializeSettings === 'function') {
            initializeSettings();
        }

        console.log('✅ ProClean initialization complete');

    } catch (error) {
        console.error('❌ Critical initialization error:', error);
        if (typeof showAlert === 'function') {
            showAlert('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
        }
    }
});

// Make functions globally available
window.saveAppState = saveAppState;
window.loadAppState = loadAppState;
window.clearAppState = clearAppState;
window.initApp = initApp;
window.updateStorageIndicator = updateStorageIndicator;
window.manualSync = manualSync;
