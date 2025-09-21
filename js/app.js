// Complete Fixed app.js - ProClean Application
// This consolidates all functionality and fixes the issues

// EmailJS initialization
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("jH-KlJ2ffs_lGwfsp");
    }
})();

// Loading state guards to prevent duplicates
let shippingTableLoading = false;
let stockTableLoading = false;

// Single consolidated DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Initializing ProClean application...');
        
        // 1. Load API key first
        const savedApiKey = localStorage.getItem('procleanApiKey');
        if (savedApiKey) {
            SUPABASE_ANON_KEY = savedApiKey;
            initializeSupabase();
            console.log('API key loaded from localStorage');
        }
        
        // 2. Initialize elements object
        initializeElementsObject();
        
        // 3. Setup all event listeners
        setupEventListeners();
        
        // 4. Initialize authentication if API key exists
        if (savedApiKey && supabase) {
            setupAuthListener();
            console.log('Supabase client initialized successfully');
        } else {
            console.log('No saved API key found, showing API key modal');
            setTimeout(() => showApiKeyModal(), 100);
        }
        
        // 5. Apply saved theme and settings
        applySavedTheme();
        initializeSettings();
        
        // 6. Set initial display states
        setInitialDisplayStates();
        
        // 7. Initialize storage bucket
        await setupStorageBucket();
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Critical error during initialization:', error);
        showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
    }
});

// Consolidated event listeners setup
function setupEventListeners() {
    try {
        // Login/Logout buttons
        const loginBtn = elements.loginButton || document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', login);
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Enter key listeners for login
        const emailInput = elements.emailInput || document.getElementById('email');
        const passwordInput = elements.passwordInput || document.getElementById('password');
        
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
        
        // Quantity modal enter key
        if (elements.quantityInput) {
            elements.quantityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmQuantity();
                }
            });
        }
        
        // Barcode input enter key
        if (elements.barcodeInput) {
            elements.barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    processBarcode();
                }
            });
        }
        
        // Customer select change listener
        if (elements.customerSelect) {
            elements.customerSelect.addEventListener('change', function() {
                handleCustomerSelection(this);
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
        
        // Settings modal handlers
        setupSettingsEventListeners();
        
        // Package table event handlers
        setupPackageTableEventListeners();
        
        console.log('All event listeners set up successfully');
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Settings event listeners
function setupSettingsEventListeners() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsModalBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const settingsModal = document.getElementById('settingsModal');
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
    });
}

// Package table event listeners
function setupPackageTableEventListeners() {
    const packagesTableBody = document.getElementById('packagesTableBody');
    if (packagesTableBody) {
        // Checkbox change handler
        packagesTableBody.addEventListener('change', function(event) {
            if (event.target.type === 'checkbox') {
                updatePackageSelection();
            }
        });
        
        // Row click handler
        packagesTableBody.addEventListener('click', function(event) {
            handlePackageRowClick(event);
        });
    }
}

// Customer selection handler
function handleCustomerSelection(selectElement) {
    try {
        const customerId = selectElement.value;
        if (customerId) {
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            const customerName = selectedOption.textContent.split(' (')[0];
            const customerCode = selectedOption.textContent.match(/\(([^)]+)\)/)?.[1] || '';
            
            selectedCustomer = {
                id: customerId,
                name: customerName,
                code: customerCode
            };
            
            showAlert(`Müşteri seçildi: ${selectedCustomer.name}`, 'success');
            saveAppState();
        } else {
            selectedCustomer = null;
        }
    } catch (error) {
        console.error('Error handling customer selection:', error);
        showAlert('Müşteri seçimi hatası', 'error');
    }
}

// Package row click handler
function handlePackageRowClick(event) {
    try {
        const row = event.target.closest('tr');
        if (row && event.target.type !== 'checkbox') {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.getAttribute('data-package')) {
                const packageData = JSON.parse(checkbox.getAttribute('data-package'));
                selectPackage(packageData);
            }
        }
    } catch (error) {
        console.error('Error handling package row click:', error);
        showAlert('Paket seçimi hatası', 'error');
    }
}

