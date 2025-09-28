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
// REPLACE the existing initApp function with this:
async function initApp() {
    // Initialize workspace system first
    await window.workspaceManager.initialize();
    
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
    
    // Initialize workspace-aware UI
    initializeWorkspaceUI();
    setupWorkspaceAwareUI();
    
    // Populate dropdowns
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load workspace-specific data
    await loadPackagesData();
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
    
    // Start daily auto-clear
    scheduleDailyClear();
    
    console.log(`App initialized for workspace: ${window.workspaceManager.currentWorkspace.name}`);
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


// ==================== DAILY FILE MANAGEMENT SYSTEM ====================

// Date-based storage key
function getCurrentDateKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// Sync previous day's pending data
async function syncPreviousDayData() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    
    const yesterdayPackages = localStorage.getItem(`excel_packages_${yesterdayKey}`);
    
    if (yesterdayPackages) {
        const packages = JSON.parse(yesterdayPackages);
        const pendingPackages = packages.filter(pkg => pkg.sync_status === 'pending');
        
        if (pendingPackages.length > 0 && supabase && navigator.onLine) {
            console.log(`Syncing ${pendingPackages.length} pending packages from yesterday`);
            
            for (const pkg of pendingPackages) {
                try {
                    const { error } = await supabase
                        .from('packages')
                        .insert([{
                            ...pkg,
                            sync_status: 'synced',
                            synced_at: new Date().toISOString()
                        }]);
                    
                    if (!error) {
                        // Mark as synced in yesterday's storage
                        const updatedPackages = packages.map(p => 
                            p.id === pkg.id ? { ...p, sync_status: 'synced' } : p
                        );
                        localStorage.setItem(`excel_packages_${yesterdayKey}`, JSON.stringify(updatedPackages));
                    }
                } catch (error) {
                    console.error('Failed to sync package:', pkg.id, error);
                }
            }
        }
    }
}

// Initialize daily Excel storage
async function initializeDailyExcelStorage() {
    const dateKey = getCurrentDateKey();
    
    // Check if we have data for today
    const todayPackages = await ExcelJS.readFile('packages');
    const todayContainers = await ExcelJS.readFile('containers');
    
    if (todayPackages.length === 0 && todayContainers.length === 0) {
        console.log('Initializing new daily Excel storage for:', dateKey);
        
        // Initialize empty arrays for today
        await ExcelJS.writeFile([], 'packages');
        await ExcelJS.writeFile([], 'containers');
        
        // Sync previous day's pending data if any
        await syncPreviousDayData();
    }
    
    return {
        packages: todayPackages,
        containers: todayContainers
    };
}

class DailyFileManager {
    constructor() {
        this.currentDateKey = getCurrentDateKey();
        this.autoSyncInterval = null;
    }
    
    async initialize() {
        console.log('Initializing daily file manager for:', this.currentDateKey);
        
        // Check if date changed
        this.checkDateChange();
        
        // Start auto-sync
        this.startAutoSync();
        
        // Initialize today's files
        return await initializeDailyExcelStorage();
    }
    
    checkDateChange() {
        const todayKey = getCurrentDateKey();
        if (todayKey !== this.currentDateKey) {
            console.log('Date changed from', this.currentDateKey, 'to', todayKey);
            this.currentDateKey = todayKey;
            
            // Trigger daily cleanup and new file creation
            this.initializeNewDay();
        }
    }
    
    async initializeNewDay() {
        console.log('Initializing new day:', this.currentDateKey);
        
        // Sync yesterday's pending data
        await syncPreviousDayData();
        
        // Create new empty files for today
        await ExcelJS.writeFile([], 'packages');
        await ExcelJS.writeFile([], 'containers');
        
        // Clear frontend state
        clearDailyAppState();
        
        showAlert(`Yeni gün başlatıldı: ${this.currentDateKey}`, 'info');
    }
    
    startAutoSync() {
        // Sync every 2 minutes if online
        this.autoSyncInterval = setInterval(async () => {
            if (navigator.onLine && supabase) {
                await this.syncPendingData();
            }
        }, 120000); // 2 minutes
    }
    
