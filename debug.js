// scripts/debug.js
function enableDebugMode() {
    console.log('=== PROCLAIN DEBUG MODE ENABLED ===');
    
    // Log all DOM operations
    const originalQuerySelector = document.querySelector;
    const originalGetElementById = document.getElementById;
    
    document.querySelector = function(...args) {
        console.log('DOM Query:', args[0]);
        return originalQuerySelector.apply(this, args);
    };
    
    document.getElementById = function(id) {
        console.log('DOM GetElement:', id);
        const element = originalGetElementById.call(this, id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    };
    
    // Log Supabase events
    if (window.supabase) {
        const originalAuthChange = window.supabase.auth.onAuthStateChange;
        window.supabase.auth.onAuthStateChange = function(callback) {
            console.log('Auth state change listener registered');
            return originalAuthChange.call(this, (event, session) => {
                console.log('Auth state changed:', event, session);
                callback(event, session);
            });
        };
    }
    
    // Error tracking
    window.addEventListener('error', function(e) {
        console.error('Global Error:', e.error);
        console.error('Error at:', e.filename, e.lineno, e.colno);
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled Promise Rejection:', e.reason);
    });
}

// Run debug mode immediately
enableDebugMode();
