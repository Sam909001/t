// ==================== ADD THESE LINES AT THE TOP OF YOUR APP.JS ====================
let initAppInProgress = false;
let initAppCallQueue = [];



/// Top of app.js
window.initializePrinter = function() {
    console.log("Printer initialized");
    if (typeof window.printer === 'undefined') {
        window.printer = { isConnected: true, serverUrl: 'Yerel Yazıcı' };
    }
};

window.checkPrinterStatus = function() {
    console.log('🔍 Checking printer status...');
    
    if (typeof window.printer === 'undefined') {
        console.log('🔄 Printer not found, initializing...');
        window.initializePrinter();
    }

    if (!window.printer) {
        console.log('❌ Printer initialization failed');
        showAlert('Yazıcı servisi başlatılamadı', 'error');
        return false;
    }

    console.log(`📊 Printer status:`, {
        defined: !!window.printer,
        connected: window.printer.isConnected,
        serverUrl: window.printer.serverUrl
    });

    const statusMessage = window.printer.isConnected ? 
        `Yazıcı bağlı: ${window.printer.serverUrl || 'Yerel yazıcı'}` : 
        'Yazıcı bağlı değil';

    showAlert(`Yazıcı durumu: ${statusMessage}`, 
              window.printer.isConnected ? 'success' : 'error');

    return window.printer.isConnected;
};


// ============================================
// 1. STORAGE INITIALIZATION
// ============================================

async function initializeApp() {
  console.log('🚀 Initializing app...');
  console.log('Environment:', WorkstationStorage ? 'Storage Ready' : 'Storage Not Available');
  console.log('Running in Electron:', StorageManager.isElectron());

  // Check and restore workstation name
  const savedWorkstation = await WorkstationStorage.getWorkstation();
  if (savedWorkstation) {
    console.log('✅ Workstation found:', savedWorkstation);
    // Set it in your UI
    if (document.getElementById('workstationName')) {
      document.getElementById('workstationName').value = savedWorkstation;
    }
    // Store in a global variable if needed
    window.CURRENT_WORKSTATION = savedWorkstation;
  } else {
    console.log('⚠️ No saved workstation - will prompt user');
  }

  // Check and restore authentication
  const authData = await WorkstationStorage.getAuth();
  if (authData) {
    console.log('✅ Auth data found - user should stay logged in');
    // Restore your Supabase session or auth state here
    window.CURRENT_USER = authData;
  } else {
    console.log('⚠️ No auth data - user needs to log in');
  }
}


// ==================== APP.JS - TOP OF FILE ====================

// Detect if running in Electron
function isElectron() {
    return typeof window !== 'undefined' && 
           typeof window.process === 'object' && 
           window.process.type === 'renderer';
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
        
        // ⭐⭐⭐ CRITICAL FIX: Only restore selections AFTER dropdowns are populated
        setTimeout(() => {
            // Restore customer selection
            if (state.selectedCustomerId && elements.customerSelect) {
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
            if (state.selectedPersonnelId && elements.personnelSelect) {
                elements.personnelSelect.value = state.selectedPersonnelId;
            }
            
            // Restore current container
            if (state.currentContainer) {
                currentContainer = state.currentContainer;
                if (elements.containerNumber) {
                    elements.containerNumber.textContent = currentContainer;
                }
            }
            
            // Restore Excel mode
            if (state.isUsingExcel !== undefined) {
                isUsingExcel = state.isUsingExcel;
                updateStorageIndicator();
            }
        }, 100); // Small delay to ensure dropdowns are populated
    }
}



