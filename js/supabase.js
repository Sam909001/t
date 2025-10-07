/// Supabase initialization - Varsayılan değerler
const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
// Prefer stored key in localStorage for deployments where you set it once:
let SUPABASE_ANON_KEY = localStorage.getItem('procleanApiKey') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWhuaWdjYm9zZ3N4Z2VoZ25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Mzg3MzgsImV4cCI6MjA3MzExNDczOH0.iZX8Z5mUjHc_LZpmH5EtFe0C7k4A_1zX8UoM7iDs5FM';
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

// COMPLETE FIXED populateShippingTable function
// Replace the existing one in supabase (36).js (around line 950-1100)

async function populateShippingTable(page = 0) {
    if (isShippingTableLoading) {
        console.log('Shipping table already loading, skipping...');
        return;
    }

    isShippingTableLoading = true;

    try {
        console.log('📦 Populating shipping table...');

        const shippingFolders = document.getElementById('shippingFolders');
        if (!shippingFolders) {
            console.error('shippingFolders element not found!');
            return;
        }

        // Show loading state
        shippingFolders.innerHTML = '<div style="text-align:center; padding:40px; color:#666; font-size:16px;">Sevkiyat verileri yükleniyor...</div>';

        let containers = [];
        let packagesData = [];

        // ALWAYS TRY SUPABASE FIRST
        if (supabase) {
            console.log('🔄 Fetching containers from Supabase...');
            
            try {
                const { data: supabaseContainers, error } = await supabase
                    .from('containers')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('❌ Supabase containers error:', error);
                    showAlert('Konteyner verileri yüklenemedi: ' + error.message, 'error');
                    throw error;
                }

                containers = supabaseContainers || [];
                console.log(`✅ Loaded ${containers.length} containers from Supabase`);

                // Get packages for these containers
                if (containers.length > 0) {
                    const containerIds = containers.map(c => c.id);
                    const { data: supabasePackages, error: pkgError } = await supabase
                        .from('packages')
                        .select('*, customers(name)')
                        .in('container_id', containerIds);
                    
                    if (pkgError) {
                        console.error('❌ Packages fetch error:', pkgError);
                    } else {
                        packagesData = supabasePackages || [];
                        console.log(`✅ Loaded ${packagesData.length} packages for containers`);
                    }
                }

            } catch (supabaseError) {
                console.error('❌ Supabase shipping data error:', supabaseError);
                containers = [];
            }
        } else {
            console.warn('⚠️ Supabase not available');
            showAlert('Veritabanı bağlantısı yok', 'warning');
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
            folderDiv.style.cssText = 'margin-bottom: 20px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.style.cssText = 'padding: 15px; background: var(--light); cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
            
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
            folderContent.style.cssText = 'padding: 0; display: none;';

            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';
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




 // Konteyner detaylarını görüntüle
        async function viewContainerDetails(containerId) {
            try {
                const { data: container, error } = await supabase
                    .from('containers')
                    .select(`
                        *,
                        packages (
                            *,
                            customers (name, code)
                        )
                    `)
                    .eq('id', containerId)
                    .single();

                if (error) throw error;
                
                currentContainerDetails = container;
                
                const modalTitle = document.getElementById('containerDetailTitle');
                const modalContent = document.getElementById('containerDetailContent');
                
                modalTitle.textContent = `Konteyner: ${container.container_no}`;
                
                let contentHTML = `
                    <p><strong>Durum:</strong> <span class="container-status status-${container.status}">${container.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></p>
                    <p><strong>Oluşturulma Tarihi:</strong> ${new Date(container.created_at).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Paket Sayısı:</strong> ${container.package_count || 0}</p>
                    <p><strong>Toplam Adet:</strong> ${container.total_quantity || 0}</p>
                `;
                
                if (container.packages && container.packages.length > 0) {
                    contentHTML += `
                        <h4>Paketler</h4>
                        <table class="package-table">
                            <thead>
                                <tr>
                                    <th>Paket No</th>
                                    <th>Müşteri</th>
                                    <th>Adet</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${container.packages.map(pkg => `
                                    <tr>
                                        <td>${pkg.package_no}</td>
                                        <td>${pkg.customers?.name || 'N/A'}</td>
                                        <td>${pkg.total_quantity}</td>
                                        <td><span class="status-${pkg.status}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
                
                modalContent.innerHTML = contentHTML;
                document.getElementById('containerDetailModal').style.display = 'flex';
                
            } catch (error) {
                console.error('Error loading container details:', error);
                showAlert('Konteyner detayları yüklenirken hata oluştu', 'error');
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

// Keeps track of live RFID scans
const scannedRFIDTags = new Map(); // tag_id => {code, name, customer, step, time}

async function populateStockTable() {
    if (isStockTableLoading) return;

    const now = Date.now();
    if (now - lastStockFetchTime < 500) {
        setTimeout(populateStockTable, 500);
        return;
    }

    isStockTableLoading = true;
    lastStockFetchTime = now;

    try {
        // Clear table
        elements.stockTableBody.innerHTML = '';

        // Fetch stock items
        const { data: stockItems, error } = await supabase
            .from('stock_items')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading stock items:', error);
            showAlert('Stok verileri yüklenemedi', 'error');
            return;
        }

        // Deduplicate stock by code
        const uniqueStockItems = [];
        const seenStockCodes = new Set();

        if (stockItems && stockItems.length > 0) {
            stockItems.forEach(item => {
                if (!seenStockCodes.has(item.code)) {
                    seenStockCodes.add(item.code);
                    uniqueStockItems.push(item);

                    const row = document.createElement('tr');

                    // Determine stock status
                    let statusClass = 'status-stokta';
                    let statusText = 'Stokta';
                    if (item.quantity <= 0) { statusClass = 'status-kritik'; statusText = 'Kritik'; }
                    else if (item.quantity < 10) { statusClass = 'status-az-stok'; statusText = 'Az Stok'; }

                    // Check if RFID tag exists for this item
                    let rfidTag = '';
                    let customer = '';
                    let step = '';
                    let time = '';
                    scannedRFIDTags.forEach(scan => {
                        if (scan.code === item.code) {
                            rfidTag = scan.tag_id;
                            customer = scan.customer;
                            step = scan.step;
                            time = new Date(scan.time).toLocaleTimeString('tr-TR');
                        }
                    });

                    row.innerHTML = `
                        <td>${rfidTag || '-'}</td>
                        <td>${item.code}</td>
                        <td>${item.name}</td>
                        <td>${customer || '-'}</td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                        <td>${step || '-'}</td>
                        <td>${time || '-'}</td>
                        <td>
                            <button onclick="editStockItem(this, '${item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                            <div class="edit-buttons" style="display:none;">
                                <button onclick="saveStockItem('${item.code}')" class="btn btn-success btn-sm">Kaydet</button>
                                <button onclick="cancelEditStockItem('${item.code}', ${item.quantity})" class="btn btn-secondary btn-sm">İptal</button>
                            </div>
                        </td>
                    `;
                    elements.stockTableBody.appendChild(row);
                }
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align:center; color:#666;">Stok verisi yok</td>';
            elements.stockTableBody.appendChild(row);
        }

    } catch (error) {
        console.error('Error in populateStockTable:', error);
        showAlert('Stok tablosu yükleme hatası', 'error');
    } finally {
        isStockTableLoading = false;
    }
}

// Debounced call
let stockTableTimeout;
function debouncedPopulateStockTable() {
    clearTimeout(stockTableTimeout);
    stockTableTimeout = setTimeout(populateStockTable, 300);
}

// Call this when a new RFID tag is scanned
function onRFIDScan(tag_id, code, customer, step) {
    scannedRFIDTags.set(tag_id, {
        tag_id,
        code,
        customer,
        step,
        time: Date.now()
    });
    debouncedPopulateStockTable();
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

// Get or initialize counter for this workspace
let packageCounter = parseInt(localStorage.getItem(`pkg_counter_${workspaceId}`) || '0');
packageCounter++;
localStorage.setItem(`pkg_counter_${workspaceId}`, packageCounter.toString());

const timestamp = Date.now();
const random = Math.random().toString(36).substr(2, 9);

const packageId = `pkg-${workspaceId}-${timestamp}-${random}`;
const packageNo = `PKG-${workspaceId}-${packageCounter.toString().padStart(6, '0')}`;
        
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
