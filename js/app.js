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




        
// Güncellenmiş sendDailyReport fonksiyonu
async function sendDailyReport() {
    const emailInput = document.getElementById('reportEmail');
    if (!emailInput) {
        showAlert('E-posta alanı bulunamadı', 'error');
        return;
    }
    
    const email = emailInput.value;
    console.log('Alınan e-posta adresi:', email);
    
    // Form validation
    if (!validateForm([
        { id: 'reportEmail', errorId: 'reportEmailError', type: 'email', required: true }
    ])) {
        return;
    }

    try {
        if (!currentReportData) {
            showAlert('Önce rapor oluşturmalısınız', 'error');
            return;
        }

        showAlert('Rapor hazırlanıyor...', 'info');
        
        let pdfBlob;
        
        // PDF oluştur - with proper error handling
        try {
            if (typeof generatePDFReportSafe === 'function') {
                pdfBlob = await generatePDFReportSafe(currentReportData);
            } else {
                throw new Error('PDF generation function not available');
            }
        } catch (pdfError) {
            console.warn('PDF oluşturma başarısız:', pdfError);
            throw new Error('Rapor PDF\'i oluşturulamadı');
        }

        let pdfUrl = null;
        
        // Önce storage'a yüklemeyi dene
        try {
            pdfUrl = await uploadReportToStorage(pdfBlob, currentReportData);
            showAlert('Rapor buluta yüklendi, e-posta hazırlanıyor...', 'success');
        } catch (uploadError) {
            console.warn('Storage yükleme başarısız, direkt e-posta eki kullanılacak:', uploadError);
            // Storage yükleme başarısız olursa, direkt e-posta eki kullan
        }

        // E-posta parametrelerini hazırla
        const templateParams = {
            to_email: email,
            to_name: selectedCustomer?.name || 'Müşteri',
            report_date: currentReportData.date,
            total_packages: currentReportData.totalPackages,
            total_items: currentReportData.totalItems,
            operator_name: currentReportData.operator,
            critical_stock_count: currentReportData.criticalStock ? currentReportData.criticalStock.length : 0,
            report_id: currentReportData.id || 'N/A',
            report_url: pdfUrl || 'PDF eklenti olarak gönderildi',
            company_name: 'ProClean Çamaşırhane'
        };

        // E-posta gönder
        showAlert('E-posta gönderiliyor...', 'info');
        const emailResult = await sendReportEmail(email, templateParams, pdfUrl ? null : pdfBlob);
        
        if (emailResult.success) {
            // Veritabanına kaydetmeyi dene
            try {
                await supabase
                    .from('report_emails')
                    .insert([{
                        report_id: currentReportData.id,
                        sent_to: email,
                        sent_at: new Date().toISOString(),
                        status: 'sent',
                        pdf_url: pdfUrl,
                        delivery_method: pdfUrl ? 'link' : 'attachment'
                    }]);
            } catch (dbError) {
                console.warn('E-posta kaydı veritabanına eklenemedi:', dbError);
            }
            
            showAlert(`Rapor ${email} adresine başarıyla gönderildi`, 'success');
            
            // Başarılı gönderimden sonra modalı kapat
            setTimeout(() => {
                closeEmailModal();
            }, 2000);
            
        } else {
            // E-posta gönderimi başarısız olursa kullanıcıya alternatif sun
            const shouldDownload = confirm('E-posta gönderilemedi. Raporu bilgisayarınıza indirmek ister misiniz?');
            
            if (shouldDownload) {
                // PDF'i indir
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = `proclean-rapor-${currentReportData.date}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(pdfUrl);
                
                showAlert('Rapor bilgisayarınıza indirildi', 'success');
            }
            
            throw new Error(`E-posta gönderilemedi: ${emailResult.error}`);
        }
        
  } catch (error) {
        console.error('Rapor gönderme hatası:', error);
        showAlert(`Rapor gönderilemedi: ${error.message}`, 'error');
    }
}




        
// Yardımcı fonksiyon: EmailJS yapılandırma modalı
function showEmailJSConfigModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center;
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; width: 80%; max-width: 500px;">
            <h3>E-posta Gönderim Ayarları</h3>
            <p>E-posta göndermek için EmailJS yapılandırmanız gerekiyor.</p>
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">EmailJS Service ID:</label>
                <input type="text" id="emailjsServiceId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">EmailJS Template ID:</label>
                <input type="text" id="emailjsTemplateId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="document.body.removeChild(this.parentElement.parentElement.parentElement)" style="padding: 8px 16px; background: #ccc; border: none; border-radius: 5px;">İptal</button>
                <button onclick="saveEmailJSConfig()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 5px;">Kaydet</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
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
    } else {
        document.body.classList.remove('dark-mode');
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

// Run on page load
document.addEventListener('DOMContentLoaded', applySavedTheme);


     
        
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
                        customer: '',
                        package_count: 0,
                        total_quantity: 0,
                        status: 'beklemede',
                        package_ids: []
                    }])
                    .select();

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


