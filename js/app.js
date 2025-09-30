let appInitialized = false;
let excelPackages = [];

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

async function initApp() {
    console.log('🚀 Starting enhanced ProClean initialization...');
    
    try {
        // 1. Initialize workspace system FIRST
        if (!window.workspaceManager) {
            window.workspaceManager = new WorkspaceManager();
        }
        await window.workspaceManager.initialize();
        
        console.log('✅ Workspace initialized:', window.workspaceManager.currentWorkspace);

        // 2. Initialize elements
        initializeElementsObject();
        
        // 3. Initialize workspace-aware UI
        initializeWorkspaceUI();
        setupWorkspaceAwareUI();

        // 4. Migrate existing data to workspace
        await migrateExistingDataToWorkspace();

        // 5. Initialize sync system
        initializeSyncQueue();
        setupEnhancedSyncTriggers();

        // 6. Setup event listeners
        setupEventListeners();
        
        // 7. API key initialization
        initializeApiAndAuth();

        // 8. Initialize settings
        initializeSettings();

        // 9. Initialize daily Excel file system
        await ExcelStorage.cleanupOldFiles();
        await ExcelStorage.readFile();
        
        // 10. Populate UI
        elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
        await populateCustomers();
        await populatePersonnel();
        
        // 11. Load saved state
        loadAppState();
        
        // 12. Load data
        await loadPackagesData();
        await populateStockTable();
        await populateShippingTable();
        
        // 13. Test connection
        await testConnection();
        
        // 14. Set up auto-save and offline support
        setInterval(saveAppState, 5000);
        setupOfflineSupport();
        setupBarcodeScanner();
        
        // 15. Start daily auto-clear
        scheduleDailyClear();

        // 16. Auto-sync on startup if online
        if (navigator.onLine && supabase) {
            setTimeout(async () => {
                await syncExcelWithSupabase();
            }, 5000);
        }
        
        console.log(`🎉 ProClean fully initialized for workspace: ${window.workspaceManager.currentWorkspace.name}`);
        showAlert('Uygulama başarıyla başlatıldı!', 'success');

    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        showAlert('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
    }
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


async function previewReport() {
    if (!currentReportData) {
        showAlert('Önce rapor oluşturmalısınız', 'error');
        return;
    }
    
    try {
        // Generate PDF
        const pdfBlob = await generatePDFReport(currentReportData);
        
        // Create object URL for the PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Open PDF in a new window
        const reportWindow = window.open(pdfUrl, '_blank');
        
        // Clean up the URL when window is closed
        if (reportWindow) {
            reportWindow.onbeforeunload = function() {
                URL.revokeObjectURL(pdfUrl);
            };
        }
    } catch (error) {
        console.error('Rapor önizleme hatası:', error);
        showAlert('Rapor önizlenemedi', 'error');
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

        const { data: newContainer, error } = await supabase
            .from('containers')
            .insert([{
                container_no: containerNo,
                customer: null,           // leave blank initially
                package_count: 0,
                total_quantity: 0,
                status: 'beklemede'
            }])
            .select('*');                // get inserted row back

        if (error) throw error;

        elements.containerNumber.textContent = containerNo;
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
    // Seçili konteynerleri al
    const selectedContainers = Array.from(document.querySelectorAll('.container-checkbox:checked'))
        .map(cb => cb.value);
        
    if (selectedContainers.length === 0) {
        showAlert('Silinecek konteyner seçin', 'error');
        return;
    }

    if (!confirm(`${selectedContainers.length} konteyneri silmek istediğinize emin misiniz?`)) return;

    try {
        // Önce bu konteynerlere bağlı paketleri güncelle
        const { error: updateError } = await supabase
            .from('packages')
            .update({ 
                container_id: null,
                status: 'beklemede'
            })
            .in('container_id', selectedContainers);

        if (updateError) throw updateError;

        // Sonra konteynerleri sil
        const { error: deleteError } = await supabase
            .from('containers')
            .delete()
            .in('id', selectedContainers);

        if (deleteError) throw deleteError;

        // Eğer silinen konteyner aktif konteyner ise sıfırla
        if (currentContainer && selectedContainers.includes(currentContainer)) {
            currentContainer = null;
            elements.containerNumber.textContent = 'Yok';
            saveAppState();
        }
        
        showAlert(`${selectedContainers.length} konteyner silindi`, 'success');
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error deleting container:', error);
        showAlert('Konteyner silinirken hata oluştu', 'error');
    }
}

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
        
        // Load data when tab is clicked
        setTimeout(() => {
            switch(tabName) {
                case 'shipping':
                    populateShippingTable();
                    break;
                case 'stock':
                    populateStockTable();
                    break;
                case 'reports':
                    populateReportsTable();
                    break;
            }
        }, 100);
    }
}




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

function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// ==========================
// DAILY AUTO-CLEAR FUNCTION
// ==========================

// Clear local app state (frontend only)
function clearDailyAppState() {
    console.log('[Daily Clear] Clearing frontend state...');
    
    // Clear saved state in localStorage
    localStorage.removeItem('procleanState');

    // Reset global variables
    selectedCustomer = null;
    currentContainer = null;
    currentPackage = {};

    // Reset UI
    if (elements.customerSelect) elements.customerSelect.value = '';
    if (elements.personnelSelect) elements.personnelSelect.value = '';
    if (elements.containerNumber) elements.containerNumber.textContent = 'Yok';
    document.querySelectorAll('.quantity-badge').forEach(b => b.textContent = '0');
    const packageDetail = document.getElementById('packageDetailContent');
    if (packageDetail) packageDetail.innerHTML = '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';

    // Reload today's data from Supabase
    loadTodaysData();
}

// Load today's packages/containers from Supabase
async function loadTodaysData() {
    try {
        if (!supabase) return;

        // Fetch today's packages
        window.packages = await fetchTodaysPackages();
        window.containers = await fetchTodaysContainers();

        // Re-render UI tables
        renderPackagesTable();
        renderShippingTable();

        console.log('[Daily Clear] Data reloaded from Supabase');
    } catch (error) {
        console.error('Error loading today\'s data:', error);
    }
}

// Schedule daily clear at next midnight
function scheduleDailyClear() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5); // 5 sec buffer
    const msUntilMidnight = nextMidnight - now;

    console.log(`[Daily Clear] Next clear in ${Math.round(msUntilMidnight / 1000)} seconds`);

    setTimeout(() => {
        clearDailyAppState();
        scheduleDailyClear();  // reschedule for next day
    }, msUntilMidnight);
}

