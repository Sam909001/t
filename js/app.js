// Sayfa yüklendiğinde API anahtarını sessionStorage'dan yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = sessionStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
        console.log('API key loaded from sessionStorage');
    }
});

// State management functions - Excel based
function saveAppState() {
    const state = {
        selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
        selectedPersonnelId: elements.personnelSelect.value,
        currentContainer: currentContainer,
    };
    sessionStorage.setItem('procleanState', JSON.stringify(state));
}

function loadAppState() {
    const savedState = sessionStorage.getItem('procleanState');
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
    sessionStorage.removeItem('procleanState');
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

// Excel file operations
function getTodayFileName(type) {
    const today = new Date().toISOString().split('T')[0];
    return `proclean_${type}_${today}.xlsx`;
}

async function loadExcelData(type) {
    const fileName = getTodayFileName(type);
    
    try {
        const { data, error } = await supabase.storage
            .from('daily-data')
            .download(fileName);
        
        if (error) {
            // If file doesn't exist, create it
            await createEmptyExcelFile(type);
            return [];
        }
        
        const arrayBuffer = await data.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        return jsonData;
        
    } catch (error) {
        console.error(`Error loading ${type} data:`, error);
        await createEmptyExcelFile(type);
        return [];
    }
}

async function saveExcelData(type, data) {
    const fileName = getTodayFileName(type);
    
    try {
        // Create worksheet from data
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type);
        
        // Convert to buffer
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const file = new File([wbout], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Upload to Supabase storage
        const { error } = await supabase.storage
            .from('daily-data')
            .upload(fileName, file, { upsert: true });
        
        if (error) throw error;
        
        console.log(`Saved ${type} data to ${fileName}`);
        return true;
        
    } catch (error) {
        console.error(`Error saving ${type} data:`, error);
        return false;
    }
}

async function createEmptyExcelFile(type) {
    const fileName = getTodayFileName(type);
    let headers = [];
    
    switch (type) {
        case 'customers':
            headers = ['ID', 'Name', 'Code', 'Email', 'Phone', 'Address', 'Created'];
            break;
        case 'personnel':
            headers = ['ID', 'Name', 'Position', 'Email', 'Phone', 'Created'];
            break;
        case 'packages':
            headers = ['ID', 'CustomerID', 'PersonnelID', 'ContainerID', 'PackageType', 'Quantity', 'Status', 'Created'];
            break;
        case 'containers':
            headers = ['ID', 'ContainerNo', 'CustomerID', 'PackageCount', 'TotalQuantity', 'Status', 'Created'];
            break;
        case 'stock':
            headers = ['ID', 'ItemName', 'ItemCode', 'Quantity', 'Unit', 'LastUpdated'];
            break;
    }
    
    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    
    // Convert to buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new File([wbout], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    try {
        const { error } = await supabase.storage
            .from('daily-data')
            .upload(fileName, file);
        
        if (error) throw error;
        
        console.log(`Created daily file: ${fileName}`);
    } catch (error) {
        console.error(`Error creating ${fileName}:`, error);
    }
}

// Initialize application - Excel based
async function initApp() {
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
    
    // Populate dropdowns
    await populateCustomers();
    await populatePersonnel();
    
    // Load saved state
    loadAppState();
    
    // Load data
    await populatePackagesTable();
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

// Excel-based populate functions
async function populateCustomers() {
    const customers = await loadExcelData('customers');
    const select = elements.customerSelect;
    
    if (!select) return;
    
    select.innerHTML = '<option value="">Müşteri seçin</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.ID;
        option.textContent = `${customer.Name} (${customer.Code})`;
        select.appendChild(option);
    });
}

async function populatePersonnel() {
    const personnel = await loadExcelData('personnel');
    const select = elements.personnelSelect;
    
    if (!select) return;
    
    select.innerHTML = '<option value="">Personel seçin</option>';
    
    personnel.forEach(person => {
        const option = document.createElement('option');
        option.value = person.ID;
        option.textContent = `${person.Name} (${person.Position})`;
        select.appendChild(option);
    });
}

async function populatePackagesTable() {
    const packages = await loadExcelData('packages');
    const customers = await loadExcelData('customers');
    const personnel = await loadExcelData('personnel');
    
    const tbody = document.querySelector('#packagesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    packages.forEach(pkg => {
        const customer = customers.find(c => c.ID == pkg.CustomerID);
        const person = personnel.find(p => p.ID == pkg.PersonnelID);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pkg.ID}</td>
            <td>${customer ? customer.Name : 'N/A'}</td>
            <td>${person ? person.Name : 'N/A'}</td>
            <td>${pkg.PackageType}</td>
            <td>${pkg.Quantity}</td>
            <td>${pkg.Status}</td>
            <td>${new Date(pkg.Created).toLocaleDateString('tr-TR')}</td>
        `;
        tbody.appendChild(row);
    });
}

async function populateStockTable() {
    const stock = await loadExcelData('stock');
    const tbody = document.querySelector('#stockTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    stock.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.ID}</td>
            <td>${item.ItemName}</td>
            <td>${item.ItemCode}</td>
            <td>${item.Quantity}</td>
            <td>${item.Unit}</td>
            <td>${new Date(item.LastUpdated).toLocaleDateString('tr-TR')}</td>
        `;
        tbody.appendChild(row);
    });
}

