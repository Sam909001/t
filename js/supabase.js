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

const shippedPackageIds = new Set();

// ==================== MISSING FUNCTIONS - ADDED ====================

function getStrictWorkspaceFilter(table) {
    const workspaceId = getCurrentWorkspaceId();
    return `${table}.workspace_id.eq.${workspaceId}`;
}

function validateWorkspaceAccessStrict(data) {
    const currentWorkspace = getCurrentWorkspaceId();
    return data.workspace_id === currentWorkspace;
}

function updateStorageIndicator() {
    const indicator = document.getElementById('storageIndicator');
    if (indicator) {
        indicator.textContent = isUsingExcel ? '📁 Excel' : '☁️ Supabase';
        indicator.title = isUsingExcel ? 'Çevrimdışı Mod - Excel' : 'Çevrimiçi Mod - Supabase';
    }
}

function isValidUUID(id) {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

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
        
        // STRICT workspace filtering - ONLY PENDING packages
        const workspacePackages = excelPackagesList.filter(pkg => {
            const isValidWorkspace = pkg.workspace_id === workspaceId;
            const isWaiting = pkg.status === 'beklemede';
            const hasNoContainer = !pkg.container_id || pkg.container_id === null;
            const notShipped = !shippedPackageIds.has(pkg.id); // ✅ NEW: Check if already shipped
            
            if (!isValidWorkspace) {
                console.warn('🔒 STRICT: Filtered package from different workspace:', {
                    packageId: pkg.id,
                    packageWorkspace: pkg.workspace_id,
                    currentWorkspace: workspaceId
                });
                return false;
            }
            
            if (!notShipped) {
                console.log('🚫 Blocking already shipped package from pending:', pkg.id);
                return false;
            }
            
            return isWaiting && hasNoContainer;
        });
        
        console.log(`✅ STRICT: Loaded from ${getCurrentWorkspaceName()} Excel:`, workspacePackages.length, 'packages');
        window.packages = workspacePackages;
        
        // Load from Supabase with STRICT workspace filtering
        if (supabase && navigator.onLine) {
            try {
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')  // Only truly pending packages
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false });
                
                if (!error && supabasePackages && supabasePackages.length > 0) {
                    console.log(`✅ STRICT: Loaded from Supabase:`, supabasePackages.length, 'packages');
                    
                    // ✅ Filter out already shipped packages
                    const validSupabasePackages = supabasePackages.filter(pkg => 
                        validateWorkspaceAccessStrict(pkg) && !shippedPackageIds.has(pkg.id)
                    );
                    
                    const mergedPackages = mergePackagesStrict(workspacePackages, validSupabasePackages);
                    window.packages = mergedPackages;
                    
                    const excelData = ExcelJS.toExcelFormat(mergedPackages);
                    await ExcelJS.writeFile(excelData);
                }
                
                // Load shipped packages for shipping tab
                const { data: shippedPackages } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .eq('status', 'sevk-edildi')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false });

                if (shippedPackages) {
                    console.log(`✅ Loaded shipped packages:`, shippedPackages.length);
                    window.shippedPackages = shippedPackages;
                    
                    // ✅ Track all shipped package IDs
                    shippedPackages.forEach(pkg => shippedPackageIds.add(pkg.id));
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

// ==================== GUARANTEED UNIQUE PACKAGE ID SYSTEM ====================

// Track all created package IDs globally
const createdPackageIds = new Set();

// SIMPLEST FIX: Use browser's built-in UUID generator
function generateUniquePackageUUID() {
    let attempts = 0;
    let uuid;
    
    do {
        // Use modern browser's built-in UUID generator (most reliable)
        if (crypto && crypto.randomUUID) {
            uuid = crypto.randomUUID();
        } else {
            // Fallback for older browsers
            uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        
        attempts++;
        
        if (attempts > 100) {
            // Last resort: timestamp-based UUID
            uuid = `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.warn('⚠️ Using fallback UUID generator');
            break;
        }
        
    } while (createdPackageIds.has(uuid));
    
    createdPackageIds.add(uuid);
    return uuid;
}

// Enhanced package number generator with timestamp + random
function generateUniquePackageNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    const sequential = (createdPackageIds.size + 1).toString().padStart(4, '0');
    
    return `PKG-${timestamp}-${random}-${sequential}`;
}

// Main function to create package with guaranteed uniqueness
async function createUniquePackage(packageData) {
    try {
        // Generate guaranteed unique identifiers
        const packageId = generateUniquePackageUUID();
        const packageNo = generateUniquePackageNumber();
        
        // Double-check uniqueness in Supabase
        if (supabase && navigator.onLine) {
            const { data: existingPackages } = await supabase
                .from('packages')
                .select('id, package_no')
                .or(`id.eq.${packageId},package_no.eq.${packageNo}`);
            
            if (existingPackages && existingPackages.length > 0) {
                console.warn('⚠️ Duplicate detected in database, regenerating...');
                return createUniquePackage(packageData); // Recursive retry
            }
        }
        
        // Check uniqueness in localStorage
        const localPackages = JSON.parse(localStorage.getItem('packages') || '[]');
        const localDuplicate = localPackages.find(p => 
            p.id === packageId || p.package_no === packageNo
        );
        
        if (localDuplicate) {
            console.warn('⚠️ Duplicate detected in localStorage, regenerating...');
            return createUniquePackage(packageData); // Recursive retry
        }
        
        // Create the unique package
        const uniquePackage = {
            ...packageData,
            id: packageId,
            package_no: packageNo,
            created_at: new Date().toISOString(),
            workspace_id: getCurrentWorkspaceId()
        };
        
        // Save to Supabase
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('packages')
                .insert([uniquePackage]);
            
            if (error) throw error;
        }
        
        // Save to localStorage
        localPackages.push(uniquePackage);
        localStorage.setItem('packages', JSON.stringify(localPackages));
        
        // Save to Excel
        if (window.packages) {
            window.packages.push(uniquePackage);
            await ExcelStorage.writeFile(window.packages);
        }
        
        console.log(`✅ Created unique package: ${packageNo} (ID: ${packageId})`);
        
        return uniquePackage;
        
    } catch (error) {
        console.error('Error creating unique package:', error);
        throw error;
    }
}

// Load existing package IDs on app start to prevent duplicates
async function loadExistingPackageIds() {
    try {
        // Load from Supabase
        if (supabase && navigator.onLine) {
            const { data } = await supabase
                .from('packages')
                .select('id, package_no');
            
            if (data) {
                data.forEach(pkg => {
                    createdPackageIds.add(pkg.id);
                });
            }
        }
        
        // Load from localStorage
        const localPackages = JSON.parse(localStorage.getItem('packages') || '[]');
        localPackages.forEach(pkg => {
            createdPackageIds.add(pkg.id);
        });
        
        console.log(`📦 Loaded ${createdPackageIds.size} existing package IDs`);
        
    } catch (error) {
        console.error('Error loading package IDs:', error);
    }
}

// Make globally available
window.generateUniquePackageUUID = generateUniquePackageUUID;
window.generateUniquePackageNumber = generateUniquePackageNumber;
window.createUniquePackage = createUniquePackage;
window.loadExistingPackageIds = loadExistingPackageIds;

// Replace all generateUUID calls with generateUniquePackageUUID
window.generateUUID = generateUniquePackageUUID;

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

// ==================== ENHANCED OFFLINE-TO-ONLINE SYNC ====================

// Track offline changes
let offlineChangesQueue = [];

// Save offline change to queue
function queueOfflineChange(type, data) {
    const change = {
        id: generateUUID(),
        type: type, // 'package', 'container', 'stock'
        action: data.action, // 'create', 'update', 'delete'
        data: data,
        timestamp: new Date().toISOString(),
        workspace_id: getCurrentWorkspaceId(),
        synced: false
    };
    
    offlineChangesQueue.push(change);
    localStorage.setItem('offline_sync_queue', JSON.stringify(offlineChangesQueue));
    
    console.log('📝 Queued offline change:', change);
}

// Load offline queue on startup
function loadOfflineQueue() {
    const saved = localStorage.getItem('offline_sync_queue');
    if (saved) {
        offlineChangesQueue = JSON.parse(saved);
        console.log(`📋 Loaded ${offlineChangesQueue.length} offline changes`);
    }
}

// Sync offline changes when online
async function syncOfflineChanges() {
    if (!navigator.onLine || !supabase) {
        console.log('⏸️ Cannot sync: offline or no Supabase');
        return;
    }
    
    if (offlineChangesQueue.length === 0) {
        console.log('✅ No offline changes to sync');
        return;
    }
    
    console.log(`🔄 Syncing ${offlineChangesQueue.length} offline changes...`);
    
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const change of offlineChangesQueue) {
        if (change.synced) continue;
        
        try {
            switch (change.type) {
                case 'package':
                    await syncOfflinePackage(change);
                    break;
                case 'container':
                    await syncOfflineContainer(change);
                    break;
                case 'stock':
                    await syncOfflineStock(change);
                    break;
            }
            
            change.synced = true;
            results.success++;
            
        } catch (error) {
            console.error(`❌ Sync failed for change ${change.id}:`, error);
            results.failed++;
            results.errors.push({ change: change.id, error: error.message });
        }
    }
    
    // Remove synced changes
    offlineChangesQueue = offlineChangesQueue.filter(c => !c.synced);
    localStorage.setItem('offline_sync_queue', JSON.stringify(offlineChangesQueue));
    
    console.log('✅ Sync complete:', results);
    
    if (results.success > 0) {
        showAlert(`${results.success} offline değişiklik senkronize edildi!`, 'success');
    }
    
    if (results.failed > 0) {
        showAlert(`${results.failed} değişiklik senkronize edilemedi`, 'warning');
    }
    
    return results;
}

// Sync individual package
async function syncOfflinePackage(change) {
    const { action, data } = change.data;
    
    switch (action) {
        case 'create':
            const { error: createError } = await supabase
                .from('packages')
                .insert([data]);
            if (createError) throw createError;
            break;
            
        case 'update':
            const { error: updateError } = await supabase
                .from('packages')
                .update(data)
                .eq('id', data.id);
            if (updateError) throw updateError;
            break;
            
        case 'delete':
            const { error: deleteError } = await supabase
                .from('packages')
                .delete()
                .eq('id', data.id);
            if (deleteError) throw deleteError;
            break;
    }
}

// Sync individual container
async function syncOfflineContainer(change) {
    const { action, data } = change.data;
    
    switch (action) {
        case 'create':
            const { error: createError } = await supabase
                .from('containers')
                .insert([data]);
            if (createError) throw createError;
            break;
            
        case 'update':
            const { error: updateError } = await supabase
                .from('containers')
                .update(data)
                .eq('id', data.id);
            if (updateError) throw updateError;
            break;
    }
}

// Sync individual stock
async function syncOfflineStock(change) {
    const { action, data } = change.data;
    
    switch (action) {
        case 'update':
            const { error } = await supabase
                .from('stock_items')
                .update({ quantity: data.quantity })
                .eq('code', data.code);
            if (error) throw error;
            break;
    }
}

// ==================== EXCEL TO SUPABASE SYNC FIXES ====================

// FIXED: Enhanced sync function with proper Excel package handling
async function syncExcelWithSupabase() {
    if (!supabase || !navigator.onLine) {
        console.log('❌ Cannot sync: No Supabase client or offline');
        return false;
    }

    if (excelSyncQueue.length === 0) {
        console.log('✅ No packages to sync');
        return true;
    }

    const workspaceId = getCurrentWorkspaceId();
    const results = { success: 0, failed: 0 };

    console.log(`🔄 Syncing ${excelSyncQueue.length} packages to Supabase...`);

    for (const operation of excelSyncQueue) {
        if (operation.status === 'success') continue;

        try {
            let result;
            const operationData = {
                ...operation.data,
                workspace_id: workspaceId,
                updated_at: new Date().toISOString()
            };

            // Handle Excel packages by creating new Supabase records
            if (!isValidUUID(operationData.id)) {
                console.log(`🔄 Converting Excel package to Supabase: ${operationData.package_no}`);
                await migrateExcelPackageToSupabase(operationData);
                operation.status = 'success';
                results.success++;
                continue;
            }

            // Handle existing Supabase packages
            switch (operation.type) {
                case 'add':
                    result = await supabase.from('packages').insert([operationData]);
                    break;
                case 'update':
                    result = await supabase.from('packages').update(operationData).eq('id', operationData.id);
                    break;
                case 'delete':
                    result = await supabase.from('packages').delete().eq('id', operationData.id);
                    break;
            }

            if (result.error) throw result.error;

            operation.status = 'success';
            results.success++;
            console.log(`✅ Synced: ${operation.type} for ${operation.data.package_no}`);

        } catch (error) {
            console.error(`❌ Sync failed: ${operation.type} for ${operation.data.package_no}`, error);
            operation.status = 'failed';
            operation.lastError = error.message;
            results.failed++;
        }
    }

    // Clean up successful operations
    excelSyncQueue = excelSyncQueue.filter(op => op.status !== 'success');
    localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));

    console.log(`📊 Sync completed: ${results.success} success, ${results.failed} failed`);
    
    if (results.success > 0) {
        showAlert(`${results.success} paket senkronize edildi!`, 'success');
        await populatePackagesTable();
    }

    return results.failed === 0;
}

// FIXED: Migrate Excel package to Supabase
async function migrateExcelPackageToSupabase(excelPackage) {
    try {
        const newPackage = {
            id: generateUniquePackageUUID(),
            package_no: excelPackage.package_no,
            customer_id: excelPackage.customer_id,
            customer_name: excelPackage.customer_name,
            customer_code: excelPackage.customer_code,
            items: excelPackage.items,
            total_quantity: excelPackage.total_quantity,
            status: excelPackage.status || 'beklemede',
            packer: excelPackage.packer,
            container_id: excelPackage.container_id,
            workspace_id: excelPackage.workspace_id,
            station_name: excelPackage.station_name,
            original_excel_id: excelPackage.id,
            source: 'excel_migrated',
            created_at: excelPackage.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('packages')
            .insert([newPackage]);
            
        if (error) throw error;

        console.log(`✅ Migrated Excel package to Supabase: ${excelPackage.package_no}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to migrate Excel package ${excelPackage.package_no}:`, error);
        throw error;
    }
}

// FIXED: Enhanced addToSyncQueue with Excel package support
function addToSyncQueue(operationType, data) {
    // Create operation fingerprint for deduplication
    const operationFingerprint = `${operationType}-${data.package_no}`;
    
    // Check for duplicates
    const isDuplicate = excelSyncQueue.some(op => 
        op.fingerprint === operationFingerprint && op.status !== 'failed'
    );
    
    if (isDuplicate) {
        console.log('🔄 Sync operation already in queue, skipping duplicate:', operationFingerprint);
        return;
    }

    // Remove any older operations for the same package
    excelSyncQueue = excelSyncQueue.filter(op => 
        !(op.data.package_no === data.package_no && op.type !== operationType)
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

    // Add new operation
    excelSyncQueue.push(enhancedOperation);
    
    // Limit queue size to prevent memory issues
    if (excelSyncQueue.length > 1000) {
        console.warn('📦 Sync queue too large, removing oldest failed operations');
        excelSyncQueue = excelSyncQueue
            .filter(op => op.status !== 'failed')
            .slice(-500);
    }

    localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
    console.log(`✅ Added to sync queue: ${operationType} for ${data.package_no}`);
}

// Auto-sync when coming online
window.addEventListener('online', async function() {
    console.log('🌐 Network online - syncing offline changes...');
    showAlert('İnternet bağlantısı tekrar kuruldu, veriler senkronize ediliyor...', 'info');
    
    setTimeout(async () => {
        await syncOfflineChanges();
        await syncExcelWithSupabase();
    }, 2000);
});

// Monitor offline status
window.addEventListener('offline', function() {
    console.log('📡 Network offline - using local storage');
    showAlert('İnternet bağlantısı kesildi, veriler yerel olarak kaydediliyor', 'warning');
});

// Initialize on app start
loadOfflineQueue();

// Make globally available
window.queueOfflineChange = queueOfflineChange;
window.syncOfflineChanges = syncOfflineChanges;
window.syncExcelWithSupabase = syncExcelWithSupabase;

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

// ==================== ENHANCED PROFESSIONAL EXCEL EXPORT WITH CUSTOMER CALCULATIONS ====================
const ProfessionalExcelExport = {
    // Calculate customer-wise item totals
    calculateCustomerItemTotals: function(packages) {
        const customerTotals = {};
        
        packages.forEach(pkg => {
            const customerName = pkg.customer_name || pkg.customers?.name || 'Bilinmeyen Müşteri';
            const customerCode = pkg.customer_code || pkg.customers?.code || '';
            
            if (!customerTotals[customerName]) {
                customerTotals[customerName] = {
                    customer_code: customerCode,
                    items: {},
                    total_packages: 0,
                    total_quantity: 0
                };
            }
            
            customerTotals[customerName].total_packages++;
            
            // Process items from different formats
            if (pkg.items) {
                if (Array.isArray(pkg.items)) {
                    // Array format: [{name: "Product", qty: 5}]
                    pkg.items.forEach(item => {
                        const productName = item.name || 'Ürün';
                        const quantity = item.qty || 0;
                        
                        if (!customerTotals[customerName].items[productName]) {
                            customerTotals[customerName].items[productName] = 0;
                        }
                        customerTotals[customerName].items[productName] += quantity;
                        customerTotals[customerName].total_quantity += quantity;
                    });
                } else if (typeof pkg.items === 'object') {
                    // Object format: {"Product1": 5, "Product2": 3}
                    Object.entries(pkg.items).forEach(([productName, quantity]) => {
                        if (!customerTotals[customerName].items[productName]) {
                            customerTotals[customerName].items[productName] = 0;
                        }
                        customerTotals[customerName].items[productName] += quantity;
                        customerTotals[customerName].total_quantity += quantity;
                    });
                }
            } else if (pkg.total_quantity) {
                // Fallback for packages without detailed items
                const productName = pkg.product || 'Genel Ürün';
                if (!customerTotals[customerName].items[productName]) {
                    customerTotals[customerName].items[productName] = 0;
                }
                customerTotals[customerName].items[productName] += pkg.total_quantity;
                customerTotals[customerName].total_quantity += pkg.total_quantity;
            }
        });
        
        return customerTotals;
    },

    // Convert packages to Excel-friendly format
    convertToProfessionalExcel: function(packages) {
        if (!packages || packages.length === 0) {
            return [];
        }

        const excelData = packages.map(pkg => {
            // Extract items information professionally
            let itemsInfo = 'Ürün bilgisi yok';
            let totalQuantity = pkg.total_quantity || 0;
            
            if (pkg.items) {
                if (Array.isArray(pkg.items)) {
                    itemsInfo = pkg.items.map(item => item.name || 'Ürün').join(', ');
                    
                    if (pkg.items.length > 0 && !totalQuantity) {
                        totalQuantity = pkg.items.reduce((sum, item) => sum + (item.qty || 0), 0);
                    }
                } else if (typeof pkg.items === 'object') {
                    itemsInfo = Object.keys(pkg.items).join(', ');
                    
                    const itemsArray = Object.entries(pkg.items);
                    if (itemsArray.length > 0 && !totalQuantity) {
                        totalQuantity = itemsArray.reduce((sum, [_, quantity]) => sum + quantity, 0);
                    }
                }
            } else if (pkg.items_display) {
                const productMatches = pkg.items_display.match(/([^:,]+)(?=:)/g);
                if (productMatches) {
                    itemsInfo = productMatches.map(match => match.trim()).join(', ');
                } else {
                    itemsInfo = pkg.items_display;
                }
            } else if (pkg.product) {
                itemsInfo = pkg.product;
            }

            const customerName = pkg.customer_name || pkg.customers?.name || 'Bilinmeyen Müşteri';
            const createdDate = pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A';
            const updatedDate = pkg.updated_at ? new Date(pkg.updated_at).toLocaleDateString('tr-TR') : 'N/A';

            return {
                'PAKET NO': pkg.package_no || 'N/A',
                'MÜŞTERİ': customerName,
                'ÜRÜNLER': itemsInfo,
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

    // Convert customer totals to Excel format
    convertCustomerTotalsToExcel: function(customerTotals) {
        const excelData = [];
        
        Object.entries(customerTotals).forEach(([customerName, data]) => {
            // Add customer summary row
            excelData.push({
                'MÜŞTERİ': customerName,
                'MÜŞTERİ KODU': data.customer_code,
                'ÜRÜN': 'TOPLAM ÖZET',
                'ADET': data.total_quantity,
                'PAKET SAYISI': data.total_packages,
                'DETAY': ''
            });
            
            // Add individual product rows
            Object.entries(data.items).forEach(([productName, quantity]) => {
                excelData.push({
                    'MÜŞTERİ': '',
                    'MÜŞTERİ KODU': '',
                    'ÜRÜN': productName,
                    'ADET': quantity,
                    'PAKET SAYISI': '',
                    'DETAY': `${customerName} için toplam`
                });
            });
            
            // Add empty row for separation
            excelData.push({
                'MÜŞTERİ': '',
                'MÜŞTERİ KODU': '',
                'ÜRÜN': '',
                'ADET': '',
                'PAKET SAYISI': '',
                'DETAY': ''
            });
        });
        
        return excelData;
    },

    // Create comprehensive Excel with multiple sheets
    exportToProfessionalExcel: function(packages, filename = null) {
        try {
            if (!packages || packages.length === 0) {
                showAlert('Excel için paket verisi bulunamadı', 'warning');
                return false;
            }

            // Calculate customer totals
            const customerTotals = this.calculateCustomerItemTotals(packages);
            
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `ProClean_Paketler_${date}_${getCurrentWorkspaceName()}.xlsx`;
            }

            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Sheet 1: All Packages
            const packagesData = this.convertToProfessionalExcel(packages);
            const wsPackages = XLSX.utils.json_to_sheet(packagesData);
            
            // Set column widths for packages sheet
            const packageColWidths = [
                { wch: 60 }, // PAKET NO
                { wch: 40 }, // MÜŞTERİ
                { wch: 35 }, // ÜRÜNLER
                { wch: 10 }, // TOPLAM ADET
                { wch: 40 }, // DURUM
                { wch: 40 }, // PAKETLEYEN
                { wch: 40 }, // OLUŞTURULMA TARİHİ
                { wch: 40 }, // GÜNCELLENME TARİHİ
                { wch: 5 }  // İSTASYON
            ];
            wsPackages['!cols'] = packageColWidths;
            
            // Sheet 2: Customer Totals
            const customerTotalsData = this.convertCustomerTotalsToExcel(customerTotals);
            const wsCustomerTotals = XLSX.utils.json_to_sheet(customerTotalsData);
            
            // Set column widths for customer totals sheet
            const customerColWidths = [
                { wch: 30 }, // MÜŞTERİ
                { wch: 15 }, // MÜŞTERİ KODU
                { wch: 25 }, // ÜRÜN
                { wch: 10 }, // ADET
                { wch: 12 }, // PAKET SAYISI
                { wch: 30 }  // DETAY
            ];
            wsCustomerTotals['!cols'] = customerColWidths;
            
            // Sheet 3: Summary Statistics
            const summaryData = this.createSummarySheet(customerTotals, packages);
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            
            // Set column widths for summary sheet
            const summaryColWidths = [
                { wch: 25 }, // BAŞLIK
                { wch: 40 }  // DEĞER
            ];
            wsSummary['!cols'] = summaryColWidths;

            // Add worksheets to workbook
            XLSX.utils.book_append_sheet(wb, wsPackages, 'Tüm Paketler');
            XLSX.utils.book_append_sheet(wb, wsCustomerTotals, 'Müşteri Toplamları');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet İstatistikler');
            
            // Apply professional styling to all sheets
            this.applyExcelStyling(wb, packagesData, customerTotalsData, summaryData);
            
            // Write and download file
            XLSX.writeFile(wb, filename);
            
            showAlert(`✅ ${packages.length} paket profesyonel Excel formatında dışa aktarıldı\n📊 Müşteri bazlı toplamlar hesaplandı`, 'success');
            console.log('Professional Excel exported:', packages.length, 'packages');
            
            return true;

        } catch (error) {
            console.error('Professional Excel export error:', error);
            showAlert('Excel dışa aktarım hatası: ' + error.message, 'error');
            return false;
        }
    },

    // Create summary statistics sheet
    createSummarySheet: function(customerTotals, packages) {
        const summaryData = [];
        
        // Basic statistics
        const totalPackages = packages.length;
        const totalQuantity = packages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
        const shippedPackages = packages.filter(pkg => pkg.status === 'sevk-edildi').length;
        const waitingPackages = packages.filter(pkg => pkg.status === 'beklemede').length;
        const uniqueCustomers = Object.keys(customerTotals).length;
        
        // Calculate total unique products
        const allProducts = new Set();
        packages.forEach(pkg => {
            if (pkg.items) {
                if (Array.isArray(pkg.items)) {
                    pkg.items.forEach(item => allProducts.add(item.name || 'Ürün'));
                } else if (typeof pkg.items === 'object') {
                    Object.keys(pkg.items).forEach(product => allProducts.add(product));
                }
            }
        });
        
        summaryData.push(
            { 'BAŞLIK': 'TOPLAM PAKET SAYISI', 'DEĞER': totalPackages },
            { 'BAŞLIK': 'TOPLAM ÜRÜN ADEDİ', 'DEĞER': totalQuantity },
            { 'BAŞLIK': 'SEVK EDİLEN PAKETLER', 'DEĞER': shippedPackages },
            { 'BAŞLIK': 'BEKLEYEN PAKETLER', 'DEĞER': waitingPackages },
            { 'BAŞLIK': 'TOPLAM MÜŞTERİ SAYISI', 'DEĞER': uniqueCustomers },
            { 'BAŞLIK': 'TOPLAM ÜRÜN ÇEŞİDİ', 'DEĞER': allProducts.size },
            { 'BAŞLIK': '', 'DEĞER': '' },
            { 'BAŞLIK': 'RAPOR TARİHİ', 'DEĞER': new Date().toLocaleDateString('tr-TR') },
            { 'BAŞLIK': 'İSTASYON', 'DEĞER': getCurrentWorkspaceName() }
        );
        
        return summaryData;
    },

    // Apply professional styling to Excel sheets
    applyExcelStyling: function(wb, packagesData, customerTotalsData, summaryData) {
        // This is a simplified version - in a real implementation,
        // you would use a library like xlsx-style for advanced styling
        
        console.log('Applying professional Excel styling...');
        
        // Note: XLSX.js has limited styling capabilities
        // For advanced styling, consider using SheetJS Pro or xlsx-style library
    },

    // Enhanced CSV export with customer totals
    exportToProfessionalCSV: function(packages, filename = null) {
        try {
            if (!packages || packages.length === 0) {
                showAlert('CSV için paket verisi bulunamadı', 'warning');
                return false;
            }

            // For CSV, we'll create a ZIP file with multiple CSVs
            this.exportMultipleCSVs(packages, filename);
            
            return true;

        } catch (error) {
            console.error('Professional CSV export error:', error);
            showAlert('CSV dışa aktarım hatası: ' + error.message, 'error');
            return false;
        }
    },

    // Export multiple CSV files in a ZIP
    exportMultipleCSVs: function(packages, baseFilename = null) {
        if (!window.JSZip) {
            console.warn('JSZip not available, exporting single CSV');
            this.exportSingleCSV(packages, baseFilename);
            return;
        }

        try {
            const zip = new JSZip();
            const date = new Date().toISOString().split('T')[0];
            
            if (!baseFilename) {
                baseFilename = `ProClean_Rapor_${date}_${getCurrentWorkspaceName()}`;
            }

            // CSV 1: All Packages
            const packagesData = this.convertToProfessionalExcel(packages);
            const packagesCSV = this.convertToCSV(packagesData);
            zip.file(`${baseFilename}_Tum_Paketler.csv`, '\uFEFF' + packagesCSV);
            
            // CSV 2: Customer Totals
            const customerTotals = this.calculateCustomerItemTotals(packages);
            const customerTotalsData = this.convertCustomerTotalsToExcel(customerTotals);
            const customerCSV = this.convertToCSV(customerTotalsData);
            zip.file(`${baseFilename}_Musteri_Toplamlari.csv`, '\uFEFF' + customerCSV);
            
            // CSV 3: Summary
            const summaryData = this.createSummarySheet(customerTotals, packages);
            const summaryCSV = this.convertToCSV(summaryData);
            zip.file(`${baseFilename}_Ozet_Istatistikler.csv`, '\uFEFF' + summaryCSV);
            
            // Generate and download ZIP
            zip.generateAsync({type: 'blob'}).then(function(content) {
                const url = URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${baseFilename}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showAlert(`✅ 3 CSV dosyası ZIP olarak indirildi:\n• Tüm Paketler\n• Müşteri Toplamları\n• Özet İstatistikler`, 'success');
            });
            
        } catch (error) {
            console.error('ZIP export error:', error);
            this.exportSingleCSV(packages, baseFilename);
        }
    },

    // Fallback single CSV export
    exportSingleCSV: function(packages, filename = null) {
        const excelData = this.convertToProfessionalExcel(packages);
        
        if (!filename) {
            const date = new Date().toISOString().split('T')[0];
            filename = `ProClean_Paketler_${date}_${getCurrentWorkspaceName()}.csv`;
        }

        const csvContent = this.convertToCSV(excelData);
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
    },

    // Convert data to CSV format
    convertToCSV: function(data) {
        if (!data || data.length === 0) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }
};

// Add JSZip library check and fallback
if (typeof JSZip === 'undefined') {
    console.warn('JSZip library not found - multiple CSV export will use fallback');
    // You can load JSZip from CDN if needed:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
}

// Update the ExcelStorage export function to use enhanced export
ExcelStorage.exportDailyFile = function(dateString) {
    try {
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
        
        // Use enhanced professional export
        ProfessionalExcelExport.exportToProfessionalExcel(packages, `ProClean_Paketler_${dateString}.xlsx`);
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Dosya dışa aktarılırken hata oluştu', 'error');
    }
};

// INITIALIZE SUPABASE - uses direct key (from localStorage or hardcoded above)
// Singleton pattern with safe fallback to Excel mode if no key
function initializeSupabase() {
    // If client already created and API key exists, return it
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'REPLACE_WITH_YOUR_ANON_KEY') {
        console.warn('Supabase API key is not set. Running in Excel (offline) mode.');
        isUsingExcel = true;
        showAlert('Excel modu aktif: Çevrimdışı çalışıyorsunuz', 'warning');
        return null;
    }
    
    try {
        // If a global supabase factory exists, prefer it; otherwise create minimal wrapper
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else if (typeof createClient === 'function') {
            supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            // Try to use @supabase/supabase-js if loaded as supabaseClient
            if (window.SupabaseClient) {
                supabase = new window.SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            } else {
                console.warn('Supabase client factory not found - supabase operations will fail if attempted');
                supabase = null;
            }
        }
        if (supabase) {
            console.log('Supabase client initialized successfully');
            isUsingExcel = false;
            return supabase;
        } else {
            throw new Error('Supabase client creation returned null');
        }
    } catch (error) {
        console.error('Supabase initialization error:', error);
        showAlert('Supabase başlatılamadı. Excel moduna geçiliyor.', 'warning');
        isUsingExcel = true;
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

// ==================== FIXED SYNC SYSTEM ====================

// FIXED: Enhanced workspace data migration
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

// FIXED: Setup auto-sync triggers
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

// Initialize sync system
setupEnhancedSyncTriggers();

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

// ==================== FIXED PACKAGES TABLE ====================

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
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .eq('workspace_id', workspaceId)
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

// Make sure to add this escapeHtml function if missing
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}





        
        
      async function calculateTotalQuantity(packageIds) {
    try {
        if (!Array.isArray(packageIds) || packageIds.length === 0) {
            console.warn('⚠️ No package IDs provided');
            return 0;
        }

        const cleanIds = packageIds.filter(id => id != null);
        if (cleanIds.length === 0) {
            console.warn('⚠️ No valid IDs after filtering');
            return 0;
        }

        let totalQuantity = 0;

        if (supabase && navigator.onLine) {
            // Try Supabase first
            const { data: packages, error } = await supabase
                .from('packages')
                .select('id, total_quantity, items')
                .in('id', cleanIds);
            
            if (!error && packages) {
                packages.forEach(pkg => {
                    const qty = calculateQuantityFromPackage(pkg);
                    totalQuantity += qty;
                });
                console.log(`✅ Supabase calculated: ${totalQuantity}`);
                return totalQuantity;
            }
        }

        // Fallback to Excel/localStorage
        const workspaceId = window.workspaceManager?.currentWorkspace?.id || 'default';
        const packagesData = excelPackages.filter(pkg => cleanIds.includes(pkg.id));
        
        if (packagesData.length === 0) {
            console.warn('❌ No packages found in any source');
            return 0;
        }

        packagesData.forEach(pkg => {
            const qty = calculateQuantityFromPackage(pkg);
            totalQuantity += qty;
        });

        console.log(`✅ Fallback calculated: ${totalQuantity}`);
        return totalQuantity;

    } catch (error) {
        console.error('❌ Error calculating total quantity:', error);
        return 0;
    }
}

// Helper function to extract quantity from any package format
function calculateQuantityFromPackage(pkg) {
    // Method 1: Direct total_quantity
    if (pkg.total_quantity) {
        const qty = parseInt(pkg.total_quantity);
        if (!isNaN(qty)) return qty;
    }

    // Method 2: Calculate from items array
    if (pkg.items && Array.isArray(pkg.items)) {
        return pkg.items.reduce((sum, item) => {
            const itemQty = parseInt(item.qty || item.quantity || 0);
            return sum + (isNaN(itemQty) ? 0 : itemQty);
        }, 0);
    }

    // Method 3: Calculate from items object
    if (pkg.items && typeof pkg.items === 'object') {
        return Object.values(pkg.items).reduce((sum, qty) => {
            const itemQty = parseInt(qty);
            return sum + (isNaN(itemQty) ? 0 : itemQty);
        }, 0);
    }

    // Method 4: Try items_display parsing
    if (pkg.items_display) {
        const matches = pkg.items_display.match(/\d+/g);
        if (matches) {
            return matches.reduce((sum, match) => sum + parseInt(match), 0);
        }
    }

    console.warn('⚠️ Could not determine quantity for package:', pkg.id);
    return 0;
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
            <p><strong>Paket Sayısı:</strong> ${container.packages?.length || 0}</p>
            <p><strong>Toplam Adet:</strong> ${container.packages?.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0) || 0}</p>
        `;
        
        if (container.packages && container.packages.length > 0) {
            contentHTML += `
                <h4>Paketler (Otomatik Sevk Edildi)</h4>
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
                                <td>${pkg.customers?.name || pkg.customer_name || 'N/A'}</td>
                                <td>${pkg.total_quantity}</td>
                                <td><span class="status-${pkg.status || 'sevk-edildi'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
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







// ==================== COMPLETE RFID STOCK TABLE SYSTEM ====================

// Global RFID Scanner State
let rfidScannerActive = false;
let rfidScanBuffer = '';
let rfidLastScanTime = 0;

// Add RFID CSS Styles
const rfidStyle = document.createElement('style');
rfidStyle.textContent = `
    /* RFID Status Badges */
    .status-temiz { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; }
    .status-kirli { background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; }
    .status-yikanıyor { background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; }
    .status-hasarli { background: #e2e3e5; color: #383d41; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; }
    
    /* RFID Scanning Mode */
    .rfid-scanning { border: 3px solid #28a745 !important; }
    .rfid-highlight { background-color: #fff3cd !important; transition: background-color 0.5s ease; }
    
    /* Button Styles */
    .btn-icon { background: none; border: none; padding: 5px; margin: 0 2px; cursor: pointer; font-size: 0.9rem; }
    .btn-icon:hover { opacity: 0.7; }
    .btn-danger { color: #dc3545; }
    .btn-danger:hover { color: #bd2130; }
`;
document.head.appendChild(rfidStyle);

// Populate Stock Table with RFID Support - UPDATED FOR YOUR SCHEMA
async function populateStockTable() {
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) {
        console.error('Stock table body not found');
        return;
    }
    
    try {
        showAlert('Stok tablosu yükleniyor...', 'info', 1000);
        
        const workspaceId = getCurrentWorkspaceId();
        let stockItems = [];
        
        // Load from Supabase - UPDATED QUERY
        if (supabase && navigator.onLine) {
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('registration_date', { ascending: false });
            
            if (error) throw error;
            if (data) stockItems = data;
        }
        
        // Fallback to localStorage
        if (stockItems.length === 0) {
            const localStock = JSON.parse(localStorage.getItem('rfid_stock_items') || '[]');
            stockItems = localStock.filter(item => item.workspace_id === workspaceId);
        }
        
        tbody.innerHTML = '';
        
        if (stockItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Stok bulunamadı</td></tr>';
            return;
        }
        
        stockItems.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.rfidTag = item.rfid_tag_id || '';
            row.dataset.stockId = item.id;
            
            // Status badge - UPDATED FOR YOUR STATUS TYPES
            let statusClass = 'status-stokta';
            let statusText = item.status || 'Temiz';
            
            switch(item.status) {
                case 'Kirli': statusClass = 'status-kirli'; break;
                case 'Yıkanıyor': statusClass = 'status-yikanıyor'; break;
                case 'Temiz': statusClass = 'status-temiz'; break;
                case 'Hasarlı': statusClass = 'status-hasarli'; break;
                default: statusClass = 'status-temiz'; break;
            }
            
            row.innerHTML = `
                <td><strong>${item.rfid_tag_id || 'RFID Yok'}</strong></td>
                <td>${item.stock_code || 'N/A'}</td>
                <td>${item.product_name || 'Bilinmeyen'}</td>
                <td>${item.customer_name || '-'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.step || 'Depo'}</td>
                <td>${formatDate(item.registration_date || item.created_at)}</td>
                <td>${item.wash_age || 0} kez</td>
                <td>
                    <button onclick="editRFIDStock('${item.id}')" class="btn-icon" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="assignRFIDTag('${item.id}')" class="btn-icon" title="RFID Ata">
                        <i class="fas fa-wifi"></i>
                    </button>
                    <button onclick="deleteRFIDStock('${item.id}')" class="btn-icon btn-danger" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log(`✅ Loaded ${stockItems.length} RFID stock items`);
        
    } catch (error) {
        console.error('RFID stock table error:', error);
        showAlert('Stok tablosu yüklenirken hata oluştu', 'error');
    }
}

// Helper function for date formatting
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('tr-TR');
    } catch (e) {
        return 'Geçersiz Tarih';
    }
}

// Start RFID Scanner
function startRFIDScanner() {
    if (rfidScannerActive) {
        showAlert('RFID tarayıcı zaten aktif', 'warning');
        return;
    }
    
    rfidScannerActive = true;
    rfidScanBuffer = '';
    
    // Update UI
    const startBtn = document.getElementById('startRFIDBtn');
    const stopBtn = document.getElementById('stopRFIDBtn');
    
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
    }
    
    if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.style.opacity = '1';
    }
    
    // Add visual indicator
    document.body.classList.add('rfid-scanning');
    
    // Setup RFID listener
    document.addEventListener('keypress', rfidScanHandler);
    
    showAlert('🔍 RFID Tarayıcı Başlatıldı - RFID etiketini okutun', 'success');
    console.log('✅ RFID Scanner STARTED');
}

// Stop RFID Scanner
function stopRFIDScanner() {
    if (!rfidScannerActive) {
        showAlert('RFID tarayıcı zaten durdurulmuş', 'warning');
        return;
    }
    
    rfidScannerActive = false;
    rfidScanBuffer = '';
    
    // Update UI
    const startBtn = document.getElementById('startRFIDBtn');
    const stopBtn = document.getElementById('stopRFIDBtn');
    
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
    }
    
    if (stopBtn) {
        stopBtn.disabled = true;
        stopBtn.style.opacity = '0.5';
    }
    
    // Remove visual indicator
    document.body.classList.remove('rfid-scanning');
    
    // Remove RFID listener
    document.removeEventListener('keypress', rfidScanHandler);
    
    showAlert('⏸️ RFID Tarayıcı Durduruldu', 'info');
    console.log('⏸️ RFID Scanner STOPPED');
}

// RFID Scan Handler
function rfidScanHandler(e) {
    if (!rfidScannerActive) return;
    
    const currentTime = Date.now();
    
    // RFID scanners typically send data very fast (< 50ms between chars)
    if (currentTime - rfidLastScanTime > 100) {
        rfidScanBuffer = ''; // Reset if too slow (manual typing)
    }
    
    rfidLastScanTime = currentTime;
    
    if (e.key === 'Enter') {
        e.preventDefault();
        
        if (rfidScanBuffer.length > 5) {
            processRFIDScan(rfidScanBuffer);
        }
        
        rfidScanBuffer = '';
    } else {
        rfidScanBuffer += e.key;
    }
}

// Process RFID Scan
async function processRFIDScan(rfidTag) {
    try {
        console.log('🔍 RFID Scanned:', rfidTag);
        showAlert(`RFID Tarandı: ${rfidTag}`, 'info', 2000);
        
        // Search for item with this RFID
        const { data: item, error } = await supabase
            .from('stock_items')
            .select('*')
            .eq('rfid_tag_id', rfidTag)
            .single();
        
        if (error || !item) {
            // RFID not found - ask to create new item
            const create = confirm(`RFID "${rfidTag}" sistemde bulunamadı.\n\nYeni stok öğesi oluşturmak ister misiniz?`);
            
            if (create) {
                await createNewRFIDStock(rfidTag);
            }
            return;
        }
        
        // Item found - show details
        showRFIDItemDetails(item);
        
        // Highlight row in table
        highlightRFIDRow(rfidTag);
        
    } catch (error) {
        console.error('RFID scan error:', error);
        showAlert('RFID okuma hatası', 'error');
    }
}

// Create New RFID Stock Item - UPDATED FOR YOUR SCHEMA
async function createNewRFIDStock(rfidTag) {
    const stockCode = prompt('Stok Kodu:');
    if (!stockCode) return;
    
    const productName = prompt('Ürün Adı:');
    if (!productName) return;
    
    const customerName = prompt('Müşteri Adı (opsiyonel):') || '';
    
    try {
        const workspaceId = getCurrentWorkspaceId();
        const newItem = {
            id: generateUUID(),
            rfid_tag_id: rfidTag,
            stock_code: stockCode,
            product_name: productName,
            customer_name: customerName,
            status: 'Temiz',
            step: 'Depo',
            wash_age: 0,
            workspace_id: workspaceId,
            registration_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Save to Supabase - UPDATED FOR YOUR SCHEMA
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('stock_items')
                .insert([newItem]);
            
            if (error) {
                // Handle unique constraint violation
                if (error.code === '23505') {
                    showAlert('Bu RFID tag zaten kullanılıyor!', 'error');
                    return;
                }
                throw error;
            }
        }
        
        // Save to localStorage
        const localStock = JSON.parse(localStorage.getItem('rfid_stock_items') || '[]');
        localStock.push(newItem);
        localStorage.setItem('rfid_stock_items', JSON.stringify(localStock));
        
        await populateStockTable();
        showAlert(`✅ RFID stok oluşturuldu: ${productName}`, 'success');
        
    } catch (error) {
        console.error('Create RFID stock error:', error);
        showAlert('RFID stok oluşturma hatası: ' + error.message, 'error');
    }
}


// Helper function to get current workspace ID
function getCurrentWorkspaceId() {
    if (window.workspaceManager?.currentWorkspace?.id) {
        return window.workspaceManager.currentWorkspace.id;
    }
    
    // Fallback: get from localStorage or use default
    const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
    return settings.currentWorkspaceId || 'default-workspace';
}




// Helper function to generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}



// Helper function to generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// Show RFID Item Details
function showRFIDItemDetails(item) {
    const modal = document.createElement('div');
    modal.id = 'rfidDetailsModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 9999; display: flex;
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%;">
            <h3 style="margin-bottom: 1rem; color: #2c3e50;">
                <i class="fas fa-wifi"></i> RFID Stok Detayları
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">RFID Tag:</td>
                    <td style="padding: 10px;">${item.rfid_tag_id}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">Stok Kodu:</td>
                    <td style="padding: 10px;">${item.stock_code}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">Ürün:</td>
                    <td style="padding: 10px;">${item.product_name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">Müşteri:</td>
                    <td style="padding: 10px;">${item.customer_name || '-'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">Durum:</td>
                    <td style="padding: 10px;">${item.status}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">Adım:</td>
                    <td style="padding: 10px;">${item.step}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">Yıkanma Yaşı:</td>
                    <td style="padding: 10px;">${item.wash_age} kez</td>
                </tr>
            </table>
            
            <div style="margin-top: 1.5rem; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="updateRFIDStatus('${item.id}')" class="btn btn-primary">
                    <i class="fas fa-edit"></i> Durumu Güncelle
                </button>
                <button onclick="document.getElementById('rfidDetailsModal').remove()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Kapat
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Highlight RFID Row
function highlightRFIDRow(rfidTag) {
    // Remove previous highlights
    document.querySelectorAll('.rfid-highlight').forEach(el => {
        el.classList.remove('rfid-highlight');
    });
    
    // Highlight current row
    const row = document.querySelector(`tr[data-rfid-tag="${rfidTag}"]`);
    if (row) {
        row.classList.add('rfid-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Update RFID Status
async function updateRFIDStatus(itemId) {
    const newStatus = prompt('Yeni Durum:\n1. Temiz\n2. Kirli\n3. Yıkanıyor\n4. Hasarlı\n\nSeçim (1-4):');
    
    const statusMap = {
        '1': 'Temiz',
        '2': 'Kirli', 
        '3': 'Yıkanıyor',
        '4': 'Hasarlı'
    };
    
    const status = statusMap[newStatus];
    if (!status) return;
    
    try {
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('stock_items')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId);
            
            if (error) throw error;
        }
        
        // Update localStorage
        const localStock = JSON.parse(localStorage.getItem('rfid_stock_items') || '[]');
        const itemIndex = localStock.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            localStock[itemIndex].status = status;
            localStock[itemIndex].updated_at = new Date().toISOString();
            localStorage.setItem('rfid_stock_items', JSON.stringify(localStock));
        }
        
        await populateStockTable();
        showAlert(`✅ Durum güncellendi: ${status}`, 'success');
        
        document.getElementById('rfidDetailsModal')?.remove();
        
    } catch (error) {
        console.error('Status update error:', error);
        showAlert('Durum güncelleme hatası', 'error');
    }
}

// Edit RFID Stock
async function editRFIDStock(itemId) {
    // Implementation for editing RFID stock
    showAlert('Düzenleme özelliği yakında eklenecek', 'info');
}

// Assign RFID Tag - UPDATED FOR UNIQUE CONSTRAINT
async function assignRFIDTag(itemId) {
    const rfidTag = prompt('RFID Tag ID girin veya tarayın:');
    if (!rfidTag) return;
    
    try {
        // Check if RFID tag is already used
        if (supabase && navigator.onLine) {
            const { data: existing } = await supabase
                .from('stock_items')
                .select('id')
                .eq('rfid_tag_id', rfidTag)
                .single();
            
            if (existing && existing.id !== itemId) {
                showAlert('Bu RFID tag başka bir üründe kullanılıyor!', 'error');
                return;
            }
        }
        
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('stock_items')
                .update({ 
                    rfid_tag_id: rfidTag,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId);
            
            if (error) throw error;
        }
        
        // Update localStorage
        const localStock = JSON.parse(localStorage.getItem('rfid_stock_items') || '[]');
        const itemIndex = localStock.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            localStock[itemIndex].rfid_tag_id = rfidTag;
            localStock[itemIndex].updated_at = new Date().toISOString();
            localStorage.setItem('rfid_stock_items', JSON.stringify(localStock));
        }
        
        await populateStockTable();
        showAlert(`✅ RFID atandı: ${rfidTag}`, 'success');
        
    } catch (error) {
        console.error('RFID assign error:', error);
        showAlert('RFID atama hatası: ' + error.message, 'error');
    }
}
// Delete RFID Stock - FIXED FUNCTION NAME
async function deleteRFIDStock(itemId) {
    if (!confirm('Bu stok öğesini silmek istediğinize emin misiniz?')) return;
    
    try {
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('stock_items')
                .delete()
                .eq('id', itemId);
            
            if (error) throw error;
        }
        
        // FIX: Changed from populateRFIDStockTable to populateStockTable
        await populateStockTable();
        showAlert('✅ Stok silindi', 'success');
        
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Silme hatası', 'error');
    }
}

// Add this to ensure Supabase is available
function ensureSupabase() {
    if (!supabase) {
        console.error('Supabase client not initialized');
        showAlert('Database bağlantısı kurulamadı', 'error');
        return false;
    }
    return true;
}

// Update processRFIDScan with better error handling
async function processRFIDScan(rfidTag) {
    try {
        if (!ensureSupabase()) return;
        
        console.log('🔍 RFID Scanned:', rfidTag);
        showAlert(`RFID Tarandı: ${rfidTag}`, 'info', 2000);
        
        // Rest of your existing code...
    } catch (error) {
        console.error('RFID scan error:', error);
        showAlert('RFID okuma hatası: ' + error.message, 'error');
    }
}

// Make functions globally available - FIXED EXPORTS
window.populateStockTable = populateStockTable;
window.startRFIDScanner = startRFIDScanner;
window.stopRFIDScanner = stopRFIDScanner;
window.editRFIDStock = editRFIDStock;
window.assignRFIDTag = assignRFIDTag;
window.deleteRFIDStock = deleteRFIDStock;
window.updateRFIDStatus = updateRFIDStatus;



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
                    <button onclick="window.print()" style="padding: 13px 25px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
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
    console.log("🔴 STEP 4.1: addNewCustomer STARTED");
    
    const code = document.getElementById('newCustomerCode').value.trim();
    const name = document.getElementById('newCustomerName').value.trim();
    const email = document.getElementById('newCustomerEmail').value.trim();

    console.log("🔴 STEP 4.2: Form values - Code:'" + code + "', Name:'" + name + "', Email:'" + email + "'");

    // ✅ PROPER VALIDATION
    if (!code) {
        console.error("❌ Validation failed: Missing customer code");
        showAlert('Müşteri kodu giriniz!', 'error');
        document.getElementById('newCustomerCode').focus();
        return { success: false, error: 'Missing code' };
    }
    
    if (!name) {
        console.error("❌ Validation failed: Missing customer name");
        showAlert('Müşteri adı giriniz!', 'error');
        document.getElementById('newCustomerName').focus();
        return { success: false, error: 'Missing name' };
    }

    try {
        console.log("🔴 STEP 4.4: Getting workspace ID...");
        let workspaceId = getCurrentWorkspaceId();
        console.log("🔴 STEP 4.5: Workspace ID:", workspaceId, "Type:", typeof workspaceId);
        
        // ✅ BETTER FIX: Check specifically for "station-1" and other invalid values
        if (!workspaceId || workspaceId === "station-1" || workspaceId === "station-2" || workspaceId.length !== 36) {
            console.warn("⚠️ Invalid workspace ID '" + workspaceId + "', using default...");
            workspaceId = '00000000-0000-0000-0000-000000000000'; // Default workspace UUID
        }
        
        console.log("🔴 STEP 4.6: Using workspace ID:", workspaceId);

        console.log("🔴 STEP 4.7: Inserting customer to Supabase...");
        const { data, error } = await supabase
            .from('customers')
            .insert([{ 
                code, 
                name, 
                email: email || null,
                workspace_id: workspaceId
            }])
            .select();

        console.log("🔴 STEP 4.8: Supabase response - data:", data, "error:", error);

        if (error) {
            console.error('❌ STEP 4.9: Supabase insert error:', error);
            showAlert('Müşteri eklenirken hata: ' + error.message, 'error');
            return { success: false, error: error.message };
        }

        console.log("✅ STEP 4.10: Customer added successfully to database. Data:", data);
        showAlert('Müşteri başarıyla eklendi', 'success');
        
        // Clear form
        document.getElementById('newCustomerCode').value = '';
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerEmail').value = '';
        
        // Refresh lists
        console.log("🔴 STEP 4.11: Refreshing customer lists...");
        await populateCustomers();
        await showAllCustomers();
        
        console.log("✅ STEP 4.12: addNewCustomer COMPLETED SUCCESSFULLY");
        return { success: true, data: data };
        
    } catch (error) {
        console.error('❌ STEP 4.ERROR: Error in addNewCustomer:', error);
        showAlert('Müşteri ekleme hatası: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}
    async function deleteCustomer(customerId) {
    console.log("Deleting customer with id:", customerId); 
    console.log("Customer ID type:", typeof customerId);
    console.log("Customer ID length:", customerId ? customerId.length : 'null');
    
    // Better validation
    if (!customerId || customerId === '' || customerId === 'null' || customerId === 'undefined') {
        showAlert('Geçersiz müşteri ID! Silme işlemi yapılamıyor.', 'error');
        return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(customerId)) {
        console.error('Invalid UUID format:', customerId);
        showAlert('Geçersiz müşteri ID formatı!', 'error');
        return;
    }

    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;

    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) {
            console.error('Error deleting customer:', error);
            
            // Handle foreign key constraint errors
            if (error.code === '23503') {
                showAlert('Bu müşteriye ait kayıtlar bulunduğu için silinemez! Önce ilişkili paket ve barkodları silin.', 'error');
            } else {
                showAlert('Müşteri silinirken hata: ' + error.message, 'error');
            }
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
        const workspaceId = window.workspaceManager.currentWorkspace.id;
        
        // ✅ FIXED: Simple and reliable ID generation
        const { packageId, packageNo } = await generateUniquePackageWithValidation(workspaceId);
        
        const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);
        const selectedPersonnel = elements.personnelSelect?.value || '';

        // Enhanced package data with workspace info
        const packageData = {
            id: packageId,
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
            status: 'sevk-edildi',  // Auto-shipped on creation
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workspace_id: workspaceId,
            station_name: window.workspaceManager.currentWorkspace.name,
            daily_file: ExcelStorage.getTodayDateString(),
            source: 'app'
        };

        console.log('📦 Creating package with verified ID:', packageId);

        // Track this as shipped to prevent it loading back to pending
        shippedPackageIds.add(packageId);

        
        // Save based on connectivity and workspace settings
        if (supabase && navigator.onLine && !isUsingExcel) {
            try {
                const { data, error } = await supabase
                    .from('packages')
                    .insert([packageData])
                    .select();

                if (error) throw error;

                showAlert(`Paket oluşturuldu: ${packageNo} (${window.workspaceManager.currentWorkspace.name})`, 'success');
                await saveToExcel(packageData);
                
            } catch (supabaseError) {
                console.warn('Supabase save failed, saving to Excel:', supabaseError);
                await saveToExcel(packageData);
                addToSyncQueue('add', packageData);
                showAlert(`Paket Excel'e kaydedildi: ${packageNo} (${window.workspaceManager.currentWorkspace.name})`, 'warning');
                isUsingExcel = true;
            }
        } else {
            await saveToExcel(packageData);
            addToSyncQueue('add', packageData);
            showAlert(`Paket Excel'e kaydedildi: ${packageNo} (${window.workspaceManager.currentWorkspace.name})`, 'warning');
            isUsingExcel = true;
        }

        // Reset and refresh
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');
        await populatePackagesTable();
        updateStorageIndicator();

        // ✅ NEW: Force refresh shipping table to show new shipped packages
        if (typeof populateShippingTable === 'function') {
            await populateShippingTable();
        }

        // ✅ NEW: Reload shipped packages immediately
        if (supabase && navigator.onLine) {
            const { data: shippedPackages } = await supabase
                .from('packages')
                .select(`*, customers (name, code)`)
                .eq('status', 'sevk-edildi')
                .eq('workspace_id', workspaceId);
            
            if (shippedPackages) {
                window.shippedPackages = shippedPackages;
                console.log(`✅ Refreshed ${shippedPackages.length} shipped packages`);
            }
        }

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası: ' + error.message, 'error');
    }
}
// ✅ FIXED: Simple and reliable ID generation
async function generateUniquePackageWithValidation(workspaceId) {
    console.log('🔄 Generating package ID...');
    
    // Get or create counter
    let packageCounter = parseInt(localStorage.getItem(`pkg_counter_${workspaceId}`) || '0');
    packageCounter++;
    localStorage.setItem(`pkg_counter_${workspaceId}`, packageCounter.toString());

    // Generate IDs - SIMPLIFIED: No complex duplicate checking
    const packageId = generateUniquePackageUUID();
    const packageNo = `PKG-${workspaceId}-${packageCounter.toString().padStart(6, '0')}`;

    console.log(`✅ Generated: ${packageNo}`);
    console.log(`   UUID: ${packageId}`);
    
    // ✅ SIMPLE CHECK: Only check if package number exists in current Excel data
    const existingPackageNo = excelPackages.find(p => p.package_no === packageNo);
    if (existingPackageNo) {
        console.warn('⚠️ Package number exists in Excel, regenerating...');
        // Simple retry with incremented counter
        return generateUniquePackageWithValidation(workspaceId);
    }
    
    return { packageId, packageNo };
}

// ✅ PROPER UUID Generator
function generateUniquePackageUUID() {
    // Use browser's built-in UUID generator if available
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback to proper UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ✅ REMOVE these problematic functions - they're not needed anymore:
// - checkIfIdActuallyUsed() 
// - checkPackageIdUnique()

// If you need to keep them for other parts of your app, at least fix the Supabase query:
async function checkIfIdActuallyUsed(packageId, packageNo) {
    // 1. Check Excel packages (your main data source)
    const excelDuplicate = excelPackages.find(p => p.package_no === packageNo);
    if (excelDuplicate) {
        console.warn('❌ Duplicate package number in Excel data');
        return true;
    }
    
    // 2. Quick Supabase check - FIXED QUERY
    if (supabase && navigator.onLine) {
        try {
            const { data } = await supabase
                .from('packages')
                .select('package_no')
                .eq('package_no', packageNo)
                .eq('workspace_id', getCurrentWorkspaceId())
                .maybeSingle();
            
            if (data) {
                console.warn('❌ Duplicate package number in Supabase');
                return true;
            }
        } catch (error) {
            // Ignore Supabase errors - don't block package creation
            console.log('Supabase check skipped:', error.message);
        }
    }
    
    return false; // No duplicates found
}

// Also update the delete function to clean up IDs
async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

    try {
        const packageIds = Array.from(checkboxes).map(cb => cb.value);

        // Remove from createdPackageIds
        packageIds.forEach(id => {
            if (createdPackageIds.has(id)) {
                createdPackageIds.delete(id);
            }
        });

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

// Add this function to clean up old IDs periodically
function cleanupPackageIds() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Remove IDs older than 1 hour from memory cache
    for (let id of createdPackageIds) {
        if (id.includes('pkg-')) {
            const timestampMatch = id.match(/pkg-[^-]+-(\d+)-/);
            if (timestampMatch) {
                const packageTime = parseInt(timestampMatch[1]);
                if (packageTime < oneHourAgo) {
                    createdPackageIds.delete(id);
                }
            }
        }
    }
    
    console.log(`🧹 Cleaned up old package IDs. Current cache size: ${createdPackageIds.size}`);
}

// Run cleanup every hour
setInterval(cleanupPackageIds, 60 * 60 * 1000);


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
                    return packageData;
                }
                return null;
            })
            .filter(pkg => pkg !== null);
        
        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
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
                    customer: selectedCustomer?.name || selectedPackages[0]?.customer_name || '',
                    package_count: selectedPackages.length,
                    total_quantity: selectedPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                    status: 'beklemede',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            
            containerId = newContainer[0].id;
            currentContainer = containerNo;
            if (elements.containerNumber) {
                elements.containerNumber.textContent = containerNo;
            }
            saveAppState();
        }

        // ✅ DOĞRUDAN "sevk-edildi" DURUMUNA GÜNCELLE
        await updatePackageStatusToShippedDirect(selectedPackages, containerNo);

        showAlert(`${selectedPackages.length} paket konteynere eklendi ve sevk edildi (Konteyner: ${containerNo}) ✅`, 'success');
        
        // ✅ TABLOLARI GÜNCELLE
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler konteynere eklenirken hata oluştu: ' + error.message, 'error');
    }
}