// Main initialization - prevent multiple calls
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting ProClean application initialization...');
    
    // Prevent multiple initializations
    if (appInitialized) {
        console.log('⚠️ App already initialized, skipping...');
        return;
    }
    
    appInitialized = true;

    try {
        // Initialize workspace system FIRST
        if (!window.workspaceManager) {
            window.workspaceManager = new WorkspaceManager();
        }
        await window.workspaceManager.initialize();
        
        console.log('✅ Workspace initialized:', window.workspaceManager.currentWorkspace);

        // Then initialize elements
        initializeElementsObject();
        
        // Initialize workspace-aware UI
        initializeWorkspaceUI();
        setupWorkspaceAwareUI();

        // Now setup all other event listeners
        setupEventListeners();
        
        // API key initialization
        initializeApiAndAuth();

        // Initialize settings
        initializeSettings();

        console.log('✅ ProClean fully initialized for workspace:', window.workspaceManager.currentWorkspace.name);

    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        showAlert('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
    }
});


// Separate function for event listeners
function setupEventListeners() {
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
        console.log('✅ Settings button listener added');
    }

    // Close settings modal
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsModal);
    }

    // Login button
    const loginBtn = elements.loginButton;
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
        console.log('✅ Login button listener added');
    } else {
        console.error('❌ Login button not found');
    }

    // Enter key listeners for login
    if (elements.emailInput) {
        elements.emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    if (elements.passwordInput) {
        elements.passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }

    // Quantity modal enter key
    if (elements.quantityInput) {
        elements.quantityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') confirmQuantity();
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

    // Tab click events
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) switchTab(tabName);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('settingsModal')) {
            closeSettingsModal();
        }
    });
}

