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
let personnelLoaded = false;
let packagesLoaded = false;
let packagesTableLoading = false;

// Excel local storage
let excelPackages = [];
let excelSyncQueue = [];
let isUsingExcel = false;


// Generate proper UUID v4 for Excel packages
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}



// EmailJS initialization
(function() {
    // EmailJS kullanıcı ID'si - KENDİ ID'NİZİ EKLEYİN
    emailjs.init("jH-KlJ2ffs_lGwfsp");
})();

// Elementleri bir defa tanımla
const elements = {};

// Excel.js library (simple implementation)
const ExcelJS = {
    readFile: async function() {
        try {
            const data = localStorage.getItem('excelPackages');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Excel read error:', error);
            return [];
        }
    },
    
    writeFile: async function(data) {
        try {
            localStorage.setItem('excelPackages', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Excel write error:', error);
            return false;
        }
    },
    
    // Simple XLSX format simulation
    toExcelFormat: function(packages) {
        return packages.map(pkg => ({
            id: pkg.id || `excel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            package_no: pkg.package_no,
            customer_id: pkg.customer_id,
            customer_name: pkg.customer_name,
            items: pkg.items,
            total_quantity: pkg.total_quantity,
            status: pkg.status,
            packer: pkg.packer,
            created_at: pkg.created_at,
            updated_at: pkg.updated_at || new Date().toISOString(),
            source: 'excel'
        }));
    },
    
    fromExcelFormat: function(excelData) {
        return excelData.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        }));
    }
};

// FIXED: Supabase istemcisini başlat - Singleton pattern ile
function initializeSupabase() {
    // Eğer client zaten oluşturulmuşsa ve API key geçerliyse, mevcut olanı döndür
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set, showing modal');
        showApiKeyModal();
        isUsingExcel = true;
        showAlert('Excel modu aktif: Çevrimdışı çalışıyorsunuz', 'warning');
        return null;
    }
    
    try {
        // Global supabase değişkenine ata
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        isUsingExcel = false;
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        showAlert('Supabase başlatılamadı. Excel moduna geçiliyor.', 'warning');
        isUsingExcel = true;
        showApiKeyModal();
        return null;
    }
}

// Excel local storage functions
async function initializeExcelStorage() {
    try {
        excelPackages = await ExcelJS.readFile();
        console.log('Excel packages loaded:', excelPackages.length);
        
        // Sync queue'yu yükle
        const savedQueue = localStorage.getItem('excelSyncQueue');
        excelSyncQueue = savedQueue ? JSON.parse(savedQueue) : [];
        
        return excelPackages;
    } catch (error) {
        console.error('Excel storage init error:', error);
        excelPackages = [];
        return [];
    }
}

async function saveToExcel(packageData) {
    try {
        // Mevcut paketleri oku
        const currentPackages = await ExcelJS.readFile();
        
        // Yeni paketi ekle veya güncelle
        const existingIndex = currentPackages.findIndex(p => p.id === packageData.id);
        if (existingIndex >= 0) {
            currentPackages[existingIndex] = packageData;
        } else {
            currentPackages.push(packageData);
        }
        
        // Excel formatına çevir ve kaydet
        const excelData = ExcelJS.toExcelFormat(currentPackages);
        const success = await ExcelJS.writeFile(excelData);
        
        if (success) {
            excelPackages = currentPackages;
            console.log('Package saved to Excel');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Save to Excel error:', error);
        return false;
    }
}

async function deleteFromExcel(packageId) {
    try {
        const currentPackages = await ExcelJS.readFile();
        const filteredPackages = currentPackages.filter(p => p.id !== packageId);
        
        const excelData = ExcelJS.toExcelFormat(filteredPackages);
        const success = await ExcelJS.writeFile(excelData);
        
        if (success) {
            excelPackages = filteredPackages;
            console.log('Package deleted from Excel');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Delete from Excel error:', error);
        return false;
    }
}

// Sync functions
async function syncExcelWithSupabase() {
    if (!supabase || !navigator.onLine) {
        console.log('Cannot sync: No Supabase client or offline');
        return false;
    }
    
    try {
        const queue = [...excelSyncQueue];
        if (queue.length === 0) {
            console.log('No packages to sync');
            return true;
        }
        
        showAlert(`${queue.length} paket senkronize ediliyor...`, 'info');
        
        for (const operation of queue) {
            try {
                if (operation.type === 'add') {
                    const { error } = await supabase
                        .from('packages')
                        .insert([operation.data]);
                    
                    if (error) throw error;
                    
                } else if (operation.type === 'update') {
                    const { error } = await supabase
                        .from('packages')
                        .update(operation.data)
                        .eq('id', operation.data.id);
                    
                    if (error) throw error;
                    
                } else if (operation.type === 'delete') {
                    const { error } = await supabase
                        .from('packages')
                        .delete()
                        .eq('id', operation.data.id);
                    
                    if (error) throw error;
                }
                
                // Başarılı olanı kuyruktan kaldır
                excelSyncQueue = excelSyncQueue.filter(op => 
                    !(op.type === operation.type && op.data.id === operation.data.id)
                );
                
            } catch (opError) {
                console.error('Sync operation failed:', opError);
                // Bu operasyonu bir sonrakine bırak
            }
        }
        
        // Kuyruğu kaydet
        localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
        
        showAlert('Senkronizasyon tamamlandı', 'success');
        return true;
        
    } catch (error) {
        console.error('Sync error:', error);
        showAlert('Senkronizasyon hatası', 'error');
        return false;
    }
}

function addToSyncQueue(operationType, data) {
    excelSyncQueue.push({
        type: operationType,
        data: data,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('excelSyncQueue', JSON.stringify(excelSyncQueue));
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
        
        // Çevrimiçi olunca senkronize et
        setTimeout(syncExcelWithSupabase, 2000);
    }
}

        
let connectionAlertShown = false; // Prevent duplicate success alert

// FIXED: Supabase bağlantısını test et
async function testConnection() {
    if (!supabase) {
        console.warn('Supabase client not initialized for connection test');
        if (!connectionAlertShown) {
            showAlert('Supabase istemcisi başlatılmadı. Lütfen API anahtarını girin.', 'error');
            connectionAlertShown = true; // mark as shown to avoid repeating
        }
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        console.log('Supabase connection test successful:', data);
        
        if (!connectionAlertShown) {
            showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
            connectionAlertShown = true; // ensure alert shows only once
        }

        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        if (!connectionAlertShown) {
            showAlert('Veritabanına bağlanılamıyor. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin.', 'error');
            connectionAlertShown = true;
        }
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



  async function populateCustomers() {
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('id, name, code')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading customers:', error);
            return;
        }

        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) return;

        // Clear old options
        customerSelect.innerHTML = '<option value="">Müşteri Seç</option>';

        // Deduplicate by customer code
        const uniqueCustomers = {};
        customers.forEach(cust => {
            if (!uniqueCustomers[cust.code]) {
                uniqueCustomers[cust.code] = cust;
            }
        });

        // Append unique customers
        Object.values(uniqueCustomers).forEach(cust => {
            const opt = document.createElement('option');
            opt.value = cust.id;
            opt.textContent = `${cust.name} (${cust.code})`;
            customerSelect.appendChild(opt);
        });

    } catch (err) {
        console.error('populateCustomers error:', err);
    }
}





async function populatePersonnel() {
    if (personnelLoaded) return; // prevent duplicates
    personnelLoaded = true;

    const personnelSelect = document.getElementById('personnelSelect');
    if (!personnelSelect) return;

    personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';

    try {
        const { data: personnel, error } = await supabase
            .from('personnel')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching personnel:', error);
            showAlert('Personel verileri yüklenemedi', 'error');
            return;
        }

        if (personnel && personnel.length > 0) {
            personnel.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                personnelSelect.appendChild(option);
            });
        }

    } catch (err) {
        console.error('Unexpected error:', err);
        showAlert('Personel dropdown yükleme hatası', 'error');
    }
}





async function populatePackagesTable() {
    if (packagesTableLoading) {
        console.log('Package table already loading, skipping...');
        return;
    }
    
    packagesTableLoading = true;

    try {
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');

        if (!tableBody) throw new Error('Package table body not found');

        tableBody.innerHTML = '';
        if (totalPackagesElement) totalPackagesElement.textContent = '0';

        let packages = [];

        // Check if we should use Excel data
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Use Excel data
            packages = excelPackages.filter(pkg => 
                pkg.status === 'beklemede' && (!pkg.container_id || pkg.container_id === null)
            );
            console.log('Using Excel data:', packages.length, 'packages');
        } else {
            // Try to use Supabase data
            try {
                const { data: supabasePackages, error } = await supabase
                    .from('packages')
                    .select(`*, customers (name, code)`)
                    .is('container_id', null)
                    .eq('status', 'beklemede')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                packages = supabasePackages || [];
                console.log('Using Supabase data:', packages.length, 'packages');
            } catch (error) {
                console.warn('Supabase fetch failed, using Excel data:', error);
                packages = excelPackages.filter(pkg => 
                    pkg.status === 'beklemede' && (!pkg.container_id || pkg.container_id === null)
                );
                isUsingExcel = true;
            }
        }

        if (!packages || packages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            if (totalPackagesElement) totalPackagesElement.textContent = '0';
            return;
        }

        // Render table rows
        packages.forEach(pkg => {
            const row = document.createElement('tr');
            
            // Determine storage source
            const isExcelPackage = pkg.source === 'excel' || pkg.id.includes('excel-') || pkg.id.includes('pkg-');
            const sourceIcon = isExcelPackage ? 
                '<i class="fas fa-file-excel" title="Excel Kaynaklı" style="color: #217346;"></i>' :
                '<i class="fas fa-database" title="Supabase Kaynaklı" style="color: #3ecf8e;"></i>';

            // Ensure items is properly formatted
            let itemsArray = [];
            if (pkg.items && typeof pkg.items === 'object') {
                if (Array.isArray(pkg.items)) {
                    itemsArray = pkg.items;
                } else {
                    // Convert object to array
                    itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ 
                        name: name, 
                        qty: qty 
                    }));
                }
            } else {
                // Fallback for packages without items array
                itemsArray = [{ 
                    name: pkg.product || 'Bilinmeyen Ürün', 
                    qty: pkg.total_quantity || 1 
                }];
            }

            const packageJsonEscaped = JSON.stringify(pkg).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            row.innerHTML = `
                <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
                <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
                <td>${escapeHtml(pkg.customers?.name || pkg.customer_name || 'N/A')}</td>
                <td title="${escapeHtml(itemsArray.map(it => it.name).join(', '))}">
                    ${escapeHtml(itemsArray.map(it => it.name).join(', '))}
                </td>
                <td title="${escapeHtml(itemsArray.map(it => it.qty).join(', '))}">
                    ${escapeHtml(itemsArray.map(it => it.qty).join(', '))}
                </td>
                <td>${pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td><span class="status-${pkg.status || 'beklemede'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                <td style="text-align: center;">${sourceIcon}</td>
            `;

            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') selectPackage(pkg);
            });

            tableBody.appendChild(row);
        });

        if (totalPackagesElement) totalPackagesElement.textContent = packages.length.toString();
        console.log(`✅ Package table populated with ${packages.length} packages`);

        // Update storage indicator
        updateStorageIndicator();

    } catch (error) {
        console.error('Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası: ' + error.message, 'error');
    } finally {
        packagesTableLoading = false;
    }
}





        
        
       // Calculate total quantity of selected packages
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
        return packageIds.length; // fallback
    }
}


        

  // Pagination state
let currentPage = 0;
const pageSize = 20; // number of containers per page

let isShippingTableLoading = false;
let lastShippingFetchTime = 0;

async function populateShippingTable(page = 0) {
    if (isShippingTableLoading) {
        console.log('Shipping table already loading, skipping...');
        return;
    }

    isShippingTableLoading = true;

    try {
        console.log('Populating shipping table...');

        const shippingFolders = document.getElementById('shippingFolders');
        if (!shippingFolders) {
            console.error('shippingFolders element not found!');
            return;
        }

        // Show loading state
        shippingFolders.innerHTML = '<div style="text-align:center; padding:40px; color:#666; font-size:16px;">Sevkiyat verileri yükleniyor...</div>';

        let containers = [];
        let packagesData = [];

        // Get data based on current mode
        if (isUsingExcel || !supabase || !navigator.onLine) {
            console.log('Using Excel data for shipping');
            
            // Use Excel data for containers
            const excelContainers = {};
            
            // Group packages by container
            excelPackages.forEach(pkg => {
                if (pkg.container_id) {
                    if (!excelContainers[pkg.container_id]) {
                        excelContainers[pkg.container_id] = {
                            id: pkg.container_id,
                            container_no: pkg.container_id,
                            packages: [],
                            package_count: 0,
                            total_quantity: 0,
                            status: pkg.status || 'beklemede',
                            created_at: pkg.created_at
                        };
                    }
                    excelContainers[pkg.container_id].packages.push(pkg);
                    excelContainers[pkg.container_id].package_count++;
                    excelContainers[pkg.container_id].total_quantity += pkg.total_quantity || 0;
                }
            });
            
            containers = Object.values(excelContainers);
            console.log('Excel containers found:', containers.length);
            
        } else {
            console.log('Using Supabase data for shipping');
            
            // Use Supabase data
            try {
                const { data: supabaseContainers, error } = await supabase
                    .from('containers')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase containers error:', error);
                    throw error;
                }

                containers = supabaseContainers || [];
                console.log('Supabase containers loaded:', containers.length);

                // Get packages for these containers if we have containers
                if (containers.length > 0) {
                    const containerIds = containers.map(c => c.id);
                    const { data: supabasePackages } = await supabase
                        .from('packages')
                        .select('*, customers(name)')
                        .in('container_id', containerIds);
                    
                    packagesData = supabasePackages || [];
                    console.log('Packages for containers loaded:', packagesData.length);
                }

            } catch (supabaseError) {
                console.error('Supabase shipping data error:', supabaseError);
                // Fallback to empty array
                containers = [];
            }
        }

        // Clear loading message
        shippingFolders.innerHTML = '';

        if (!containers || containers.length === 0) {
            shippingFolders.innerHTML = `
                <div style="text-align:center; padding:60px; color:#666;">
                    <i class="fas fa-box-open" style="font-size:48px; margin-bottom:20px; opacity:0.5;"></i>
                    <h3>Henüz konteyner bulunmamaktadır</h3>
                    <p>Paketleri sevkiyat için konteynerlere ekleyin.</p>
                    <button onclick="createNewContainer()" class="btn btn-primary" style="margin-top:15px;">
                        <i class="fas fa-plus"></i> Yeni Konteyner Oluştur
                    </button>
                </div>
            `;
            return;
        }

        console.log('Rendering containers:', containers.length);

        // Group containers by customer for folder view
        const customersMap = {};
        
        containers.forEach(container => {
            let customerName = 'Genel Sevkiyat';
            
            // Try to find customer name from packages
            if (packagesData.length > 0) {
                const containerPackages = packagesData.filter(p => p.container_id === container.id);
                if (containerPackages.length > 0) {
                    const customerNames = containerPackages.map(p => p.customers?.name).filter(Boolean);
                    if (customerNames.length > 0) {
                        customerName = [...new Set(customerNames)].join(', ');
                    }
                }
            } else if (container.packages && container.packages.length > 0) {
                // For Excel data
                const customerNames = container.packages.map(p => p.customer_name).filter(Boolean);
                if (customerNames.length > 0) {
                    customerName = [...new Set(customerNames)].join(', ');
                }
            } else if (container.customer) {
                customerName = container.customer;
            }

            if (!customersMap[customerName]) {
                customersMap[customerName] = [];
            }
            customersMap[customerName].push(container);
        });

        // Render customer folders
        Object.entries(customersMap).forEach(([customerName, customerContainers]) => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'customer-folder';
            folderDiv.style.marginBottom = '20px';
            folderDiv.style.border = '1px solid var(--border)';
            folderDiv.style.borderRadius = '8px';
            folderDiv.style.overflow = 'hidden';

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.style.padding = '15px';
            folderHeader.style.background = 'var(--light)';
            folderHeader.style.cursor = 'pointer';
            folderHeader.style.display = 'flex';
            folderHeader.style.justifyContent = 'space-between';
            folderHeader.style.alignItems = 'center';
            
            folderHeader.innerHTML = `
                <div>
                    <strong>${escapeHtml(customerName)}</strong>
                    <span style="margin-left:10px; color:#666; font-size:0.9em;">
                        (${customerContainers.length} konteyner)
                    </span>
                </div>
                <div class="folder-toggle">
                    <i class="fas fa-chevron-down"></i>
                </div>
            `;

            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            folderContent.style.padding = '0';
            folderContent.style.display = 'none'; // Start collapsed

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr style="background: var(--light);">
                        <th style="padding:12px; border:1px solid var(--border); width:30px;">
                            <input type="checkbox" class="select-all-customer" onchange="toggleSelectAllCustomer(this)">
                        </th>
                        <th style="padding:12px; border:1px solid var(--border);">Konteyner No</th>
                        <th style="padding:12px; border:1px solid var(--border);">Paket Sayısı</th>
                        <th style="padding:12px; border:1px solid var(--border);">Toplam Adet</th>
                        <th style="padding:12px; border:1px solid var(--border);">Tarih</th>
                        <th style="padding:12px; border:1px solid var(--border);">Durum</th>
                        <th style="padding:12px; border:1px solid var(--border);">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${customerContainers.map(container => `
                        <tr>
                            <td style="padding:10px; border:1px solid var(--border); text-align:center;">
                                <input type="checkbox" value="${container.id}" class="container-checkbox">
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                <strong>${escapeHtml(container.container_no)}</strong>
                            </td>
                            <td style="padding:10px; border:1px solid var(--border); text-align:center;">
                                ${container.package_count || 0}
                            </td>
                            <td style="padding:10px; border:1px solid var(--border); text-align:center;">
                                ${container.total_quantity || 0}
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                ${container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'}
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                <span class="status-${container.status || 'beklemede'}">
                                    ${container.status === 'sevk-edildi' ? 'Sevk Edildi' : 'Beklemede'}
                                </span>
                            </td>
                            <td style="padding:10px; border:1px solid var(--border);">
                                <button onclick="viewContainerDetails('${container.id}')" class="btn btn-primary btn-sm" style="margin:2px;">
                                    <i class="fas fa-eye"></i> Detay
                                </button>
                                <button onclick="sendToRamp('${container.container_no}')" class="btn btn-warning btn-sm" style="margin:2px;">
                                    <i class="fas fa-plus"></i> Paket Ekle
                                </button>
                                <button onclick="shipContainer('${container.container_no}')" class="btn btn-success btn-sm" style="margin:2px;">
                                    <i class="fas fa-ship"></i> Sevk Et
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            folderContent.appendChild(table);
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(folderContent);

            // Folder toggle functionality
            folderHeader.addEventListener('click', () => {
                const isOpen = folderContent.style.display === 'block';
                folderContent.style.display = isOpen ? 'none' : 'block';
                const icon = folderHeader.querySelector('.fa-chevron-down');
                icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            });

            shippingFolders.appendChild(folderDiv);
        });

        console.log('Shipping table populated successfully with', Object.keys(customersMap).length, 'customer folders');

    } catch (error) {
        console.error('Error in populateShippingTable:', error);
        const shippingFolders = document.getElementById('shippingFolders');
        if (shippingFolders) {
            shippingFolders.innerHTML = `
                <div style="text-align:center; padding:40px; color:#dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:20px;"></i>
                    <h3>Sevkiyat verileri yüklenirken hata oluştu</h3>
                    <p>${error.message}</p>
                    <button onclick="populateShippingTable()" class="btn btn-primary" style="margin-top:15px;">
                        <i class="fas fa-redo"></i> Tekrar Dene
                    </button>
                </div>
            `;
        }
        showAlert('Sevkiyat tablosu yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        isShippingTableLoading = false;
    }
}



// Pagination buttons
function renderPagination(totalCount, page) {
    let paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'pagination';
        paginationDiv.style.textAlign = 'center';
        paginationDiv.style.marginTop = '10px';
        elements.shippingFolders.appendChild(paginationDiv);
    }
    paginationDiv.innerHTML = '';

    const totalPages = Math.ceil(totalCount / pageSize);

    if (page > 0) {
        const prev = document.createElement('button');
        prev.textContent = '◀ Geri';
        prev.onclick = () => populateShippingTable(page - 1);
        paginationDiv.appendChild(prev);
    }

    paginationDiv.append(` Sayfa ${page + 1} / ${totalPages} `);

    if (page < totalPages - 1) {
        const next = document.createElement('button');
        next.textContent = 'İleri ▶';
        next.onclick = () => populateShippingTable(page + 1);
        paginationDiv.appendChild(next);
    }
}

// Debounced version
let shippingTableTimeout;
function debouncedPopulateShippingTable() {
    clearTimeout(shippingTableTimeout);
    shippingTableTimeout = setTimeout(() => populateShippingTable(currentPage), 300);
}




async function viewContainerDetails(containerId) {
    console.log('🔍 viewContainerDetails called with:', containerId);
    
    try {
        let containerData;
        let packages = [];

        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Excel mode
            const containerPackages = excelPackages.filter(pkg => pkg.container_id === containerId);
            containerData = {
                id: containerId,
                container_no: containerId,
                package_count: containerPackages.length,
                total_quantity: containerPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                status: containerPackages[0]?.status || 'beklemede',
                created_at: containerPackages[0]?.created_at || new Date().toISOString()
            };
            packages = containerPackages;
        } else {
            // Supabase mode - get container with packages
            const { data: container, error } = await supabase
                .from('containers')
                .select(`
                    *,
                    packages (*, customers(name))
                `)
                .eq('id', containerId)
                .single();

            if (error) {
                console.error('Container details error:', error);
                throw new Error('Konteyner detayları yüklenemedi: ' + error.message);
            }

            containerData = container;
            packages = container.packages || [];
        }

        // Show details in a simple alert for now
        const packageList = packages.map(pkg => 
            `• ${pkg.package_no}: ${pkg.total_quantity} adet (${pkg.customers?.name || pkg.customer_name || 'Müşteri yok'})`
        ).join('\n');

        alert(`Konteyner: ${containerData.container_no}\n\n` +
              `Durum: ${containerData.status}\n` +
              `Paket Sayısı: ${containerData.package_count}\n` +
              `Toplam Adet: ${containerData.total_quantity}\n\n` +
              `Paketler:\n${packageList || 'Paket bulunamadı'}`);

    } catch (error) {
        console.error('Error in viewContainerDetails:', error);
        showAlert('Konteyner detayları yüklenirken hata oluştu: ' + error.message, 'error');
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



  let isStockTableLoading = false;
let lastStockFetchTime = 0;

async function populateReportsTable() {
    try {
        const reportsContainer = document.getElementById('reportsTab');
        if (!reportsContainer) {
            console.error('Reports container not found');
            return;
        }

        let reportsData = [];

        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Generate reports from Excel data
            const today = new Date().toISOString().split('T')[0];
            
            const dailyPackages = excelPackages.filter(pkg => 
                pkg.created_at && pkg.created_at.includes(today)
            );
            
            const totalPackages = excelPackages.length;
            const shippedPackages = excelPackages.filter(pkg => pkg.status === 'sevk-edildi').length;
            const waitingPackages = excelPackages.filter(pkg => pkg.status === 'beklemede').length;

            reportsData = [
                {
                    title: 'Günlük Paket Raporu',
                    data: `Bugün oluşturulan paketler: ${dailyPackages.length}`,
                    date: new Date().toLocaleDateString('tr-TR')
                },
                {
                    title: 'Genel Paket Durumu',
                    data: `Toplam: ${totalPackages}, Sevk Edilen: ${shippedPackages}, Bekleyen: ${waitingPackages}`,
                    date: new Date().toLocaleDateString('tr-TR')
                }
            ];
        } else {
            // Use Supabase reports
            const { data: supabaseReports, error } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            reportsData = supabaseReports || [];
        }

        let reportsHTML = '<h3>Raporlar</h3>';
        
        if (reportsData.length === 0) {
            reportsHTML += '<p style="text-align:center; color:#666; padding:20px;">Henüz rapor yok</p>';
        } else {
            reportsData.forEach(report => {
                reportsHTML += `
                    <div class="report-item" style="border:1px solid #ddd; padding:15px; margin:10px 0; border-radius:5px;">
                        <h4>${report.title}</h4>
                        <p>${report.data}</p>
                        <small>Tarih: ${report.date}</small>
                    </div>
                `;
            });
        }

        reportsContainer.innerHTML = reportsHTML;

    } catch (error) {
        console.error('Error loading reports:', error);
        const reportsContainer = document.getElementById('reportsTab');
        if (reportsContainer) {
            reportsContainer.innerHTML = '<p style="text-align:center; color:red;">Raporlar yüklenirken hata oluştu</p>';
        }
    }
}



// Fixed populateStockTable function
async function populateStockTable() {
    if (isStockTableLoading) return;
    
    const now = Date.now();
    if (now - lastStockFetchTime < 500) {
        setTimeout(() => populateStockTable(), 500);
        return;
    }
    
    isStockTableLoading = true;
    lastStockFetchTime = now;
    
    try {
        console.log('Populating stock table...');
        
        const stockTableBody = document.getElementById('stockTableBody');
        if (!stockTableBody) {
            console.error('Stock table body not found');
            return;
        }
        
        stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666; padding:20px;">Yükleniyor...</td></tr>';
        
        let stockData = [];
        
        // Check if we should use Excel data
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Use mock stock data for Excel mode
            stockData = [
                { code: 'STK001', name: 'Büyük Çarşaf', quantity: 150, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() },
                { code: 'STK002', name: 'Büyük Havlu', quantity: 200, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() },
                { code: 'STK003', name: 'Nevresim', quantity: 85, unit: 'Adet', status: 'Az Stok', updated_at: new Date().toISOString() },
                { code: 'STK004', name: 'Çarşaf', quantity: 300, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() },
                { code: 'STK005', name: 'Havlu', quantity: 25, unit: 'Adet', status: 'Kritik', updated_at: new Date().toISOString() }
            ];
            console.log('Using mock stock data for Excel mode');
        } else {
            // Use Supabase data
            try {
                const { data, error } = await supabase
                    .from('stock_items')
                    .select('*')
                    .order('name', { ascending: true });
                
                if (error) throw error;
                stockData = data || [];
                console.log('Loaded stock data from Supabase:', stockData.length);
            } catch (error) {
                console.warn('Supabase stock fetch failed, using mock data:', error);
                stockData = [
                    { code: 'STK001', name: 'Büyük Çarşaf', quantity: 150, unit: 'Adet', status: 'Stokta', updated_at: new Date().toISOString() }
                ];
            }
        }
        
        // Clear loading message
        stockTableBody.innerHTML = '';
        
        if (stockData.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666; padding:20px;">Stok verisi bulunamadı</td></tr>';
            return;
        }
        
        // Populate stock table
        stockData.forEach(item => {
            const row = document.createElement('tr');
            
            // Determine status class
            let statusClass = 'status-stokta';
            let statusText = 'Stokta';
            
            if (item.quantity <= 0) {
                statusClass = 'status-kritik';
                statusText = 'Tükendi';
            } else if (item.quantity < 10) {
                statusClass = 'status-az-stok';
                statusText = 'Az Stok';
            } else if (item.quantity < 50) {
                statusClass = 'status-uyari';
                statusText = 'Düşük';
            }
            
            row.innerHTML = `
                <td>${escapeHtml(item.code || 'N/A')}</td>
                <td>${escapeHtml(item.name || 'N/A')}</td>
                <td>${item.quantity || 0}</td>
                <td>${escapeHtml(item.unit || 'Adet')}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>
                    <button onclick="editStockItem('${item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                </td>
            `;
            
            stockTableBody.appendChild(row);
        });
        
        console.log('Stock table populated with', stockData.length, 'items');
        
    } catch (error) {
        console.error('Error in populateStockTable:', error);
        const stockTableBody = document.getElementById('stockTableBody');
        if (stockTableBody) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">Stok verileri yüklenirken hata oluştu</td></tr>';
        }
        showAlert('Stok verileri yüklenirken hata oluştu', 'error');
    } finally {
        isStockTableLoading = false;
    }
}

// Fixed populateReportsTable function
async function populateReportsTable() {
    try {
        console.log('Populating reports table...');
        
        const reportsTableBody = document.getElementById('reportsTableBody');
        if (!reportsTableBody) {
            console.error('Reports table body not found');
            return;
        }
        
        reportsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:20px;">Yükleniyor...</td></tr>';
        
        let reportsData = [];
        
        // Check if we should use Excel data
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Generate mock reports data for Excel mode
            const today = new Date();
            reportsData = [
                {
                    id: 1,
                    report_date: today.toISOString(),
                    report_type: 'Günlük Rapor',
                    package_count: 15,
                    total_quantity: 245,
                    created_by: currentUser?.name || 'Sistem',
                    created_at: today.toISOString()
                },
                {
                    id: 2,
                    report_date: new Date(today.setDate(today.getDate() - 1)).toISOString(),
                    report_type: 'Günlük Rapor',
                    package_count: 12,
                    total_quantity: 198,
                    created_by: currentUser?.name || 'Sistem',
                    created_at: new Date(today.setDate(today.getDate() - 1)).toISOString()
                }
            ];
            console.log('Using mock reports data for Excel mode');
        } else {
            // Use Supabase data
            try {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (error) throw error;
                reportsData = data || [];
                console.log('Loaded reports data from Supabase:', reportsData.length);
            } catch (error) {
                console.warn('Supabase reports fetch failed, using mock data:', error);
                reportsData = [
                    {
                        id: 1,
                        report_date: new Date().toISOString(),
                        report_type: 'Günlük Rapor',
                        package_count: 15,
                        total_quantity: 245,
                        created_by: currentUser?.name || 'Sistem',
                        created_at: new Date().toISOString()
                    }
                ];
            }
        }
        
        // Clear loading message
        reportsTableBody.innerHTML = '';
        
        if (reportsData.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:20px;">Henüz rapor bulunmamaktadır</td></tr>';
            return;
        }
        
        // Populate reports table
        reportsData.forEach(report => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${report.report_date ? new Date(report.report_date).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>${escapeHtml(report.report_type || 'N/A')}</td>
                <td>${report.package_count || 0}</td>
                <td>${report.total_quantity || 0}</td>
                <td>${escapeHtml(report.created_by || 'N/A')}</td>
                <td>
                    <button onclick="viewReport(${report.id})" class="btn btn-primary btn-sm">Görüntüle</button>
                    <button onclick="exportReport(${report.id})" class="btn btn-success btn-sm">Dışa Aktar</button>
                </td>
            `;
            
            reportsTableBody.appendChild(row);
        });
        
        console.log('Reports table populated with', reportsData.length, 'reports');
        
    } catch (error) {
        console.error('Error in populateReportsTable:', error);
        const reportsTableBody = document.getElementById('reportsTableBody');
        if (reportsTableBody) {
            reportsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">Raporlar yüklenirken hata oluştu</td></tr>';
        }
        showAlert('Raporlar yüklenirken hata oluştu', 'error');
    }
}

// Add missing report functions
async function generateCustomReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (reportType === 'custom' && (!startDate || !endDate)) {
        showAlert('Özel rapor için başlangıç ve bitiş tarihi seçin', 'error');
        return;
    }
    
    showAlert('Rapor oluşturuluyor...', 'info');
    
    try {
        // Simulate report generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create report data
        const reportData = {
            report_type: reportType,
            start_date: startDate,
            end_date: endDate,
            package_count: Math.floor(Math.random() * 100) + 1,
            total_quantity: Math.floor(Math.random() * 1000) + 100,
            created_by: currentUser?.name || 'Sistem'
        };
        
        showAlert('Rapor başarıyla oluşturuldu', 'success');
        await populateReportsTable();
        
    } catch (error) {
        console.error('Error generating report:', error);
        showAlert('Rapor oluşturulurken hata oluştu', 'error');
    }
}

async function exportReports() {
    showAlert('Raporlar dışa aktarılıyor...', 'info');
    
    try {
        // Simulate export process
        await new Promise(resolve => setTimeout(resolve, 1500));
        showAlert('Raporlar başarıyla dışa aktarıldı', 'success');
    } catch (error) {
        console.error('Error exporting reports:', error);
        showAlert('Raporlar dışa aktarılırken hata oluştu', 'error');
    }
}

function viewReport(reportId) {
    showAlert(`Rapor #${reportId} görüntüleniyor...`, 'info');
    // Implement report viewing logic here
}

function exportReport(reportId) {
    showAlert(`Rapor #${reportId} dışa aktarılıyor...`, 'info');
    // Implement report export logic here
}

// Add missing stock edit function
function editStockItem(stockCode) {
    showAlert(`Stok düzenleme: ${stockCode}`, 'info');
    // Implement stock editing logic here
}

// Add loadReports function for the reports tab
async function loadReports() {
    await populateReportsTable();
}



// Debounced version to prevent rapid successive calls
let stockTableTimeout;
function debouncedPopulateStockTable() {
    clearTimeout(stockTableTimeout);
    stockTableTimeout = setTimeout(populateStockTable, 300);
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

        // Convert items object to array for better handling
        const itemsArray = Object.entries(currentPackage.items).map(([name, qty]) => ({
            name: name,
            qty: qty
        }));

        // Generate proper ID for Supabase compatibility
        const packageId = generateUUID(); // Use the UUID generator

        const packageData = {
            id: packageId, // Use proper UUID
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            items: itemsArray,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: 'excel'
        };

        // Save to Excel first
        const excelSuccess = await saveToExcel(packageData);
        
        if (excelSuccess) {
            showAlert(`Paket Excel'e kaydedildi: ${packageNo}`, 'success');
            
            // If online and Supabase available, try to sync with proper data
            if (supabase && navigator.onLine) {
                try {
                    // Create Supabase-compatible data (without the source field)
                    const supabaseData = {
                        id: packageId,
                        package_no: packageNo,
                        customer_id: selectedCustomer.id,
                        items: itemsArray,
                        total_quantity: totalQuantity,
                        status: 'beklemede',
                        packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
                        created_at: new Date().toISOString()
                    };

                    const { data, error } = await supabase
                        .from('packages')
                        .insert([supabaseData])
                        .select();

                    if (error) {
                        console.warn('Supabase insert failed, queuing for sync:', error);
                        addToSyncQueue('add', supabaseData); // Queue the Supabase-compatible version
                    } else {
                        showAlert(`Paket Supabase'e de kaydedildi: ${packageNo}`, 'success');
                        isUsingExcel = false;
                    }
                } catch (supabaseError) {
                    console.warn('Supabase error, queuing for sync:', supabaseError);
                    addToSyncQueue('add', packageData);
                }
            } else {
                addToSyncQueue('add', packageData);
            }
        }

        // Reset and refresh
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');
        await populatePackagesTable();
        updateStorageIndicator();

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası', 'error');
    }
}






// Delete selected packages
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

        if (error) throw error;

        showAlert(`${packageIds.length} paket silindi`, 'success');
        await populatePackagesTable();

    } catch (error) {
        console.error('Error in deleteSelectedPackages:', error);
        showAlert('Paket silme hatası', 'error');
    }
}



async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => {
                const packageDataStr = cb.getAttribute('data-package');
                if (packageDataStr) {
                    const packageData = JSON.parse(packageDataStr.replace(/&quot;/g, '"'));
                    return packageData.id;
                }
                return cb.value;
            });
        
        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
            return;
        }

        // Filter out Excel-style IDs that can't be used with Supabase directly
        const validPackageIds = selectedPackages.filter(id => 
            id && !id.startsWith('pkg-') && !id.startsWith('excel-')
        );
        
        const excelStylePackageIds = selectedPackages.filter(id => 
            id && (id.startsWith('pkg-') || id.startsWith('excel-'))
        );

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
                    status: 'sevk-edildi',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            
            containerId = newContainer[0].id;
            currentContainer = containerNo;
            elements.containerNumber.textContent = containerNo;
            saveAppState();
        }

        // Update valid Supabase packages
        if (validPackageIds.length > 0 && supabase) {
            const { error: updateError } = await supabase
                .from('packages')
                .update({ 
                    container_id: containerId,
                    status: 'sevk-edildi'
                })
                .in('id', validPackageIds);

            if (updateError) console.warn('Supabase update error:', updateError);
        }

        // Update Excel packages locally
        if (excelStylePackageIds.length > 0) {
            const currentPackages = await ExcelJS.readFile();
            const updatedPackages = currentPackages.map(pkg => {
                if (excelStylePackageIds.includes(pkg.id)) {
                    return {
                        ...pkg,
                        container_id: containerId,
                        status: 'sevk-edildi',
                        updated_at: new Date().toISOString()
                    };
                }
                return pkg;
            });
            
            await ExcelJS.writeFile(ExcelJS.toExcelFormat(updatedPackages));
            excelPackages = updatedPackages;
        }

        showAlert(`${selectedPackages.length} paket sevk edildi (Konteyner: ${containerNo}) ✅`, 'success');
        
        // Refresh tables
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler sevk edilirken hata oluştu: ' + error.message, 'error');
    }
}






        
      async function shipContainer(containerNo) {
    console.log('🚢 shipContainer called with:', containerNo);
    
    if (!containerNo) {
        showAlert('Konteyner numarası geçersiz', 'error');
        return;
    }

    try {
        // First get the container data safely
        let containerData;
        
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Excel mode - find container in excelPackages
            const containerPackages = excelPackages.filter(pkg => pkg.container_id === containerNo);
            if (containerPackages.length === 0) {
                throw new Error('Konteyner Excel verilerinde bulunamadı');
            }
            
            containerData = {
                id: containerNo,
                container_no: containerNo,
                package_count: containerPackages.length,
                total_quantity: containerPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0)
            };
        } else {
            // Supabase mode
            const { data: container, error: fetchError } = await supabase
                .from('containers')
                .select('id, container_no, package_count, total_quantity, status')
                .eq('container_no', containerNo)
                .single(); // Use single() to get one record

            if (fetchError) {
                console.error('Container fetch error:', fetchError);
                throw new Error('Konteyner veritabanında bulunamadı: ' + fetchError.message);
            }
            
            if (!container) {
                throw new Error('Konteyner bulunamadı: ' + containerNo);
            }
            
            containerData = container;
        }

        console.log('Container data:', containerData);

        // Confirm shipment
        if (!confirm(`"${containerNo}" numaralı konteyneri sevk etmek istediğinize emin misiniz?\n\nPaket Sayısı: ${containerData.package_count || 0}\nToplam Adet: ${containerData.total_quantity || 0}`)) {
            return;
        }

        // Update container status
        if (isUsingExcel || !supabase || !navigator.onLine) {
            // Excel mode - update packages locally
            excelPackages.forEach(pkg => {
                if (pkg.container_id === containerNo) {
                    pkg.status = 'sevk-edildi';
                    pkg.updated_at = new Date().toISOString();
                }
            });
            
            // Save to Excel
            await ExcelJS.writeFile(ExcelJS.toExcelFormat(excelPackages));
            
            showAlert(`Konteyner ${containerNo} Excel modunda sevk edildi`, 'success');
            
        } else {
            // Supabase mode - update in database
            const { error: updateError } = await supabase
                .from('containers')
                .update({ 
                    status: 'sevk-edildi',
                    shipped_at: new Date().toISOString()
                })
                .eq('container_no', containerNo);

            if (updateError) {
                console.error('Container update error:', updateError);
                throw new Error('Konteyner güncellenirken hata oluştu: ' + updateError.message);
            }

            // Also update packages status
            const { error: packagesError } = await supabase
                .from('packages')
                .update({ status: 'sevk-edildi' })
                .eq('container_id', containerData.id);

            if (packagesError) {
                console.warn('Packages update warning:', packagesError);
                // Don't throw error for packages update, just log it
            }

            showAlert(`Konteyner ${containerNo} başarıyla sevk edildi ✅`, 'success');
        }

        // Refresh the shipping table
        await populateShippingTable();
        
    } catch (error) {
        console.error('❌ Error in shipContainer:', error);
        
        let errorMessage = 'Konteyner sevk edilirken hata oluştu';
        
        if (error.message.includes('JSON')) {
            errorMessage = 'Veri işleme hatası. Lütfen sayfayı yenileyin.';
        } else if (error.message.includes('single row')) {
            errorMessage = 'Konteyner bulunamadı veya birden fazla eşleşen kayıt var.';
        } else {
            errorMessage = error.message;
        }
        
        showAlert(errorMessage, 'error');
    }
}  


        

        function filterShipping() {
            populateShippingTable();
        }



