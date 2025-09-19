// FIXED: Kullanıcı girişi
async function login() {
    // Supabase client'ı kontrol et ve gerekirse başlat
    if (!supabase) {
        const client = initializeSupabase();
        if (!client) {
            showAlert('Lütfen önce API anahtarını girin.', 'error');
            showApiKeyModal();
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
            showAlert(`Giriş başarısız: ${error.message}`, 'error');
            return;
        }

        if (data.user && data.user.email) {
            // Kullanıcı rolünü al
            const { data: userData, error: userError } = await supabase
                .from('personnel')
                .select('role, name')
                .eq('email', data.user.email)
                .single();

            if (!userError && userData) {
                currentUser = {
                    email: data.user.email,
                    uid: data.user.id,
                    name: userData.name || data.user.email.split('@')[0],
                    role: userData.role
                };
            } else {
                currentUser = {
                    email: data.user.email,
                    uid: data.user.id,
                    name: data.user.email.split('@')[0],
                    role: 'operator' // Varsayılan rol
                };
            }

            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent = 
                    `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
            }
            
            // Rol bazlı yetkilendirme (eğer fonksiyon mevcutsa)
            if (typeof applyRoleBasedPermissions === 'function') {
                applyRoleBasedPermissions(currentUser.role);
            }
            
            showAlert('Giriş başarılı!', 'success');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            
            // Bağlantı testini arka planda yap
            testConnection();
        } else {
            showAlert('Giriş başarısız. Lütfen tekrar deneyin.', 'error');
        }

    } catch (e) {
        console.error('Login error:', e);
        showAlert('Giriş sırasında bir hata oluştu.', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Giriş Yap';
    }
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
    if (!supabase) return;
    
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

// Initialize auth state listener
function setupAuthListener() {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user');
        
        if (session) {
            currentUser = {
                email: session.user.email,
                uid: session.user.id,
                name: session.user.email.split('@')[0]
            };
            
            document.getElementById('userRole').textContent = `Operatör: ${currentUser.name}`;
            document.getElementById('loginScreen').style.display = "none";
            document.getElementById('appContainer').style.display = "flex";
            
            initApp();
        } else {
            document.getElementById('loginScreen').style.display = "flex";
            document.getElementById('appContainer').style.display = "none";
        }
    });
}

// Load API key from localStorage
function loadApiKey() {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        return true;
    }
    return false;
}
