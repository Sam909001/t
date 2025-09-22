// Sayfa yüklendiğinde API anahtarını localStorage'dan yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('procleanApiKey');
    if (savedApiKey) {
        SUPABASE_ANON_KEY = savedApiKey;
        initializeSupabase();
        console.log('API key loaded from localStorage');
    }
});




// State management functions
        function saveAppState() {
            const state = {
                selectedCustomerId: selectedCustomer ? selectedCustomer.id : null,
                selectedPersonnelId: elements.personnelSelect.value,
                currentContainer: currentContainer,
            };
            localStorage.setItem('procleanState', JSON.stringify(state));
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



// Storage bucket kontrolü ve oluşturma fonksiyonu
async function setupStorageBucket() {
    try {
        // Storage bucket var mı kontrol et
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.warn('Bucket listeleme hatası:', bucketsError);
            return false;
        }
        
        const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports');
        
        if (!reportsBucketExists) {
            console.log('Reports bucket bulunamadı, oluşturuluyor...');
            // Bucket oluşturmaya çalış (admin yetkisi gerektirir)
            try {
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                    allowedMimeTypes: ['application/pdf']
                });
                
                if (createError) {
                    console.warn('Bucket oluşturulamadı:', createError);
                    return false;
                }
                
                console.log('Reports bucket oluşturuldu:', newBucket);
                return true;
            } catch (createError) {
                console.warn('Bucket oluşturma hatası:', createError);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.warn('Storage setup hatası:', error);
        return false;
    }
}




        
// Güncellenmiş upload fonksiyonu
async function uploadReportToStorage(pdfBlob, reportData) {
    try {
        // Önce storage bucket'ı kontrol et
        const storageReady = await setupStorageBucket();
        if (!storageReady) {
            throw new Error('Storage bucket hazır değil');
        }
        
        const fileName = `report-${reportData.id || Date.now()}.pdf`;
        
        // PDF'i yükle
        const { data, error } = await supabase.storage
            .from('reports')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true,
                cacheControl: '3600'
            });
            
        if (error) {
            console.error('Storage upload error:', error);
            throw new Error(`Dosya yüklenemedi: ${error.message}`);
        }
        
        // Public URL al
        const { data: { publicUrl } } = supabase.storage
            .from('reports')
            .getPublicUrl(fileName);
            
        console.log('PDF başarıyla yüklendi:', publicUrl);
        return publicUrl;
        
    } catch (error) {
        console.error('PDF upload error:', error);
        throw new Error('PDF depolama alanına yüklenemedi');
    }
}




        
// EmailJS yapılandırma kontrolü
function checkEmailJSConfig() {
    if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS kütüphanesi yüklenmemiş');
    }
    
    // Basit bir EmailJS init kontrolü
    try {
        emailjs.init("jH-KlJ2ffs_lGwfsp"); // Buraya gerçek EmailJS ID'nizi ekleyin
        return true;
    } catch (error) {
        console.warn('EmailJS init hatası:', error);
        return false;
    }
}




        
// Alternatif e-posta gönderim fonksiyonu (EmailJS yoksa)
async function sendEmailFallback(email, subject, body, pdfBlob = null) {
    // Basit bir mailto: linki oluştur
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Yeni pencere aç
    const mailWindow = window.open(mailtoLink, '_blank');
    
    if (mailWindow) {
        return { success: true, message: 'E-posta istemcisi açıldı' };
    } else {
        return { success: false, error: 'E-posta istemcisi açılamadı' };
    }
}




        
// Güncellenmiş e-posta gönderim fonksiyonu
async function sendReportEmail(email, templateParams, pdfBlob = null) {
    try {
        // EmailJS yapılandırmasını kontrol et
        const emailjsReady = checkEmailJSConfig();
        
        if (!emailjsReady) {
            console.warn('EmailJS hazır değil, fallback kullanılıyor');
            
            // Fallback e-posta gönderimi
            const subject = `ProClean Raporu - ${templateParams.report_date}`;
            const body = `
                ProClean Günlük Raporu
                ----------------------
                Tarih: ${templateParams.report_date}
                Operatör: ${templateParams.operator_name}
                Toplam Paket: ${templateParams.total_packages}
                Toplam Ürün: ${templateParams.total_items}
                Kritik Stok: ${templateParams.critical_stock_count}
                
                Rapor PDF'i e-posta ekinde gönderilmiştir.
            `;
            
            return await sendEmailFallback(email, subject, body, pdfBlob);
        }
        
        // EmailJS ile gönder
        return new Promise((resolve) => {
            // Eğer PDF blob'u varsa, base64'e çevir
            if (pdfBlob) {
                const reader = new FileReader();
                reader.readAsDataURL(pdfBlob);
                reader.onload = function() {
                    templateParams.pdf_attachment = reader.result;
                    templateParams.pdf_name = `proclean-report-${templateParams.report_date}.pdf`;
                    
                    emailjs.send('service_4rt2w5g', 'template_16f4gyy', templateParams)
                        .then(response => resolve({ success: true, response }))
                        .catch(error => resolve({ success: false, error: error.text }));
                };
            } else {
                // URL varsa doğrudan gönder
                emailjs.send('service_4rt2w5g', 'template_16f4gyy', templateParams)
                    .then(response => resolve({ success: true, response }))
                    .catch(error => resolve({ success: false, error: error.text }));
            }
        });
        
    } catch (error) {
        console.error('E-posta gönderim hatası:', error);
        return { success: false, error: error.message };
    }
}



