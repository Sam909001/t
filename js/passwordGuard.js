/**
 * Password Guard System for ProClean App
 * Protects sensitive operations with password verification
 */

class PasswordGuard {
    constructor() {
        this.passwords = {
            // For package, container, customer operations
            manage: '8823',
            // For admin operations (API key, clear data)
            admin: '7142'
        };
        
        this.attempts = new Map();
        this.maxAttempts = 3;
        this.lockoutTime = 300000; // 5 minutes in milliseconds
        
        console.log('🔒 Password Guard initialized');
    }

    /**
     * Verify password for a specific operation type
     * @param {string} password - The entered password
     * @param {string} type - Operation type: 'manage' or 'admin'
     * @returns {boolean} - True if password is correct
     */
    verifyPassword(password, type) {
        // Check if user is locked out
        if (this.isLockedOut()) {
            this.showLockoutMessage();
            return false;
        }

        const correctPassword = this.passwords[type];
        
        if (password === correctPassword) {
            // Reset attempts on successful login
            this.attempts.delete('global');
            console.log(`✅ Password verified for ${type} operation`);
            return true;
        } else {
            this.recordFailedAttempt();
            return false;
        }
    }

    /**
     * Record a failed password attempt
     */
    recordFailedAttempt() {
        const now = Date.now();
        const attempts = this.attempts.get('global') || { count: 0, lastAttempt: 0 };
        
        // Reset count if last attempt was more than lockout time ago
        if (now - attempts.lastAttempt > this.lockoutTime) {
            attempts.count = 0;
        }
        
        attempts.count++;
        attempts.lastAttempt = now;
        this.attempts.set('global', attempts);
        
        const remainingAttempts = this.maxAttempts - attempts.count;
        
        if (remainingAttempts > 0) {
            showAlert(`❌ Yanlış şifre! Kalan deneme hakkı: ${remainingAttempts}`, 'error');
        } else {
            this.showLockoutMessage();
        }
    }

    /**
     * Check if user is currently locked out
     * @returns {boolean} - True if locked out
     */
    isLockedOut() {
        const attempts = this.attempts.get('global');
        if (!attempts) return false;
        
        const now = Date.now();
        const timeSinceLastAttempt = now - attempts.lastAttempt;
        
        if (attempts.count >= this.maxAttempts && timeSinceLastAttempt < this.lockoutTime) {
            return true;
        }
        
        // Reset attempts if lockout time has passed
        if (timeSinceLastAttempt >= this.lockoutTime) {
            this.attempts.delete('global');
            return false;
        }
        
        return false;
    }

    /**
     * Show lockout message with countdown
     */
    showLockoutMessage() {
        const attempts = this.attempts.get('global');
        if (!attempts) return;
        
        const now = Date.now();
        const timeSinceLastAttempt = now - attempts.lastAttempt;
        const timeLeft = Math.ceil((this.lockoutTime - timeSinceLastAttempt) / 1000);
        const minutesLeft = Math.ceil(timeLeft / 60);
        
        showAlert(`🔒 Çok fazla hatalı deneme! ${minutesLeft} dakika sonra tekrar deneyin.`, 'error');
    }

    /**
     * Prompt for password and execute action if correct
     * @param {Function} action - The function to execute if password is correct
     * @param {string} type - Operation type: 'manage' or 'admin'
     * @param {string} operationName - Name of the operation for the prompt
     */
    async askPasswordAndRun(action, type, operationName = 'bu işlemi') {
        // Check lockout first
        if (this.isLockedOut()) {
            this.showLockoutMessage();
            return;
        }

        const password = prompt(`🔒 ${operationName} yapmak için şifreyi giriniz:`);
        
        if (password === null) {
            console.log('❌ Password prompt cancelled');
            return; // User cancelled
        }

        if (this.verifyPassword(password, type)) {
            await action();
        } else if (password !== '') {
            // Error message is already shown by verifyPassword
            console.log(`❌ Password verification failed for ${type} operation`);
        }
    }

    /**
     * Get operation name for prompt message
     * @param {string} actionType - The action type
     * @returns {string} - Formatted operation name
     */
    getOperationName(actionType) {
        const names = {
            'deletePackage': 'paket silmek',
            'deleteContainer': 'konteyner silmek', 
            'deleteCustomer': 'müşteri silmek',
            'addCustomer': 'müşteri eklemek',
            'clearData': 'verileri temizlemek',
            'changeApiKey': 'API anahtarını değiştirmek'
        };
        
        return names[actionType] || 'bu işlemi';
    }
}

// Create global instance
const passwordGuard = new PasswordGuard();

// Protected operation functions
function deletePackageWithAuth() {
    passwordGuard.askPasswordAndRun(
        deleteSelectedPackages, 
        'manage', 
        'paket silmek'
    );
}

function deleteContainerWithAuth() {
    passwordGuard.askPasswordAndRun(
        deleteContainer, 
        'manage', 
        'konteyner silmek'
    );
}

function deleteCustomerWithAuth(customerId, customerName) {
    passwordGuard.askPasswordAndRun(
        () => {
            // First confirm the deletion
            if (confirm(`"${customerName}" müşterisini silmek istediğinizden emin misiniz?`)) {
                deleteCustomer(customerId);
            }
        }, 
        'manage', 
        `"${customerName}" müşterisini silmek`
    );
}

function addCustomerWithAuth() {
    passwordGuard.askPasswordAndRun(
        addNewCustomer, 
        'manage', 
        'müşteri eklemek'
    );
}

function clearDataWithAuth() {
    passwordGuard.askPasswordAndRun(
        clearFrontendData, 
        'admin', 
        'tüm verileri temizlemek'
    );
}

function changeApiKeyWithAuth() {
    passwordGuard.askPasswordAndRun(
        () => {
            // This is the function that will execute after password verification
            showApiKeyModal();
        }, 
        'admin', 
        'API anahtarını değiştirmek'
    );
}

// Override the existing askPassword function to use the new system
function askPassword(actionCallback, operationType = 'manage') {
    passwordGuard.askPasswordAndRun(actionCallback, operationType, 'bu işlemi');
}

// Make functions globally available
window.passwordGuard = passwordGuard;
window.deletePackageWithAuth = deletePackageWithAuth;
window.deleteContainerWithAuth = deleteContainerWithAuth;
window.deleteCustomerWithAuth = deleteCustomerWithAuth;
window.addCustomerWithAuth = addCustomerWithAuth;
window.clearDataWithAuth = clearDataWithAuth;
window.changeApiKeyWithAuth = changeApiKeyWithAuth;
window.askPassword = askPassword;

console.log('✅ Password Guard system loaded');
