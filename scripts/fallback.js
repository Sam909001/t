// scripts/fallback.js
function showFallbackLoader() {
    const fallbackHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        ">
            <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 20px; color: #2c3e50;">
                    ProClean Yükleniyor...
                </div>
                <div style="color: #7f8c8d;">
                    Eğer bu ekran uzun süre görünürse, lütfen sayfayı yenileyin.
                </div>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">
                    Sayfayı Yenile
                </button>
            </div>
        </div>
    `;
    
    document.body.innerHTML += fallbackHTML;
    
    // Hide after 8 seconds if still showing
    setTimeout(() => {
        const fallback = document.querySelector('[style*="position: fixed; top: 0; left: 0;"]');
        if (fallback) {
            fallback.style.display = 'none';
        }
    }, 8000);
}

// Show fallback if app doesn't load within 5 seconds
setTimeout(() => {
    const appContainer = document.getElementById('appContainer');
    if (!appContainer || appContainer.style.display === 'none') {
        showFallbackLoader();
    }
}, 5000);
