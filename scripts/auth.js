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
        return true;
    } catch (error) {
        console.warn(error.message);
        return false;
    }
}

// Safe element display setter with retry
async function safeSetElementDisplay(elementId, displayValue, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.style.display = displayValue;
        return true;
    } catch (error) {
        console.warn(error.message);
        return false;
    }
}

// Enhanced form validation
function validateForm(fields) {
    let isValid = true;
    
    if (!Array.isArray(fields)) {
        console.error('validateForm expects an array of field objects');
        return false;
    }
    
    fields.forEach(field => {
        const input = document.getElementById(field.id);
        const errorElement = document.getElementById(field.errorId);
        
        if (!input) {
            console.warn(`Input element ${field.id} not found`);
            return;
        }
        
        // Clear previous errors
        input.classList.remove('error', 'invalid');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        let hasError = false;
        let errorMessage = '';
        
        // Required field validation
        if (field.required && !input.value.trim()) {
            hasError = true;
            errorMessage = 'Bu alan zorunludur';
        } 
        // Email validation
        else if (field.type === 'email' && input.value.trim() && !isValidEmail(input.value)) {
            hasError = true;
            errorMessage = 'Geçerli bir email adresi girin';
        }
        // Number validation
        else if (field.type === 'number' && input.value.trim()) {
            const num = Number(input.value);
            if (isNaN(num) || num < 0) {
                hasError = true;
                errorMessage = 'Geçerli bir sayı girin';
            }
        }
        
        if (hasError) {
            isValid = false;
            input.classList.add('error', 'invalid');
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            }
        }
    });
    
    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Enhanced login function
async function login() {
    console.log('Login function called');
    
    // Check if Supabase is initialized
    if (!supabase) {
        console.log('Supabase client not initialized, attempting to initialize...');
        if (typeof initializeSupabase === 'function') {
            const client = initializeSupabase();
            if (!client) {
                showAlert('Lütfen önce API anahtarını girin.', 'error');
                if (typeof showApiKeyModal === 'function') {
                    showApiKeyModal();
                }
                return;
            }
        } else {
            showAlert('Supabase başlatılamadı', 'error');
            return;
        }
    }

    // Get form elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');

    if (!emailInput || !passwordInput) {
        console.error('Email or password inputs not found');
        showAlert('Form elementleri yüklenemedi. Sayfayı yenileyin.', 'error');
        return;
    }

    // Validate form
    const isFormValid = validateForm([
        { id: 'email', errorId: 'emailError', type: 'email', required: true },
        { id: 'password', errorId: 'passwordError', type: 'text', required: true }
    ]);

    if (!isFormValid) {
        console.log('Form validation failed');
        return;
    }

    // Disable login button and show loading state
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Giriş yapılıyor...';
    }

    try {
        console.log('Attempting Supabase login...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value.trim(),
        });

        if (error) {
            console.error('Login error:', error);
            showAlert(`Giriş başarısız: ${error.message}`, 'error');
            return;
        }

        if (data.user && data.user.email) {
            console.log('Login successful for user:', data.user.email);
            
            // Set current user
            currentUser = {
                email: data.user.email,
                uid: data.user.id,
                name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                role: 'operator' // Default role
            };

            // Try to get user details from personnel table
            try {
                const { data: userData, error: userError } = await supabase
                    .from('personnel')
                    .select('role, name')
                    .eq('email', data.user.email)
                    .single();

                if (!userError && userData) {
                    currentUser.name = userData.name || currentUser.name;
                    currentUser.role = userData.role || 'operator';
                }
            } catch (userDetailError) {
                console.warn('Could not fetch user details:', userDetailError);
                // Continue with default values
            }

            console.log('Current user set:', currentUser);
            showAlert('Giriş başarılı!', 'success');

            // Update UI - use promises to ensure proper sequencing
            await updateUIAfterLogin();

        } else {
            console.error('Login successful but no user data received');
            showAlert('Giriş başarısız. Lütfen tekrar deneyin.', 'error');
        }

    } catch (error) {
        console.error('Login process error:', error);
        showAlert('Giriş sırasında bir hata oluştu: ' + error.message, 'error');
    } finally {
        // Re-enable login button
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Giriş Yap';
        }
    }
}

