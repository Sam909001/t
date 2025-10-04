// FIXED: Kullanıcı girişi
let connectionTested = false; // Flag to prevent duplicate connection tests

// FIXED: Kullanıcı girişi
// FIXED: Kullanıcı girişi - UPDATED VERSION with Session Management
async function login() {
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    // Supabase client'ı kontrol et ve gerekirse başlat
    if (!window.supabase) {
        const client = window.initializeSupabase();
        if (!client) {
            window.showAlert('Supabase bağlantısı yok. Excel modunda devam ediliyor.', 'warning');
            window.isUsingExcel = true;
            window.proceedWithExcelMode();
            return;
        }
    }

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Form doğrulama
    if (!window.validateForm([
        { id: 'email', errorId: 'emailError', type: 'email', required: true },
        { id: 'password', errorId: 'passwordError', type: 'text', required: true }
    ])) {
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Giriş yapılıyor...';

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            // Giriş başarısız olursa Excel modunda devam et
            console.warn('Login failed, continuing with Excel mode:', error.message);
            window.showAlert('Giriş başarısız. Excel modunda devam ediliyor.', 'warning');
            window.isUsingExcel = true;
            window.proceedWithExcelMode();
            return;
        }

        if (data.user && data.user.email) {
            // Set remember me preference
            if (typeof SessionManager !== 'undefined') {
                SessionManager.setRememberMe(rememberMe);
                
                // Save session if remember me is checked
                if (rememberMe && data.session) {
                    await SessionManager.saveSession(data.session);
                }

                // Use the session manager to handle successful login
                await SessionManager.handleSuccessfulLogin(data.user);
            } else {
                // Fallback to original login flow if SessionManager not available
                await handleSuccessfulLoginLegacy(data.user);
            }
            
            window.showAlert('Giriş başarılı!', 'success');

        } else {
            window.showAlert('Giriş başarısız. Excel modunda devam ediliyor.', 'warning');
            window.isUsingExcel = true;
            window.proceedWithExcelMode();
        }

    } catch (e) {
        console.error('Login error:', e);
        window.showAlert('Giriş sırasında bir hata oluştu. Excel modunda devam ediliyor.', 'warning');
        window.isUsingExcel = true;
        window.proceedWithExcelMode();
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Giriş Yap';
    }
}

// Fallback function if SessionManager is not available
async function handleSuccessfulLoginLegacy(user) {
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

// Excel modunda devam et
function proceedWithExcelMode() {
    isUsingExcel = true;
    
    // Kullanıcıyı Excel modunda giriş yapmış say
    currentUser = {
        email: 'excel-user@local',
        uid: 'excel-local',
        name: 'Excel Kullanıcısı',
        role: 'operator'
    };

    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        userRoleElement.textContent = 'Operatör: Excel Modu';
    }

    showAlert('Excel modunda çalışıyorsunuz', 'info');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    // Storage indicator'ı güncelle
    updateStorageIndicator();
    
    // Excel verilerini yükle
    initializeExcelStorage().then(() => {
        populatePackagesTable();
    });
}

function applyRoleBasedPermissions(role) {
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    
    if (role === 'admin') {
        adminOnlyElements.forEach(el => el.style.display = 'block');
    } else {
        adminOnlyElements.forEach(el => el.style.display = 'none');
    }
}

