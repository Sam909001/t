// Authentication management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authCallbacks = [];
    }

    // Setup authentication state listener
    setupAuthListener() {
        const supabase = DatabaseManager.getClient();
        if (!supabase) {
            console.warn('Cannot setup auth listener: Database not initialized');
            return;
        }

        try {
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state change:', event, session?.user?.email || 'No user');
                
                if (session?.user) {
                    await this.handleUserLogin(session.user);
                } else {
                    await this.handleUserLogout();
                }
            });
            
            console.log('Auth listener setup complete');
        } catch (error) {
            console.error('Error setting up auth listener:', error);
        }
    }

    // Handle user login
    async handleUserLogin(user) {
        try {
            // Set basic user info
            this.currentUser = {
                email: user.email,
                uid: user.id,
                name: user.user_metadata?.full_name || user.email.split('@')[0],
                role: 'operator' // Default role
            };

            // Try to get additional user details from personnel table
            try {
                const userData = await DatabaseManager.query('personnel', 'select', {
                    columns: 'role, name',
                    filter: { email: user.email }
                });

                if (userData && userData.length > 0) {
                    this.currentUser.name = userData[0].name || this.currentUser.name;
                    this.currentUser.role = userData[0].role || 'operator';
                }
            } catch (userDetailError) {
                console.warn('Could not fetch user details:', userDetailError);
            }

            console.log('User logged in:', this.currentUser);

            // Notify app of login
            if (typeof app !== 'undefined' && app.onUserLogin) {
                await app.onUserLogin(this.currentUser);
            }

            // Call auth callbacks
            this.notifyAuthCallbacks('login', this.currentUser);

        } catch (error) {
            console.error('Error handling user login:', error);
            NotificationManager.showAlert('Kullanıcı bilgileri yüklenirken hata oluştu', 'error');
        }
    }

    // Handle user logout
    async handleUserLogout() {
        console.log('User logged out');
        
        const previousUser = this.currentUser;
        this.currentUser = null;

        // Notify app of logout
        if (typeof app !== 'undefined' && app.onUserLogout) {
            app.onUserLogout();
        }

        // Call auth callbacks
        this.notifyAuthCallbacks('logout', previousUser);
    }

    // Login function
    async login() {
        console.log('Login function called');
        
        if (!DatabaseManager.isReady()) {
            console.log('Database not ready, showing API key modal');
            ModalManager.showApiKeyModal();
            return;
        }

        // Get form elements
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');

        if (!emailInput || !passwordInput) {
            console.error('Email or password inputs not found');
            NotificationManager.showAlert('Form elementleri yüklenemedi. Sayfayı yenileyin.', 'error');
            return;
        }

        // Validate form
        ValidationManager.addRule('email', ValidationRules.email);
        ValidationManager.addRule('password', ValidationRules.required);

        const validation = ValidationManager.validateFields(['email', 'password']);
        if (!validation.isValid) {
            console.log('Form validation failed');
            return;
        }

        // Show loading state
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Giriş yapılıyor...';
        }

        try {
            console.log('Attempting Supabase login...');
            const supabase = DatabaseManager.getClient();
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailInput.value.trim(),
                password: passwordInput.value.trim(),
            });

            if (error) {
                console.error('Login error:', error);
                NotificationManager.showAlert(`Giriş başarısız: ${error.message}`, 'error');
                return;
            }

            if (data.user && data.user.email) {
                console.log('Login successful for user:', data.user.email);
                // Auth state change will handle the rest
            } else {
                console.error('Login successful but no user data received');
                NotificationManager.showAlert('Giriş başarısız. Lütfen tekrar deneyin.', 'error');
            }

        } catch (error) {
            console.error('Login process error:', error);
            NotificationManager.showAlert('Giriş sırasında bir hata oluştu: ' + error.message, 'error');
        } finally {
            // Re-enable login button
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Giriş Yap';
            }
        }
    }

    // Logout function
    async logout() {
        if (!DatabaseManager.isReady()) {
            console.warn('Database not ready, performing local logout');
            await this.handleUserLogout();
            return;
        }
        
        try {
            console.log('Logging out user...');
            const supabase = DatabaseManager.getClient();
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
                NotificationManager.showAlert('Çıkış yapılırken hata oluştu: ' + error.message, 'error');
                return;
            }

            NotificationManager.showAlert('Başarıyla çıkış yapıldı.', 'success');
            console.log('Logout completed successfully');
            
        } catch (error) {
            console.error('Logout process error:', error);
            NotificationManager.showAlert('Çıkış yapılırken bir hata oluştu', 'error');
            // Force local logout
            await this.handleUserLogout();
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Check if current user has admin role
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // Add authentication callback
    addAuthCallback(callback) {
        this.authCallbacks.push(callback);
    }

    // Remove authentication callback
    removeAuthCallback(callback) {
        const index = this.authCallbacks.indexOf(callback);
        if (index > -1) {
            this.authCallbacks.splice(index, 1);
        }
    }

    // Notify all auth callbacks
    notifyAuthCallbacks(event, user) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('Error in auth callback:', error);
            }
        });
    }

    // Check if user has permission for action
    hasPermission(action) {
        if (!this.currentUser) return false;

        const adminActions = [
            'manage_customers',
            'view_reports',
            'manage_personnel',
            'system_settings'
        ];

        if (adminActions.includes(action)) {
            return this.currentUser.role === 'admin';
        }

        // Default permissions for operators
        const operatorActions = [
            'create_package',
            'update_package',
            'view_packages',
            'manage_stock',
            'print_labels'
        ];

        return operatorActions.includes(action);
    }

    // Require permission for action
    requirePermission(action) {
        if (!this.hasPermission(action)) {
            NotificationManager.showAlert('Bu işlem için yetkiniz bulunmuyor', 'error');
            throw new Error(`Permission denied for action: ${action}`);
        }
    }

    // Password reset
    async resetPassword(email) {
        if (!DatabaseManager.isReady()) {
            NotificationManager.showAlert('Veritabanı bağlantısı gerekli', 'error');
            return false;
        }

        try {
            const supabase = DatabaseManager.getClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) {
                console.error('Password reset error:', error);
                NotificationManager.showAlert('Şifre sıfırlama e-postası gönderilemedi', 'error');
                return false;
            }

            NotificationManager.showAlert('Şifre sıfırlama e-postası gönderildi', 'success');
            return true;
        } catch (error) {
            console.error('Password reset process error:', error);
            NotificationManager.showAlert('Şifre sıfırlama işleminde hata oluştu', 'error');
            return false;
        }
    }

    // Update user profile
    async updateProfile(updates) {
        if (!this.currentUser) {
            throw new Error('User not logged in');
        }

        if (!DatabaseManager.isReady()) {
            NotificationManager.showAlert('Veritabanı bağlantısı gerekli', 'error');
            return false;
        }

        try {
            const supabase = DatabaseManager.getClient();
            
            // Update auth profile if needed
            if (updates.email || updates.password) {
                const authUpdates = {};
                if (updates.email) authUpdates.email = updates.email;
                if (updates.password) authUpdates.password = updates.password;

                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            // Update personnel table if needed
            if (updates.name || updates.role) {
                const personnelUpdates = {};
                if (updates.name) personnelUpdates.name = updates.name;
                if (updates.role) personnelUpdates.role = updates.role;

                await DatabaseManager.query('personnel', 'update', {
                    data: personnelUpdates,
                    filter: { email: this.currentUser.email }
                });
            }

            // Update local user object
            if (updates.name) this.currentUser.name = updates.name;
            if (updates.role) this.currentUser.role = updates.role;
            if (updates.email) this.currentUser.email = updates.email;

            NotificationManager.showAlert('Profil güncellendi', 'success');
            return true;
        } catch (error) {
            console.error('Profile update error:', error);
            NotificationManager.showAlert('Profil güncellenemedi: ' + error.message, 'error');
            return false;
        }
    }

    // Session management
    async refreshSession() {
        if (!DatabaseManager.isReady()) return false;

        try {
            const supabase = DatabaseManager.getClient();
            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                console.error('Session refresh error:', error);
                return false;
            }

            console.log('Session refreshed successfully');
            return true;
        } catch (error) {
            console.error('Session refresh process error:', error);
            return false;
        }
    }

    // Get session info
    async getSession() {
        if (!DatabaseManager.isReady()) return null;

        try {
            const supabase = DatabaseManager.getClient();
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    }
}

// Create global instance
window.AuthManager = new AuthManager();