// FIXED: selectPackage function - this was missing and causing errors
function selectPackage(pkg) {
    try {
        // Remove selected class from all rows
        document.querySelectorAll('#packagesTableBody tr').forEach(row => {
            row.classList.remove('selected');
        });
        
        // Add selected class to the clicked row
        const rows = document.querySelectorAll('#packagesTableBody tr');
        for (let row of rows) {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.value === pkg.id) {
                row.classList.add('selected');
                break;
            }
        }
        
        // Update package details panel
        updatePackageDetailsPanel(pkg);
        
        console.log('Package selected:', pkg.package_no);
        
    } catch (error) {
        console.error('Error in selectPackage:', error);
        showAlert('Paket seçilirken hata oluştu', 'error');
    }
}

// Update package details panel
function updatePackageDetailsPanel(pkg) {
    try {
        const detailContent = document.getElementById('packageDetailContent');
        if (!detailContent) return;
        
        let productInfo = '';
        if (pkg.items && typeof pkg.items === 'object') {
            productInfo = Object.entries(pkg.items)
                .map(([product, quantity]) => `<li>${escapeHtml(product)}: ${quantity} adet</li>`)
                .join('');
        }
        
        detailContent.innerHTML = `
            <h4>Paket: ${escapeHtml(pkg.package_no || 'N/A')}</h4>
            <p><strong>Müşteri:</strong> ${escapeHtml(pkg.customers?.name || 'N/A')}</p>
            <p><strong>Toplam Adet:</strong> ${pkg.total_quantity || 0}</p>
            <p><strong>Tarih:</strong> ${pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'}</p>
            <p><strong>Durum:</strong> ${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</p>
            ${productInfo ? `<h5>Ürünler:</h5><ul>${productInfo}</ul>` : ''}
        `;
    } catch (error) {
        console.error('Error updating package details panel:', error);
    }
}

// Get selected package
function getSelectedPackage() {
    try {
        const selectedRow = document.querySelector('#packagesTableBody tr.selected');
        if (!selectedRow) return null;
        
        const checkbox = selectedRow.querySelector('input[type="checkbox"]');
        if (!checkbox) return null;
        
        const packageData = checkbox.getAttribute('data-package');
        return packageData ? JSON.parse(packageData) : null;
        
    } catch (error) {
        console.error('Error in getSelectedPackage:', error);
        return null;
    }
}

// FIXED: populatePackagesTable with duplication prevention
async function populatePackagesTable() {
    if (packagesTableLoading) {
        console.log('Package table already loading, skipping...');
        return;
    }
    
    packagesTableLoading = true;
    
    try {
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');
        
        if (!tableBody) {
            console.error('Package table body not found');
            return;
        }

        // Clear existing content
        tableBody.innerHTML = '';
        if (totalPackagesElement) {
            totalPackagesElement.textContent = '0';
        }

        if (!supabase) {
            console.error('Supabase not initialized');
            showAlert('Veritabanı bağlantısı yok', 'error');
            return;
        }

        const { data: packages, error } = await supabase
            .from('packages')
            .select(`*, customers (name, code)`)
            .is('container_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading packages:', error);
            showAlert('Paket verileri yüklenemedi: ' + error.message, 'error');
            return;
        }

        if (!packages || packages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            return;
        }

        // Deduplicate packages by ID
        const uniquePackages = deduplicateById(packages);
        console.log(`Original packages: ${packages.length}, Unique packages: ${uniquePackages.length}`);

        // Render packages
        uniquePackages.forEach(pkg => {
            const row = createPackageTableRow(pkg);
            tableBody.appendChild(row);
        });

        // Update total count
        if (totalPackagesElement) {
            totalPackagesElement.textContent = uniquePackages.length.toString();
        }

        console.log(`Package table populated with ${uniquePackages.length} packages`);

    } catch (error) {
        console.error('Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası: ' + error.message, 'error');
    } finally {
        packagesTableLoading = false;
    }
}

// Create package table row
function createPackageTableRow(pkg) {
    const row = document.createElement('tr');
    
    let productInfo = 'N/A';
    if (pkg.items && typeof pkg.items === 'object') {
        const items = Object.entries(pkg.items)
            .map(([product, quantity]) => `${product}: ${quantity}`)
            .join(', ');
        productInfo = items || 'N/A';
    }

    const packageJsonEscaped = JSON.stringify(pkg).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    row.innerHTML = `
        <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
        <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
        <td>${escapeHtml(pkg.customers?.name || 'N/A')}</td>
        <td title="${escapeHtml(productInfo)}">${escapeHtml(productInfo.length > 50 ? productInfo.substring(0, 50) + '...' : productInfo)}</td>
        <td>${pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
        <td><span class="status-${pkg.status || 'beklemede'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
    `;
    
    return row;
}