// Enhanced logout function with proper Excel upload
async function logoutWithConfirmation() {
    const confirmation = confirm(
        "Çıkış yapmak üzeresiniz. Excel dosyası raporlar sayfasına taşınacak, " +
        "Server ve Ana bilgisayara gönderilecek ve mevcut veriler temizlenecek. " +
        "Devam etmek istiyor musunuz?"
    );
    
    if (!confirmation) return;

    try {
        showAlert("Excel dosyası aktarılıyor...", "info");
        
        // Get current Excel data
        const currentPackages = await ExcelJS.readFile();
        
        if (currentPackages.length > 0) {
            // Upload to Supabase using professional export
            await uploadExcelToSupabase(currentPackages);

            // Send to Main PC (browser download as fallback)
            await sendExcelToMainPC(currentPackages);
            
            // LocalStorage backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportData = {
                fileName: `rapor_${timestamp}.json`,
                date: new Date().toISOString(),
                packages: currentPackages,
                packageCount: currentPackages.length,
                totalQuantity: currentPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0)
            };
            
            localStorage.setItem(`report_${timestamp}`, JSON.stringify(reportData));

            // Clear local Excel
            await ExcelJS.writeFile([]);
            excelPackages = [];

            showAlert("Excel dosyası başarıyla yedeklendi ve raporlara taşındı", "success");
        }

        // Perform logout
        await performLogout();

    } catch (error) {
        console.error("Logout error:", error);
        showAlert("Logout işlemi sırasında hata oluştu: " + error.message, "error");
    }
} // FIXED: Added missing closing brace

