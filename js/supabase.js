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

        if (!supabase) throw new Error('Supabase not initialized');

        // Fetch packages that are NOT shipped (status = 'beklemede')
        const { data: packages, error } = await supabase
            .from('packages')
            .select(`*, customers (name, code)`)
            .is('container_id', null)
            .eq('status', 'beklemede')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!packages || packages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            if (totalPackagesElement) totalPackagesElement.textContent = '0';
            return;
        }

        // Deduplicate packages by ID
        const uniquePackages = [];
        const seenIds = new Set();
        packages.forEach(pkg => {
            if (!seenIds.has(pkg.id)) {
                seenIds.add(pkg.id);
                uniquePackages.push(pkg);
            }
        });

        // Render table rows
        uniquePackages.forEach(pkg => {
            const row = document.createElement('tr');

            // Ensure items is an array of objects { name, qty }
            let itemsArray = [];
            if (pkg.items && typeof pkg.items === 'object') {
                if (Array.isArray(pkg.items)) {
                    itemsArray = pkg.items.map(it => ({
                        name: it.name || it,
                        qty: it.qty || 1
                    }));
                } else {
                    itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ name, qty }));
                }
            } else {
                itemsArray = [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
            }

            pkg.items = itemsArray; // overwrite pkg.items for printer use

            // Build product info for table tooltip and preview
            const productInfo = itemsArray.map(it => `${it.name}: ${it.qty}`).join(', ');

            const packageJsonEscaped = JSON.stringify(pkg).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            row.innerHTML = `
                <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
                <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
                <td>${escapeHtml(pkg.customers?.name || 'N/A')}</td>
                <td title="${escapeHtml(itemsArray.map(it => it.name).join(', '))}">
    ${escapeHtml(itemsArray.map(it => it.name).join(', '))}
</td>
<td title="${escapeHtml(itemsArray.map(it => it.qty).join(', '))}">
    ${escapeHtml(itemsArray.map(it => it.qty).join(', '))}
</td>
                <td>${pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td><span class="status-${pkg.status || 'beklemede'}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
            `;

            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') selectPackage(pkg);
            });

            tableBody.appendChild(row);
        });

        if (totalPackagesElement) totalPackagesElement.textContent = uniquePackages.length.toString();
        console.log(`✅ Package table populated with ${uniquePackages.length} unique packages`);

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
    if (isShippingTableLoading) return;

    // Debounce
    const now = Date.now();
    if (now - lastShippingFetchTime < 500) {
        setTimeout(() => populateShippingTable(page), 500);
        return;
    }

    isShippingTableLoading = true;
    lastShippingFetchTime = now;

    try {
        console.log('populateShippingTable called, page', page);

        elements.shippingFolders.innerHTML = '';

        const filter = elements.shippingFilter?.value || 'all';

        // Pagination: calculate range
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('containers')
            .select('*', { count: 'exact' }) // for total count
            .order('created_at', { ascending: false })
            .range(from, to);

        if (filter !== 'all') query = query.eq('status', filter);

        const { data: containers, error: containersError, count } = await query;

        if (containersError) throw containersError;

        if (!containers || containers.length === 0) {
            elements.shippingFolders.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Sevkiyat verisi yok</p>';
            return;
        }

        // Deduplicate containers
        const uniqueContainers = [];
        const seenContainerIds = new Set();
        containers.forEach(c => {
            if (!seenContainerIds.has(c.id)) {
                seenContainerIds.add(c.id);
                uniqueContainers.push(c);
            }
        });

        // Fetch packages for these containers
        const containerIds = uniqueContainers.map(c => c.id);
        const { data: packagesData } = await supabase
            .from('packages')
            .select('id, package_no, total_quantity, container_id, customers(name, code)')
            .in('container_id', containerIds);

        // Map packages to containers, deduplicate
        const packagesMap = {};
        packagesData?.forEach(p => {
            if (!packagesMap[p.container_id]) packagesMap[p.container_id] = [];
            if (!packagesMap[p.container_id].some(x => x.id === p.id)) packagesMap[p.container_id].push(p);
        });

        uniqueContainers.forEach(c => c.packages = packagesMap[c.id] || []);

        // Group by customer
        const customersMap = {};
        uniqueContainers.forEach(container => {
            let customerName = 'Diğer';
            if (container.packages.length > 0) {
                const names = container.packages.map(p => p.customers?.name).filter(Boolean);
                if (names.length > 0) customerName = [...new Set(names)].join(', ');
            }
            if (!customersMap[customerName]) customersMap[customerName] = [];
            customersMap[customerName].push(container);
        });

        // Render folders
        Object.entries(customersMap).forEach(([customerName, customerContainers]) => {
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
                            <td>${container.packages.length}</td>
                            <td>${container.packages.reduce((sum, p) => sum + (p.total_quantity || 0), 0)}</td>
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

            folderHeader.addEventListener('click', () => {
                folderDiv.classList.toggle('folder-open');
                folderContent.style.display = folderDiv.classList.contains('folder-open') ? 'block' : 'none';
            });

            elements.shippingFolders.appendChild(folderDiv);
        });

        // Render pagination buttons
        renderPagination(count, page);

    } catch (error) {
        console.error('Error in populateShippingTable:', error);
        showAlert('Sevkiyat tablosu yükleme hatası', 'error');
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



  let isStockTableLoading = false;
let lastStockFetchTime = 0;

async function populateStockTable() {
    // Prevent multiple simultaneous calls
    if (isStockTableLoading) return;
    
    // Debounce - prevent rapid successive calls
    const now = Date.now();
    if (now - lastStockFetchTime < 500) {
        setTimeout(populateStockTable, 500);
        return;
    }
    
    isStockTableLoading = true;
    lastStockFetchTime = now;
    
    try {
        // Clear table only once
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

        // Deduplicate stock items by code
        const uniqueStockItems = [];
        const seenStockCodes = new Set();
        
        if (stockItems && stockItems.length > 0) {
            stockItems.forEach(item => {
                if (!seenStockCodes.has(item.code)) {
                    seenStockCodes.add(item.code);
                    uniqueStockItems.push(item);
                    
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
                }
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Stok verisi yok</td>';
            elements.stockTableBody.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error in populateStockTable:', error);
        showAlert('Stok tablosu yükleme hatası', 'error');
    } finally {
        isStockTableLoading = false;
    }
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



// Complete current package
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
            saveOfflineData('packages', packageData);
            showAlert(`Paket çevrimdışı oluşturuldu: ${packageNo}`, 'warning');
        } else {
            const { data, error } = await supabase
                .from('packages')
                .insert([packageData])
                .select();

            if (error) throw error;

            showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');
        }

        // Reset current package
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');

        // Mark scanned barcodes as processed
        if (scannedBarcodes.length > 0 && navigator.onLine) {
            const barcodeIds = scannedBarcodes.filter(b => b.id && !b.id.startsWith('offline-')).map(b => b.id);
            if (barcodeIds.length > 0) {
                await supabase.from('barcodes').update({ processed: true }).in('id', barcodeIds);
            }
            scannedBarcodes = [];
            displayScannedBarcodes();
        }

        await populatePackagesTable();

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



// Shipping operations
        async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
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
                    status: 'sevk-edildi',  // ✅ direkt sevk edildi
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            
            containerId = newContainer[0].id;
            currentContainer = containerNo;
            elements.containerNumber.textContent = containerNo;
            saveAppState();
        }

        // Update packages directly to sevk-edildi
        const { error: updateError } = await supabase
            .from('packages')
            .update({ 
                container_id: containerId,
                status: 'sevk-edildi'
            })
            .in('id', selectedPackages);

        if (updateError) throw updateError;

        showAlert(`${selectedPackages.length} paket doğrudan sevk edildi (Konteyner: ${containerNo}) ✅`, 'success');
        
        // Refresh tables
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler sevk edilirken hata oluştu: ' + error.message, 'error');
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



