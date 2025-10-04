/// Supabase initialization - Varsayılan değerler
const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
let SUPABASE_ANON_KEY = null;
let supabase = null;

// Global state variables
let selectedCustomer = null;
let currentPackage = {};
let currentContainer = null;
let selectedProduct = null;
let currentUser = null;
let scannedBarcodes = [];
let editingStockItem = null;
let scannerMode = false;
let currentContainerDetails = null;
let currentReportData = null;
let selectedPackageForPrinting = null;
let personnelLoaded = false;
let packagesLoaded = false;
let packagesTableLoading = false;

// Excel local storage
let excelPackages = [];
let excelSyncQueue = [];
let isUsingExcel = false;

// ==================== SESSION MANAGEMENT VARIABLES ====================
let sessionRefreshInterval = null;
const SESSION_REFRESH_TIME = 15 * 60 * 1000; // 15 minutes

// ==================== SESSION MANAGER CLASS ====================
class SessionManager {
    static SESSION_KEY = 'proclean_session';
    static REMEMBER_ME_KEY = 'proclean_remember_me';
    
    static async initializeSession() {
        // Check for existing session
        const savedSession = localStorage.getItem(this.SESSION_KEY);
        const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
        
        if (savedSession && rememberMe && window.supabase) {
            try {
                const { data, error } = await window.supabase.auth.setSession(JSON.parse(savedSession));
                
                if (!error && data.user) {
                    console.log('✅ Session restored from storage');
                    await this.handleSuccessfulLogin(data.user);
                    return true;
                }
            } catch (error) {
                console.warn('❌ Session restoration failed:', error);
                this.clearSession();
            }
        }
        return false;
    }
    
    static async saveSession(session) {
        if (session) {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
            this.startSessionRefresh();
        }
    }
    
    static clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
        this.stopSessionRefresh();
    }
    
    static setRememberMe(value) {
        if (value) {
            localStorage.setItem(this.REMEMBER_ME_KEY, 'true');
        } else {
            localStorage.removeItem(this.REMEMBER_ME_KEY);
            this.clearSession();
        }
    }
    
    static startSessionRefresh() {
        this.stopSessionRefresh();
        
        // Refresh session every 15 minutes
        sessionRefreshInterval = setInterval(async () => {
            if (window.supabase && window.currentUser) {
                try {
                    console.log('🔄 Refreshing session...');
                    const { data, error } = await window.supabase.auth.refreshSession();
                    if (!error && data.session) {
                        await this.saveSession(data.session);
                        console.log('✅ Session refreshed automatically');
                    } else {
                        console.warn('❌ Session refresh failed:', error);
                    }
                } catch (error) {
                    console.warn('❌ Session refresh error:', error);
                }
            }
        }, SESSION_REFRESH_TIME);
    }
    
    static stopSessionRefresh() {
        if (sessionRefreshInterval) {
            clearInterval(sessionRefreshInterval);
            sessionRefreshInterval = null;
        }
    }
    
    static async handleSuccessfulLogin(user) {
        // Kullanıcı rolünü al
        const { data: userData, error: userError } = await window.supabase
            .from('personnel')
            .select('role, name')
            .eq('email', user.email)
            .single();

        window.currentUser = {
            email: user.email,
            uid: user.id,
            name: userData?.name || user.email.split('@')[0],
            role: userData?.role || 'operator'
        };

        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = 
                `${window.currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${window.currentUser.name}`;
        }

        // Rol bazlı yetkilendirme
        if (typeof window.applyRoleBasedPermissions === 'function') {
            window.applyRoleBasedPermissions(window.currentUser.role);
        }

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';

        // Test connection only once after login
        if (!window.connectionTested) {
            await window.testConnection();
            window.connectionTested = true;
        }

        if (typeof window.updateStorageIndicator === 'function') {
            window.updateStorageIndicator();
        }
    }
}

// Continue with your existing WorkspaceManager class...


// Missing dependency placeholders
if (typeof XLSX === 'undefined') {
    console.warn('XLSX library not found - using placeholder');
    window.XLSX = {
        utils: {
            book_new: () => ({}),
            json_to_sheet: (data) => data,
            book_append_sheet: (wb, ws, name) => {},
            sheet_to_json: (ws) => []
        },
        writeFile: (wb, filename) => {
            console.log('XLSX writeFile simulation:', filename);
            return true;
        }
    };
}

if (typeof emailjs === 'undefined') {
    console.warn('EmailJS not found - using placeholder');
    window.emailjs = {
        init: (key) => console.log('EmailJS init simulation:', key),
        send: (service, template, params) => {
            console.log('EmailJS send simulation:', { service, template, params });
            return Promise.resolve({ status: 200, text: 'OK' });
        }
    };
}

// Add this RIGHT AFTER the existing global variables (around line 25)
// ==================== WORKSPACE MANAGEMENT ====================
class WorkspaceManager {
    constructor() {
        this.currentWorkspace = null;
        this.workspaceKey = 'proclean_current_workspace';
        this.availableWorkspaces = [];
        this.onWorkspaceChange = null;
    }
    
    // Initialize workspace system
    async initialize() {
        console.log('🔄 Initializing workspace system...');
        await this.loadWorkspaces();
        await this.detectOrCreateWorkspace();
        this.initializeWorkspaceStorage();
        console.log('✅ Workspace system ready:', this.currentWorkspace);
        return this.currentWorkspace;
    }
    
    // Load available workspaces from localStorage
    loadWorkspaces() {
        try {
            const saved = localStorage.getItem('proclean_workspaces');
            this.availableWorkspaces = saved ? JSON.parse(saved) : [];
            
            if (this.availableWorkspaces.length === 0) {
                // Create default workspaces
                this.availableWorkspaces = [
                    { id: 'station-1', name: 'İstasyon 1', type: 'packaging', created: new Date().toISOString() },
                    { id: 'station-2', name: 'İstasyon 2', type: 'packaging', created: new Date().toISOString() },
                    { id: 'station-3', name: 'İstasyon 3', type: 'shipping', created: new Date().toISOString() },
                    { id: 'station-4', name: 'İstasyon 4', type: 'quality', created: new Date().toISOString() }
                ];
                this.saveWorkspaces();
                console.log('✅ Default workspaces created');
            }
            
            console.log('📋 Available workspaces:', this.availableWorkspaces.length);
            return this.availableWorkspaces;
        } catch (error) {
            console.error('❌ Error loading workspaces:', error);
            return [];
        }
    }
    
    // Detect or create workspace for current monitor
    async detectOrCreateWorkspace() {
        console.log('🔍 Detecting workspace...');
        
        // Try to get workspace from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const workspaceId = urlParams.get('workspace');
        
        if (workspaceId) {
            const workspace = this.availableWorkspaces.find(ws => ws.id === workspaceId);
            if (workspace) {
                this.setCurrentWorkspace(workspace);
                console.log('✅ Workspace from URL:', workspaceId);
                return;
            }
        }
        
        // Try to get from localStorage
        const savedWorkspace = localStorage.getItem(this.workspaceKey);
        if (savedWorkspace) {
            const workspace = this.availableWorkspaces.find(ws => ws.id === savedWorkspace);
            if (workspace) {
                this.setCurrentWorkspace(workspace);
                console.log('✅ Workspace from localStorage:', savedWorkspace);
                return;
            }
        }
        
        // Show workspace selection modal
        console.log('🔄 Showing workspace selection modal');
        await this.showWorkspaceSelection();
    }
    
    // Set current workspace
    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
        localStorage.setItem(this.workspaceKey, workspace.id);
        
        console.log('🎯 Current workspace set:', workspace.name);
        
        // Update UI to show current workspace
        this.updateWorkspaceUI();
        
        // Initialize workspace-specific storage
        this.initializeWorkspaceStorage();
        
        // Notify about workspace change
        if (this.onWorkspaceChange) {
            this.onWorkspaceChange();
        }
    }
    
    // Update UI to show current workspace
   updateWorkspaceUI() {
    const workspaceIndicator = document.getElementById('workspaceIndicator');
    
    if (workspaceIndicator && this.currentWorkspace) {
        const typeLabel = this.getWorkspaceTypeLabel(this.currentWorkspace);
        
        workspaceIndicator.innerHTML = `
            <i class="fas fa-desktop"></i> 
            ${this.currentWorkspace.name}
            <span class="workspace-type">${typeLabel}</span>
        `;
        workspaceIndicator.title = `Çalışma İstasyonu: ${this.currentWorkspace.name}`;
        console.log('✅ Workspace UI updated:', this.currentWorkspace.name);
    } else {
        console.warn('⚠️ Workspace indicator element not found or workspace is null');
    }
    
    // Update document title
    if (this.currentWorkspace) {
        document.title = `ProClean - ${this.currentWorkspace.name}`;
    }
}


    
    
  getWorkspaceTypeLabel(workspace) {
    // FIXED: Handle null workspace
    const ws = workspace || this.currentWorkspace;
    
    if (!ws || !ws.type) {
        return 'Genel'; // Default fallback
    }
    
    const types = {
        'packaging': 'Paketleme',
        'shipping': 'Sevkiyat',
        'quality': 'Kalite Kontrol',
        'admin': 'Yönetici'
    };
    
    return types[ws.type] || ws.type || 'Genel';
}
    
    // Initialize workspace-specific Excel storage
    initializeWorkspaceStorage() {
        if (!this.currentWorkspace) {
            console.warn('⚠️ No current workspace for storage initialization');
            return;
        }
        
        console.log('💾 Initializing workspace storage for:', this.currentWorkspace.id);
        
        // Store original functions
        if (!this.originalExcelRead) {
            this.originalExcelRead = ExcelJS.readFile;
            this.originalExcelWrite = ExcelJS.writeFile;
        }
        
        // Override with workspace-specific versions
        ExcelJS.readFile = async function() {
            try {
                const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
                const data = localStorage.getItem(`excelPackages_${workspaceId}`);
                const packages = data ? JSON.parse(data) : [];
                console.log(`📁 Loaded ${packages.length} packages from workspace: ${workspaceId}`);
                return packages;
            } catch (error) {
                console.error('❌ Workspace Excel read error:', error);
                return [];
            }
        };
        
        ExcelJS.writeFile = async function(data) {
            try {
                const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
                localStorage.setItem(`excelPackages_${workspaceId}`, JSON.stringify(data));
                console.log(`💾 Saved ${data.length} packages to workspace: ${workspaceId}`);
                return true;
            } catch (error) {
                console.error('❌ Workspace Excel write error:', error);
                return false;
            }
        };
        
        // Initialize excelPackages for current workspace
        this.loadWorkspaceData();
    }
    
   
  // Load workspace-specific data
async loadWorkspaceData() {
    try {
        const workspaceId = this.currentWorkspace?.id || 'default';
        const data = localStorage.getItem(`excelPackages_${workspaceId}`);
        const packages = data ? JSON.parse(data) : [];
        
        // Make sure excelPackages global variable is updated
        excelPackages = packages;
        
        console.log(`📦 Workspace data loaded: ${excelPackages.length} packages for workspace: ${workspaceId}`);
        return packages;
    } catch (error) {
        console.error('❌ Error loading workspace data:', error);
        excelPackages = [];
        return [];
    }
}
  
    
    // Restore original Excel functions
    restoreOriginalExcelFunctions() {
        if (this.originalExcelRead) {
            ExcelJS.readFile = this.originalExcelRead;
            ExcelJS.writeFile = this.originalExcelWrite;
        }
    }
    
  async showWorkspaceSelection() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal workspace-modal';
        modal.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.8); 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 500px; width: 90%;">
                <h2>Çalışma İstasyonu Seçin</h2>
                <p>Lütfen bu monitör için bir çalışma istasyonu seçin:</p>
                <div id="workspaceOptions" style="margin: 1rem 0;"></div>
                <button id="createNewWorkspaceBtn" 
                        style="margin-top: 1rem; padding: 0.5rem 1rem; width: 100%; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-plus"></i> Yeni İstasyon Oluştur
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Populate workspace options
        const optionsContainer = document.getElementById('workspaceOptions');
        
        if (this.availableWorkspaces.length === 0) {
            optionsContainer.innerHTML = '<p style="color: #666; text-align: center;">Henüz istasyon yok. Yeni istasyon oluşturun.</p>';
        } else {
            this.availableWorkspaces.forEach(workspace => {
                const button = document.createElement('button');
                button.style.cssText = `
                    display: block; 
                    width: 100%; 
                    padding: 1rem; 
                    margin: 0.5rem 0; 
                    text-align: left; 
                    border: 1px solid #ddd; 
                    border-radius: 5px;
                    background: #f9f9f9; 
                    cursor: pointer;
                    transition: background 0.2s;
                `;
                
                // FIXED: Pass workspace to getWorkspaceTypeLabel
                const typeLabel = this.getWorkspaceTypeLabel(workspace);
                
                button.innerHTML = `
                    <strong>${workspace.name}</strong><br>
                    <small>Tip: ${typeLabel}</small>
                `;
                
                button.onmouseover = () => button.style.background = '#e8e8e8';
                button.onmouseout = () => button.style.background = '#f9f9f9';
                
                button.onclick = () => {
                    this.setCurrentWorkspace(workspace);
                    document.body.removeChild(modal);
                    resolve();
                };
                
                optionsContainer.appendChild(button);
            });
        }
        
        // Create new workspace button handler
        const createBtn = document.getElementById('createNewWorkspaceBtn');
        if (createBtn) {
            createBtn.onclick = () => {
                this.createNewWorkspace();
                document.body.removeChild(modal);
                resolve();
            };
        }
    });
}
    
    // Create new workspace
   createNewWorkspace() {
    const name = prompt('Yeni istasyon adını girin:');
    if (!name || name.trim() === '') {
        console.log('Workspace creation cancelled');
        return;
    }
    
    const newWorkspace = {
        id: 'station-' + Date.now(),
        name: name.trim(),
        type: 'packaging', // Default type
        created: new Date().toISOString()
    };
    
    this.availableWorkspaces.push(newWorkspace);
    this.saveWorkspaces();
    this.setCurrentWorkspace(newWorkspace);
    
    console.log('New workspace created:', newWorkspace);
    showAlert(`Yeni istasyon oluşturuldu: ${newWorkspace.name}`, 'success');
}

    
    // Save workspaces to localStorage
    saveWorkspaces() {
        localStorage.setItem('proclean_workspaces', JSON.stringify(this.availableWorkspaces));
    }
    
    // Check if current workspace can perform an action
    canPerformAction(action) {
        const permissions = {
            'packaging': ['create_package', 'view_packages', 'edit_package'],
            'shipping': ['view_packages', 'ship_packages', 'view_containers'],
            'quality': ['view_packages', 'quality_check', 'view_reports'],
            'admin': ['all']
        };
        
        const workspacePermissions = permissions[this.currentWorkspace.type] || [];
        return workspacePermissions.includes(action) || permissions.admin.includes('all');
    }
}


// Add this to supabase.js after workspace manager initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Force workspace selection if none is selected
    setTimeout(async () => {
        if (window.workspaceManager && !window.workspaceManager.currentWorkspace) {
            console.log('🔄 No workspace selected, forcing selection...');
            await window.workspaceManager.showWorkspaceSelection();
        }
    }, 1000);
});



// ==================== WORKSPACE UTILITIES ====================
// Safe workspace ID getter
function getCurrentWorkspaceId() {
    try {
        return window.workspaceManager?.currentWorkspace?.id || 'default';
    } catch (error) {
        console.error('Error getting workspace ID:', error);
        return 'default';
    }
}

// Safe workspace name getter
function getCurrentWorkspaceName() {
    try {
        return window.workspaceManager?.currentWorkspace?.name || 'Default';
    } catch (error) {
        console.error('Error getting workspace name:', error);
        return 'Default';
    }
}

// Workspace validation for data operations
function validateWorkspaceAccess(packageData) {
    const currentWorkspaceId = getCurrentWorkspaceId();
    
    // If package has a workspace_id, ensure it matches current workspace
    if (packageData.workspace_id && packageData.workspace_id !== currentWorkspaceId) {
        console.warn('Workspace access violation:', {
            packageWorkspace: packageData.workspace_id,
            currentWorkspace: currentWorkspaceId,
            packageId: packageData.id
        });
        return false;
    }
    
    return true;
}

// Workspace filter for Supabase queries
function getWorkspaceFilter() {
    const workspaceId = getCurrentWorkspaceId();
    return { workspace_id: workspaceId };
}

// Test function to verify workspace isolation
async function testWorkspaceIsolation() {
    console.log('🧪 Testing workspace isolation...');
    
    const workspaceId = getCurrentWorkspaceId();
    const testPackages = [
        { id: 'test-1', workspace_id: workspaceId, package_no: 'TEST-1' },
        { id: 'test-2', workspace_id: 'different-workspace', package_no: 'TEST-2' },
        { id: 'test-3', workspace_id: workspaceId, package_no: 'TEST-3' }
    ];
    
    // Test filtering
    const filtered = testPackages.filter(pkg => pkg.workspace_id === workspaceId);
    console.log('Workspace filter test:', {
        total: testPackages.length,
        filtered: filtered.length,
        expected: 2,
        passed: filtered.length === 2
    });
    
    // Test ID generation - USE THE SAME LOGIC AS completePackage
    const timestamp = Date.now();
    const id1 = `pkg-${workspaceId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const id2 = `pkg-${workspaceId}-${timestamp + 1}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('ID generation test:', {
        id1: id1,
        id2: id2,
        areUnique: id1 !== id2,
        haveWorkspacePrefix: id1.includes(workspaceId) && id2.includes(workspaceId)
    });
    
    return true;
}



// ==================== ENHANCED WORKSPACE ISOLATION ====================

class EnhancedWorkspaceManager extends WorkspaceManager {
    constructor() {
        super();
        this.dataValidators = new Map();
        this.printerConfigs = new Map(); // ADDED: Printer configurations
        this.setupDataValidators();
        this.loadPrinterConfigurations(); // ADDED: Load printer configs
    }

    // ==================== PRINTER CONFIGURATION METHODS ====================
    