// Uygulama başlangıcında storage'ı kontrol et
async function initializeApp() {
    try {
        // Storage bucket'ı kontrol et ve gerekirse oluştur
        await setupStorageBucket();
        
        // Diğer başlangıç işlemleri...
        console.log('Uygulama başlatıldı');
        
    } catch (error) {
        console.warn('Başlangıç hatası:', error);
    }
}

// Uygulama yüklendiğinde storage'ı kontrol et
    document.addEventListener('DOMContentLoaded', function() {
            // Settings button - add this FIRST, before other initializations
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            console.log('Settings button clicked'); // Debug log
            showSettingsModal();
        });
        console.log('Settings button listener added successfully');
    } else {
        console.error('Settings button not found in DOM');
    }

    // Close settings modal
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsModal);
    }

    try {
        console.log('Initializing ProClean application...');
        
        // Initialize elements first
        initializeElementsObject();
        
        // Check critical elements exist before adding listeners
        const loginBtn = elements.loginButton;
        const emailInput = elements.emailInput;
        const passwordInput = elements.passwordInput;
        
        if (loginBtn) {
            loginBtn.addEventListener('click', login);
            console.log('Login button listener added');
        } else {
            console.error('Login button not found - check HTML structure');
            showAlert('Giriş butonu bulunamadı', 'error');
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Enter key listeners
        if (emailInput) {
            emailInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
        
        // Quantity modal enter key
        if (elements.quantityInput) {
            elements.quantityInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmQuantity();
                }
            });
        }
        
        // Customer select change listener
        if (elements.customerSelect) {
            elements.customerSelect.addEventListener('change', function() {
                const customerId = this.value;
                if (customerId) {
                    const selectedOption = this.options[this.selectedIndex];
                    selectedCustomer = {
                        id: customerId,
                        name: selectedOption.textContent.split(' (')[0],
                        code: selectedOption.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                    };
                    showAlert(`Müşteri seçildi: ${selectedCustomer.name}`, 'success');
                } else {
                    selectedCustomer = null;
                }
            });
        }
        
        // Tab click events
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (tabName) {
                    switchTab(tabName);
                }
            });
        });

         function applySavedTheme() {
                const savedTheme = localStorage.getItem('procleanTheme');
                if (savedTheme === 'dark') {
                    document.body.classList.add('dark-mode');
                }
            }

            function toggleDarkMode() {
                document.body.classList.toggle('dark-mode');
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('procleanTheme', 'dark');
                    showAlert('Koyu tema etkinleştirildi.', 'info');
                } else {
                    localStorage.setItem('procleanTheme', 'light');
                    showAlert('Açık tema etkinleştirildi.', 'info');
                }
            }
        
        // API key initialization
        if (loadApiKey()) {
            supabase = initializeSupabase();
            if (supabase) {
                setupAuthListener();
                console.log('Supabase client initialized successfully');
            } else {
                console.warn('Failed to initialize Supabase client');
            }
        } else {
            console.log('No saved API key found, showing API key modal');
            showApiKeyModal();
        }

       // Initialize settings when app loads
initializeSettings();

// Add settings button event listener
document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
document.getElementById('closeSettingsModalBtn').addEventListener('click', closeSettingsModal);

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById('settingsModal')) {
        closeSettingsModal();
    }
});
        
        
        // Set initial display states
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
        }
        if (elements.appContainer) {
            elements.appContainer.style.display = 'none';
        }
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Critical error during DOMContentLoaded:', error);
        showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
    }
});



        
        
