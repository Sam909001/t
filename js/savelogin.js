// savelogin.js - Remember Me functionality for ProClean

class LoginManager {
    constructor() {
        this.rememberMeKey = 'proclean_remember_me';
        this.credentialsKey = 'proclean_saved_credentials';
        this.autoLoginKey = 'proclean_auto_login';
        this.isInitialized = false;
    }

    // Initialize the login manager
    init() {
        if (this.isInitialized) return;
        
        console.log('🔐 LoginManager initializing...');
        this.setupLoginForm();
        this.checkSavedCredentials();
        this.isInitialized = true;
    }

    // Setup the login form with remember me checkbox
    setupLoginForm() {
        const loginForm = document.querySelector('.login-form');
        if (!loginForm) {
            console.warn('Login form not found');
            return;
        }

        // Add remember me checkbox to the login form
        const rememberMeHtml = `
            <div class="form-group remember-me-group">
                <label class="remember-me-label">
                    <input type="checkbox" id="rememberMe" class="remember-me-checkbox">
                    <span class="checkmark"></span>
                    Beni Hatırla
                </label>
            </div>
        `;

        // Insert before the login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.insertAdjacentHTML('beforebegin', rememberMeHtml);
        }

        // Add styles for remember me checkbox
        this.addRememberMeStyles();
    }

    // Add CSS styles for remember me checkbox
    addRememberMeStyles() {
        const styles = `
            <style>
                .remember-me-group {
                    margin: 1rem 0;
                }
                
                .remember-me-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: #555;
                }
                
                .remember-me-checkbox {
                    margin-right: 8px;
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }
                
                .checkmark {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    background: white;
                    border: 2px solid #ddd;
                    border-radius: 3px;
                    margin-right: 8px;
                    position: relative;
                    transition: all 0.3s ease;
                }
                
                .remember-me-checkbox:checked + .checkmark {
                    background: #3498db;
                    border-color: #3498db;
                }
                
                .remember-me-checkbox:checked + .checkmark::after {
                    content: '✓';
                    position: absolute;
                    color: white;
                    font-size: 12px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                
                .remember-me-checkbox {
                    display: none;
                }
                
                .quick-login-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    margin-top: 10px;
                    width: 100%;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .quick-login-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                .quick-login-btn:active {
                    transform: translateY(0);
                }
                
                .saved-user-info {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                    text-align: center;
                }
                
                .saved-user-email {
                    font-weight: 500;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                
                .saved-user-timestamp {
                    font-size: 0.8rem;
                    color: #7f8c8d;
                }
                
                .clear-saved-login {
                    background: none;
                    border: none;
                    color: #e74c3c;
                    cursor: pointer;
                    font-size: 0.8rem;
                    text-decoration: underline;
                    margin-top: 8px;
                }
                
                .clear-saved-login:hover {
                    color: #c0392b;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Check if credentials are saved and setup auto-login
    async checkSavedCredentials() {
        try {
            const saved = this.getSavedCredentials();
            if (saved && saved.email && saved.rememberMe) {
                console.log('🔐 Saved credentials found');
                this.showQuickLoginOption(saved);
                
                // Auto-login if enabled
                if (this.shouldAutoLogin()) {
                    console.log('🔐 Auto-login enabled, attempting login...');
                    await this.attemptAutoLogin(saved);
                }
            }
        } catch (error) {
            console.error('Error checking saved credentials:', error);
        }
    }

    // Show quick login option for saved user
    showQuickLoginOption(savedCredentials) {
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;

        const quickLoginHtml = `
            <div class="saved-user-info">
                <div class="saved-user-email">${this.maskEmail(savedCredentials.email)}</div>
                <div class="saved-user-timestamp">Kayıtlı: ${this.formatTimestamp(savedCredentials.timestamp)}</div>
                <button type="button" class="quick-login-btn" onclick="loginManager.quickLogin()">
                    <i class="fas fa-bolt"></i>
                    Hızlı Giriş Yap
                </button>
                <button type="button" class="clear-saved-login" onclick="loginManager.clearSavedLogin()">
                    Farklı kullanıcı ile giriş yap
                </button>
            </div>
        `;

        // Remove existing quick login if any
        const existingQuickLogin = document.querySelector('.saved-user-info');
        if (existingQuickLogin) {
            existingQuickLogin.remove();
        }

        loginBtn.insertAdjacentHTML('beforebegin', quickLoginHtml);
        
        // Hide regular form initially
        this.toggleRegularForm(false);
    }

    // Toggle regular login form visibility
    toggleRegularForm(show) {
        const formGroups = document.querySelectorAll('.login-form .form-group');
        const rememberMe = document.querySelector('.remember-me-group');
        const loginBtn = document.getElementById('loginBtn');
        
        const elements = [...formGroups, rememberMe, loginBtn];
        
        elements.forEach(element => {
            if (element) {
                element.style.display = show ? 'block' : 'none';
            }
        });

        // Show API key management link
        const apiKeyLink = document.querySelector('a[onclick="showApiKeyModal()"]');
        if (apiKeyLink) {
            apiKeyLink.style.display = show ? 'block' : 'none';
        }
    }

    // Mask email for privacy
    maskEmail(email) {
        const [username, domain] = email.split('@');
        if (username.length <= 2) return email;
        
        const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
        return maskedUsername + '@' + domain;
    }

    // Format timestamp
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Bilinmiyor';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Dün';
        if (diffDays < 7) return `${diffDays} gün önce`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
        
        return date.toLocaleDateString('tr-TR');
    }

    // Quick login with saved credentials
    async quickLogin() {
        const saved = this.getSavedCredentials();
        if (!saved || !saved.email) {
            this.showAlert('Kayıtlı giriş bilgisi bulunamadı.', 'error');
            this.clearSavedLogin();
            return;
        }

        this.showAlert('Giriş yapılıyor...', 'info');
        
        try {
            // Fill the form
            document.getElementById('email').value = saved.email;
            
            // Attempt login (password will be handled by auth system)
            await window.handleLogin();
        } catch (error) {
            console.error('Quick login failed:', error);
            this.showAlert('Hızlı giriş başarısız. Lütfen şifrenizi girin.', 'error');
            this.showRegularLoginForm();
        }
    }

    // Show regular login form
    showRegularLoginForm() {
        this.toggleRegularForm(true);
        
        // Remove quick login option
        const quickLogin = document.querySelector('.saved-user-info');
        if (quickLogin) {
            quickLogin.remove();
        }
        
        // Focus on password field
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.focus();
        }
    }

    // Clear saved login data
    clearSavedLogin() {
        localStorage.removeItem(this.credentialsKey);
        localStorage.removeItem(this.autoLoginKey);
        
        this.showAlert('Kayıtlı giriş bilgileri temizlendi.', 'info');
        this.showRegularLoginForm();
    }

    // Save login credentials
    saveCredentials(email, rememberMe) {
        if (!rememberMe) {
            this.clearSavedLogin();
            return;
        }

        const credentials = {
            email: email,
            rememberMe: true,
            timestamp: new Date().toISOString()
        };

        try {
            localStorage.setItem(this.credentialsKey, JSON.stringify(credentials));
            console.log('🔐 Credentials saved for:', this.maskEmail(email));
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    }

    // Get saved credentials
    getSavedCredentials() {
        try {
            const saved = localStorage.getItem(this.credentialsKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error reading saved credentials:', error);
            return null;
        }
    }

    // Check if auto-login should be attempted
    shouldAutoLogin() {
        try {
            return localStorage.getItem(this.autoLoginKey) === 'true';
        } catch (error) {
            return false;
        }
    }

    // Enable auto-login
    enableAutoLogin() {
        try {
            localStorage.setItem(this.autoLoginKey, 'true');
        } catch (error) {
            console.error('Error enabling auto-login:', error);
        }
    }

    // Disable auto-login
    disableAutoLogin() {
        try {
            localStorage.removeItem(this.autoLoginKey);
        } catch (error) {
            console.error('Error disabling auto-login:', error);
        }
    }

    // Attempt auto-login
    async attemptAutoLogin(savedCredentials) {
        if (!savedCredentials || !savedCredentials.email) return false;

        try {
            console.log('🔐 Attempting auto-login...');
            
            // Set a timeout for auto-login attempt
            const autoLoginPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('Auto-login timeout'));
                }, 5000);
                
                // This would need to be integrated with your auth system
                // For now, we'll just pre-fill the email
                document.getElementById('email').value = savedCredentials.email;
                resolve(true);
            });

            await autoLoginPromise;
            return true;
            
        } catch (error) {
            console.log('Auto-login failed or not implemented:', error);
            return false;
        }
    }

    // Show alert message
    showAlert(message, type = 'info') {
        // Use your existing alert system or create a simple one
        if (window.showAlert) {
            window.showAlert(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Create global instance
const loginManager = new LoginManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loginManager.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LoginManager, loginManager };
}
