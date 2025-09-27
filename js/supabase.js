// Supabase initialization - Only for authentication and backups
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

// Local Excel Storage System
let localData = {
    packages: [],
    containers: [],
    customers: [],
    personnel: [],
    stock_items: [],
    barcodes: [],
    settings: {}
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
// Fixed data initialization function
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
    
    // Ensure all arrays exist and have data
    if (!localData.customers || localData.customers.length === 0) {
        console.log('No customers found, creating default customers');
        localData.customers = [
            {
                id: '1',
                name: 'Yeditepe Otel',
                code: 'YEDITEPE',
                email: 'info@yeditepe.com',
                created_at: new Date().toISOString()
            },
            {
                id: '2', 
                name: 'Marmara Otel',
                code: 'MARMARA',
                email: 'info@marmara.com',
                created_at: new Date().toISOString()
            }
        ];
    }
    
    if (!localData.personnel || localData.personnel.length === 0) {
        console.log('No personnel found, creating default personnel');
        localData.personnel = [
            {
                id: '1',
                name: 'Ahmet Yılmaz',
                role: 'Operator',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Mehmet Demir',
                role: 'Supervisor', 
                created_at: new Date().toISOString()
            }
        ];
    }
    
    // Ensure other arrays exist
    if (!localData.packages) localData.packages = [];
    if (!localData.containers) localData.containers = [];
    if (!localData.stock_items) localData.stock_items = [];
    if (!localData.barcodes) localData.barcodes = [];
    if (!localData.settings) localData.settings = {};
    
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
        customers: [
            {
                id: '1',
                name: 'Örnek Otel',
                code: 'OTEL001',
                email: 'info@ornekotel.com',
                created_at: new Date().toISOString()
            }
        ],
        personnel: [
            {
                id: '1',
                name: 'Admin Kullanıcı',
                created_at: new Date().toISOString()
            }
        ],
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

// Save data to localStorage
function saveLocalData() {
    try {
        localStorage.setItem('procleanLocalData', JSON.stringify(localData));
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
        }, 5000); // 5 seconds after page load
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
        // Set up recurring daily export
        setInterval(exportAllDataToExcel, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

// Export all data to Excel file
function exportAllDataToExcel() {
    if (!checkXLSXLibrary()) return;
    
    try {
        const wb = XLSX.utils.book_new();
        const timestamp = new Date().toISOString().slice(0, 10);
        
        // Create worksheets for each data type
        const worksheets = [
            { name: 'Packages', data: localData.packages },
            { name: 'Customers', data: localData.customers },
            { name: 'Personnel', data: localData.personnel },
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
        
        // Show notification only on manual export
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

// =============================
// Manual Excel Export (Safe)
// =============================
async function manualExportToExcel(sheetName, data, fileName) {
    try {
        // ✅ Ensure we always have a fileName
        if (!fileName || typeof fileName !== "string") {
            fileName = `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        }

        // ✅ Ensure data is at least an empty array
        const safeData = Array.isArray(data) ? data : [];

        // Build Excel sheet
        const ws = XLSX.utils.json_to_sheet(safeData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Convert workbook to buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // ✅ Save locally (download)
        saveAs(blob, fileName);

        // ✅ Upload to Supabase Storage
        const bucketName = "daily-data"; // must exist in Supabase
        const filePath = fileName.replace(/\s+/g, "_"); // clean spaces

        const { error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, blob, { upsert: true });

        if (error) throw error;

        console.log(`✅ Exported & uploaded ${sheetName} as ${fileName}`);
    } catch (err) {
        console.error("❌ manualExportToExcel error:", err.message || err);
    }
}



// ==================== DATA OPERATIONS (EXCEL-BASED) ====================

// Customers
// Fixed populateCustomers function
async function populateCustomers() {
    try {
        console.log('Populating customers dropdown...');
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) {
            console.error('Customer select element not found');
            return;
        }

        // Clear dropdown first
        customerSelect.innerHTML = '<option value="">Müşteri Seç</option>';
        
        // Use localData as primary source
        if (localData.customers && localData.customers.length > 0) {
            localData.customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.code})`;
                customerSelect.appendChild(option);
            });
            console.log(`Loaded ${localData.customers.length} customers from local data`);
        } else {
            // Fallback to default customers
            const defaultCustomers = [
                { id: '1', name: 'Yeditepe Otel', code: 'YEDITEPE' },
                { id: '2', name: 'Marmara Otel', code: 'MARMARA' }
            ];
            
            defaultCustomers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.code})`;
                customerSelect.appendChild(option);
            });
            
            // Save to local data
            localData.customers = defaultCustomers;
            saveLocalData();
            console.log('Created default customers');
        }

    } catch (error) {
        console.error('Error populating customers:', error);
        showAlert('Müşteri listesi yüklenirken hata oluştu', 'error');
    }
}







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

async function deleteCustomer(customerId) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;

    try {
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

// Fixed populatePersonnel function
async function populatePersonnel() {
    try {
        console.log('Populating personnel dropdown...');
        const personnelSelect = document.getElementById('personnelSelect');
        if (!personnelSelect) {
            console.error('Personnel select element not found');
            return;
        }

        // Clear dropdown first
        personnelSelect.innerHTML = '<option value="">Personel Seç</option>';
        
        // Use localData as primary source
        if (localData.personnel && localData.personnel.length > 0) {
            localData.personnel.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = `${person.name} (${person.role})`;
                personnelSelect.appendChild(option);
            });
            console.log(`Loaded ${localData.personnel.length} personnel from local data`);
        } else {
            // Fallback to default personnel
            const defaultPersonnel = [
                { id: '1', name: 'Ahmet Yılmaz', role: 'Operator' },
                { id: '2', name: 'Mehmet Demir', role: 'Supervisor' }
            ];
            
            defaultPersonnel.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = `${person.name} (${person.role})`;
                personnelSelect.appendChild(option);
            });
            
            // Save to local data
            localData.personnel = defaultPersonnel;
            saveLocalData();
            console.log('Created default personnel');
        }

    } catch (error) {
        console.error('Error populating personnel:', error);
        showAlert('Personel listesi yüklenirken hata oluştu', 'error');
    }
}



// Packages
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
            
            // Get customer name
            const customer = localData.customers.find(c => c.id === pkg.customer_id);
            const customerName = customer ? customer.name : 'Bilinmeyen Müşteri';

            // Ensure items is an array
            let itemsArray = [];
            if (pkg.items && Array.isArray(pkg.items)) {
                itemsArray = pkg.items;
            } else if (pkg.items && typeof pkg.items === 'object') {
                itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ name, qty }));
            } else {
                itemsArray = [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
            }

            // Create package object with customer info for compatibility
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

// Stock Items
// Improved stock functions:
async function populateStockTable() {
    try {
        const stockTableBody = document.getElementById('stockTableBody');
        if (!stockTableBody) {
            console.error('Stock table body not found');
            return;
        }

        stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Yükleniyor...</td></tr>';

        // Load stock data
        let stockItems = [];
        try {
            stockItems = await loadExcelData('stock');
        } catch (error) {
            console.warn('Using local stock data');
            stockItems = localData.stock_items || [];
        }

        if (stockItems.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Stok verisi bulunamadı</td></tr>';
            return;
        }

        // Render stock table
        stockTableBody.innerHTML = '';
        stockItems.forEach(item => {
            const row = document.createElement('tr');
            const quantity = item.Quantity || item.quantity;
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
                <td>${item.Code || item.code}</td>
                <td>${item.Name || item.name}</td>
                <td>${quantity}</td>
                <td>${item.Unit || item.unit || 'Adet'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.LastUpdated ? new Date(item.LastUpdated).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>
                    <button onclick="editStockItem(this, '${item.Code || item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                </td>
            `;
            stockTableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error populating stock table:', error);
        showAlert('Stok tablosu yüklenirken hata oluştu', 'error');
    }
}





async function saveStockItem(code, input) {
    const newQuantity = parseInt(input.value);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        showAlert('Geçerli bir miktar girin', 'error');
        return;
    }
    
    try {
        // Find and update the stock item
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
        
        quantitySpan.textContent = newQuantity;
        quantitySpan.style.display = 'block';
        input.style.display = 'none';
        editButton.style.display = 'block';
        editButtons.style.display = 'none';
        
        // Update status
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

// Shipping operations
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

// Improved populateShippingTable function:
async function populateShippingTable() {
    try {
        const shippingFolders = document.getElementById('shippingFolders');
        if (!shippingFolders) {
            console.error('Shipping folders container not found');
            return;
        }

        shippingFolders.innerHTML = '<p style="text-align:center; color:#666;">Yükleniyor...</p>';

        // Load containers data
        let containers = [];
        try {
            containers = await loadExcelData('containers');
        } catch (error) {
            console.warn('Using local containers data');
            containers = localData.containers || [];
        }

        if (containers.length === 0) {
            shippingFolders.innerHTML = '<p style="text-align:center; color:#666;">Henüz sevkiyat verisi yok</p>';
            return;
        }

        // Group by customer
        const customersMap = {};
        containers.forEach(container => {
            const customerName = container.Customer || container.customer || 'Diğer';
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
                                    <td>${container.ContainerNo || container.container_no}</td>
                                    <td>${container.PackageCount || container.package_count}</td>
                                    <td>${container.TotalQuantity || container.total_quantity}</td>
                                    <td><span class="status-${container.Status || container.status}">${(container.Status || container.status) === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                                    <td>
                                        <button onclick="viewContainerDetails('${container.ID || container.id}')" class="btn btn-primary btn-sm">Detay</button>
                                        <button onclick="shipContainer('${container.ContainerNo || container.container_no}')" class="btn btn-success btn-sm">Sevk Et</button>
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

// Improved stock functions:
async function populateStockTable() {
    try {
        const stockTableBody = document.getElementById('stockTableBody');
        if (!stockTableBody) {
            console.error('Stock table body not found');
            return;
        }

        stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Yükleniyor...</td></tr>';

        // Load stock data
        let stockItems = [];
        try {
            stockItems = await loadExcelData('stock');
        } catch (error) {
            console.warn('Using local stock data');
            stockItems = localData.stock_items || [];
        }

        if (stockItems.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Stok verisi bulunamadı</td></tr>';
            return;
        }

        // Render stock table
        stockTableBody.innerHTML = '';
        stockItems.forEach(item => {
            const row = document.createElement('tr');
            const quantity = item.Quantity || item.quantity;
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
                <td>${item.Code || item.code}</td>
                <td>${item.Name || item.name}</td>
                <td>${quantity}</td>
                <td>${item.Unit || item.unit || 'Adet'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${item.LastUpdated ? new Date(item.LastUpdated).toLocaleDateString('tr-TR') : 'N/A'}</td>
                <td>
                    <button onclick="editStockItem(this, '${item.Code || item.code}')" class="btn btn-primary btn-sm">Düzenle</button>
                </td>
            `;
            stockTableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error populating stock table:', error);
        showAlert('Stok tablosu yüklenirken hata oluştu', 'error');
    }
}






async function viewContainerDetails(containerId) {
    try {
        const container = localData.containers.find(c => c.id === containerId);
        if (!container) throw new Error('Container not found');
        
        container.packages = localData.packages.filter(p => p.container_id === containerId);
        
        // Add customer info to packages
        container.packages.forEach(pkg => {
            const customer = localData.customers.find(c => c.id === pkg.customer_id);
            pkg.customers = customer ? { name: customer.name, code: customer.code } : { name: 'N/A', code: 'N/A' };
        });
        
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

// Barcode operations
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
        console.log('Supabase client initialized for backup');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return null;
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        showAlert('Lütfen bir API anahtarı girin', 'error');
        return;
    }
    
    SUPABASE_ANON_KEY = apiKey;
    localStorage.setItem('procleanApiKey', apiKey);
    
    const newClient = initializeSupabase();
    
    if (newClient) {
        document.getElementById('apiKeyModal').style.display = 'none';
        showAlert('API anahtarı kaydedildi', 'success');
        testConnection();
    }
}

async function testConnection() {
    if (!supabase) {
        showAlert('Supabase istemcisi başlatılmadı', 'error');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) throw error;
        
        showAlert('Veritabanı bağlantısı başarılı!', 'success', 3000);
        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e.message);
        showAlert('Veritabanına bağlanılamıyor. API anahtarınızı kontrol edin.', 'error');
        return false;
    }
}

// Backup functions
async function backupToSupabase() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok. Yedekleme yapılamıyor.', 'error');
        return;
    }

    try {
        // Backup each data type
        const backupPromises = [];

        // Backup customers
        if (localData.customers.length > 0) {
            backupPromises.push(
                supabase.from('customers').upsert(localData.customers, { onConflict: 'id' })
            );
        }

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

        // Backup personnel
        if (localData.personnel.length > 0) {
            backupPromises.push(
                supabase.from('personnel').upsert(localData.personnel, { onConflict: 'id' })
            );
        }

        // Backup stock items
        if (localData.stock_items.length > 0) {
            backupPromises.push(
                supabase.from('stock_items').upsert(localData.stock_items, { onConflict: 'id' })
            );
        }

        await Promise.all(backupPromises);
        
        localData.settings.lastBackup = new Date().toISOString();
        saveLocalData();
        
        showAlert('Veriler Supabase\'e yedeklendi', 'success');
        
    } catch (error) {
        console.error('Backup error:', error);
        showAlert('Yedekleme hatası: ' + error.message, 'error');
    }
}

async function restoreFromSupabase() {
    if (!supabase) {
        showAlert('Supabase bağlantısı yok', 'error');
        return;
    }

    if (!confirm('Yerel veriler Supabase verilerle değiştirilecek. Emin misiniz?')) return;

    try {
        // Restore each data type
        const { data: customers } = await supabase.from('customers').select('*');
        const { data: packages } = await supabase.from('packages').select('*');
        const { data: containers } = await supabase.from('containers').select('*');
        const { data: personnel } = await supabase.from('personnel').select('*');
        const { data: stock_items } = await supabase.from('stock_items').select('*');

        localData.customers = customers || [];
        localData.packages = packages || [];
        localData.containers = containers || [];
        localData.personnel = personnel || [];
        localData.stock_items = stock_items || [];
        
        saveLocalData();
        
        // Refresh all tables
        await populateCustomers();
        await populatePersonnel();
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        showAlert('Veriler Supabase\'den geri yüklendi', 'success');
        
    } catch (error) {
        console.error('Restore error:', error);
        showAlert('Geri yükleme hatası: ' + error.message, 'error');
    }
}



// Add this function right after your existing utility functions
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
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

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

function filterShipping() {
    populateShippingTable();
}

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
        
        const folderHeader = folder.querySelector('.folder-header');
        if (hasVisibleRows) {
            folder.style.display = 'block';
            folderHeader.style.display = 'flex';
        } else {
            folder.style.display = 'none';
        }
    });
}




// Add this function to persist user session
function setupAuthPersistence() {
    // Check for existing session on page load
    const savedSession = localStorage.getItem('supabase.auth.token');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData && sessionData.access_token) {
                // Set current user from saved session
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

// ==================== CORRECTED INITIALIZATION ====================
// Replace the existing DOMContentLoaded listener in supabase.js:
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization...');
    
    try {
        // Step 1: Initialize UI elements first
        initializeElementsObject(); // From ui.js
        
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
        showAlert('Uygulama başlatılırken kritik hata oluştu: ' + error.message, 'error');
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
            // User is logged in - get additional user info
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
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    console.log('Showing login screen');
}

async function showAppScreen() {
    console.log('Showing app screen for user:', currentUser);
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
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

// Add this function to supabase.js
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



// Add these functions to supabase.js
async function initializeAppData() {
    try {
        console.log('Initializing app data...');
        
        // Populate dropdowns
        await populateCustomers();
        await populatePersonnel();
        
        // Load other data
        await populatePackagesTable();
        await populateStockTable();
        await populateShippingTable();
        
        console.log('App data initialization completed');
    } catch (error) {
        console.error('Error initializing app data:', error);
        showAlert('Uygulama verileri yüklenirken hata oluştu', 'error');
    }
}

function initializeUIElements() {
    console.log('Initializing UI elements...');
    // This will be handled by the existing initializeElementsObject from ui.js
}

// Enhanced local data initialization
function initializeLocalData() {
    console.log('Initializing local data...');
    
    const savedData = localStorage.getItem('procleanLocalData');
    
    if (savedData) {
        try {
            localData = JSON.parse(savedData);
            console.log('Existing local data loaded');
        } catch (error) {
            console.error('Error parsing local data, creating default:', error);
            localData = createDefaultData();
        }
    } else {
        console.log('No existing data found, creating default data');
        localData = createDefaultData();
    }
    
    // Ensure all required arrays exist
    if (!localData.customers) localData.customers = [];
    if (!localData.personnel) localData.personnel = [];
    if (!localData.packages) localData.packages = [];
    if (!localData.containers) localData.containers = [];
    if (!localData.stock_items) localData.stock_items = [];
    if (!localData.barcodes) localData.barcodes = [];
    if (!localData.settings) localData.settings = {};
    
    saveLocalData();
    console.log('Local data initialization completed');
}




