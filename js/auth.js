async function login(emailParam = null, passwordParam = null) {
    console.log("🔐 LOGIN FUNCTION START - Parameters:", { emailParam, passwordParam });
    
    // Use parameters if provided, otherwise get from input fields
    const email = emailParam || document.getElementById('email').value;
    const password = passwordParam || document.getElementById('password').value;

    console.log("🔐 FINAL CREDENTIALS:", { 
        email: email ? "***" + email.substring(3) : "empty", 
        password: password ? "***" + password.substring(3) : "empty" 
    });

    // ✅ Check if Supabase is initialized
    if (!supabase) {
        console.error("❌ Supabase not initialized");
        showAlert('Sistem başlatılıyor, lütfen bekleyin...', 'error');
        return false;
    }
    console.log("✅ Supabase initialized");

    // Form doğrulama - only validate if using input fields
    if (!emailParam && !passwordParam) {
        console.log("🔐 Validating form inputs");
        if (!validateForm([
            { id: 'email', errorId: 'emailError', type: 'email', required: true },
            { id: 'password', errorId: 'passwordError', type: 'text', required: true }
        ])) {
            console.error("❌ Form validation failed");
            return false;
        }
        console.log("✅ Form validation passed");
    } else {
        // Validate parameters directly
        console.log("🔐 Validating parameters directly");
        if (!email || !password) {
            console.error("❌ Parameter validation failed - missing email or password");
            showAlert('E-posta ve şifre gereklidir', 'error');
            return false;
        }
        if (!isValidEmail(email)) {
            console.error("❌ Parameter validation failed - invalid email");
            showAlert('Geçerli bir e-posta adresi girin', 'error');
            return false;
        }
        console.log("✅ Parameter validation passed");
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Giriş yapılıyor...';
    console.log("✅ Login button state updated");

    try {
        console.log("🔐 Attempting Supabase authentication...");
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        console.log("🔐 Supabase response:", { 
            hasData: !!data, 
            hasUser: !!(data && data.user),
            hasError: !!error,
            error: error ? error.message : 'none'
        });

        if (error) {
            console.error("❌ Supabase auth error:", error);
            showAlert('Giriş başarısız: ' + error.message, 'error');
            return false;
        }

        if (data.user && data.user.email) {
            console.log("✅ User authenticated:", data.user.email);
            
            // Kullanıcı rolünü al
            console.log("🔐 Fetching user role...");
            const { data: userData, error: userError } = await supabase
                .from('personnel')
                .select('role, name')
                .eq('email', data.user.email)
                .single();

            console.log("🔐 User role response:", { 
                userData, 
                userError: userError ? userError.message : 'none' 
            });

            currentUser = {
                email: data.user.email,
                uid: data.user.id,
                name: userData?.name || data.user.email.split('@')[0],
                role: userData?.role || 'operator'
            };

            console.log("🔐 Current user set:", currentUser);

            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent =
                    `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
                console.log("✅ User role updated in UI");
            } else {
                console.warn("⚠️ User role element not found");
            }

            // Rol bazlı yetkilendirme
            if (typeof applyRoleBasedPermissions === 'function') {
                console.log("🔐 Applying role-based permissions");
                applyRoleBasedPermissions(currentUser.role);
            } else {
                console.warn("⚠️ applyRoleBasedPermissions function not found");
            }

            showAlert('Giriş başarılı!', 'success');
            console.log("✅ Success alert shown");

            // ✅ Remember Me / Fast Login logic
            const rememberCheckbox = document.getElementById('rememberMe');
            if (rememberCheckbox && rememberCheckbox.checked) {
                console.log("💾 Saving credentials for remember me");
                const SECRET_KEY = "ProCleanAutoSecureKey2025";

                const encEmail = CryptoJS.AES.encrypt(email, SECRET_KEY).toString();
                const encPassword = CryptoJS.AES.encrypt(password, SECRET_KEY).toString();

                localStorage.setItem("savedEmail", encEmail);
                localStorage.setItem("savedPassword", encPassword);
                localStorage.setItem("rememberMe", "true");
                console.log("✅ Credentials saved");
            } else {
                console.log("🗑️ Not saving credentials");
                localStorage.removeItem("savedEmail");
                localStorage.removeItem("savedPassword");
                localStorage.setItem("rememberMe", "false");
            }

            console.log("🔄 Switching to app interface...");
            const loginScreen = document.getElementById('loginScreen');
            const appContainer = document.getElementById('appContainer');
            
            console.log("🔐 UI Elements:", {
                loginScreen: !!loginScreen,
                appContainer: !!appContainer,
                loginScreenDisplay: loginScreen ? loginScreen.style.display : 'not found',
                appContainerDisplay: appContainer ? appContainer.style.display : 'not found'
            });

            if (loginScreen && appContainer) {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';
                console.log("✅ UI switched to app");
                
                // Force a reflow and check
                setTimeout(() => {
                    console.log("🔐 Final UI State:", {
                        loginScreenDisplay: loginScreen.style.display,
                        appContainerDisplay: appContainer.style.display
                    });
                }, 100);
            } else {
                console.error("❌ UI elements not found for switching");
            }

            // Test connection only once after login
            if (!connectionTested) {
                console.log("🔐 Testing connection...");
                await testConnection();
                connectionTested = true;
            }

            // Storage indicator'ı güncelle
            if (typeof updateStorageIndicator === 'function') {
                updateStorageIndicator();
                console.log("✅ Storage indicator updated");
            }

            console.log("✅ LOGIN COMPLETED SUCCESSFULLY");
            return true;

        } else {
            console.error("❌ No user data returned from Supabase");
            showAlert('Giriş başarısız.', 'error');
            return false;
        }

    } catch (e) {
        console.error('❌ Login error:', e);
        showAlert('Giriş sırasında bir hata oluştu.', 'error');
        return false;
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Giriş Yap';
        console.log("✅ Login button reset");
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
            // First: try to upload to Supabase
            const uploadedToServer = await uploadExcelToSupabase(currentPackages);
            if (uploadedToServer) {
                // Notify server upload success
                showAlert('Excel dosyası servere yüklendi.', 'success');
            } else {
                showAlert('Excel dosyası servere yüklenemedi.', 'error');
            }

            // Second: try to send to main PC (network)
            const sentToMainPC = await sendExcelToMainPC(currentPackages);
            if (sentToMainPC) {
                showAlert('Excel dosyası ana bilgisayara gönderildi.', 'success');
            } else {
                showAlert('Excel dosyası ana bilgisayara gönderilemedi. Manuel taşıma gerekli.', 'warning');
            }

            // If both actions succeeded, clear local Excel file
            if (uploadedToServer && sentToMainPC) {
                showAlert('Dosyalar temizleniyor ve çıkış yapılıyor.', 'info');
                
                // LocalStorage backup (still keep a time-stamped backup)
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

                showAlert('Yerel Excel dosyaları temizlendi.', 'success');
            } else {
                // At least preserve a backup; do NOT delete files if either action failed
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const reportData = {
                    fileName: `rapor_backup_${timestamp}.json`,
                    date: new Date().toISOString(),
                    packages: currentPackages,
                    packageCount: currentPackages.length,
                    totalQuantity: currentPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                    uploadedToServer,
                    sentToMainPC
                };
                localStorage.setItem(`report_backup_${timestamp}`, JSON.stringify(reportData));
                showAlert('Dosyalar yerel olarak yedeklendi; otomatik silme yapılmadı.', 'warning');
            }
        } else {
            showAlert('Yedeklenecek Excel verisi bulunamadı.', 'info');
        }

        // Perform logout after attempting above actions
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
        // Use upsert behavior: if file exists, overwrite (some clients use upsert flag)
        const { data, error } = await supabase.storage
            .from('reports') // Make sure this bucket exists!
            .upload(fileName, blob);

        if (error) {
            console.error("Supabase storage upload error:", error);
            
            // Fallback: Try to insert as records in a table
            const dbResult = await uploadAsDatabaseRecords(packages, timestamp);
            if (dbResult) {
                showAlert('Excel dosyası veritabanına yedeklendi (fallback).', 'info');
                return true;
            }
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

// Fixed: Send Excel file to Main PC via Electron network share, WebDAV, backend or fallback to download
async function sendExcelToMainPC(packages) {
    try {
        // Create the Excel data (professional)
        const excelData = ProfessionalExcelExport.convertToProfessionalExcel(packages);
        
        if (!excelData || excelData.length === 0) {
            console.log("No data to send to main PC");
            return false;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ProClean_Rapor_${timestamp}.xlsx`;

        // 1) Try Electron network save first
        if (window.electronAPI) {
            try {
                console.log('🔄 Attempting network save via Electron...');
                const result = await window.electronAPI.saveExcelToNetwork(excelData, fileName);
                
                if (result && result.success) {
                    console.log('✅ Excel file sent to network share via Electron');
                    showAlert(`Excel dosyası ana bilgisayara gönderildi: ${fileName}`, 'success');
                    return true;
                } else {
                    console.log('❌ Electron network save failed or returned false, trying fallback methods...');
                }
            } catch (e) {
                console.warn('Electron network save exception:', e);
            }
        }

        // 2) Try WebDAV attempts (if some WebDAV service exposes the share)
        try {
            const webdavOk = await sendViaWebDAV(excelData, packages);
            if (webdavOk) {
                // sendViaWebDAV already shows success alert
                return true;
            }
        } catch (e) {
            console.warn('WebDAV attempt failed:', e);
        }

        // 3) Try backend endpoint that can write to network share
        try {
            const fetchOk = await sendViaFetch(excelData, packages);
            if (fetchOk) {
                return true;
            }
        } catch (e) {
            console.warn('Backend send attempt failed:', e);
        }

        // 4) Final fallback: Browser download (user must manually copy to share)
        console.log('🌐 Not in Electron or remote save failed, using browser download');
        ProfessionalExcelExport.exportToProfessionalExcel(packages, fileName);
        showNetworkShareInstructions();
        showAlert('Excel dosyası indirildi; lütfen ana bilgisayara manuel olarak taşıyın.', 'warning');
        return false;
        
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
        
        // WebDAV URL format for Windows share - replace with correct reachable URLs
        const webdavUrls = [
            `http://MAIN-PC/SharedReports/${fileName}`,
            `http://192.168.1.100/SharedReports/${fileName}`
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
                    showAlert(`Excel dosyası ana bilgisayara gönderildi: ${fileName}`, 'success');
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

// Method 2: Fetch API with authentication (backend-assisted)
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
            showAlert(`Excel dosyası ana bilgisayara gönderildi: ${fileName}`, 'success');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("Fetch API transfer error:", error);
        return false;
    }
}

// Method 3: Show instructions for manual network share setup (unchanged)
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

// Simplified and more reliable performLogout (unchanged)
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

// FIXED: Update login function to apply user permissions without breaking parameters
const originalLogin = login;
login = async function(emailParam = null, passwordParam = null) {
    await originalLogin(emailParam, passwordParam);
    
    // Only apply permissions if login was successful
    if (currentUser) {
        UserManager.applyUserPermissions();
    }
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



// Add this function to check current UI state
function debugUIState() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    console.log("🔍 CURRENT UI STATE:", {
        loginScreen: {
            exists: !!loginScreen,
            display: loginScreen ? loginScreen.style.display : 'N/A',
            computedDisplay: loginScreen ? window.getComputedStyle(loginScreen).display : 'N/A'
        },
        appContainer: {
            exists: !!appContainer,
            display: appContainer ? appContainer.style.display : 'N/A',
            computedDisplay: appContainer ? window.getComputedStyle(appContainer).display : 'N/A'
        }
    });
}

// Call this in console anytime: debugUIState()
