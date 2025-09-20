// scripts/domUtils.js

// DOM element waiting utility
// Keep only in domUtils.js, remove from auth.js and debug.js
function waitForElement(id, maxAttempts = 50, interval = 100) {
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



// Safe element operations
async function safeSetElementText(elementId, text, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.textContent = text;
        return true;
    } catch (error) {
        console.warn(error.message);
        return false;
    }
}

async function safeSetElementDisplay(elementId, displayValue, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        element.style.display = displayValue;
        return true;
    } catch (error) {
        console.warn(error.message);
        return false;
    }
}

async function safeSetElementHTML(elementId, html, maxRetries = 5) {
    try {
        const element = await waitForElement(elementId, maxRetries * 10, 100);
        // Sanitize HTML before setting
        element.innerHTML = sanitizeHTML(html);
        return true;
    } catch (error) {
        console.warn(error.message);
        return false;
    }
}

function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}



// Check if element exists
function elementExists(id) {
    return document.getElementById(id) !== null;
}

// Safe query selector
function safeQuerySelector(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (error) {
        console.warn(`Query selector failed for: ${selector}`, error);
        return null;
    }
}

// scripts/domUtils.js

// Safe element access with retry
function getElementSafe(id, maxAttempts = 5, interval = 200) {
    return new Promise((resolve) => {
        // First try immediately
        const immediateElement = document.getElementById(id);
        if (immediateElement) {
            resolve(immediateElement);
            return;
        }
        
        // If not found, retry
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            const element = document.getElementById(id);
            
            if (element) {
                clearInterval(intervalId);
                resolve(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                resolve(null);
            }
        }, interval);
    });
}

// Safe version of initializeElementsObject for individual elements
async function getElement(key) {
    const elementMap = {
        appContainer: 'appContainer',
        customerSelect: 'customerSelect',
        personnelSelect: 'personnelSelect',
        currentDate: 'currentDate',
        userRole: 'userRole'
        // ... add other elements as needed
    };
    
    if (elements[key]) {
        return elements[key];
    }
    
    const elementId = elementMap[key];
    if (!elementId) {
        console.warn(`Unknown element key: ${key}`);
        return null;
    }
    
    const element = await getElementSafe(elementId);
    if (element) {
        elements[key] = element;
    }
    
    return element;
}

