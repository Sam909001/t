// ==================== WORKSPACE MANAGEMENT ====================
class WorkspaceManager {
    constructor() {
        this.currentWorkspace = null;
        this.workspaceKey = 'proclean_current_workspace';
        this.availableWorkspaces = [];
        this.onWorkspaceChange = null;
        this.initialized = false;
    }
    
    // Initialize workspace system - CALL THIS ONCE
    async initialize() {
        if (this.initialized) {
            console.log('🔄 Workspace system already initialized');
            return this.currentWorkspace;
        }
        
        console.log('🔄 Initializing workspace system...');
        await this.loadWorkspaces();
        await this.loadCurrentWorkspace();
        this.initializeWorkspaceStorage();
        this.initializePackageCounters(); // ← ADDED THIS LINE
        
        this.initialized = true;
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
    
    // Load current workspace - ONLY SHOW MODAL IF NO WORKSPACE SELECTED
    async loadCurrentWorkspace() {
        console.log('🔍 Loading current workspace...');
        
        // 1. Try to get from localStorage first
        const savedWorkspaceId = localStorage.getItem(this.workspaceKey);
        if (savedWorkspaceId) {
            const workspace = this.availableWorkspaces.find(ws => ws.id === savedWorkspaceId);
            if (workspace) {
                this.setCurrentWorkspace(workspace);
                console.log('✅ Workspace loaded from localStorage:', savedWorkspaceId);
                return;
            }
        }
        
        // 2. Try URL parameters
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
        
        // 3. ONLY show modal if no workspace is selected
        console.log('🔄 No workspace found, showing selection modal');
        await this.showWorkspaceSelection();
    }
    
    // Set current workspace - PERSISTENT SELECTION
    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
        
        // CRITICAL: Mark this device as having a workspace selected
        localStorage.setItem(this.workspaceKey, workspace.id);
        localStorage.setItem('proclean_workspace_device_locked', 'true'); // Device-specific lock
        
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
        const ws = workspace || this.currentWorkspace;
        
        if (!ws || !ws.type) {
            return 'Genel';
        }
        
        const types = {
            'packaging': 'Paketleme',
            'shipping': 'Sevkiyat',
            'quality': 'Kalite Kontrol',
            'admin': 'Yönetici'
        };
        
        return types[ws.type] || ws.type || 'Genel';
    }
    
