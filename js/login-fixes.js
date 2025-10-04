// login-fixes.js - Critical fixes for login functionality

// Add missing functions that are called in handleLogin
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function switchToAppView() {
    console.log('🔄 Switching to app view...');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    // Initialize app components
    if (typeof initializeApp === 'function') {
        initializeApp();
    }
    
    // Load initial data
    if (typeof loadInitialData === 'function') {
        loadInitialData();
    }
}

function switchToLoginView() {
    console.log('🔄 Switching to login view...');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Clear form fields
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    
    // Reset remember me checkbox if exists
    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe) {
        rememberMe.checked = false;
    }
}

// Enhanced handleLogin function with better error handling
async function handleLogin() {
    console.log('🔐 Login attempt started...');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    // Basic validation
    if (!email || !password) {
        showAlert('Lütfen e-posta ve şifre girin.', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showAlert('Lütfen geçerli bir e-posta adresi girin.', 'error');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    
    try {
        // Show loading state
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';
        
        showAlert('Giriş yapılıyor...', 'info');

        // Check if Supabase is initialized
        if (!window.supabase) {
            console.error('❌ Supabase not initialized');
            showAlert('Veritabanı bağlantısı kurulamadı. Lütfen API anahtarını kontrol edin.', 'error');
            
            // Show API key modal
            showApiKeyModal();
            return;
        }

        console.log('🔐 Attempting Supabase login...');
        
        // Attempt login with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('❌ Login error:', error);
            throw error;
        }

        console.log('✅ Login successful:', data.user.email);
        
        // Save credentials if remember me is checked
        if (window.electronLoginManager) {
            await electronLoginManager.saveCredentials(email, rememberMe);
            if (rememberMe) {
                await electronLoginManager.enableAutoLogin();
            }
            console.log('🔐 Credentials saved for remember me');
        }

        // Set current user
        currentUser = {
            email: data.user.email,
            uid: data.user.id,
            name: data.user.email.split('@')[0], // Default name
            role: 'operator' // Default role
        };

        // Try to get user role from personnel table
        try {
            const { data: userData, error: userError } = await supabase
                .from('personnel')
                .select('role, name')
                .eq('email', data.user.email)
                .single();

            if (userData && !userError) {
                currentUser.name = userData.name || currentUser.name;
                currentUser.role = userData.role || currentUser.role;
            }
        } catch (userErr) {
            console.log('⚠️ Could not fetch user details, using defaults:', userErr.message);
        }

        // Update UI with user info
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = 
                `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
        }

        // Apply role-based permissions
        if (typeof applyRoleBasedPermissions === 'function') {
            applyRoleBasedPermissions(currentUser.role);
        }

        showAlert('Başarıyla giriş yapıldı!', 'success');
        
        // Switch to app view
        switchToAppView();
        
    } catch (error) {
        console.error('❌ Login failed:', error);
        
        let errorMessage = 'Giriş başarısız: ';
        
        switch (error.message) {
            case 'Invalid login credentials':
                errorMessage += 'Geçersiz e-posta veya şifre.';
                break;
            case 'Email not confirmed':
                errorMessage += 'E-posta adresiniz doğrulanmamış.';
                break;
            case 'User not found':
                errorMessage += 'Kullanıcı bulunamadı.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert(errorMessage, 'error');
        
        // Fallback to Excel mode if Supabase fails
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            showAlert('Sunucuya bağlanılamıyor. Excel modunda devam ediliyor...', 'warning');
            proceedWithExcelMode();
        }
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
    }
}

// Enhanced Excel mode fallback
function proceedWithExcelMode() {
    console.log('📊 Proceeding with Excel mode...');
    
    isUsingExcel = true;
    
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

    showAlert('Excel modunda çalışıyorsunuz. Veriler yerel olarak kaydedilecek.', 'info');
    
    // Switch to app view
    switchToAppView();
    
    // Initialize Excel storage
    if (typeof initializeExcelStorage === 'function') {
        initializeExcelStorage().then(() => {
            if (typeof populatePackagesTable === 'function') {
                populatePackagesTable();
            }
        });
    }
}

// Initialize login functionality when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Initializing login system...');
    
    // Ensure login button has correct event listener
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && !loginBtn.onclick) {
        loginBtn.onclick = handleLogin;
    }
    
    // Also allow form submission with Enter key
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput && passwordInput) {
        const handleEnterKey = function(event) {
            if (event.key === 'Enter') {
                handleLogin();
            }
        };
        
        emailInput.addEventListener('keypress', handleEnterKey);
        passwordInput.addEventListener('keypress', handleEnterKey);
    }
    
    console.log('✅ Login system initialized');
});

// Simple applyRoleBasedPermissions function if it doesn't exist
if (typeof applyRoleBasedPermissions !== 'function') {
    function applyRoleBasedPermissions(role) {
        console.log(`🔐 Applying permissions for role: ${role}`);
        
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        
        if (role === 'admin') {
            adminOnlyElements.forEach(el => {
                el.style.display = 'block';
            });
        } else {
            adminOnlyElements.forEach(el => {
                el.style.display = 'none';
            });
        }
    }
}