async function updatePackageStatusToShippedDirect(packages, containerNo) {
    try {
        const packageIds = packages.map(pkg => pkg.id);
        
        console.log(`🚢 Directly shipping ${packageIds.length} packages to container: ${containerNo}`);
        
        // Update in Supabase
        if (supabase && navigator.onLine) {
            const { error } = await supabase
                .from('packages')
                .update({ 
                    status: 'sevk-edildi',
                    container_id: containerNo,
                    updated_at: new Date().toISOString()
                })
                .in('id', packageIds);
            
            if (error) throw error;
        }
        
        // Track as shipped to prevent loading back to pending
        packageIds.forEach(id => shippedPackageIds.add(id));
        
        // Update local packages array
        if (window.packages) {
            window.packages = window.packages.filter(pkg => !packageIds.includes(pkg.id));
        }
        
        console.log(`✅ ${packageIds.length} packages marked as shipped`);
        
    } catch (error) {
        console.error('Error updating package status:', error);
        throw error;
    }
}


// Paketleri doğrudan "sevk-edildi" durumuna güncelle
async function updatePackagesToShipped(packages, containerNo) {
    console.log(`🚀 Directly shipping ${packages.length} packages to container: ${containerNo}`);
    
    const packageIds = packages.map(pkg => pkg.id);
    
    try {
        // 1. ÖNCE EXCEL VERİLERİNİ GÜNCELLE
        const excelData = await ExcelJS.readFile();
        let excelUpdated = 0;
        
        const updatedExcelData = excelData.map(pkg => {
            if (packageIds.includes(pkg.id)) {
                excelUpdated++;
                return {
                    ...pkg,
                    status: 'sevk-edildi', // DOĞRUDAN SEVK EDİLDİ
                    container_id: containerNo,
                    updated_at: new Date().toISOString(),
                    shipped_at: new Date().toISOString()
                };
            }
            return pkg;
        });
        
        // Excel verilerini kaydet
        await ExcelJS.writeFile(updatedExcelData);
        excelPackages = updatedExcelData;
        
        console.log(`✅ Updated ${excelUpdated} packages in Excel to 'sevk-edildi'`);

        // 2. SUPABASE'DE GÜNCELLE (ÇEVRİMİÇİ İSE)
        if (supabase && navigator.onLine) {
            try {
                const { error } = await supabase
                    .from('packages')
                    .update({
                        status: 'sevk-edildi', // DOĞRUDAN SEVK EDİLDİ
                        container_id: containerNo,
                        updated_at: new Date().toISOString(),
                        shipped_at: new Date().toISOString()
                    })
                    .in('id', packageIds);

                if (error) {
                    console.error('❌ Supabase update error:', error);
                    // Hata durumunda sync kuyruğuna ekle
                    packages.forEach(pkg => {
                        addToSyncQueue('update', {
                            ...pkg,
                            status: 'sevk-edildi',
                            container_id: containerNo
                        });
                    });
                } else {
                    console.log(`✅ Updated ${packageIds.length} packages in Supabase to 'sevk-edildi'`);
                }
            } catch (supabaseError) {
                console.error('❌ Supabase update failed:', supabaseError);
                // Supabase hatasında Excel verisi zaten güncellendi
            }
        }

        // 3. LOCALSTORAGE'DA GÜNCELLE
        const localPackages = JSON.parse(localStorage.getItem('packages') || '[]');
        const updatedLocalPackages = localPackages.map(pkg => {
            if (packageIds.includes(pkg.id)) {
                return {
                    ...pkg,
                    status: 'sevk-edildi',
                    container_id: containerNo,
                    updated_at: new Date().toISOString()
                };
            }
            return pkg;
        });
        localStorage.setItem('packages', JSON.stringify(updatedLocalPackages));

        console.log(`🎯 Successfully shipped ${packageIds.length} packages to container ${containerNo}`);

    } catch (error) {
        console.error('❌ Error updating packages to shipped:', error);
        throw error;
    }
}


