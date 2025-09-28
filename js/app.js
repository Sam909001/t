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




// Add keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // F1 - Paketle
        if (e.key === 'F1') {
            e.preventDefault();
            console.log('F1 pressed - Completing package');
            completePackage();
        }
        // F2 - Print
        else if (e.key === 'F2') {
            e.preventDefault();
            console.log('F2 pressed - Printing');
            const selectedPackage = getSelectedPackage();
            if (selectedPackage) {
                printPackage(selectedPackage);
            } else {
                showAlert('Yazdırmak için paket seçin', 'error');
            }
        }
        // F3 - Konteynere Ekle
        else if (e.key === 'F3') {
            e.preventDefault();
            console.log('F3 pressed - Adding to container');
            sendToRamp();
        }
        // F7 - Sil
        else if (e.key === 'F7') {
            e.preventDefault();
            console.log('F7 pressed - Deleting');
            deleteSelectedPackages();
        }
    });
}




// Add this function to app.js
function checkPrinterStatus() {
    console.log('Checking printer status...');
    
    try {
        // Check if printer is available
        if (window.printerElectron) {
            const printer = window.printerElectron;
            if (printer.isConnected && typeof printer.isConnected === 'function') {
                const isConnected = printer.isConnected();
                showAlert(`Yazıcı durumu: ${isConnected ? 'Bağlı' : 'Bağlı Değil'}`, 
                         isConnected ? 'success' : 'error');
            } else {
                showAlert('Yazıcı bağlantısı kontrol edilemiyor', 'warning');
            }
        } else {
            // Simulate printer check for web version
            showAlert('Web versiyonu - Yazıcı durumu simüle ediliyor', 'info');
            
            // Simulate different statuses
            const statuses = ['Bağlı', 'Bağlı Değil', 'Kağıt Yok', 'Hata'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            setTimeout(() => {
                showAlert(`Yazıcı durumu: ${randomStatus}`, 
                         randomStatus === 'Bağlı' ? 'success' : 'error');
            }, 1000);
        }
    } catch (error) {
        console.error('Printer status check error:', error);
        showAlert('Yazıcı durumu kontrol edilirken hata oluştu: ' + error.message, 'error');
    }
}






// Initialize application
async function initApp() {
    console.log('Initializing enhanced daily Excel system...');
    
    // Initialize workspace system first
    await window.workspaceManager.initialize();
    
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
    
    // Initialize workspace-aware UI
    setTimeout(() => {
        initializeWorkspaceUI();
        setupWorkspaceAwareUI();
    }, 1000);
    
    // Setup tabs
    setupTabs();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Setup daily exports bucket
    await setupDailyExportsBucket();
    
    // Populate dropdowns
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load daily Excel data
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
    
    // Start daily auto-clear and file management
    scheduleDailyClear();
    
    console.log(`App initialized with daily Excel system for workspace: ${window.workspaceManager.currentWorkspace.name}`);
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


function setupTabs() {
    console.log('Setting up tabs...');
    
    // Add click listeners to all tab buttons
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            console.log('Tab clicked:', tabName);
            switchTab(tabName);
        });
    });
    
    // Force initial tab to be active
    setTimeout(() => {
        if (!document.querySelector('.tab.active')) {
            switchTab('packages');
        }
    }, 100);
}





function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
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
        selectedPane.style.display = 'block';
        
        console.log('Tab activated:', tabName);
        
        // Load data when tab is clicked
        setTimeout(() => {
            switch(tabName) {
                case 'shipping':
                    console.log('Loading shipping table...');
                    populateShippingTable();
                    break;
                case 'stock':
                    console.log('Loading stock table...');
                    populateStockTable();
                    break;
                case 'reports':
                    console.log('Loading reports table...');
                    populateReportsTable();
                    break;
                case 'packages':
                    console.log('Loading packages table...');
                    populatePackagesTable();
                    break;
                default:
                    console.log('Unknown tab:', tabName);
            }
        }, 100);
    } else {
        console.error('Tab or pane not found:', {
            tab: tabName,
            tabElement: !!selectedTab,
            paneElement: !!selectedPane
        });
        
        // Fallback: try to show packages tab
        if (tabName !== 'packages') {
            console.log('Falling back to packages tab');
            switchTab('packages');
        }
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

// ================= MAIN INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM Content Loaded - Starting initialization...');

    try {
        // 1. Initialize elements first
        console.log('Step 1: Initializing elements...');
        initializeElementsObject();

        // 2. Check for critical elements
        const loginBtn = elements.loginButton;
        const emailInput = elements.emailInput;
        const passwordInput = elements.passwordInput;

        if (!loginBtn || !emailInput || !passwordInput) {
            console.error('Critical elements missing:', {
                loginBtn: !!loginBtn,
                emailInput: !!emailInput,
                passwordInput: !!passwordInput,
            });
            throw new Error('Critical UI elements not found');
        }

        // 3. Add basic event listeners first
        console.log('Step 2: Setting up basic event listeners...');
        loginBtn.addEventListener('click', login);

        emailInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') login();
        });

        passwordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') login();
        });

        // 4. Initialize workspace system
        console.log('Step 3: Initializing workspace system...');
        window.workspaceManager = new WorkspaceManager();
        await window.workspaceManager.initialize();

        // 5. Initialize workspace UI (with delay to ensure DOM is ready)
        setTimeout(() => {
            initializeWorkspaceUI();
            setupWorkspaceAwareUI();
        }, 500);

        // 6. Continue with other initializations...
        console.log('Step 4: Continuing with app initialization...');

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', showSettingsModal);
            console.log('Settings button listener added');
        }

        // Close settings modal
        const closeBtn = document.getElementById('closeSettingsModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeSettingsModal);
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

        // Set initial display states
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
        }
        if (elements.appContainer) {
            elements.appContainer.style.display = 'none';
        }

        // Initialize settings when app loads
        initializeSettings();

        // Extra listeners for modal
        const settingsModal = document.getElementById('settingsModal');
        window.addEventListener('click', function (event) {
            if (event.target === settingsModal) {
                closeSettingsModal();
            }
        });

        // Final workspace-aware UI init
        initializeWorkspaceUI();
        setupWorkspaceAwareUI();

        console.log(
            'ProClean application initialized successfully for workspace:',
            window.workspaceManager.currentWorkspace.name
        );
    } catch (error) {
        console.error('Critical error during initialization:', error);
        showAlert(
            'Uygulama başlatılırken hata oluştu: ' + error.message,
            'error'
        );

        // Fallback: Try to show API key modal
        setTimeout(showApiKeyModal, 1000);
    }
});