// ==================== MODIFIED INITAPP FUNCTION ====================
async function initApp() {
    // If initApp is already running, queue this call
    if (initAppInProgress) {
        console.log('🚫 initApp already in progress, queuing call...');
        return new Promise((resolve) => {
            initAppCallQueue.push(resolve);
        });
    }
    
    initAppInProgress = true;
    console.log('🚀 Starting enhanced ProClean initialization...');
    
    try {
        // 1. CRITICAL FIX: Initialize elements FIRST before anything else
        if (typeof initializeElementsObject !== 'function') {
            console.error('❌ initializeElementsObject function not loaded!');
            // Fallback: load from ui.js if not available
            if (typeof elements === 'undefined') {
                window.elements = {};
            }
        } else {
            initializeElementsObject();
        }
        
        // 2. Initialize workspace system
        if (!window.workspaceManager) {
            window.workspaceManager = new WorkspaceManager();
        }
        await window.workspaceManager.initialize();
        
        console.log('✅ Workspace initialized:', window.workspaceManager.currentWorkspace);
        
        // 0. Detect and log environment
        const runningInElectron = isElectron();
        if (runningInElectron) {
            console.log('📱 Running in Electron environment');
            window.isElectronApp = true;
        } else {
            console.log('🌐 Running in Web Browser environment');
            window.isElectronApp = false;
        }

        // 3. Initialize workspace-aware UI
        if (typeof initializeWorkspaceUI === 'function') {
            initializeWorkspaceUI();
        }
        if (typeof setupWorkspaceAwareUI === 'function') {
            setupWorkspaceAwareUI();
        }
        
        // 4. Migrate existing data to workspace
        if (typeof migrateExistingDataToWorkspace === 'function') {
            await migrateExistingDataToWorkspace();
        }
        
        // 5. Initialize sync system
        if (typeof initializeSyncQueue === 'function') {
            initializeSyncQueue();
        }
        if (typeof setupEnhancedSyncTriggers === 'function') {
            setupEnhancedSyncTriggers();
        }
        
        // 6. Setup event listeners
        setupEventListeners();
        
        // 7. API key initialization
        initializeApiAndAuth();
        
        // 8. Initialize settings
        if (typeof initializeSettings === 'function') {
            initializeSettings();
        }
        
        // 9. Initialize daily Excel file system
        if (typeof ExcelStorage !== 'undefined') {
            if (typeof ExcelStorage.cleanupOldFiles === 'function') {
                await ExcelStorage.cleanupOldFiles();
            }
            if (typeof ExcelStorage.readFile === 'function') {
                await ExcelStorage.readFile();
            }
        }
        
        // 10. Populate UI - CRITICAL: Reset personnelLoaded flag here
        if (elements.currentDate) {
            elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        // ⭐⭐⭐ CRITICAL FIX: Reset flags before populating ⭐⭐⭐
        window.personnelLoaded = false;
        
        await populateCustomers();
        await populatePersonnel();
        
        // 11. Load saved state
        loadAppState();
        
        // 12. Load data
        await loadPackagesData();
        await populateStockTable();
        await populateShippingTable();
        
        // 13. Test connection
        if (supabase) {
            await testConnection();
        }
        
        // 14. Set up auto-save and offline support
        setInterval(saveAppState, 30000);
        setupOfflineSupport();
        if (typeof setupBarcodeScanner === 'function') {
            setupBarcodeScanner();
        }
        
        // 15. Start daily auto-clear
        scheduleDailyClear();
        
        // 16. Auto-sync on startup if online and not in Electron
        if (navigator.onLine && supabase && !runningInElectron) {
            setTimeout(async () => {
                if (typeof syncExcelWithSupabase === 'function') {
                    await syncExcelWithSupabase();
                }
            }, 5000);
        }
        
        const workspaceName = window.workspaceManager?.currentWorkspace?.name || 'Default';
        console.log(`✅ ProClean fully initialized for workspace: ${workspaceName}`);
        showAlert('Uygulama başarıyla başlatıldı!', 'success', 3000);
        
    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        console.error('Error stack:', error.stack);
        showAlert('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
    } finally {
        // ⭐⭐⭐ CRITICAL: Always reset the progress flag ⭐⭐⭐
        initAppInProgress = false;
        
        // Process any queued calls
        if (initAppCallQueue.length > 0) {
            console.log(`🔄 Processing ${initAppCallQueue.length} queued initApp calls`);
            const nextCall = initAppCallQueue.shift();
            nextCall();
        }
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
    const selectedCheckboxes = document.querySelectorAll('.container-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Silinecek konteyner seçin', 'error');
        return;
    }

    if (!confirm(`${selectedCheckboxes.length} konteyneri silmek istediğinize emin misiniz?`)) {
        return;
    }

    try {
        showAlert('Konteynerler siliniyor...', 'info');
        
        // Get container IDs properly
        const containerIds = [];
        selectedCheckboxes.forEach(checkbox => {
            // Try multiple ways to get the ID
            const id = checkbox.getAttribute('data-container-id') || 
                      checkbox.getAttribute('data-id') || 
                      checkbox.value;
            if (id) containerIds.push(id);
        });

        if (containerIds.length === 0) {
            showAlert('Konteyner ID bulunamadı', 'error');
            return;
        }

        // Delete from Supabase
        if (supabase && navigator.onLine) {
            // First update packages
            const { error: updateError } = await supabase
                .from('packages')
                .update({ 
                    container_id: null,
                    status: 'beklemede'
                })
                .in('container_id', containerIds);

            if (updateError) {
                console.error('Package update error:', updateError);
            }

            // Then delete containers
            const { error: deleteError } = await supabase
                .from('containers')
                .delete()
                .in('id', containerIds);

            if (deleteError) throw deleteError;
        }

        // Clear current container if deleted
        if (currentContainer && containerIds.includes(currentContainer)) {
            currentContainer = null;
            if (elements.containerNumber) {
                elements.containerNumber.textContent = 'Yok';
            }
        }
        
        showAlert(`✅ ${containerIds.length} konteyner silindi`, 'success');
        await populateShippingTable();
        
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Silme hatası: ' + error.message, 'error');
    }
}

function switchTab(tabName) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none'; // ← ADD THIS
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate selected tab and pane
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedPane = document.getElementById(`${tabName}Tab`);
    
    if (selectedTab && selectedPane) {
        selectedTab.classList.add('active');
        selectedPane.classList.add('active');
        selectedPane.style.display = 'block'; // ← ADD THIS
        
        console.log(`✅ Activated tab: ${tabName}`);
        
        // Load data
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
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user');
        
        if (session) {
            // ADD THIS LINE to save session
            await saveUserSession(session);
            
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
            // ADD THIS LINE to clear session on logout
            await StorageManager.removeItem('supabase_session');
            
            document.getElementById('loginScreen').style.display = "flex";
            document.getElementById('appContainer').style.display = "none";
        }
    });
}