async function populateShippingTable() {
    const containers = await loadExcelData('containers');
    const customers = await loadExcelData('customers');
    
    const tbody = document.querySelector('#shippingTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    containers.forEach(container => {
        const customer = customers.find(c => c.ID == container.CustomerID);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="container-checkbox" value="${container.ID}"></td>
            <td>${container.ContainerNo}</td>
            <td>${customer ? customer.Name : 'N/A'}</td>
            <td>${container.PackageCount}</td>
            <td>${container.TotalQuantity}</td>
            <td>${container.Status}</td>
            <td>${new Date(container.Created).toLocaleDateString('tr-TR')}</td>
        `;
        tbody.appendChild(row);
    });
}

// Storage bucket kontrolü ve oluşturma fonksiyonu - Excel için
async function setupStorageBucket() {
    try {
        // Storage bucket var mı kontrol et
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.warn('Bucket listeleme hatası:', bucketsError);
            return false;
        }
        
        const dailyDataBucketExists = buckets.some(bucket => bucket.name === 'daily-data');
        
        if (!dailyDataBucketExists) {
            console.log('Daily-data bucket bulunamadı, oluşturuluyor...');
            // Bucket oluşturmaya çalış (admin yetkisi gerektirir)
            try {
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('daily-data', {
                    public: false,
                    fileSizeLimit: 52428800, // 50MB
                    allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
                });
                
                if (createError) {
                    console.warn('Bucket oluşturulamadı:', createError);
                    return false;
                }
                
                console.log('Daily-data bucket oluşturuldu:', newBucket);
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

// Container operations - Excel based
function loadCurrentContainer() {
    showAlert('Mevcut konteyner yüklendi', 'success');
}

async function createNewContainer() {
    try {
        const timestamp = new Date().getTime();
        const containerNo = `CONT-${timestamp.toString().slice(-6)}`;

        // Load existing containers
        const containers = await loadExcelData('containers');
        const newId = Math.max(0, ...containers.map(c => c.ID || 0)) + 1;

        // Create new container
        const newContainer = {
            ID: newId,
            ContainerNo: containerNo,
            CustomerID: selectedCustomer ? selectedCustomer.id : null,
            PackageCount: 0,
            TotalQuantity: 0,
            Status: 'beklemede',
            Created: new Date().toISOString()
        };

        containers.push(newContainer);
        await saveExcelData('containers', containers);

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
        // Load data from Excel
        const containers = await loadExcelData('containers');
        const packages = await loadExcelData('packages');

        // Önce bu konteynerlere bağlı paketleri güncelle
        packages.forEach(pkg => {
            if (selectedContainers.includes(pkg.ContainerID?.toString())) {
                pkg.ContainerID = null;
                pkg.Status = 'beklemede';
            }
        });

        // Sonra konteynerleri sil
        const updatedContainers = containers.filter(c => !selectedContainers.includes(c.ID.toString()));

        // Save back to Excel
        await saveExcelData('packages', packages);
        await saveExcelData('containers', updatedContainers);

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

// Utility functions
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
            currentUser = {
                email: session.user.email,
                uid: session.user.id,
                name: session.user.email.split('@')[0]
            };
            
            document.getElementById('userRole').textContent = `Operatör: ${currentUser.name}`;
            document.getElementById('loginScreen').style.display = "none";
            document.getElementById('appContainer').style.display = "flex";
            
            // Setup storage bucket for Excel files
            await setupStorageBucket();
            
            initApp();
        } else {
            document.getElementById('loginScreen').style.display = "flex";
            document.getElementById('appContainer').style.display = "none";
        }
    });
}

// Load API key from sessionStorage
function loadApiKey() {
    const savedApiKey = sessionStorage.getItem('procleanApiKey');
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
        userMessage = 'Dosya bulunamadı. Lütfen yönetici ile iletişime geçin.';
    } else if (error.code === '08006') {
        userMessage = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
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
    
    // Clear saved state in sessionStorage
    sessionStorage.removeItem('procleanState');

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

    // Reload today's data from Excel files
    loadTodaysData();
}

// Load today's packages/containers from Excel files
async function loadTodaysData() {
    try {
        if (!supabase) return;

        // Re-render UI tables from Excel files
        await populatePackagesTable();
        await populateShippingTable();
        await populateCustomers();
        await populatePersonnel();

        console.log('[Daily Clear] Data reloaded from Excel files');
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
        console.log('Initializing ProClean application with Excel storage...');
        
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
            const savedTheme = sessionStorage.getItem('procleanTheme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
            }
        }

        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                sessionStorage.setItem('procleanTheme', 'dark');
                showAlert('Koyu tema etkinleştirildi.', 'info');
            } else {
                sessionStorage.setItem('procleanTheme', 'light');
                showAlert('Açık tema etkinleştirildi.', 'info');
            }
        }
        
        // API key initialization
        if (loadApiKey()) {
            supabase = initializeSupabase();
            if (supabase) {
                setupAuthListener();
                console.log('Supabase client initialized successfully for Excel storage');
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
        
        console.log('ProClean application initialized successfully with Excel storage');
        
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
