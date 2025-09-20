 // State management functions
        function saveAppState() {
            const state = {
                selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
                selectedPersonnelId: elements.personnelSelect.value,
                currentContainer: currentContainer,
            };
            localStorage.setItem('procleanState', JSON.stringify(state));
        }


        

        function loadAppState() {
            const savedState = localStorage.getItem('procleanState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Restore customer selection
                if (state.selectedCustomerId) {
                    elements.customerSelect.value = state.selectedCustomerId;
                    // Find and set the selectedCustomer object
                    const option = elements.customerSelect.querySelector(`option[value="${state.selectedCustomerId}"]`);
                    if (option) {
                        selectedCustomer = {
                            id: state.selectedCustomerId,
                            name: option.textContent.split(' (')[0],
                            code: option.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                        };
                    }
                }
                
                // Restore personnel selection
                if (state.selectedPersonnelId) {
                    elements.personnelSelect.value = state.selectedPersonnelId;
                }
                
                // Restore current container
                if (state.currentContainer) {
                    currentContainer = state.currentContainer;
                    elements.containerNumber.textContent = currentContainer;
                }
            }
        }

        function clearAppState() {
            localStorage.removeItem('procleanState');
            selectedCustomer = null;
            elements.customerSelect.value = '';
            elements.personnelSelect.value = '';
            currentContainer = null;
            elements.containerNumber.textContent = 'Yok';
            currentPackage = {};
            
            // Reset quantity badges
            document.querySelectorAll('.quantity-badge').forEach(badge => {
                badge.textContent = '0';
            });
            
            // Clear package details
            document.getElementById('packageDetailContent').innerHTML = 
                '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';
        }

        // Initialize application
        async function initApp() {
            elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');
            
            // Populate dropdowns
            await populateCustomers();
            await populatePersonnel();
            
            // Load saved state
            loadAppState();
            
            // Load data
            await populatePackagesTable();
            await populateStockTable();
            await populateShippingTable();
            
            // Test connection
            await testConnection();
            
            // Set up auto-save
            setInterval(saveAppState, 5000); // Save every 5 seconds
            
            // Set up offline support
            setupOfflineSupport();
            
            // Set up barcode scanner listener
            setupBarcodeScanner();
        }




// Sayfa yüklendiğinde API anahtarını localStorage'dan yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
        console.log('API key loaded from localStorage');
    }
});