// Save user session to storage
async function saveUserSession(session) {
    if (!session) return;
    
    await StorageManager.setItem('supabase_session', {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
        expires_at: session.expires_at
    });
    
    console.log('Session saved to storage');
}

// Restore user session from storage
async function restoreUserSession() {
    const savedSession = await StorageManager.getItem('supabase_session');
    
    if (!savedSession) {
        console.log('No saved session found');
        return false;
    }
    
    // Check if session expired
    if (savedSession.expires_at) {
        const expiryDate = new Date(savedSession.expires_at * 1000);
        const now = new Date();
        
        if (now > expiryDate) {
            console.log('Session expired, clearing...');
            await StorageManager.removeItem('supabase_session');
            return false;
        }
    }
    
    // Restore session in Supabase
    if (supabase) {
        try {
            const { data, error } = await supabase.auth.setSession({
                access_token: savedSession.access_token,
                refresh_token: savedSession.refresh_token
            });
            
            if (error) throw error;
            
            console.log('Session restored successfully');
            return true;
        } catch (error) {
            console.error('Failed to restore session:', error);
            await StorageManager.removeItem('supabase_session');
            return false;
        }
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

// Main initialization
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting ProClean application initialization...');
    try {
        // Initialize workspace system FIRST
        if (!window.workspaceManager) {
            window.workspaceManager = new WorkspaceManager();
        }
        await window.workspaceManager.initialize();
        
        console.log('✅ Workspace initialized:', window.workspaceManager.currentWorkspace);
        
        // Initialize elements
        initializeElementsObject();
        
        // Initialize workspace-aware UI
        initializeWorkspaceUI();
        setupWorkspaceAwareUI();
        
        // Setup event listeners
        setupEventListeners();
        
        // API key initialization - ADD AWAIT HERE
        await initializeApiAndAuth();
        
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

async function initializeApiAndAuth() {
    try {
        console.log('🔄 Initializing Supabase connection...');
        
        // Initialize Supabase
        const client = await initializeSupabase();
        
        if (client) {
            console.log('✅ Supabase client initialized successfully');
            setupAuthListener();
            
            // Try to restore saved session
            const sessionRestored = await restoreUserSession();
            
            if (sessionRestored) {
                console.log('✅ User session restored, auto-login successful');
                showAlert('Oturum geri yüklendi!', 'success');
            } else {
                console.log('ℹ️ No valid session, user needs to login');
                // Make sure login form is visible
                showLoginForm();
            }
        } else {
            console.error('❌ Supabase initialization failed');
            
            // Fallback to offline mode
            showAlert('Çevrimdışı moda geçiliyor... Local verilerle çalışabilirsiniz.', 'warning');
            
            // Show login form anyway for UI consistency
            showLoginForm();
        }
    } catch (error) {
        console.error('❌ Error in initializeApiAndAuth:', error);
        showAlert('Sistem başlatılırken hata oluştu: ' + error.message, 'error');
        
        // Fallback - show login form
        showLoginForm();
    }
}

// Add this helper function
function showLoginForm() {
    const loginSection = document.getElementById('loginSection');
    const mainApp = document.getElementById('mainApp');
    
    if (loginSection) loginSection.style.display = 'block';
    if (mainApp) mainApp.style.display = 'none';
}

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
    try {
        // Validate inputs
        if (!selectedCustomer) {
            showAlert('Lütfen müşteri seçin', 'error');
            return;
        }

        if (!currentPackage.items || Object.keys(currentPackage.items).length === 0) {
            showAlert('Lütfen en az bir ürün ekleyin', 'error');
            return;
        }

        const personnelId = elements.personnelSelect?.value;
        if (!personnelId) {
            showAlert('Lütfen personel seçin', 'error');
            return;
        }

        showAlert('Paket oluşturuluyor...', 'info', 2000);

        // Generate package number
        const timestamp = new Date().getTime();
        const packageNo = `PKG-${timestamp.toString().slice(-8)}`;

        // Calculate total quantity
        const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);

        // Get workspace ID
        const workspaceId = getCurrentWorkspaceId();

        // Create package object - USE CORRECT COLUMN NAMES
        const newPackage = {
            id: generateUUID(),
            package_no: packageNo,
            customer_id: selectedCustomer.id, // Use customer_id NOT customer_name/customer_code
            status: 'beklemede',
            items: currentPackage.items,
            total_quantity: totalQuantity,
            personnel_id: personnelId,
            container_id: null,
            workspace_id: workspaceId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            shipped_at: null
        };

        // Add to window.packages array
        if (!window.packages) {
            window.packages = [];
        }
        window.packages.push(newPackage);

        // Save to Excel immediately
        const excelData = ExcelJS.toExcelFormat(window.packages);
        await ExcelJS.writeFile(excelData);

        // Save to Supabase if online
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('packages')
                .insert([newPackage]);

            if (error) {
                console.error('Supabase insert error:', error);
                // Continue anyway - Excel is saved
            }
        }

        // CRITICAL: Refresh UI immediately
        await populatePackagesTable();
        await updateStockQuantities(currentPackage.items);
        
        // Clear form
        currentPackage = { items: {} };
        elements.packageDetailContent.innerHTML = '<p>Ürün eklenmedi</p>';

        showAlert(`✅ Paket oluşturuldu: ${packageNo}`, 'success');

    } catch (error) {
        console.error('Error completing package:', error);
        showAlert('Paket oluşturulurken hata oluştu: ' + error.message, 'error');
    }
}


