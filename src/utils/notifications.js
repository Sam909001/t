// Notification and alert management
class NotificationManager {
    constructor() {
        this.alertContainer = null;
        this.toastElement = null;
        this.activeAlerts = new Map();
        this.alertIdCounter = 0;
    }

    // Initialize containers
    init() {
        // Alert container
        this.alertContainer = document.getElementById('alertContainer');
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

        // Toast element (optional)
        this.toastElement = document.getElementById('toast');
        if (!this.toastElement) {
            this.toastElement = document.createElement('div');
            this.toastElement.id = 'toast';
            this.toastElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                padding: 10px 20px;
                color: white;
                border-radius: 6px;
                display: none;
            `;
            document.body.appendChild(this.toastElement);
        }

        // Add animations only once
        if (!document.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        console.log('✅ NotificationManager initialized');
    }

    showAlert(message, type = 'info', duration = 3000) {
        if (!this.alertContainer) this.init();

        const alertId = this.alertIdCounter++;
        const alertDiv = document.createElement('div');
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            background: ${this.getAlertColor(type)};
            color: white;
            padding: 12px 16px;
            margin: 6px 0;
            border-radius: 6px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;
        this.alertContainer.appendChild(alertDiv);
        this.activeAlerts.set(alertId, alertDiv);

        alertDiv.addEventListener('click', () => this.removeAlert(alertId));

        if (duration > 0) {
            setTimeout(() => this.removeAlert(alertId), duration);
        }

        return alertId;
    }

    removeAlert(alertId) {
        const alertDiv = this.activeAlerts.get(alertId);
        if (alertDiv) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                alertDiv.remove();
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

    showToast(message, type = 'info', duration = 3000) {
        if (!this.toastElement) this.init();

        this.toastElement.textContent = message;
        this.toastElement.style.background = this.getAlertColor(type);
        this.toastElement.style.display = 'block';

        setTimeout(() => {
            this.toastElement.style.display = 'none';
        }, duration);
    }
}

// Ensure global instance
window.NotificationManager = new NotificationManager();

// Auto-init after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.NotificationManager.init();
});