// Update package status when sent to shipping
async function updatePackageStatusToShipped(packageIds, containerNo) {
    console.log(`🔄 Updating ${packageIds.length} packages to shipped status...`);
    
    try {
        // Update in Excel data
        const excelData = await ExcelJS.readFile();
        let updatedCount = 0;
        
        const updatedData = excelData.map(pkg => {
            if (packageIds.includes(pkg.id)) {
                updatedCount++;
                return {
                    ...pkg,
                    status: 'sevk-edildi',
                    container_id: containerNo,
                    updated_at: new Date().toISOString(),
                    shipped_at: new Date().toISOString()
                };
            }
            return pkg;
        });
        
        // Save updated Excel data
        await ExcelJS.writeFile(updatedData);
        excelPackages = updatedData;
        
        console.log(`✅ Updated ${updatedCount} packages to shipped status`);
        
        // Update in Supabase if online
        if (supabase && navigator.onLine) {
            try {
                const { error } = await supabase
                    .from('packages')
                    .update({
                        status: 'sevk-edildi',
                        container_id: containerNo,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', packageIds);
                
                if (error) {
                    console.error('Supabase update error:', error);
                    // Add to sync queue for retry
                    packageIds.forEach(pkgId => {
                        const pkg = excelData.find(p => p.id === pkgId);
                        if (pkg) {
                            addToSyncQueue('update', {
                                ...pkg,
                                status: 'sevk-edildi',
                                container_id: containerNo
                            });
                        }
                    });
                } else {
                    console.log(`✅ Updated ${packageIds.length} packages in Supabase`);
                }
            } catch (supabaseError) {
                console.error('Supabase update failed:', supabaseError);
            }
        }
        
        return updatedCount;
        
    } catch (error) {
        console.error('Error updating package status:', error);
        return 0;
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



function handleSupabaseError(error, context) {
    console.error(`❌ Supabase Error in ${context}:`, error);
    
    if (error.code === '400') {
        console.error('Bad Request - Check query syntax and duplicate filters');
    } else if (error.code === '401') {
        showAlert('Yetkilendirme hatası. API anahtarını kontrol edin.', 'error');
    } else if (error.code === '422') {
        console.error('Validation Error - Check filter syntax');
    }
    
    // Fallback to Excel mode on critical errors
    if (['400', '401', '422'].includes(error.code)) {
        isUsingExcel = true;
        updateStorageIndicator();
    }
}



// Initialize the application with error handling
async function initializeApp() {
    try {
        console.log('🚀 Starting ProClean Application...');
        
        await initializeSupabase();
        await initializeExcelStorage();
        await loadExistingPackageIds();
        setupOfflineSupport();
        setupEnhancedSyncTriggers();
        updateStorageIndicator();
        
        console.log('✅ ProClean Application initialized successfully');
        
        // Show initial status
        if (isUsingExcel) {
            showAlert('Excel modu aktif - Çevrimdışı çalışıyorsunuz', 'info', 3000);
        } else {
            showAlert('Supabase bağlantısı başarılı - Çevrimiçi mod', 'success', 3000);
        }
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showAlert('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
    }
}

// Start the application
initializeApp();
