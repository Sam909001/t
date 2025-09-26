// ================== SQLITE DATABASE INITIALIZATION ==================
let db = null;
let dbInitialized = false;

// Initialize SQLite database
async function initDatabase() {
    if (dbInitialized && db) return db;
    
    try {
        // For Electron environment
        if (window.require) {
            const sqlite3 = window.require('sqlite3').verbose();
            const { app } = window.require('electron');
            const path = window.require('path');
            
            // Store database per monitor/screen with unique identifier
            const screenId = await getScreenId();
            const dbPath = path.join(app.getPath('userData'), `proclean_${screenId}.db`);
            
            db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    throw err;
                }
                console.log(`✅ Connected to SQLite database for screen ${screenId}`);
            });
            
        } else {
            // Fallback for browser environment
            console.warn('SQLite not available in browser, using localStorage fallback');
            db = {
                // Mock database methods for browser compatibility
                all: (sql, params, callback) => {
                    console.log('Mock SQL:', sql, params);
                    callback(null, []);
                },
                run: (sql, params, callback) => {
                    console.log('Mock SQL:', sql, params);
                    callback(null, { lastID: Date.now() });
                },
                get: (sql, params, callback) => {
                    console.log('Mock SQL:', sql, params);
                    callback(null, null);
                }
            };
        }
        
        await createTables();
        dbInitialized = true;
        return db;
        
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Get unique screen identifier
async function getScreenId() {
    // Use monitor resolution and position as unique identifier
    if (window.screen && window.screen.width) {
        return `${window.screen.width}x${window.screen.height}_${window.screen.left}_${window.screen.top}`;
    }
    
    // Fallback to unique storage key
    let screenId = localStorage.getItem('screenId');
    if (!screenId) {
        screenId = `screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('screenId', screenId);
    }
    return screenId;
}

// Create necessary tables
async function createTables() {
    return new Promise((resolve, reject) => {
        const queries = [
            `CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS packages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_no TEXT UNIQUE NOT NULL,
                customer_id INTEGER,
                product TEXT,
                total_quantity INTEGER DEFAULT 0,
                status TEXT DEFAULT 'beklemede',
                container_id TEXT,
                packer TEXT,
                items TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS containers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                container_no TEXT UNIQUE NOT NULL,
                customer TEXT,
                package_count INTEGER DEFAULT 0,
                total_quantity INTEGER DEFAULT 0,
                status TEXT DEFAULT 'beklemede',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS stock_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit TEXT DEFAULT 'Adet',
                critical_level INTEGER DEFAULT 5,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS personnel (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS barcodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barcode TEXT NOT NULL,
                customer_id INTEGER,
                processed BOOLEAN DEFAULT FALSE,
                scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_date DATETIME,
                report_type TEXT,
                data TEXT, -- JSON string
                pdf_url TEXT,
                user_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        let completed = 0;
        queries.forEach(query => {
            db.run(query, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                    reject(err);
                    return;
                }
                completed++;
                if (completed === queries.length) {
                    console.log('✅ All database tables created/verified');
                    resolve();
                }
            });
        });
    });
}

// ================== DATABASE OPERATIONS ==================
// Generic database query function
function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Generic database run function (INSERT, UPDATE, DELETE)
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

// ================== MODIFIED FUNCTIONS FOR SQLITE ==================
async function populateCustomers() {
    try {
        await initDatabase();
        const customers = await dbQuery(`
            SELECT id, name, code 
            FROM customers 
            ORDER BY name ASC
        `);

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
        showAlert('Müşteri listesi yüklenemedi', 'error');
    }
}

async function populatePersonnel() {
    if (personnelLoaded) return;
    personnelLoaded = true;

    const personnelSelect = document.getElementById('personnelSelect');
    if (!personnelSelect) return;

    personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';

    try {
        await initDatabase();
        const personnel = await dbQuery(`
            SELECT id, name 
            FROM personnel 
            ORDER BY name ASC
        `);

        if (personnel && personnel.length > 0) {
            personnel.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                personnelSelect.appendChild(option);
            });
        }

    } catch (err) {
        console.error('Error fetching personnel:', err);
        showAlert('Personel verileri yüklenemedi', 'error');
    }
}