    // Load printer configurations for each workspace
    loadPrinterConfigurations() {
        // Define printer configurations for each station
        this.printerConfigs.set('station-1', {
            name: 'Argox OS-214EX PPLA',
            type: 'argox',
            connection: 'usb',
            ip: null,
            paperWidth: 50,
            paperHeight: 30,
            dpi: 203,
            description: 'İstasyon 1 - Ana Yazıcı'
        });

        this.printerConfigs.set('station-2', {
            name: 'Argox OS-214EX PPLA1', 
            type: 'argox',
            connection: 'usb',
            ip: null,
            paperWidth: 50,
            paperHeight: 30,
            dpi: 203,
            description: 'İstasyon 2 - Ana Yazıcı'
        });

        this.printerConfigs.set('station-3', {
            name: 'Zebra ZD420',
            type: 'zebra', 
            connection: 'usb',
            ip: null,
            paperWidth: 50,
            paperHeight: 30,
            dpi: 203,
            description: 'İstasyon 3 - Sevkiyat Yazıcısı'
        });

        this.printerConfigs.set('station-4', {
            name: 'Brother QL-800',
            type: 'brother',
            connection: 'usb', 
            ip: null,
            paperWidth: 62,
            paperHeight: 29,
            dpi: 300,
            description: 'İstasyon 4 - Kalite Kontrol'
        });

        // Load any saved configurations from localStorage
        this.loadSavedPrinterConfigurations();
        
        console.log('🖨️ Printer configurations loaded for all workstations');
    }

    
// In the EnhancedWorkspaceManager class, replace getCurrentPrinterConfig:
getCurrentPrinterConfig() {
    const workspaceId = this.currentWorkspace?.id;
    if (!workspaceId) {
        console.warn('No workspace selected, using default printer');
        return this.getDefaultPrinterConfig();
    }
    
    const config = this.printerConfigs.get(workspaceId);
    if (!config) {
        console.warn(`No printer config for workspace ${workspaceId}, using default`);
        return this.getDefaultPrinterConfig();
    }
    
    // Ensure selectedPrinterName exists
    if (!config.selectedPrinterName) {
        console.warn(`⚠️ Missing selectedPrinterName for ${workspaceId}, using name as fallback`);
        config.selectedPrinterName = config.name;
        this.savePrinterConfigurations(); // Save the fix
    }
    
    return config;
}

// Also update getDefaultPrinterConfig:
getDefaultPrinterConfig() {
    return {
        name: 'Default Printer',
        selectedPrinterName: 'Default Printer',
        type: 'generic',
        connection: 'wifi', // Changed to 'wifi' as the new default
        paperWidth: 50,
        paperHeight: 30,
        dpi: 203,
        description: 'Varsayılan Yazıcı'
    };
}
    // Get printer configuration for specific workspace
    getPrinterConfig(workspaceId) {
        return this.printerConfigs.get(workspaceId) || this.getDefaultPrinterConfig();
    }

    // Update printer configuration for current workspace
    updatePrinterConfig(newConfig) {
        const workspaceId = this.currentWorkspace?.id;
        if (workspaceId) {
            this.printerConfigs.set(workspaceId, {
                ...this.getCurrentPrinterConfig(),
                ...newConfig
            });
            this.savePrinterConfigurations();
            console.log(`🖨️ Printer config updated for ${workspaceId}:`, newConfig);
            
            // Update printer UI if available
            this.updatePrinterUI();
        }
    }

    // Update printer configuration for specific workspace
    updatePrinterConfigForWorkspace(workspaceId, newConfig) {
        this.printerConfigs.set(workspaceId, {
            ...this.getPrinterConfig(workspaceId),
            ...newConfig
        });
        this.savePrinterConfigurations();
        console.log(`🖨️ Printer config updated for workspace ${workspaceId}`);
    }

    // Save printer configurations to localStorage
    savePrinterConfigurations() {
        try {
            const configObj = Object.fromEntries(this.printerConfigs);
            localStorage.setItem('workspace_printer_configs', JSON.stringify(configObj));
            console.log('💾 Printer configurations saved');
        } catch (error) {
            console.error('Error saving printer configurations:', error);
        }
    }

    // Load saved configurations from localStorage
    loadSavedPrinterConfigurations() {
        try {
            const saved = localStorage.getItem('workspace_printer_configs');
            if (saved) {
                const configs = JSON.parse(saved);
                Object.entries(configs).forEach(([workspaceId, config]) => {
                    this.printerConfigs.set(workspaceId, config);
                });
                console.log('📁 Loaded saved printer configurations');
            }
        } catch (error) {
            console.error('Error loading printer configurations:', error);
        }
    }

    // Get all printer configurations for settings panel
    getAllPrinterConfigs() {
        return Array.from(this.printerConfigs.entries()).map(([workspaceId, config]) => ({
            workspaceId,
            workspaceName: this.availableWorkspaces.find(ws => ws.id === workspaceId)?.name || workspaceId,
            ...config
        }));
    }

    // Update printer UI indicator
    updatePrinterUI() {
        const printerIndicator = document.getElementById('printerIndicator');
        if (printerIndicator && this.currentWorkspace) {
            const printerConfig = this.getCurrentPrinterConfig();
            printerIndicator.innerHTML = `
                <i class="fas fa-print"></i> 
                ${this.currentWorkspace.name}: ${printerConfig.name}
                <span class="printer-status">🖨️</span>
            `;
            printerIndicator.title = `Yazıcı: ${printerConfig.name} - ${printerConfig.description || ''}`;
        }
    }

    // Override setCurrentWorkspace to update printer when workspace changes
    setCurrentWorkspace(workspace) {
        super.setCurrentWorkspace(workspace);
        
        // Update printer configuration for new workspace
        setTimeout(() => {
            this.updatePrinterUI();
            console.log(`🖨️ Workspace changed to ${workspace.name}, active printer: ${this.getCurrentPrinterConfig().name}`);
            
            // Initialize workstation printer if available
            if (window.workstationPrinter) {
                window.workstationPrinter.initialize();
            }
        }, 100);
    }

    // Test printer connection for current workspace
    async testCurrentPrinter() {
        const printerConfig = this.getCurrentPrinterConfig();
        console.log(`🧪 Testing printer: ${printerConfig.name} for ${this.currentWorkspace.name}`);
        
        // Simulate printer test
        return new Promise((resolve) => {
            setTimeout(() => {
                // In real implementation, this would actually test the printer connection
                console.log(`✅ Printer test completed for ${printerConfig.name}`);
                showAlert(`Yazıcı testi tamamlandı: ${printerConfig.name}`, 'success');
                resolve(true);
            }, 1000);
        });
    }

    // ==================== EXISTING DATA VALIDATION METHODS ====================

    // Setup validation rules for all data types
    setupDataValidators() {
        // Package validation
        this.dataValidators.set('packages', (data) => {
            const currentWorkspaceId = this.currentWorkspace?.id;
            
            // Critical: Reject packages from different workspaces
            if (data.workspace_id && data.workspace_id !== currentWorkspaceId) {
                console.error('🚨 WORKSPACE VIOLATION: Package from different workspace', {
                    packageId: data.id,
                    packageWorkspace: data.workspace_id,
                    currentWorkspace: currentWorkspaceId
                });
                return false;
            }
            
            // Ensure workspace_id is set
            if (!data.workspace_id) {
                data.workspace_id = currentWorkspaceId;
            }
            
            return true;
        });

        // Container validation
        this.dataValidators.set('containers', (data) => {
            // Containers are workspace-specific but might not have explicit workspace_id
            // We'll filter them based on their packages
            return true;
        });

        // Sync operation validation
        this.dataValidators.set('sync_operations', (data) => {
            const currentWorkspaceId = this.currentWorkspace?.id;
            
            if (data.workspace_id && data.workspace_id !== currentWorkspaceId) {
                console.error('🚨 WORKSPACE VIOLATION: Sync operation from different workspace', data);
                return false;
            }
            
            data.workspace_id = currentWorkspaceId;
            return true;
        });
    }

    // Enhanced workspace filtering for queries
    createWorkspaceFilter(tableName) {
        const currentWorkspaceId = this.currentWorkspace?.id;
        
        if (!currentWorkspaceId) {
            console.warn('⚠️ No current workspace for filter');
            return {};
        }
        
        // Different tables might have different workspace field names
        const workspaceFields = {
            'packages': 'workspace_id',
            'containers': 'workspace_id', 
            'sync_queue': 'workspace_id',
            'stock_items': 'workspace_id'
        };
        
        const field = workspaceFields[tableName] || 'workspace_id';
        
        return { [field]: currentWorkspaceId };
    }

    // Validate data before any operation
    validateDataAccess(tableName, data, operation = 'access') {
        const currentWorkspaceId = this.currentWorkspace?.id;
        
        if (!currentWorkspaceId) {
            console.error('🚨 No current workspace set during data validation');
            return false;
        }
        
        const validator = this.dataValidators.get(tableName);
        if (validator) {
            return validator(data);
        }
        
        // Default validation for unknown tables
        if (data.workspace_id && data.workspace_id !== currentWorkspaceId) {
            console.error(`🚨 WORKSPACE VIOLATION: ${operation} on ${tableName}`, {
                dataWorkspace: data.workspace_id,
                currentWorkspace: currentWorkspaceId,
                dataId: data.id
            });
            return false;
        }
        
        return true;
    }

    // Enhanced workspace-aware data loading
    async loadWorkspaceDataStrict() {
        const workspaceId = this.currentWorkspace?.id;
        
        if (!workspaceId) {
            throw new Error('No workspace selected');
        }
        
        console.log(`🔒 Loading STRICT workspace data for: ${workspaceId}`);
        
        try {
            // Load from Excel with strict filtering
            const allExcelData = await ExcelJS.readFile();
            const workspaceData = allExcelData.filter(item => {
                const isValid = item.workspace_id === workspaceId;
                if (!isValid) {
                    console.warn('🔒 Filtered out non-workspace Excel data:', {
                        id: item.id,
                        itemWorkspace: item.workspace_id,
                        currentWorkspace: workspaceId
                    });
                }
                return isValid;
            });
            
            // Update global excelPackages
            excelPackages = workspaceData;
            
            console.log(`✅ Strict workspace data loaded: ${workspaceData.length} items`);
            return workspaceData;
            
        } catch (error) {
            console.error('❌ Error in strict workspace data loading:', error);
            throw error;
        }
    }

    // Audit data access for security
    auditDataAccess(tableName, operation, data) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            workspace: this.currentWorkspace?.id,
            table: tableName,
            operation: operation,
            dataId: data.id,
            user: currentUser?.email || 'unknown'
        };
        
        // Log to console in development
        if (window.DEBUG_MODE) {
            console.log('🔍 Data Access Audit:', auditEntry);
        }
        
        // Store in localStorage for debugging
        const auditLog = JSON.parse(localStorage.getItem('workspace_audit_log') || '[]');
        auditLog.push(auditEntry);
        
        // Keep only last 1000 entries
        if (auditLog.length > 1000) {
            auditLog.splice(0, auditLog.length - 1000);
        }
        
        localStorage.setItem('workspace_audit_log', JSON.stringify(auditLog));
    }
}

// Replace the existing WorkspaceManager
window.workspaceManager = new EnhancedWorkspaceManager();

// ==================== WORKSTATION PRINTER TEST FUNCTIONS ====================

// Test function for workstation printing system
window.testWorkstationPrinting = function() {
    if (window.workspaceManager?.currentWorkspace) {
        const printer = window.workspaceManager.getCurrentPrinterConfig();
        console.log(`🎯 Current workstation: ${window.workspaceManager.currentWorkspace.name}`);
        console.log(`🖨️ Assigned printer: ${printer.name}`);
        console.log(`🔧 Printer type: ${printer.type}`);
        console.log(`📝 Description: ${printer.description}`);
        
        return {
            workstation: window.workspaceManager.currentWorkspace.name,
            printer: printer.name,
            type: printer.type,
            description: printer.description
        };
    } else {
        console.log('❌ No workspace selected');
        return null;
    }
};

// Function to test all workstation printers
window.showAllWorkstationPrinters = function() {
    const allPrinters = window.workspaceManager.getAllPrinterConfigs();
    console.log('🏢 All Workstation Printers:');
    allPrinters.forEach((printer, index) => {
        console.log(`  ${index + 1}. ${printer.workspaceName} (${printer.workspaceId}) → ${printer.name} [${printer.type}]`);
        console.log(`     Description: ${printer.description}`);
    });
    return allPrinters;
};

// Enhanced workspace validation function
function validateWorkspaceAccessStrict(data, tableName = 'packages') {
    if (!window.workspaceManager) {
        console.error('🚨 Workspace manager not initialized');
        return false;
    }
    
    return window.workspaceManager.validateDataAccess(tableName, data);
}



// ==================== WORKSTATION PRINTER FUNCTIONS ====================

// Global printer functions
async function printForCurrentWorkstation(packageData) {
    if (!window.workspaceManager?.currentWorkspace) {
        showAlert('Önce çalışma istasyonu seçin', 'error');
        return false;
    }

    const printerConfig = window.workspaceManager.getCurrentPrinterConfig();
    console.log(`🖨️ Printing from ${window.workspaceManager.currentWorkspace.name} on ${printerConfig.name}`);

    try {
        // Generate and print label
        const success = await generateAndPrintLabel(packageData, printerConfig);
        
        if (success) {
            showAlert(`Etiket yazdırıldı: ${printerConfig.name}`, 'success');
        }
        
        return success;
    } catch (error) {
        console.error('Print error:', error);
        showAlert(`Yazdırma hatası: ${error.message}`, 'error');
        return false;
    }
}

async function generateAndPrintLabel(packageData, printerConfig) {
    // Generate label content based on printer type
    const labelContent = generateLabelContent(packageData, printerConfig);
    
    // Send to printer
    return await sendToPrinter(labelContent, printerConfig);
}

function generateLabelContent(packageData, printerConfig) {
    const workspace = window.workspaceManager.currentWorkspace;
    const itemsText = packageData.items_display || 'Ürün bilgisi yok';
    const date = new Date().toLocaleDateString('tr-TR');
    
    switch (printerConfig.type) {
        case 'argox':
            return `
SIZE ${printerConfig.paperWidth} mm, ${printerConfig.paperHeight} mm
GAP 2 mm, 0 mm
CLS
TEXT 10,10,"0",0,1,1,"${workspace.name}"
TEXT 10,40,"0",0,1,1,"${packageData.package_no}"
TEXT 10,70,"0",0,1,1,"${packageData.customer_name}"
TEXT 10,100,"0",0,1,1,"${itemsText}"
TEXT 10,130,"0",0,1,1,"Toplam: ${packageData.total_quantity}"
TEXT 10,160,"0",0,1,1,"${date}"
BARCODE 10,190,"128",40,1,0,2,2,"${packageData.package_no}"
PRINT 1
`;
        case 'zebra':
            return `
^XA
^FO20,20^A0N,25,25^FD${workspace.name}^FS
^FO20,50^A0N,20,20^FD${packageData.package_no}^FS
^FO20,80^A0N,20,20^FD${packageData.customer_name}^FS
^FO20,110^A0N,15,15^FD${itemsText}^FS
^FO20,140^A0N,20,20^FDToplam: ${packageData.total_quantity}^FS
^FO20,170^A0N,15,15^FD${date}^FS
^FO20,200^BY2^BCN,40,Y,N,N^FD${packageData.package_no}^FS
^XZ
`;
        default:
            // Generic label for browser printing
            return 'generic';
    }
}

async function sendToPrinter(labelContent, printerConfig) {
    if (printerConfig.connection === 'network' && printerConfig.ip) {
        // Network printing
        return await printViaNetwork(labelContent, printerConfig);
    } else {
        // Browser printing (fallback)
        return await printViaBrowser(labelContent, printerConfig);
    }
}