// FIXED: populateShippingTable with duplication prevention
async function populateShippingTable() {
    if (shippingTableLoading) {
        console.log('Shipping table already loading, skipping...');
        return;
    }
    
    shippingTableLoading = true;
    
    try {
        const shippingFolders = elements.shippingFolders || document.getElementById('shippingFolders');
        if (!shippingFolders) {
            console.error('Shipping folders container not found');
            return;
        }

        shippingFolders.innerHTML = '';

        if (!supabase) {
            console.error('Supabase not initialized');
            return;
        }

        const filter = elements.shippingFilter?.value || 'all';
        let query = supabase
            .from('containers')
            .select(`
                *,
                packages (
                    id,
                    package_no,
                    total_quantity,
                    customers (name, code)
                )
            `);

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data: containers, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading containers:', error);
            showAlert('Sevkiyat verileri yüklenemedi', 'error');
            return;
        }

        if (containers && containers.length > 0) {
            const uniqueContainers = deduplicateById(containers);
            const customersMap = groupContainersByCustomer(uniqueContainers);
            renderCustomerFolders(customersMap, shippingFolders);
        } else {
            shippingFolders.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Sevkiyat verisi yok</p>';
        }

    } catch (error) {
        console.error('Error in populateShippingTable:', error);
        showAlert('Sevkiyat tablosu yükleme hatası', 'error');
    } finally {
        shippingTableLoading = false;
    }
}

// FIXED: populateStockTable with proper structure
async function populateStockTable() {
    if (stockTableLoading) {
        console.log('Stock table already loading, skipping...');
        return;
    }
    
    stockTableLoading = true;
    
    try {
        const stockTableBody = elements.stockTableBody || document.getElementById('stockTableBody');
        if (!stockTableBody) {
            console.error('Stock table body not found');
            return;
        }

        stockTableBody.innerHTML = '';

        if (!supabase) {
            console.error('Supabase not initialized');
            return;
        }

        const { data: stockItems, error } = await supabase
            .from('stock_items')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading stock items:', error);
            showAlert('Stok verileri yüklenemedi', 'error');
            return;
        }

        if (stockItems && stockItems.length > 0) {
            stockItems.forEach(item => {
                const row = createStockTableRow(item);
                stockTableBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Stok verisi yok</td>';
            stockTableBody.appendChild(row);
        }

    } catch (error) {
        console.error('Error in populateStockTable:', error);
        showAlert('Stok tablosu yükleme hatası', 'error');
    } finally {
        stockTableLoading = false;
    }
}

// Create stock table row with proper structure for editing
function createStockTableRow(item) {
    const row = document.createElement('tr');
    
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
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>
            <span class="stock-quantity">${item.quantity}</span>
            <input type="number" class="stock-quantity-input" value="${item.quantity}" style="display:none;" min="0">
        </td>
        <td>${escapeHtml(item.unit || 'Adet')}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
        <td>
            <button type="button" class="btn btn-primary btn-sm" onclick="editStockItem(this, '${item.code}')">
                <i class="fas fa-edit"></i> Düzenle
            </button>
            <div class="edit-buttons" style="display:none;">
                <button type="button" class="btn btn-success btn-sm" onclick="saveStockFromRow(this, '${item.code}')">
                    <i class="fas fa-check"></i> Kaydet
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="cancelStockFromRow(this, '${item.code}')">
                    <i class="fas fa-times"></i> İptal
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Helper functions for table operations
function deduplicateById(items) {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.id)) {
            return false;
        }
        seen.add(item.id);
        return true;
    });
}

function groupContainersByCustomer(containers) {
    const customersMap = {};
    
    containers.forEach(container => {
        let customerName = 'Diğer';
        
        if (container.packages && container.packages.length > 0) {
            const names = container.packages
                .map(p => p.customers?.name)
                .filter(Boolean);
            
            if (names.length > 0) {
                customerName = [...new Set(names)].join(', ');
            }
        } else if (container.customer) {
            customerName = container.customer;
        }
        
        if (!customersMap[customerName]) {
            customersMap[customerName] = [];
        }
        customersMap[customerName].push(container);
    });
    
    return customersMap;
}