// Fixed: Upload Excel data to Supabase storage
async function uploadExcelToSupabase(packages) {
    if (!supabase || !navigator.onLine) {
        console.log("Supabase not available, skipping upload");
        return false;
    }

    try {
        // Use the existing ProfessionalExcelExport functionality
        const excelData = ProfessionalExcelExport.convertToProfessionalExcel(packages);
        
        if (!excelData || excelData.length === 0) {
            console.log("No data to upload");
            return false;
        }

        // Create CSV content (more reliable than XLSX in browser)
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
            .from('reports') // Make sure this bucket exists!
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

// Fallback: Upload packages as database records
async function uploadAsDatabaseRecords(packages, timestamp) {
    try {
        const backupData = {
            id: `backup-${timestamp}`,
            backup_date: new Date().toISOString(),
            package_count: packages.length,
            total_quantity: packages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
            packages_data: packages,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('package_backups') // Make sure this table exists!
            .insert([backupData]);

        if (error) throw error;
        
        console.log("Packages backed up to database table");
        return true;
        
    } catch (dbError) {
        console.error("Database backup also failed:", dbError);
        return false;
    }
}

// Fixed: Send Excel file to Main PC via Electron network share
// Fixed: Send Excel file to Main PC via Electron network share
async function sendExcelToMainPC(packages) {
    try {
        // Create the Excel data
        const excelData = ProfessionalExcelExport.convertToProfessionalExcel(packages);
        
        if (!excelData || excelData.length === 0) {
            console.log("No data to send to main PC");
            return false;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ProClean_Rapor_${timestamp}.xlsx`;

        // Try Electron network save first
        if (window.electronAPI) {
            console.log('🔄 Attempting network save via Electron...');
            const result = await window.electronAPI.saveExcelToNetwork(excelData, fileName);
            
            if (result.success) {
                console.log('✅ Excel file sent to network share via Electron');
                showAlert(`Excel dosyası ana bilgisayara gönderildi: ${fileName}`, 'success');
                return true;
            } else {
                console.log('❌ Network save failed, trying local save...');
                
                // Fallback: Save locally and show instructions
                const localResult = await window.electronAPI.saveExcelLocal(excelData, fileName);
                if (localResult.success) {
                    showAlert(`Excel dosyası kaydedildi: ${localResult.path}`, 'info');
                    showNetworkShareInstructions(localResult.path);
                } else {
                    showNetworkShareInstructions();
                }
                return false;
            }
        } else {
            // Not in Electron - use browser download
            console.log('🌐 Not in Electron, using browser download');
            ProfessionalExcelExport.exportToProfessionalExcel(packages, fileName);
            showNetworkShareInstructions();
            return false;
        }
        
    } catch (err) {
        console.error("Main PC transfer error:", err);
        showAlert("Ağ paylaşımı hatası: " + err.message, 'error');
        showNetworkShareInstructions();
        return false;
    }
}
// Method 1: WebDAV approach for Windows shares
async function sendViaWebDAV(excelData, packages) {
    try {
        // Convert to CSV for simpler transfer
        const headers = Object.keys(excelData[0]);
        const csvContent = [
            headers.join(','),
            ...excelData.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ProClean_Rapor_${timestamp}.csv`;
        
        // WebDAV URL format for Windows share
        // Replace with your actual network path
        const webdavUrls = [
            `http://MAIN-PC/SharedReports/${fileName}`,
            `http://192.168.1.100/SharedReports/${fileName}`, // Use actual IP
            `file://///MAIN-PC/SharedReports/${fileName}`
        ];

        for (const url of webdavUrls) {
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    body: blob,
                    headers: {
                        'Content-Type': 'text/csv'
                    },
                    mode: 'cors',
                    credentials: 'include'
                });

                if (response.ok) {
                    console.log("File sent to main PC via WebDAV:", url);
                    showAlert(`Dosya ana bilgisayara gönderildi: ${fileName}`, 'success');
                    return true;
                }
            } catch (e) {
                console.log(`WebDAV attempt failed for ${url}:`, e.message);
            }
        }
        
        return false;
    } catch (error) {
        console.error("WebDAV transfer error:", error);
        return false;
    }
}

// Method 2: Fetch API with authentication
async function sendViaFetch(excelData, packages) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ProClean_Rapor_${timestamp}.csv`;

        // You'll need a backend endpoint that can write to network shares
        const response = await fetch('/api/save-to-network', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: fileName,
                data: excelData,
                packages: packages,
                workspace: getCurrentWorkspaceName(),
                timestamp: timestamp
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log("File sent via backend API:", result);
            showAlert(`Dosya ana bilgisayara gönderildi: ${fileName}`, 'success');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("Fetch API transfer error:", error);
        return false;
    }
}

// Method 3: Show instructions for manual network share setup
// Enhanced network instructions
function showNetworkShareInstructions(filePath = null) {
    const instructions = filePath ? `
        AĞ PAYLAŞIMINA MANUEL TAŞIMA GEREKİYOR

        DOSYA KONUMU: ${filePath}

        AŞAĞIDAKİ ADIMLARI İZLEYİN:
        1. Yukarıdaki dosya konumunu açın
        2. Dosyayı kopyalayın
        3. Ağ paylaşımına yapıştırın: \\\\MAIN-PC\\SharedReports

        OTOMATİK GÖNDERİM: Ağ bağlantısı kurulamadı
    ` : `
        OTOMATİK GÖNDERİLEMEDİ - MANUEL KOPYALAMA GEREKİYOR

        AŞAĞIDAKİ ADIMLARI İZLEYİN:
        1. Excel dosyası bilgisayarınıza indirildi
        2. Dosya konumunu açın
        3. Dosyayı kopyalayın
        4. Ağ paylaşımına yapıştırın: \\\\MAIN-PC\\SharedReports
    `;

    // Show detailed instructions to user
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h2 style="color: #d35400; margin-top: 0;">⚠️ Manuel Dosya Transferi Gerekli</h2>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
                <pre style="white-space: pre-wrap; font-family: Arial; font-size: 14px; color: #856404;">${instructions}</pre>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1rem;">
                <button onclick="downloadExcelForManualTransfer()" class="btn btn-primary">
                    <i class="fas fa-download"></i> Excel'i İndir
                </button>
                <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">Kapat</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Download Excel for manual transfer
async function downloadExcelForManualTransfer() {
    const currentPackages = await ExcelJS.readFile();
    if (currentPackages.length > 0) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `ProClean_Rapor_${date}_${getCurrentWorkspaceName()}.xlsx`;
        ProfessionalExcelExport.exportToProfessionalExcel(currentPackages, filename);
    }
}

// Simplified and more reliable performLogout
async function performLogout() {
    console.log('🔧 performLogout called');
    
    try {
        // Step 1: Try to sync any pending changes
        if (supabase && navigator.onLine && excelSyncQueue.length > 0) {
            console.log('🔄 Syncing pending changes...');
            showAlert("Bekleyen değişiklikler senkronize ediliyor...", "info");
            await syncExcelWithSupabase();
        }

        // Step 2: Clear authentication
        console.log('🔒 Signing out from Supabase...');
        if (supabase) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("❌ Sign out error:", error);
            } else {
                console.log('✅ Signed out from Supabase');
            }
        }

        // Step 3: Reset global variables
        console.log('🔄 Resetting global variables...');
        selectedCustomer = null;
        currentPackage = {};
        currentContainer = null;
        selectedProduct = null;
        currentUser = null;
        scannedBarcodes = [];
        excelPackages = [];
        excelSyncQueue = [];
        connectionTested = false;
        
        // Step 4: Clear sensitive data from localStorage (keep only essential)
        console.log('🗑️ Clearing localStorage...');
        const keysToKeep = ['proclean_workspaces', 'workspace_printer_configs', 'procleanSettings'];
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && !keysToKeep.includes(key) && !key.startsWith('report_')) {
                localStorage.removeItem(key);
            }
        }

        // Step 5: Switch to login screen
        console.log('🔄 Switching to login screen...');
        document.getElementById('loginScreen').style.display = "flex";
        document.getElementById('appContainer').style.display = "none";
        
        // Step 6: Clear any intervals or timeouts
        console.log('🔄 Cleaning up intervals...');
        if (window.autoRefreshManager) {
            window.autoRefreshManager.stop();
        }
        
        // Step 7: Reset form fields
        console.log('🔄 Resetting form fields...');
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
        console.log('✅ Logout completed successfully');
        showAlert("Başarıyla çıkış yapıldı", "success");
        
    } catch (error) {
        console.error("❌ performLogout error:", error);
        // Force logout even if there are errors
        document.getElementById('loginScreen').style.display = "flex";
        document.getElementById('appContainer').style.display = "none";
        showAlert("Çıkış yapıldı", "info");
    }
}

// Replace existing logout functionality
function setupEnhancedLogout() {
    // Find and replace any existing logout buttons
    const logoutButtons = document.querySelectorAll('[onclick*="logout"], [onclick*="signOut"]');
    logoutButtons.forEach(btn => {
        btn.onclick = logoutWithConfirmation;
    });
    
    // Also add to settings if not exists
    if (!document.getElementById('enhancedLogoutBtn')) {
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'enhancedLogoutBtn';
            logoutBtn.className = 'btn btn-danger';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Çıkış Yap';
            logoutBtn.onclick = logoutWithConfirmation;
            settingsPanel.appendChild(logoutBtn);
        }
    }
}

// Basit form doğrulama fonksiyonu
function validateForm(fields) {
    let valid = true;

    fields.forEach(field => {
        const el = document.getElementById(field.id);
        const errorEl = document.getElementById(field.errorId);
        if (!el) return;

        let value = el.value.trim();

        // Temel kontrol
        if (field.required && value === '') {
            valid = false;
            if (errorEl) errorEl.textContent = 'Bu alan zorunludur.';
        } else if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                valid = false;
                if (errorEl) errorEl.textContent = 'Geçerli bir e-posta giriniz.';
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        } else {
            if (errorEl) errorEl.textContent = '';
        }
    });

    return valid;
}

// Missing function stubs - add these if they don't exist
function clearAppState() {
    // Clear any app-specific state if needed
    console.log('🧹 Clearing app state...');
}

// Simple AuditLogger stub
const AuditLogger = {
    log: (event, data) => {
        console.log(`🔍 Audit: ${event}`, data);
    }
};

// Simple ErrorHandler stub  
const ErrorHandler = {
    handle: (error, context) => {
        console.error(`❌ Error in ${context}:`, error);
        showAlert(`${context} sırasında hata oluştu: ${error.message}`, 'error');
    }
};

// Simple UXEnhancements stub
const UXEnhancements = {
    showConfirmation: (message) => {
        return Promise.resolve(confirm(message));
    }
};

// Enhanced user management system
class UserManager {
    static ROLES = {
        ADMIN: 'admin',
        MANAGER: 'manager',
        OPERATOR: 'operator',
        VIEWER: 'viewer'
    };

    static PERMISSIONS = {
        [this.ROLES.ADMIN]: [
            'create_package', 'view_packages', 'edit_package', 'delete_package',
            'ship_packages', 'view_containers', 'manage_stock', 'view_reports',
            'generate_reports', 'manage_users', 'system_settings'
        ],
        [this.ROLES.MANAGER]: [
            'create_package', 'view_packages', 'edit_package', 'delete_package',
            'ship_packages', 'view_containers', 'manage_stock', 'view_reports',
            'generate_reports'
        ],
        [this.ROLES.OPERATOR]: [
            'create_package', 'view_packages', 'edit_package', 'ship_packages',
            'view_containers'
        ],
        [this.ROLES.VIEWER]: [
            'view_packages', 'view_containers', 'view_reports'
        ]
    };

    static async getCurrentUserRole() {
        // In a real application, this would come from your backend
        // For now, we'll use localStorage with a fallback
        const savedRole = localStorage.getItem('proclean_user_role');
        return savedRole || this.ROLES.OPERATOR;
    }

    static async setUserRole(email, role) {
        if (!Object.values(this.ROLES).includes(role)) {
            throw new Error('Geçersiz kullanıcı rolü');
        }

        // Store in localStorage (in real app, this would be in your database)
        localStorage.setItem(`proclean_role_${email}`, role);
        
        // If it's the current user, update immediately
        if (currentUser && currentUser.email === email) {
            localStorage.setItem('proclean_user_role', role);
            this.applyUserPermissions();
        }

        AuditLogger.log('user_role_changed', { email, role });
    }

    static async hasPermission(permission) {
        const userRole = await this.getCurrentUserRole();
        const permissions = this.PERMISSIONS[userRole] || [];
        return permissions.includes(permission) || permissions.includes('all');
    }

    static applyUserPermissions() {
        this.hideUnauthorizedElements();
        this.disableUnauthorizedActions();
        this.updateUIForRole();
    }

    static hideUnauthorizedElements() {
        const elementsToHide = {
            [this.ROLES.VIEWER]: [
                '[onclick="completePackage()"]',
                '[onclick="deleteSelectedPackages()"]',
                '[onclick="showAllCustomers()"]',
                '[onclick="createNewContainer()"]',
                '.admin-only'
            ],
            [this.ROLES.OPERATOR]: [
                '.admin-only'
            ]
        };

        const currentRole = localStorage.getItem('proclean_user_role') || this.ROLES.OPERATOR;
        const elements = elementsToHide[currentRole] || [];

        elements.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        });
    }

    static disableUnauthorizedActions() {
        // This would disable buttons and inputs based on permissions
    }

    static updateUIForRole() {
        const role = localStorage.getItem('proclean_user_role') || this.ROLES.OPERATOR;
        const roleElement = document.getElementById('userRole');
        if (roleElement) {
            const roleLabels = {
                [this.ROLES.ADMIN]: 'Yönetici',
                [this.ROLES.MANAGER]: 'Müdür',
                [this.ROLES.OPERATOR]: 'Operatör',
                [this.ROLES.VIEWER]: 'Görüntüleyici'
            };
            roleElement.textContent = `${roleLabels[role]}: ${currentUser?.name || 'Kullanıcı'}`;
        }
    }

    static showUserManagement() {
        if (!this.hasPermission('manage_users')) {
            showAlert('Kullanıcı yönetimi için yetkiniz bulunmuyor', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
            align-items: center; z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin-top: 0;">Kullanıcı Yönetimi</h2>
                
                <div style="margin-bottom: 2rem;">
                    <h3>Yeni Kullanıcı Ekle</h3>
                    <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; margin-bottom: 1rem;">
                        <input type="email" id="newUserEmail" placeholder="E-posta adresi" style="padding: 8px;">
                        <select id="newUserRole" style="padding: 8px;">
                            <option value="${this.ROLES.OPERATOR}">Operatör</option>
                            <option value="${this.ROLES.MANAGER}">Müdür</option>
                            <option value="${this.ROLES.ADMIN}">Yönetici</option>
                            <option value="${this.ROLES.VIEWER}">Görüntüleyici</option>
                        </select>
                        <button onclick="UserManager.addUser()" class="btn btn-primary">Ekle</button>
                    </div>
                </div>
                
                <div>
                    <h3>Mevcut Kullanıcılar</h3>
                    <div id="usersList" style="max-height: 400px; overflow-y: auto;">
                        <!-- Users will be populated here -->
                    </div>
                </div>
                
                <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">Kapat</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.populateUsersList();
    }

    static async populateUsersList() {
        // In a real app, this would fetch from your backend
        // For now, we'll show current user and any stored roles
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        const users = [];
        
        // Add current user
        if (currentUser) {
            users.push({
                email: currentUser.email,
                role: await this.getCurrentUserRole()
            });
        }

        // Add any other users from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('proclean_role_')) {
                const email = key.replace('proclean_role_', '');
                const role = localStorage.getItem(key);
                users.push({ email, role });
            }
        }

        usersList.innerHTML = users.map(user => `
            <div style="display: flex; justify-content: between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="flex: 1;">
                    <strong>${user.email}</strong>
                    <br>
                    <small style="color: #666;">${this.getRoleLabel(user.role)}</small>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select onchange="UserManager.updateUserRole('${user.email}', this.value)" 
                            style="padding: 5px;" ${user.email === currentUser?.email ? 'disabled' : ''}>
                        ${Object.values(this.ROLES).map(role => `
                            <option value="${role}" ${role === user.role ? 'selected' : ''}>
                                ${this.getRoleLabel(role)}
                            </option>
                        `).join('')}
                    </select>
                    <button onclick="UserManager.removeUser('${user.email}')" 
                            class="btn btn-danger btn-sm"
                            ${user.email === currentUser?.email ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p style="text-align: center; color: #666;">Kullanıcı bulunamadı</p>';
    }

    static getRoleLabel(role) {
        const labels = {
            [this.ROLES.ADMIN]: 'Yönetici',
            [this.ROLES.MANAGER]: 'Müdür',
            [this.ROLES.OPERATOR]: 'Operatör',
            [this.ROLES.VIEWER]: 'Görüntüleyici'
        };
        return labels[role] || role;
    }

    static async addUser() {
        const emailInput = document.getElementById('newUserEmail');
        const roleSelect = document.getElementById('newUserRole');
        
        const email = emailInput.value.trim();
        const role = roleSelect.value;

        if (!email) {
            showAlert('Lütfen e-posta adresi girin', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            showAlert('Geçerli bir e-posta adresi girin', 'error');
            return;
        }

        try {
            await this.setUserRole(email, role);
            emailInput.value = '';
            this.populateUsersList();
            showAlert('Kullanıcı eklendi', 'success');
        } catch (error) {
            ErrorHandler.handle(error, 'Kullanıcı ekleme');
        }
    }

    static async updateUserRole(email, newRole) {
        try {
            await this.setUserRole(email, newRole);
            showAlert('Kullanıcı rolü güncellendi', 'success');
        } catch (error) {
            ErrorHandler.handle(error, 'Kullanıcı rolü güncelleme');
        }
    }

    static async removeUser(email) {
        if (email === currentUser?.email) {
            showAlert('Kendi kullanıcınızı silemezsiniz', 'error');
            return;
        }

        const confirmed = await UXEnhancements.showConfirmation(
            `${email} kullanıcısını silmek istediğinize emin misiniz?`
        );

        if (!confirmed) return;

        localStorage.removeItem(`proclean_role_${email}`);
        this.populateUsersList();
        showAlert('Kullanıcı silindi', 'success');
        
        AuditLogger.log('user_removed', { email });
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
}

// Update login function to apply user permissions
const originalLogin = login;
login = async function() {
    await originalLogin();
    UserManager.applyUserPermissions();
};

// Update workspace permissions to also check user permissions
const originalCanPerformAction = WorkspaceManager.prototype.canPerformAction;
WorkspaceManager.prototype.canPerformAction = async function(action) {
    // Check workspace permissions first
    const workspaceAllowed = originalCanPerformAction.call(this, action);
    if (!workspaceAllowed) return false;

    // Then check user permissions
    return await UserManager.hasPermission(action);
};
