 // Supabase initialization - Varsayılan değerler
        const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
let SUPABASE_ANON_KEY = null;
let supabase = null;

// Global state variables
let selectedCustomer = null;
let currentPackage = {};
let currentContainer = null;
let selectedProduct = null;
let currentUser = null;
let scannedBarcodes = [];
let editingStockItem = null;
let scannerMode = false;
let currentContainerDetails = null;
let currentReportData = null;
let selectedPackageForPrinting = null;

// EmailJS initialization
(function() {
    // EmailJS kullanıcı ID'si - KENDİ ID'NİZİ EKLEYİN
    emailjs.init("jH-KlJ2ffs_lGwfsp");
})();

// Elementleri bir defa tanımla
const elements = {};

function initializeElementsObject() {
    const elementMap = {
        loginScreen: 'loginScreen',
        appContainer: 'appContainer',
        loginButton: 'loginBtn',
        emailInput: 'email',
        passwordInput: 'password',
        customerSelect: 'customerSelect',
        personnelSelect: 'personnelSelect',
        currentDate: 'currentDate',
        barcodeInput: 'barcodeInput',
        packagesTableBody: 'packagesTableBody',
        packageDetailContent: 'packageDetailContent',
        shippingFolders: 'shippingFolders',
        stockTableBody: 'stockTableBody',
        customerList: 'customerList',
        allCustomersList: 'allCustomersList',
        toast: 'toast',
        containerNumber: 'containerNumber',
        totalPackages: 'totalPackages',
        shippingFilter: 'shippingFilter',
        stockSearch: 'stockSearch',
        selectAllPackages: 'selectAllPackages',
        apiKeyModal: 'apiKeyModal',
        apiKeyInput: 'apiKeyInput',
        quantityInput: 'quantityInput',
        quantityModal: 'quantityModal',
        quantityModalTitle: 'quantityModalTitle',
        scannedBarcodes: 'scannedBarcodes',
        connectionStatus: 'connectionStatus',
        alertContainer: 'alertContainer',
        scannerToggle: 'scannerToggle',
        containerSearch: 'containerSearch',
        settingsModal: 'settingsModal',
        closeSettingsModalBtn: 'closeSettingsModalBtn',
        toggleThemeBtn: 'toggleThemeBtn',
        downloadDataBtn: 'downloadDataBtn',
        changeApiKeyBtn: 'changeApiKeyBtn',
    };
    
    Object.keys(elementMap).forEach(key => {
        const element = document.getElementById(elementMap[key]);
        if (element) {
            elements[key] = element;
        } else {
            console.warn(`Element ${elementMap[key]} not found`);
            elements[key] = null;
        }
    });
    
    return elements;
}

        

// Profesyonel alert sistemi
function showAlert(message, type = 'info', duration = 5000) {
    if (!elements.alertContainer) {
        console.error('Alert container not found, using console instead');
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const span = document.createElement('span');
    span.textContent = message; // Use textContent for XSS protection
    
    const button = document.createElement('button');
    button.className = 'alert-close';
    button.textContent = '×';
    
    alert.appendChild(span);
    alert.appendChild(button);
    
    elements.alertContainer.appendChild(alert);
    
    // Close button event
    button.addEventListener('click', () => {
        alert.classList.add('hide');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    });
    
    // Auto close
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.add('hide');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    return alert;
}




        
// Yardımcı fonksiyonlar
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}



        

// Form doğrulama fonksiyonu
function validateForm(inputs) {
    let isValid = true;
    
    inputs.forEach(input => {
        const element = document.getElementById(input.id);
        const errorElement = document.getElementById(input.errorId);
        
        if (input.required && !element.value.trim()) {
            element.classList.add('invalid');
            errorElement.style.display = 'block';
            isValid = false;
        } else if (input.type === 'email' && element.value.trim() && !isValidEmail(element.value)) {
            element.classList.add('invalid');
            errorElement.style.display = 'block';
            errorElement.textContent = 'Geçerli bir e-posta adresi girin';
            isValid = false;
        } else if (input.type === 'number' && element.value && (!Number.isInteger(Number(element.value)) || Number(element.value) < 1)) {
            element.classList.add('invalid');
            errorElement.style.display = 'block';
            errorElement.textContent = 'Geçerli bir sayı girin';
            isValid = false;
        } else {
            element.classList.remove('invalid');
            errorElement.style.display = 'none';
        }
    });
    
    return isValid;
}





        
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}



        
// FIXED: Supabase istemcisini başlat - Singleton pattern ile
function initializeSupabase() {
    // Eğer client zaten oluşturulmuşsa ve API key geçerliyse, mevcut olanı döndür
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set, showing modal');
        showApiKeyModal();
        return null;
    }
    
    try {
        // Global supabase değişkenine ata
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        showAlert('Supabase başlatılamadı. API anahtarını kontrol edin.', 'error');
        showApiKeyModal();
        return null;
    }
}


        

