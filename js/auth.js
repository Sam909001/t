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

// Kullanıcı çıkışı
function logout() {
    if (!supabase) {
        // Excel modundan çıkış
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        showAlert('Excel modundan çıkış yapıldı.', 'success');
        return;
    }
    
    supabase.auth.signOut().then(() => {
        showAlert('Başarıyla çıkış yapıldı.', 'success');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }).catch(e => {
        console.error('Çıkış yapılırken bir hata oluştu:', e);
        showAlert('Çıkış yapılırken bir hata oluştu.', 'error');
    });
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
