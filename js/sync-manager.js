// ==================== SYNC QUEUE MANAGEMENT ====================

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

// Main sync function
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

// Backup restoration function
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

// Sync triggers setup
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

// Better queue structure
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


// ==================== ATOMIC SYNC QUEUE SYSTEM ====================

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
