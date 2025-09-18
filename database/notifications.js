export function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const span = document.createElement('span');
    span.textContent = message;
    
    const button = document.createElement('button');
    button.className = 'alert-close';
    button.textContent = '×';
    
    alert.appendChild(span);
    alert.appendChild(button);
    alertContainer.appendChild(alert);
    
    button.addEventListener('click', () => {
        alert.classList.add('hide');
        setTimeout(() => alert.remove(), 300);
    });
    
    if (duration > 0) {
        setTimeout(() => {
            alert.classList.add('hide');
            setTimeout(() => alert.remove(), 300);
        }, duration);
    }
    
    return alert;
}

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
