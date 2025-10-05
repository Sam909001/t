// ==================== PASSWORD GUARD - CLEAN VERSION (NO ATTEMPT REFERENCES) ====================
// Works in both Web and Electron environments

class PasswordGuard {
    constructor() {
        // Simple password protection - no attempt limits
        this.passwords = {
            'clearData': '7142',
            'changeApiKey': '7142',
            'default': '8823' // For all other actions
        };
    }

    async askPasswordAndRun(action, actionName = 'bu işlem', actionType = 'default') {
        // Get the correct password for this action
        const correctPassword = this.passwords[actionType] || this.passwords.default;

        return new Promise((resolve, reject) => {
            // Create custom modal - works everywhere
            const modal = document.createElement('div');
            modal.id = 'passwordGuardModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
            `;
            
            modal.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <i class="fas fa-lock" style="color: #217346; font-size: 1.5rem; margin-right: 10px;"></i>
                        <h3 style="color: #217346; margin: 0;">Şifre Doğrulama</h3>
                    </div>
                    
                    <p style="margin-bottom: 1rem;"><strong>${actionName}</strong> işlemi için şifre gerekiyor.</p>
                    
                    <div style="background: #f8f9fa; padding: 0.8rem; border-radius: 4px; margin: 1rem 0; font-size: 0.9rem;">
                        <div style="text-align: center;">
                            <span>Gerekli şifre: </span>
                            <strong>${this.getPasswordHint(actionType)}</strong>
                        </div>
                    </div>
                    
                    <input type="password" id="passwordInput" 
                           style="width: 100%; padding: 12px; margin: 1rem 0; border: 2px solid #ddd; border-radius: 4px; font-size: 1rem;"
                           placeholder="Şifrenizi girin..." autocomplete="off">
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1.5rem;">
                        <button id="cancelBtn" class="btn btn-secondary" style="padding: 10px 20px;">
                            <i class="fas fa-times"></i> İptal
                        </button>
                        <button id="confirmBtn" class="btn btn-primary" style="padding: 10px 20px;">
                            <i class="fas fa-check"></i> Onayla
                        </button>
                    </div>
                    
                    <div id="passwordError" style="color: #dc3545; margin-top: 0.8rem; text-align: center; display: none; font-size: 0.9rem;">
                        <i class="fas fa-exclamation-triangle"></i> Hatalı şifre! Lütfen tekrar deneyin.
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const passwordInput = document.getElementById('passwordInput');
            const confirmBtn = document.getElementById('confirmBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const errorDiv = document.getElementById('passwordError');

            // Focus input immediately
            setTimeout(() => {
                passwordInput.focus();
                passwordInput.select();
            }, 100);

            const cleanup = () => {
                const modal = document.getElementById('passwordGuardModal');
                if (modal && modal.parentNode) {
                    document.body.removeChild(modal);
                }
            };

            const confirmHandler = async () => {
                const password = passwordInput.value.trim();

                if (password === correctPassword) {
                    // Success - execute action
                    cleanup();
                    
                    try {
                        const result = await Promise.resolve(action());
                        resolve(result);
                        showAlert('İşlem başarıyla gerçekleştirildi', 'success');
                    } catch (actionError) {
                        reject(actionError);
                    }
                    
                } else {
                    // Wrong password - show error but allow retry
                    errorDiv.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();

                    // Shake animation for wrong password
                    passwordInput.style.borderColor = '#dc3545';
                    passwordInput.style.animation = 'shake 0.5s';
                    setTimeout(() => {
                        passwordInput.style.animation = '';
                    }, 500);
                }
            };

            const cancelHandler = () => {
                cleanup();
                reject(new Error('User cancelled'));
            };

            // Event listeners
            confirmBtn.addEventListener('click', confirmHandler);
            cancelBtn.addEventListener('click', cancelHandler);
            
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmHandler();
                }
            });

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cancelHandler();
                }
            });

            // Close on Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    cancelHandler();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Cleanup event listeners when modal closes
            modal._cleanup = () => {
                document.removeEventListener('keydown', escapeHandler);
            };
        });
    }

    getPasswordHint(actionType) {
        switch(actionType) {
            case 'clearData':
            case 'changeApiKey':
                return '7142 (Yönetici Şifresi)';
            default:
                return '8823 (Operatör Şifresi)';
        }
    }
}

// ==================== ESSENTIAL AUTHENTICATION WRAPPER FUNCTIONS ====================

// ✅ 1. Delete Package with Authentication - Uses 8823
async function deletePackageWithAuth() {
    const passwordGuard = new PasswordGuard();
    
    try {
        await passwordGuard.askPasswordAndRun(() => {
            if (typeof deleteSelectedPackages === 'function') {
                return deleteSelectedPackages();
            } else {
                showAlert('Paket silme fonksiyonu bulunamadı', 'error');
                throw new Error('Function not found');
            }
        }, 'paket silme', 'default');
    } catch (error) {
        if (error.message !== 'User cancelled') {
            console.log('Delete package cancelled:', error.message);
        }
    }
}

// ✅ 2. Change API Key with Authentication - Uses 7142
async function changeApiKeyWithAuth() {
    const passwordGuard = new PasswordGuard();
    
    try {
        await passwordGuard.askPasswordAndRun(() => {
            if (typeof showApiKeyModal === 'function') {
                showApiKeyModal();
            } else {
                showAlert('API anahtarı fonksiyonu bulunamadı', 'error');
                throw new Error('Function not found');
            }
        }, 'API anahtarı değiştirme', 'changeApiKey');
    } catch (error) {
        if (error.message !== 'User cancelled') {
            console.log('API key change cancelled:', error.message);
        }
    }
}

// ✅ 3. Clear Data with Authentication - Uses 7142
async function clearDataWithAuth() {
    const passwordGuard = new PasswordGuard();
    
    try {
        await passwordGuard.askPasswordAndRun(() => {
            if (typeof clearFrontendData === 'function') {
                return clearFrontendData();
            } else {
                showAlert('Veri temizleme fonksiyonu bulunamadı', 'error');
                throw new Error('Function not found');
            }
        }, 'veri temizleme', 'clearData');
    } catch (error) {
        if (error.message !== 'User cancelled') {
            console.log('Clear data cancelled:', error.message);
        }
    }
}

// ✅ 4. Delete Customer with Authentication - Uses 8823
async function deleteCustomerWithAuth() {
    const passwordGuard = new PasswordGuard();
    
    try {
        await passwordGuard.askPasswordAndRun(() => {
            if (typeof deleteCustomer === 'function') {
                return deleteCustomer();
            } else {
                showAlert('Müşteri silme fonksiyonu bulunamadı', 'error');
                throw new Error('Function not found');
            }
        }, 'müşteri silme', 'default');
    } catch (error) {
        if (error.message !== 'User cancelled') {
            console.log('Delete customer cancelled:', error.message);
        }
    }
}

// ✅ 5. Add Customer with Authentication - Uses 8823
async function addCustomerWithAuth() {
    const passwordGuard = new PasswordGuard();
    
    try {
        await passwordGuard.askPasswordAndRun(() => {
            if (typeof addCustomer === 'function') {
                addCustomer();
            } else {
                showAlert('Müşteri ekleme fonksiyonu bulunamadı', 'error');
                throw new Error('Function not found');
            }
        }, 'müşteri ekleme', 'default');
    } catch (error) {
        if (error.message !== 'User cancelled') {
            console.log('Add customer cancelled:', error.message);
        }
    }
}

// ==================== GLOBAL AVAILABILITY ====================

// Make only essential functions globally available
window.PasswordGuard = PasswordGuard;
window.deletePackageWithAuth = deletePackageWithAuth;
window.changeApiKeyWithAuth = changeApiKeyWithAuth;
window.clearDataWithAuth = clearDataWithAuth;
window.deleteCustomerWithAuth = deleteCustomerWithAuth;
window.addCustomerWithAuth = addCustomerWithAuth;

// ==================== CSS ANIMATIONS ====================

// Add shake animation for wrong password
if (!document.getElementById('passwordGuardStyles')) {
    const style = document.createElement('style');
    style.id = 'passwordGuardStyles';
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .password-input-error {
            border-color: #dc3545 !important;
            background-color: #fff5f5 !important;
            animation: shake 0.5s !important;
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ Clean PasswordGuard loaded (No attempt references)');
console.log('🔐 Simple password protection:');
console.log('   - Delete Package: 8823');
console.log('   - Add Customer: 8823'); 
console.log('   - Delete Customer: 8823');
console.log('   - Clear Data: 7142');
console.log('   - Change API Key: 7142');