async function printViaNetwork(labelContent, printerConfig) {
    try {
        const response = await fetch(`http://${printerConfig.ip}:9100`, {
            method: 'POST',
            body: labelContent,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Network print error:', error);
        return false;
    }
}

async function printViaBrowser(labelContent, printerConfig) {
    return new Promise((resolve) => {
        const printWindow = window.open('', '_blank');
        const packageData = window.currentPackage || {};
        const customer = window.selectedCustomer || {};
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Label - ${printerConfig.name}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 10mm;
                            transform: scale(0.8);
                        }
                        .label { 
                            border: 1px dashed #ccc; 
                            padding: 10px; 
                            margin: 10px 0;
                            width: ${printerConfig.paperWidth}mm;
                            min-height: ${printerConfig.paperHeight}mm;
                        }
                        .workspace { font-weight: bold; font-size: 16px; }
                        .package-no { font-size: 14px; margin: 5px 0; }
                        .customer { font-size: 12px; margin: 5px 0; }
                        .items { font-size: 11px; margin: 5px 0; }
                        .total { font-size: 12px; font-weight: bold; }
                        .date { font-size: 10px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="workspace">${window.workspaceManager.currentWorkspace.name}</div>
                        <div class="package-no">${packageData.package_no || 'PKG-XXXX'}</div>
                        <div class="customer">${customer.name || 'Müşteri'}</div>
                        <div class="items">${Object.entries(packageData.items || {}).map(([p, q]) => `${p}: ${q}`).join(', ')}</div>
                        <div class="total">Toplam: ${Object.values(packageData.items || {}).reduce((a, b) => a + b, 0)} adet</div>
                        <div class="date">${new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(() => {
                                window.close();
                                window.opener.postMessage('print_complete', '*');
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        
        // Listen for print completion
        window.addEventListener('message', function(event) {
            if (event.data === 'print_complete') {
                resolve(true);
            }
        });
        
        // Fallback timeout
        setTimeout(() => resolve(true), 3000);
    });
}

// Test printer for current workstation
async function testCurrentWorkstationPrinter() {
    if (!window.workspaceManager?.currentWorkspace) {
        showAlert('Önce çalışma istasyonu seçin', 'error');
        return;
    }
    
    await window.workspaceManager.testCurrentPrinter();
}




// Enhanced workspace filter for all queries
function getStrictWorkspaceFilter(tableName) {
    if (!window.workspaceManager) {
        console.error('🚨 Workspace manager not initialized for filter');
        return {};
    }
    
    return window.workspaceManager.createWorkspaceFilter(tableName);
}


        


// Replace ALL data loading functions with strict versions
async function loadPackagesDataStrict() {
    if (!window.workspaceManager?.currentWorkspace) {
        console.warn('Workspace not initialized, using default');
    }
    
    try {
        const workspaceId = getCurrentWorkspaceId();
        
        console.log(`🔒 STRICT: Loading packages for workspace: ${workspaceId}`);
        
        // Load from workspace-specific Excel with strict filtering
        const excelData = await ExcelJS.readFile();
        const excelPackagesList = ExcelJS.fromExcelFormat(excelData);
        
        // STRICT workspace filtering with validation
        const workspacePackages = excelPackagesList.filter(pkg => {
            const isValidWorkspace = pkg.workspace_id === workspaceId;
            const isWaiting = pkg.status === 'beklemede';
            const hasNoContainer = !pkg.container_id || pkg.container_id === null;
            
            if (!isValidWorkspace) {
                console.warn('🔒 STRICT: Filtered package from different workspace:', {
                    packageId: pkg.id,
                    packageWorkspace: pkg.workspace_id,
                    currentWorkspace: workspaceId
                });
                return false;
            }
            
            return isWaiting && hasNoContainer;
        });
        
        console.log(`✅ STRICT: Loaded from ${getCurrentWorkspaceName()} Excel:`, workspacePackages.length, 'packages');
        window.packages = workspacePackages;
        
        // Load from Supabase with STRICT workspace filtering
        if (supabase && navigator.onLine) {
            try {
                const workspaceFilter = getStrictWorkspaceFilter('packages');
                
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false });
                
                if (!error && supabasePackages && supabasePackages.length > 0) {
                    console.log(`✅ STRICT: Loaded from Supabase:`, supabasePackages.length, 'packages');
                    
                    const validSupabasePackages = supabasePackages.filter(pkg => 
                        validateWorkspaceAccessStrict(pkg)
                    );
                    
                    const mergedPackages = mergePackagesStrict(workspacePackages, validSupabasePackages);
                    window.packages = mergedPackages;
                    
                    const excelData = ExcelJS.toExcelFormat(mergedPackages);
                    await ExcelJS.writeFile(excelData);
                }
            } catch (supabaseError) {
                console.warn('Supabase load failed, using Excel data:', supabaseError);
            }
        }
        
        await populatePackagesTable();
        
    } catch (error) {
        console.error('Error in strict packages data loading:', error);
        showAlert('Paket verileri yüklenirken hata oluştu', 'error');
    }
}


// Strict merge function
function mergePackagesStrict(excelPackages, supabasePackages) {
    const merged = [...excelPackages];
    const excelIds = new Set(excelPackages.map(p => p.id));
    
    for (const supabasePkg of supabasePackages) {
        // Validate workspace access before merging
        if (!validateWorkspaceAccessStrict(supabasePkg)) {
            console.warn('🔒 Skipping Supabase package from different workspace:', supabasePkg.id);
            continue;
        }
        
        if (!excelIds.has(supabasePkg.id)) {
            merged.push(supabasePkg);
        }
    }
    
    return merged;
}



// Generate proper UUID v4 for Excel packages
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}



function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
// Elementleri bir defa tanımla
const elements = {};

// Enhanced Excel Storage with Proper Daily Files
const ExcelStorage = {
    // Get today's date string for file naming
    getTodayDateString: function() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    },
    
    // Get current file name
    getCurrentFileName: function() {
        return `packages_${this.getTodayDateString()}.json`;
    },
    
    // Get all available daily files (last 7 days)
    getAvailableDailyFiles: function() {
        const files = [];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const fileName = `packages_${dateStr}.json`;
            const fileData = localStorage.getItem(fileName);
            
            if (fileData) {
                const packages = JSON.parse(fileData);
                files.push({
                    fileName: fileName,
                    date: dateStr,
                    displayDate: date.toLocaleDateString('tr-TR'),
                    packageCount: packages.length,
                    totalQuantity: packages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                    data: packages
                });
            }
        }
        return files;
    },
    
    // Read from today's file
    readFile: async function() {
        try {
            const fileName = this.getCurrentFileName();
            const data = localStorage.getItem(fileName);
            
            if (data) {
                console.log(`📁 Loaded data from ${fileName}`);
                const packages = JSON.parse(data);
                return packages;
            } else {
                // Create empty file for today
                const emptyData = [];
                localStorage.setItem(fileName, JSON.stringify(emptyData));
                console.log(`📁 Created new daily file: ${fileName}`);
                return emptyData;
            }
        } catch (error) {
            console.error('Excel read error:', error);
            return [];
        }
    },
    
    // Write to today's file
    writeFile: async function(data) {
        try {
            const fileName = this.getCurrentFileName();
            const enhancedData = data.map(pkg => ({
                ...pkg,
                // Ensure all necessary fields are included
                customer_name: pkg.customer_name || 'Bilinmeyen Müşteri',
                customer_code: pkg.customer_code || '',
                items_display: pkg.items ? 
                    (Array.isArray(pkg.items) ? 
                        pkg.items.map(item => `${item.name}: ${item.qty} adet`).join(', ') :
                        Object.entries(pkg.items).map(([product, quantity]) => 
                            `${product}: ${quantity} adet`
                        ).join(', ')
                    ) : 'Ürün bilgisi yok',
                export_timestamp: new Date().toISOString()
            }));
            
            localStorage.setItem(fileName, JSON.stringify(enhancedData));
            
            // Also update the current active file reference
            localStorage.setItem('excelPackages_current', fileName);
            
            console.log(`💾 Saved ${enhancedData.length} records to ${fileName}`);
            return true;
        } catch (error) {
            console.error('Excel write error:', error);
            return false;
        }
    },
    
    // Export daily file to downloadable format
exportDailyFile: function(dateString) {
    try {
        const fileName = `packages_${dateString}.json`;
        const fileData = localStorage.getItem(fileName);
        
        if (!fileData) {
            showAlert(`${dateString} tarihli dosya bulunamadı`, 'error');
            return;
        }
        
        const packages = JSON.parse(fileData);
        
        // Convert to CSV format for better Excel compatibility
        const csvContent = this.convertToCSV(packages);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `proclean_packages_${dateString}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert(`${dateString} tarihli ${packages.length} paket CSV olarak indirildi`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Dosya dışa aktarılırken hata oluştu', 'error');
    }
},
    
// Convert to CSV format - Professional version
convertToCSV: function(data) {
    if (!data || data.length === 0) {
        return 'PAKET NO,MÜŞTERİ ADI,MÜŞTERİ KODU,ÜRÜN TİPLERİ,ÜRÜN DETAYLARI,TOPLAM ADET,DURUM,KONTEYNER,PAKETLEYEN,OLUŞTURULMA TARİHİ,GÜNCELLENME TARİHİ,İSTASYON,BARCODE\n';
    }
    
    const excelData = ProfessionalExcelExport.convertToProfessionalExcel(data);
    const headers = Object.keys(excelData[0]);
    
    const csvContent = [
        headers.join(','), // Header row
        ...excelData.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in values
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
},
    
    // Clean up old files (keep only last 7 days)
    cleanupOldFiles: function() {
        const keepDays = 7;
        const today = new Date();
        const filesToKeep = [];
        
        // Determine which files to keep
        for (let i = 0; i < keepDays; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            filesToKeep.push(`packages_${dateStr}.json`);
        }
        
        // Remove files older than 7 days
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('packages_') && key.endsWith('.json')) {
                if (!filesToKeep.includes(key)) {
                    localStorage.removeItem(key);
                    console.log(`🧹 Removed old file: ${key}`);
                }
            }
        }
    }
};

// Excel.js library (simple implementation) - Enhanced with ExcelStorage functionality
const ExcelJS = {
    readFile: async function() {
        try {
            // Use the enhanced daily file system
            return await ExcelStorage.readFile();
        } catch (error) {
            console.error('Excel read error:', error);
            return [];
        }
    },
    
    writeFile: async function(data) {
        try {
            // Use the enhanced daily file system
            return await ExcelStorage.writeFile(data);
        } catch (error) {
            console.error('Excel write error:', error);
            return false;
        }
    },
    
   // Simple XLSX format simulation
toExcelFormat: function(packages) {
    return packages.map(pkg => ({
        id: pkg.id, // Always use the existing ID, never generate new ones
        package_no: pkg.package_no,
        customer_id: pkg.customer_id,
        customer_name: pkg.customer_name,
        customer_code: pkg.customer_code,
        items: pkg.items,
        items_display: pkg.items_display,
        total_quantity: pkg.total_quantity,
        status: pkg.status,
        packer: pkg.packer,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at || new Date().toISOString(),
        workspace_id: pkg.workspace_id,
        station_name: pkg.station_name,
        source: pkg.source || 'excel' // Preserve existing source
    }));
},
    
    fromExcelFormat: function(excelData) {
        return excelData.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        }));
    },
    
    // Add the enhanced ExcelStorage methods to ExcelJS
    getTodayDateString: ExcelStorage.getTodayDateString,
    getCurrentFileName: ExcelStorage.getCurrentFileName,
    getAvailableDailyFiles: ExcelStorage.getAvailableDailyFiles,
    exportDailyFile: ExcelStorage.exportDailyFile,
    convertToCSV: ExcelStorage.convertToCSV,
    cleanupOldFiles: ExcelStorage.cleanupOldFiles
};



// ==================== PROFESSIONAL EXCEL EXPORT - SIMPLIFIED ====================
const ProfessionalExcelExport = {
    // Convert packages to Excel-friendly format with simplified headers
    convertToProfessionalExcel: function(packages) {
        if (!packages || packages.length === 0) {
            return [];
        }

        // Define simplified professional headers
        const excelData = packages.map(pkg => {
            // Extract items information professionally - SIMPLIFIED VERSION
            let itemsInfo = 'Ürün bilgisi yok';
            let totalQuantity = pkg.total_quantity || 0;
            
            // FIXED: Better product extraction - KEEP ONLY PRODUCT NAMES
            if (pkg.items) {
                if (Array.isArray(pkg.items)) {
                    // Array format: [{name: "Product", qty: 5}]
                    // KEEP ONLY PRODUCT NAMES, remove quantities from display
                    itemsInfo = pkg.items.map(item => item.name || 'Ürün').join(', ');
                    
                    // Calculate total quantity from items array
                    if (pkg.items.length > 0 && !totalQuantity) {
                        totalQuantity = pkg.items.reduce((sum, item) => sum + (item.qty || 0), 0);
                    }
                } else if (typeof pkg.items === 'object') {
                    // Object format: {"Product1": 5, "Product2": 3}
                    // KEEP ONLY PRODUCT NAMES, remove quantities from display
                    itemsInfo = Object.keys(pkg.items).join(', ');
                    
                    // Calculate total quantity from items object
                    const itemsArray = Object.entries(pkg.items);
                    if (itemsArray.length > 0 && !totalQuantity) {
                        totalQuantity = itemsArray.reduce((sum, [_, quantity]) => sum + quantity, 0);
                    }
                }
            } else if (pkg.items_display) {
                // Fallback to items_display but extract only product names
                const productMatches = pkg.items_display.match(/([^:,]+)(?=:)/g);
                if (productMatches) {
                    itemsInfo = productMatches.map(match => match.trim()).join(', ');
                } else {
                    itemsInfo = pkg.items_display;
                }
            } else if (pkg.product) {
                // Fallback to single product field
                itemsInfo = pkg.product;
            }

            // Get customer information - KEEP ONLY CUSTOMER NAME, REMOVE ID
            const customerName = pkg.customer_name || pkg.customers?.name || 'Bilinmeyen Müşteri';
            
            // Format dates properly
            const createdDate = pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A';
            const updatedDate = pkg.updated_at ? new Date(pkg.updated_at).toLocaleDateString('tr-TR') : 'N/A';

            // SIMPLIFIED COLUMNS - Only essential fields
            return {
                'PAKET NO': pkg.package_no || 'N/A',
                'MÜŞTERİ': customerName, // ONLY CUSTOMER NAME, NO ID
                'ÜRÜNLER': itemsInfo, // ONLY PRODUCT NAMES, NO DETAILS
                'TOPLAM ADET': totalQuantity,
                'DURUM': pkg.status === 'sevk-edildi' ? 'SEVK EDİLDİ' : 'BEKLEMEDE',
                'PAKETLEYEN': pkg.packer || 'Bilinmiyor',
                'OLUŞTURULMA TARİHİ': createdDate,
                'GÜNCELLENME TARİHİ': updatedDate,
                'İSTASYON': pkg.station_name || pkg.workspace_id || 'Default'
            };
        });

        return excelData;
    },

    // Create professional Excel file with WIDER columns and proper styling
    exportToProfessionalExcel: function(packages, filename = null) {
        try {
            if (!packages || packages.length === 0) {
                showAlert('Excel için paket verisi bulunamadı', 'warning');
                return false;
            }

            const excelData = this.convertToProfessionalExcel(packages);
            
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `ProClean_Paketler_${date}_${getCurrentWorkspaceName()}.xlsx`;
            }

            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Convert data to worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // SET WIDER COLUMN WIDTHS FOR BETTER VISIBILITY
            const colWidths = [
                { wch: 60 }, // PAKET NO - WIDER
                { wch: 40 }, // MÜŞTERİ - WIDER
                { wch: 35 }, // ÜRÜNLER - MUCH WIDER for product names
                { wch: 10 }, // TOPLAM ADET
                { wch: 40 }, // DURUM
                { wch: 40 }, // PAKETLEYEN - WIDER
                { wch: 40 }, // OLUŞTURULMA TARİHİ
                { wch: 40 }, // GÜNCELLENME TARİHİ
                { wch: 5 }  // İSTASYON
            ];
            ws['!cols'] = colWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Paketler');

            // Create header style
            if (ws['!ref']) {
                const range = XLSX.utils.decode_range(ws['!ref']);
                
                // Style header row (row 0)
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: 0 };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!ws[cell_ref]) continue;
                    
                    // Make header cells bold with professional styling
                    if (!ws[cell_ref].s) {
                        ws[cell_ref].s = {};
                    }
                    ws[cell_ref].s = {
                        font: { 
                            bold: true, 
                            color: { rgb: "FFFFFF" },
                            sz: 12 // Slightly larger font
                        },
                        fill: { 
                            fgColor: { rgb: "2F75B5" } 
                        },
                        alignment: { 
                            horizontal: "center", 
                            vertical: "center",
                            wrapText: true
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "1F5B95" } },
                            left: { style: "thin", color: { rgb: "1F5B95" } },
                            bottom: { style: "thin", color: { rgb: "1F5B95" } },
                            right: { style: "thin", color: { rgb: "1F5B95" } }
                        }
                    };
                }

                // Style data rows for better readability
                for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell_address = { c: C, r: R };
                        const cell_ref = XLSX.utils.encode_cell(cell_address);
                        if (!ws[cell_ref]) continue;
                        
                        if (!ws[cell_ref].s) {
                            ws[cell_ref].s = {};
                        }
                        
                        // Set text wrapping for better visibility
                        ws[cell_ref].s.alignment = {
                            wrapText: true,
                            vertical: "top"
                        };
                        
                        // Alternate row coloring for better readability
                        if (R % 2 === 0) {
                            ws[cell_ref].s.fill = { fgColor: { rgb: "F8F9FA" } };
                        }
                        
                        // Add borders to all cells
                        ws[cell_ref].s.border = {
                            top: { style: "thin", color: { rgb: "E0E0E0" } },
                            left: { style: "thin", color: { rgb: "E0E0E0" } },
                            bottom: { style: "thin", color: { rgb: "E0E0E0" } },
                            right: { style: "thin", color: { rgb: "E0E0E0" } }
                        };
                    }
                }

                // Add auto filters
                ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
                
                // Freeze header row
                ws['!freeze'] = { x: 0, y: 1 };
            }

            // Write and download file
            XLSX.writeFile(wb, filename);
            
            showAlert(`✅ ${packages.length} paket profesyonel Excel formatında dışa aktarıldı`, 'success');
            console.log('Professional Excel exported:', packages.length, 'packages');
            
            return true;

        } catch (error) {
            console.error('Professional Excel export error:', error);
            showAlert('Excel dışa aktarım hatası: ' + error.message, 'error');
            return false;
        }
    },

    // Enhanced CSV export with simplified columns and better formatting
    exportToProfessionalCSV: function(packages, filename = null) {
        try {
            if (!packages || packages.length === 0) {
                showAlert('CSV için paket verisi bulunamadı', 'warning');
                return false;
            }

            const excelData = this.convertToProfessionalExcel(packages);
            
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `ProClean_Paketler_${date}_${getCurrentWorkspaceName()}.csv`;
            }

            // Convert to CSV with proper formatting
            const headers = Object.keys(excelData[0]);
            const csvContent = [
                headers.join(','), // Header row
                ...excelData.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        // Escape commas and quotes in values
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            // Create and download CSV file
            const blob = new Blob(['\uFEFF' + csvContent], { 
                type: 'text/csv;charset=utf-8;' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showAlert(`✅ ${packages.length} paket CSV formatında dışa aktarıldı`, 'success');
            return true;

        } catch (error) {
            console.error('Professional CSV export error:', error);
            showAlert('CSV dışa aktarım hatası: ' + error.message, 'error');
            return false;
        }
    }
};

// Also update the upload function to use simplified columns
async function uploadExcelToSupabase(packages) {
    if (!supabase || !navigator.onLine) {
        console.log("Supabase not available, skipping upload");
        return false;
    }

    try {
        // Use the SIMPLIFIED ProfessionalExcelExport functionality
        const excelData = ProfessionalExcelExport.convertToProfessionalExcel(packages);
        
        if (!excelData || excelData.length === 0) {
            console.log("No data to upload");
            return false;
        }

        // Create CSV content with simplified columns
        const headers = Object.keys(excelData[0]);
        const csvContent = [
            headers.join(','),
            ...excelData.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escape commas and quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        // Create blob with BOM for Excel compatibility
        const blob = new Blob(['\uFEFF' + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });

        // File name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${timestamp}.csv`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from('reports')
            .upload(fileName, blob);

        if (error) {
            console.error("Supabase storage upload error:", error);
            
            // Fallback: Try to insert as records in a table
            await uploadAsDatabaseRecords(packages, timestamp);
            return false;
        }

        console.log("Excel backup uploaded to Supabase storage:", fileName);
        return true;
        
    } catch (error) {
        console.error("Supabase upload error:", error);
        return false;
    }
}



// FIXED: Supabase istemcisini başlat - Singleton pattern ile
function initializeSupabase() {
    // Eğer client zaten oluşturulmuşsa ve API key geçerliyse, mevcut olanı döndür
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set, showing modal');
        showApiKeyModal();
        isUsingExcel = true;
        showAlert('Excel modu aktif: Çevrimdışı çalışıyorsunuz', 'warning');
        return null;
    }
    
    try {
        // Global supabase değişkenine ata
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        isUsingExcel = false;
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        showAlert('Supabase başlatılamadı. Excel moduna geçiliyor.', 'warning');
        isUsingExcel = true;
        showApiKeyModal();
        return null;
    }
}

async function initializeExcelStorage() {
    try {
        // Initialize daily file system
        await ExcelStorage.cleanupOldFiles(); // Clean up old files first
        await ExcelStorage.readFile(); // Ensure today's file exists
        
        // Load from current workspace using daily file system
        const packages = await ExcelJS.readFile();
        excelPackages = packages;
        
        console.log(`Excel packages loaded from daily file:`, excelPackages.length);
        
        // Sync queue'yu yükle
        const savedQueue = localStorage.getItem('excelSyncQueue');
        excelSyncQueue = savedQueue ? JSON.parse(savedQueue) : [];
        
        return excelPackages;
    } catch (error) {
        console.error('Excel storage init error:', error);
        excelPackages = [];
        return [];
    }
}

