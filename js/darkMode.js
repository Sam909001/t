// darkMode.js

function enableDarkMode(enable = true) {
    if (enable) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

// Load saved preference on page load
document.addEventListener('DOMContentLoaded', () => {
    const darkPref = localStorage.getItem('darkMode') === 'true';
    enableDarkMode(darkPref);
});

// Toggle function for a button
function toggleDarkMode() {
    const isDark = document.body.classList.contains('dark-mode');
    enableDarkMode(!isDark);
}