function initializeApiAndAuth() {
    if (loadApiKey()) {
        supabase = initializeSupabase();
        if (supabase) {
            setupAuthListener();
            console.log('✅ Supabase client initialized');
        }
    } else {
        showApiKeyModal();
    }
}







// Sayfa yüklendiğinde API anahtarını localStorage'dan yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
        console.log('API key loaded from localStorage');
    }
    
    // Excel storage'ı başlat
    initializeExcelStorage().then(() => {
        console.log('Excel storage initialized');
    });
});

// State management functions
function saveAppState() {
    const state = {
        selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
        selectedPersonnelId: elements.personnelSelect.value,
        currentContainer: currentContainer,
        isUsingExcel: isUsingExcel
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
        
        // Restore Excel mode
        if (state.isUsingExcel !== undefined) {
            isUsingExcel = state.isUsingExcel;
            updateStorageIndicator();
        }
    }
}

// Enhanced initialization
async function initAppWithEnhancements() {
    console.log('🚀 Starting enhanced ProClean initialization...');
    
    try {
        // Check if required classes/functions are available
        if (typeof WorkspaceManager === 'undefined') {
            throw new Error('WorkspaceManager class not loaded');
        }
        
        if (typeof initializeElementsObject === 'undefined') {
            throw new Error('UI functions not loaded');
        }

        // 1. Initialize workspace system FIRST
        if (!window.workspaceManager) {
            window.workspaceManager = new WorkspaceManager();
        }
        await window.workspaceManager.initialize();
        
        console.log('✅ Workspace initialized:', window.workspaceManager.currentWorkspace);

        // 2. Initialize elements
        initializeElementsObject();
        
        // 3. Initialize workspace-aware UI
        if (typeof initializeWorkspaceUI === 'function') {
            initializeWorkspaceUI();
        }
        
        if (typeof setupWorkspaceAwareUI === 'function') {
            setupWorkspaceAwareUI();
        }

        // 4. Setup all enhancements
        if (typeof setupEnhancedLogout === 'function') {
            setupEnhancedLogout();
        }
        
        if (typeof setupPasswordProtection === 'function') {
            setupPasswordProtection();
        }
        
        if (typeof setupKeyboardShortcuts === 'function') {
            setupKeyboardShortcuts();
        }
        
        if (typeof setupExcelPreview === 'function') {
            setupExcelPreview();
        }
        
        // 5. Migrate existing data to workspace
        if (typeof migrateExistingDataToWorkspace === 'function') {
            await migrateExistingDataToWorkspace();
        }

        // 6. Initialize sync system
        if (typeof initializeSyncQueue === 'function') {
            initializeSyncQueue();
        }
        
        if (typeof setupEnhancedSyncTriggers === 'function') {
            setupEnhancedSyncTriggers();
        }

        // 7. Setup event listeners
        setupEventListeners();
        
        // 8. API key initialization
        initializeApiAndAuth();

        // 9. Initialize settings
        initializeSettings();

        // 10. Initialize daily Excel file system
        if (typeof ExcelStorage !== 'undefined') {
            await ExcelStorage.cleanupOldFiles();
            await ExcelStorage.readFile();
        }
        
        // 11. Populate UI
        if (elements.currentDate) {
            elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        if (typeof populateCustomers === 'function') {
            await populateCustomers();
        }
        
        if (typeof populatePersonnel === 'function') {
            await populatePersonnel();
        }
        
        // 12. Load saved state
        loadAppState();
        
        // 13. Load data
        if (typeof loadPackagesData === 'function') {
            await loadPackagesData();
        }
        
        if (typeof populateStockTable === 'function') {
            await populateStockTable();
        }
        
        if (typeof populateShippingTable === 'function') {
            await populateShippingTable();
        }
        
        // 14. Test connection
        if (typeof testConnection === 'function') {
            await testConnection();
        }
        
        // 15. Set up auto-save and offline support
        setInterval(saveAppState, 5000);
        
        if (typeof setupOfflineSupport === 'function') {
            setupOfflineSupport();
        }
        
        if (typeof setupBarcodeScanner === 'function') {
            setupBarcodeScanner();
        }
        
        // 16. Start daily auto-clear
        if (typeof scheduleDailyClear === 'function') {
            scheduleDailyClear();
        }

        // 17. Auto-sync on startup if online
        if (navigator.onLine && supabase && typeof syncExcelWithSupabase === 'function') {
            setTimeout(async () => {
                await syncExcelWithSupabase();
            }, 5000);
        }
        
        console.log(`🎉 ProClean fully initialized with enhancements for workspace: ${window.workspaceManager.currentWorkspace.name}`);
        
        // Only use showAlert if elements is ready
        if (elements.alertContainer && typeof showAlert === 'function') {
            showAlert('Uygulama başarıyla başlatıldı! Tüm geliştirmeler aktif.', 'success');
        }

    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        // Use console.error instead of showAlert for critical errors
        console.error('Uygulama başlatılırken hata oluştu: ' + error.message);
    }
}



// REPLACE the existing loadPackagesData function with this:
async function loadPackagesData() {
    if (!window.workspaceManager?.currentWorkspace) {
        console.warn('Workspace not initialized, using default');
    }
    
    try {
        const workspaceId = getCurrentWorkspaceId();
        
        // Load from workspace-specific Excel
        const excelData = await ExcelJS.readFile();
        const excelPackagesList = ExcelJS.fromExcelFormat(excelData);
        
        // STRICT workspace filtering
        const workspacePackages = excelPackagesList.filter(pkg => {
            const isValid = pkg.workspace_id === workspaceId;
            if (!isValid) {
                console.warn('Filtered package from different workspace during load:', pkg.id);
            }
            return isValid;
        });
        
        console.log(`Loaded from ${getCurrentWorkspaceName()} Excel:`, workspacePackages.length, 'packages');
        window.packages = workspacePackages;
        
        // Load from Supabase with STRICT workspace filtering
        if (supabase && navigator.onLine) {
            try {
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .eq('workspace_id', workspaceId) // STRICT FILTER
                    .order('created_at', { ascending: false });
                
                if (!error && supabasePackages && supabasePackages.length > 0) {
                    console.log(`Loaded from Supabase:`, supabasePackages.length, 'packages');
                    
                    // Merge with Excel data (Supabase takes priority)
                    const mergedPackages = mergePackages(workspacePackages, supabasePackages);
                    window.packages = mergedPackages;
                    
                    // Update Excel storage with merged data
                    const excelData = ExcelJS.toExcelFormat(mergedPackages);
                    await ExcelJS.writeFile(excelData);
                }
            } catch (supabaseError) {
                console.warn('Supabase load failed, using Excel data:', supabaseError);
            }
        }
        
        await populatePackagesTable();
        
    } catch (error) {
        console.error('Error loading packages data:', error);
        showAlert('Paket verileri yüklenirken hata oluştu', 'error');
    }
}





function mergePackages(excelPackages, supabasePackages) {
    const merged = [...excelPackages];
    const excelIds = new Set(excelPackages.map(p => p.id));
    
    for (const supabasePkg of supabasePackages) {
        if (!excelIds.has(supabasePkg.id)) {
            merged.push(supabasePkg);
        }
    }
    
    return merged;
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

    // Check workspace permissions
    if (!window.workspaceManager.canPerformAction('create_package')) {
        showAlert('Bu istasyon paket oluşturamaz', 'error');
        return;
    }

    try {
        // GENERATE THE ID ONCE HERE
        const packageId = `pkg-${window.workspaceManager.currentWorkspace.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const packageNo = `PKG-${window.workspaceManager.currentWorkspace.id}-${Date.now()}`;
        const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);
        const selectedPersonnel = elements.personnelSelect.value;

        // Enhanced package data with workspace info - USE THE SAME ID
        const packageData = {
            id: packageId, // SAME ID FOR BOTH SYSTEMS
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            customer_code: selectedCustomer.code,
            items: currentPackage.items,
            items_array: Object.entries(currentPackage.items).map(([name, qty]) => ({
                name: name,
                qty: qty
            })),
            items_display: Object.entries(currentPackage.items).map(([name, qty]) => 
                `${name}: ${qty} adet`
            ).join(', '),
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workspace_id: window.workspaceManager.currentWorkspace.id,
            station_name: window.workspaceManager.currentWorkspace.name,
            daily_file: ExcelStorage.getTodayDateString()
        };

        // Save based on connectivity and workspace settings
        if (supabase && navigator.onLine && !isUsingExcel) {
            try {
                const { data, error } = await supabase
                    .from('packages')
                    .insert([packageData])
                    .select();

                if (error) throw error;

                showAlert(`Paket oluşturuldu: ${packageNo} (${window.workspaceManager.currentWorkspace.name})`, 'success');
                await saveToExcel(packageData); // SAME packageData with SAME ID
                
            } catch (supabaseError) {
                console.warn('Supabase save failed, saving to Excel:', supabaseError);
                await saveToExcel(packageData); // SAME packageData with SAME ID
                addToSyncQueue('add', packageData); // SAME packageData with SAME ID
                showAlert(`Paket Excel'e kaydedildi: ${packageNo} (${window.workspaceManager.currentWorkspace.name})`, 'warning');
                isUsingExcel = true;
            }
        } else {
            await saveToExcel(packageData); // SAME packageData with SAME ID
            addToSyncQueue('add', packageData); // SAME packageData with SAME ID
            showAlert(`Paket Excel'e kaydedildi: ${window.workspaceManager.currentWorkspace.name})`, 'warning');
            isUsingExcel = true;
        }

        // Reset and refresh
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');
        await populatePackagesTable();
        updateStorageIndicator();

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası', 'error');
    }
}