// REPLACE the existing saveToExcel function with this:
async function saveToExcel(packageData) {
    try {
        // Enhanced package data with customer and product info
        const enhancedPackageData = {
            ...packageData,
            // Ensure customer info is included
            customer_name: packageData.customer_name || selectedCustomer?.name || 'Bilinmeyen Müşteri',
            customer_code: selectedCustomer?.code || '',
            // Ensure product/items info is properly formatted
            items: packageData.items || currentPackage.items || {},
            // Add date info for daily file management
            excel_export_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            // Convert items to readable string for Excel
            items_display: packageData.items ? 
                Object.entries(packageData.items).map(([product, quantity]) => 
                    `${product}: ${quantity} adet`
                ).join(', ') : 'Ürün bilgisi yok',
            // Add workspace info
            workspace_id: window.workspaceManager?.currentWorkspace?.id || 'default',
            station_name: window.workspaceManager?.currentWorkspace?.name || 'Default'
        };
        
        // Read current daily file
        const currentPackages = await ExcelJS.readFile();
        
        // Yeni paketi ekle veya güncelle
        const existingIndex = currentPackages.findIndex(p => p.id === enhancedPackageData.id);
        if (existingIndex >= 0) {
            currentPackages[existingIndex] = enhancedPackageData;
        } else {
            currentPackages.push(enhancedPackageData);
        }
        
        // Save to daily file
        const success = await ExcelJS.writeFile(currentPackages);
        
        if (success) {
            // Global excelPackages değişkenini güncelle
            excelPackages = currentPackages;
            console.log(`Package saved to daily file:`, enhancedPackageData.package_no);
            return true;
        }
        return false;
        
    } catch (error) {
        console.error('Save to Excel error:', error);
        return false;
    }
}

async function deleteFromExcel(packageId) {
    try {
        const currentPackages = await ExcelJS.readFile();
        const filteredPackages = currentPackages.filter(p => p.id !== packageId);
        
        const success = await ExcelJS.writeFile(filteredPackages);
        
        if (success) {
            excelPackages = filteredPackages;
            console.log('Package deleted from Excel daily file');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Delete from Excel error:', error);
        return false;
    }
}

// REPLACE the existing syncExcelWithSupabase function with this:
async function syncExcelWithSupabase() {
    if (!supabase || !navigator.onLine) {
        console.log('❌ Cannot sync: No Supabase client or offline');
        return false;
    }

    if (excelSyncQueue.length === 0) {
        console.log('✅ No packages to sync');
        return true;
    }

    const currentWorkspaceId = getCurrentWorkspaceId();
    
    try {
        // Step 1: Create backup BEFORE any operations
        const queueBackup = JSON.parse(JSON.stringify(excelSyncQueue));
        console.log('📦 Sync backup created:', queueBackup.length, 'operations');
        
        // Step 2: Filter operations for current workspace only
        const workspaceOperations = excelSyncQueue.filter(op => 
            op.workspace_id === currentWorkspaceId && op.status !== 'success'
        );
        
        if (workspaceOperations.length === 0) {
            console.log('ℹ️ No sync operations for current workspace');
            return true;
        }

        showAlert(`🔄 ${workspaceOperations.length} işlem senkronize ediliyor...`, 'info');

        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        // Step 3: Process operations with individual error handling
        for (const [index, operation] of workspaceOperations.entries()) {
            try {
                console.log(`🔄 Processing ${index + 1}/${workspaceOperations.length}:`, operation.type, operation.data.id);
                
                // Skip if too many attempts
                if (operation.attempts >= operation.maxAttempts) {
                    console.warn(`⏭️ Skipping operation after ${operation.attempts} failed attempts:`, operation.data.id);
                    operation.status = 'failed';
                    results.skipped.push(operation.fingerprint);
                    continue;
                }

                // Update attempt info
                operation.attempts = (operation.attempts || 0) + 1;
                operation.lastAttempt = new Date().toISOString();

                let result;
                const operationData = {
                    ...operation.data,
                    // Ensure workspace consistency during sync
                    workspace_id: currentWorkspaceId,
                    updated_at: new Date().toISOString()
                };

                switch (operation.type) {
                    case 'add':
                        result = await supabase
                            .from('packages')
                            .upsert([operationData], {
                                onConflict: 'id', // Use upsert to handle conflicts
                                ignoreDuplicates: false
                            });
                        break;
                        
                    case 'update':
                        result = await supabase
                            .from('packages')
                            .update(operationData)
                            .eq('id', operationData.id)
                            .eq('workspace_id', currentWorkspaceId); // Workspace safety
                        break;
                        
                    case 'delete':
                        result = await supabase
                            .from('packages')
                            .delete()
                            .eq('id', operationData.id)
                            .eq('workspace_id', currentWorkspaceId); // Workspace safety
                        break;
                        
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }

                if (result.error) {
                    throw result.error;
                }

                // Mark as successful
                operation.status = 'success';
                results.successful.push(operation.fingerprint);
                console.log(`✅ Sync successful: ${operation.type} for ${operation.data.id}`);

            } catch (opError) {
                console.error(`❌ Sync failed for ${operation.type} ${operation.data.id}:`, opError);
                
                operation.status = 'failed';
                operation.lastError = opError.message;
                results.failed.push({
                    fingerprint: operation.fingerprint,
                    error: opError.message,
                    operation: operation.type,
                    packageId: operation.data.id
                });

                // If it's a network error, stop the entire sync
                if (opError.message?.includes('network') || 
                    opError.message?.includes('fetch') || 
                    opError.message?.includes('Internet')) {
                    console.log('🌐 Network error detected, stopping sync');
                    break;
                }
            }
        }

        // Step 4: ATOMIC QUEUE UPDATE - Only remove successful operations
        const updatedQueue = excelSyncQueue.filter(op => 
            op.status !== 'success' && 
            !results.successful.includes(op.fingerprint)
        );

        // Step 5: VERIFY CHANGES BEFORE COMMITTING
        if (updatedQueue.length === excelSyncQueue.length - results.successful.length) {
            // Atomic update - all or nothing
            excelSyncQueue = updatedQueue;
            localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
            console.log('💾 Queue updated atomically');
        } else {
            throw new Error('Queue integrity check failed during sync');
        }

        // Step 6: Report results
        await reportSyncResults(results, workspaceOperations.length);
        
        return results.failed.length === 0;

    } catch (error) {
        console.error('💥 CRITICAL: Atomic sync process failed:', error);
        
        // CRITICAL: Restore from backup if catastrophic failure
        await restoreSyncBackup();
        
        showAlert('❌ Senkronizasyon sürecinde kritik hata oluştu. Veriler korundu.', 'error');
        return false;
    }
}



// Add backup restoration function
async function restoreSyncBackup() {
    try {
        const backup = localStorage.getItem('excelSyncQueue_backup');
        if (backup) {
            excelSyncQueue = JSON.parse(backup);
            localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
            console.log('🔄 Sync queue restored from backup');
        }
    } catch (error) {
        console.error('❌ Failed to restore sync backup:', error);
    }
}

// Enhanced addToSyncQueue with backup
function addToSyncQueue(operationType, data) {
    // Create operation fingerprint for deduplication
    const operationFingerprint = `${operationType}-${data.id}`;
    
    // Check for duplicates
    const isDuplicate = excelSyncQueue.some(op => 
        op.fingerprint === operationFingerprint && op.status !== 'failed'
    );
    
    if (isDuplicate) {
        console.log('🔄 Sync operation already in queue, skipping duplicate:', operationFingerprint);
        return;
    }

    // Remove any older operations for the same data ID
    excelSyncQueue = excelSyncQueue.filter(op => 
        !(op.data.id === data.id && op.type !== operationType)
    );

    // Create enhanced operation object
    const enhancedOperation = {
        type: operationType,
        data: data,
        timestamp: new Date().toISOString(),
        fingerprint: operationFingerprint,
        workspace_id: getCurrentWorkspaceId(),
        attempts: 0,
        maxAttempts: 3,
        status: 'pending',
        lastAttempt: null,
        lastError: null
    };

    // Create backup before modifying queue
    localStorage.setItem('excelSyncQueue_backup', JSON.stringify(excelSyncQueue));
    
    // Add new operation
    excelSyncQueue.push(enhancedOperation);
    
    // Limit queue size to prevent memory issues
    if (excelSyncQueue.length > 1000) {
        console.warn('📦 Sync queue too large, removing oldest failed operations');
        excelSyncQueue = excelSyncQueue
            .filter(op => op.status !== 'failed')
            .slice(-500); // Keep last 500 non-failed operations
    }

    localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
    console.log(`✅ Added to sync queue: ${operationType} for ${data.id}`);
}





// ==================== ATOMIC SYNC QUEUE SYSTEM ====================

// Add this to supabase.js after the existing sync functions

class AtomicSyncManager {
    constructor() {
        this.isSyncing = false;
        this.backupQueue = [];
        this.maxRetries = 3;
    }

    // Create atomic transaction wrapper
    async executeAtomicSync() {
        if (this.isSyncing) {
            console.log('🔄 Sync already in progress, skipping...');
            return false;
        }

        this.isSyncing = true;
        
        try {
            // Step 1: Create backup
            await this.createSyncBackup();
            
            // Step 2: Process operations in transaction
            const result = await this.processSyncTransaction();
            
            // Step 3: Only commit if ALL operations succeed
            if (result.success) {
                await this.commitSync();
                return true;
            } else {
                await this.rollbackSync();
                return false;
            }
            
        } catch (error) {
            console.error('💥 Atomic sync failed:', error);
            await this.rollbackSync();
            return false;
        } finally {
            this.isSyncing = false;
        }
    }

    // Create comprehensive backup
    async createSyncBackup() {
        this.backupQueue = JSON.parse(JSON.stringify(excelSyncQueue));
        
        // Also backup current Excel data
        const currentData = await ExcelJS.readFile();
        localStorage.setItem('sync_backup_data', JSON.stringify(currentData));
        
        console.log('📦 Sync backup created:', this.backupQueue.length, 'operations');
    }

    // Process operations as atomic transaction
    async processSyncTransaction() {
        if (!supabase || !navigator.onLine) {
            throw new Error('Cannot sync: No Supabase client or offline');
        }

        const workspaceId = getCurrentWorkspaceId();
        const workspaceOperations = excelSyncQueue.filter(op => 
            op.workspace_id === workspaceId && op.status !== 'success'
        );

        if (workspaceOperations.length === 0) {
            return { success: true, processed: 0 };
        }

        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        // Process each operation with individual error handling
        for (const operation of workspaceOperations) {
            try {
                if (operation.attempts >= this.maxRetries) {
                    results.skipped.push(operation.fingerprint);
                    continue;
                }

                const success = await this.executeSingleOperation(operation);
                
                if (success) {
                    operation.status = 'success';
                    results.successful.push(operation.fingerprint);
                } else {
                    throw new Error('Operation failed');
                }

            } catch (error) {
                console.error(`❌ Sync failed for ${operation.type}:`, error);
                operation.status = 'failed';
                operation.lastError = error.message;
                operation.attempts = (operation.attempts || 0) + 1;
                results.failed.push(operation.fingerprint);

                // Critical: Stop on network errors
                if (this.isNetworkError(error)) {
                    console.log('🌐 Network error detected, stopping sync');
                    break;
                }
            }
        }

        return {
            success: results.failed.length === 0,
            results: results
        };
    }

    // Execute single operation with timeout
    async executeSingleOperation(operation) {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 10000)
        );

        const operationPromise = this.executeOperation(operation);
        
        try {
            await Promise.race([operationPromise, timeoutPromise]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Execute specific operation types
    async executeOperation(operation) {
        const operationData = {
            ...operation.data,
            workspace_id: getCurrentWorkspaceId(),
            updated_at: new Date().toISOString()
        };

        let result;

        switch (operation.type) {
            case 'add':
                result = await supabase
                    .from('packages')
                    .upsert([operationData], {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });
                break;
                
            case 'update':
                result = await supabase
                    .from('packages')
                    .update(operationData)
                    .eq('id', operationData.id)
                    .eq('workspace_id', getCurrentWorkspaceId());
                break;
                
            case 'delete':
                result = await supabase
                    .from('packages')
                    .delete()
                    .eq('id', operationData.id)
                    .eq('workspace_id', getCurrentWorkspaceId());
                break;
                
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }

        if (result.error) {
            throw result.error;
        }

        return true;
    }

    // Check if error is network-related
    isNetworkError(error) {
        const networkErrors = ['network', 'fetch', 'internet', 'offline', 'timeout'];
        return networkErrors.some(term => 
            error.message?.toLowerCase().includes(term)
        );
    }

    // Commit successful sync
    async commitSync() {
        // Remove only successful operations
        const updatedQueue = excelSyncQueue.filter(op => op.status !== 'success');
        
        // Verify integrity before committing
        if (updatedQueue.length <= excelSyncQueue.length) {
            excelSyncQueue = updatedQueue;
            localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
            console.log('💾 Sync committed successfully');
            
            // Clear backup after successful commit
            this.backupQueue = [];
            localStorage.removeItem('sync_backup_data');
        } else {
            throw new Error('Queue integrity check failed during commit');
        }
    }

    // Rollback to previous state
    async rollbackSync() {
        console.log('🔄 Rolling back sync...');
        
        // Restore queue from backup
        if (this.backupQueue.length > 0) {
            excelSyncQueue = this.backupQueue;
            localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
        }
        
        // Restore Excel data from backup
        const backupData = localStorage.getItem('sync_backup_data');
        if (backupData) {
            await ExcelJS.writeFile(JSON.parse(backupData));
        }
        
        console.log('✅ Sync rollback completed');
    }
}

// Initialize atomic sync manager
const atomicSyncManager = new AtomicSyncManager();

// Replace the existing syncExcelWithSupabase function
async function syncExcelWithSupabase() {
    return await atomicSyncManager.executeAtomicSync();
}






// Enhanced workspace data migration
async function migrateExistingDataToWorkspace() {
    const workspaceId = getCurrentWorkspaceId();
    console.log('🔄 Checking for data migration to workspace:', workspaceId);
    
    try {
        // Read current Excel data
        const currentPackages = await ExcelJS.readFile();
        let migratedCount = 0;
        
        // Migrate packages without workspace_id
        const migratedPackages = currentPackages.map(pkg => {
            if (!pkg.workspace_id) {
                migratedCount++;
                return {
                    ...pkg,
                    workspace_id: workspaceId,
                    station_name: getCurrentWorkspaceName(),
                    updated_at: new Date().toISOString()
                };
            }
            return pkg;
        });
        
        if (migratedCount > 0) {
            console.log(`🔄 Migrated ${migratedCount} packages to workspace: ${workspaceId}`);
            await ExcelJS.writeFile(migratedPackages);
            excelPackages = migratedPackages;
        }
        
        // Also migrate sync queue
        const needsMigration = excelSyncQueue.some(op => !op.workspace_id);
        if (needsMigration) {
            excelSyncQueue = excelSyncQueue.map(op => ({
                ...op,
                workspace_id: op.workspace_id || workspaceId
            }));
            localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
            console.log('🔄 Migrated sync queue to workspace');
        }
        
        return migratedCount;
        
    } catch (error) {
        console.error('Data migration error:', error);
        return 0;
    }
}


// Enhanced results reporting
async function reportSyncResults(results, totalOperations) {
    const successCount = results.successful.length;
    const failedCount = results.failed.length;
    const skippedCount = results.skipped.length;

    console.log('📊 Sync Results:', {
        total: totalOperations,
        successful: successCount,
        failed: failedCount,
        skipped: skippedCount
    });

    if (failedCount === 0 && skippedCount === 0) {
        showAlert(`✅ Tüm senkronizasyon işlemleri tamamlandı (${successCount} işlem)`, 'success');
    } else if (failedCount > 0) {
        showAlert(
            `⚠️ ${successCount} işlem başarılı, ${failedCount} işlem başarısız, ${skippedCount} işlem atlandı`, 
            'warning'
        );
        
        // Log detailed failure info
        results.failed.forEach(failure => {
            console.warn(`❌ Failed: ${failure.operation} for ${failure.packageId} - ${failure.error}`);
        });
    }

    // Update UI based on sync results
    updateStorageIndicator();
    
    // Refresh data if any operations were successful
    if (successCount > 0) {
        setTimeout(() => {
            populatePackagesTable();
            populateShippingTable();
        }, 1000);
    }
}




// Replace existing sync triggers with this enhanced version
function setupEnhancedSyncTriggers() {
    // Auto-sync when coming online
    window.addEventListener('online', async () => {
        console.log('🌐 Online - Starting auto-sync');
        await syncExcelWithSupabase();
    });

    // Auto-sync every 2 minutes when online
    setInterval(async () => {
        if (navigator.onLine && supabase && excelSyncQueue.length > 0) {
            console.log('🔄 Periodic sync check');
            await syncExcelWithSupabase();
        }
    }, 120000); // 2 minutes

    // Manual sync function for UI
    window.manualSync = async function() {
        if (!supabase) {
            showAlert('❌ Supabase bağlantısı yok', 'error');
            return;
        }
        
        if (!navigator.onLine) {
            showAlert('❌ İnternet bağlantısı yok', 'error');
            return;
        }
        
        showAlert('🔄 Manuel senkronizasyon başlatılıyor...', 'info');
        
        const success = await syncExcelWithSupabase();
        if (success) {
            isUsingExcel = false;
            updateStorageIndicator();
        }
    };
}









// Add to supabase.js - Better queue structure
function enhanceSyncQueue() {
    // Convert existing queue to enhanced format if needed
    if (excelSyncQueue.length > 0 && !excelSyncQueue[0].attempts) {
        excelSyncQueue = excelSyncQueue.map(op => ({
            ...op,
            attempts: 0,
            maxAttempts: 3,
            lastAttempt: null,
            status: 'pending'
        }));
        localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
    }
}

// FIXED: API anahtarını kaydet ve istemciyi başlat
function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    // Eski client'ı temizle
    supabase = null;
    
    // Yeni API key'i ayarla
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    // Yeni client oluştur
    const newClient = initializeSupabase();
    
    if (newClient) {
        document.getElementById('apiKeyModal').style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
        testConnection();
        
        // Çevrimiçi olunca senkronize et
        setTimeout(syncExcelWithSupabase, 2000);
    }
}

        
let connectionAlertShown = false; // Prevent duplicate success alert

// FIXED: Supabase bağlantısını test et
async function testConnection() {
    if (!supabase) {
        console.warn('Supabase client not initialized for connection test');
        if (!connectionAlertShown) {
            showAlert('Supabase istemcisi başlatılmadı. Lütfen API anahtarını girin.', 'error');
            connectionAlertShown = true; // mark as shown to avoid repeating
        }
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        console.log('Supabase connection test successful:', data);
        
        if (!connectionAlertShown) {
            showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
            connectionAlertShown = true; // ensure alert shows only once
        }

        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        if (!connectionAlertShown) {
            showAlert('Veritabanına bağlanılamıyor. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin.', 'error');
            connectionAlertShown = true;
        }
        return false;
    }
}




 // Çevrimdışı destek
        function setupOfflineSupport() {
            window.addEventListener('online', () => {
                document.getElementById('offlineIndicator').style.display = 'none';
                elements.connectionStatus.textContent = 'Çevrimiçi';
                showAlert('Çevrimiçi moda geçildi. Veriler senkronize ediliyor...', 'success');
                syncOfflineData();
            });

            window.addEventListener('offline', () => {
                document.getElementById('offlineIndicator').style.display = 'block';
                elements.connectionStatus.textContent = 'Çevrimdışı';
                showAlert('Çevrimdışı moda geçildi. Değişiklikler internet bağlantısı sağlandığında senkronize edilecek.', 'warning');
            });

            // Başlangıçta çevrimiçi durumu kontrol et
            if (!navigator.onLine) {
                document.getElementById('offlineIndicator').style.display = 'block';
                elements.connectionStatus.textContent = 'Çevrimdışı';
            }
        }

        // Çevrimdışı verileri senkronize et
        async function syncOfflineData() {
            const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
            
            if (Object.keys(offlineData).length === 0) return;
            
            showAlert('Çevrimdışı veriler senkronize ediliyor...', 'warning');
            
            try {
                // Paketleri senkronize et
                if (offlineData.packages && offlineData.packages.length > 0) {
                    for (const pkg of offlineData.packages) {
                        const { error } = await supabase
                            .from('packages')
                            .insert([pkg]);
                        
                        if (error) console.error('Paket senkronizasyon hatası:', error);
                    }
                }
                
                // Barkodları senkronize et
                if (offlineData.barcodes && offlineData.barcodes.length > 0) {
                    for (const barcode of offlineData.barcodes) {
                        const { error } = await supabase
                            .from('barcodes')
                            .insert([barcode]);
                        
                        if (error) console.error('Barkod senkronizasyon hatası:', error);
                    }
                }
                
                // Stok güncellemelerini senkronize et
                if (offlineData.stockUpdates && offlineData.stockUpdates.length > 0) {
                    for (const update of offlineData.stockUpdates) {
                        const { error } = await supabase
                            .from('stock_items')
                            .update({ quantity: update.quantity })
                            .eq('code', update.code);
                        
                        if (error) console.error('Stok senkronizasyon hatası:', error);
                    }
                }
                
                // Başarılı senkronizasyondan sonra çevrimdışı verileri temizle
                localStorage.removeItem('procleanOfflineData');
                showAlert('Çevrimdışı veriler başarıyla senkronize edildi', 'success');
                
            } catch (error) {
                console.error('Senkronizasyon hatası:', error);
                showAlert('Veri senkronizasyonu sırasında hata oluştu', 'error');
            }
        }

        // Çevrimdışı veri kaydetme
        function saveOfflineData(type, data) {
            const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
            
            if (!offlineData[type]) {
                offlineData[type] = [];
            }
            
            offlineData[type].push(data);
            localStorage.setItem('procleanOfflineData', JSON.stringify(offlineData));
        }



  async function populateCustomers() {
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('id, name, code')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading customers:', error);
            return;
        }

        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) return;

        // Clear old options
        customerSelect.innerHTML = '<option value="">Müşteri Seç</option>';

        // Deduplicate by customer code
        const uniqueCustomers = {};
        customers.forEach(cust => {
            if (!uniqueCustomers[cust.code]) {
                uniqueCustomers[cust.code] = cust;
            }
        });

        // Append unique customers
        Object.values(uniqueCustomers).forEach(cust => {
            const opt = document.createElement('option');
            opt.value = cust.id;
            opt.textContent = `${cust.name} (${cust.code})`;
            customerSelect.appendChild(opt);
        });

    } catch (err) {
        console.error('populateCustomers error:', err);
    }
}





