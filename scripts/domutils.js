// scripts/domUtils.js

// DOM element waiting utility
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
        element.innerHTML = html;
        return true;
    } catch (error) {
        console.warn(error.message);
        return false;
    }
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
