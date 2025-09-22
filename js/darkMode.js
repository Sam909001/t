// Enable/disable dark mode
function enableDarkMode(enable = true) {
    if (enable) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
        updateThemeToggleUI(true);
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
        updateThemeToggleUI(false);
    }
}

// Toggle function for checkbox
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    enableDarkMode(!isDark);
}

// Update the toggle switch UI and status text
function updateThemeToggleUI(isDark) {
    const toggle = document.getElementById('themeToggle');
    const status = document.getElementById('themeStatus');
    if (toggle) toggle.checked = isDark;
    if (status) status.textContent = isDark ? 'Açık' : 'Kapalı';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const darkPref = localStorage.getItem('darkMode') === 'true';
    enableDarkMode(darkPref);
});