// Separate function to handle UI updates after successful login
// Add this to the updateUIAfterLogin function in auth.js
async function updateUIAfterLogin() {
    try {
        // Update user role display
        await safeSetElementText('userRole', 
            `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`);

        // Hide login screen and show app container
        const loginHidden = await safeSetElementDisplay('loginScreen', 'none');
        const appShown = await safeSetElementDisplay('appContainer', 'flex');

        // IMPORTANT: After showing app container, retry finding missing elements
        setTimeout(() => {
            if (typeof initializeAppElements === 'function') {
                initializeAppElements();
            }
        }, 100);

        if (!loginHidden || !appShown) {
            console.warn('UI update may have failed, using fallback method');
            setTimeout(() => {
                const loginScreen = document.getElementById('loginScreen');
                const appContainer = document.getElementById('appContainer');
                
                if (loginScreen) loginScreen.style.display = 'none';
                if (appContainer) appContainer.style.display = 'flex';
                
                // Retry elements after showing container
                if (typeof initializeAppElements === 'function') {
                    initializeAppElements();
                }
            }, 500);
        }

        // Apply role-based permissions
        if (typeof applyRoleBasedPermissions === 'function') {
            applyRoleBasedPermissions(currentUser.role);
        }

        // Initialize application
        if (typeof initApp === 'function') {
            await initApp();
        }

    } catch (error) {
        console.error('UI update error:', error);
        showAlert('Arayüz güncellenirken hata oluştu', 'error');
    }
}




// Apply role-based permissions with better error handling
function applyRoleBasedPermissions(role) {
    // Wait for DOM elements to be available
    setTimeout(() => {
        try {
            const adminOnlyElements = document.querySelectorAll('.admin-only');
            
            if (role === 'admin') {
                adminOnlyElements.forEach(el => {
                    if (el) el.style.display = 'block';
                });
                console.log('Admin permissions applied');
            } else {
                adminOnlyElements.forEach(el => {
                    if (el) el.style.display = 'none';
                });
                console.log('Operator permissions applied');
            }
        } catch (error) {
            console.error('Error applying role permissions:', error);
        }
    }, 1000); // Increased delay to ensure elements are loaded
}

// Enhanced logout function
async function logout() {
    if (!supabase) {
        console.warn('Supabase not initialized, cannot logout properly');
        return;
    }
    
    try {
        console.log('Logging out user...');
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            showAlert('Çıkış yapılırken hata oluştu: ' + error.message, 'error');
            return;
        }

        // Clear current user
        currentUser = null;
        
        showAlert('Başarıyla çıkış yapıldı.', 'success');
        
        // Update UI
        await safeSetElementDisplay('loginScreen', 'flex');
        await safeSetElementDisplay('appContainer', 'none');
        
        // Clear form fields
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        console.log('Logout completed successfully');
        
    } catch (error) {
        console.error('Logout process error:', error);
        showAlert('Çıkış yapılırken bir hata oluştu', 'error');
    }
}

// Enhanced auth state listener setup
function setupAuthListener() {
    if (!supabase) {
        console.warn('Cannot setup auth listener: Supabase not initialized');
        return;
    }
    
    try {
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email || 'No user');
            
            if (session?.user) {
                // User is logged in
                currentUser = {
                    email: session.user.email,
                    uid: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    role: 'operator'
                };
                
                // Update UI for logged in state
                await safeSetElementText('userRole', `Operatör: ${currentUser.name}`);
                await safeSetElementDisplay('loginScreen', 'none');
                await safeSetElementDisplay('appContainer', 'flex');
                
                // Initialize app if not already done
                if (typeof initApp === 'function') {
                    initApp().catch(error => {
                        console.error('App initialization failed:', error);
                    });
                }
                
            } else {
                // User is logged out
                currentUser = null;
                
                // Update UI for logged out state
                await safeSetElementDisplay('loginScreen', 'flex');
                await safeSetElementDisplay('appContainer', 'none');
            }
        });
        
        console.log('Auth listener setup complete');
    } catch (error) {
        console.error('Error setting up auth listener:', error);
    }
}

// Load API key from localStorage
function loadApiKey() {
    try {
        const savedApiKey = localStorage.getItem('procleanApiKey');
        if (savedApiKey && savedApiKey.trim()) {
            SUPABASE_ANON_KEY = savedApiKey;
            console.log('API key loaded from localStorage');
            return true;
        } else {
            console.log('No valid API key found in localStorage');
            return false;
        }
    } catch (error) {
        console.error('Error loading API key:', error);
        return false;
    }
}

// Enhanced error handling for auth operations
function handleAuthError(error, context = 'Authentication') {
    console.error(`${context} error:`, error);
    
    let userMessage = `${context} sırasında bir hata oluştu.`;
    
    // Handle specific Supabase auth errors
    if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
            userMessage = 'Geçersiz email veya şifre.';
        } else if (error.message.includes('Email not confirmed')) {
            userMessage = 'Email adresinizi doğrulamanız gerekiyor.';
        } else if (error.message.includes('Too many requests')) {
            userMessage = 'Çok fazla deneme. Lütfen bir süre bekleyin.';
        } else if (error.message.includes('Network')) {
            userMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
        } else {
            userMessage += ' ' + error.message;
        }
    }
    
    showAlert(userMessage, 'error');
}

// Utility function to check if user is authenticated
function isUserAuthenticated() {
    return currentUser !== null && supabase !== null;
}

// Utility function to get current user role
function getCurrentUserRole() {
    return currentUser?.role || 'operator';
}

// Utility function to check if current user has admin privileges
function isCurrentUserAdmin() {
    return getCurrentUserRole() === 'admin';
}