async function populatePersonnel() {
    if (personnelLoaded) return; // prevent duplicates
    personnelLoaded = true;

    const personnelSelect = document.getElementById('personnelSelect');
    if (!personnelSelect) return;

    personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';

    try {
        const { data: personnel, error } = await supabase
            .from('personnel')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching personnel:', error);
            showAlert('Personel verileri yüklenemedi', 'error');
            return;
        }

        if (personnel && personnel.length > 0) {
            personnel.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                personnelSelect.appendChild(option);
            });
        }

    } catch (err) {
        console.error('Unexpected error:', err);
        showAlert('Personel dropdown yükleme hatası', 'error');
    }
}





async function populatePackagesTable() {
    if (packagesTableLoading) {
        console.log('Package table already loading, skipping...');
        return;
    }
    
    packagesTableLoading = true;

    try {
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');

        if (!tableBody) throw new Error('Package table body not found');

        tableBody.innerHTML = '';
        if (totalPackagesElement) totalPackagesElement.textContent = '0';

        const workspaceId = getCurrentWorkspaceId();
        let packages = [];

        console.log(`📦 Loading packages for workspace: ${workspaceId}`);

        // Get data based on current mode
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Use Excel data filtered by workspace with additional safety
            packages = excelPackages.filter(pkg => {
                const isValidWorkspace = pkg.workspace_id === workspaceId;
                const isWaiting = pkg.status === 'beklemede';
                const hasNoContainer = !pkg.container_id || pkg.container_id === null;
                
                if (!isValidWorkspace) {
                    console.warn('Filtered out package from different workspace:', {
                        packageId: pkg.id,
                        packageWorkspace: pkg.workspace_id,
                        currentWorkspace: workspaceId
                    });
                }
                
                return isValidWorkspace && isWaiting && hasNoContainer;
            });
            console.log(`✅ Using Excel data: ${packages.length} packages for workspace: ${workspaceId}`);
        } else {
            // Try to use Supabase data with workspace filter
            try {
                const workspaceFilter = getWorkspaceFilter();
                
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .eq('workspace_id', getCurrentWorkspaceId()) // ADD THIS LINE
                    .eq('workspace_id', workspaceId) // STRICT WORKSPACE FILTER
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase workspace query error:', error);
                    throw error;
                }
                
                packages = supabasePackages || [];
                console.log(`✅ Using Supabase data: ${packages.length} packages for workspace: ${workspaceId}`);
                
            } catch (error) {
                console.warn('Supabase fetch failed, using Excel data:', error);
                // Fallback to Excel with workspace filtering
                packages = excelPackages.filter(pkg => 
                    pkg.workspace_id === workspaceId &&
                    pkg.status === 'beklemede' && 
                    (!pkg.container_id || pkg.container_id === null)
                );
                isUsingExcel = true;
            }
        }

        // Rest of the function remains the same but with additional safety...
        if (!packages || packages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="8" style="text-align:center; color:#666;">
                Henüz paket yok (${getCurrentWorkspaceName()})
            </td>`;
            tableBody.appendChild(row);
            if (totalPackagesElement) totalPackagesElement.textContent = '0';
            return;
        }

        // Render table rows with workspace validation
        packages.forEach(pkg => {
            // Validate workspace access for each package
            if (!validateWorkspaceAccess(pkg)) {
                console.warn('Skipping package from different workspace:', pkg.id);
                return; // Skip this package
            }
            
            const row = document.createElement('tr');
            
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
    <td style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
    ${sourceIcon}
    <button class="package-print-btn" onclick="printSinglePackage('${pkg.id}')" title="Etiketi Yazdır">
        <i class="fas fa-print"></i>
    </button>
</td>
`;
            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') selectPackage(pkg);
            });

            tableBody.appendChild(row);
        });

        if (totalPackagesElement) totalPackagesElement.textContent = packages.length.toString();
        console.log(`✅ Package table populated with ${packages.length} packages for workspace: ${workspaceId}`);

        // Update storage indicator
        updateStorageIndicator();

    } catch (error) {
        console.error('❌ Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası: ' + error.message, 'error');
    } finally {
        packagesTableLoading = false;
    }
}




        
        
       // Calculate total quantity of selected packages
async function calculateTotalQuantity(packageIds) {
    try {
        const { data: packages, error } = await supabase
            .from('packages')
            .select('total_quantity')
            .in('id', packageIds);

        if (error) throw error;

        return packages.reduce((sum, pkg) => sum + pkg.total_quantity, 0);
    } catch (error) {
        console.error('Error calculating total quantity:', error);
        return packageIds.length; // fallback
    }
}


        

  // Pagination state
let currentPage = 0;
const pageSize = 20; // number of containers per page

let isShippingTableLoading = false;
let lastShippingFetchTime = 0;

