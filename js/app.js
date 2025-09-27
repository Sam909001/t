// Data management functions - Modified to save locally and backup to Supabase

// Initialize local storage with sample data if empty
function initializeLocalStorage() {
    console.log('Initializing local storage...');
    
    // Check if data already exists
    if (localStorage.getItem('packages') && localStorage.getItem('customers')) {
        console.log('Data already exists in local storage');
        return;
    }
    
    // Sample customers
    const sampleCustomers = [
        { id: 1, name: 'Yeditepe', code: 'YEDITEPE', contact: 'Ahmet Yılmaz', phone: '555-0101' },
        { id: 2, name: 'Marmara', code: 'MARMARA', contact: 'Mehmet Demir', phone: '555-0102' },
        { id: 3, name: 'İstanbul', code: 'ISTANBUL', contact: 'Ayşe Kaya', phone: '555-0103' }
    ];
    
    // Sample personnel
    const samplePersonnel = [
        { id: 1, name: 'Ali Veli', role: 'Operator' },
        { id: 2, name: 'Fatma Yıldız', role: 'Supervisor' },
        { id: 3, name: 'Mustafa Şen', role: 'Manager' }
    ];
    
    // Sample containers
    const sampleContainers = [
        { id: 1, container_no: 'CONT-001', customer_id: 1, status: 'active', created_at: new Date().toISOString() },
        { id: 2, container_no: 'CONT-002', customer_id: 2, status: 'active', created_at: new Date().toISOString() }
    ];
    
    // Sample packages
    const samplePackages = [
        { 
            id: 1, 
            package_no: 'PKG-001', 
            customer_id: 1, 
            container_id: 1, 
            product: 'T-Shirt', 
            quantity: 10, 
            status: 'processed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];
    
    // Sample stock
    const sampleStock = [
        { code: 'TSHIRT-RED-M', name: 'Red T-Shirt Medium', quantity: 100, last_updated: new Date().toISOString() },
        { code: 'TSHIRT-BLUE-L', name: 'Blue T-Shirt Large', quantity: 75, last_updated: new Date().toISOString() }
    ];
    
    // Save to localStorage
    localStorage.setItem('customers', JSON.stringify(sampleCustomers));
    localStorage.setItem('personnel', JSON.stringify(samplePersonnel));
    localStorage.setItem('containers', JSON.stringify(sampleContainers));
    localStorage.setItem('packages', JSON.stringify(samplePackages));
    localStorage.setItem('stock', JSON.stringify(sampleStock));
    
    console.log('Sample data initialized in local storage');
}

// Data retrieval functions - Modified to use localStorage first
async function getPackages() {
    try {
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        console.log('Retrieved packages from localStorage:', packages.length);
        return packages;
    } catch (error) {
        console.error('Error getting packages from localStorage:', error);
        return [];
    }
}

async function getContainers() {
    try {
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        console.log('Retrieved containers from localStorage:', containers.length);
        return containers;
    } catch (error) {
        console.error('Error getting containers from localStorage:', error);
        return [];
    }
}

async function getCustomers() {
    try {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        console.log('Retrieved customers from localStorage:', customers.length);
        return customers;
    } catch (error) {
        console.error('Error getting customers from localStorage:', error);
        return [];
    }
}

async function getPersonnel() {
    try {
        const personnel = JSON.parse(localStorage.getItem('personnel') || '[]');
        console.log('Retrieved personnel from localStorage:', personnel.length);
        return personnel;
    } catch (error) {
        console.error('Error getting personnel from localStorage:', error);
        return [];
    }
}

async function getStock() {
    try {
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        console.log('Retrieved stock from localStorage:', stock.length);
        return stock;
    } catch (error) {
        console.error('Error getting stock from localStorage:', error);
        return [];
    }
}

// Data saving functions - Modified to save locally and backup to Supabase
async function savePackage(packageData) {
    try {
        // Get existing packages
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        
        // Add new package
        const newPackage = {
            ...packageData,
            id: packages.length > 0 ? Math.max(...packages.map(p => p.id)) + 1 : 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        packages.push(newPackage);
        
        // Save to localStorage
        localStorage.setItem('packages', JSON.stringify(packages));
        console.log('Package saved to localStorage:', newPackage);
        
        // Backup to Supabase if available
        await backupToSupabase('packages', newPackage);
        
        return newPackage;
        
    } catch (error) {
        console.error('Error saving package:', error);
        throw error;
    }
}

async function saveContainer(containerData) {
    try {
        // Get existing containers
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        
        // Add new container
        const newContainer = {
            ...containerData,
            id: containers.length > 0 ? Math.max(...containers.map(c => c.id)) + 1 : 1,
            created_at: new Date().toISOString()
        };
        
        containers.push(newContainer);
        
        // Save to localStorage
        localStorage.setItem('containers', JSON.stringify(containers));
        console.log('Container saved to localStorage:', newContainer);
        
        // Backup to Supabase if available
        await backupToSupabase('containers', newContainer);
        
        return newContainer;
        
    } catch (error) {
        console.error('Error saving container:', error);
        throw error;
    }
}

async function updatePackage(packageId, updates) {
    try {
        // Get existing packages
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        
        // Find and update package
        const packageIndex = packages.findIndex(p => p.id === packageId);
        if (packageIndex === -1) {
            throw new Error('Package not found');
        }
        
        packages[packageIndex] = {
            ...packages[packageIndex],
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('packages', JSON.stringify(packages));
        console.log('Package updated in localStorage:', packages[packageIndex]);
        
        // Backup to Supabase if available
        await backupToSupabase('packages', packages[packageIndex], 'update');
        
        return packages[packageIndex];
        
    } catch (error) {
        console.error('Error updating package:', error);
        throw error;
    }
}

async function updateContainer(containerId, updates) {
    try {
        // Get existing containers
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        
        // Find and update container
        const containerIndex = containers.findIndex(c => c.id === containerId);
        if (containerIndex === -1) {
            throw new Error('Container not found');
        }
        
        containers[containerIndex] = {
            ...containers[containerIndex],
            ...updates
        };
        
        // Save to localStorage
        localStorage.setItem('containers', JSON.stringify(containers));
        console.log('Container updated in localStorage:', containers[containerIndex]);
        
        // Backup to Supabase if available
        await backupToSupabase('containers', containers[containerIndex], 'update');
        
        return containers[containerIndex];
        
    } catch (error) {
        console.error('Error updating container:', error);
        throw error;
    }
}

async function updateStockItem(code, quantity) {
    try {
        // Get existing stock
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        
        // Find and update stock item
        const stockIndex = stock.findIndex(s => s.code === code);
        if (stockIndex === -1) {
            // Add new stock item if not found
            const newStockItem = {
                code: code,
                name: code, // You might want to get the name from somewhere
                quantity: quantity,
                last_updated: new Date().toISOString()
            };
            
            stock.push(newStockItem);
        } else {
            // Update existing stock item
            stock[stockIndex] = {
                ...stock[stockIndex],
                quantity: quantity,
                last_updated: new Date().toISOString()
            };
        }
        
        // Save to localStorage
        localStorage.setItem('stock', JSON.stringify(stock));
        console.log('Stock updated in localStorage:', stock[stockIndex || stock.length - 1]);
        
        // Backup to Supabase if available
        await backupToSupabase('stock', stock[stockIndex || stock.length - 1], stockIndex === -1 ? 'insert' : 'update');
        
        return stock[stockIndex || stock.length - 1];
        
    } catch (error) {
        console.error('Error updating stock:', error);
        throw error;
    }
}

// Backup functions for Supabase (optional)
async function backupToSupabase(table, data, operation = 'insert') {
    // Only backup if Supabase is configured
    if (!window.supabase || !SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, skipping backup');
        return;
    }
    
    try {
        if (operation === 'insert') {
            const { error } = await window.supabase
                .from(table)
                .insert([data]);
            
            if (error) throw error;
            console.log(`Data backed up to Supabase (${table}):`, data);
        } else if (operation === 'update') {
            const { error } = await window.supabase
                .from(table)
                .update(data)
                .eq('id', data.id);
            
            if (error) throw error;
            console.log(`Data updated in Supabase (${table}):`, data);
        }
    } catch (error) {
        console.error(`Error backing up to Supabase (${table}):`, error);
        // Don't throw error - local storage is primary, Supabase is backup only
    }
}

// Sync function to get data from Supabase (for recovery)
async function syncFromSupabase() {
    if (!window.supabase || !SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, skipping sync');
        return;
    }
    
    try {
        // Get data from Supabase
        const [packagesRes, containersRes, customersRes, stockRes] = await Promise.all([
            window.supabase.from('packages').select('*'),
            window.supabase.from('containers').select('*'),
            window.supabase.from('customers').select('*'),
            window.supabase.from('stock').select('*')
        ]);
        
        // Check for errors
        if (packagesRes.error) throw packagesRes.error;
        if (containersRes.error) throw containersRes.error;
        if (customersRes.error) throw customersRes.error;
        if (stockRes.error) throw stockRes.error;
        
        // Save to localStorage
        localStorage.setItem('packages', JSON.stringify(packagesRes.data || []));
        localStorage.setItem('containers', JSON.stringify(containersRes.data || []));
        localStorage.setItem('customers', JSON.stringify(customersRes.data || []));
        localStorage.setItem('stock', JSON.stringify(stockRes.data || []));
        
        console.log('Data synced from Supabase');
        showAlert('Veriler Supabase\'den senkronize edildi', 'success');
        
    } catch (error) {
        console.error('Error syncing from Supabase:', error);
        showAlert('Supabase senkronizasyon hatası: ' + error.message, 'error');
    }
}

// Export data for Excel
function getExportData() {
    try {
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        
        // Transform data for Excel export
        const exportData = {
            packages: packages.map(pkg => ({
                'Package ID': pkg.id,
                'Package No': pkg.package_no,
                'Customer': pkg.customer_name || `Customer ${pkg.customer_id}`,
                'Product': pkg.product,
                'Quantity': pkg.quantity,
                'Status': pkg.status,
                'Container': pkg.container_no || `Container ${pkg.container_id}`,
                'Created Date': pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : '',
                'Updated Date': pkg.updated_at ? new Date(pkg.updated_at).toLocaleDateString('tr-TR') : ''
            })),
            
            containers: containers.map(cont => ({
                'Container ID': cont.id,
                'Container No': cont.container_no,
                'Customer': cont.customer_name || `Customer ${cont.customer_id}`,
                'Status': cont.status,
                'Created Date': cont.created_at ? new Date(cont.created_at).toLocaleDateString('tr-TR') : '',
                'Package Count': packages.filter(pkg => pkg.container_id === cont.id).length
            })),
            
            customers: customers.map(cust => ({
                'Customer ID': cust.id,
                'Name': cust.name,
                'Code': cust.code,
                'Contact': cust.contact,
                'Phone': cust.phone,
                'Package Count': packages.filter(pkg => pkg.customer_id === cust.id).length
            })),
            
            stock: stock.map(item => ({
                'Code': item.code,
                'Name': item.name,
                'Quantity': item.quantity,
                'Last Updated': item.last_updated ? new Date(item.last_updated).toLocaleDateString('tr-TR') : '',
                'Status': item.quantity === 0 ? 'Out of Stock' : item.quantity <= 5 ? 'Low Stock' : 'In Stock'
            }))
        };
        
        return exportData;
        
    } catch (error) {
        console.error('Error preparing export data:', error);
        throw error;
    }
}

// Initialize data when the script loads
document.addEventListener('DOMContentLoaded', function() {
    initializeLocalStorage();
    
    // Set up periodic backup to Supabase (every 5 minutes)
    setInterval(async () => {
        if (window.supabase && SUPABASE_ANON_KEY) {
            await backupAllDataToSupabase();
        }
    }, 5 * 60 * 1000);
});

// Backup all data to Supabase
async function backupAllDataToSupabase() {
    if (!window.supabase || !SUPABASE_ANON_KEY) {
        return;
    }
    
    try {
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        
        // Backup each table
        await Promise.all([
            backupTableToSupabase('packages', packages),
            backupTableToSupabase('containers', containers),
            backupTableToSupabase('customers', customers),
            backupTableToSupabase('stock', stock)
        ]);
        
        console.log('Periodic backup to Supabase completed');
    } catch (error) {
        console.error('Periodic backup error:', error);
    }
}

async function backupTableToSupabase(tableName, data) {
    try {
        // Clear existing data in Supabase (optional - you might want to keep history)
        // const { error: deleteError } = await window.supabase.from(tableName).delete().neq('id', 0);
        // if (deleteError) console.error(`Error clearing ${tableName}:`, deleteError);
        
        // Insert new data
        if (data.length > 0) {
            const { error } = await window.supabase.from(tableName).upsert(data);
            if (error) throw error;
        }
        
        console.log(`Table ${tableName} backed up to Supabase: ${data.length} records`);
    } catch (error) {
        console.error(`Error backing up ${tableName} to Supabase:`, error);
    }
}
