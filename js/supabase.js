// Supabase initialization - Only for authentication and reference data
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

// Local Excel Storage System - Transactional data only
let localData = {
    packages: [],
    containers: [],
    stock_items: [],
    barcodes: [],
    settings: {},
    // Reference data cached from Supabase
    customers: [],
    personnel: []
};

// EmailJS initialization
(function() {
    emailjs.init("jH-KlJ2ffs_lGwfsp");
})();

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

let connectionAlertShown = false; // Prevent duplicate success alert

// FIXED: Supabase bağlantısını test et
async function testConnection() {
    if (!supabase) {
        console.warn('Supabase client not initialized for connection test');
        if (!connectionAlertShown) {
            showAlert('Supabase istemcisi başlatılmadı. Lütfen API anahtarını girin.', 'error');
            connectionAlertShown = true;
        }
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        console.log('Supabase connection test successful:', data);
        
        if (!connectionAlertShown) {
            showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
            connectionAlertShown = true;
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

// Elements
const elements = {};

// XLSX Library Check
function checkXLSXLibrary() {
    if (typeof XLSX === 'undefined') {
        console.error('XLSX library not loaded. Please include SheetJS library.');
        showAlert('Excel kütüphanesi yüklenmedi. Sayfayı yenileyin.', 'error');
        return false;
    }
    return true;
}

// ==================== LOCAL EXCEL STORAGE FUNCTIONS ====================

// Initialize local data from localStorage or create default structure
function initializeLocalData() {
    console.log('Initializing local data...');
    
    const savedData = localStorage.getItem('procleanLocalData');
    
    if (savedData) {
        try {
            localData = JSON.parse(savedData);
            console.log('Existing data loaded:', {
                customers: localData.customers.length,
                personnel: localData.personnel.length,
                packages: localData.packages.length
            });
        } catch (error) {
            console.error('Error parsing local data, creating default:', error);
            localData = createDefaultData();
        }
    } else {
        console.log('No existing data found, creating default data');
        localData = createDefaultData();
    }
    
    // Ensure all arrays exist
    if (!localData.packages) localData.packages = [];
    if (!localData.containers) localData.containers = [];
    if (!localData.stock_items) localData.stock_items = [];
    if (!localData.barcodes) localData.barcodes = [];
    if (!localData.settings) localData.settings = {};
    if (!localData.customers) localData.customers = [];
    if (!localData.personnel) localData.personnel = [];
    
    saveLocalData();
    console.log('Local data initialization completed');
}

function createDefaultData() {
    return {
        packages: [
            {
                id: '1',
                package_no: 'PKG-001',
                customer_id: '1',
                items: [{ name: 'Çarşaf', qty: 2 }],
                total_quantity: 2,
                status: 'beklemede',
                packer: 'Admin',
                created_at: new Date().toISOString(),
                container_id: null
            }
        ],
        customers: [], // Will be populated from Supabase
        personnel: [], // Will be populated from Supabase
        containers: [],
        stock_items: [
            {
                id: '1',
                code: 'ITM001',
                name: 'Deterjan',
                quantity: 50,
                unit: 'Adet',
                updated_at: new Date().toISOString()
            }
        ],
        barcodes: [],
        settings: {
            lastBackup: null,
            autoBackup: true,
            dailyExportEnabled: true
        }
    };
}

// Save data to localStorage - Only transactional data
function saveLocalData() {
    try {
        // Only save transactional data to local storage
        const dataToSave = {
            packages: localData.packages,
            containers: localData.containers,
            stock_items: localData.stock_items,
            barcodes: localData.barcodes,
            settings: localData.settings,
            // Keep cached reference data for offline use
            customers: localData.customers,
            personnel: localData.personnel
        };
        
        localStorage.setItem('procleanLocalData', JSON.stringify(dataToSave));
        console.log('Local data saved successfully');
    } catch (error) {
        console.error('Error saving local data:', error);
        showAlert('Veri kaydedilirken hata oluştu', 'error');
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ==================== EXCEL EXPORT FUNCTIONS ====================

// Auto-save to Excel daily
function setupDailyExcelExport() {
    const today = new Date().toDateString();
    const lastExport = localStorage.getItem('lastExcelExport');
    
    if (lastExport !== today) {
        setTimeout(() => {
            exportAllDataToExcel();
            localStorage.setItem('lastExcelExport', today);
        }, 5000);
    }
    
    // Set up daily timer
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
        exportAllDataToExcel();
        localStorage.setItem('lastExcelExport', new Date().toDateString());
        setInterval(exportAllDataToExcel, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

// Export all data to Excel file - Only transactional data
function exportAllDataToExcel() {
    if (!checkXLSXLibrary()) return;
    
    try {
        const wb = XLSX.utils.book_new();
        const timestamp = new Date().toISOString().slice(0, 10);
        
        // Create worksheets for transactional data only
        const worksheets = [
            { name: 'Packages', data: localData.packages },
            { name: 'Containers', data: localData.containers },
            { name: 'Stock', data: localData.stock_items },
            { name: 'Barcodes', data: localData.barcodes },
            { name: 'Summary', data: [generateSummaryData()] }
        ];
        
        worksheets.forEach(sheet => {
            if (sheet.data && sheet.data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheet.data);
                XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            }
        });
        
        // Save file
        XLSX.writeFile(wb, `ProClean_Data_${timestamp}.xlsx`);
        console.log('Daily Excel export completed');
        
        if (arguments[0] === 'manual') {
            showAlert('Excel dosyası başarıyla kaydedildi', 'success');
        }
        
    } catch (error) {
        console.error('Excel export error:', error);
        showAlert('Excel export hatası: ' + error.message, 'error');
    }
}

// Generate summary data
function generateSummaryData() {
    return {
        export_date: new Date().toISOString(),
        total_packages: localData.packages.length,
        waiting_packages: localData.packages.filter(p => p.status === 'beklemede').length,
        shipped_packages: localData.packages.filter(p => p.status === 'sevk-edildi').length,
        total_customers: localData.customers.length,
        total_containers: localData.containers.length,
        total_stock_items: localData.stock_items.length,
        low_stock_items: localData.stock_items.filter(item => item.quantity < 10).length
    };
}

// Manual Excel Export (Safe) - Only transactional data
async function manualExportToExcel(sheetName, data, fileName) {
    try {
        if (!fileName || typeof fileName !== "string") {
            fileName = `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        }

        const safeData = Array.isArray(data) ? data : [];
        const ws = XLSX.utils.json_to_sheet(safeData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        saveAs(blob, fileName);

        // Upload to Supabase Storage if available
        if (supabase) {
            const bucketName = "daily-data";
            const filePath = fileName.replace(/\s+/g, "_");

            const { error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, blob, { upsert: true });

            if (error) throw error;
        }

        console.log(`Exported & uploaded ${sheetName} as ${fileName}`);
    } catch (err) {
        console.error("manualExportToExcel error:", err.message || err);
    }
}

// ==================== REFERENCE DATA OPERATIONS (SUPABASE FIRST) ====================

// UPDATED: Populate customers from Supabase first, fallback to localData
async function populateCustomers() {
    try {
        console.log('Populating customers dropdown...');
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) {
            console.error('Customer select element not found');
            return;
        }

        customerSelect.innerHTML = '<option value="">Müşteri Seç</option>';
        let customers = [];

        // Try Supabase first
        if (supabase) {
            try {
                const { data: supabaseCustomers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name');
                
                if (!error && supabaseCustomers && supabaseCustomers.length > 0) {
                    customers = supabaseCustomers;
                    // Update local cache
                    localData.customers = customers;
                    console.log(`Loaded ${customers.length} customers from Supabase`);
                } else {
                    console.log('No customers from Supabase or error occurred, using fallback');
                    throw new Error('Supabase fetch failed');
                }
            } catch (supabaseError) {
                console.warn('Supabase customers fetch failed:', supabaseError.message);
                // Fallback to local data
                customers = localData.customers;
            }
        } else {
            console.log('Supabase not available, using local data');
            customers = localData.customers;
        }

        // If no customers available, create defaults
        if (!customers || customers.length === 0) {
            console.log('No customers found, creating defaults');
            customers = [
                { id: '1', name: 'Yeditepe Otel', code: 'YEDITEPE', email: 'info@yeditepe.com' },
                { id: '2', name: 'Marmara Otel', code: 'MARMARA', email: 'info@marmara.com' }
            ];
            localData.customers = customers;
            saveLocalData();
        }

        // Populate dropdown
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.code})`;
            customerSelect.appendChild(option);
        });

        console.log(`Customer dropdown populated with ${customers.length} customers`);

    } catch (error) {
        console.error('Error populating customers:', error);
        showAlert('Müşteri listesi yüklenirken hata oluştu', 'error');
    }
}

// UPDATED: Populate personnel from Supabase first, fallback to localData
async function populatePersonnel() {
    try {
        console.log('Populating personnel dropdown...');
        const personnelSelect = document.getElementById('personnelSelect');
        if (!personnelSelect) {
            console.error('Personnel select element not found');
            return;
        }

        personnelSelect.innerHTML = '<option value="">Personel Seç</option>';
        let personnel = [];

        // Try Supabase first
        if (supabase) {
            try {
                const { data: supabasePersonnel, error } = await supabase
                    .from('personnel')
                    .select('*')
                    .order('name');
                
                if (!error && supabasePersonnel && supabasePersonnel.length > 0) {
                    personnel = supabasePersonnel;
                    // Update local cache
                    localData.personnel = personnel;
                    console.log(`Loaded ${personnel.length} personnel from Supabase`);
                } else {
                    console.log('No personnel from Supabase or error occurred, using fallback');
                    throw new Error('Supabase fetch failed');
                }
            } catch (supabaseError) {
                console.warn('Supabase personnel fetch failed:', supabaseError.message);
                // Fallback to local data
                personnel = localData.personnel;
            }
        } else {
            console.log('Supabase not available, using local data');
            personnel = localData.personnel;
        }

        // If no personnel available, create defaults
        if (!personnel || personnel.length === 0) {
            console.log('No personnel found, creating defaults');
            personnel = [
                { id: '1', name: 'Ahmet Yılmaz', role: 'Operator' },
                { id: '2', name: 'Mehmet Demir', role: 'Supervisor' }
            ];
            localData.personnel = personnel;
            saveLocalData();
        }

        // Populate dropdown
        personnel.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = `${person.name} (${person.role || 'Staff'})`;
            personnelSelect.appendChild(option);
        });

        console.log(`Personnel dropdown populated with ${personnel.length} personnel`);

    } catch (error) {
        console.error('Error populating personnel:', error);
        showAlert('Personel listesi yüklenirken hata oluştu', 'error');
    }
}

// UPDATED: Add new customer - Save to Supabase if available, always update local cache
async function addNewCustomer() {
    const code = document.getElementById('newCustomerCode').value.trim();
    const name = document.getElementById('newCustomerName').value.trim();
    const email = document.getElementById('newCustomerEmail').value.trim();

    if (!code || !name) {
        showAlert('Müşteri kodu ve adı gerekli', 'error');
        return;
    }

    try {
        const newCustomer = {
            id: generateId(),
            code: code,
            name: name,
            email: email || null,
            created_at: new Date().toISOString()
        };

        // Try to save to Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .insert([newCustomer])
                    .select()
                    .single();
                
                if (error) throw error;
                
                // Use the returned data (may have different ID from Supabase)
                if (data) {
                    newCustomer.id = data.id;
                }
                console.log('Customer saved to Supabase successfully');
            } catch (supabaseError) {
                console.warn('Failed to save customer to Supabase:', supabaseError.message);
                showAlert('Müşteri Supabase\'e kaydedilmedi, sadece yerel olarak eklendi', 'warning');
            }
        }

        // Always update local cache
        localData.customers.push(newCustomer);
        saveLocalData();

        showAlert('Müşteri başarıyla eklendi', 'success');
        
        // Clear form
        document.getElementById('newCustomerCode').value = '';
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerEmail').value = '';
        
        await populateCustomers();
        await showAllCustomers();
        
    } catch (error) {
        console.error('Error in addNewCustomer:', error);
        showAlert('Müşteri ekleme hatası', 'error');
    }
}

// UPDATED: Delete customer - Remove from Supabase if available, always update local cache
async function deleteCustomer(customerId) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;

    try {
        // Try to delete from Supabase first
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', customerId);
                
                if (error) throw error;
                console.log('Customer deleted from Supabase successfully');
            } catch (supabaseError) {
                console.warn('Failed to delete customer from Supabase:', supabaseError.message);
                showAlert('Müşteri Supabase\'den silinemedi, sadece yerel olarak kaldırıldı', 'warning');
            }
        }

        // Always update local cache
        localData.customers = localData.customers.filter(c => c.id !== customerId);
        saveLocalData();

        showAlert('Müşteri başarıyla silindi', 'success');
        await populateCustomers();
        await showAllCustomers();
        
    } catch (error) {
        console.error('Error in deleteCustomer:', error);
        showAlert('Müşteri silme hatası', 'error');
    }
}

