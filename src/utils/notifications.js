// Notification and alert management
class NotificationManager {
    constructor() {
        this.alertContainer = null;
        this.toastElement = null;
        this.activeAlerts = new Map();
        this.alertIdCounter = 0;
    }

    init() {
        this.alertContainer = document.getElementById('alertContainer');
        this.toastElement = document.getElementById('toast');
        
        // Create alert container if not exists
        if (!this.alertContainer) {
            this.alertContainer = document.createElement('div');
            this.alertContainer.id = 'alertContainer';
            this.alertContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(this.alertContainer);
        }

        console.log('NotificationManager initialized');
    }

    // Show alert with auto-dismiss
    showAlert(message, type = 'info', duration = 3000) {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        const alertId = this.alertIdCounter++;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            background: ${this.getAlertColor(type)};
            color: white;
            padding: 12px 16px;
            margin: 6px 0;
            border-radius: 6px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: slideInRight 0.3s ease-out;
        `;

        alertDiv.innerHTML = `
            <span>${message}</span>
            <button class="alert-close" style="
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: 10px;
                opacity: 0.7;
            ">&times;</button>
        `;

        // Add close functionality
        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            this.removeAlert(alertId);
        });

        // Add click to dismiss
        alertDiv.addEventListener('click', () => {
            this.removeAlert(alertId);
        });

        this.alertContainer.appendChild(alertDiv);
        this.activeAlerts.set(alertId, alertDiv);

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.removeAlert(alertId);
            }, duration);
        }

        return alertId;
    }

    removeAlert(alertId) {
        const alertDiv = this.activeAlerts.get(alertId);
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
                this.activeAlerts.delete(alertId);
            }, 300);
        }
    }

    getAlertColor(type) {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        if (!this.toastElement) {
            console.warn('Toast element not found');
            return this.showAlert(message, type, duration);
        }

        this.toastElement.textContent = message;
        this.toastElement.className = `toast ${type} show`;

        setTimeout(() => {
            this.toastElement.classList.remove('show');
        }, duration);
    }

    // Show confirmation dialog
    showConfirm(message, onConfirm, onCancel = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3 style="margin-bottom: 1rem; color: var(--primary);">Onay</h3>
                <p style="margin-bottom: 2rem;">${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="confirmYes" class="btn btn-danger">Evet</button>
                    <button id="confirmNo" class="btn btn-secondary">Hayır</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const yesBtn = modal.querySelector('#confirmYes');
        const noBtn = modal.querySelector('#confirmNo');

        yesBtn.addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });

        noBtn.addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        });

        return modal;
    }

    // Show prompt dialog
    showPrompt(message, defaultValue = '', onConfirm, onCancel = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 style="margin-bottom: 1rem; color: var(--primary);">Bilgi Girin</h3>
                <p style="margin-bottom: 1rem;">${message}</p>
                <input type="text" id="promptInput" class="form-control" value="${defaultValue}" style="
                    width: 100%; 
                    padding: 0.8rem; 
                    border: 1px solid #ddd; 
                    border-radius: 5px; 
                    margin-bottom: 1rem;
                ">
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button id="promptCancel" class="btn btn-secondary">İptal</button>
                    <button id="promptConfirm" class="btn btn-primary">Tamam</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#promptInput');
        const confirmBtn = modal.querySelector('#promptConfirm');
        const cancelBtn = modal.querySelector('#promptCancel');

        input.focus();
        input.select();

        const handleConfirm = () => {
            const value = input.value.trim();
            modal.remove();
            if (onConfirm) onConfirm(value);
        };

        const handleCancel = () => {
            modal.remove();
            if (onCancel) onCancel();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });

        return modal;
    }

    // Show loading overlay
    showLoading(message = 'Yükleniyor...') {
        const existing = document.getElementById('loadingOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;

        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                "></div>
                <p style="margin: 0; color: #666;">${message}</p>
            </div>
        `;

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-notifications]')) {
            style.setAttribute('data-notifications', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        return overlay;
    }

    // Hide loading overlay
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Clear all alerts
    clearAlerts() {
        this.activeAlerts.forEach((alertDiv, alertId) => {
            this.removeAlert(alertId);
        });
    }

    // Show progress notification
    showProgress(message, progress = 0) {
        const existingProgress = document.getElementById('progressNotification');
        if (existingProgress) existingProgress.remove();

        const progressDiv = document.createElement('div');
        progressDiv.id = 'progressNotification';
        progressDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            min-width: 300px;
        `;

        progressDiv.innerHTML = `
            <div style="margin-bottom: 0.5rem; font-weight: 500;">${message}</div>
            <div style="width: 100%; background: #f0f0f0; border-radius: 10px; height: 20px; overflow: hidden;">
                <div id="progressBar" style="
                    width: ${progress}%;
                    height: 100%;
                    background: linear-gradient(90deg, #3498db, #2ecc71);
                    transition: width 0.3s ease;
                    border-radius: 10px;
                "></div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                <span id="progressText">${Math.round(progress)}%</span>
            </div>
        `;

        document.body.appendChild(progressDiv);
        return progressDiv;
    }

    updateProgress(progress, message = null) {
        const progressNotification = document.getElementById('progressNotification');
        if (!progressNotification) return;

        const progressBar = progressNotification.querySelector('#progressBar');
        const progressText = progressNotification.querySelector('#progressText');

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
        if (message) {
            const messageElement = progressNotification.querySelector('div');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        // Auto-hide when complete
        if (progress >= 100) {
            setTimeout(() => {
                if (progressNotification.parentNode) {
                    progressNotification.remove();
                }
            }, 2000);
        }
    }
}

// Create global instance
window.NotificationManager = new NotificationManager();
