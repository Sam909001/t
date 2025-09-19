// scripts/utils.js

// Global utility functions
function showAlert(message, type = 'info', duration = 5000) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button class="alert-close">&times;</button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Close button
    const closeBtn = alert.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alert.remove();
    });
    
    // Auto close
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }
    
    return alert;
}

// Safe console logging
function log(message, level = 'info') {
    if (typeof console !== 'undefined') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        switch(level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'info':
            default:
                console.log(logMessage);
        }
    }
}

// Error handler
function handleError(error, context = '') {
    const errorMessage = context ? `${context}: ${error.message}` : error.message;
    log(errorMessage, 'error');
    showAlert(`Hata: ${errorMessage}`, 'error');
}

// Make functions globally available
window.showAlert = showAlert;
window.log = log;
window.handleError = handleError;