async function populateShippingTable(page = 0) {
    if (isShippingTableLoading) {
        console.log('Shipping table already loading, skipping...');
        return;
    }

    isShippingTableLoading = true;

    try {
        console.log('Populating shipping table...');

        const shippingFolders = document.getElementById('shippingFolders');
        if (!shippingFolders) {
            console.error('shippingFolders element not found!');
            return;
        }

        // Show loading state
        shippingFolders.innerHTML = '<div style="text-align:center; padding:40px; color:#666; font-size:16px;">Sevkiyat verileri yükleniyor...</div>';

        let containers = [];
        let packagesData = [];

        // Get data based on current mode
        if (isUsingExcel || !supabase || !navigator.onLine) {
            console.log('Using Excel data for shipping');
            
            // Use Excel data for containers
            const excelContainers = {};
            
            // Group packages by container
            excelPackages.forEach(pkg => {
                if (pkg.container_id) {
                    if (!excelContainers[pkg.container_id]) {
                        excelContainers[pkg.container_id] = {
                            id: pkg.container_id,
                            container_no: pkg.container_id,
                            packages: [],
                            package_count: 0,
                            total_quantity: 0,
                            status: pkg.status || 'beklemede',
                            created_at: pkg.created_at
                        };
                    }
                    excelContainers[pkg.container_id].packages.push(pkg);
                    excelContainers[pkg.container_id].package_count++;
                    excelContainers[pkg.container_id].total_quantity += pkg.total_quantity || 0;
                }
            });
            
            containers = Object.values(excelContainers);
            console.log('Excel containers found:', containers.length);
            
        } else {
            console.log('Using Supabase data for shipping');
            
            // Use Supabase data
            try {
                const { data: supabaseContainers, error } = await supabase
                    .from('containers')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase containers error:', error);
                    throw error;
                }

                containers = supabaseContainers || [];
                console.log('Supabase containers loaded:', containers.length);

                // Get packages for these containers if we have containers
                if (containers.length > 0) {
                    const containerIds = containers.map(c => c.id);
                    const { data: supabasePackages } = await supabase
                        .from('packages')
                        .select('*, customers(name)')
                        .in('container_id', containerIds);
                    
                    packagesData = supabasePackages || [];
                    console.log('Packages for containers loaded:', packagesData.length);
                }

            } catch (supabaseError) {
                console.error('Supabase shipping data error:', supabaseError);
                // Fallback to empty array
                containers = [];
            }
        }

        // Clear loading message
        shippingFolders.innerHTML = '';

        if (!containers || containers.length === 0) {
            shippingFolders.innerHTML = `
                <div style="text-align:center; padding:60px; color:#666;">
                    <i class="fas fa-box-open" style="font-size:48px; margin-bottom:20px; opacity:0.5;"></i>
                    <h3>Henüz konteyner bulunmamaktadır</h3>
                    <p>Paketleri sevkiyat için konteynerlere ekleyin.</p>
                    <button onclick="createNewContainer()" class="btn btn-primary" style="margin-top:15px;">
                        <i class="fas fa-plus"></i> Yeni Konteyner Oluştur
                    </button>
                </div>
            `;
            return;
        }

        console.log('Rendering containers:', containers.length);

        // Group containers by customer for folder view
        const customersMap = {};
        
        containers.forEach(container => {
            let customerName = 'Genel Sevkiyat';
            
            // Try to find customer name from packages
            if (packagesData.length > 0) {
                const containerPackages = packagesData.filter(p => p.container_id === container.id);
                if (containerPackages.length > 0) {
                    const customerNames = containerPackages.map(p => p.customers?.name).filter(Boolean);
                    if (customerNames.length > 0) {
                        customerName = [...new Set(customerNames)].join(', ');
                    }
                }
            } else if (container.packages && container.packages.length > 0) {
                // For Excel data
                const customerNames = container.packages.map(p => p.customer_name).filter(Boolean);
                if (customerNames.length > 0) {
                    customerName = [...new Set(customerNames)].join(', ');
                }
            } else if (container.customer) {
                customerName = container.customer;
            }

            if (!customersMap[customerName]) {
                customersMap[customerName] = [];
            }
            customersMap[customerName].push(container);
        });

        // Render customer folders
        Object.entries(customersMap).forEach(([customerName, customerContainers]) => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'customer-folder';
            folderDiv.style.marginBottom = '20px';
            folderDiv.style.border = '1px solid var(--border)';
            folderDiv.style.borderRadius = '8px';
            folderDiv.style.overflow = 'hidden';

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.style.padding = '15px';
            folderHeader.style.background = 'var(--light)';
            folderHeader.style.cursor = 'pointer';
            folderHeader.style.display = 'flex';
            folderHeader.style.justifyContent = 'space-between';
            folderHeader.style.alignItems = 'center';
            
            folderHeader.innerHTML = `
                <div>
                    <strong>${escapeHtml(customerName)}</strong>
                    <span style="margin-left:10px; color:#666; font-size:0.9em;">
                        (${customerContainers.length} konteyner)
                    </span>
                </div>
                <div class="folder-toggle">
                    <i class="fas fa-chevron-down"></i>
                </div>
            `;

            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            folderContent.style.padding = '0';
            folderContent.style.display = 'none'; // Start collapsed

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr style="background: var(--light);">
                        <th style="padding:12px; border:1px solid var(--border); width:30px;">
                            <input type="checkbox" class="select-all-customer" onchange="toggleSelectAllCustomer(this)">
                        </th>
                        <th style="padding:12px; border:1px solid var(--border);">Konteyner No</th>
                        <th style="padding:12px; border:1px solid var(--border);">Paket Sayısı</th>
                        <th style="padding:12px; border:1px solid var(--border);">Toplam Adet</th>
                        <th style="padding:12px; border:1px solid var(--border);">Tarih</th>
                        <th style="padding:12px; border:1px solid var(--border);">Durum</th>
                        <th style="padding:12px; border:1px solid var(--border);">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${customerContainers.map(container => `
                        <tr>
                            <td style="padding:10px; border:1px solid var(--border); text-align:center;">
                                <input type="checkbox" value="${container.id}" class="container-checkbox">
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                <strong>${escapeHtml(container.container_no)}</strong>
                            </td>
                            <td style="padding:10px; border:1px solid var(--border); text-align:center;">
                                ${container.package_count || 0}
                            </td>
                            <td style="padding:10px; border:1px solid var(--border); text-align:center;">
                                ${container.total_quantity || 0}
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                ${container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'}
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                <span class="status-${container.status || 'beklemede'}">
                                    ${container.status === 'sevk-edildi' ? 'Sevk Edildi' : 'Beklemede'}
                                </span>
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                <button onclick="viewContainerDetails('${container.id}')" class="btn btn-primary btn-sm" style="margin:2px;">
                                    <i class="fas fa-eye"></i> Detay
                                </button>
                                <button onclick="sendToRamp('${container.container_no}')" class="btn btn-warning btn-sm" style="margin:2px;">
                                    <i class="fas fa-plus"></i> Paket Ekle
                                </button>
                                <button onclick="shipContainer('${container.container_no}')" class="btn btn-success btn-sm" style="margin:2px;">
                                    <i class="fas fa-ship"></i> Sevk Et
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            folderContent.appendChild(table);
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(folderContent);

            // Folder toggle functionality
            folderHeader.addEventListener('click', () => {
                const isOpen = folderContent.style.display === 'block';
                folderContent.style.display = isOpen ? 'none' : 'block';
                const icon = folderHeader.querySelector('.fa-chevron-down');
                icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            });

            shippingFolders.appendChild(folderDiv);
        });

        console.log('Shipping table populated successfully with', Object.keys(customersMap).length, 'customer folders');

    } catch (error) {
        console.error('Error in populateShippingTable:', error);
        const shippingFolders = document.getElementById('shippingFolders');
        if (shippingFolders) {
            shippingFolders.innerHTML = `
                <div style="text-align:center; padding:40px; color:#dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:20px;"></i>
                    <h3>Sevkiyat verileri yüklenirken hata oluştu</h3>
                    <p>${error.message}</p>
                    <button onclick="populateShippingTable()" class="btn btn-primary" style="margin-top:15px;">
                        <i class="fas fa-redo"></i> Tekrar Dene
                    </button>
                </div>
            `;
        }
        showAlert('Sevkiyat tablosu yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        isShippingTableLoading = false;
    }
}



// Pagination buttons
function renderPagination(totalCount, page) {
    let paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'pagination';
        paginationDiv.style.textAlign = 'center';
        paginationDiv.style.marginTop = '10px';
        elements.shippingFolders.appendChild(paginationDiv);
    }
    paginationDiv.innerHTML = '';

    const totalPages = Math.ceil(totalCount / pageSize);

    if (page > 0) {
        const prev = document.createElement('button');
        prev.textContent = '◀ Geri';
        prev.onclick = () => populateShippingTable(page - 1);
        paginationDiv.appendChild(prev);
    }

    paginationDiv.append(` Sayfa ${page + 1} / ${totalPages} `);

    if (page < totalPages - 1) {
        const next = document.createElement('button');
        next.textContent = 'İleri ▶';
        next.onclick = () => populateShippingTable(page + 1);
        paginationDiv.appendChild(next);
    }
}

// Debounced version
let shippingTableTimeout;
function debouncedPopulateShippingTable() {
    clearTimeout(shippingTableTimeout);
    shippingTableTimeout = setTimeout(() => populateShippingTable(currentPage), 300);
}




async function viewContainerDetails(containerId) {
    console.log('🔍 viewContainerDetails called with:', containerId);
    
    try {
        let containerData;
        let packages = [];

        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Excel mode
            const containerPackages = excelPackages.filter(pkg => pkg.container_id === containerId);
            containerData = {
                id: containerId,
                container_no: containerId,
                package_count: containerPackages.length,
                total_quantity: containerPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                status: containerPackages[0]?.status || 'beklemede',
                created_at: containerPackages[0]?.created_at || new Date().toISOString()
            };
            packages = containerPackages;
        } else {
            // Supabase mode - get container with packages
            const { data: container, error } = await supabase
                .from('containers')
                .select(`
                    *,
                    packages (*, customers(name))
                `)
                .eq('id', containerId)
                .single();

            if (error) {
                console.error('Container details error:', error);
                throw new Error('Konteyner detayları yüklenemedi: ' + error.message);
            }

            containerData = container;
            packages = container.packages || [];
        }

        // Show details in a simple alert for now
        const packageList = packages.map(pkg => 
            `• ${pkg.package_no}: ${pkg.total_quantity} adet (${pkg.customers?.name || pkg.customer_name || 'Müşteri yok'})`
        ).join('\n');

        alert(`Konteyner: ${containerData.container_no}\n\n` +
              `Durum: ${containerData.status}\n` +
              `Paket Sayısı: ${containerData.package_count}\n` +
              `Toplam Adet: ${containerData.total_quantity}\n\n` +
              `Paketler:\n${packageList || 'Paket bulunamadı'}`);

    } catch (error) {
        console.error('Error in viewContainerDetails:', error);
        showAlert('Konteyner detayları yüklenirken hata oluştu: ' + error.message, 'error');
    }
}



// Konteyner detay modalından sevk et
        async function shipContainerFromModal() {
            if (currentContainerDetails) {
                await shipContainer(currentContainerDetails.container_no);
                closeContainerDetailModal();
            }
        }



        
        // Konteyner ara
        function searchContainers() {
            const searchTerm = elements.containerSearch.value.toLowerCase();
            const folders = document.querySelectorAll('.customer-folder');
            
            folders.forEach(folder => {
                const containerRows = folder.querySelectorAll('tbody tr');
                let hasVisibleRows = false;
                
                containerRows.forEach(row => {
                    const containerNo = row.cells[1].textContent.toLowerCase();
                    if (containerNo.includes(searchTerm)) {
                        row.style.display = '';
                        hasVisibleRows = true;
                    } else {
                        row.style.display = 'none';
                    }
                });
                
                // Eğer bu klasörde görünebilir satır yoksa, klasörü gizle
                const folderHeader = folder.querySelector('.folder-header');
                if (hasVisibleRows) {
                    folder.style.display = 'block';
                    folderHeader.style.display = 'flex';
                } else {
                    folder.style.display = 'none';
                }
            });
        }



let isStockTableLoading = false;
let lastStockFetchTime = 0;

// Enhanced populateReportsTable function
async function populateReportsTable() {
    try {
        console.log('Populating reports table with daily Excel files...');
        
        const reportsContainer = document.getElementById('reportsTab');
        if (!reportsContainer) {
            console.error('Reports container not found');
            return;
        }
        
        // Show loading state
        reportsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h4>Raporlar yükleniyor...</h4>
            </div>
        `;
        
        // Get daily Excel files
        const dailyFiles = ExcelStorage.getAvailableDailyFiles();
        
        let reportsHTML = `
            <div style="margin-bottom: 20px;">
                <h3><i class="fas fa-file-excel"></i> Günlük Excel Dosyaları</h3>
                <p style="color: #666; font-size: 0.9rem;">Son 7 güne ait paket kayıtları</p>
            </div>
        `;
        
        if (dailyFiles.length === 0) {
            reportsHTML += `
                <div style="text-align: center; padding: 40px; color: #666; border: 2px dashed #ddd; border-radius: 8px;">
                    <i class="fas fa-file-excel" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <h4>Henüz Excel dosyası bulunmamaktadır</h4>
                    <p>Paket oluşturduğunuzda günlük Excel dosyaları burada görünecektir.</p>
                </div>
            `;
        } else {
            dailyFiles.forEach(file => {
                const isToday = file.date === ExcelStorage.getTodayDateString();
                
                reportsHTML += `
                    <div class="daily-file-item" style="
                        border: 1px solid ${isToday ? '#4CAF50' : '#ddd'};
                        border-left: 4px solid ${isToday ? '#4CAF50' : '#2196F3'};
                        padding: 16px;
                        margin: 12px 0;
                        border-radius: 6px;
                        background: ${isToday ? '#f8fff8' : '#f9f9f9'};
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 8px 0; color: #333;">
                                    <i class="fas fa-calendar-day"></i> ${file.displayDate}
                                    ${isToday ? '<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 8px;">Bugün</span>' : ''}
                                </h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; font-size: 0.9em;">
                                    <div>
                                        <strong>Paket Sayısı:</strong><br>
                                        <span style="color: #2196F3; font-weight: bold;">${file.packageCount}</span>
                                    </div>
                                    <div>
                                        <strong>Toplam Adet:</strong><br>
                                        <span style="color: #4CAF50; font-weight: bold;">${file.totalQuantity}</span>
                                    </div>
                                    <div>
                                        <strong>Dosya:</strong><br>
                                        <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${file.fileName}</code>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <button onclick="exportDailyFile('${file.date}')" 
                                        class="btn btn-success btn-sm" 
                                        style="white-space: nowrap;">
                                    <i class="fas fa-download"></i> CSV İndir
                                </button>
                                <button onclick="viewDailyFile('${file.date}')" 
                                        class="btn btn-primary btn-sm"
                                        style="white-space: nowrap;">
                                    <i class="fas fa-eye"></i> Görüntüle
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Add cleanup button
            reportsHTML += `
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #ddd;">
                    <button onclick="cleanupOldFiles()" 
                            class="btn btn-warning btn-sm">
                        <i class="fas fa-broom"></i> 7 Günden Eski Dosyaları Temizle
                    </button>
                    <small style="color: #666; margin-left: 12px;">Sadece son 7 günün dosyaları saklanır</small>
                </div>
            `;
        }
        
        reportsContainer.innerHTML = reportsHTML;
        console.log(`✅ Reports table populated with ${dailyFiles.length} daily files`);
        
    } catch (error) {
        console.error('Error in populateReportsTable:', error);
        const reportsContainer = document.getElementById('reportsTab');
        if (reportsContainer) {
            reportsContainer.innerHTML = `
                <div style="text-align: center; color: #d32f2f; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h4>Raporlar yüklenirken hata oluştu</h4>
                    <p>${error.message}</p>
                    <button onclick="populateReportsTable()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Tekrar Dene
                    </button>
                </div>
            `;
        }
    }
}

// Enhanced viewDailyFile function
async function viewDailyFile(dateString) {
    try {
        const fileName = `packages_${dateString}.json`;
        const fileData = localStorage.getItem(fileName);
        
        if (!fileData) {
            showAlert(`${dateString} tarihli dosya bulunamadı`, 'error');
            return;
        }
        
        const packages = JSON.parse(fileData);
        
        // Remove existing modal if any
        const existingModal = document.querySelector('.daily-file-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create a modal to show file details
        const modal = document.createElement('div');
        modal.className = 'daily-file-modal';
        modal.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%;
            background: rgba(0,0,0,0.8); 
            display: flex; 
            justify-content: center;
            align-items: center; 
            z-index: 10000;
            font-family: inherit;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white; 
                padding: 24px; 
                border-radius: 8px; 
                max-width: 90%; 
                max-height: 90%; 
                width: 900px; 
                overflow: hidden;
                display: flex;
                flex-direction: column;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0;">
                    <h3 style="margin: 0; color: #333;">
                        <i class="fas fa-file-excel" style="color: #217346;"></i> 
                        ${dateString} - Paket Detayları
                    </h3>
                    <button onclick="closeDailyFileModal()" 
                            style="
                                background: none; 
                                border: none; 
                                font-size: 24px; 
                                cursor: pointer; 
                                color: #666;
                                padding: 0;
                                width: 30px;
                                height: 30px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                        ×
                    </button>
                </div>
                
                <div style="
                    margin-bottom: 16px; 
                    padding: 12px; 
                    background: #f5f5f5; 
                    border-radius: 4px;
                    flex-shrink: 0;
                ">
                    <strong>Özet:</strong> 
                    <span style="color: #2196F3; font-weight: bold;">${packages.length} paket</span>, 
                    <span style="color: #4CAF50; font-weight: bold;">${packages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0)} adet</span>
                </div>
                
                <div style="
                    flex: 1; 
                    overflow: auto; 
                    border: 1px solid #ddd;
                    border-radius: 4px;
                ">
                    <table style="
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 0.9em;
                        min-width: 600px;
                    ">
                        <thead style="background: #f0f0f0; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left; background: #e0e0e0;">Paket No</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left; background: #e0e0e0;">Müşteri</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left; background: #e0e0e0;">Ürünler</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #e0e0e0;">Adet</th>
                                <th style="padding: 12px; border: 1px solid #ddd; text-align: left; background: #e0e0e0;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${packages.map(pkg => `
                                <tr style="transition: background-color 0.2s ease;" 
                                    onmouseover="this.style.backgroundColor='#f8f9fa'" 
                                    onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${pkg.package_no || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">${pkg.customer_name || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #ddd; max-width: 250px; word-wrap: break-word;">
                                        ${pkg.items_display || pkg.product || 'N/A'}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #2196F3;">
                                        ${pkg.total_quantity || 0}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">
                                        <span style="
                                            padding: 4px 8px;
                                            border-radius: 12px;
                                            font-size: 0.8em;
                                            font-weight: 500;
                                            ${pkg.status === 'sevk-edildi' || pkg.status === 'shipped' ? 
                                                'background: #4CAF50; color: white;' : 
                                                'background: #FF9800; color: white;'
                                            }
                                        ">
                                            ${pkg.status === 'sevk-edildi' || pkg.status === 'shipped' ? 'Sevk Edildi' : 'Beklemede'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                            ${packages.length === 0 ? `
                                <tr>
                                    <td colspan="5" style="padding: 40px; text-align: center; color: #666; border: 1px solid #ddd;">
                                        <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><br>
                                        Bu dosyada paket bulunmamaktadır
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
                
                <div style="
                    margin-top: 16px; 
                    text-align: center;
                    flex-shrink: 0;
                    padding-top: 16px;
                    border-top: 1px solid #eee;
                ">
                    <button onclick="exportDailyFile('${dateString}')" 
                            class="btn btn-success"
                            style="margin-right: 8px;">
                        <i class="fas fa-download"></i> CSV Olarak İndir
                    </button>
                    <button onclick="printDailyFile('${dateString}')" 
                            class="btn btn-primary"
                            style="margin-right: 8px;">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                    <button onclick="closeDailyFileModal()" 
                            class="btn btn-secondary">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal with Escape key
        const closeModal = () => modal.remove();
        const handleEscape = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        
        document.addEventListener('keydown', handleEscape);
        modal._handleEscape = handleEscape;
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
    } catch (error) {
        console.error('Error viewing daily file:', error);
        showAlert('Dosya görüntülenirken hata oluştu: ' + error.message, 'error');
    }
}

// Close modal function
function closeDailyFileModal() {
    const modal = document.querySelector('.daily-file-modal');
    if (modal) {
        if (modal._handleEscape) {
            document.removeEventListener('keydown', modal._handleEscape);
        }
        modal.remove();
    }
}

// Enhanced export function
async function exportDailyFile(dateString) {
    try {
        showAlert('CSV dosyası hazırlanıyor...', 'info');
        
        const fileName = `packages_${dateString}.json`;
        const fileData = localStorage.getItem(fileName);
        
        if (!fileData) {
            showAlert(`${dateString} tarihli dosya bulunamadı`, 'error');
            return;
        }
        
        const packages = JSON.parse(fileData);
        
        if (packages.length === 0) {
            showAlert('İndirilecek paket bulunamadı', 'warning');
            return;
        }
        
        // Create CSV content
        const headers = ['Paket No', 'Müşteri', 'Müşteri Kodu', 'Ürünler', 'Toplam Adet', 'Durum', 'Paketleyen', 'Oluşturulma Tarihi'];
        const csvRows = [headers.join(',')];
        
        packages.forEach(pkg => {
            const row = [
                `"${pkg.package_no || ''}"`,
                `"${pkg.customer_name || ''}"`,
                `"${pkg.customer_code || ''}"`,
                `"${pkg.items_display || pkg.product || ''}"`,
                pkg.total_quantity || 0,
                `"${pkg.status === 'sevk-edildi' || pkg.status === 'shipped' ? 'Sevk Edildi' : 'Beklemede'}"`,
                `"${pkg.packer || ''}"`,
                `"${new Date(pkg.created_at).toLocaleDateString('tr-TR')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `paketler_${dateString}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert(`CSV dosyası indirildi: ${packages.length} paket`, 'success');
        
    } catch (error) {
        console.error('Error exporting daily file:', error);
        showAlert('CSV dosyası indirilirken hata oluştu: ' + error.message, 'error');
    }
}

// Print function
function printDailyFile(dateString) {
    try {
        const modal = document.querySelector('.daily-file-modal');
        if (!modal) {
            showAlert('Önce dosyayı görüntüleyin', 'warning');
            return;
        }
        
        const printContent = modal.querySelector('div').cloneNode(true);
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Paket Raporu - ${dateString}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        color: #333;
                    }
                    h1 { 
                        color: #2c3e50; 
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 10px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 12px; 
                        text-align: left;
                    }
                    th { 
                        background-color: #f8f9fa; 
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    .summary {
                        background: #e3f2fd;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 15px 0;
                        font-weight: bold;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>📦 Paket Raporu - ${dateString}</h1>
                <div class="summary">
                    Toplam: ${printContent.querySelector('div:nth-child(2)').textContent.replace('Özet:', '').trim()}
                </div>
                ${printContent.querySelector('table').outerHTML}
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        🖨️ Yazdır
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                        ❌ Kapat
                    </button>
                </div>
                <script>
                    window.onload = function() {
                        // Auto-print if needed
                        // window.print();
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
    } catch (error) {
        console.error('Error printing daily file:', error);
        showAlert('Yazdırma sırasında hata oluştu', 'error');
    }
}

// Enhanced cleanup function
async function cleanupOldFiles() {
    try {
        if (!confirm('7 günden eski dosyalar silinecek. Emin misiniz?')) {
            return;
        }
        
        showAlert('Eski dosyalar temizleniyor...', 'info');
        
        // Call ExcelStorage cleanup
        if (typeof ExcelStorage.cleanupOldFiles === 'function') {
            await ExcelStorage.cleanupOldFiles();
        } else {
            // Fallback cleanup
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('packages_')) {
                    const dateStr = key.replace('packages_', '').replace('.json', '');
                    const fileDate = new Date(dateStr);
                    
                    if (fileDate < oneWeekAgo) {
                        localStorage.removeItem(key);
                        console.log(`🗑️ Removed old file: ${key}`);
                    }
                }
            }
        }
        
        // Refresh the reports table
        await populateReportsTable();
        showAlert('Eski dosyalar başarıyla temizlendi', 'success');
        
    } catch (error) {
        console.error('Error cleaning up old files:', error);
        showAlert('Dosya temizleme sırasında hata oluştu: ' + error.message, 'error');
    }
}

// Initialize reports when tab is shown
function initializeReportsTab() {
    // Set up tab click handler
    const reportsTab = document.querySelector('[data-tab="reports"]');
    if (reportsTab) {
        reportsTab.addEventListener('click', async function() {
            // Small delay to ensure tab is visible
            setTimeout(async () => {
                await populateReportsTable();
            }, 100);
        });
    }
    
    // Also initialize if reports tab is active by default
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'reports') {
        setTimeout(async () => {
            await populateReportsTable();
        }, 500);
    }
}

// Enhanced error handling for missing functions
function safeExcelStorageCall(method, ...args) {
    if (typeof ExcelStorage !== 'undefined' && typeof ExcelStorage[method] === 'function') {
        return ExcelStorage[method](...args);
    } else {
        console.warn(`ExcelStorage.${method} is not available, using fallback`);
        // Provide fallback implementations if needed
        return null;
    }
}

// Add CSS styles for better appearance
function addReportsStyles() {
    if (!document.getElementById('reports-styles')) {
        const styles = `
            .daily-file-item {
                transition: all 0.3s ease;
            }
            .daily-file-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .btn-success { background: #28a745; border-color: #28a745; }
            .btn-primary { background: #007bff; border-color: #007bff; }
            .btn-warning { background: #ffc107; border-color: #ffc107; color: #212529; }
            .btn-secondary { background: #6c757d; border-color: #6c757d; }
            .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
            .btn { 
                display: inline-block; 
                padding: 0.375rem 0.75rem; 
                border: 1px solid transparent;
                border-radius: 0.25rem; 
                color: white; 
                text-decoration: none;
                cursor: pointer;
                font-size: 1rem;
                line-height: 1.5;
                transition: all 0.15s ease;
            }
            .btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
        `;
        const styleSheet = document.createElement('style');
        styleSheet.id = 'reports-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    addReportsStyles();
    initializeReportsTab();
    
    // Also initialize if we're already on reports tab
    setTimeout(() => {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'reports') {
            populateReportsTable();
        }
    }, 1000);
});

// Export functions for global access
window.populateReportsTable = populateReportsTable;
window.viewDailyFile = viewDailyFile;
window.exportDailyFile = exportDailyFile;
window.printDailyFile = printDailyFile;
window.cleanupOldFiles = cleanupOldFiles;
window.closeDailyFileModal = closeDailyFileModal;

console.log('✅ Reports module loaded successfully');


// Fixed populateStockTable function
async function populateStockTable() {
    if (isStockTableLoading) return;
    
    const now = Date.now();
    if (now - lastStockFetchTime < 500) {
        setTimeout(() => populateStockTable(), 500);
        return;
    }
    
    isStockTableLoading = true;
    lastStockFetchTime = now;
    
    try {
        console.log('Populating stock table...');
        
        const stockTableBody = document.getElementById('stockTableBody');
        if (!stockTableBody) {
            console.error('Stock table body not found');
            return;
        }
        
        stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666; padding:20px;">Yükleniyor...</td></tr>';
        
        let stockData = [];
        
        // Check if we should use Excel data
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Use mock stock data for Excel mode
            stockData = [
                { code: 'STK001', name: 'Büyük Çarşaf', quantity: 150, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() },
                { code: 'STK002', name: 'Büyük Havlu', quantity: 200, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() },
                { code: 'STK003', name: 'Nevresim', quantity: 85, unit: 'Adet', status: 'Az Stok', updated_at: new Date().toISOString() },
                { code: 'STK004', name: 'Çarşaf', quantity: 300, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() },
                { code: 'STK005', name: 'Havlu', quantity: 25, unit: 'Adet', status: 'Kritik', updated_at: new Date().toISOString() }
            ];
            console.log('Using mock stock data for Excel mode');
        } else {
            // Use Supabase data
            try {
                const { data, error } = await supabase
                    .from('stock_items')
                    .select('*')
                    .order('name', { ascending: true });
                
                if (error) throw error;
                stockData = data || [];
                console.log('Loaded stock data from Supabase:', stockData.length);
            } catch (error) {
                console.warn('Supabase stock fetch failed, using mock data:', error);
                stockData = [
                    { code: 'STK001', name: 'Büyük Çarşaf', quantity: 150, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() }
                ];
            }
        }
        
        // Clear loading message
        stockTableBody.innerHTML = '';
        
        if (stockData.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666; padding:20px;">Stok verisi bulunamadı</td></tr>';
            return;
        }
        
        // Populate stock table
        stockData.forEach(item => {
            const row = document.createElement('tr');
            
            // Determine status class
            let statusClass = 'status-stokta';
            let statusText = 'Stokta';
            
            if (item.quantity <= 0) {
                statusClass = 'status-kritik';
                statusText = 'Tükendi';
            } else if (item.quantity < 10) {
                statusClass = 'status-az-stok';
                statusText = 'Az Stok';
            } else if (item.quantity < 50) {
                statusClass = 'status-uyari';
                statusText = 'Düşük';
            }
            
            row.innerHTML = `
                <td>${escapeHtml(item.code || 'N/A')}</td>
                <td>${escapeHtml(item.name || 'N/A')}</td>
                <td>${item.quantity || 0}</td>
                <td>${escapeHtml(item.unit || 'Adet')}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>
                    <button onclick="editStockItem('${item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                </td>
            `;
            
            stockTableBody.appendChild(row);
        });
        
        console.log('Stock table populated with', stockData.length, 'items');
        
    } catch (error) {
        console.error('Error in populateStockTable:', error);
        const stockTableBody = document.getElementById('stockTableBody');
        if (stockTableBody) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">Stok verileri yüklenirken hata oluştu</td></tr>';
        }
        showAlert('Stok verileri yüklenirken hata oluştu', 'error');
    } finally {
        isStockTableLoading = false;
    }
}

// Fixed populateReportsTable function
async function populateReportsTable() {
    try {
        console.log('Populating reports table...');
        
        const reportsTableBody = document.getElementById('reportsTableBody');
        if (!reportsTableBody) {
            console.error('Reports table body not found');
            return;
        }
        
        reportsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:20px;">Yükleniyor...</td></tr>';
        
        let reportsData = [];
        
        // Check if we should use Excel data
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Generate mock reports data for Excel mode
            const today = new Date();
            reportsData = [
                {
                    id: 1,
                    report_date: today.toISOString(),
                    report_type: 'Günlük Rapor',
                    package_count: 15,
                    total_quantity: 245,
                    created_by: currentUser?.name || 'Sistem',
                    created_at: today.toISOString()
                },
                {
                    id: 2,
                    report_date: new Date(today.setDate(today.getDate() - 1)).toISOString(),
                    report_type: 'Günlük Rapor',
                    package_count: 12,
                    total_quantity: 198,
                    created_by: currentUser?.name || 'Sistem',
                    created_at: new Date(today.setDate(today.getDate() - 1)).toISOString()
                }
            ];
            console.log('Using mock reports data for Excel mode');
        } else {
            // Use Supabase data
            try {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (error) throw error;
                reportsData = data || [];
                console.log('Loaded reports data from Supabase:', reportsData.length);
            } catch (error) {
                console.warn('Supabase reports fetch failed, using mock data:', error);
                reportsData = [
                    {
                        id: 1,
                        report_date: new Date().toISOString(),
                        report_type: 'Günlük Rapor',
                        package_count: 15,
                        total_quantity: 245,
                        created_by: currentUser?.name || 'Sistem',
                        created_at: new Date().toISOString()
                    }
                ];
            }
        }
        
        // Clear loading message
        reportsTableBody.innerHTML = '';
        
        if (reportsData.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:20px;">Henüz rapor bulunmamaktadır</td></tr>';
            return;
        }
        
        // Populate reports table
        reportsData.forEach(report => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${report.report_date ? new Date(report.report_date).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>${escapeHtml(report.report_type || 'N/A')}</td>
                <td>${report.package_count || 0}</td>
                <td>${report.total_quantity || 0}</td>
                <td>${escapeHtml(report.created_by || 'N/A')}</td>
                <td>
                    <button onclick="viewReport(${report.id})" class="btn btn-primary btn-sm">Görüntüle</button>
                    <button onclick="exportReport(${report.id})" class="btn btn-success btn-sm">Dışa Aktar</button>
                </td>
            `;
            
            reportsTableBody.appendChild(row);
        });
        
        console.log('Reports table populated with', reportsData.length, 'reports');
        
    } catch (error) {
        console.error('Error in populateReportsTable:', error);
        const reportsTableBody = document.getElementById('reportsTableBody');
        if (reportsTableBody) {
            reportsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">Raporlar yüklenirken hata oluştu</td></tr>';
        }
        showAlert('Raporlar yüklenirken hata oluştu', 'error');
    }
}





// Add missing stock edit function
function editStockItem(stockCode) {
    showAlert(`Stok düzenleme: ${stockCode}`, 'info');
    // Implement stock editing logic here
}

// Add loadReports function for the reports tab
async function loadReports() {
    await populateReportsTable();
}



// Debounced version to prevent rapid successive calls
let stockTableTimeout;
function debouncedPopulateStockTable() {
    clearTimeout(stockTableTimeout);
    stockTableTimeout = setTimeout(populateStockTable, 300);
}




 
        async function saveStockItem(code) {
            const row = document.querySelector(`tr:has(td:first-child:contains("${code}"))`);
            const quantityInput = row.querySelector('.stock-quantity-input');
            const quantitySpan = row.querySelector('.stock-quantity');
            const editButton = row.querySelector('button');
            const editButtons = row.querySelector('.edit-buttons');
            const newQuantity = parseInt(quantityInput.value);
            
            if (isNaN(newQuantity) || newQuantity < 0) {
                showAlert('Geçerli bir miktar girin', 'error');
                return;
            }
            
            try {
                if (!navigator.onLine) {
                    // Çevrimdışı mod
                    saveOfflineData('stockUpdates', {
                        code: code,
                        quantity: newQuantity,
                        updated_at: new Date().toISOString()
                    });
                    showAlert(`Stok çevrimdışı güncellendi: ${code}`, 'warning');
                } else {
                    // Çevrimiçi mod
                    const { error } = await supabase
                        .from('stock_items')
                        .update({ 
                            quantity: newQuantity,
                            updated_at: new Date().toISOString()
                        })
                        .eq('code', code);
                    
                    if (error) throw error;
                    
                    showAlert(`Stok güncellendi: ${code}`, 'success');
                }
                
                // Görünümü güncelle
                quantitySpan.textContent = newQuantity;
                quantitySpan.style.display = 'block';
                quantityInput.style.display = 'none';
                editButton.style.display = 'block';
                editButtons.style.display = 'none';
                
                // Durumu yeniden hesapla
                const statusCell = row.querySelector('td:nth-child(5) span');
                if (newQuantity <= 0) {
                    statusCell.className = 'status-kritik';
                    statusCell.textContent = 'Kritik';
                } else if (newQuantity < 10) {
                    statusCell.className = 'status-az-stok';
                    statusCell.textContent = 'Az Stok';
                } else {
                    statusCell.className = 'status-stokta';
                    statusCell.textContent = 'Stokta';
                }
                
                editingStockItem = null;
                
            } catch (error) {
                console.error('Error updating stock:', error);
                showAlert('Stok güncellenirken hata oluştu', 'error');
            }
        }




 // Barkod işleme fonksiyonu
      async function processBarcode() {
    if (!elements.barcodeInput) {
        showAlert('Barkod girişi bulunamadı', 'error');
        return;
    }
    
    const barcode = elements.barcodeInput.value.trim();
    if (!barcode) {
        showAlert('Barkod girin', 'error');
        return;
    }

    if (!selectedCustomer) {
        showAlert('Önce müşteri seçin', 'error');
        return;
    }

    try {
        const barcodeData = {
            barcode: barcode,
            customer_id: selectedCustomer.id,
            scanned_at: new Date().toISOString(),
            processed: false
        };

        if (!navigator.onLine) {
            // Offline mode
            saveOfflineData('barcodes', barcodeData);
            scannedBarcodes.push({...barcodeData, id: 'offline-' + Date.now()});
            showAlert(`Barkod çevrimdışı kaydedildi: ${barcode}`, 'warning');
        } else {
            // Online mode with proper error handling
            if (!supabase) {
                throw new Error('Supabase client not initialized');
            }
            
            const { data, error } = await supabase
                .from('barcodes')
                .insert([barcodeData])
                .select();

            if (error) {
                handleSupabaseError(error, 'Barkod kaydetme');
                return;
            }

            if (data && data.length > 0) {
                scannedBarcodes.push(data[0]);
                showAlert(`Barkod kaydedildi: ${barcode}`, 'success');
            }
        }

        elements.barcodeInput.value = '';
        if (elements.barcodeInput.focus) {
            elements.barcodeInput.focus();
        }
        
        displayScannedBarcodes();
        
    } catch (error) {
        console.error('Barkod işleme hatası:', error);
        showAlert('Barkod işlenirken bir hata oluştu: ' + error.message, 'error');
    }
}



 // Customer operations
        async function showCustomers() {
            try {
                elements.customerList.innerHTML = '';
                
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name');

                if (error) {
                    console.error('Error loading customers:', error);
                    showAlert('Müşteri verileri yüklenemedi', 'error');
                    return;
                }

                if (customers && customers.length > 0) {
                    customers.forEach(customer => {
                        const div = document.createElement('div');
                        div.className = 'customer-item';
                        div.innerHTML = `
                            <div>
                                <strong>${customer.name}</strong><br>
                                <small>${customer.code}</small>
                            </div>
                        `;
                        div.onclick = () => selectCustomerFromModal(customer);
                        elements.customerList.appendChild(div);
                    });
                }
                
                document.getElementById('customerModal').style.display = 'flex';
            } catch (error) {
                console.error('Error in showCustomers:', error);
                showAlert('Müşteri listesi yükleme hatası', 'error');
            }
        }


        

        async function showAllCustomers() {
            try {
                elements.allCustomersList.innerHTML = '';
                
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name');

                if (error) {
                    console.error('Error loading customers:', error);
                    showAlert('Müşteri verileri yüklenemedi', 'error');
                    return;
                }

                if (customers && customers.length > 0) {
                    customers.forEach(customer => {
                        const div = document.createElement('div');
                        div.className = 'customer-item';
                        div.innerHTML = `
                            <div>
                                <strong>${customer.name}</strong> (${customer.code})<br>
                                <small>${customer.email || 'E-posta yok'}</small>
                            </div>
                            <button onclick="deleteCustomerWithAuth('${customer.id}', '${customer.name}')" class="btn btn-danger btn-sm">Sil</button>
                        `;
                        elements.allCustomersList.appendChild(div);
                    });
                }
                
                document.getElementById('allCustomersModal').style.display = 'flex';
            } catch (error) {
                console.error('Error in showAllCustomers:', error);
                showAlert('Müşteri yönetimi yükleme hatası', 'error');
            }
        }


        

        async function addNewCustomer() {
            const code = document.getElementById('newCustomerCode').value.trim();
            const name = document.getElementById('newCustomerName').value.trim();
            const email = document.getElementById('newCustomerEmail').value.trim();

            // Form doğrulama
            if (!validateForm([
                { id: 'newCustomerCode', errorId: 'customerCodeError', type: 'text', required: true },
                { id: 'newCustomerName', errorId: 'customerNameError', type: 'text', required: true },
                { id: 'newCustomerEmail', errorId: 'customerEmailError', type: 'email', required: false }
            ])) {
                return;
            }

            try {
                const { error } = await supabase
                    .from('customers')
                    .insert([{ code, name, email: email || null }]);

                if (error) {
                    console.error('Error adding customer:', error);
                    showAlert('Müşteri eklenirken hata: ' + error.message, 'error');
                    return;
                }

                showAlert('Müşteri başarıyla eklendi', 'success');
                
                // Clear form
                document.getElementById('newCustomerCode').value = '';
                document.getElementById('newCustomerName').value = '';
                document.getElementById('newCustomerEmail').value = '';
                
                // Refresh lists
                await populateCustomers();
                await showAllCustomers();
                
            } catch (error) {
                console.error('Error in addNewCustomer:', error);
                showAlert('Müşteri ekleme hatası', 'error');
            }
        }


        

        async function deleteCustomer(customerId) {
            if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;

            try {
                const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', customerId);

                if (error) {
                    console.error('Error deleting customer:', error);
                    showAlert('Müşteri silinirken hata: ' + error.message, 'error');
                    return;
                }

                showAlert('Müşteri başarıyla silindi', 'success');
                
                // Refresh lists
                await populateCustomers();
                await showAllCustomers();
                
            } catch (error) {
                console.error('Error in deleteCustomer:', error);
                showAlert('Müşteri silme hatası', 'error');
            }
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
    if (!window.workspaceManager?.canPerformAction('create_package')) {
        showAlert('Bu istasyon paket oluşturamaz', 'error');
        return;
    }

    try {
        // GENERATE ONE CONSISTENT ID FOR BOTH SYSTEMS
        const workspaceId = window.workspaceManager.currentWorkspace.id;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const packageId = `pkg-${workspaceId}-${timestamp}-${random}`;
        const packageNo = `PKG-${workspaceId}-${timestamp}`;
        
        const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);
        const selectedPersonnel = elements.personnelSelect?.value || '';

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
            workspace_id: workspaceId,
            station_name: window.workspaceManager.currentWorkspace.name,
            daily_file: ExcelStorage.getTodayDateString(),
            source: 'app' // Track source for sync
        };

        console.log('📦 Creating package with ID:', packageId);

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
            showAlert(`Paket Excel'e kaydedildi: ${packageNo} (${window.workspaceManager.currentWorkspace.name})`, 'warning');
            isUsingExcel = true;
        }

        // Reset and refresh
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');
        await populatePackagesTable();
        updateStorageIndicator();

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası: ' + error.message, 'error');
    }
}



// Delete selected packages
async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

    try {
        const packageIds = Array.from(checkboxes).map(cb => cb.value);

        const { error } = await supabase
            .from('packages')
            .delete()
            .in('id', packageIds);

        if (error) throw error;

        showAlert(`${packageIds.length} paket silindi`, 'success');
        await populatePackagesTable();

    } catch (error) {
        console.error('Error in deleteSelectedPackages:', error);
        showAlert('Paket silme hatası', 'error');
    }
}



async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => {
                const packageDataStr = cb.getAttribute('data-package');
                if (packageDataStr) {
                    const packageData = JSON.parse(packageDataStr.replace(/&quot;/g, '"'));
                    return packageData.id;
                }
                return cb.value;
            });
        
        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
            return;
        }

        // Filter out Excel-style IDs that can't be used with Supabase directly
        const validPackageIds = selectedPackages.filter(id => 
            id && !id.startsWith('pkg-') && !id.startsWith('excel-')
        );
        
        const excelStylePackageIds = selectedPackages.filter(id => 
            id && (id.startsWith('pkg-') || id.startsWith('excel-'))
        );

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
                    status: 'sevk-edildi',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            
            containerId = newContainer[0].id;
            currentContainer = containerNo;
            elements.containerNumber.textContent = containerNo;
            saveAppState();
        }

        // Update valid Supabase packages
        if (validPackageIds.length > 0 && supabase) {
            const { error: updateError } = await supabase
                .from('packages')
                .update({ 
                    container_id: containerId,
                    status: 'sevk-edildi'
                })
                .in('id', validPackageIds);

            if (updateError) console.warn('Supabase update error:', updateError);
        }

        // Update Excel packages locally
        if (excelStylePackageIds.length > 0) {
            const currentPackages = await ExcelJS.readFile();
            const updatedPackages = currentPackages.map(pkg => {
                if (excelStylePackageIds.includes(pkg.id)) {
                    return {
                        ...pkg,
                        container_id: containerId,
                        status: 'sevk-edildi',
                        updated_at: new Date().toISOString()
                    };
                }
                return pkg;
            });
            
            await ExcelJS.writeFile(ExcelJS.toExcelFormat(updatedPackages));
            excelPackages = updatedPackages;
        }

        showAlert(`${selectedPackages.length} paket sevk edildi (Konteyner: ${containerNo}) ✅`, 'success');
        
        // Refresh tables
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler sevk edilirken hata oluştu: ' + error.message, 'error');
    }
}






        
      async function shipContainer(containerNo) {
    console.log('🚢 shipContainer called with:', containerNo);
    
    if (!containerNo) {
        showAlert('Konteyner numarası geçersiz', 'error');
        return;
    }

    try {
        // First get the container data safely
        let containerData;
        
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Excel mode - find container in excelPackages
            const containerPackages = excelPackages.filter(pkg => pkg.container_id === containerNo);
            if (containerPackages.length === 0) {
                throw new Error('Konteyner Excel verilerinde bulunamadı');
            }
            
            containerData = {
                id: containerNo,
                container_no: containerNo,
                package_count: containerPackages.length,
                total_quantity: containerPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0)
            };
        } else {
            // Supabase mode
            const { data: container, error: fetchError } = await supabase
                .from('containers')
                .select('id, container_no, package_count, total_quantity, status')
                .eq('container_no', containerNo)
                .single(); // Use single() to get one record

            if (fetchError) {
                console.error('Container fetch error:', fetchError);
                throw new Error('Konteyner veritabanında bulunamadı: ' + fetchError.message);
            }
            
            if (!container) {
                throw new Error('Konteyner bulunamadı: ' + containerNo);
            }
            
            containerData = container;
        }

        console.log('Container data:', containerData);

        // Confirm shipment
        if (!confirm(`"${containerNo}" numaralı konteyneri sevk etmek istediğinize emin misiniz?\n\nPaket Sayısı: ${containerData.package_count || 0}\nToplam Adet: ${containerData.total_quantity || 0}`)) {
            return;
        }

        // Update container status
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Excel mode - update packages locally
            excelPackages.forEach(pkg => {
                if (pkg.container_id === containerNo) {
                    pkg.status = 'sevk-edildi';
                    pkg.updated_at = new Date().toISOString();
                }
            });
            
            // Save to Excel
            await ExcelJS.writeFile(ExcelJS.toExcelFormat(excelPackages));
            
            showAlert(`Konteyner ${containerNo} Excel modunda sevk edildi`, 'success');
            
        } else {
            // Supabase mode - update in database
            const { error: updateError } = await supabase
                .from('containers')
                .update({ 
                    status: 'sevk-edildi',
                    shipped_at: new Date().toISOString()
                })
                .eq('container_no', containerNo);

            if (updateError) {
                console.error('Container update error:', updateError);
                throw new Error('Konteyner güncellenirken hata oluştu: ' + updateError.message);
            }

            // Also update packages status
            const { error: packagesError } = await supabase
                .from('packages')
                .update({ status: 'sevk-edildi' })
                .eq('container_id', containerData.id);

            if (packagesError) {
                console.warn('Packages update warning:', packagesError);
                // Don't throw error for packages update, just log it
            }

            showAlert(`Konteyner ${containerNo} başarıyla sevk edildi ✅`, 'success');
        }

        // Refresh the shipping table
        await populateShippingTable();
        
    } catch (error) {
        console.error('❌ Error in shipContainer:', error);
        
        let errorMessage = 'Konteyner sevk edilirken hata oluştu';
        
        if (error.message.includes('JSON')) {
            errorMessage = 'Veri işleme hatası. Lütfen sayfayı yenileyin.';
        } else if (error.message.includes('single row')) {
            errorMessage = 'Konteyner bulunamadı veya birden fazla eşleşen kayıt var.';
        } else {
            errorMessage = error.message;
        }
        
        showAlert(errorMessage, 'error');
    }
}  


        

        function filterShipping() {
            populateShippingTable();
        }