    async syncPendingData() {
        try {
            const packages = await ExcelJS.readFile('packages');
            const pendingPackages = packages.filter(pkg => pkg.sync_status === 'pending');
            
            if (pendingPackages.length > 0) {
                console.log(`Auto-syncing ${pendingPackages.length} pending packages`);
                
                for (const pkg of pendingPackages) {
                    try {
                        const supabasePackage = { ...pkg };
                        delete supabasePackage.source;
                        delete supabasePackage.sync_status;
                        
                        const { error } = await supabase
                            .from('packages')
                            .insert([supabasePackage]);
                        
                        if (!error) {
                            // Mark as synced
                            const updatedPackages = packages.map(p => 
                                p.id === pkg.id ? { ...p, sync_status: 'synced' } : p
                            );
                            await ExcelJS.writeFile(updatedPackages, 'packages');
                        }
                    } catch (error) {
                        console.error('Auto-sync failed for package:', pkg.id, error);
                    }
                }
            }
        } catch (error) {
            console.error('Auto-sync error:', error);
        }
    }
    
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
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

// Enhanced package data merging
function mergePackageData(excelData, supabaseData) {
    const merged = [...excelData];
    const excelIds = new Set(excelData.map(p => p.id));
    
    // Add Supabase packages not in Excel
    for (const supabasePkg of supabaseData) {
        if (!excelIds.has(supabasePkg.id)) {
            merged.push({
                ...supabasePkg,
                source: 'supabase',
                sync_status: 'synced'
            });
        } else {
            // Update existing Excel packages with Supabase data
            const index = merged.findIndex(p => p.id === supabasePkg.id);
            if (index !== -1) {
                merged[index] = {
                    ...merged[index],
                    ...supabasePkg,
                    source: 'supabase',
                    sync_status: 'synced'
                };
            }
        }
    }
    
    return merged;
}

// Export today's Excel data
async function exportTodaysData() {
    try {
        const dateKey = getCurrentDateKey();
        const packages = await ExcelJS.readFile('packages');
        const containers = await ExcelJS.readFile('containers');
        
        const exportData = {
            export_date: new Date().toISOString(),
            date_key: dateKey,
            packages: packages,
            containers: containers,
            metadata: {
                total_packages: packages.length,
                total_containers: containers.length,
                workspace: window.workspaceManager?.currentWorkspace?.name || 'default'
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `proclean-data-${dateKey}.json`;
        link.click();
        
        showAlert(`Bugünün verileri dışa aktarıldı: ${dateKey}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Dışa aktarma hatası', 'error');
    }
}

// Enhanced package data merging
function mergePackageData(excelData, supabaseData) {
    const merged = [...excelData];
    const excelIds = new Set(excelData.map(p => p.id));
    
    // Add Supabase packages not in Excel
    for (const supabasePkg of supabaseData) {
        if (!excelIds.has(supabasePkg.id)) {
            merged.push({
                ...supabasePkg,
                source: 'supabase',
                sync_status: 'synced'
            });
        } else {
            // Update existing Excel packages with Supabase data
            const index = merged.findIndex(p => p.id === supabasePkg.id);
            if (index !== -1) {
                merged[index] = {
                    ...merged[index],
                    ...supabasePkg,
                    source: 'supabase',
                    sync_status: 'synced'
                };
            }
        }
    }
    
    return merged;
}

// Export today's Excel data
async function exportTodaysData() {
    try {
        const dateKey = getCurrentDateKey();
        const packages = await ExcelJS.readFile('packages');
        const containers = await ExcelJS.readFile('containers');
        
        const exportData = {
            export_date: new Date().toISOString(),
            date_key: dateKey,
            packages: packages,
            containers: containers,
            metadata: {
                total_packages: packages.length,
                total_containers: containers.length,
                workspace: window.workspaceManager?.currentWorkspace?.name || 'default'
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `proclean-data-${dateKey}.json`;
        link.click();
        
        showAlert(`Bugünün verileri dışa aktarıldı: ${dateKey}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Dışa aktarma hatası', 'error');
    }
}

    
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

// Main initialization
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Initializing ProClean application with daily file management...');
        
        // Initialize workspace system FIRST
        window.workspaceManager = new WorkspaceManager();
        await window.workspaceManager.initialize();
        
        console.log('Workspace initialized:', window.workspaceManager.currentWorkspace);
        
        // Initialize daily file manager SECOND
        window.dailyFileManager = new DailyFileManager();
        await window.dailyFileManager.initialize();
        
        console.log('Daily file manager initialized');
        
        // Then initialize elements
        initializeElementsObject();
        
        // Setup basic event listeners
        setupBasicEventListeners();
        
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

        // Set initial display states
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
        }
        if (elements.appContainer) {
            elements.appContainer.style.display = 'none';
        }
        
        // Initialize workspace-aware UI
        initializeWorkspaceUI();
        setupWorkspaceAwareUI();
        
        console.log('ProClean application initialized successfully for workspace:', window.workspaceManager.currentWorkspace.name);
        
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

// NEW: Basic event listeners setup function
function setupBasicEventListeners() {
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

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('settingsModal')) {
            closeSettingsModal();
        }
    });
}

// NEW: Theme functions
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

// Initialize application
async function initApp() {
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
    
    // Storage indicator'ı güncelle
    updateStorageIndicator();
    
    // Populate dropdowns
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load data - önce Excel'den, sonra Supabase'den
    await loadPackagesData();
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
    
    // Start daily auto-clear
    scheduleDailyClear();
}

