// Utility helper functions
class Helpers {
    // DOM element waiting utility
    static waitForElement(id, maxAttempts = 50, interval = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkElement = setInterval(() => {
                attempts++;
                const element = document.getElementById(id);
                if (element) {
                    clearInterval(checkElement);
                    resolve(element);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkElement);
                    reject(new Error(`Element with ID '${id}' not found after ${maxAttempts} attempts`));
                }
            }, interval);
        });
    }

    // Safe element text setter
    static async safeSetText(elementId, text) {
        try {
            const element = await this.waitForElement(elementId, 10, 100);
            element.textContent = text;
            return true;
        } catch (error) {
            console.warn(`Could not set text for ${elementId}:`, error.message);
            return false;
        }
    }

    // Safe element display setter
    static async safeSetDisplay(elementId, displayValue) {
        try {
            const element = await this.waitForElement(elementId, 10, 100);
            element.style.display = displayValue;
            return true;
        } catch (error) {
            console.warn(`Could not set display for ${elementId}:`, error.message);
            return false;
        }
    }

    // Safe element HTML setter with sanitization
    static async safeSetHTML(elementId, html) {
        try {
            const element = await this.waitForElement(elementId, 10, 100);
            element.innerHTML = this.sanitizeHTML(html);
            return true;
        } catch (error) {
            console.warn(`Could not set HTML for ${elementId}:`, error.message);
            return false;
        }
    }

    // HTML sanitization
    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // Safe query selector
    static safeQuerySelector(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.warn(`Query selector failed for: ${selector}`, error);
            return null;
        }
    }

    // Format date to Turkish locale
    static formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('tr-TR');
    }

    // Format time to Turkish locale
    static formatTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleTimeString('tr-TR');
    }

    // Format date and time
    static formatDateTime(date) {
        if (!date) return '-';
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Generate barcode
    static generateBarcode(prefix = 'PC') {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }

    // Debounce function
    static debounce(func, wait) {
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

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Deep clone object
    static deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === "object") {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // Format currency
    static formatCurrency(amount, currency = 'TRY') {
        if (!amount && amount !== 0) return '-';
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Format number
    static formatNumber(number, decimals = 0) {
        if (!number && number !== 0) return '-';
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    // Check if string is valid email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Check if string is valid phone
    static isValidPhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    // Capitalize first letter
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Truncate text
    static truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    // Get file extension
    static getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    // Check if file is image
    static isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        return imageExtensions.includes(this.getFileExtension(filename));
    }

    // Convert file size to human readable
    static formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Local storage helpers
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error setting localStorage:', error);
            return false;
        }
    }

    static getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error getting localStorage:', error);
            return defaultValue;
        }
    }

    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing localStorage:', error);
            return false;
        }
    }

    // URL helpers
    static getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    static updateUrlParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.replaceState(null, '', url);
    }

    // Download helpers
    static downloadFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    static downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    static downloadCSV(data, filename) {
        if (!Array.isArray(data) || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }

    // Error handling
    static async safeAsync(asyncFn, fallback = null, errorMessage = 'Bir hata oluştu') {
        try {
            return await asyncFn();
        } catch (error) {
            console.error(errorMessage, error);
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.showAlert(errorMessage, 'error');
            }
            return fallback;
        }
    }

    // Performance helpers
    static measureTime(fn, label = 'Operation') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${label} took ${end - start} milliseconds`);
        return result;
    }

    static async measureTimeAsync(asyncFn, label = 'Async Operation') {
        const start = performance.now();
        const result = await asyncFn();
        const end = performance.now();
        console.log(`${label} took ${end - start} milliseconds`);
        return result;
    }

    // Array helpers
    static groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    }

    static sortBy(array, key, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }

    static unique(array, key = null) {
        if (key) {
            const seen = new Set();
            return array.filter(item => {
                const value = item[key];
                if (seen.has(value)) {
                    return false;
                }
                seen.add(value);
                return true;
            });
        }
        return [...new Set(array)];
    }
}

// Export for use in other modules
window.Helpers = Helpers;