// Modified deleteSelectedPackages function
async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

    try {
        const packageIds = Array.from(checkboxes).map(cb => cb.value);

        // Online ve Supabase bağlı ise önce Supabase'den sil
        if (supabase && navigator.onLine && !isUsingExcel) {
            try {
                const { error } = await supabase
                    .from('packages')
                    .delete()
                    .in('id', packageIds);

                if (error) throw error;

                // Sonra Excel'den sil
                for (const id of packageIds) {
                    await deleteFromExcel(id);
                }
                
                showAlert(`${packageIds.length} paket silindi (Online)`, 'success');
                
            } catch (supabaseError) {
                console.warn('Supabase delete failed, deleting from Excel:', supabaseError);
                // Supabase başarısız olursa Excel'den sil
                for (const id of packageIds) {
                    await deleteFromExcel(id);
                    addToSyncQueue('delete', { id: id });
                }
                showAlert(`${packageIds.length} paket Excel'den silindi (Çevrimdışı)`, 'warning');
                isUsingExcel = true;
            }
        } else {
            // Offline ise direkt Excel'den sil
            for (const id of packageIds) {
                await deleteFromExcel(id);
                addToSyncQueue('delete', { id: id });
            }
            showAlert(`${packageIds.length} paket Excel'den silindi (Çevrimdışı)`, 'warning');
            isUsingExcel = true;
        }

        await populatePackagesTable();
        updateStorageIndicator();

    } catch (error) {
        console.error('Error in deleteSelectedPackages:', error);
        showAlert('Paket silme hatası', 'error');
    }
}