// REPLACE the existing loadPackagesData function with this:
async function loadPackagesData() {
    if (!window.workspaceManager?.currentWorkspace) {
        console.warn('Workspace not initialized, using default');
    }
    
    try {
        const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
        
        // Load from workspace-specific Excel
        const excelData = await ExcelJS.readFile();
        const excelPackagesList = ExcelJS.fromExcelFormat(excelData);
        
        // Filter by workspace
        const workspacePackages = excelPackagesList.filter(pkg => 
            pkg.workspace_id === workspaceId
        );
        
        console.log(`Loaded from ${window.workspaceManager?.currentWorkspace?.name || 'Default'} Excel:`, workspacePackages.length, 'packages');
        window.packages = workspacePackages;
        
        // Load from Supabase with workspace filtering
        if (supabase && navigator.onLine) {
            try {
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .eq('workspace_id', workspaceId)
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

// REPLACE the existing completePackage function with this:
// REPLACE in app.js - the completePackage function
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
        const selectedPersonnel = elements.personnelSelect.value;

        // Convert items to proper format
        const itemsArray = Object.entries(currentPackage.items).map(([name, qty]) => ({
            name: name,
            qty: qty
        }));

        const packageData = {
            id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            customer_code: selectedCustomer.code,
            items: itemsArray,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workspace_id: window.workspaceManager?.currentWorkspace?.id || 'default',
            station_name: window.workspaceManager?.currentWorkspace?.name || 'Default',
            source: 'excel',
            sync_status: 'pending'
        };

        // ALWAYS save to Excel first for persistence
        const currentPackages = await ExcelJS.readFile('packages');
        currentPackages.push(packageData);
        const success = await ExcelJS.writeFile(currentPackages, 'packages');
        
        if (success) {
            // Update global state
            excelPackages = currentPackages;
            
            // Try to sync with Supabase if online
            if (supabase && navigator.onLine) {
                try {
                    const supabasePackage = { ...packageData };
                    delete supabasePackage.source; // Remove Excel-specific fields
                    
                    const { data, error } = await supabase
                        .from('packages')
                        .insert([supabasePackage])
                        .select();

                    if (!error) {
                        // Update Excel record with sync status
                        const updatedPackages = currentPackages.map(p => 
                            p.id === packageData.id ? { ...p, sync_status: 'synced' } : p
                        );
                        await ExcelJS.writeFile(updatedPackages, 'packages');
                        excelPackages = updatedPackages;
                        
                        showAlert(`Paket oluşturuldu ve senkronize edildi: ${packageNo}`, 'success');
                    } else {
                        throw error;
                    }
                } catch (supabaseError) {
                    console.warn('Supabase sync failed, package saved locally:', supabaseError);
                    showAlert(`Paket oluşturuldu (Yerel Kayıt): ${packageNo}`, 'warning');
                }
            } else {
                showAlert(`Paket oluşturuldu (Çevrimdışı): ${packageNo}`, 'warning');
            }

            // Reset UI state
            currentPackage = {};
            document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');
            
            // Refresh display
            await populatePackagesTable();
            updateStorageIndicator();
        }

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası: ' + error.message, 'error');
    }
}

// REPLACE the loadPackagesData function in app.js
async function loadPackagesData() {
    try {
        // Initialize daily storage
        const dailyData = await initializeDailyExcelStorage();
        excelPackages = dailyData.packages;
        
        console.log('Loaded from daily Excel:', excelPackages.length, 'packages');
        
        // If online, try to sync and merge with Supabase
        if (supabase && navigator.onLine) {
            try {
                const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
                
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .eq('workspace_id', workspaceId)
                    .gte('created_at', new Date().toISOString().split('T')[0]) // Today's packages only
                    .order('created_at', { ascending: false });

                if (!error && supabasePackages) {
                    console.log('Loaded from Supabase:', supabasePackages.length, 'packages');
                    
                    // Merge strategies: Supabase takes precedence
                    const mergedPackages = mergePackageData(excelPackages, supabasePackages);
                    
                    // Update Excel storage with merged data
                    if (mergedPackages.length !== excelPackages.length) {
                        await ExcelJS.writeFile(mergedPackages, 'packages');
                        excelPackages = mergedPackages;
                    }
                }
            } catch (supabaseError) {
                console.warn('Supabase load failed, using Excel data:', supabaseError);
            }
        }
        
        window.packages = excelPackages;
        await populatePackagesTable();
        
    } catch (error) {
        console.error('Error loading packages data:', error);
        showAlert('Paket verileri yüklenirken hata oluştu', 'error');
    }
}

// NEW: Enhanced package data merging
function mergePackageData(excelData, supabaseData) {
    const merged = [...excelData];
    const excelIds = new Set(excelData.map(p => p.id));
    
    // Add Supabase packages not in Excel
    for (const supabasePkg of supabaseData) {
        if (!excelIds.has(supabasePkg.id)) {
            merged.push({
                ...supabasePkg,
                source: 'supabase',
                sync_status: 'synced'
            });
        } else {
            // Update existing Excel packages with Supabase data
            const index = merged.findIndex(p => p.id === supabasePkg.id);
            if (index !== -1) {
                merged[index] = {
                    ...merged[index],
                    ...supabasePkg,
                    source: 'supabase',
                    sync_status: 'synced'
                };
            }
        }
    }
    
    return merged;
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