async function previewReport() {
    if (!currentReportData) {
        showAlert('Önce rapor oluşturmalısınız', 'error');
        return;
    }
    
    try {
        // Generate PDF
        const pdfBlob = await generatePDFReport(currentReportData);
        
        // Create object URL for the PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Open PDF in a new window
        const reportWindow = window.open(pdfUrl, '_blank');
        
        // Clean up the URL when window is closed
        if (reportWindow) {
            reportWindow.onbeforeunload = function() {
                URL.revokeObjectURL(pdfUrl);
            };
        }
    } catch (error) {
        console.error('Rapor önizleme hatası:', error);
        showAlert('Rapor önizlenemedi', 'error');
    }
}




        // Container operations
        function loadCurrentContainer() {
            showAlert('Mevcut konteyner yüklendi', 'success');
        }

       async function createNewContainer() {
    try {
        const timestamp = new Date().getTime();
        const containerNo = `CONT-${timestamp.toString().slice(-6)}`;

        const { data: newContainer, error } = await supabase
            .from('containers')
            .insert([{
                container_no: containerNo,
                customer: null,           // leave blank initially
                package_count: 0,
                total_quantity: 0,
                status: 'beklemede'
            }])
            .select('*');                // get inserted row back

        if (error) throw error;

        elements.containerNumber.textContent = containerNo;
        currentContainer = containerNo;
        saveAppState();

        showAlert(`Yeni konteyner oluşturuldu: ${containerNo}`, 'success');
        await populateShippingTable();

    } catch (error) {
        console.error('Error creating container:', error);
        showAlert('Konteyner oluşturulurken hata oluştu', 'error');
    }
}



        

        async function deleteContainer() {
            // Seçili konteynerleri al
            const selectedContainers = Array.from(document.querySelectorAll('.container-checkbox:checked'))
                .map(cb => cb.value);
                
            if (selectedContainers.length === 0) {
                showAlert('Silinecek konteyner seçin', 'error');
                return;
            }

            if (!confirm(`${selectedContainers.length} konteyneri silmek istediğinize emin misiniz?`)) return;

            try {
                // Önce bu konteynerlere bağlı paketleri güncelle
                const { error: updateError } = await supabase
                    .from('packages')
                    .update({ 
                        container_id: null,
                        status: 'beklemede'
                    })
                    .in('container_id', selectedContainers);

                if (updateError) throw updateError;

                // Sonra konteynerleri sil
                const { error: deleteError } = await supabase
                    .from('containers')
                    .delete()
                    .in('id', selectedContainers);

                if (deleteError) throw deleteError;

                // Eğer silinen konteyner aktif konteyner ise sıfırla
                if (currentContainer && selectedContainers.includes(currentContainer)) {
                    currentContainer = null;
                    elements.containerNumber.textContent = 'Yok';
                    saveAppState();
                }
                
                showAlert(`${selectedContainers.length} konteyner silindi`, 'success');
                await populateShippingTable();
                
            } catch (error) {
                console.error('Error deleting container:', error);
                showAlert('Konteyner silinirken hata oluştu', 'error');
            }
        }


  // Utility functions
        function switchTab(tabName) {
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Deactivate all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Activate selected tab
            const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
            const selectedPane = document.getElementById(`${tabName}Tab`);
            
            if (selectedTab && selectedPane) {
                selectedTab.classList.add('active');
                selectedPane.classList.add('active');
            }
        }



        

        function closeAllModals() {
            document.getElementById('customerModal').style.display = 'none';
            document.getElementById('allCustomersModal').style.display = 'none';
            document.getElementById('emailModal').style.display = 'none';
            document.getElementById('quantityModal').style.display = 'none';
            document.getElementById('manualModal').style.display = 'none';
            document.getElementById('containerDetailModal').style.display = 'none';
        }
        function closeModal() {
            document.getElementById('customerModal').style.display = 'none';
        }
        function closeAllCustomersModal() {
            document.getElementById('allCustomersModal').style.display = 'none';
        }
        function closeQuantityModal() {
            document.getElementById('quantityModal').style.display = 'none';
        }

        function closeManualModal() {
            document.getElementById('manualModal').style.display = 'none';
        }

        function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}



 // Initialize auth state listener
        function setupAuthListener() {
            if (!supabase) return;
            
            supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state change:', event, session?.user?.email || 'No user');
                
                if (session) {
                    currentUser = {
                        email: session.user.email,
                        uid: session.user.id,
                        name: session.user.email.split('@')[0]
                    };
                    
                    document.getElementById('userRole').textContent = `Operatör: ${currentUser.name}`;
                    document.getElementById('loginScreen').style.display = "none";
                    document.getElementById('appContainer').style.display = "flex";
                    
                    initApp();
                } else {
                    document.getElementById('loginScreen').style.display = "flex";
                    document.getElementById('appContainer').style.display = "none";
                }
            });
        }




        
        // Load API key from localStorage
        function loadApiKey() {
            const savedApiKey = localStorage.getItem('procleanApiKey');
            if (savedApiKey) {
                SUPABASE_ANON_KEY = savedApiKey;
                return true;
            }
            return false;
        }

        // Global error handler
        window.addEventListener('error', function(e) {
            console.error('Global error:', e.error);
            showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
        });




        
        // API hata yönetimi
       function handleSupabaseError(error, context) {
    console.error(`Supabase error in ${context}:`, error);
    
    let userMessage = `${context} sırasında bir hata oluştu.`;
    
    if (error.code === '42501') {
        userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
    } else if (error.code === '42P01') {
        userMessage = 'Veritabanı tablosu bulunamadı. Lütfen yönetici ile iletişime geçin.';
    } else if (error.code === '08006') {
        userMessage = 'Veritabanı bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
    } else if (error.message) {
        userMessage += ' ' + error.message;
    }
    
    showAlert(userMessage, 'error');
    
    // Switch to offline mode if connection issue
    if (!navigator.onLine && elements.connectionStatus) {
        elements.connectionStatus.textContent = 'Çevrimdışı';
        document.getElementById('offlineIndicator')?.style.setProperty('display', 'block');
    }
}
        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            // API anahtarını yükle ve supabase'i başlat
            if (loadApiKey()) {
                supabase = initializeSupabase();
                if (supabase) {
                    setupAuthListener();
                }
            } else {
                showApiKeyModal();
            }
            
             // Login button event
            document.getElementById('loginBtn').addEventListener('click', login);
            
            // Logout button event
            document.getElementById('logoutBtn').addEventListener('click', logout);
            
            // Enter key for login
            document.getElementById('email').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            document.getElementById('password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            
            // Quantity modal enter key
            if (elements.quantityInput) {
                elements.quantityInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') confirmQuantity();
                });
            }
            
            // Barcode input enter key
            if (elements.barcodeInput) {
                elements.barcodeInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') processBarcode();
                });
            }
            
            // Tab click events
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    switchTab(tabName);
                });
            });
            
            // Customer select change
            if (elements.customerSelect) {
                elements.customerSelect.addEventListener('change', function() {
                    const customerId = this.value;
                    if (customerId) {
                        // Find customer from populated options
                        const selectedOption = this.options[this.selectedIndex];
                        selectedCustomer = {
                            id: customerId,
                            name: selectedOption.textContent.split(' (')[0],
                            code: selectedOption.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                        };
                        showAlert(`Müşteri seçildi: ${selectedCustomer.name}`, 'success');
                    } else {
                        selectedCustomer = null;
                    }
                });
            }
            
            // Initial state
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('appContainer').style.display = 'none';

            console.log('ProClean application initialized with Supabase authentication');
        });
      // Add this section here 👇
    document.getElementById('packagesTableBody').addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            const checkbox = event.target;
            const packageId = checkbox.dataset.packageId;
            if (checkbox.checked) {
                selectedPackageForPrinting = packages.find(pkg => pkg.id === packageId);
            } else {
                selectedPackageForPrinting = null;
            }
        }
    });