async function populatePackagesTable() {
    if (packagesTableLoading) return;
    packagesTableLoading = true;

    try {
        await initDatabase();
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');

        if (!tableBody) throw new Error('Package table body not found');

        tableBody.innerHTML = '';
        if (totalPackagesElement) totalPackagesElement.textContent = '0';

        // Fetch packages that are NOT shipped (status = 'beklemede')
        const packages = await dbQuery(`
            SELECT p.*, c.name as customer_name, c.code as customer_code
            FROM packages p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.container_id IS NULL AND p.status = 'beklemede'
            ORDER BY p.created_at DESC
        `);

        if (!packages || packages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            if (totalPackagesElement) totalPackagesElement.textContent = '0';
            return;
        }

        // Render table rows
        packages.forEach(pkg => {
            const row = document.createElement('tr');

            // Parse items from JSON string
            let itemsArray = [];
            if (pkg.items) {
                try {
                    itemsArray = JSON.parse(pkg.items);
                    if (!Array.isArray(itemsArray)) {
                        itemsArray = Object.entries(itemsArray).map(([name, qty]) => ({ name, qty }));
                    }
                } catch (e) {
                    itemsArray = [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
                }
            } else {
                itemsArray = [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
            }

            const packageJsonEscaped = JSON.stringify(pkg).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            row.innerHTML = `
                <td><input type="checkbox" value="${pkg.id}" data-package='${packageJsonEscaped}' onchange="updatePackageSelection()"></td>
                <td>${escapeHtml(pkg.package_no || 'N/A')}</td>
                <td>${escapeHtml(pkg.customer_name || 'N/A')}</td>
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

        if (totalPackagesElement) totalPackagesElement.textContent = packages.length.toString();
        console.log(`✅ Package table populated with ${packages.length} packages`);

    } catch (error) {
        console.error('Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası: ' + error.message, 'error');
    } finally {
        packagesTableLoading = false;
    }
}

async function populateShippingTable(page = 0) {
    if (isShippingTableLoading) return;
    isShippingTableLoading = true;

    try {
        await initDatabase();
        elements.shippingFolders.innerHTML = '';

        const filter = elements.shippingFilter?.value || 'all';

        // Pagination
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = `
            SELECT * FROM containers 
            ORDER BY created_at DESC 
            LIMIT ${pageSize} OFFSET ${from}
        `;

        if (filter !== 'all') {
            query = `
                SELECT * FROM containers 
                WHERE status = '${filter}'
                ORDER BY created_at DESC 
                LIMIT ${pageSize} OFFSET ${from}
            `;
        }

        const containers = await dbQuery(query);

        if (!containers || containers.length === 0) {
            elements.shippingFolders.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Sevkiyat verisi yok</p>';
            return;
        }

        // Fetch packages for these containers
        const containerIds = containers.map(c => c.id);
        const placeholders = containerIds.map(() => '?').join(',');
        const packagesData = await dbQuery(`
            SELECT p.*, c.name as customer_name, c.code as customer_code
            FROM packages p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.container_id IN (${placeholders})
        `, containerIds);

        // Map packages to containers
        const packagesMap = {};
        packagesData?.forEach(p => {
            if (!packagesMap[p.container_id]) packagesMap[p.container_id] = [];
            packagesMap[p.container_id].push(p);
        });

        containers.forEach(c => c.packages = packagesMap[c.id] || []);

        // Group by customer
        const customersMap = {};
        containers.forEach(container => {
            let customerName = 'Diğer';
            if (container.packages.length > 0) {
                const names = container.packages.map(p => p.customer_name).filter(Boolean);
                if (names.length > 0) customerName = [...new Set(names)].join(', ');
            }
            if (!customersMap[customerName]) customersMap[customerName] = [];
            customersMap[customerName].push(container);
        });

        // Render folders (same as before)
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

        // Get total count for pagination
        let totalCount = 0;
        if (filter === 'all') {
            const result = await dbQuery('SELECT COUNT(*) as count FROM containers');
            totalCount = result[0].count;
        } else {
            const result = await dbQuery(`SELECT COUNT(*) as count FROM containers WHERE status = '${filter}'`);
            totalCount = result[0].count;
        }

        renderPagination(totalCount, page);

    } catch (error) {
        console.error('Error in populateShippingTable:', error);
        showAlert('Sevkiyat tablosu yükleme hatası', 'error');
    } finally {
        isShippingTableLoading = false;
    }
}

async function populateStockTable() {
    if (isStockTableLoading) return;
    isStockTableLoading = true;

    try {
        await initDatabase();
        elements.stockTableBody.innerHTML = '';

        const stockItems = await dbQuery(`
            SELECT * FROM stock_items ORDER BY name
        `);

        if (stockItems && stockItems.length > 0) {
            stockItems.forEach(item => {
                const row = document.createElement('tr');
                
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
    } finally {
        isStockTableLoading = false;
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
        await initDatabase();
        
        await dbRun(`
            UPDATE stock_items 
            SET quantity = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE code = ?
        `, [newQuantity, code]);
        
        showAlert(`Stok güncellendi: ${code}`, 'success');
        
        // Update UI
        quantitySpan.textContent = newQuantity;
        quantitySpan.style.display = 'block';
        quantityInput.style.display = 'none';
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
        await initDatabase();
        
        const barcodeData = {
            barcode: barcode,
            customer_id: selectedCustomer.id,
            scanned_at: new Date().toISOString(),
            processed: false
        };

        await dbRun(`
            INSERT INTO barcodes (barcode, customer_id, scanned_at, processed)
            VALUES (?, ?, ?, ?)
        `, [barcodeData.barcode, barcodeData.customer_id, barcodeData.scanned_at, barcodeData.processed]);

        scannedBarcodes.push(barcodeData);
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
        await initDatabase();
        
        const packageNo = `PKG-${Date.now()}`;
        const totalQuantity = Object.values(currentPackage.items).reduce((sum, qty) => sum + qty, 0);
        const selectedPersonnel = elements.personnelSelect.value;

        const packageData = {
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            items: JSON.stringify(currentPackage.items),
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString()
        };

        await dbRun(`
            INSERT INTO packages (package_no, customer_id, items, total_quantity, status, packer, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [packageData.package_no, packageData.customer_id, packageData.items, 
            packageData.total_quantity, packageData.status, packageData.packer, packageData.created_at]);

        showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');

        // Reset current package
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');

        // Mark scanned barcodes as processed
        if (scannedBarcodes.length > 0) {
            const barcodeIds = scannedBarcodes.filter(b => b.id).map(b => b.id);
            if (barcodeIds.length > 0) {
                await dbRun(`UPDATE barcodes SET processed = true WHERE id IN (${barcodeIds.map(() => '?').join(',')})`, barcodeIds);
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

// ================== MULTI-MONITOR SUPPORT ==================
// Monitor-specific storage and state management
function getMonitorKey(key) {
    return `${getScreenId()}_${key}`;
}

// Save state for current monitor
function saveMonitorState(key, data) {
    const monitorKey = getMonitorKey(key);
    localStorage.setItem(monitorKey, JSON.stringify(data));
}

// Load state for current monitor
function loadMonitorState(key, defaultValue = null) {
    const monitorKey = getMonitorKey(key);
    const stored = localStorage.getItem(monitorKey);
    return stored ? JSON.parse(stored) : defaultValue;
}

// Monitor-specific initialization
async function initializeMonitorApp() {
    try {
        // Initialize database for this monitor
        await initDatabase();
        
        // Load monitor-specific state
        selectedCustomer = loadMonitorState('selectedCustomer');
        currentContainer = loadMonitorState('currentContainer');
        
        // Update UI with monitor-specific data
        if (selectedCustomer && elements.customerSelect) {
            elements.customerSelect.value = selectedCustomer.id;
        }
        
        if (currentContainer && elements.containerNumber) {
            elements.containerNumber.textContent = currentContainer;
        }
        
        // Populate data
        await populateCustomers();
        await populatePersonnel();
        await populatePackagesTable();
        await populateStockTable();
        
        console.log(`✅ Monitor ${getScreenId()} initialized successfully`);
        
    } catch (error) {
        console.error('Monitor initialization failed:', error);
        showAlert('Uygulama başlatılırken hata oluştu', 'error');
    }
}

// ================== APPLICATION INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting ProClean application for monitor:', getScreenId());
    
    // Initialize monitor-specific application
    initializeMonitorApp().catch(error => {
        console.error('Application initialization failed:', error);
    });
    
    // Save state when leaving
    window.addEventListener('beforeunload', () => {
        saveMonitorState('selectedCustomer', selectedCustomer);
        saveMonitorState('currentContainer', currentContainer);
    });
});

// ================== GLOBAL VARIABLES ==================
let personnelLoaded = false;
let packagesTableLoading = false;
let currentPage = 0;
const pageSize = 20;
let isShippingTableLoading = false;
let lastShippingFetchTime = 0;
let isStockTableLoading = false;
let lastStockFetchTime = 0;
let selectedCustomer = null;
let currentContainer = null;
let currentPackage = {};
let scannedBarcodes = [];
let editingStockItem = null;

// Export functions for global access
window.populateCustomers = populateCustomers;
window.populatePersonnel = populatePersonnel;
window.populatePackagesTable = populatePackagesTable;
window.populateShippingTable = populateShippingTable;
window.populateStockTable = populateStockTable;
window.saveStockItem = saveStockItem;
window.processBarcode = processBarcode;
window.completePackage = completePackage;