// Customer display functions remain largely the same, but use cached localData
async function showCustomers() {
    try {
        elements.customerList.innerHTML = '';
        
        localData.customers.forEach(customer => {
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
        
        document.getElementById('customerModal').style.display = 'flex';
    } catch (error) {
        console.error('Error in showCustomers:', error);
        showAlert('Müşteri listesi yükleme hatası', 'error');
    }
}

async function showAllCustomers() {
    try {
        elements.allCustomersList.innerHTML = '';
        
        localData.customers.forEach(customer => {
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
        
        document.getElementById('allCustomersModal').style.display = 'flex';
    } catch (error) {
        console.error('Error in showAllCustomers:', error);
        showAlert('Müşteri yönetimi yükleme hatası', 'error');
    }
}

// ==================== TRANSACTIONAL DATA OPERATIONS (EXCEL ONLY) ====================

// Packages - Continue using Excel/localData only
async function populatePackagesTable() {
    if (packagesTableLoading) return;
    packagesTableLoading = true;

    try {
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');

        if (!tableBody) throw new Error('Package table body not found');

        tableBody.innerHTML = '';
        if (totalPackagesElement) totalPackagesElement.textContent = '0';

        // Filter packages that are waiting (not shipped)
        const waitingPackages = localData.packages.filter(pkg => 
            pkg.status === 'beklemede' && !pkg.container_id
        );

        if (waitingPackages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            if (totalPackagesElement) totalPackagesElement.textContent = '0';
            return;
        }

        waitingPackages.forEach(pkg => {
            const row = document.createElement('tr');
            
            // Get customer name from cached data
            const customer = localData.customers.find(c => c.id === pkg.customer_id);
            const customerName = customer ? customer.name : 'Bilinmeyen Müşteri';

            let itemsArray = [];
            if (pkg.items && Array.isArray(pkg.items)) {
                itemsArray = pkg.items;
            } else if (pkg.items && typeof pkg.items === 'object') {
                itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ name, qty }));
            } else {
                itemsArray = [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
            }

            const packageWithCustomer = {
                ...pkg,
                customers: { name: customerName },
                items: itemsArray
            };

            const packageJsonEscaped = JSON.stringify(packageWithCustomer)
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            row.innerHTML = `
                <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
                <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
                <td>${escapeHtml(customerName)}</td>
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
                if (e.target.type !== 'checkbox') selectPackage(packageWithCustomer);
            });

            tableBody.appendChild(row);
        });

        if (totalPackagesElement) {
            totalPackagesElement.textContent = waitingPackages.length.toString();
        }
        
        console.log(`Package table populated with ${waitingPackages.length} packages`);

    } catch (error) {
        console.error('Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası: ' + error.message, 'error');
    } finally {
        packagesTableLoading = false;
    }
}

// Complete package - Excel only
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
            id: generateId(),
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            items: currentPackage.items,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString(),
            container_id: null
        };

        // Save to local data only
        localData.packages.push(packageData);
        saveLocalData();

        showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');

        // Reset current package
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');

        // Mark scanned barcodes as processed
        scannedBarcodes.forEach(barcode => barcode.processed = true);
        scannedBarcodes = [];
        displayScannedBarcodes();

        await populatePackagesTable();

    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası', 'error');
    }
}

// Delete packages - Excel only
async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

    try {
        const packageIds = Array.from(checkboxes).map(cb => cb.value);
        localData.packages = localData.packages.filter(pkg => !packageIds.includes(pkg.id));
        saveLocalData();

        showAlert(`${packageIds.length} paket silindi`, 'success');
        await populatePackagesTable();

    } catch (error) {
        console.error('Error in deleteSelectedPackages:', error);
        showAlert('Paket silme hatası', 'error');
    }
}

// Stock Items - Continue using Excel/localData only
async function populateStockTable() {
    try {
        const stockTableBody = document.getElementById('stockTableBody');
        if (!stockTableBody) {
            console.error('Stock table body not found');
            return;
        }

        stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Yükleniyor...</td></tr>';

        // Use local stock data only
        const stockItems = localData.stock_items || [];

        if (stockItems.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Stok verisi bulunamadı</td></tr>';
            return;
        }

        stockTableBody.innerHTML = '';
        stockItems.forEach(item => {
            const row = document.createElement('tr');
            const quantity = item.quantity;
            let statusClass = 'status-stokta';
            let statusText = 'Stokta';
            
            if (quantity <= 0) {
                statusClass = 'status-kritik';
                statusText = 'Tükendi';
            } else if (quantity < 10) {
                statusClass = 'status-az-stok';
                statusText = 'Az Stok';
            }
            
            row.innerHTML = `
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${quantity}</td>
                <td>${item.unit || 'Adet'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>
                    <button onclick="editStockItem(this, '${item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                </td>
            `;
            stockTableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error populating stock table:', error);
        showAlert('Stok tablosu yüklenirken hata oluştu', 'error');
    }
}

// Save stock item - Excel only
async function saveStockItem(code, input) {
    const newQuantity = parseInt(input.value);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        showAlert('Geçerli bir miktar girin', 'error');
        return;
    }
    
    try {
        // Find and update the stock item in local data only
        const itemIndex = localData.stock_items.findIndex(item => item.code === code);
        if (itemIndex !== -1) {
            localData.stock_items[itemIndex].quantity = newQuantity;
            localData.stock_items[itemIndex].updated_at = new Date().toISOString();
            saveLocalData();
        }
        
        showAlert(`Stok güncellendi: ${code}`, 'success');
        
        // Update UI
        const row = input.closest('tr');
        const quantitySpan = row.querySelector('.stock-quantity');
        const editButton = row.querySelector('button');
        const editButtons = row.querySelector('.edit-buttons');
        
        if (quantitySpan) quantitySpan.textContent = newQuantity;
        if (quantitySpan) quantitySpan.style.display = 'block';
        input.style.display = 'none';
        if (editButton) editButton.style.display = 'block';
        if (editButtons) editButtons.style.display = 'none';
        
        // Update status
        const statusCell = row.querySelector('td:nth-child(5) span');
        if (statusCell) {
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
        }
        
        editingStockItem = null;
        
    } catch (error) {
        console.error('Error updating stock:', error);
        showAlert('Stok güncellenirken hata oluştu', 'error');
    }
}

// Shipping operations - Excel only
async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
            return;
        }

        // Calculate total quantity
        const totalQuantity = selectedPackages.reduce((sum, packageId) => {
            const pkg = localData.packages.find(p => p.id === packageId);
            return sum + (pkg ? pkg.total_quantity : 0);
        }, 0);

        // Create new container
        let containerId;
        if (!containerNo) {
            const timestamp = new Date().getTime();
            containerNo = `CONT-${timestamp.toString().slice(-6)}`;
        }

        containerId = generateId();
        const newContainer = {
            id: containerId,
            container_no: containerNo,
            customer: selectedCustomer?.name || '',
            package_count: selectedPackages.length,
            total_quantity: totalQuantity,
            status: 'sevk-edildi',
            created_at: new Date().toISOString()
        };

        // Save to local data only
        localData.containers.push(newContainer);

        // Update packages
        selectedPackages.forEach(packageId => {
            const packageIndex = localData.packages.findIndex(p => p.id === packageId);
            if (packageIndex !== -1) {
                localData.packages[packageIndex].container_id = containerId;
                localData.packages[packageIndex].status = 'sevk-edildi';
            }
        });

        saveLocalData();

        showAlert(`${selectedPackages.length} paket doğrudan sevk edildi (Konteyner: ${containerNo})`, 'success');
        
        // Refresh tables
        await populatePackagesTable();
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error sending to ramp:', error);
        showAlert('Paketler sevk edilirken hata oluştu: ' + error.message, 'error');
    }
}

// Populate shipping table - Excel only
async function populateShippingTable() {
    try {
        const shippingFolders = document.getElementById('shippingFolders');
        if (!shippingFolders) {
            console.error('Shipping folders container not found');
            return;
        }

        shippingFolders.innerHTML = '<p style="text-align:center; color:#666;">Yükleniyor...</p>';

        // Use local containers data only
        const containers = localData.containers || [];

        if (containers.length === 0) {
            shippingFolders.innerHTML = '<p style="text-align:center; color:#666;">Henüz sevkiyat verisi yok</p>';
            return;
        }

        // Group by customer
        const customersMap = {};
        containers.forEach(container => {
            const customerName = container.customer || 'Diğer';
            if (!customersMap[customerName]) {
                customersMap[customerName] = [];
            }
            customersMap[customerName].push(container);
        });

        // Render folders
        shippingFolders.innerHTML = '';
        Object.entries(customersMap).forEach(([customerName, customerContainers]) => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'customer-folder';
            
            folderDiv.innerHTML = `
                <div class="folder-header">
                    <span>${customerName}</span>
                    <span class="folder-toggle">▶</span>
                </div>
                <div class="folder-content" style="display:none;">
                    <table class="shipping-table">
                        <thead>
                            <tr>
                                <th>Konteyner No</th>
                                <th>Paket Sayısı</th>
                                <th>Toplam Adet</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customerContainers.map(container => `
                                <tr>
                                    <td>${container.container_no}</td>
                                    <td>${container.package_count}</td>
                                    <td>${container.total_quantity}</td>
                                    <td><span class="status-${container.status}">${container.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                                    <td>
                                        <button onclick="viewContainerDetails('${container.id}')" class="btn btn-primary btn-sm">Detay</button>
                                        <button onclick="shipContainer('${container.container_no}')" class="btn btn-success btn-sm">Sevk Et</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Add toggle functionality
            const header = folderDiv.querySelector('.folder-header');
            const content = folderDiv.querySelector('.folder-content');
            const toggle = folderDiv.querySelector('.folder-toggle');
            
            header.addEventListener('click', () => {
                const isOpen = content.style.display === 'block';
                content.style.display = isOpen ? 'none' : 'block';
                toggle.textContent = isOpen ? '▶' : '▼';
            });
            
            shippingFolders.appendChild(folderDiv);
        });

    } catch (error) {
        console.error('Error populating shipping table:', error);
        showAlert('Sevkiyat tablosu yüklenirken hata oluştu', 'error');
    }
}

// View container details - Excel only
async function viewContainerDetails(containerId) {
    try {
        const container = localData.containers.find(c => c.id === containerId);
        if (!container) throw new Error('Container not found');
        
        container.packages = localData.packages.filter(p => p.container_id === containerId);
        
        // Add customer info to packages from cached data
        container.packages.forEach(pkg => {
            const customer = localData.customers.find(c => c.id === pkg.customer_id);
            pkg.customers = customer ? { name: customer.name, code: customer.code } : { name: 'N/A', code: 'N/A' };
        });
        
        currentContainerDetails = container;
        
        const modalTitle = document.getElementById('containerDetailTitle');
        const modalContent = document.getElementById('containerDetailContent');
        
        if (modalTitle) modalTitle.textContent = `Konteyner: ${container.container_no}`;
        
        let contentHTML = `
            <p><strong>Durum:</strong> <span class="container-status status-${container.status}">${container.status === 'beklemde' ? 'Beklemede' : 'Sevk Edildi'}</span></p>
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
        
        if (modalContent) modalContent.innerHTML = contentHTML;
        
        const modal = document.getElementById('containerDetailModal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading container details:', error);
        showAlert('Konteyner detayları yüklenirken hata oluştu', 'error');
    }
}

// Ship container - Excel only
async function shipContainer(containerNo) {
    try {
        const containerIndex = localData.containers.findIndex(c => c.container_no === containerNo);
        if (containerIndex === -1) throw new Error('Container not found');

        localData.containers[containerIndex].status = 'sevk-edildi';
        saveLocalData();

        showAlert(`Konteyner ${containerNo} sevk edildi`, 'success');
        await populateShippingTable();
        
    } catch (error) {
        console.error('Error shipping container:', error);
        showAlert('Konteyner sevk edilirken hata oluştu: ' + error.message, 'error');
    }
}

// Barcode operations - Excel only
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
            id: generateId(),
            barcode: barcode,
            customer_id: selectedCustomer.id,
            scanned_at: new Date().toISOString(),
            processed: false
        };

        // Save to local data only
        localData.barcodes.push(barcodeData);
        scannedBarcodes.push(barcodeData);
        saveLocalData();

        showAlert(`Barkod kaydedildi: ${barcode}`, 'success');

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

// ==================== SUPABASE BACKUP FUNCTIONS ====================

// Supabase initialization - Keep for backup functionality
function initializeSupabase() {
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return null;
    }
}

// UPDATED: Backup only transactional data to Supabase
async function backupToSupabase() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok. Yedekleme yapılamıyor.', 'error');
        return;
    }

    try {
        // Only backup transactional data
        const backupPromises = [];

        // Backup packages
        if (localData.packages.length > 0) {
            backupPromises.push(
                supabase.from('packages').upsert(localData.packages, { onConflict: 'id' })
            );
        }

        // Backup containers
        if (localData.containers.length > 0) {
            backupPromises.push(
                supabase.from('containers').upsert(localData.containers, { onConflict: 'id' })
            );
        }

        // Backup stock items
        if (localData.stock_items.length > 0) {
            backupPromises.push(
                supabase.from('stock_items').upsert(localData.stock_items, { onConflict: 'id' })
            );
        }

        // Backup barcodes
        if (localData.barcodes.length > 0) {
            backupPromises.push(
                supabase.from('barcodes').upsert(localData.barcodes, { onConflict: 'id' })
            );
        }

        await Promise.all(backupPromises);
        
        localData.settings.lastBackup = new Date().toISOString();
        saveLocalData();
        
        showAlert('Transactional data yedeklendi', 'success');
        
    } catch (error) {
        console.error('Backup error:', error);
        showAlert('Yedekleme hatası: ' + error.message, 'error');
    }
}

// UPDATED: Restore only transactional data from Supabase
async function restoreFromSupabase() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok', 'error');
        return;
    }

    if (!confirm('Yerel transactional veriler Supabase verilerle değiştirilecek. Emin misiniz?')) return;

    try {
        // Restore only transactional data
        const { data: packages } = await supabase.from('packages').select('*');
        const { data: containers } = await supabase.from('containers').select('*');
        const { data: stock_items } = await supabase.from('stock_items').select('*');
        const { data: barcodes } = await supabase.from('barcodes').select('*');

        localData.packages = packages || [];
        localData.containers = containers || [];
        localData.stock_items = stock_items || [];
        localData.barcodes = barcodes || [];
        
        saveLocalData();
        
        // Refresh transactional data tables only
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        showAlert('Transactional data geri yüklendi', 'success');
        
    } catch (error) {
        console.error('Restore error:', error);
        showAlert('Geri yükleme hatası: ' + error.message, 'error');
    }
}