// ==========================
// DAILY AUTO-CLEAR FUNCTION
// ==========================

// Clear local app state (frontend only)
function clearDailyAppState() {
    console.log('[Daily Clear] Clearing frontend state...');
    
    // Clear saved state in localStorage
    localStorage.removeItem('procleanState');

    // Reset global variables
    selectedCustomer = null;
    currentContainer = null;
    currentPackage = {};

    // Reset UI
    if (elements.customerSelect) elements.customerSelect.value = '';
    if (elements.personnelSelect) elements.personnelSelect.value = '';
    if (elements.containerNumber) elements.containerNumber.textContent = 'Yok';
    document.querySelectorAll('.quantity-badge').forEach(b => b.textContent = '0');
    const packageDetail = document.getElementById('packageDetailContent');
    if (packageDetail) packageDetail.innerHTML = '<p style="text-align:center; color:#666; margin:2rem 0;">Paket seçin</p>';

    // Reload today's data from Supabase
    loadTodaysData();
}

// Load today's packages/containers from Supabase
async function loadTodaysData() {
    try {
        if (!supabase) return;

        // Fetch today's packages
        window.packages = await fetchTodaysPackages();  // define in supabase.js
        window.containers = await fetchTodaysContainers();  // define in supabase.js

        // Re-render UI tables
        renderPackagesTable();  // from ui.js
        renderShippingTable();  // from ui.js

        console.log('[Daily Clear] Data reloaded from Supabase');
    } catch (error) {
        console.error('Error loading today\'s data:', error);
    }
}