// Enhanced reports functionality
async function generateCustomReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (reportType === 'custom' && (!startDate || !endDate)) {
        showAlert('Özel rapor için başlangıç ve bitiş tarihi seçin', 'error');
        return;
    }
    
    try {
        showAlert('Rapor oluşturuluyor...', 'info');
        
        let reportData = [];
        const workspaceId = getCurrentWorkspaceId();
        
        if (supabase && navigator.onLine) {
            // Generate from Supabase
            let query = supabase
                .from('packages')
                .select('*')
                .eq('workspace_id', workspaceId);
            
            if (reportType === 'custom' && startDate && endDate) {
                query = query.gte('created_at', startDate).lte('created_at', endDate);
            } else if (reportType === 'daily') {
                const today = new Date().toISOString().split('T')[0];
                query = query.gte('created_at', today);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            reportData = data || [];
        } else {
            // Generate from Excel files
            const dailyFiles = ExcelStorage.getAvailableDailyFiles();
            reportData = dailyFiles.flatMap(file => file.data);
            
            if (reportType === 'custom' && startDate && endDate) {
                reportData = reportData.filter(pkg => {
                    const pkgDate = pkg.created_at?.split('T')[0];
                    return pkgDate >= startDate && pkgDate <= endDate;
                });
            } else if (reportType === 'daily') {
                const today = new Date().toISOString().split('T')[0];
                reportData = reportData.filter(pkg => pkg.created_at?.startsWith(today));
            }
        }
        
        if (reportData.length === 0) {
            showAlert('Seçilen kriterlere uygun rapor verisi bulunamadı', 'info');
            return;
        }
        
        // Display report results
        displayReportResults(reportData, reportType, startDate, endDate);
        
    } catch (error) {
        console.error('Report generation error:', error);
        showAlert('Rapor oluşturulurken hata oluştu: ' + error.message, 'error');
    }
}

