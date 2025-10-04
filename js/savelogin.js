// savelogin-electron.js - Remember Me functionality for Electron

class ElectronLoginManager {
    constructor() {
        this.credentialsKey = 'proclean_saved_credentials';
        this.autoLoginKey = 'proclean_auto_login';
        this.isInitialized = false;
        this.isElectron = this.checkElectronEnvironment();
    }

    // Check if running in Electron
    checkElectronEnvironment() {
        return typeof window !== 'undefined' && 
               window.process && 
               window.process.type === 'renderer';
    }

    // Initialize with Electron-specific setup
    init() {
        if (this.isInitialized) return;
        
        console.log('🔐 ElectronLoginManager initializing...');
        this.setupLoginForm();
        this.checkSavedCredentials();
        this.isInitialized = true;
    }

    // Setup login form (same as before)
    setupLoginForm() {
        const loginForm = document.querySelector('.login-form');
        if (!loginForm) {
            console.warn('Login form not found');
            return;
        }

        const rememberMeHtml = `
            <div class="form-group remember-me-group">
                <label class="remember-me-label">
                    <input type="checkbox" id="rememberMe" class="remember-me-checkbox">
                    <span class="checkmark"></span>
                    Beni Hatırla
                </label>
            </div>
        `;

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.insertAdjacentHTML('beforebegin', rememberMeHtml);
        }