function renderCustomerFolders(customersMap, container) {
    for (const [customerName, customerContainers] of Object.entries(customersMap)) {
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
        
        const table = createContainerTable(customerContainers);
        folderContent.appendChild(table);
        
        folderDiv.appendChild(folderHeader);
        folderDiv.appendChild(folderContent);
        
        // Folder toggle functionality
        folderHeader.addEventListener('click', () => {
            folderDiv.classList.toggle('folder-open');
            folderContent.style.display = folderDiv.classList.contains('folder-open') ? 'block' : 'none';
        });
        
        container.appendChild(folderDiv);
    }
}

function createContainerTable(containers) {
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
            ${containers.map(container => `
                <tr>
                    <td><input type="checkbox" value="${container.id}" class="container-checkbox"></td>
                    <td>${escapeHtml(container.container_no)}</td>
                    <td>${container.package_count || 0}</td>
                    <td>${container.total_quantity || 0}</td>
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
    return table;
}

// Initialize application after successful authentication
async function initApp() {
    try {
        // Set current date
        const currentDateElement = elements.currentDate || document.getElementById('currentDate');
        if (currentDateElement) {
            currentDateElement.textContent = new Date().toLocaleDateString('tr-TR');
        }
        
        // Populate dropdowns
        await populateCustomers();
        await populatePersonnel();
        
        // Load saved state
        loadAppState();
        
        // Load data tables with delays to prevent conflicts
        setTimeout(() => populatePackagesTable(), 100);
        setTimeout(() => populateStockTable(), 200);
        setTimeout(() => populateShippingTable(), 300);
        
        // Test connection
        await testConnection();
        
        // Set up auto-save
        setInterval(saveAppState, 10000); // Save every 10 seconds
        
        // Set up offline support
        setupOfflineSupport();
        
        // Set up barcode scanner
        setupBarcodeScanner();
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('Uygulama başlatılırken hata oluştu', 'error');
    }
}

// State management functions
function saveAppState() {
    try {
        const state = {
            selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
            selectedPersonnelId: elements.personnelSelect?.value || '',
            currentContainer: currentContainer,
            timestamp: Date.now()
        };
        localStorage.setItem('procleanState', JSON.stringify(state));
    } catch (error) {
        console.error('Error saving app state:', error);
    }
}

function loadAppState() {
    try {
        const savedState = localStorage.getItem('procleanState');
        if (!savedState) return;
        
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
        if (state.currentContainer) {
            currentContainer = state.currentContainer;
            const containerNumberElement = elements.containerNumber || document.getElementById('containerNumber');
            if (containerNumberElement) {
                containerNumberElement.textContent = currentContainer;
            }
        }
        
    } catch (error) {
        console.error('Error loading app state:', error);
    }
}

function clearAppState() {
    try {
        localStorage.removeItem('procleanState');
        selectedCustomer = null;
        if (elements.customerSelect) elements.customerSelect.value = '';
        if (elements.personnelSelect) elements.personnelSelect.value = '';
        currentContainer = null;
        
        const containerNumberElement = elements.containerNumber || document.getElementById('containerNumber');
        if (containerNumberElement) {
            containerNumberElement.textContent = 'Yok';
        }
        
        currentPackage = {};
        
        // Reset quantity badges
        document.querySelectorAll('.quantity-badge').forEach(badge => {
            badge.textContent = '0';
        });
        
        // Clear package details
        const packageDetailContent = document.getElementById('packageDetailContent');
        if (packageDetailContent) {
            packageDetailContent.innerHTML = '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';
        }
        
    } catch (error) {
        console.error('Error clearing app state:', error);
    }
}

// Theme functions
function applySavedTheme() {
    try {
        const savedTheme = localStorage.getItem('procleanTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    } catch (error) {
        console.error('Error applying saved theme:', error);
    }
}

function toggleDarkMode() {
    try {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        localStorage.setItem('procleanTheme', isDark ? 'dark' : 'light');
        showAlert(isDark ? 'Koyu tema etkinleştirildi.' : 'Açık tema etkinleştirildi.', 'info');
    } catch (error) {
        console.error('Error toggling dark mode:', error);
    }
}

// Utility functions
function switchTab(tabName) {
    try {
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
    } catch (error) {
        console.error('Error switching tab:', error);
    }
}

function setInitialDisplayStates() {
    try {
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
        }
        if (elements.appContainer) {
            elements.appContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error setting initial display states:', error);
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
        if (modal) {
            modal.style.display = 'none';
        }
    });
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
            
            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent = `Operatör: ${currentUser.name}`;
            }
            
            document.getElementById('loginScreen').style.display = "none";
            document.getElementById('appContainer').style.display = "flex";
            
            // Initialize app after successful login
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

// Enhanced error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Handle specific error types
    if (e.error && e.error.message) {
        const message = e.error.message.toLowerCase();
        
        if (message.includes('selectpackage') || message.includes('package')) {
            console.error('Package selection error:', e.error);
            showAlert('Paket seçimi hatası. Tabloyu yenileyin.', 'error');
            return;
        }
        
        if (message.includes('supabase') || message.includes('database')) {
            console.error('Database error:', e.error);
            showAlert('Veritabanı bağlantı hatası.', 'error');
            return;
        }
    }
    
    showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
});

// API error handling
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
        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'block';
        }
    }
}

// Offline support functions
function setupOfflineSupport() {
    window.addEventListener('online', () => {
        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'none';
        }
        if (elements.connectionStatus) {
            elements.connectionStatus.textContent = 'Çevrimiçi';
        }
        showAlert('Çevrimiçi moda geçildi. Veriler senkronize ediliyor...', 'success');
        syncOfflineData();
    });

    window.addEventListener('offline', () => {
        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'block';
        }
        if (elements.connectionStatus) {
            elements.connectionStatus.textContent = 'Çevrimdışı';
        }
        showAlert('Çevrimdışı moda geçildi. Değişiklikler internet bağlantısı sağlandığında senkronize edilecek.', 'warning');
    });

    // Check initial online status
    if (!navigator.onLine) {
        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'block';
        }
        if (elements.connectionStatus) {
            elements.connectionStatus.textContent = 'Çevrimdışı';
        }
    }
}

// Sync offline data
async function syncOfflineData() {
    try {
        const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
        
        if (Object.keys(offlineData).length === 0) return;
        
        showAlert('Çevrimdışı veriler senkronize ediliyor...', 'warning');
        
        // Sync packages
        if (offlineData.packages && offlineData.packages.length > 0) {
            for (const pkg of offlineData.packages) {
                const { error } = await supabase
                    .from('packages')
                    .insert([pkg]);
                
                if (error) console.error('Package sync error:', error);
            }
        }
        
        // Sync barcodes
        if (offlineData.barcodes && offlineData.barcodes.length > 0) {
            for (const barcode of offlineData.barcodes) {
                const { error } = await supabase
                    .from('barcodes')
                    .insert([barcode]);
                
                if (error) console.error('Barcode sync error:', error);
            }
        }
        
        // Sync stock updates
        if (offlineData.stockUpdates && offlineData.stockUpdates.length > 0) {
            for (const update of offlineData.stockUpdates) {
                const { error } = await supabase
                    .from('stock_items')
                    .update({ quantity: update.quantity })
                    .eq('code', update.code);
                
                if (error) console.error('Stock sync error:', error);
            }
        }
        
        // Clear offline data after successful sync
        localStorage.removeItem('procleanOfflineData');
        showAlert('Çevrimdışı veriler başarıyla senkronize edildi', 'success');
        
    } catch (error) {
        console.error('Sync error:', error);
        showAlert('Veri senkronizasyonu sırasında hata oluştu', 'error');
    }
}

// Save offline data
function saveOfflineData(type, data) {
    try {
        const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
        
        if (!offlineData[type]) {
            offlineData[type] = [];
        }
        
        offlineData[type].push(data);
        localStorage.setItem('procleanOfflineData', JSON.stringify(offlineData));
    } catch (error) {
        console.error('Error saving offline data:', error);
    }
}

// Storage bucket functions
async function setupStorageBucket() {
    try {
        if (!supabase) return false;
        
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.warn('Bucket listing error:', bucketsError);
            return false;
        }
        
        const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports');
        
        if (!reportsBucketExists) {
            console.log('Reports bucket not found, attempting to create...');
            try {
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                    allowedMimeTypes: ['application/pdf']
                });
                
                if (createError) {
                    console.warn('Could not create bucket:', createError);
                    return false;
                }
                
                console.log('Reports bucket created:', newBucket);
                return true;
            } catch (createError) {
                console.warn('Bucket creation error:', createError);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.warn('Storage setup error:', error);
        return false;
    }
}

// Container operations
async function createNewContainer() {
    try {
        const timestamp = new Date().getTime();
        const containerNo = `CONT-${timestamp.toString().slice(-6)}`;
        
        if (!supabase) {
            showAlert('Veritabanı bağlantısı yok', 'error');
            return;
        }
        
        const { data: newContainer, error } = await supabase
            .from('containers')
            .insert([{
                container_no: containerNo,
                customer: '',
                package_count: 0,
                total_quantity: 0,
                status: 'beklemede',
                package_ids: []
            }])
            .select();

        if (error) throw error;

        const containerNumberElement = elements.containerNumber || document.getElementById('containerNumber');
        if (containerNumberElement) {
            containerNumberElement.textContent = containerNo;
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

// Package operations
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
        const selectedPersonnel = elements.personnelSelect?.value || '';

        const packageData = {
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            items: currentPackage.items,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString()
        };

        if (!navigator.onLine) {
            saveOfflineData('packages', packageData);
            showAlert(`Paket çevrimdışı oluşturuldu: ${packageNo}`, 'warning');
        } else {
            if (!supabase) {
                throw new Error('Veritabanı bağlantısı yok');
            }
            
            const { data, error } = await supabase
                .from('packages')
                .insert([packageData])
                .select();

            if (error) throw error;

            showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');
        }

        // Reset current package
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');

        // Mark scanned barcodes as processed
        if (scannedBarcodes.length > 0 && navigator.onLine && supabase) {
            const barcodeIds = scannedBarcodes.filter(b => b.id && !b.id.startsWith('offline-')).map(b => b.id);
            if (barcodeIds.length > 0) {
                await supabase.from('barcodes').update({ processed: true }).in('id', barcodeIds);
            }
            scannedBarcodes = [];
            displayScannedBarcodes();
        }

        await populatePackagesTable();

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası: ' + error.message, 'error');
    }
}

// Shipping operations
async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        if (selectedPackages.length === 0) {
            showAlert('Rampaya göndermek için paket seçin', 'error');
            return;
        }

        if (!supabase) {
            showAlert('Veritabanı bağlantısı yok', 'error');
            return;
        }

        // Use existing container or create a new one
        let containerId;
        if (containerNo && currentContainer) {
            containerId = currentContainer;
        } else {
            const timestamp = new Date().getTime();
            containerNo = `CONT-${timestamp.toString().slice(-6)}`;
            
            const { data: newContainer, error } = await supabase
                .from('containers')
                .insert([{
                    container_no: containerNo,
                    customer: selectedCustomer?.name || '',
                    package_count: selectedPackages.length,
                    total_quantity: await calculateTotalQuantity(selectedPackages),
                    status: 'beklemede',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            
            containerId = newContainer[0].id;
            currentContainer = containerNo;
            
            const containerNumberElement = elements.containerNumber || document.getElementById('containerNumber');
            if (containerNumberElement) {
                containerNumberElement.textContent = containerNo;
            }
            
            saveAppState();
        }

        // Update packages with container reference
        const { error: updateError } = await supabase
            .from('packages')
            .update({ 
                container_id: containerId,
                status: 'sevk-edildi'
            })
            .in('id', selectedPackages);

        if (updateError) throw updateError;

        showAlert(`${selectedPackages.length} paket konteynere eklendi: ${containerNo}`, 'success');
        
        // Refresh tables
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler konteynere eklenirken hata oluştu: ' + error.message, 'error');
    }
}

// Calculate total quantity helper
async function calculateTotalQuantity(packageIds) {
    try {
        if (!supabase) return packageIds.length;
        
        const { data: packages, error } = await supabase
            .from('packages')
            .select('total_quantity')
            .in('id', packageIds);

        if (error) throw error;

        return packages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
    } catch (error) {
        console.error('Error calculating total quantity:', error);
        return packageIds.length; // fallback
    }
}

// Export all functions to global scope to prevent "not defined" errors
window.selectPackage = selectPackage;
window.getSelectedPackage = getSelectedPackage;
window.populatePackagesTable = populatePackagesTable;
window.populateShippingTable = populateShippingTable;
window.populateStockTable = populateStockTable;
window.completePackage = completePackage;
window.sendToRamp = sendToRamp;
window.createNewContainer = createNewContainer;
window.saveAppState = saveAppState;
window.loadAppState = loadAppState;
window.clearAppState = clearAppState;
window.switchTab = switchTab;
window.closeAllModals = closeAllModals;
window.toggleDarkMode = toggleDarkMode;
window.handleSupabaseError = handleSupabaseError;
window.saveOfflineData = saveOfflineData;
window.syncOfflineData = syncOfflineData;
window.setupStorageBucket = setupStorageBucket;

console.log('Complete app.js loaded successfully');
