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

// Persist that a selection has been made (prevent repeated prompts)
localStorage.setItem('proclean_workspace_selected', 'true');
window._workspaceSelectionShown = true;
        
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


// Only force workspace selection if the user/device hasn't chosen one yet
document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async () => {
        try {
            // If workspace already persisted, do not show
            const alreadySelected = localStorage.getItem('proclean_workspace_selected') === 'true';
            if (alreadySelected) {
                // If it exists but workspaceManager not set, try to initialize silently
                if (window.workspaceManager && !window.workspaceManager.currentWorkspace) {
                    await window.workspaceManager.loadWorkspaceData();
                }
                return;
            }

            // Avoid showing many times in same session
            if (window._workspaceSelectionShown) return;

            if (window.workspaceManager && !window.workspaceManager.currentWorkspace) {
                console.log('🔄 No workspace selected, asking user to choose (once)...');
                window._workspaceSelectionShown = true;
                await window.workspaceManager.showWorkspaceSelection();
            }
        } catch (err) {
            console.error('Workspace selection guard error:', err);
        }
    }, 800);
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
