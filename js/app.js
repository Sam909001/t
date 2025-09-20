// Sayfa yüklendiğinde API anahtarını localStorage'dan yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
        console.log('API key loaded from localStorage');
    }
});