// Schedule daily clear at next midnight
function scheduleDailyClear() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5); // 5 sec buffer
    const msUntilMidnight = nextMidnight - now;

    console.log(`[Daily Clear] Next clear in ${Math.round(msUntilMidnight / 1000)} seconds`);

    setTimeout(() => {
        clearDailyAppState();
        scheduleDailyClear();  // reschedule for next day
    }, msUntilMidnight);
}

// ==========================
// CALL THIS IN initApp()
// ==========================
async function initApp() {
    elements.currentDate.textContent = new Date().toLocaleDateString('tr-TR');

    // populate dropdowns and tables
    await populateCustomers();
    await populatePersonnel();
    loadAppState();
    await populatePackagesTable();
    await populateStockTable();
    await populateShippingTable();

    // Start daily auto-clear
    scheduleDailyClear();
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



// Storage bucket kontrolü ve oluşturma fonksiyonu
async function setupStorageBucket() {
    try {
        // Storage bucket var mı kontrol et
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.warn('Bucket listeleme hatası:', bucketsError);
            return false;
        }
        
        const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports');
        
        if (!reportsBucketExists) {
            console.log('Reports bucket bulunamadı, oluşturuluyor...');
            // Bucket oluşturmaya çalış (admin yetkisi gerektirir)
            try {
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('reports', {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                    allowedMimeTypes: ['application/pdf']
                });
                
                if (createError) {
                    console.warn('Bucket oluşturulamadı:', createError);
                    return false;
                }
                
                console.log('Reports bucket oluşturuldu:', newBucket);
                return true;
            } catch (createError) {
                console.warn('Bucket oluşturma hatası:', createError);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.warn('Storage setup hatası:', error);
        return false;
    }
}




        
// Güncellenmiş upload fonksiyonu
async function uploadReportToStorage(pdfBlob, reportData) {
    try {
        // Önce storage bucket'ı kontrol et
        const storageReady = await setupStorageBucket();
        if (!storageReady) {
            throw new Error('Storage bucket hazır değil');
        }
        
        const fileName = `report-${reportData.id || Date.now()}.pdf`;
        
        // PDF'i yükle
        const { data, error } = await supabase.storage
            .from('reports')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true,
                cacheControl: '3600'
            });
            
        if (error) {
            console.error('Storage upload error:', error);
            throw new Error(`Dosya yüklenemedi: ${error.message}`);
        }
        
        // Public URL al
        const { data: { publicUrl } } = supabase.storage
            .from('reports')
            .getPublicUrl(fileName);
            
        console.log('PDF başarıyla yüklendi:', publicUrl);
        return publicUrl;
        
    } catch (error) {
        console.error('PDF upload error:', error);
        throw new Error('PDF depolama alanına yüklenemedi');
    }
}




        
// EmailJS yapılandırma kontrolü
function checkEmailJSConfig() {
    if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS kütüphanesi yüklenmemiş');
    }
    
    // Basit bir EmailJS init kontrolü
    try {
        emailjs.init("jH-KlJ2ffs_lGwfsp"); // Buraya gerçek EmailJS ID'nizi ekleyin
        return true;
    } catch (error) {
        console.warn('EmailJS init hatası:', error);
        return false;
    }
}




        
// Alternatif e-posta gönderim fonksiyonu (EmailJS yoksa)
async function sendEmailFallback(email, subject, body, pdfBlob = null) {
    // Basit bir mailto: linki oluştur
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Yeni pencere aç
    const mailWindow = window.open(mailtoLink, '_blank');
    
    if (mailWindow) {
        return { success: true, message: 'E-posta istemcisi açıldı' };
    } else {
        return { success: false, error: 'E-posta istemcisi açılamadı' };
    }
}




        
// Güncellenmiş e-posta gönderim fonksiyonu
async function sendReportEmail(email, templateParams, pdfBlob = null) {
    try {
        // EmailJS yapılandırmasını kontrol et
        const emailjsReady = checkEmailJSConfig();
        
        if (!emailjsReady) {
            console.warn('EmailJS hazır değil, fallback kullanılıyor');
            
            // Fallback e-posta gönderimi
            const subject = `ProClean Raporu - ${templateParams.report_date}`;
            const body = `
                ProClean Günlük Raporu
                ----------------------
                Tarih: ${templateParams.report_date}
                Operatör: ${templateParams.operator_name}
                Toplam Paket: ${templateParams.total_packages}
                Toplam Ürün: ${templateParams.total_items}
                Kritik Stok: ${templateParams.critical_stock_count}
                
                Rapor PDF'i e-posta ekinde gönderilmiştir.
            `;
            
            return await sendEmailFallback(email, subject, body, pdfBlob);
        }
        
        // EmailJS ile gönder
        return new Promise((resolve) => {
            // Eğer PDF blob'u varsa, base64'e çevir
            if (pdfBlob) {
                const reader = new FileReader();
                reader.readAsDataURL(pdfBlob);
                reader.onload = function() {
                    templateParams.pdf_attachment = reader.result;
                    templateParams.pdf_name = `proclean-report-${templateParams.report_date}.pdf`;
                    
                    emailjs.send('service_4rt2w5g', 'template_16f4gyy', templateParams)
                        .then(response => resolve({ success: true, response }))
                        .catch(error => resolve({ success: false, error: error.text }));
                };
            } else {
                // URL varsa doğrudan gönder
                emailjs.send('service_4rt2w5g', 'template_16f4gyy', templateParams)
                    .then(response => resolve({ success: true, response }))
                    .catch(error => resolve({ success: false, error: error.text }));
            }
        });
        
    } catch (error) {
        console.error('E-posta gönderim hatası:', error);
        return { success: false, error: error.message };
    }
}



