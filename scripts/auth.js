// scripts/auth.js

// Retry mechanism for DOM elements
function waitForElement(id, maxAttempts = 50, interval = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkElement = setInterval(() => {
            attempts++;
            const element = document.getElementById(id);
            if (element) {
                clearInterval(checkElement);
                resolve(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkElement);
                reject(new Error(`Element with ID '${id}' not found after ${maxAttempts} attempts`));
            }
        }, interval);
    });
}

// Safe element text setter with retry
async function safeSetElementText(elementId, text, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.textContent = text;
    } catch (error) {
        console.warn(error.message);
    }
}

// Safe element display setter with retry
async function safeSetElementDisplay(elementId, displayValue, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.style.display = displayValue;
    } catch (error) {
        console.warn(error.message);
    }
}

// FIXED: Kullanıcı girişi
// scripts/auth.js

async function login() {
    console.log('Login function called');
    
    // Supabase client'ı kontrol et ve gerekirse başlat
    if (!supabase) {
        console.log('Supabase client not initialized, initializing...');
        const client = initializeSupabase();
        if (!client) {
            showAlert('Lütfen önce API anahtarını girin.', 'error');
            showApiKeyModal();
            return;
        }
    }

    const email = document.getElementById('email');
    const password = document.getElementById('password');

    if (!email || !password) {
        console.error('Email or password inputs not found');
        showAlert('Form elementleri yüklenemedi. Sayfayı yenileyin.', 'error');
        return;
    }

    // Form doğrulama
    if (!validateForm([
        { id: 'email', errorId: 'emailError', type: 'email', required: true },
        { id: 'password', errorId: 'passwordError', type: 'text', required: true }
    ])) {
        console.log('Form validation failed');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Giriş yapılıyor...';
    }

    try {
        console.log('Attempting Supabase login...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.value,
            password: password.value,
        });

        if (error) {
            console.error('Login error:', error);
            showAlert(`Giriş başarısız: ${error.message}`, 'error');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Giriş Yap';
            }
            return;
        }

        if (data.user && data.user.email) {
            console.log('Login successful, user:', data.user.email);
            
            // Kullanıcı rolünü al
            try {
                const { data: userData, error: userError } = await supabase
                    .from('personnel')
                    .select('role, name')
                    .eq('email', data.user.email)
                    .single();

                if (userError) {
                    console.warn('User details error:', userError);
                    currentUser = {
                        email: data.user.email,
                        uid: data.user.id,
                        name: data.user.email.split('@')[0],
                        role: 'operator'
                    };
                } else if (userData) {
                    currentUser = {
                        email: data.user.email,
                        uid: data.user.id,
                        name: userData.name || data.user.email.split('@')[0],
                        role: userData.role || 'operator'
                    };
                }
                
                console.log('Current user set:', currentUser);

            } catch (userError) {
                console.error('Error fetching user details:', userError);
                currentUser = {
                    email: data.user.email,
                    uid: data.user.id,
                    name: data.user.email.split('@')[0],
                    role: 'operator'
                };
            }

            // UI updates with retry mechanism
            let retries = 0;
            const maxRetries = 10;
            
            const updateUI = setInterval(async () => {
                retries++;
                
                const userRoleUpdated = await safeSetElementText('userRole', 
                    `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`);
                
                const loginScreenHidden = await safeSetElementDisplay('loginScreen', 'none');
                const appContainerShown = await safeSetElementDisplay('appContainer', 'flex');
                
                if ((userRoleUpdated && loginScreenHidden && appContainerShown) || retries >= maxRetries) {
                    clearInterval(updateUI);
                    
                    if (retries >= maxRetries) {
                        console.warn('UI update failed after max retries');
                        // Force show the app container as fallback
                        document.body.innerHTML = '';
                        document.body.innerHTML = '<div style="padding:20px;font-family:Arial;">Uygulama yükleniyor... Eğer bu mesaj görünmeye devam ederse, sayfayı yenileyin.</div>';
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    } else {
                        console.log('UI updated successfully');
                        showAlert('Giriş başarılı!', 'success');
                        
                        // Rol bazlı yetkilendirme
                        applyRoleBasedPermissions(currentUser.role);
                        
                        // Bağlantı testini arka planda yap
                        testConnection();
                        
                        // Uygulamayı başlat
                        try {
                            await initApp();
                        } catch (initError) {
                            console.error('App initialization failed:', initError);
                        }
                    }
                }
            }, 300); // Check every 300ms

        } else {
            console.error('Login successful but no user data');
            showAlert('Giriş başarısız. Lütfen tekrar deneyin.', 'error');
        }

    } catch (e) {
        console.error('Login process error:', e);
        showAlert('Giriş sırasında bir hata oluştu.', 'error');
    } finally {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Giriş Yap';
        }
    }
}


function applyRoleBasedPermissions(role) {
    // Bu fonksiyonun çalışması için elementlerin yüklenmesini bekle
    setTimeout(() => {
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        
        if (role === 'admin') {
            adminOnlyElements.forEach(el => {
                if (el) el.style.display = 'block';
            });
        } else {
            adminOnlyElements.forEach(el => {
                if (el) el.style.display = 'none';
            });
        }
    }, 500); // 500ms gecikme
}

// Kullanıcı çıkışı
async function logout() {
    if (!supabase) return;
    
    try {
        await supabase.auth.signOut();
        showAlert('Başarıyla çıkış yapıldı.', 'success');
        
        await safeSetElementDisplay('loginScreen', 'flex');
        await safeSetElementDisplay('appContainer', 'none');
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
    } catch (e) {
        console.error('Çıkış yapılırken bir hata oluştu:', e);
        showAlert('Çıkış yapılırken bir hata oluştu.', 'error');
    }
}

// Initialize auth state listener
function setupAuthListener() {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user');
        
        if (session) {
            currentUser = {
                email: session.user.email,
                uid: session.user.id,
                name: session.user.email.split('@')[0]
            };
            
            await safeSetElementText('userRole', `Operatör: ${currentUser.name}`);
            await safeSetElementDisplay('loginScreen', "none");
            await safeSetElementDisplay('appContainer', "flex");
            
            initApp();
        } else {
            await safeSetElementDisplay('loginScreen', "flex");
            await safeSetElementDisplay('appContainer', "none");
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