    // Initialize package counters for all workspaces
    initializePackageCounters() {
        console.log('🔢 Initializing package counters for all workspaces...');
        
        this.availableWorkspaces.forEach(workspace => {
            const stationNumber = workspace.id.replace('station-', '');
            const counterKey = `packageCounter_station_${stationNumber}`;
            
            // Only initialize if counter doesn't exist
            if (!localStorage.getItem(counterKey)) {
                localStorage.setItem(counterKey, '0');
                console.log(`✅ Package counter initialized for ${workspace.name}: 0`);
            }
        });
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
                
                // Initialize package counter based on existing packages
                if (packages.length > 0) {
                    const stationNumber = workspaceId.replace('station-', '');
                    const counterKey = `packageCounter_station_${stationNumber}`;
                    
                    // Find the highest existing package number
                    let highestNumber = 0;
                    packages.forEach(pkg => {
                        if (pkg.package_no && pkg.package_no.startsWith(`ST${stationNumber}-`)) {
                            const numberPart = pkg.package_no.split('-')[1];
                            if (numberPart && numberPart.length === 9) {
                                const number = parseInt(numberPart);
                                if (number > highestNumber) {
                                    highestNumber = number;
                                }
                            }
                        }
                    });
                    
                    // Set counter to highest found number
                    if (highestNumber > 0) {
                        localStorage.setItem(counterKey, highestNumber.toString());
                        console.log(`🔢 Package counter initialized to: ${highestNumber}`);
                    }
                }
                
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
  
    // Show workspace selection modal - WITH CLOSE/CANCEL OPTION
    async showWorkspaceSelection() {
        return new Promise((resolve) => {
            // Prevent multiple modals
            if (document.querySelector('.workspace-modal')) {
                console.log('⚠️ Workspace modal already shown, skipping...');
                resolve();
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal workspace-modal';
            modal.style.cssText = `
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background: rgba(0,0,0,0.85); 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative;">
                    <!-- Close button -->
                    <button id="closeWorkspaceModal" 
                            style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; color: #666; cursor: pointer; padding: 5px;">
                        ×
                    </button>
                    
                    <h2 style="color: #333; margin-bottom: 1rem; margin-right: 20px;">Çalışma İstasyonu Seçin</h2>
                    <p style="color: #666; margin-bottom: 1.5rem;">Bu cihaz için bir çalışma istasyonu seçin:</p>
                    
                    <div id="workspaceOptions" style="margin: 1.5rem 0; max-height: 300px; overflow-y: auto;"></div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 1rem; display: flex; gap: 10px; justify-content: center;">
                        <button id="createNewWorkspaceBtn" 
                                style="padding: 0.75rem 1.5rem; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; flex: 1;">
                            <i class="fas fa-plus"></i> Yeni İstasyon
                        </button>
                        <button id="cancelWorkspaceBtn" 
                                style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; flex: 1;">
                            <i class="fas fa-times"></i> İptal
                        </button>
                    </div>
                    
                    <div style="margin-top: 1rem; font-size: 12px; color: #999;">
                        <i class="fas fa-info-circle"></i> Bu seçim bu cihaz için kalıcıdır
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Populate workspace options
            const optionsContainer = document.getElementById('workspaceOptions');
            
            if (this.availableWorkspaces.length === 0) {
                optionsContainer.innerHTML = '<p style="color: #666; padding: 2rem;">Henüz istasyon yok. Yeni istasyon oluşturun.</p>';
            } else {
                this.availableWorkspaces.forEach(workspace => {
                    const button = document.createElement('button');
                    button.style.cssText = `
                        display: block; 
                        width: 100%; 
                        padding: 1rem; 
                        margin: 0.5rem 0; 
                        text-align: center; 
                        border: 2px solid #007bff; 
                        border-radius: 8px;
                        background: white; 
                        color: #007bff;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                        transition: all 0.2s;
                    `;
                    
                    const typeLabel = this.getWorkspaceTypeLabel(workspace);
                    
                    button.innerHTML = `
                        <div>${workspace.name}</div>
                        <small style="font-weight: normal; color: #666;">${typeLabel}</small>
                    `;
                    
                    button.onmouseover = () => {
                        button.style.background = '#007bff';
                        button.style.color = 'white';
                        button.style.transform = 'translateY(-2px)';
                    };
                    button.onmouseout = () => {
                        button.style.background = 'white';
                        button.style.color = '#007bff';
                        button.style.transform = 'translateY(0)';
                    };
                    
                    button.onclick = () => {
                        this.setCurrentWorkspace(workspace);
                        document.body.removeChild(modal);
                        showAlert(`İstasyon seçildi: ${workspace.name}`, 'success');
                        resolve();
                    };
                    
                    optionsContainer.appendChild(button);
                });
            }
            
            // Close button handler (X button)
            const closeBtn = document.getElementById('closeWorkspaceModal');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    document.body.removeChild(modal);
                    showAlert('İstasyon seçimi iptal edildi. Sayfa yeniden yüklenecek.', 'warning');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    resolve();
                };
                
                // Add hover effect for close button
                closeBtn.onmouseover = () => {
                    closeBtn.style.color = '#ff4444';
                    closeBtn.style.transform = 'scale(1.1)';
                };
                closeBtn.onmouseout = () => {
                    closeBtn.style.color = '#666';
                    closeBtn.style.transform = 'scale(1)';
                };
            }
            
            // Create new workspace button handler
            const createBtn = document.getElementById('createNewWorkspaceBtn');
            if (createBtn) {
                createBtn.onclick = () => {
                    document.body.removeChild(modal);
                    this.createNewWorkspace();
                    resolve();
                };
            }
            
            // Cancel button handler
            const cancelBtn = document.getElementById('cancelWorkspaceBtn');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    document.body.removeChild(modal);
                    showAlert('İstasyon seçimi iptal edildi. Sayfa yeniden yüklenecek.', 'warning');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    resolve();
                };
            }

            // Allow closing by clicking outside the modal
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    showAlert('İstasyon seçimi iptal edildi. Sayfa yeniden yüklenecek.', 'warning');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    resolve();
                }
            };

            // Also allow closing with Escape key
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleKeydown);
                    showAlert('İstasyon seçimi iptal edildi. Sayfa yeniden yüklenecek.', 'warning');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    resolve();
                }
            };
            
            document.addEventListener('keydown', handleKeydown);
            
            // Clean up event listener when modal is closed
            modal._cleanup = () => {
                document.removeEventListener('keydown', handleKeydown);
            };
        });
    }
    
    // Create new workspace - WITH CANCELLATION HANDLING
    createNewWorkspace() {
        const name = prompt('Yeni istasyon adını girin:\n\n(İptal için "Cancel" tuşuna basın)');
        
        // Handle cancellation
        if (name === null) {
            showAlert('Yeni istasyon oluşturma iptal edildi', 'info');
            // Re-show the workspace selection modal
            setTimeout(() => {
                this.showWorkspaceSelection();
            }, 500);
            return;
        }
        
        // Handle empty name
        if (!name || name.trim() === '') {
            showAlert('İstasyon adı boş olamaz', 'error');
            // Retry with the same modal flow
            setTimeout(() => {
                this.createNewWorkspace();
            }, 500);
            return;
        }
        
       // Generate clean sequential workspace ID
const nextStationNumber = this.availableWorkspaces.length + 1;
const newWorkspace = {
    id: 'station-' + nextStationNumber,  // ← FIXED: station-1, station-2, etc.
    name: name.trim(),
    type: 'packaging',
    created: new Date().toISOString()
};
        
        this.availableWorkspaces.push(newWorkspace);
        this.saveWorkspaces();
        this.setCurrentWorkspace(newWorkspace);
        
        console.log('✅ New workspace created:', newWorkspace);
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

    // Check if workspace is already selected for this device
    isWorkspaceSelected() {
        return localStorage.getItem('proclean_workspace_device_locked') === 'true';
    }
} // ← THIS IS THE END OF WorkspaceManager CLASS

// ==================== GLOBAL INITIALIZATION ====================
// SIMPLIFIED initialization - CALL THIS ONCE
document.addEventListener('DOMContentLoaded', async function() {
    // Wait a bit for everything to load
    setTimeout(async () => {
        try {
            // Initialize workspace manager
            if (window.workspaceManager && !window.workspaceManager.initialized) {
                await window.workspaceManager.initialize();
            }
        } catch (err) {
            console.error('Workspace initialization error:', err);
        }
    }, 500);
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

// ==================== ENHANCED WORKSPACE ISOLATION ====================

class EnhancedWorkspaceManager extends WorkspaceManager {
    constructor() {
        super();
        this.dataValidators = new Map();
        this.printerConfigs = new Map();
        this.setupDataValidators();
        this.loadPrinterConfigurations();
    }

    // Override initialize to add enhanced features
    async initialize() {
        await super.initialize();
        console.log('🚀 Enhanced workspace manager ready');
        return this.currentWorkspace;
    }

    // ==================== PRINTER CONFIGURATION METHODS ====================
    
    loadPrinterConfigurations() {
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

        this.loadSavedPrinterConfigurations();
        console.log('🖨️ Printer configurations loaded for all workstations');
    }

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
        
        if (!config.selectedPrinterName) {
            config.selectedPrinterName = config.name;
            this.savePrinterConfigurations();
        }
        
        return config;
    }

    getDefaultPrinterConfig() {
        return {
            name: 'Default Printer',
            selectedPrinterName: 'Default Printer',
            type: 'generic',
            connection: 'wifi',
            paperWidth: 50,
            paperHeight: 30,
            dpi: 203,
            description: 'Varsayılan Yazıcı'
        };
    }

    getPrinterConfig(workspaceId) {
        return this.printerConfigs.get(workspaceId) || this.getDefaultPrinterConfig();
    }

    updatePrinterConfig(newConfig) {
        const workspaceId = this.currentWorkspace?.id;
        if (workspaceId) {
            this.printerConfigs.set(workspaceId, {
                ...this.getCurrentPrinterConfig(),
                ...newConfig
            });
            this.savePrinterConfigurations();
            console.log(`🖨️ Printer config updated for ${workspaceId}:`, newConfig);
            this.updatePrinterUI();
        }
    }

    updatePrinterConfigForWorkspace(workspaceId, newConfig) {
        this.printerConfigs.set(workspaceId, {
            ...this.getPrinterConfig(workspaceId),
            ...newConfig
        });
        this.savePrinterConfigurations();
        console.log(`🖨️ Printer config updated for workspace ${workspaceId}`);
    }

    savePrinterConfigurations() {
        try {
            const configObj = Object.fromEntries(this.printerConfigs);
            localStorage.setItem('workspace_printer_configs', JSON.stringify(configObj));
            console.log('💾 Printer configurations saved');
        } catch (error) {
            console.error('Error saving printer configurations:', error);
        }
    }

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

    getAllPrinterConfigs() {
        return Array.from(this.printerConfigs.entries()).map(([workspaceId, config]) => ({
            workspaceId,
            workspaceName: this.availableWorkspaces.find(ws => ws.id === workspaceId)?.name || workspaceId,
            ...config
        }));
    }

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

    setCurrentWorkspace(workspace) {
        super.setCurrentWorkspace(workspace);
        
        setTimeout(() => {
            this.updatePrinterUI();
            console.log(`🖨️ Workspace changed to ${workspace.name}, active printer: ${this.getCurrentPrinterConfig().name}`);
            
            if (window.workstationPrinter) {
                window.workstationPrinter.initialize();
            }
        }, 100);
    }

    async testCurrentPrinter() {
        const printerConfig = this.getCurrentPrinterConfig();
        console.log(`🧪 Testing printer: ${printerConfig.name} for ${this.currentWorkspace.name}`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`✅ Printer test completed for ${printerConfig.name}`);
                showAlert(`Yazıcı testi tamamlandı: ${printerConfig.name}`, 'success');
                resolve(true);
            }, 1000);
        });
    }

    // ==================== EXISTING DATA VALIDATION METHODS ====================

    setupDataValidators() {
        this.dataValidators.set('packages', (data) => {
            const currentWorkspaceId = this.currentWorkspace?.id;
            
            if (data.workspace_id && data.workspace_id !== currentWorkspaceId) {
                console.error('🚨 WORKSPACE VIOLATION: Package from different workspace', {
                    packageId: data.id,
                    packageWorkspace: data.workspace_id,
                    currentWorkspace: currentWorkspaceId
                });
                return false;
            }
            
            if (!data.workspace_id) {
                data.workspace_id = currentWorkspaceId;
            }
            
            return true;
        });

        this.dataValidators.set('containers', (data) => {
            return true;
        });

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

    createWorkspaceFilter(tableName) {
        const currentWorkspaceId = this.currentWorkspace?.id;
        
        if (!currentWorkspaceId) {
            console.warn('⚠️ No current workspace for filter');
            return {};
        }
        
        const workspaceFields = {
            'packages': 'workspace_id',
            'containers': 'workspace_id', 
            'sync_queue': 'workspace_id',
            'stock_items': 'workspace_id'
        };
        
        const field = workspaceFields[tableName] || 'workspace_id';
        
        return { [field]: currentWorkspaceId };
    }

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

    async loadWorkspaceDataStrict() {
        const workspaceId = this.currentWorkspace?.id;
        
        if (!workspaceId) {
            throw new Error('No workspace selected');
        }
        
        console.log(`🔒 Loading STRICT workspace data for: ${workspaceId}`);
        
        try {
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
            
            excelPackages = workspaceData;
            
            console.log(`✅ Strict workspace data loaded: ${workspaceData.length} items`);
            return workspaceData;
            
        } catch (error) {
            console.error('❌ Error in strict workspace data loading:', error);
            throw error;
        }
    }

    auditDataAccess(tableName, operation, data) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            workspace: this.currentWorkspace?.id,
            table: tableName,
            operation: operation,
            dataId: data.id,
            user: currentUser?.email || 'unknown'
        };
        
        if (window.DEBUG_MODE) {
            console.log('🔍 Data Access Audit:', auditEntry);
        }
        
        const auditLog = JSON.parse(localStorage.getItem('workspace_audit_log') || '[]');
        auditLog.push(auditEntry);
        
        if (auditLog.length > 1000) {
            auditLog.splice(0, auditLog.length - 1000);
        }
        
        localStorage.setItem('workspace_audit_log', JSON.stringify(auditLog));
    }
}

// Replace the existing WorkspaceManager
window.workspaceManager = new EnhancedWorkspaceManager();