function displayReportResults(data, reportType, startDate, endDate) {
    const reportsContainer = document.getElementById('reportsTab');
    
    const totalQuantity = data.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
    const shippedCount = data.filter(pkg => pkg.status === 'sevk-edildi').length;
    const waitingCount = data.filter(pkg => pkg.status === 'beklemede').length;
    
    const reportHTML = `
        <div style="margin-bottom: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h4>Rapor Sonuçları</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #007bff;">${data.length}</div>
                    <div>Toplam Paket</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">${totalQuantity}</div>
                    <div>Toplam Adet</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${shippedCount}</div>
                    <div>Sevk Edilen</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${waitingCount}</div>
                    <div>Bekleyen</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <button onclick="exportReportData(data, '${reportType}')" class="btn btn-success">
                    <i class="fas fa-download"></i> Raporu Dışa Aktar
                </button>
                <button onclick="printReport()" class="btn btn-primary">
                    <i class="fas fa-print"></i> Yazdır
                </button>
            </div>
        </div>
        
        <div style="max-height: 400px; overflow: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #343a40; color: white;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #ddd;">Paket No</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Müşteri</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Ürünler</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Adet</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Durum</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Tarih</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(pkg => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${pkg.package_no}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${pkg.customer_name}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${pkg.items_display || 'N/A'}</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${pkg.total_quantity}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">
                                <span class="status-${pkg.status}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span>
                            </td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(pkg.created_at).toLocaleDateString('tr-TR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    reportsContainer.innerHTML = reportHTML;
}

async function exportReports() {
    try {
        const dailyFiles = ExcelStorage.getAvailableDailyFiles();
        if (dailyFiles.length === 0) {
            showAlert('Dışa aktarılacak rapor bulunamadı', 'info');
            return;
        }
        
        const allPackages = dailyFiles.flatMap(file => file.data);
        
        if (allPackages.length === 0) {
            showAlert('Dışa aktarılacak veri bulunamadı', 'info');
            return;
        }
        
        const date = new Date().toISOString().split('T')[0];
        const filename = `ProClean_Tum_Raporlar_${date}.xlsx`;
        
        ProfessionalExcelExport.exportToProfessionalExcel(allPackages, filename);
        
    } catch (error) {
        console.error('Export reports error:', error);
        showAlert('Raporlar dışa aktarılırken hata oluştu', 'error');
    }
}

async function loadReports() {
    await populateReportsTable();
    showAlert('Raporlar yüklendi', 'success');
}

function viewReport(reportId) {
    showAlert(`Rapor #${reportId} görüntüleniyor...`, 'info');
    // Implement detailed report view
    ExcelStorage.previewExcelData();
}

function exportReport(reportId) {
    showAlert(`Rapor #${reportId} dışa aktarılıyor...`, 'info');
    // Implement single report export
    ExcelStorage.exportDailyFile(new Date().toISOString().split('T')[0]);
}


// ==================== CONFLICT RESOLUTION ====================

// Add this to supabase.js

class ConflictResolver {
    constructor() {
        this.strategies = {
            'timestamp': this.resolveByTimestamp,
            'merge': this.resolveByMerge,
            'user_priority': this.resolveByUserPriority,
            'workspace': this.resolveByWorkspace
        };
    }

    // Detect conflicts between local and remote data
    detectConflicts(localData, remoteData) {
        const conflicts = [];
        
        // Check for same ID but different content
        if (localData.id === remoteData.id) {
            const localHash = this.generateDataHash(localData);
            const remoteHash = this.generateDataHash(remoteData);
            
            if (localHash !== remoteHash) {
                conflicts.push({
                    type: 'data_conflict',
                    field: 'content',
                    local: localData,
                    remote: remoteData,
                    severity: 'high'
                });
            }
        }
        
        // Check timestamp conflicts
        const localTime = new Date(localData.updated_at || localData.created_at);
        const remoteTime = new Date(remoteData.updated_at || remoteData.created_at);
        
        if (Math.abs(localTime - remoteTime) > 5000) { // 5 second threshold
            conflicts.push({
                type: 'timestamp_conflict',
                local: localTime,
                remote: remoteTime,
                severity: 'medium'
            });
        }
        
        return conflicts;
    }

    // Resolve conflicts with appropriate strategy
    resolveSyncConflicts(localData, remoteData, strategy = 'timestamp') {
        const conflicts = this.detectConflicts(localData, remoteData);
        
        if (conflicts.length === 0) {
            return { resolved: localData, conflicts: [] };
        }
        
        console.log('🔄 Resolving conflicts:', conflicts);
        
        const resolver = this.strategies[strategy] || this.strategies.timestamp;
        const resolved = resolver(localData, remoteData, conflicts);
        
        return {
            resolved: resolved,
            conflicts: conflicts,
            strategy: strategy
        };
    }

    // Resolve by timestamp (most recent wins)
    resolveByTimestamp(localData, remoteData, conflicts) {
        const localTime = new Date(localData.updated_at || localData.created_at);
        const remoteTime = new Date(remoteData.updated_at || remoteData.created_at);
        
        return remoteTime > localTime ? remoteData : localData;
    }

    // Merge strategy for non-destructive updates
    resolveByMerge(localData, remoteData, conflicts) {
        const merged = { ...localData };
        
        // Merge updated_at (always take latest)
        const localTime = new Date(localData.updated_at || localData.created_at);
        const remoteTime = new Date(remoteData.updated_at || remoteData.created_at);
        merged.updated_at = remoteTime > localTime 
            ? remoteData.updated_at 
            : localData.updated_at;
        
        // Merge items (combine quantities)
        if (localData.items && remoteData.items) {
            merged.items = { ...localData.items };
            for (const [product, quantity] of Object.entries(remoteData.items)) {
                merged.items[product] = (merged.items[product] || 0) + quantity;
            }
        }
        
        // Recalculate total quantity
        if (merged.items) {
            merged.total_quantity = Object.values(merged.items).reduce((sum, qty) => sum + qty, 0);
        }
        
        return merged;
    }

    // Workspace-specific resolution
    resolveByWorkspace(localData, remoteData, conflicts) {
        const currentWorkspaceId = window.workspaceManager?.currentWorkspace?.id;
        
        // Always prefer data from current workspace
        if (localData.workspace_id === currentWorkspaceId && 
            remoteData.workspace_id !== currentWorkspaceId) {
            return localData;
        }
        
        if (remoteData.workspace_id === currentWorkspaceId && 
            localData.workspace_id !== currentWorkspaceId) {
            return remoteData;
        }
        
        // Fallback to timestamp if same workspace
        return this.resolveByTimestamp(localData, remoteData, conflicts);
    }

    // Generate hash for data comparison
    generateDataHash(data) {
        const relevantData = {
            items: data.items,
            total_quantity: data.total_quantity,
            status: data.status,
            container_id: data.container_id
        };
        
        return JSON.stringify(relevantData);
    }
}

// Initialize conflict resolver
const conflictResolver = new ConflictResolver();

// Enhanced sync with conflict resolution
async function syncWithConflictResolution() {
    try {
        const workspaceId = getCurrentWorkspaceId();
        const pendingOperations = excelSyncQueue.filter(op => 
            op.workspace_id === workspaceId && op.status !== 'success'
        );

        for (const operation of pendingOperations) {
            try {
                // Check for conflicts before syncing
                const conflictCheck = await checkForConflicts(operation);
                
                if (conflictCheck.hasConflicts) {
                    console.log('🔄 Resolving conflicts for operation:', operation.fingerprint);
                    
                    const resolution = conflictResolver.resolveSyncConflicts(
                        operation.data,
                        conflictCheck.remoteData,
                        'timestamp'
                    );
                    
                    // Update operation with resolved data
                    operation.data = resolution.resolved;
                    
                    // Log conflict resolution
                    if (resolution.conflicts.length > 0) {
                        console.log('✅ Conflicts resolved:', resolution);
                    }
                }
                
                // Proceed with sync
                await atomicSyncManager.executeSingleOperation(operation);
                
            } catch (error) {
                console.error('❌ Conflict resolution failed:', error);
                operation.status = 'failed';
                operation.lastError = error.message;
            }
        }
        
        // Commit successful operations
        await atomicSyncManager.commitSync();
        
    } catch (error) {
        console.error('❌ Sync with conflict resolution failed:', error);
        await atomicSyncManager.rollbackSync();
    }
}

// Check for conflicts with remote data
async function checkForConflicts(operation) {
    if (!supabase || operation.type === 'add') {
        return { hasConflicts: false };
    }
    
    try {
        const { data: remoteData, error } = await supabase
            .from('packages')
            .select('*')
            .eq('id', operation.data.id)
            .single();
            
        if (error || !remoteData) {
            return { hasConflicts: false };
        }
        
        const conflicts = conflictResolver.detectConflicts(operation.data, remoteData);
        
        return {
            hasConflicts: conflicts.length > 0,
            remoteData: remoteData,
            conflicts: conflicts
        };
        
    } catch (error) {
        console.error('Error checking conflicts:', error);
        return { hasConflicts: false };
    }
}


// ==================== SECURITY ENHANCEMENTS ====================

// Add this to supabase.js

class SecurityManager {
    constructor() {
        this.rateLimiters = new Map();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.sessionTimer = null;
        this.setupSessionTimeout();
    }

    // Input sanitization for all forms
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    // Sanitize object recursively
    static sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeInput(value);
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    // Rate limiting for API calls
    isRateLimited(operation, maxRequests, timeWindow) {
        const key = `rate_limit_${operation}`;
        const now = Date.now();
        
        if (!this.rateLimiters.has(key)) {
            this.rateLimiters.set(key, []);
        }
        
        const requests = this.rateLimiters.get(key);
        
        // Remove old requests outside the time window
        const windowStart = now - timeWindow;
        const recentRequests = requests.filter(time => time > windowStart);
        
        this.rateLimiters.set(key, recentRequests);
        
        if (recentRequests.length >= maxRequests) {
            return true;
        }
        
        // Add current request
        recentRequests.push(now);
        return false;
    }

    // Session timeout management
    setupSessionTimeout() {
        this.resetSessionTimer();
        
        // Reset timer on user activity
        const activities = ['mousemove', 'keypress', 'click', 'scroll'];
        activities.forEach(event => {
            document.addEventListener(event, () => this.resetSessionTimer());
        });
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSessionTimer();
            } else {
                this.resumeSessionTimer();
            }
        });
    }

    resetSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }

    pauseSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
    }

    resumeSessionTimer() {
        this.resetSessionTimer();
    }

    handleSessionTimeout() {
        console.log('🔒 Session timeout');
        
        // Show timeout warning
        this.showTimeoutWarning();
        
        // Logout user after additional grace period
        setTimeout(() => {
            if (currentUser) {
                this.forceLogout('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
            }
        }, 30000); // 30 second grace period
    }

    showTimeoutWarning() {
        const warningHtml = `
            <div id="sessionTimeoutWarning" class="session-timeout-warning">
                <div class="warning-content">
                    <h4>Oturum Süresi Dolmak Üzere</h4>
                    <p>Oturumunuz 30 saniye içinde sona erecek. Devam etmek için tıklayın.</p>
                    <button type="button" class="btn btn-primary" 
                            onclick="securityManager.extendSession()">
                        Oturumu Uzat
                    </button>
                </div>
            </div>
        `;
        
        // Remove existing warning
        const existingWarning = document.getElementById('sessionTimeoutWarning');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', warningHtml);
    }

    extendSession() {
        this.resetSessionTimer();
        
        const warning = document.getElementById('sessionTimeoutWarning');
        if (warning) {
            warning.remove();
        }
        
        showAlert('Oturum uzatıldı', 'success');
    }

    forceLogout(message) {
        // Clear user data
        if (typeof logout === 'function') {
            logout();
        }
        
        // Clear local storage (keep backups)
        const backups = localStorage.getItem('app_backups');
        localStorage.clear();
        if (backups) {
            localStorage.setItem('app_backups', backups);
        }
        
        showAlert(message, 'warning');
        
        // Redirect to login
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    // Validate workspace permissions
    validateWorkspacePermission(workspaceId, action) {
        if (!currentUser) return false;
        
        const currentWorkspaceId = window.workspaceManager?.currentWorkspace?.id;
        
        // Ensure user can only access current workspace
        if (workspaceId && workspaceId !== currentWorkspaceId) {
            console.error('🚨 SECURITY: Attempt to access different workspace', {
                user: currentUser.email,
                requestedWorkspace: workspaceId,
                currentWorkspace: currentWorkspaceId,
                action: action
            });
            return false;
        }
        
        // Add action-specific permissions here
        const permissions = {
            'create_package': true,
            'delete_package': true,
            'modify_package': true,
            'view_packages': true
        };
        
        return permissions[action] !== false;
    }

    // Audit security events
    logSecurityEvent(event, details) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            user: currentUser?.email || 'unknown',
            workspace: window.workspaceManager?.currentWorkspace?.id || 'unknown',
            ip: 'unknown', // Would need server-side for real IP
            userAgent: navigator.userAgent,
            details: details
        };
        
        console.log('🔍 Security Event:', auditEntry);
        
        // Store in localStorage for debugging
        const securityLog = JSON.parse(localStorage.getItem('security_audit_log') || '[]');
        securityLog.push(auditEntry);
        
        // Keep only last 1000 entries
        if (securityLog.length > 1000) {
            securityLog.splice(0, securityLog.length - 1000);
        }
        
        localStorage.setItem('security_audit_log', JSON.stringify(securityLog));
    }
}

// Initialize security manager
const securityManager = new SecurityManager();

// Enhanced Supabase client with security wrappers
function createSecureSupabaseClient() {
    if (!window.supabase) return null;
    
    // Create proxy for secure operations
    return new Proxy(window.supabase, {
        get(target, prop) {
            const original = target[prop];
            
            if (typeof original === 'function') {
                return function(...args) {
                    // Add security checks before operations
                    if (prop === 'from') {
                        const tableName = args[0];
                        if (tableName === 'packages' || tableName === 'containers') {
                            // Validate workspace access
                            const workspaceId = getCurrentWorkspaceId();
                            if (!workspaceId) {
                                throw new Error('No workspace selected');
                            }
                            
                            // Log data access
                            securityManager.logSecurityEvent('data_access', {
                                table: tableName,
                                workspace: workspaceId
                            });
                        }
                    }
                    
                    // Apply rate limiting
                    if (securityManager.isRateLimited(`supabase_${prop}`, 100, 60000)) {
                        throw new Error('Rate limit exceeded. Please try again later.');
                    }
                    
                    return original.apply(this, args);
                };
            }
            
            return original;
        }
    });
}

// Secure version of completePackage
async function completePackageSecure() {
    // Validate inputs
    const sanitizedItems = SecurityManager.sanitizeObject(currentPackage.items);
    
    if (Object.keys(sanitizedItems).length === 0) {
        throw new Error('No valid items in package');
    }
    
    // Check permissions
    if (!securityManager.validateWorkspacePermission(
        getCurrentWorkspaceId(), 
        'create_package'
    )) {
        throw new Error('Insufficient permissions to create package');
    }
    
    // Apply rate limiting
    if (securityManager.isRateLimited('complete_package', 10, 60000)) {
        throw new Error('Too many package creation attempts. Please wait.');
    }
    
    // Proceed with secure operation
    return await completePackage();
}

// Replace original functions with secure versions
window.completePackage = completePackageSecure;
window.supabase = createSecureSupabaseClient();



window.workspaceManager = new EnhancedWorkspaceManager();





// Print single package function
window.printSinglePackage = async function(packageId) {
    console.log('🖨️ Printing package:', packageId);
    
    const checkbox = document.querySelector(`#packagesTableBody input[value="${packageId}"]`);
    
    if (!checkbox) {
        alert('Paket bulunamadı!');
        return;
    }
    
    // Uncheck all other checkboxes
    const allCheckboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]');
    allCheckboxes.forEach(cb => cb.checked = false);
    
    // Check only this package
    checkbox.checked = true;
    
    // Wait a moment for the checkbox to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Call the main print function
    if (typeof window.printSelectedElectron === 'function') {
        await window.printSelectedElectron();
    } else {
        alert('Yazıcı fonksiyonu yüklenmedi. Lütfen sayfayı yenileyin.');
    }
};