function addPackageRowToTable(pkg) {
    const packagesTableBody = document.getElementById('packagesTableBody');
    if (!packagesTableBody) {
        console.error('Packages table body not found');
        return;
    }

    // Remove "no packages" message if it exists
    const emptyMessage = packagesTableBody.querySelector('td[colspan]');
    if (emptyMessage) {
        emptyMessage.closest('tr').remove();
    }

    // Create new row
    const row = document.createElement('tr');
    row.style.backgroundColor = '#f0fff0'; // Highlight new package
    row.innerHTML = `
        <td>
            <input type="checkbox" class="package-checkbox" value="${pkg.id}" 
                   data-package='${JSON.stringify(pkg).replace(/'/g, "&apos;")}'>
        </td>
        <td>${pkg.package_no || 'N/A'}</td>
        <td>${pkg.customer_name || 'N/A'}</td>
        <td>${pkg.items_display || 'N/A'}</td>
        <td>${pkg.total_quantity || 0}</td>
        <td><span class="status-badge status-beklemede">beklemede</span></td>
        <td>${new Date(pkg.created_at).toLocaleDateString('tr-TR')}</td>
        <td>
            <button onclick="viewPackageDetails('${pkg.id}')" class="btn-icon" title="Detay">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="deletePackage('${pkg.id}')" class="btn-icon btn-danger" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    // Insert at the beginning of the table
    packagesTableBody.insertBefore(row, packagesTableBody.firstChild);
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
        row.style.backgroundColor = '';
        row.style.transition = 'background-color 0.5s ease';
    }, 2000);

    console.log('✅ Package row added to table:', pkg.package_no);
}




async function updateStockQuantities(items) {
    try {
        for (const [productCode, quantity] of Object.entries(items)) {
            // Find stock item
            const stockItem = window.stockItems?.find(s => s.code === productCode);
            
            if (stockItem) {
                const newQuantity = (stockItem.quantity || 0) - quantity;
                
                // Update in memory
                stockItem.quantity = Math.max(0, newQuantity);
                
                // Update in Supabase if online
                if (supabase && navigator.onLine) {
                    await supabase
                        .from('stock_items')
                        .update({ 
                            quantity: stockItem.quantity,
                            updated_at: new Date().toISOString()
                        })
                        .eq('code', productCode);
                }
            }
        }
        
        // Refresh stock table
        await populateStockTable();
        
    } catch (error) {
        console.error('Stock update error:', error);
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




// ==================== ERROR RECOVERY MECHANISMS ====================

// Add this to app.js

class ErrorRecovery {
    constructor() {
        this.backupInterval = null;
        this.retryQueue = [];
        this.maxRetryAttempts = 3;
    }

    // Create data backups
    startBackupCycle() {
        // Create backup every 5 minutes
        this.backupInterval = setInterval(() => {
            this.createDataBackup();
        }, 5 * 60 * 1000);
        
        // Also backup before unload
        window.addEventListener('beforeunload', () => {
            this.createDataBackup();
        });
    }

    async createDataBackup() {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                packages: await ExcelJS.readFile(),
                syncQueue: JSON.parse(JSON.stringify(excelSyncQueue)),
                currentPackage: JSON.parse(JSON.stringify(currentPackage)),
                selectedCustomer: JSON.parse(JSON.stringify(selectedCustomer)),
                user: currentUser ? { email: currentUser.email } : null,
                workspace: window.workspaceManager?.currentWorkspace?.id || null
            };
            
            // Store backup in localStorage
            const backupKey = `backup_${new Date().toISOString().split('T')[0]}`;
            const existingBackups = JSON.parse(localStorage.getItem('app_backups') || '{}');
            
            // Keep only last 7 days of backups
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            Object.keys(existingBackups).forEach(key => {
                const backupDate = new Date(key.split('_')[1]);
                if (backupDate < oneWeekAgo) {
                    delete existingBackups[key];
                }
            });
            
            existingBackups[backupKey] = backupData;
            localStorage.setItem('app_backups', JSON.stringify(existingBackups));
            
            console.log('💾 Backup created:', backupKey);
            
        } catch (error) {
            console.error('Backup creation failed:', error);
        }
    }

    // Restore from backup
    async restoreFromBackup(backupKey = null) {
        try {
            const backups = JSON.parse(localStorage.getItem('app_backups') || '{}');
            
            if (Object.keys(backups).length === 0) {
                throw new Error('No backups available');
            }
            
            // Use specified backup or latest
            const keyToRestore = backupKey || Object.keys(backups).sort().pop();
            const backup = backups[keyToRestore];
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            // Restore data
            await ExcelJS.writeFile(backup.packages);
            excelSyncQueue = backup.syncQueue || [];
            localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
            
            // Restore application state
            if (backup.currentPackage) {
                window.currentPackage = backup.currentPackage;
            }
            
            if (backup.selectedCustomer) {
                window.selectedCustomer = backup.selectedCustomer;
            }
            
            console.log('✅ Backup restored:', keyToRestore);
            showAlert('Veriler yedekten geri yüklendi', 'success');
            
            // Refresh UI
            await safePopulatePackagesTable();
            
            return true;
            
        } catch (error) {
            console.error('Backup restoration failed:', error);
            showAlert('Yedekten geri yükleme başarısız', 'error');
            return false;
        }
    }

    // Add operation to retry queue
    addToRetryQueue(operation, context) {
        const retryEntry = {
            operation: operation,
            context: context,
            attempts: 0,
            lastAttempt: null,
            nextRetry: Date.now(),
            maxAttempts: this.maxRetryAttempts
        };
        
        this.retryQueue.push(retryEntry);
        this.processRetryQueue();
    }

    // Process retry queue
    async processRetryQueue() {
        const now = Date.now();
        const readyToRetry = this.retryQueue.filter(entry => 
            entry.attempts < entry.maxAttempts && 
            entry.nextRetry <= now
        );
        
        for (const entry of readyToRetry) {
            try {
                console.log(`🔄 Retrying ${entry.context} (attempt ${entry.attempts + 1})`);
                
                await entry.operation();
                
                // Remove successful operations
                this.retryQueue = this.retryQueue.filter(e => e !== entry);
                
            } catch (error) {
                entry.attempts++;
                entry.lastAttempt = now;
                entry.nextRetry = now + (Math.pow(2, entry.attempts) * 1000); // Exponential backoff
                
                console.error(`❌ Retry failed for ${entry.context}:`, error);
                
                if (entry.attempts >= entry.maxAttempts) {
                    console.error(`💥 Max retries exceeded for ${entry.context}`);
                    this.retryQueue = this.retryQueue.filter(e => e !== entry);
                }
            }
        }
        
        // Schedule next processing if queue not empty
        if (this.retryQueue.length > 0) {
            const nextRetryTime = Math.min(...this.retryQueue.map(entry => entry.nextRetry));
            const delay = Math.max(1000, nextRetryTime - now);
            
            setTimeout(() => this.processRetryQueue(), delay);
        }
    }

    // User-friendly error messages with recovery options
    showRecoveryError(error, context, recoveryOptions = {}) {
        const errorId = `error-${Date.now()}`;
        const errorMessage = this.getUserFriendlyErrorMessage(error, context);
        
        const errorHtml = `
            <div id="${errorId}" class="error-recovery-modal">
                <div class="error-header">
                    <h3>İşlem Başarısız</h3>
                </div>
                <div class="error-content">
                    <p>${errorMessage}</p>
                    ${recoveryOptions.allowRetry ? `
                        <button type="button" class="btn btn-primary" 
                                onclick="errorRecovery.retryLastOperation()">
                            Tekrar Dene
                        </button>
                    ` : ''}
                    ${recoveryOptions.allowBackupRestore ? `
                        <button type="button" class="btn btn-secondary"
                                onclick="errorRecovery.showBackupRestoreOptions()">
                            Yedekten Geri Yükle
                        </button>
                    ` : ''}
                    ${recoveryOptions.allowSkip ? `
                        <button type="button" class="btn btn-outline-secondary"
                                onclick="document.getElementById('${errorId}').remove()">
                            İşlemi Atla
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHtml);
    }

    getUserFriendlyErrorMessage(error, context) {
        const errorMap = {
            'network': 'İnternet bağlantısı yok. Çevrimdışı moda geçiliyor.',
            'database': 'Veritabanına bağlanılamıyor. Yerel depolama kullanılıyor.',
            'permission': 'Bu işlem için yetkiniz bulunmuyor.',
            'validation': 'Geçersiz veri. Lütfen girdiğiniz bilgileri kontrol edin.',
            'sync': 'Veri senkronizasyonu başarısız. Değişiklikler yerelde saklanıyor.',
            'default': 'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.'
        };
        
        const errorMessage = error.message?.toLowerCase() || '';
        
        for (const [key, message] of Object.entries(errorMap)) {
            if (errorMessage.includes(key) || context.includes(key)) {
                return message;
            }
        }
        
        return errorMap.default;
    }

    // Recovery actions
    retryLastOperation() {
        // Implementation depends on your specific operation tracking
        console.log('Retrying last operation...');
    }

    showBackupRestoreOptions() {
        const backups = JSON.parse(localStorage.getItem('app_backups') || '{}');
        const backupKeys = Object.keys(backups).sort().reverse();
        
        if (backupKeys.length === 0) {
            showAlert('Kullanılabilir yedek bulunamadı', 'warning');
            return;
        }
        
        const optionsHtml = backupKeys.map(key => `
            <div class="backup-option">
                <span>${new Date(key.split('_')[1]).toLocaleString()}</span>
                <button type="button" class="btn btn-sm btn-primary"
                        onclick="errorRecovery.restoreFromBackup('${key}')">
                    Geri Yükle
                </button>
            </div>
        `).join('');
        
        const modalHtml = `
            <div class="modal show" style="display: block">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Yedekten Geri Yükle</h5>
                            <button type="button" class="close" onclick="this.closest('.modal').remove()">
                                &times;
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>Hangi yedeği geri yüklemek istiyorsunuz?</p>
                            <div class="backup-list">
                                ${optionsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

// Initialize error recovery
const errorRecovery = new ErrorRecovery();

// Start backup cycle when app loads
errorRecovery.startBackupCycle();

// Enhanced error handling with recovery options
async function completePackageWithRecovery() {
    try {
        await completePackage();
    } catch (error) {
        console.error('Package completion failed:', error);
        
        errorRecovery.showRecoveryError(error, 'complete_package', {
            allowRetry: true,
            allowBackupRestore: false,
            allowSkip: true
        });
        
        // Add to retry queue
        errorRecovery.addToRetryQueue(completePackage, 'complete_package');
    }
}




// Unified printer status update function
async function checkPrinterStatusAndUpdateUI() {
    const indicator = document.getElementById('printer-indicator') || document.getElementById('printer-indicator') || document.getElementById('printerIndicator');
    const printerText = document.getElementById('printer-text') || document.querySelector('#printer-status #printer-text') || document.getElementById('printer-text');

    try {
        if (!window.workspaceManager) {
            if (indicator) indicator.textContent = 'Yazıcı bilinmiyor';
            if (printerText) printerText.textContent = 'İstasyon seçilmedi';
            return false;
        }

        const printerConfig = window.workspaceManager.getCurrentPrinterConfig ? window.workspaceManager.getCurrentPrinterConfig() : null;

        // Show checking
        if (indicator) indicator.innerHTML = '<i class="fas fa-print"></i>';
        if (printerText) printerText.textContent = 'Yazıcı kontrol ediliyor...';

        // Attempt to test workstation printer (this is implemented in workspace manager)
        let ok = false;
        if (typeof window.workspaceManager?.testCurrentPrinter === 'function') {
            ok = await window.workspaceManager.testCurrentPrinter();
        } else {
            // Fallback: check if window.printer exists
            ok = !!(window.printer && window.printer.isConnected);
        }

        if (ok) {
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-print" style="color:#2ecc71"></i>';
                indicator.title = (printerConfig?.name || 'Yerel Yazıcı') + ' - Bağlı';
            }
            if (printerText) printerText.textContent = `Yazıcı: ${printerConfig?.name || 'Bağlı'}`;
            return true;
        } else {
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-print" style="color:#e74c3c"></i>';
                indicator.title = `Yazıcı bulunamadı`;
            }
            if (printerText) printerText.textContent = 'Yazıcı bağlanamadı';
            return false;
        }
    } catch (err) {
        console.error('checkPrinterStatusAndUpdateUI error:', err);
        if (indicator) indicator.innerHTML = '<i class="fas fa-print" style="color:#e74c3c"></i>';
        if (printerText) printerText.textContent = 'Yazıcı kontrol hatası';
        return false;
    }
}

// Wire button and initial state at DOMContentLoaded (guarded)
document.addEventListener('DOMContentLoaded', function() {
    // Attach test button
    const testBtn = document.getElementById('test-printer');
    if (testBtn) {
        testBtn.removeEventListener('click', window._procleanPrinterTestHandler);
        window._procleanPrinterTestHandler = async function(e) {
            testBtn.disabled = true;
            testBtn.textContent = 'Test Ediliyor...';
            await checkPrinterStatusAndUpdateUI();
            testBtn.disabled = false;
            testBtn.textContent = 'Test Printer';
        };
        testBtn.addEventListener('click', window._procleanPrinterTestHandler);
    }

    // Run initial check after short delay (so workspace selection can finish)
    setTimeout(() => {
        checkPrinterStatusAndUpdateUI();
    }, 1200);
});






// ✅ Single Source of Truth
window.toggleSelectAllPackages = function() {
    const selectAllCheckbox = document.getElementById('selectAllPackages');
    if (!selectAllCheckbox) return;

    const packageCheckboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:not(#selectAllPackages)');

    packageCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    console.log(`Selected ${packageCheckboxes.length} packages`);
};

// ✅ Event listener setup
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const selectAllCheckbox = document.getElementById('selectAllPackages');
        if (selectAllCheckbox) {
            selectAllCheckbox.removeEventListener('change', toggleSelectAllPackages);
            selectAllCheckbox.addEventListener('change', toggleSelectAllPackages);
        }
    }, 2000);
});





