// passwordGuard-simple.js - Works in both web and Electron

class PasswordGuard {
    constructor() {
        this.maxAttempts = 3;
        this.attempts = 0;
    }

    async askPasswordAndRun(action, actionName = 'bu işlem') {
        return new Promise((resolve, reject) => {
            if (this.attempts >= this.maxAttempts) {
                showAlert('Çok fazla hatalı giriş. Lütfen daha sonra tekrar deneyin.', 'error');
                reject(new Error('Max attempts exceeded'));
                return;
            }

            // Always use custom modal - works everywhere
            const modal = document.createElement('div');
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
                <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
                    <h3 style="color: #217346; margin-top: 0;">
                        <i class="fas fa-lock"></i> Şifre Doğrulama
                    </h3>
                    <p><strong>${actionName}</strong> için şifre girin:</p>
                    <p style="font-size: 0.9rem; color: #666; margin: 0.5rem 0;">
                        Varsayılan şifre: <strong>8823</strong><br>
                        (${this.maxAttempts - this.attempts} deneme hakkınız kaldı)
                    </p>
                    <input type="password" id="passwordInput" 
                           style="width: 100%; padding: 10px; margin: 1rem 0; border: 1px solid #ddd; border-radius: 4px;"
                           placeholder="Şifre girin...">
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelBtn" class="btn btn-secondary">İptal</button>
                        <button id="confirmBtn" class="btn btn-primary">Tamam</button>
                    </div>
                    <div id="passwordError" style="color: red; margin-top: 0.5rem; display: none;">
                        Hatalı şifre!
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const passwordInput = document.getElementById('passwordInput');
            const confirmBtn = document.getElementById('confirmBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const errorDiv = document.getElementById('passwordError');

            // Focus input
            setTimeout(() => passwordInput.focus(), 100);

            const cleanup = () => {
                document.body.removeChild(modal);
            };

            const confirmHandler = () => {
                const password = passwordInput.value.trim();

                if (password === '8823') {
                    this.attempts = 0;
                    cleanup();
                    const result = action();
                    resolve(result);
                } else {
                    this.attempts++;
                    errorDiv.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();

                    if (this.attempts >= this.maxAttempts) {
                        showAlert('Çok fazla hatalı giriş. Lütfen daha sonra tekrar deneyin.', 'error');
                        cleanup();
                        reject(new Error('Max attempts exceeded'));
                    }
                }
            };

            const cancelHandler = () => {
                cleanup();
                reject(new Error('User cancelled'));
            };

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
        });
    }
}

// Replace your existing function calls
async function addCustomerWithAuth() {
    const passwordGuard = new PasswordGuard();
    
    try {
        await passwordGuard.askPasswordAndRun(() => {
            addCustomer();
        }, 'müşteri ekleme');
    } catch (error) {
        if (error.message !== 'User cancelled') {
            showAlert('İşlem iptal edildi veya şifre hatalı', 'error');
        }
    }
}
