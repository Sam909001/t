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

     

// Yardımcı fonksiyonlar
function getSupabaseClient() {
    if (!supabase) {
        return initializeSupabase();
    }
    return supabase;
}




        
function isSupabaseReady() {
    return supabase !== null && SUPABASE_ANON_KEY !== null;
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