// Opens report as a JSON/PDF file in a new tab
window.viewReportFile = async function(fileName) {
    try {
        const reportKey = `report_${fileName}`;
        const reportData = localStorage.getItem(reportKey);
        
        if (!reportData) {
            if (supabase && navigator.onLine) {
                const { data } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('fileName', fileName)
                    .single();
                
                if (data) {
                    window.open('data:application/json,' + encodeURIComponent(JSON.stringify(data)));
                    return;
                }
            }
            showAlert('Rapor bulunamadı', 'error');
            return;
        }

        const blob = new Blob([reportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
    } catch (error) {
        console.error('View report error:', error);
        showAlert('Rapor görüntülenemedi', 'error');
    }
};


window.downloadReport = function(fileName) {
    try {
        const reportKey = `report_${fileName}`;
        const reportData = localStorage.getItem(reportKey) || '{}';
        
        const blob = new Blob([reportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showAlert('Rapor indirildi', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showAlert('İndirme hatası', 'error');
    }
}

window.deleteReport = async function(fileName) {
    if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;
    
    try {
        // Delete from localStorage
        localStorage.removeItem(`report_${fileName}`);
        
        // Delete from Supabase if available
        if (supabase && navigator.onLine) {
            await supabase
                .from('reports')
                .delete()
                .eq('fileName', fileName);
        }
        
        showAlert('Rapor silindi', 'success');
        
        // Refresh table
        if (typeof populateReportsTable === 'function') {
            await populateReportsTable();
        }
    } catch (error) {
        console.error('Delete report error:', error);
        showAlert('Silme hatası', 'error');
    }
}

// Adds a new customer safely
async function addCustomer(name, code) {
    if (!name || !code) {
        showAlert('Lütfen müşteri adı ve kodunu girin', 'error');
        return;
    }

    try {
        const workspaceId = getCurrentWorkspaceId(); // get current workspace if applicable
        const customerId = crypto.randomUUID(); // generate valid UUID

        const { data, error } = await supabase
            .from('customers')
            .insert([{
                id: customerId,
                name: name.trim(),
                code: code.trim(),
                workspace_id: workspaceId,   // include all required NOT NULL columns
                created_at: new Date().toISOString() // include timestamp if NOT NULL
            }])
            .select(); // ensures we get the inserted row back

        if (error) {
            console.error('Customer insert failed:', error);
            showAlert('Müşteri eklenemedi: ' + error.message, 'error');
            return;
        }

        console.log('Customer added successfully:', data);
        showAlert('Müşteri başarıyla eklendi', 'success');

        // Refresh customer dropdown/table
        await populateCustomers();

    } catch (err) {
        console.error('Unexpected error while adding customer:', err);
        showAlert('Beklenmeyen bir hata oluştu', 'error');
    }
}



async function assignPackagesToContainer(packageIds, containerId) {
    try {
        showAlert('Paketler sevk ediliyor...', 'info');
        
        // Update packages in memory with DIRECT "sevk edildi" status
        window.packages = window.packages.map(pkg => {
            if (packageIds.includes(pkg.id)) {
                return {
                    ...pkg,
                    container_id: containerId,
                    status: 'sevk edildi', // DIRECT to shipped status
                    shipped_at: new Date().toISOString(), // Add shipping timestamp
                    updated_at: new Date().toISOString()
                };
            }
            return pkg;
        });
        
        // Save to Excel immediately
        const excelData = ExcelJS.toExcelFormat(window.packages);
        await ExcelJS.writeFile(excelData);
        
        // Update in Supabase if online
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('packages')
                .update({ 
                    container_id: containerId,
                    status: 'sevk edildi', // DIRECT to shipped status
                    shipped_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', packageIds);
            
            if (error) throw error;
        }
        
        // Reload and refresh UI
        await loadPackagesDataStrict();
        await populatePackagesTable(); // This will remove from pending
        await populateShippingTable(); // This will show in reports/history
        
        showAlert(`✅ ${packageIds.length} paket sevk edildi`, 'success');
        
    } catch (error) {
        console.error('Container assignment error:', error);
        showAlert('Paketler sevk edilirken hata oluştu', 'error');
    }
}


// Global counter for package IDs
let packageIdCounter = null;

// Initialize counter on app start
async function initializePackageCounter() {
    try {
        const workspaceId = getCurrentWorkspaceId();
        const counterKey = `package_counter_${workspaceId}`;
        
        // Get saved counter
        let counter = parseInt(localStorage.getItem(counterKey)) || 1000;
        
        // Also check existing packages to avoid conflicts
        const storageKey = `excelPackages_${workspaceId}`;
        const packages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (packages.length > 0) {
            const maxId = Math.max(...packages.map(p => {
                const match = p.package_no?.match(/PKG-(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }));
            
            counter = Math.max(counter, maxId + 1);
        }
        
        packageIdCounter = counter;
        localStorage.setItem(counterKey, counter);
        
        console.log('✅ Package ID counter initialized:', packageIdCounter);
        
    } catch (error) {
        console.error('Error initializing package counter:', error);
        packageIdCounter = 1000;
    }
}

// Generate unique package ID
async function generateUniquePackageId() {
    if (packageIdCounter === null) {
        await initializePackageCounter();
    }
    
    const workspaceId = getCurrentWorkspaceId();
    const counterKey = `package_counter_${workspaceId}`;
    
    // Increment counter
    packageIdCounter++;
    localStorage.setItem(counterKey, packageIdCounter);
    
    // Format: PKG-XXXXX (5 digits, zero-padded)
    const packageNo = `PKG-${packageIdCounter.toString().padStart(5, '0')}`;
    
    console.log('🆔 Generated unique package ID:', packageNo);
    
    return packageNo;
}

// Call this in initApp() function
async function initApp() {
    console.log('🚀 Starting enhanced ProClean initialization...');
    
    try {
        // ... existing initialization code ...
        
        // ✅ ADD THIS: Initialize package counter
        await initializePackageCounter();
        
        // ... rest of initialization ...
        
    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        showAlert('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
    }
}