// Update user interface
function updateUserInterface() {
    // Update user role display
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement && currentUser) {
        userRoleElement.textContent = 
            `${currentUser.role === 'admin' ? 'Yönetici' : 'Operatör'}: ${currentUser.name}`;
    }
    
    // Update current date fields
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
    
    // Apply role-based permissions
    if (typeof applyRoleBasedPermissions === 'function') {
        applyRoleBasedPermissions(currentUser.role);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

function renderPagination(totalCount, page) {
    let paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'pagination';
        paginationDiv.style.textAlign = 'center';
        paginationDiv.style.marginTop = '10px';
        const shippingFolders = document.getElementById('shippingFolders');
        if (shippingFolders) shippingFolders.appendChild(paginationDiv);
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

function filterShipping() {
    populateShippingTable();
}

function searchContainers() {
    const containerSearchElement = document.getElementById('containerSearch');
    if (!containerSearchElement) return;
    
    const searchTerm = containerSearchElement.value.toLowerCase();
    const folders = document.querySelectorAll('.customer-folder');
    
    folders.forEach(folder => {
        const containerRows = folder.querySelectorAll('tbody tr');
        let hasVisibleRows = false;
        
        containerRows.forEach(row => {
            const containerNo = row.cells[0]?.textContent?.toLowerCase() || '';
            if (containerNo.includes(searchTerm)) {
                row.style.display = '';
                hasVisibleRows = true;
            } else {
                row.style.display = 'none';
            }
        });
        
        const folderHeader = folder.querySelector('.folder-header');
        if (hasVisibleRows) {
            folder.style.display = 'block';
            if (folderHeader) folderHeader.style.display = 'flex';
        } else {
            folder.style.display = 'none';
        }
    });
}

// Auth persistence setup
function setupAuthPersistence() {
    // Check for existing session on page load
    const savedSession = localStorage.getItem('supabase.auth.token');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData && sessionData.access_token) {
                currentUser = {
                    email: sessionData.user?.email || 'user@example.com',
                    uid: sessionData.user?.id || 'unknown',
                    name: sessionData.user?.email?.split('@')[0] || 'User'
                };
                console.log('User session restored:', currentUser);
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            currentUser = null;
        }
    }
    
    // Also check for our custom user storage
    const savedUser = localStorage.getItem('procleanCurrentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('User data restored from custom storage:', currentUser);
        } catch (error) {
            console.error('Error restoring custom user data:', error);
            currentUser = null;
        }
    }
}