// New function to update storage indicator
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

// New function to manually sync data
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
        await loadPackagesData(); // Verileri yeniden yükle
    }
}

// New function to export Excel data
async function exportExcelData() {
    try {
        const packages = await ExcelJS.readFile();
        if (packages.length === 0) {
            showAlert('Excel verisi yok', 'info');
            return;
        }
        
        const dataStr = JSON.stringify(packages, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `packages-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showAlert('Excel verileri yedeklendi', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Yedekleme hatası', 'error');
    }
}

// New function to import Excel data
async function importExcelData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                const excelData = ExcelJS.toExcelFormat(importedData);
                
                await ExcelJS.writeFile(excelData);
                excelPackages = importedData;
                
                showAlert('Excel verileri içe aktarıldı', 'success');
                await populatePackagesTable();
                
            } catch (parseError) {
                console.error('Import parse error:', parseError);
                showAlert('Geçersiz dosya formatı', 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    } catch (error) {
        console.error('Import error:', error);
        showAlert('İçe aktarma hatası', 'error');
    }
}








// Temporary debug function - call this in console
function debugWorkspace() {
    console.log('=== WORKSPACE DEBUG INFO ===');
    console.log('Current Workspace:', window.workspaceManager?.currentWorkspace);
    console.log('Excel Packages:', excelPackages);
    console.log('LocalStorage Keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('excelPackages') || key.includes('workspace')) {
            console.log(`- ${key}:`, localStorage.getItem(key));
        }
    }
    
    // Test workspace storage
    const workspaceId = window.workspaceManager?.currentWorkspace?.id;
    const testData = localStorage.getItem(`excelPackages_${workspaceId}`);
    console.log(`Workspace data for ${workspaceId}:`, testData ? JSON.parse(testData) : 'EMPTY');
}

// Call this after page loads
setTimeout(debugWorkspace, 3000);



// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Prevent shortcuts in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        // F2 - Paketle
        if (e.key === 'F2') {
            e.preventDefault();
            if (typeof completePackage === 'function') {
                completePackage();
            }
        }
        
        // F4 - Etiketi Yazdır
        if (e.key === 'F4') {
            e.preventDefault();
            const selectedPackage = getSelectedPackage();
            if (selectedPackage && typeof printPackageWithSettings === 'function') {
                printPackageWithSettings(selectedPackage);
            } else {
                showAlert("Yazdırmak için önce bir paket seçin", "warning");
            }
        }
        
        // F8 - Delete
        if (e.key === 'F8') {
            e.preventDefault();
            if (typeof deleteSelectedPackages === 'function') {
                deleteSelectedPackages();
            }
        }
        
        // F9 - Send to Ramp
        if (e.key === 'F9') {
            e.preventDefault();
            if (typeof sendToRamp === 'function') {
                sendToRamp();
            }
        }
        
        // Ctrl+Q - Select All Packages
        if (e.ctrlKey && e.key === 'q') {
            e.preventDefault();
            const selectAll = document.getElementById('selectAllPackages');
            if (selectAll) {
                selectAll.checked = !selectAll.checked;
                toggleSelectAll();
            }
        }
    });
}

// Add help tooltip for shortcuts
function showKeyboardShortcutsHelp() {
    const shortcuts = [
        { key: 'F2', action: 'Paketle - Yeni paket oluştur' },
        { key: 'F4', action: 'Etiketi Yazdır - Seçili paketin etiketini yazdır' },
        { key: 'F8', action: 'Sil - Seçili öğeleri sil' },
        { key: 'F9', action: 'Sevkiyata Gönder - Paketleri rampa gönder' },
        { key: 'Ctrl+Q', action: 'Tümünü Seç - Tüm paketleri seç' }
    ];
    
    let helpText = "Klavye Kısayolları:\n\n";
    shortcuts.forEach(shortcut => {
        helpText += `${shortcut.key}: ${shortcut.action}\n`;
    });
    
    alert(helpText);
}



// Enhanced logout setup
function setupEnhancedLogout() {
    // Replace any existing logout functionality
    const logoutButtons = document.querySelectorAll('[onclick*="logout"], [onclick*="signOut"]');
    logoutButtons.forEach(btn => {
        btn.onclick = logoutWithConfirmation;
    });
    
    // Also add logout button to settings if not exists
    if (!document.getElementById('enhancedLogoutBtn')) {
        setTimeout(() => {
            const settingsPanel = document.querySelector('.settings-panel, .settings-content');
            if (settingsPanel) {
                const logoutBtn = document.createElement('button');
                logoutBtn.id = 'enhancedLogoutBtn';
                logoutBtn.className = 'btn btn-danger';
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Çıkış Yap';
                logoutBtn.onclick = logoutWithConfirmation;
                logoutBtn.style.marginTop = '10px';
                settingsPanel.appendChild(logoutBtn);
            }
        }, 1000);
    }
}