// Uygulama başlangıcında storage'ı kontrol et
async function initializeApp() {
    try {
        // Storage bucket'ı kontrol et ve gerekirse oluştur
        await setupStorageBucket();
        
        // Diğer başlangıç işlemleri...
        console.log('Uygulama başlatıldı');
        
    } catch (error) {
        console.warn('Başlangıç hatası:', error);
    }
}

// Uygulama yüklendiğinde storage'ı kontrol et
    document.addEventListener('DOMContentLoaded', function() {
            // Settings button - add this FIRST, before other initializations
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            console.log('Settings button clicked'); // Debug log
            showSettingsModal();
        });
        console.log('Settings button listener added successfully');
    } else {
        console.error('Settings button not found in DOM');
    }

    // Close settings modal
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsModal);
    }

    try {
        console.log('Initializing ProClean application...');
        
        // Initialize elements first
        initializeElementsObject();
        
        // Check critical elements exist before adding listeners
        const loginBtn = elements.loginButton;
        const emailInput = elements.emailInput;
        const passwordInput = elements.passwordInput;
        
        if (loginBtn) {
            loginBtn.addEventListener('click', login);
            console.log('Login button listener added');
        } else {
            console.error('Login button not found - check HTML structure');
            showAlert('Giriş butonu bulunamadı', 'error');
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Enter key listeners
        if (emailInput) {
            emailInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
        
        // Quantity modal enter key
        if (elements.quantityInput) {
            elements.quantityInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmQuantity();
                }
            });
        }
        
        // Customer select change listener
        if (elements.customerSelect) {
            elements.customerSelect.addEventListener('change', function() {
                const customerId = this.value;
                if (customerId) {
                    const selectedOption = this.options[this.selectedIndex];
                    selectedCustomer = {
                        id: customerId,
                        name: selectedOption.textContent.split(' (')[0],
                        code: selectedOption.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                    };
                    showAlert(`Müşteri seçildi: ${selectedCustomer.name}`, 'success');
                } else {
                    selectedCustomer = null;
                }
            });
        }
        
        // Tab click events
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (tabName) {
                    switchTab(tabName);
                }
            });
        });

         function applySavedTheme() {
                const savedTheme = localStorage.getItem('procleanTheme');
                if (savedTheme === 'dark') {
                    document.body.classList.add('dark-mode');
                }
            }

            function toggleDarkMode() {
                document.body.classList.toggle('dark-mode');
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('procleanTheme', 'dark');
                    showAlert('Koyu tema etkinleştirildi.', 'info');
                } else {
                    localStorage.setItem('procleanTheme', 'light');
                    showAlert('Açık tema etkinleştirildi.', 'info');
                }
            }
        
        // API key initialization
        if (loadApiKey()) {
            supabase = initializeSupabase();
            if (supabase) {
                setupAuthListener();
                console.log('Supabase client initialized successfully');
            } else {
                console.warn('Failed to initialize Supabase client');
            }
        } else {
            console.log('No saved API key found, showing API key modal');
            showApiKeyModal();
        }

       // Initialize settings when app loads