// Global variables for pagination and loading states
const pageSize = 20;
let isShippingTableLoading = false;
let isStockTableLoading = false;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization...');
    
    try {
        // Step 1: Initialize UI elements first
        if (typeof initializeElementsObject === 'function') {
            initializeElementsObject(); // From ui.js
        }
        
        // Step 2: Check for XLSX library
        if (!checkXLSXLibrary()) {
            showAlert('Excel kütüphanesi bulunamadı. Lütfen SheetJS kütüphanesini yükleyin.', 'error');
        }
        
        // Step 3: Initialize local data (Excel-based)
        initializeLocalData();
        
        // Step 4: Check API key (for Supabase auth only)
        const savedApiKey = localStorage.getItem('procleanApiKey');
        if (savedApiKey && savedApiKey.length > 20) {
            SUPABASE_ANON_KEY = savedApiKey;
            initializeSupabase();
            console.log('API key loaded, checking auth...');
            checkAuthState();
        } else {
            console.log('No API key found, showing login screen directly');
            showLoginScreen();
        }
        
        console.log('Initialization sequence completed');
        
    } catch (error) {
        console.error('Critical error during initialization:', error);
        if (typeof showAlert === 'function') {
            showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
        }
    }
});

// Check authentication state using Supabase
async function checkAuthState() {
    try {
        // Initialize Supabase first
        if (!supabase) {
            const client = initializeSupabase();
            if (!client) {
                console.log('Supabase not initialized, showing login screen');
                showLoginScreen();
                return;
            }
        }
        
        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            showLoginScreen();
            return;
        }
        
        if (session && session.user) {
            // User is logged in - get additional user info from Supabase personnel
            const { data: userData, error: userError } = await supabase
                .from('personnel')
                .select('role, name')
                .eq('email', session.user.email)
                .single();
                
            if (userError) {
                console.error('Error fetching user data:', userError);
            }
            
            currentUser = {
                email: session.user.email,
                uid: session.user.id,
                name: userData?.name || session.user.email.split('@')[0],
                role: userData?.role || 'operator'
            };
            
            showAppScreen();
        } else {
            showLoginScreen();
        }
        
    } catch (error) {
        console.error('Auth state check error:', error);
        showLoginScreen();
    }
}

