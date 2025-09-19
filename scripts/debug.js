/// scripts/auth.js

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