// FIXED: API anahtarını kaydet ve istemciyi başlat
function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    // Eski client'ı temizle
    supabase = null;
    
    // Yeni API key'i ayarla
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    // Yeni client oluştur
    const newClient = initializeSupabase();
    
    if (newClient) {
        document.getElementById('apiKeyModal').style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
        testConnection();
    }
}



        

// API anahtarı modalını göster
function showApiKeyModal() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.value = SUPABASE_ANON_KEY || '';
        document.getElementById('apiKeyModal').style.display = 'flex';
    }
}



        
// API anahtarı yardımı göster
function showApiKeyHelp() {
    const helpWindow = window.open('', '_blank');
    helpWindow.document.write(`
        <html>
        <head>
            <title>Supabase API Anahtarı Alma Rehberi</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #2c3e50; }
                .step { margin-bottom: 20px; padding: 15px; background: #f5f7fa; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>Supabase API Anahtarı Nasıl Alınır?</h1>
            <div class="step">
                <h3>1. Supabase hesabınıza giriş yapın</h3>
                <p><a href="https://supabase.com/dashboard" target="_blank">https://supabase.com/dashboard</a></p>
            </div>
            <div class="step">
                <h3>2. Projenizi seçin veya yeni proje oluşturun</h3>
            </div>
            <div class="step">
                <h3>3. Sol menüden Settings (Ayarlar) seçeneğine tıklayın</h3>
            </div>
            <div class="step">
                <h3>4. API sekmesine gidin</h3>
            </div>
            <div class="step">
                <h3>5. "Project API Keys" bölümündeki "anon" veya "public" anahtarını kopyalayın</h3>
                <p>Bu anahtarı uygulamadaki API anahtarı alanına yapıştırın.</p>
            </div>
            <div class="step">
                <h3>Önemli Not:</h3>
                <p>API anahtarınızı asla paylaşmayın ve gizli tutun.</p>
            </div>
        </body>
        </html>
    `);
}




        
// FIXED: Supabase bağlantısını test et
async function testConnection() {
    if (!supabase) {
        console.warn('Supabase client not initialized for connection test');
        showAlert('Supabase istemcisi başlatılmadı. Lütfen API anahtarını girin.', 'error');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        console.log('Supabase connection test successful:', data);
        showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        showAlert('Veritabanına bağlanılamıyor. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin.', 'error');
        return false;
    }
}



 // Çevrimdışı destek
        function setupOfflineSupport() {
            window.addEventListener('online', () => {
                document.getElementById('offlineIndicator').style.display = 'none';
                elements.connectionStatus.textContent = 'Çevrimiçi';
                showAlert('Çevrimiçi moda geçildi. Veriler senkronize ediliyor...', 'success');
                syncOfflineData();
            });

            window.addEventListener('offline', () => {
                document.getElementById('offlineIndicator').style.display = 'block';
                elements.connectionStatus.textContent = 'Çevrimdışı';
                showAlert('Çevrimdışı moda geçildi. Değişiklikler internet bağlantısı sağlandığında senkronize edilecek.', 'warning');
            });

            // Başlangıçta çevrimiçi durumu kontrol et
            if (!navigator.onLine) {
                document.getElementById('offlineIndicator').style.display = 'block';
                elements.connectionStatus.textContent = 'Çevrimdışı';
            }
        }

        // Çevrimdışı verileri senkronize et
        async function syncOfflineData() {
            const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
            
            if (Object.keys(offlineData).length === 0) return;
            
            showAlert('Çevrimdışı veriler senkronize ediliyor...', 'warning');
            
            try {
                // Paketleri senkronize et
                if (offlineData.packages && offlineData.packages.length > 0) {
                    for (const pkg of offlineData.packages) {
                        const { error } = await supabase
                            .from('packages')
                            .insert([pkg]);
                        
                        if (error) console.error('Paket senkronizasyon hatası:', error);
                    }
                }
                
                // Barkodları senkronize et
                if (offlineData.barcodes && offlineData.barcodes.length > 0) {
                    for (const barcode of offlineData.barcodes) {
                        const { error } = await supabase
                            .from('barcodes')
                            .insert([barcode]);
                        
                        if (error) console.error('Barkod senkronizasyon hatası:', error);
                    }
                }
                
                // Stok güncellemelerini senkronize et
                if (offlineData.stockUpdates && offlineData.stockUpdates.length > 0) {
                    for (const update of offlineData.stockUpdates) {
                        const { error } = await supabase
                            .from('stock_items')
                            .update({ quantity: update.quantity })
                            .eq('code', update.code);
                        
                        if (error) console.error('Stok senkronizasyon hatası:', error);
                    }
                }
                
                // Başarılı senkronizasyondan sonra çevrimdışı verileri temizle
                localStorage.removeItem('procleanOfflineData');
                showAlert('Çevrimdışı veriler başarıyla senkronize edildi', 'success');
                
            } catch (error) {
                console.error('Senkronizasyon hatası:', error);
                showAlert('Veri senkronizasyonu sırasında hata oluştu', 'error');
            }
        }

        // Çevrimdışı veri kaydetme
        function saveOfflineData(type, data) {
            const offlineData = JSON.parse(localStorage.getItem('procleanOfflineData') || '{}');
            
            if (!offlineData[type]) {
                offlineData[type] = [];
            }
            
            offlineData[type].push(data);
            localStorage.setItem('procleanOfflineData', JSON.stringify(offlineData));
        }



   // Data loading functions
   async function populateCustomers() {
    try {
        if (!elements.customerSelect) {
            console.error('Customer select element not found');
            showAlert('Müşteri seçim alanı bulunamadı', 'error');
            return;
        }
        
        // Clear dropdown
        elements.customerSelect.innerHTML = '<option value="">Müşteri seçin...</option>';
        
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (error) {
            handleSupabaseError(error, 'Müşteri yükleme');
            return;
        }

        if (customers && customers.length > 0) {
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.code})`;
                elements.customerSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error in populateCustomers:', error);
        showAlert('Müşteri yükleme hatası: ' + error.message, 'error');
    }
}




 async function populatePersonnel() {
            try {
                // Dropdown'u temizle
                elements.personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';
                
                const { data: personnel, error } = await supabase
                    .from('personnel')
                    .select('*')
                    .order('name');

                if (error) {
                    console.error('Error loading personnel:', error);
                    // Add default current user
                    const option = document.createElement('option');
                    option.value = currentUser?.uid || 'default';
                    option.textContent = currentUser?.name || 'Mevcut Kullanıcı';
                    option.selected = true;
                    elements.personnelSelect.appendChild(option);
                    return;
                }

                if (personnel && personnel.length > 0) {
                    personnel.forEach(person => {
                        const option = document.createElement('option');
                        option.value = person.id;
                        option.textContent = person.name;
                        elements.personnelSelect.appendChild(option);
                    });
                }
                
            } catch (error) {
                console.error('Error in populatePersonnel:', error);
                // Add default current user
                const option = document.createElement('option');
                option.value = currentUser?.uid || 'default';
                option.textContent = currentUser?.name || 'Mevcut Kullanıcı';
                option.selected = true;
                elements.personnelSelect.appendChild(option);
            }
        }


        

       async function populatePackagesTable() {
    try {
        elements.packagesTableBody.innerHTML = '';
        
        const { data: packages, error } = await supabase
            .from('packages')
            .select(`
                *,
                customers (name, code)
            `)
            .is('container_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading packages:', error);
            showAlert('Paket verileri yüklenemedi', 'error');
            return;
        }

        if (packages && packages.length > 0) {
            packages.forEach(pkg => {
                const row = document.createElement('tr');
                
                // Format product information
                let productInfo = '';
                if (pkg.items && typeof pkg.items === 'object') {
                    productInfo = Object.entries(pkg.items)
                        .map(([product, quantity]) => `${product}: ${quantity}`)
                        .join(', ');
                }
                
                // Paket verilerini data attribute olarak sakla
                row.innerHTML = `
                    <td><input type="checkbox" value="${pkg.id}" data-package='${JSON.stringify(pkg).replace(/'/g, "&apos;")}' onchange="updatePackageSelection()"></td>
                    <td>${pkg.package_no}</td>
                    <td>${pkg.customers?.name || 'N/A'}</td>
                    <td>${productInfo || 'N/A'}</td>
                    <td>${new Date(pkg.created_at).toLocaleDateString('tr-TR')}</td>
                    <td><span class="status-${pkg.status}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                `;
                row.onclick = (e) => {
                    if (e.target.type !== 'checkbox') {
                        selectPackage(pkg);
                    }
                };
                elements.packagesTableBody.appendChild(row);
            });
            
            elements.totalPackages.textContent = packages.length;
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            elements.packagesTableBody.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası', 'error');
    }
}


        
        
        // Helper function to calculate total quantity of selected packages
        async function calculateTotalQuantity(packageIds) {
            try {
                const { data: packages, error } = await supabase
                    .from('packages')
                    .select('total_quantity')
                    .in('id', packageIds);
                    
                if (error) throw error;
                
                return packages.reduce((sum, pkg) => sum + pkg.total_quantity, 0);
            } catch (error) {
                console.error('Error calculating total quantity:', error);
                return packageIds.length; // Fallback to package count
            }
        }


        

        // Update the populateShippingTable function to use customer folders
        async function populateShippingTable() {
            try {
                elements.shippingFolders.innerHTML = '';
                
                const filter = elements.shippingFilter?.value || 'all';
                let query = supabase
                    .from('containers')
                    .select(`
                        *,
                        packages (
                            id,
                            package_no,
                            total_quantity,
                            customers (name, code)
                        )
                    `);
                
                if (filter !== 'all') {
                    query = query.eq('status', filter);
                }
                
                const { data: containers, error } = await query.order('created_at', { ascending: false });

                if (error) {
                    console.error('Error loading containers:', error);
                    showAlert('Sevkiyat verileri yüklenemedi', 'error');
                    return;
                }

                if (containers && containers.length > 0) {
                    // Müşterilere göre grupla
                    const customersMap = {};
                    
                    containers.forEach(container => {
                        const customerName = container.packages && container.packages.length > 0 ? 
                            container.packages[0].customers?.name : container.customer || 'Diğer';
                        
                        if (!customersMap[customerName]) {
                            customersMap[customerName] = [];
                        }
                        
                        customersMap[customerName].push(container);
                    });
                    
                    // Müşteri klasörlerini oluştur
                    for (const [customerName, customerContainers] of Object.entries(customersMap)) {
                        const folderDiv = document.createElement('div');
                        folderDiv.className = 'customer-folder';
                        
                        const folderHeader = document.createElement('div');
                        folderHeader.className = 'folder-header';
                        folderHeader.innerHTML = `
                            <span>${customerName}</span>
                            <span class="folder-toggle"><i class="fas fa-chevron-right"></i></span>
                        `;
                        
                        const folderContent = document.createElement('div');
                        folderContent.className = 'folder-content';
                        
                        const table = document.createElement('table');
                        table.className = 'package-table';
                        table.innerHTML = `
                            <thead>
                                <tr>
                                    <th><input type="checkbox" class="select-all-customer" onchange="toggleSelectAllCustomer(this)"></th>
                                    <th>Konteyner No</th>
                                    <th>Paket Sayısı</th>
                                    <th>Toplam Adet</th>
                                    <th>Tarih</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customerContainers.map(container => `
                                    <tr>
                                        <td><input type="checkbox" value="${container.id}" class="container-checkbox"></td>
                                        <td>${container.container_no}</td>
                                        <td>${container.package_count || 0}</td>
                                        <td>${container.total_quantity || 0}</td>
                                        <td>${container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                                        <td><span class="status-${container.status}">${container.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                                        <td>
                                            <button onclick="viewContainerDetails('${container.id}')" class="btn btn-primary btn-sm">Detay</button>
                                            <button onclick="sendToRamp('${container.container_no}')" class="btn btn-warning btn-sm">Paket Ekle</button>
                                            <button onclick="shipContainer('${container.container_no}')" class="btn btn-success btn-sm">Sevk Et</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        `;
                        
                        folderContent.appendChild(table);
                        folderDiv.appendChild(folderHeader);
                        folderDiv.appendChild(folderContent);
                        
                        // Klasör açma/kapama işlevi
                        folderHeader.addEventListener('click', () => {
                            folderDiv.classList.toggle('folder-open');
                            folderContent.style.display = folderDiv.classList.contains('folder-open') ? 'block' : 'none';
                        });
                        
                        elements.shippingFolders.appendChild(folderDiv);
                    }
                } else {
                    elements.shippingFolders.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Sevkiyat verisi yok</p>';
                }
                
            } catch (error) {
                console.error('Error in populateShippingTable:', error);
                showAlert('Sevkiyat tablosu yükleme hatası', 'error');
            }
        }





 // Konteyner detaylarını görüntüle
        async function viewContainerDetails(containerId) {
            try {
                const { data: container, error } = await supabase
                    .from('containers')
                    .select(`
                        *,
                        packages (
                            *,
                            customers (name, code)
                        )
                    `)
                    .eq('id', containerId)
                    .single();

                if (error) throw error;
                
                currentContainerDetails = container;
                
                const modalTitle = document.getElementById('containerDetailTitle');
                const modalContent = document.getElementById('containerDetailContent');
                
                modalTitle.textContent = `Konteyner: ${container.container_no}`;
                
                let contentHTML = `
                    <p><strong>Durum:</strong> <span class="container-status status-${container.status}">${container.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></p>
                    <p><strong>Oluşturulma Tarihi:</strong> ${new Date(container.created_at).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Paket Sayısı:</strong> ${container.package_count || 0}</p>
                    <p><strong>Toplam Adet:</strong> ${container.total_quantity || 0}</p>
                `;
                
                if (container.packages && container.packages.length > 0) {
                    contentHTML += `
                        <h4>Paketler</h4>
                        <table class="package-table">
                            <thead>
                                <tr>
                                    <th>Paket No</th>
                                    <th>Müşteri</th>
                                    <th>Adet</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${container.packages.map(pkg => `
                                    <tr>
                                        <td>${pkg.package_no}</td>
                                        <td>${pkg.customers?.name || 'N/A'}</td>
                                        <td>${pkg.total_quantity}</td>
                                        <td><span class="status-${pkg.status}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
                
                modalContent.innerHTML = contentHTML;
                document.getElementById('containerDetailModal').style.display = 'flex';
                
            } catch (error) {
                console.error('Error loading container details:', error);
                showAlert('Konteyner detayları yüklenirken hata oluştu', 'error');
            }
        }




// Konteyner detay modalından sevk et
        async function shipContainerFromModal() {
            if (currentContainerDetails) {
                await shipContainer(currentContainerDetails.container_no);
                closeContainerDetailModal();
            }
        }



        
        // Konteyner ara
        function searchContainers() {
            const searchTerm = elements.containerSearch.value.toLowerCase();
            const folders = document.querySelectorAll('.customer-folder');
            
            folders.forEach(folder => {
                const containerRows = folder.querySelectorAll('tbody tr');
                let hasVisibleRows = false;
                
                containerRows.forEach(row => {
                    const containerNo = row.cells[1].textContent.toLowerCase();
                    if (containerNo.includes(searchTerm)) {
                        row.style.display = '';
                        hasVisibleRows = true;
                    } else {
                        row.style.display = 'none';
                    }
                });
                
                // Eğer bu klasörde görünebilir satır yoksa, klasörü gizle
                const folderHeader = folder.querySelector('.folder-header');
                if (hasVisibleRows) {
                    folder.style.display = 'block';
                    folderHeader.style.display = 'flex';
                } else {
                    folder.style.display = 'none';
                }
            });
        }



  async function populateStockTable() {
            try {
                elements.stockTableBody.innerHTML = '';
                
                const { data: stockItems, error } = await supabase
                    .from('stock_items')
                    .select('*')
                    .order('name');

                if (error) {
                    console.error('Error loading stock items:', error);
                    showAlert('Stok verileri yüklenemedi', 'error');
                    return;
                }

                if (stockItems && stockItems.length > 0) {
                    stockItems.forEach(item => {
                        const row = document.createElement('tr');
                        
                        // Determine stock status
                        let statusClass = 'status-stokta';
                        let statusText = 'Stokta';
                        
                        if (item.quantity <= 0) {
                            statusClass = 'status-kritik';
                            statusText = 'Kritik';
                        } else if (item.quantity < 10) {
                            statusClass = 'status-az-stok';
                            statusText = 'Az Stok';
                        }
                        
                        row.innerHTML = `
                            <td>${item.code}</td>
                            <td>${item.name}</td>
                            <td class="editable-cell">
                                <span class="stock-quantity">${item.quantity}</span>
                                <input type="number" class="stock-quantity-input" value="${item.quantity}" style="display:none;">
                            </td>
                            <td>${item.unit || 'Adet'}</td>
                            <td><span class="${statusClass}">${statusText}</span></td>
                            <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                            <td>
                                <button onclick="editStockItem(this, '${item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                                <div class="edit-buttons" style="display:none;">
                                    <button onclick="saveStockItem('${item.code}')" class="btn btn-success btn-sm">Kaydet</button>
                                    <button onclick="cancelEditStockItem('${item.code}', ${item.quantity})" class="btn btn-secondary btn-sm">İptal</button>
                                </div>
                            </td>
                        `;
                        elements.stockTableBody.appendChild(row);
                    });
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Stok verisi yok</td>';
                    elements.stockTableBody.appendChild(row);
                }
                
            } catch (error) {
                console.error('Error in populateStockTable:', error);
                showAlert('Stok tablosu yükleme hatası', 'error');
            }
        }



 
        async function saveStockItem(code) {
            const row = document.querySelector(`tr:has(td:first-child:contains("${code}"))`);
            const quantityInput = row.querySelector('.stock-quantity-input');
            const quantitySpan = row.querySelector('.stock-quantity');
            const editButton = row.querySelector('button');
            const editButtons = row.querySelector('.edit-buttons');
            const newQuantity = parseInt(quantityInput.value);
            
            if (isNaN(newQuantity) || newQuantity < 0) {
                showAlert('Geçerli bir miktar girin', 'error');
                return;
            }
            
            try {
                if (!navigator.onLine) {
                    // Çevrimdışı mod
                    saveOfflineData('stockUpdates', {
                        code: code,
                        quantity: newQuantity,
                        updated_at: new Date().toISOString()
                    });
                    showAlert(`Stok çevrimdışı güncellendi: ${code}`, 'warning');
                } else {
                    // Çevrimiçi mod
                    const { error } = await supabase
                        .from('stock_items')
                        .update({ 
                            quantity: newQuantity,
                            updated_at: new Date().toISOString()
                        })
                        .eq('code', code);
                    
                    if (error) throw error;
                    
                    showAlert(`Stok güncellendi: ${code}`, 'success');
                }
                
                // Görünümü güncelle
                quantitySpan.textContent = newQuantity;
                quantitySpan.style.display = 'block';
                quantityInput.style.display = 'none';
                editButton.style.display = 'block';
                editButtons.style.display = 'none';
                
                // Durumu yeniden hesapla
                const statusCell = row.querySelector('td:nth-child(5) span');
                if (newQuantity <= 0) {
                    statusCell.className = 'status-kritik';
                    statusCell.textContent = 'Kritik';
                } else if (newQuantity < 10) {
                    statusCell.className = 'status-az-stok';
                    statusCell.textContent = 'Az Stok';
                } else {
                    statusCell.className = 'status-stokta';
                    statusCell.textContent = 'Stokta';
                }
                
                editingStockItem = null;
                
            } catch (error) {
                console.error('Error updating stock:', error);
                showAlert('Stok güncellenirken hata oluştu', 'error');
            }
        }




 // Barkod işleme fonksiyonu
      async function processBarcode() {
    if (!elements.barcodeInput) {
        showAlert('Barkod girişi bulunamadı', 'error');
        return;
    }
    
    const barcode = elements.barcodeInput.value.trim();
    if (!barcode) {
        showAlert('Barkod girin', 'error');
        return;
    }

    if (!selectedCustomer) {
        showAlert('Önce müşteri seçin', 'error');
        return;
    }

    try {
        const barcodeData = {
            barcode: barcode,
            customer_id: selectedCustomer.id,
            scanned_at: new Date().toISOString(),
            processed: false
        };

        if (!navigator.onLine) {
            // Offline mode
            saveOfflineData('barcodes', barcodeData);
            scannedBarcodes.push({...barcodeData, id: 'offline-' + Date.now()});
            showAlert(`Barkod çevrimdışı kaydedildi: ${barcode}`, 'warning');
        } else {
            // Online mode with proper error handling
            if (!supabase) {
                throw new Error('Supabase client not initialized');
            }
            
            const { data, error } = await supabase
                .from('barcodes')
                .insert([barcodeData])
                .select();

            if (error) {
                handleSupabaseError(error, 'Barkod kaydetme');
                return;
            }

            if (data && data.length > 0) {
                scannedBarcodes.push(data[0]);
                showAlert(`Barkod kaydedildi: ${barcode}`, 'success');
            }
        }

        elements.barcodeInput.value = '';
        if (elements.barcodeInput.focus) {
            elements.barcodeInput.focus();
        }
        
        displayScannedBarcodes();
        
    } catch (error) {
        console.error('Barkod işleme hatası:', error);
        showAlert('Barkod işlenirken bir hata oluştu: ' + error.message, 'error');
    }
}



 // Customer operations
        async function showCustomers() {
            try {
                elements.customerList.innerHTML = '';
                
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name');

                if (error) {
                    console.error('Error loading customers:', error);
                    showAlert('Müşteri verileri yüklenemedi', 'error');
                    return;
                }

                if (customers && customers.length > 0) {
                    customers.forEach(customer => {
                        const div = document.createElement('div');
                        div.className = 'customer-item';
                        div.innerHTML = `
                            <div>
                                <strong>${customer.name}</strong><br>
                                <small>${customer.code}</small>
                            </div>
                        `;
                        div.onclick = () => selectCustomerFromModal(customer);
                        elements.customerList.appendChild(div);
                    });
                }
                
                document.getElementById('customerModal').style.display = 'flex';
            } catch (error) {
                console.error('Error in showCustomers:', error);
                showAlert('Müşteri listesi yükleme hatası', 'error');
            }
        }


        

        async function showAllCustomers() {
            try {
                elements.allCustomersList.innerHTML = '';
                
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name');

                if (error) {
                    console.error('Error loading customers:', error);
                    showAlert('Müşteri verileri yüklenemedi', 'error');
                    return;
                }

                if (customers && customers.length > 0) {
                    customers.forEach(customer => {
                        const div = document.createElement('div');
                        div.className = 'customer-item';
                        div.innerHTML = `
                            <div>
                                <strong>${customer.name}</strong> (${customer.code})<br>
                                <small>${customer.email || 'E-posta yok'}</small>
                            </div>
                            <button onclick="deleteCustomer('${customer.id}')" class="btn btn-danger btn-sm">Sil</button>
                        `;
                        elements.allCustomersList.appendChild(div);
                    });
                }
                
                document.getElementById('allCustomersModal').style.display = 'flex';
            } catch (error) {
                console.error('Error in showAllCustomers:', error);
                showAlert('Müşteri yönetimi yükleme hatası', 'error');
            }
        }


        

        async function addNewCustomer() {
            const code = document.getElementById('newCustomerCode').value.trim();
            const name = document.getElementById('newCustomerName').value.trim();
            const email = document.getElementById('newCustomerEmail').value.trim();

            // Form doğrulama
            if (!validateForm([
                { id: 'newCustomerCode', errorId: 'customerCodeError', type: 'text', required: true },
                { id: 'newCustomerName', errorId: 'customerNameError', type: 'text', required: true },
                { id: 'newCustomerEmail', errorId: 'customerEmailError', type: 'email', required: false }
            ])) {
                return;
            }

            try {
                const { error } = await supabase
                    .from('customers')
                    .insert([{ code, name, email: email || null }]);

                if (error) {
                    console.error('Error adding customer:', error);
                    showAlert('Müşteri eklenirken hata: ' + error.message, 'error');
                    return;
                }

                showAlert('Müşteri başarıyla eklendi', 'success');
                
                // Clear form
                document.getElementById('newCustomerCode').value = '';
                document.getElementById('newCustomerName').value = '';
                document.getElementById('newCustomerEmail').value = '';
                
                // Refresh lists
                await populateCustomers();
                await showAllCustomers();
                
            } catch (error) {
                console.error('Error in addNewCustomer:', error);
                showAlert('Müşteri ekleme hatası', 'error');
            }
        }


        

        async function deleteCustomer(customerId) {
            if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;

            try {
                const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', customerId);

                if (error) {
                    console.error('Error deleting customer:', error);
                    showAlert('Müşteri silinirken hata: ' + error.message, 'error');
                    return;
                }

                showAlert('Müşteri başarıyla silindi', 'success');
                
                // Refresh lists
                await populateCustomers();
                await showAllCustomers();
                
            } catch (error) {
                console.error('Error in deleteCustomer:', error);
                showAlert('Müşteri silme hatası', 'error');
            }
        }



async function completePackage() {
            if (!selectedCustomer) {
                showAlert('Önce müşteri seçin', 'error');
                return;
            }

            if (!currentPackage.items || Object.keys(currentPackage.items).length === 0) {
                showAlert('Pakete ürün ekleyin', 'error');
                return;
            }

            try {
                const packageNo = `PKG-${Date.now()}`;
                const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);
                const selectedPersonnel = elements.personnelSelect.value;

                const packageData = {
                    package_no: packageNo,
                    customer_id: selectedCustomer.id,
                    items: currentPackage.items,
                    total_quantity: totalQuantity,
                    status: 'beklemede',
                    packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
                    created_at: new Date().toISOString()
                };

                if (!navigator.onLine) {
                    // Çevrimdışı mod
                    saveOfflineData('packages', packageData);
                    showAlert(`Paket çevrimdışı oluşturuldu: ${packageNo}`, 'warning');
                } else {
                    // Çevrimiçi mod
                    const { data, error } = await supabase
                        .from('packages')
                        .insert([packageData])
                        .select();

                    if (error) {
                        console.error('Error creating package:', error);
                        showAlert('Paket oluşturulurken hata: ' + error.message, 'error');
                        return;
                    }

                    showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');
                }

                // Reset current package and quantities
                currentPackage = {};
                document.querySelectorAll('.quantity-badge').forEach(badge => {
                    badge.textContent = '0';
                });
                
                // Taranan barkodları işlendi olarak işaretle
                if (scannedBarcodes.length > 0 && navigator.onLine) {
                    const barcodeIds = scannedBarcodes.filter(b => b.id && !b.id.startsWith('offline-')).map(b => b.id);
                    if (barcodeIds.length > 0) {
                        await supabase
                            .from('barcodes')
                            .update({ processed: true })
                            .in('id', barcodeIds);
                    }
                    scannedBarcodes = [];
                    displayScannedBarcodes();
                }
                
                // Refresh packages table
                await populatePackagesTable();
                
            } catch (error) {
                console.error('Error in completePackage:', error);
                showAlert('Paket oluşturma hatası', 'error');
            }
        }



async function deleteSelectedPackages() {
            const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
            if (checkboxes.length === 0) {
                showAlert('Silinecek paket seçin', 'error');
                return;
            }

            if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

            try {
                const packageIds = Array.from(checkboxes).map(cb => cb.value);
                
                const { error } = await supabase
                    .from('packages')
                    .delete()
                    .in('id', packageIds);

                if (error) {
                    console.error('Error deleting packages:', error);
                    showAlert('Paketler silinirken hata: ' + error.message, 'error');
                    return;
                }

                showAlert(`${packageIds.length} paket silindi`, 'success');
                await populatePackagesTable();
                
            } catch (error) {
                console.error('Error in deleteSelectedPackages:', error);
                showAlert('Paket silme hatası', 'error');
            }
        }




// Shipping operations
        async function sendToRamp(containerNo = null) {
            try {
                const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
                    .map(cb => cb.value);
                
                if (selectedPackages.length === 0) {
                    showAlert('Rampaya göndermek için paket seçin', 'error');
                    return;
                }

                // Use existing container or create a new one
                let containerId;
                if (containerNo && currentContainer) {
                    containerId = currentContainer;
                } else {
                    const timestamp = new Date().getTime();
                    containerNo = `CONT-${timestamp.toString().slice(-6)}`;
                    
                    const { data: newContainer, error } = await supabase
                        .from('containers')
                        .insert([{
                            container_no: containerNo,
                            customer: selectedCustomer?.name || '',
                            package_count: selectedPackages.length,
                            total_quantity: await calculateTotalQuantity(selectedPackages),
                            status: 'beklemede',
                            created_at: new Date().toISOString()
                        }])
                        .select();

                    if (error) throw error;
                    
                    containerId = newContainer[0].id;
                    currentContainer = containerNo;
                    elements.containerNumber.textContent = containerNo;
                    saveAppState();
                }

                // Update packages with container reference
                const { error: updateError } = await supabase
                    .from('packages')
                    .update({ 
                        container_id: containerId,
                        status: 'sevk-edildi'
                    })
                    .in('id', selectedPackages);

                if (updateError) throw updateError;

                showAlert(`${selectedPackages.length} paket konteynere eklendi: ${containerNo}`, 'success');
                
                // Refresh tables
                await populatePackagesTable();
                await populateShippingTable();
                
            } catch (error) {
                console.error('Error sending to ramp:', error);
                showAlert('Paketler konteynere eklenirken hata oluştu: ' + error.message, 'error');
            }
        }



        
        async function shipContainer(containerNo) {
            try {
                // First get the container ID
                const { data: container, error: fetchError } = await supabase
                    .from('containers')
                    .select('id')
                    .eq('container_no', containerNo)
                    .single();

                if (fetchError) throw fetchError;

                // Update container status
                const { error: updateError } = await supabase
                    .from('containers')
                    .update({ status: 'sevk-edildi' })
                    .eq('id', container.id);

                if (updateError) throw updateError;

                showAlert(`Konteyner ${containerNo} sevk edildi`, 'success');
                await populateShippingTable();
                
            } catch (error) {
                console.error('Error shipping container:', error);
                showAlert('Konteyner sevk edilirken hata oluştu: ' + error.message, 'error');
            }
        }


        

        function filterShipping() {
            populateShippingTable();
        }