function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    console.log('Showing login screen');
}

async function showAppScreen() {
    console.log('Showing app screen for user:', currentUser);
    
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    
    // Initialize form elements
    initializeFormElements();
    
    // Set current date FIRST
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = new Date().toLocaleDateString('tr-TR');
        console.log('Current date set:', currentDateElement.textContent);
    } else {
        console.error('Current date element not found');
    }
    
    // Load app data
    await initializeAppData();
    
    // Setup daily Excel export
    setupDailyExcelExport();
    
    // Update UI with user info
    updateUserInterface();
}

// Initialize form elements
function initializeFormElements() {
    console.log('Initializing form elements...');
    
    // Initialize current date
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = new Date().toLocaleDateString('tr-TR');
    }
    
    // Initialize other form elements
    const containerNumberElement = document.getElementById('containerNumber');
    if (containerNumberElement) {
        containerNumberElement.textContent = currentContainer || 'Yok';
    }
}

// Initialize app data
async function initializeAppData() {
    try {
        console.log('Initializing app data...');
        
        // Populate dropdowns - customers and personnel from Supabase first
        await populateCustomers();
        await populatePersonnel();
        
        // Load transactional data from Excel/localData
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        console.log('App data initialization completed');
    } catch (error) {
        console.error('Error initializing app data:', error);
        if (typeof showAlert === 'function') {
            showAlert('Uygulama verileri yüklenirken hata oluştu', 'error');
        }
    }
}
