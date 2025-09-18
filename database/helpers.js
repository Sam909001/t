export function formatDate(date) {
    return new Date(date).toLocaleDateString('tr-TR');
}

export function calculateTotalQuantity(items) {
    if (!items || typeof items !== 'object') return 0;
    return Object.values(items).reduce((sum, qty) => sum + qty, 0);
}

export function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
