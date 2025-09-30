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




// ==================== COMPREHENSIVE ERROR HANDLING ====================

// Add this to app.js

class ErrorHandler {
    constructor() {
        this.maxRetries = 3;
        this.retryDelays = [1000, 3000, 5000]; // 1s, 3s, 5s
        this.setupGlobalErrorHandling();
    }

    // Setup global error handlers
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🔴 Unhandled Promise Rejection:', event.reason);
            this.handleError(event.reason, 'UNHANDLED_PROMISE');
            event.preventDefault();
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            console.error('🔴 Global Error:', event.error);
            this.handleError(event.error, 'GLOBAL_ERROR');
        });

        console.log('✅ Global error handling setup complete');
    }

    // Enhanced error handling with retry
    async executeWithRetry(operation, context, retryCount = 0) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            console.error(`❌ Error in ${context} (attempt ${retryCount + 1}/${this.maxRetries}):`, error);
            
            // Check if we should retry
            if (this.shouldRetry(error) && retryCount < this.maxRetries) {
                const delay = this.retryDelays[retryCount] || 5000;
                console.log(`🔄 Retrying ${context} in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeWithRetry(operation, context, retryCount + 1);
            }
            
            // Final failure
            this.handleError(error, context);
            throw error;
        }
    }

    // Determine if error is retryable
    shouldRetry(error) {
        const retryableErrors = [
            'network',
            'timeout', 
            'fetch',
            'offline',
            'connection',
            'socket',
            'ECONNREFUSED',
            'ETIMEDOUT'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return retryableErrors.some(term => errorMessage.includes(term));
    }

    // Handle different types of errors appropriately
    handleError(error, context) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            context: context,
            message: error.message,
            stack: error.stack,
            user: currentUser?.email || 'unknown',
            workspace: window.workspaceManager?.currentWorkspace?.id || 'unknown',
            online: navigator.onLine
        };

        // Log error for debugging
        console.error('🔴 Application Error:', errorInfo);

        // Store error in localStorage for debugging
        this.storeError(errorInfo);

        // Show user-friendly error message
        this.showUserError(error, context);
    }

    // Store errors for debugging
    storeError(errorInfo) {
        try {
            const errorLog = JSON.parse(localStorage.getItem('app_error_log') || '[]');
            errorLog.push(errorInfo);
            
            // Keep only last 100 errors
            if (errorLog.length > 100) {
                errorLog.splice(0, errorLog.length - 100);
            }
            
            localStorage.setItem('app_error_log', JSON.stringify(errorLog));
        } catch (storageError) {
            console.error('Failed to store error log:', storageError);
        }
    }

    // Show user-friendly error messages
    showUserError(error, context) {
        let userMessage = 'Bir hata oluştu.';
        
        // Network errors
        if (!navigator.onLine) {
            userMessage = 'İnternet bağlantınız yok. Çevrimdışı moda geçiliyor.';
            isUsingExcel = true;
            updateStorageIndicator();
        }
        // Database errors
        else if (error.message?.includes('Supabase') || error.message?.includes('database')) {
            userMessage = 'Veritabanı bağlantısında sorun var. Excel moduna geçiliyor.';
            isUsingExcel = true;
            updateStorageIndicator();
        }
        // Permission errors
        else if (error.message?.includes('permission') || error.message?.includes('auth')) {
            userMessage = 'Bu işlem için yetkiniz bulunmuyor.';
        }
        // Data validation errors
        else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
            userMessage = 'Geçersiz veri. Lütfen girdiğiniz bilgileri kontrol edin.';
        }
        
        showAlert(userMessage, 'error');
    }

    // Safe wrapper for any async function
    createSafeAsync(fn, context) {
        return async (...args) => {
            try {
                return await this.executeWithRetry(
                    () => fn(...args), 
                    context || fn.name
                );
            } catch (error) {
                // Error already handled by executeWithRetry
                throw error;
            }
        };
    }
}

// Initialize error handler
const errorHandler = new ErrorHandler();

// Wrap critical functions with error handling
const safeCompletePackage = errorHandler.createSafeAsync(completePackage, 'completePackage');
const safeSyncExcelWithSupabase = errorHandler.createSafeAsync(syncExcelWithSupabase, 'syncExcelWithSupabase');
const safePopulatePackagesTable = errorHandler.createSafeAsync(populatePackagesTable, 'populatePackagesTable');
const safeSaveToExcel = errorHandler.createSafeAsync(saveToExcel, 'saveToExcel');

// Replace the existing completePackage function with safe version
async function completePackage() {
    return await safeCompletePackage();
}

// Replace other critical functions similarly...






// ==================== MEMORY MANAGEMENT ====================

// Add this to app.js

class MemoryManager {
    constructor() {
        this.largeArrays = new Set();
        this.eventListeners = new Map();
        this.cleanupInterval = null;
        this.startCleanupCycle();
    }

    // Track large arrays for cleanup
    trackLargeArray(array, name) {
        this.largeArrays.add({
            array: array,
            name: name,
            size: array.length,
            createdAt: Date.now()
        });
    }

    // Register event listeners for cleanup
    registerEventListener(element, event, handler, options) {
        const key = `${element.id || 'anonymous'}_${event}`;
        
        // Remove existing listener first
        this.removeEventListener(key);
        
        // Add new listener
        element.addEventListener(event, handler, options);
        this.eventListeners.set(key, { element, event, handler, options });
    }

    // Remove specific event listener
    removeEventListener(key) {
        if (this.eventListeners.has(key)) {
            const { element, event, handler, options } = this.eventListeners.get(key);
            element.removeEventListener(event, handler, options);
            this.eventListeners.delete(key);
        }
    }

    // Cleanup large datasets
    cleanupLargeDatasets() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        this.largeArrays.forEach(item => {
            // Clear arrays older than maxAge
            if (now - item.createdAt > maxAge) {
                if (Array.isArray(item.array)) {
                    item.array.length = 0; // Clear array efficiently
                }
                this.largeArrays.delete(item);
                console.log(`🧹 Cleared large array: ${item.name}`);
            }
        });
    }

    // Cleanup unused event listeners
    cleanupEventListeners() {
        const elementsToCheck = ['modal', 'settings', 'temporary'];
        
        this.eventListeners.forEach((listener, key) => {
            const element = listener.element;
            
            // Remove listeners from elements that are no longer in DOM
            if (!document.body.contains(element)) {
                this.removeEventListener(key);
                console.log(`🧹 Removed orphaned event listener: ${key}`);
            }
            
            // Remove temporary listeners
            if (elementsToCheck.some(term => key.includes(term))) {
                this.removeEventListener(key);
                console.log(`🧹 Removed temporary event listener: ${key}`);
            }
        });
    }

    // Comprehensive cleanup
    performCleanup() {
        console.log('🧹 Starting memory cleanup...');
        
        this.cleanupLargeDatasets();
        this.cleanupEventListeners();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        console.log('✅ Memory cleanup completed');
    }

    // Start automatic cleanup cycle
    startCleanupCycle() {
        // Cleanup every 2 minutes
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 2 * 60 * 1000);
    }

    // Stop cleanup cycle
    stopCleanupCycle() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    // Component destruction helper
    destroyComponent(componentName) {
        console.log(`🧹 Destroying component: ${componentName}`);
        
        // Remove all related event listeners
        Array.from(this.eventListeners.keys())
            .filter(key => key.includes(componentName))
            .forEach(key => this.removeEventListener(key));
        
        // Clear related arrays
        Array.from(this.largeArrays)
            .filter(item => item.name.includes(componentName))
            .forEach(item => this.largeArrays.delete(item));
    }
}

// Initialize memory manager
const memoryManager = new MemoryManager();

// Enhanced table population with memory management
function populatePackagesTable(packages = window.packages) {
    const tableBody = document.getElementById('packagesTableBody');
    if (!tableBody) return;

    // Clear existing table
    tableBody.innerHTML = '';
    
    // Track packages array for cleanup
    memoryManager.trackLargeArray(packages, 'packages_table_data');
    
    // Use optimized rendering for large datasets
    if (packages.length > 100) {
        performanceOptimizer.optimizeTableRendering(
            packages, 
            'packagesTableBody', 
            createPackageTableRow,
            50
        );
    } else {
        // Render all at once for small datasets
        packages.forEach(pkg => {
            const row = createPackageTableRow(pkg);
            if (row) {
                tableBody.appendChild(row);
            }
        });
    }
    
    updateTableSummary(packages);
}

// Component cleanup example
function cleanupPackageManagement() {
    memoryManager.destroyComponent('package_management');
    
    // Clear global variables
    if (window.currentPackage) {
        window.currentPackage = { items: {} };
    }
    
    if (window.selectedCustomer) {
        window.selectedCustomer = null;
    }
    
    // Clear DOM references
    const elementsToClear = [
        'packagesTableBody',
        'barcodeInput', 
        'customerSelect',
        'personnelSelect'
    ];
    
    elementsToClear.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
        }
    });
}

// Add cleanup to page transitions
window.addEventListener('beforeunload', () => {
    memoryManager.performCleanup();
    memoryManager.stopCleanupCycle();
});



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



// ==================== MISSING FUNCTION DEFINITIONS ====================

// Create package table row function
function createPackageTableRow(pkg) {
    const row = document.createElement('tr');
    
    // Validate workspace access for each package
    if (!validateWorkspaceAccess(pkg)) {
        console.warn('Skipping package from different workspace:', pkg.id);
        return null;
    }
    
    // Determine storage source
    const isExcelPackage = pkg.source === 'excel' || pkg.id.includes('excel-') || pkg.id.includes('pkg-');
    const sourceIcon = isExcelPackage ? 
        '<i class="fas fa-file-excel" title="Excel Kaynaklı" style="color: #217346;"></i>' :
        '<i class="fas fa-database" title="Supabase Kaynaklı" style="color: #3ecf8e;"></i>';

    // Ensure items is properly formatted
    let itemsArray = [];
    if (pkg.items && typeof pkg.items === 'object') {
        if (Array.isArray(pkg.items)) {
            itemsArray = pkg.items;
        } else {
            // Convert object to array
            itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ 
                name: name, 
                qty: qty 
            }));
        }
    } else {
        // Fallback for packages without items array
        itemsArray = [{ 
            name: pkg.product || 'Bilinmeyen Ürün', 
            qty: pkg.total_quantity || 1 
        }];
    }

    const packageJsonEscaped = JSON.stringify(pkg).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    row.innerHTML = `
        <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
        <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
        <td>${escapeHtml(pkg.customers?.name || pkg.customer_name || 'N/A')}</td>
        <td title="${escapeHtml(itemsArray.map(it => it.name).join(', '))}">
            ${escapeHtml(itemsArray.map(it => it.name).join(', '))}
        </td>
        <td title="${escapeHtml(itemsArray.map(it => it.qty).join(', '))}">
            ${escapeHtml(itemsArray.map(it => it.qty).join(', '))}
        </td>
        <td>${pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
        <td><span class="status-${pkg.status || 'beklemede'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
        <td style="text-align: center;">${sourceIcon}</td>
    `;

    row.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') selectPackage(pkg);
    });

    return row;
}

// Update package selection function
function updatePackageSelection() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const selectionIndicator = document.getElementById('selectedPackagesCount');
    if (selectionIndicator) {
        selectionIndicator.textContent = selectedCount > 0 ? `${selectedCount} paket seçildi` : '';
    }
}

// Select package function
function selectPackage(pkg) {
    const packageDetailContent = document.getElementById('packageDetailContent');
    if (!packageDetailContent) return;

    let itemsArray = [];
    if (pkg.items && typeof pkg.items === 'object') {
        if (Array.isArray(pkg.items)) {
            itemsArray = pkg.items;
        } else {
            itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ name, qty }));
        }
    }

    packageDetailContent.innerHTML = `
        <div class="package-detail-card">
            <h4>Paket Detayları</h4>
            <div class="detail-row">
                <strong>Paket No:</strong> ${escapeHtml(pkg.package_no || 'N/A')}
            </div>
            <div class="detail-row">
                <strong>Müşteri:</strong> ${escapeHtml(pkg.customers?.name || pkg.customer_name || 'N/A')}
            </div>
            <div class="detail-row">
                <strong>Müşteri Kodu:</strong> ${escapeHtml(pkg.customers?.code || pkg.customer_code || 'N/A')}
            </div>
            <div class="detail-row">
                <strong>Ürünler:</strong>
                <ul>
                    ${itemsArray.map(item => `
                        <li>${escapeHtml(item.name)}: ${item.qty} adet</li>
                    `).join('')}
                </ul>
            </div>
            <div class="detail-row">
                <strong>Toplam Adet:</strong> ${pkg.total_quantity || 0}
            </div>
            <div class="detail-row">
                <strong>Durum:</strong> <span class="status-${pkg.status || 'beklemede'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span>
            </div>
            <div class="detail-row">
                <strong>Paketleyen:</strong> ${escapeHtml(pkg.packer || 'Bilinmiyor')}
            </div>
            <div class="detail-row">
                <strong>Oluşturulma:</strong> ${pkg.created_at ? new Date(pkg.created_at).toLocaleString('tr-TR') : 'N/A'}
            </div>
            <div class="detail-row">
                <strong>İstasyon:</strong> ${escapeHtml(pkg.station_name || pkg.workspace_id || 'Default')}
            </div>
        </div>
    `;
}

// Table summary function
function updateTableSummary(packages) {
    const totalPackagesElement = document.getElementById('totalPackages');
    if (totalPackagesElement) {
        totalPackagesElement.textContent = packages.length.toString();
    }
}

// Performance optimizer class
class PerformanceOptimizer {
    optimizeTableRendering(data, tableBodyId, rowCreator, chunkSize = 50) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        let currentIndex = 0;

        const renderChunk = () => {
            const chunk = data.slice(currentIndex, currentIndex + chunkSize);
            
            chunk.forEach(item => {
                const row = rowCreator(item);
                if (row) {
                    tableBody.appendChild(row);
                }
            });

            currentIndex += chunkSize;

            if (currentIndex < data.length) {
                setTimeout(renderChunk, 0);
            }
        };

        renderChunk();
    }
}

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Workspace UI initialization
function initializeWorkspaceUI() {
    const workspaceIndicator = document.getElementById('workspaceIndicator');
    if (workspaceIndicator && window.workspaceManager?.currentWorkspace) {
        workspaceIndicator.innerHTML = `
            <i class="fas fa-desktop"></i> 
            ${window.workspaceManager.currentWorkspace.name}
            <span class="workspace-type">${window.workspaceManager.getWorkspaceTypeLabel()}</span>
        `;
        workspaceIndicator.title = `Çalışma İstasyonu: ${window.workspaceManager.currentWorkspace.name}`;
    }
}

function setupWorkspaceAwareUI() {
    // Add workspace-specific UI enhancements here
    console.log('Workspace-aware UI setup complete');
}

// Sync queue initialization
function initializeSyncQueue() {
    const savedQueue = localStorage.getItem('excelSyncQueue');
    excelSyncQueue = savedQueue ? JSON.parse(savedQueue) : [];
    console.log('Sync queue initialized:', excelSyncQueue.length, 'operations');
}

// Settings initialization
function initializeSettings() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('procleanSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        // Apply settings as needed
    }
}

// Barcode scanner setup
function setupBarcodeScanner() {
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                processBarcode();
            }
        });
    }
}

// Toggle select all for customer containers
function toggleSelectAllCustomer(checkbox) {
    const folder = checkbox.closest('.customer-folder');
    const containerCheckboxes = folder.querySelectorAll('.container-checkbox');
    containerCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
}
