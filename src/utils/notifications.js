// Notification and alert management
class NotificationManager {
    constructor() {
        this.alertContainer = null;
        this.toastElement = null;
        this.activeAlerts = new Map();
        this.alertIdCounter = 0;
    }

    init() {
        // Ensure container exists
        this.alertContainer = document.getElementById('alertContainer') || this.createAlertContainer();
        this.toastElement = document.getElementById('toast');

        // Inject animations if not present
        if (!document.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = `
                @keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}
                @keyframes slideInRight {from {transform: translateX(100%); opacity:0;} to {transform: translateX(0); opacity:1;}}
                @keyframes slideOutRight {from {transform: translateX(0); opacity:1;} to {transform: translateX(100%); opacity:0;}}
            `;
            document.head.appendChild(style);
        }

        console.log('NotificationManager initialized');
    }

    createAlertContainer() {
        const div = document.createElement('div');
        div.id = 'alertContainer';
        div.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
        document.body.appendChild(div);
        return div;
    }

    showAlert(message, type = 'info', duration = 3000) {
        if (!this.alertContainer) this.init();

        const alertId = this.alertIdCounter++;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            background: ${this.getAlertColor(type)};
            color: white; padding: 12px 16px; margin: 6px 0; border-radius: 6px;
            font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex; justify-content: space-between; align-items: center;
            cursor: pointer; animation: slideInRight 0.3s ease-out;
        `;
        alertDiv.innerHTML = `<span>${message}</span>
            <button class="alert-close" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;padding:0;margin-left:10px;opacity:0.7;">&times;</button>`;

        alertDiv.querySelector('.alert-close').addEventListener('click', () => this.removeAlert(alertId));
        alertDiv.addEventListener('click', () => this.removeAlert(alertId));

        this.alertContainer.appendChild(alertDiv);
        this.activeAlerts.set(alertId, alertDiv);

        if (duration > 0) setTimeout(() => this.removeAlert(alertId), duration);

        console.log(`${type.toUpperCase()}: ${message}`);
        return alertId;
    }

    removeAlert(alertId) {
        const alertDiv = this.activeAlerts.get(alertId);
        if (!alertDiv) return;
        alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            alertDiv.remove();
            this.activeAlerts.delete(alertId);
        }, 300);
    }

    getAlertColor(type) {
        const colors = { success: '#2ecc71', error: '#e74c3c', warning: '#f39c12', info: '#3498db' };
        return colors[type] || colors.info;
    }
}

// Create a single global instance
if (!window.NotificationManager) window.NotificationManager = new NotificationManager();
