const ExcelJS = require('exceljs'); // Node/Electron
const fs = require('fs');           // Needed to write files to Main PC

// FIXED: Kullanıcı girişi
let connectionTested = false; // Flag to prevent duplicate connection tests

// FIXED: Kullanıcı girişi
async function login() {
    // Supabase client'ı kontrol et ve gerekirse başlat
    if (!supabase) {
        const client = initializeSupabase();
        if (!client) {
            showAlert('Supabase bağlantısı yok. Excel modunda devam ediliyor.', 'warning');
            // Excel modunda devam et
            isUsingExcel = true;
            proceedWithExcelMode();
            return;
        }
    }

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Form doğrulama
    if (!validateForm([
        { id: 'email', errorId: 'emailError', type: 'email', required: true },
        { id: 'password', errorId: 'passwordError', type: 'text', required: true }
    ])) {
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Giriş yapılıyor...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            // Giriş başarısız olursa Excel modunda devam et
            console.warn('Login failed, continuing with Excel mode:', error.message);
            showAlert('Giriş başarısız. Excel modunda devam ediliyor.', 'warning');
            isUsingExcel = true;
            proceedWithExcelMode();
            return;
        }

        if (data.user && data.user.email) {
            // Kullanıcı rolünü al
            const { data: userData, error: userError } = await supabase
                .from('personnel')
                .select('role, name')
                .eq('email', data.user.email)
                .single();

            currentUser = {
                email: data.user.email,
                uid: data.user.id,
                name: userData?.name || data.user.email.split('@')[0],
                role: userData?.role || 'operator'
            };

            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent = 
                    `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
            }

            // Rol bazlı yetkilendirme
            if (typeof applyRoleBasedPermissions === 'function') {
                applyRoleBasedPermissions(currentUser.role);
            }

            showAlert('Giriş başarılı!', 'success');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';

            // Test connection only once after login
            if (!connectionTested) {
                await testConnection();
                connectionTested = true;
            }

            // Storage indicator'ı güncelle
            updateStorageIndicator();

        } else {
            showAlert('Giriş başarısız. Excel modunda devam ediliyor.', 'warning');
            isUsingExcel = true;
            proceedWithExcelMode();
        }

    } catch (e) {
        console.error('Login error:', e);
        showAlert('Giriş sırasında bir hata oluştu. Excel modunda devam ediliyor.', 'warning');
        isUsingExcel = true;
        proceedWithExcelMode();
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Giriş Yap';
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

async function logoutWithConfirmation() {
    const confirmation = confirm(
        "Çıkış yapmak üzeresiniz. Excel dosyası raporlar sayfasına taşınacak, " +
        "Sunucu ve Ana bilgisayara gönderilecek ve mevcut veriler temizlenecek. " +
        "Devam etmek istiyor musunuz?"
    );
    
    if (!confirmation) return;

    try {
        showAlert("Excel dosyası aktarılıyor...", "info");
        
        // Get current Excel data
        const currentPackages = await ExcelJS.readFile();
        
        if (currentPackages.length > 0) {
            // Upload to Supabase
            await uploadExcelToSupabase(currentPackages);

            // Send to Main PC
            await sendExcelToMainPC(currentPackages);
            
            // LocalStorage backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportFileName = `rapor_${timestamp}.json`;
            localStorage.setItem(`report_${timestamp}`, JSON.stringify({
                fileName: reportFileName,
                date: new Date().toISOString(),
                packages: currentPackages,
                packageCount: currentPackages.length,
                totalQuantity: currentPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0)
            }));

            // Clear local Excel
            await ExcelJS.writeFile([]);
            excelPackages = [];

            showAlert("Excel dosyası Supabase ve Ana PC'ye gönderildi, raporlara taşındı", "success");
        }

        // Perform logout
        await performLogout();

    } catch (error) {
        console.error("Logout error:", error);
        showAlert("Logout işlemi sırasında hata oluştu", "error");
    }
}


async function uploadExcelToSupabase(packages) {
    if (!supabase || !navigator.onLine) {
        console.log("Supabase not available, skipping upload");
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Rapor");

        // Header row
        sheet.addRow(["Ürün", "Miktar", "Tarih"]);

        // Add package rows
        packages.forEach(pkg => {
            sheet.addRow([
                pkg.product_name || "",
                pkg.total_quantity || 0,
                new Date().toLocaleString()
            ]);
        });

        // Write workbook to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Create Blob for Supabase
        const fileBlob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${timestamp}.xlsx`;

        const { data, error } = await supabase.storage
            .from('reports')
            .upload(fileName, fileBlob);

        if (error) throw error;

        console.log("Excel backup uploaded to Supabase:", fileName);
        return true;
    } catch (error) {
        console.error("Supabase upload error:", error);
        return false;
    }
}


async function sendExcelToMainPC(packages) {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Rapor");

        sheet.addRow(["Ürün", "Miktar", "Tarih"]);
        packages.forEach(pkg => {
            sheet.addRow([
                pkg.product_name || "",
                pkg.total_quantity || 0,
                new Date().toLocaleString()
            ]);
        });

        // Convert to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Define network path (must be shared folder)
        const sharedPath = "\\\\MAIN-PC\\SharedReports"; // Replace MAIN-PC with your actual PC name or IP
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `${sharedPath}\\rapor_${timestamp}.xlsx`;

        // Write file using fs
        fs.writeFileSync(filePath, Buffer.from(buffer));

        console.log("Excel file sent to Main PC:", filePath);
        return true;
    } catch (err) {
        console.error("Main PC transfer error:", err);
        return false;
    }
}



// Perform actual logout
async function performLogout() {
    try {
        // Clear app state
        clearAppState();
        
        // Clear authentication
        if (supabase) {
            const { error } = await supabase.auth.signOut();
            if (error) console.error("Sign out error:", error);
        }
        
        // Reset global variables
        selectedCustomer = null;
        currentPackage = {};
        currentContainer = null;
        selectedProduct = null;
        currentUser = null;
        scannedBarcodes = [];
        
        // Show login screen
        document.getElementById('loginScreen').style.display = "flex";
        document.getElementById('appContainer').style.display = "none";
        
        showAlert("Başarıyla çıkış yapıldı", "success");
        
    } catch (error) {
        console.error("Logout error:", error);
        showAlert("Çıkış yapılırken hata oluştu", "error");
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