        this.addRememberMeStyles();
    }

    // Enhanced storage methods for Electron
    async saveCredentials(email, rememberMe) {
        if (!rememberMe) {
            await this.clearSavedLogin();
            return;
        }

        const credentials = {
            email: email,
            rememberMe: true,
            timestamp: new Date().toISOString(),
            appVersion: '2.0.0'
        };

        try {
            if (this.isElectron && window.electronAPI) {
                // Use Electron's secure storage
                await window.electronAPI.storeSet(this.credentialsKey, JSON.stringify(credentials));
                console.log('🔐 Credentials saved securely via Electron');
            } else {
                // Fallback to localStorage
                localStorage.setItem(this.credentialsKey, JSON.stringify(credentials));
                console.log('🔐 Credentials saved via localStorage');
            }
        } catch (error) {
            console.error('Error saving credentials:', error);
            // Fallback to localStorage if Electron storage fails
            localStorage.setItem(this.credentialsKey, JSON.stringify(credentials));
        }
    }

    async getSavedCredentials() {
        try {
            if (this.isElectron && window.electronAPI) {
                // Try Electron secure storage first
                const credentials = await window.electronAPI.storeGet(this.credentialsKey);
                return credentials ? JSON.parse(credentials) : null;
            } else {
                // Fallback to localStorage
                const saved = localStorage.getItem(this.credentialsKey);
                return saved ? JSON.parse(saved) : null;
            }
        } catch (error) {
            console.error('Error reading saved credentials:', error);
            // Final fallback
            try {
                const saved = localStorage.getItem(this.credentialsKey);
                return saved ? JSON.parse(saved) : null;
            } catch (e) {
                return null;
            }
        }
    }

    async clearSavedLogin() {
        try {
            if (this.isElectron && window.electronAPI) {
                await window.electronAPI.storeDelete(this.credentialsKey);
                await window.electronAPI.storeDelete(this.autoLoginKey);
            }
            localStorage.removeItem(this.credentialsKey);
            localStorage.removeItem(this.autoLoginKey);
        } catch (error) {
            console.error('Error clearing saved login:', error);
        }
    }

    async shouldAutoLogin() {
        try {
            if (this.isElectron && window.electronAPI) {
                const autoLogin = await window.electronAPI.storeGet(this.autoLoginKey);
                return autoLogin === 'true';
            }
            return localStorage.getItem(this.autoLoginKey) === 'true';
        } catch (error) {
            return false;
        }
    }

    async enableAutoLogin() {
        try {
            if (this.isElectron && window.electronAPI) {
                await window.electronAPI.storeSet(this.autoLoginKey, 'true');
            } else {
                localStorage.setItem(this.autoLoginKey, 'true');
            }
        } catch (error) {
            console.error('Error enabling auto-login:', error);
        }
    }

    async disableAutoLogin() {
        try {
            if (this.isElectron && window.electronAPI) {
                await window.electronAPI.storeDelete(this.autoLoginKey);
            }
            localStorage.removeItem(this.autoLoginKey);
        } catch (error) {
            console.error('Error disabling auto-login:', error);
        }
    }

    // Rest of the methods remain the same as previous version
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
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    async checkSavedCredentials() {
        try {
            const saved = await this.getSavedCredentials();
            if (saved && saved.email && saved.rememberMe) {
                console.log('🔐 Saved credentials found in Electron env');
                this.showQuickLoginOption(saved);
                
                if (await this.shouldAutoLogin()) {
                    console.log('🔐 Auto-login enabled, attempting login...');
                    await this.attemptAutoLogin(saved);
                }
            }
        } catch (error) {
            console.error('Error checking saved credentials:', error);
        }
    }

    showQuickLoginOption(savedCredentials) {
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;

        const quickLoginHtml = `
            <div class="saved-user-info">
                <div class="saved-user-email">${this.maskEmail(savedCredentials.email)}</div>
                <div class="saved-user-timestamp">Kayıtlı: ${this.formatTimestamp(savedCredentials.timestamp)}</div>
                <button type="button" class="quick-login-btn" onclick="electronLoginManager.quickLogin()">
                    <i class="fas fa-bolt"></i>
                    Hızlı Giriş Yap
                </button>
                <button type="button" class="clear-saved-login" onclick="electronLoginManager.clearSavedLogin()">
                    Farklı kullanıcı ile giriş yap
                </button>
            </div>
        `;

        const existingQuickLogin = document.querySelector('.saved-user-info');
        if (existingQuickLogin) {
            existingQuickLogin.remove();
        }

        loginBtn.insertAdjacentHTML('beforebegin', quickLoginHtml);
        this.toggleRegularForm(false);
    }

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

        const apiKeyLink = document.querySelector('a[onclick="showApiKeyModal()"]');
        if (apiKeyLink) {
            apiKeyLink.style.display = show ? 'block' : 'none';
        }
    }

    maskEmail(email) {
        const [username, domain] = email.split('@');
        if (username.length <= 2) return email;
        const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
        return maskedUsername + '@' + domain;
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Bilinmiyor';
        const date = new Date(timestamp);
        return date.toLocaleDateString('tr-TR');
    }

    async quickLogin() {
        const saved = await this.getSavedCredentials();
        if (!saved || !saved.email) {
            this.showAlert('Kayıtlı giriş bilgisi bulunamadı.', 'error');
            await this.clearSavedLogin();
            return;
        }

        this.showAlert('Giriş yapılıyor...', 'info');
        
        try {
            document.getElementById('email').value = saved.email;
            document.getElementById('password').focus(); // Focus on password for user to enter
        } catch (error) {
            console.error('Quick login failed:', error);
            this.showAlert('Lütfen şifrenizi girin.', 'info');
            this.showRegularLoginForm();
        }
    }

    showRegularLoginForm() {
        this.toggleRegularForm(true);
        const quickLogin = document.querySelector('.saved-user-info');
        if (quickLogin) {
            quickLogin.remove();
        }
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.focus();
        }
    }

    async attemptAutoLogin(savedCredentials) {
        if (!savedCredentials || !savedCredentials.email) return false;

        try {
            console.log('🔐 Attempting auto-login in Electron...');
            
            // Pre-fill email and attempt login
            document.getElementById('email').value = savedCredentials.email;
            
            // In Electron, you might want to implement actual auto-login
            // This would require storing an encrypted token rather than just email
            return true;
            
        } catch (error) {
            console.log('Auto-login failed:', error);
            return false;
        }
    }

    showAlert(message, type = 'info') {
        if (window.showAlert) {
            window.showAlert(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Create global instance
const electronLoginManager = new ElectronLoginManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    electronLoginManager.init();
});
