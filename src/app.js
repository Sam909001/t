// Main application initialization
class ProCleanApp {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.selectedCustomer = null;
        this.currentContainer = null;
        this.elements = {};
    }

    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing ProClean application...');
            
            // Initialize utilities first
            window.NotificationManager.init();
            OfflineManager.init();
            
            // Initialize database connection
            await DatabaseManager.init();
            
            // Setup authentication listener
            AuthManager.setupAuthListener();
            
            // Initialize UI components
            await this.initializeUI();
            
            // Setup event listeners
            this.setupGlobalEventListeners();
            
            // Load saved settings
            this.loadSettings();
            
            this.initialized = true;
            console.log('ProClean application initialized successfully');
            
        } catch (error) {
            console.error('Application initialization failed:', error);
            window.NotificationManager.showAlert('Uygulama başlatılamadı: ' + error.message, 'error');
        }
    }

    async initializeUI() {
        // Initialize element cache
        this.cacheElements();
        
        // Initialize UI managers
        ModalManager.init();
        TabManager.init();
        TableManager.init();
        
        // Set current date
        if (this.elements.currentDate) {
            this.elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
        }
    }

    cacheElements() {
        const elementIds = [
            'loginScreen', 'appContainer', 'userRole', 'currentDate',
            'customerSelect', 'personnelSelect', 'barcodeInput',
            'packagesTableBody', 'stockTableBody', 'shippingFolders',
            'containerNumber', 'totalPackages', 'connectionStatus',
            'logoutBtn', 'settingsBtn', 'toast', 'alertContainer'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    setupGlobalEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await AuthManager.login();
            });
        }

        // API Key modal
        const apiKeyBtn = document.getElementById('apiKeyBtn');
        if (apiKeyBtn) {
            apiKeyBtn.addEventListener('click', () => {
                ModalManager.showApiKeyModal();
            });
        }

        const saveApiKey = document.getElementById('saveApiKey');
        if (saveApiKey) {
            saveApiKey.addEventListener('click', () => {
                DatabaseManager.saveApiKey();
            });
        }

        // Logout button
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => {
                AuthManager.logout();
            });
        }

        // Settings button
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                ModalManager.showSettingsModal();
            });
        }

        // Barcode input
        if (this.elements.barcodeInput) {
            this.elements.barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    BarcodeManager.processBarcode();
                }
            });
        }

        // Customer select
        if (this.elements.customerSelect) {
            this.elements.customerSelect.addEventListener('change', (e) => {
                this.onCustomerSelect(e.target.value);
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveAppState();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                }
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });

        window.addEventListener('online', () => {
            OfflineManager.setOnlineStatus(true);
        });

        window.addEventListener('offline', () => {
            OfflineManager.setOnlineStatus(false);
        });
    }

    async onCustomerSelect(customerId) {
        if (!customerId) {
            this.selectedCustomer = null;
            return;
        }

        try {
            const customer = await CustomerManager.getCustomer(customerId);
            if (customer) {
                this.selectedCustomer = customer;
                window.NotificationManager.showAlert(`Müşteri seçildi: ${customer.name}`, 'success');
                this.saveAppState();
            }
        } catch (error) {
            console.error('Error selecting customer:', error);
            window.NotificationManager.showAlert('Müşteri bilgileri alınamadı', 'error');
        }
    }

    focusSearch() {
        const activeTab = TabManager.getActiveTab();
        let searchInput = null;

        switch (activeTab) {
            case 'stock':
                searchInput = document.getElementById('stockSearch');
                break;
            case 'customers':
                searchInput = document.getElementById('customerSearch');
                break;
            case 'packaging':
                searchInput = this.elements.barcodeInput;
                break;
        }

        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    saveAppState() {
        try {
            const state = {
                selectedCustomerId: this.selectedCustomer?.id || null,
                selectedPersonnelId: this.elements.personnelSelect?.value || null,
                currentContainer: this.currentContainer,
                lastTab: TabManager.getActiveTab(),
                timestamp: Date.now()
            };

            localStorage.setItem('procleanAppState', JSON.stringify(state));
            console.log('App state saved');
        } catch (error) {
            console.error('Error saving app state:', error);
        }
    }

    loadAppState() {
        try {
            const savedState = localStorage.getItem('procleanAppState');
            if (!savedState) return;

            const state = JSON.parse(savedState);
            
            // Don't load state older than 24 hours
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('procleanAppState');
                return;
            }

            // Restore customer selection
            if (state.selectedCustomerId && this.elements.customerSelect) {
                this.elements.customerSelect.value = state.selectedCustomerId;
                this.onCustomerSelect(state.selectedCustomerId);
            }

            // Restore personnel selection
            if (state.selectedPersonnelId && this.elements.personnelSelect) {
                this.elements.personnelSelect.value = state.selectedPersonnelId;
            }

            // Restore container
            if (state.currentContainer) {
                this.currentContainer = state.currentContainer;
                if (this.elements.containerNumber) {
                    this.elements.containerNumber.textContent = state.currentContainer;
                }
            }

            // Restore active tab
            if (state.lastTab) {
                TabManager.switchTab(state.lastTab);
            }

            console.log('App state loaded');
        } catch (error) {
            console.error('Error loading app state:', error);
            localStorage.removeItem('procleanAppState');
        }
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
            
            // Apply theme
            if (settings.theme === 'dark') {
                document.body.classList.add('dark-mode');
            }

            // Apply other settings
            console.log('Settings loaded:', settings);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async onUserLogin(user) {
        this.currentUser = user;
        
        // Update UI
        if (this.elements.userRole) {
            this.elements.userRole.textContent = `${user.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${user.name}`;
        }

        // Show app container
        if (this.elements.loginScreen) {
            this.elements.loginScreen.style.display = 'none';
        }
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'flex';
        }

        // Apply role-based permissions
        this.applyRolePermissions(user.role);

        // Load app data
        await this.loadAppData();

        // Load saved state
        this.loadAppState();

        window.NotificationManager.showAlert('Giriş başarılı!', 'success');
    }

    applyRolePermissions(role) {
        const adminElements = document.querySelectorAll('.admin-only');
        const isAdmin = role === 'admin';

        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });

        console.log(`${role} permissions applied`);
    }

    async loadAppData() {
        try {
            // Load customers
            await CustomerManager.populateCustomerSelect();

            // Load personnel
            await DatabaseManager.populatePersonnel();

            // Load packages
            await PackageManager.loadPackages();

            // Load stock
            await StockManager.loadStock();

            console.log('App data loaded successfully');
        } catch (error) {
            console.error('Error loading app data:', error);
            window.NotificationManager.showAlert('Veriler yüklenirken hata oluştu', 'warning');
        }
    }

    onUserLogout() {
        this.currentUser = null;
        this.selectedCustomer = null;
        this.currentContainer = null;

        // Clear UI
        if (this.elements.loginScreen) {
            this.elements.loginScreen.style.display = 'flex';
        }
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'none';
        }

        // Clear form fields
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        // Clear app state
        localStorage.removeItem('procleanAppState');

        console.log('User logged out');
    }
}

// Global app instance
let app = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize NotificationManager explicitly
        window.NotificationManager.init();
        window.OfflineManager.init();


        // Initialize OfflineManager (if you have it)
        if (window.OfflineManager) window.OfflineManager.init?.();

        // Create app instance and initialize
        const app = new ProCleanApp();
        await app.init();

        // Expose globally
        window.ProCleanApp = app;

    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;">
                <div style="text-align:center;padding:2rem;background:white;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color:#e74c3c;margin-bottom:1rem;">Uygulama Başlatılamadı</h2>
                    <p style="margin-bottom:1rem;">Bir hata oluştu: ${error.message}</p>
                    <button onclick="window.location.reload()" style="padding:0.5rem 1rem;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">Sayfayı Yenile</button>
                </div>
            </div>
        `;
    }
});

// Export for other modules
window.ProCleanApp = app;