// ================= THEME MANAGEMENT =================
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

// ================= GLOBAL ERROR HANDLER =================
window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
    showAlert(
        'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.',
        'error'
    );
});


// Setup daily exports bucket
async function setupDailyExportsBucket() {
    if (!supabase) return false;
    
    try {
        // Check if bucket exists
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
            console.warn('Bucket list error:', error);
            return false;
        }
        
        const exportsBucketExists = buckets.some(bucket => bucket.name === 'daily-exports');
        
        if (!exportsBucketExists) {
            console.log('Creating daily-exports bucket...');
            // Note: Bucket creation might require admin privileges
            showAlert('Günlük export bucketı oluşturuluyor...', 'info');
        }
        
        return true;
    } catch (error) {
        console.warn('Bucket setup error:', error);
        return false;
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

        // Convert items object to array for better handling
        const itemsArray = Object.entries(currentPackage.items).map(([name, qty]) => ({
            name: name,
            qty: qty
        }));

        const packageId = generateUUID();
        const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';

        const packageData = {
            id: packageId,
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            items: itemsArray,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workspace_id: workspaceId,
            station_name: window.workspaceManager?.currentWorkspace?.name || 'Default'
        };

        // Save to daily Excel file
        const currentData = await ExcelJS.readFile();
        currentData.push(packageData);
        const excelSuccess = await ExcelJS.writeFile(currentData);
        
        if (excelSuccess) {
            showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');
            
            // IMMEDIATELY update the packages table
            await populatePackagesTable();
            
            // Reset current package
            currentPackage = {};
            
            // Reset quantity badges
            document.querySelectorAll('.quantity-badge').forEach(badge => {
                badge.textContent = '0';
                badge.style.display = 'none';
            });
            
            // Clear package items display
            const packageItemsContainer = document.getElementById('packageItems');
            if (packageItemsContainer) {
                packageItemsContainer.innerHTML = '<p style="color:#666; text-align:center;">Henüz ürün eklenmedi</p>';
            }
            
            updateStorageIndicator();

        } else {
            throw new Error('Excel kaydetme başarısız');
        }

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası: ' + error.message, 'error');
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




// Add this function to app.js if it doesn't exist
async function addItemToPackage(productName, quantity = 1) {
    try {
        if (!currentPackage.items) {
            currentPackage.items = {};
        }
        
        // Add or update item quantity
        if (currentPackage.items[productName]) {
            currentPackage.items[productName] += quantity;
        } else {
            currentPackage.items[productName] = quantity;
        }
        
        // Update the quantity badge if it exists
        updateQuantityBadge(productName, currentPackage.items[productName]);
        
        showAlert(`${productName} pakete eklendi: ${quantity} adet`, 'success');
        
        // ✅ Refresh the packages table immediately
        await populatePackagesTable();
        
    } catch (error) {
        console.error('Error adding item to package:', error);
        showAlert('Ürün pakete eklenirken hata oluştu', 'error');
    }
}

// Also add this helper function if needed
function updateQuantityBadge(productName, quantity) {
    const badge = document.querySelector(`[data-product="${productName}"] .quantity-badge`);
    if (badge) {
        badge.textContent = quantity;
        badge.style.display = quantity > 0 ? 'inline-block' : 'none';
    }
}


function updatePackageDisplay() {
    const packageItemsContainer = document.getElementById('packageItems');
    if (packageItemsContainer) {
        packageItemsContainer.innerHTML = '';
        
        if (currentPackage.items && Object.keys(currentPackage.items).length > 0) {
            Object.entries(currentPackage.items).forEach(([itemName, quantity]) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'package-item';
                itemElement.innerHTML = `
                    <span>${itemName}</span>
                    <span>${quantity} adet</span>
                `;
                packageItemsContainer.appendChild(itemElement);
            });
        }
    }
    
    // ✅ Refresh the packages table
    populatePackagesTable();
}