initializeSettings();

// Add settings button event listener
document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
document.getElementById('closeSettingsModalBtn').addEventListener('click', closeSettingsModal);

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById('settingsModal')) {
        closeSettingsModal();
    }
});
        
        
        // Set initial display states
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
        }
        if (elements.appContainer) {
            elements.appContainer.style.display = 'none';
        }
        
        console.log('ProClean application initialized successfully');
        
    } catch (error) {
        console.error('Critical error during DOMContentLoaded:', error);
        showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
    }
});



        
        
async function previewReport() {
    if (!currentReportData) {
        showAlert('Önce rapor oluşturmalısınız', 'error');
        return;
    }
    
    try {
        // Generate PDF
        const pdfBlob = await generatePDFReport(currentReportData);
        
        // Create object URL for the PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Open PDF in a new window
        const reportWindow = window.open(pdfUrl, '_blank');
        
        // Clean up the URL when window is closed
        if (reportWindow) {
            reportWindow.onbeforeunload = function() {
                URL.revokeObjectURL(pdfUrl);
            };
        }
    } catch (error) {
        console.error('Rapor önizleme hatası:', error);
        showAlert('Rapor önizlenemedi', 'error');
    }
}




        // Container operations
        function loadCurrentContainer() {
            showAlert('Mevcut konteyner yüklendi', 'success');
        }

       async function createNewContainer() {
    try {
        const timestamp = new Date().getTime();
        const containerNo = `CONT-${timestamp.toString().slice(-6)}`;

        const { data: newContainer, error } = await supabase
            .from('containers')
            .insert([{
                container_no: containerNo,
                customer: null,           // leave blank initially
                package_count: 0,
                total_quantity: 0,
                status: 'beklemede'
            }])
            .select('*');                // get inserted row back

        if (error) throw error;

        elements.containerNumber.textContent = containerNo;
        currentContainer = containerNo;
        saveAppState();

        showAlert(`Yeni konteyner oluşturuldu: ${containerNo}`, 'success');
        await populateShippingTable();

    } catch (error) {
        console.error('Error creating container:', error);
        showAlert('Konteyner oluşturulurken hata oluştu', 'error');
    }
}



        

        async function deleteContainer() {
            // Seçili konteynerleri al
            const selectedContainers = Array.from(document.querySelectorAll('.container-checkbox:checked'))
                .map(cb => cb.value);
                
            if (selectedContainers.length === 0) {
                showAlert('Silinecek konteyner seçin', 'error');
                return;
            }

            if (!confirm(`${selectedContainers.length} konteyneri silmek istediğinize emin misiniz?`)) return;

            try {
                // Önce bu konteynerlere bağlı paketleri güncelle
                const { error: updateError } = await supabase
                    .from('packages')
                    .update({ 
                        container_id: null,
                        status: 'beklemede'
                    })
                    .in('container_id', selectedContainers);

                if (updateError) throw updateError;

                // Sonra konteynerleri sil
                const { error: deleteError } = await supabase
                    .from('containers')
                    .delete()
                    .in('id', selectedContainers);

                if (deleteError) throw deleteError;

                // Eğer silinen konteyner aktif konteyner ise sıfırla
                if (currentContainer && selectedContainers.includes(currentContainer)) {
                    currentContainer = null;
                    elements.containerNumber.textContent = 'Yok';
                    saveAppState();
                }
                
                showAlert(`${selectedContainers.length} konteyner silindi`, 'success');
                await populateShippingTable();
                
            } catch (error) {
                console.error('Error deleting container:', error);
                showAlert('Konteyner silinirken hata oluştu', 'error');
            }
        }


  // Utility functions
        function switchTab(tabName) {
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Deactivate all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Activate selected tab
            const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
            const selectedPane = document.getElementById(`${tabName}Tab`);
            
            if (selectedTab && selectedPane) {
                selectedTab.classList.add('active');
                selectedPane.classList.add('active');
            }
        }



        

        function closeAllModals() {
            document.getElementById('customerModal').style.display = 'none';
            document.getElementById('allCustomersModal').style.display = 'none';
            document.getElementById('emailModal').style.display = 'none';
            document.getElementById('quantityModal').style.display = 'none';
            document.getElementById('manualModal').style.display = 'none';
            document.getElementById('containerDetailModal').style.display = 'none';
        }
        function closeModal() {
            document.getElementById('customerModal').style.display = 'none';
        }
        function closeAllCustomersModal() {
            document.getElementById('allCustomersModal').style.display = 'none';
        }
        function closeQuantityModal() {
            document.getElementById('quantityModal').style.display = 'none';
        }

        function closeManualModal() {
            document.getElementById('manualModal').style.display = 'none';
        }

        function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}



 // Initialize auth state listener
        function setupAuthListener() {
            if (!supabase) return;
            
            supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state change:', event, session?.user?.email || 'No user');
                
                if (session) {
                    currentUser = {
                        email: session.user.email,
                        uid: session.user.id,
                        name: session.user.email.split('@')[0]
                    };
                    
                    document.getElementById('userRole').textContent = `Operatör: ${currentUser.name}`;
                    document.getElementById('loginScreen').style.display = "none";
                    document.getElementById('appContainer').style.display = "flex";
                    
                    initApp();
                } else {
                    document.getElementById('loginScreen').style.display = "flex";
                    document.getElementById('appContainer').style.display = "none";
                }
            });
        }




        
        // Load API key from localStorage
        function loadApiKey() {
            const savedApiKey = localStorage.getItem('procleanApiKey');
            if (savedApiKey) {
                SUPABASE_ANON_KEY = savedApiKey;
                return true;
            }
            return false;
        }

        // Global error handler
        window.addEventListener('error', function(e) {
            console.error('Global error:', e.error);
            showAlert('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', 'error');
        });




        
        // API hata yönetimi
       function handleSupabaseError(error, context) {
    console.error(`Supabase error in ${context}:`, error);
    
    let userMessage = `${context} sırasında bir hata oluştu.`;
    
    if (error.code === '42501') {
        userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
    } else if (error.code === '42P01') {
        userMessage = 'Veritabanı tablosu bulunamadı. Lütfen yönetici ile iletişime geçin.';
    } else if (error.code === '08006') {
        userMessage = 'Veritabanı bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
    } else if (error.message) {
        userMessage += ' ' + error.message;
    }
    
    showAlert(userMessage, 'error');
    
    // Switch to offline mode if connection issue
    if (!navigator.onLine && elements.connectionStatus) {
        elements.connectionStatus.textContent = 'Çevrimdışı';
        document.getElementById('offlineIndicator')?.style.setProperty('display', 'block');
    }
}
        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            // API anahtarını yükle ve supabase'i başlat
            if (loadApiKey()) {
                supabase = initializeSupabase();
                if (supabase) {
                    setupAuthListener();
                }
            } else {
                showApiKeyModal();
            }
            
             // Login button event
            document.getElementById('loginBtn').addEventListener('click', login);
            
            // Logout button event
            document.getElementById('logoutBtn').addEventListener('click', logout);
            
            // Enter key for login
            document.getElementById('email').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            document.getElementById('password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            
            // Quantity modal enter key
            if (elements.quantityInput) {
                elements.quantityInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') confirmQuantity();
                });
            }
            
            // Barcode input enter key
            if (elements.barcodeInput) {
                elements.barcodeInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') processBarcode();
                });
            }
            
            // Tab click events
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    switchTab(tabName);
                });
            });
            
            // Customer select change
            if (elements.customerSelect) {
                elements.customerSelect.addEventListener('change', function() {
                    const customerId = this.value;
                    if (customerId) {
                        // Find customer from populated options
                        const selectedOption = this.options[this.selectedIndex];
                        selectedCustomer = {
                            id: customerId,
                            name: selectedOption.textContent.split(' (')[0],
                            code: selectedOption.textContent.match(/\(([^)]+)\)/)?.[1] || ''
                        };
                        showAlert(`Müşteri seçildi: ${selectedCustomer.name}`, 'success');
                    } else {
                        selectedCustomer = null;
                    }
                });
            }
            
            // Initial state
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('appContainer').style.display = 'none';

            console.log('ProClean application initialized with Supabase authentication');
        });
      // Add this section here 👇
    document.getElementById('packagesTableBody').addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            const checkbox = event.target;
            const packageId = checkbox.dataset.packageId;
            if (checkbox.checked) {
                selectedPackageForPrinting = packages.find(pkg => pkg.id === packageId);
            } else {
                selectedPackageForPrinting = null;
            }
        }
    });


