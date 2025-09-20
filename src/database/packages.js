// Package management
class PackageManager {
    constructor() {
        this.packages = [];
        this.selectedPackages = new Set();
        this.packageCache = new Map();
    }

    // Load packages from database
    async loadPackages() {
        try {
            const packages = await DatabaseManager.query('packages', 'select', {
                columns: `
                    id, customer_id, product_name, quantity, barcode, 
                    status, created_at, updated_at, container_id,
                    customers(name, code)
                `,
                order: { column: 'created_at', ascending: false }
            });

            if (packages) {
                this.packages = packages;
                this.updatePackageCache();
                await this.populatePackagesTable();
                console.log(`${packages.length} packages loaded`);
                return packages;
            }
            return [];
        } catch (error) {
            console.error('Error loading packages:', error);
            
            // Try to use offline data
            if (OfflineManager.hasOfflineData('packages')) {
                this.packages = OfflineManager.getOfflineData('packages');
                await this.populatePackagesTable();
                console.log('Using offline package data');
                return this.packages;
            }
            
            NotificationManager.showAlert('Paketler yüklenemedi', 'error');
            return [];
        }
    }

    // Update package cache
    updatePackageCache() {
        this.packageCache.clear();
        this.packages.forEach(pkg => {
            this.packageCache.set(pkg.id, pkg);
        });
    }

    // Populate packages table
    async populatePackagesTable() {
        const tableBody = document.getElementById('packagesTableBody');
        if (!tableBody) return;

        try {
            tableBody.innerHTML = '';
            
            const pendingPackages = this.packages.filter(pkg => pkg.status === 'beklemede');
            
            if (pendingPackages.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #666; padding: 2rem;">
                            Bekleyen paket bulunmuyor
                        </td>
                    </tr>
                `;
                return;
            }

            pendingPackages.forEach(pkg => {
                const row = document.createElement('tr');
                row.dataset.packageId = pkg.id;
                
                const customerName = pkg.customers?.name || 'Bilinmeyen';
                const statusClass = `status-${pkg.status.replace(' ', '-')}`;
                
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="package-checkbox" 
                               value="${pkg.id}" 
                               ${this.selectedPackages.has(pkg.id) ? 'checked' : ''}>
                    </td>
                    <td>${customerName}</td>
                    <td>${pkg.product_name}</td>
                    <td>${pkg.quantity}</td>
                    <td><span class="${statusClass}">${pkg.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="PackageManager.selectPackage('${pkg.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="PackageManager.editPackage('${pkg.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="PackageManager.deletePackage('${pkg.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;

                // Add click handler for row selection
                row.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox' && !e.target.closest('button')) {
                        this.selectPackage(pkg.id);
                    }
                });

                tableBody.appendChild(row);
            });

            // Setup checkbox handlers
            this.setupPackageCheckboxes();
            
            // Update total count
            this.updatePackageCount();

        } catch (error) {
            console.error('Error populating packages table:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">Tablo yüklenemedi</td></tr>';
        }
    }

    // Setup package checkbox handlers
    setupPackageCheckboxes() {
        const checkboxes = document.querySelectorAll('.package-checkbox');
        const selectAllCheckbox = document.getElementById('selectAllPackages');

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const packageId = e.target.value;
                if (e.target.checked) {
                    this.selectedPackages.add(packageId);
                } else {
                    this.selectedPackages.delete(packageId);
                }
                this.updateSelectAllCheckbox();
            });
        });

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    const packageId = checkbox.value;
                    if (isChecked) {
                        this.selectedPackages.add(packageId);
                    } else {
                        this.selectedPackages.delete(packageId);
                    }
                });
            });
        }
    }

    // Update select all checkbox state
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllPackages');
        const checkboxes = document.querySelectorAll('.package-checkbox');
        
        if (selectAllCheckbox && checkboxes.length > 0) {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            selectAllCheckbox.checked = checkedCount === checkboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        }
    }

    // Select package for details view
    selectPackage(packageId) {
        const pkg = this.packageCache.get(packageId);
        if (!pkg) {
            NotificationManager.showAlert('Paket bulunamadı', 'error');
            return;
        }

        // Remove previous selection
        document.querySelectorAll('.package-table tr.selected').forEach(row => {
            row.classList.remove('selected');
        });

        // Add selection to current row
        const row = document.querySelector(`tr[data-package-id="${packageId}"]`);
        if (row) {
            row.classList.add('selected');
        }

        // Show package details
        this.showPackageDetails(pkg);
        
        // Enable action buttons
        this.enablePackageActions(true);
    }

    // Show package details
    showPackageDetails(pkg) {
        const detailContent = document.getElementById('packageDetailContent');
        if (!detailContent) return;

        const customerName = pkg.customers?.name || 'Bilinmeyen';
        const customerCode = pkg.customers?.code || '-';

        detailContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h4>${pkg.product_name}</h4>
                <p><strong>Müşteri:</strong> ${customerName} (${customerCode})</p>
                <p><strong>Adet:</strong> ${pkg.quantity}</p>
                <p><strong>Barkod:</strong> ${pkg.barcode}</p>
                <p><strong>Durum:</strong> <span class="status-${pkg.status.replace(' ', '-')}">${pkg.status}</span></p>
                <p><strong>Oluşturma:</strong> ${Helpers.formatDateTime(pkg.created_at)}</p>
                ${pkg.container_id ? `<p><strong>Konteyner:</strong> ${pkg.container_id}</p>` : ''}
            </div>
        `;

        // Store selected package for actions
        this.selectedPackage = pkg;
    }

    // Enable/disable package action buttons
    enablePackageActions(enabled) {
        const buttons = ['printPackageBtn', 'editPackageBtn', 'deletePackageBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = !enabled;
            }
        });
    }

    // Create new package
    async createPackage(packageData) {
        try {
            // Validate required fields
            if (!packageData.customer_id || !packageData.product_name || !packageData.quantity) {
                throw new Error('Müşteri, ürün adı ve adet zorunludur');
            }

            AuthManager.requirePermission('create_package');

            const newPackage = {
                ...packageData,
                barcode: packageData.barcode || Helpers.generateBarcode(),
                status: 'beklemede',
                created_at: new Date().toISOString(),
                created_by: AuthManager.getCurrentUser()?.uid
            };

            if (DatabaseManager.isReady()) {
                const result = await DatabaseManager.query('packages', 'insert', {
                    data: newPackage
                });

                if (result && result.length > 0) {
                    const pkg = result[0];
                    
                    // Get customer info
                    const customer = await CustomerManager.getCustomer(pkg.customer_id);
                    if (customer) {
                        pkg.customers = { name: customer.name, code: customer.code };
                    }
                    
                    this.packages.unshift(pkg);
                    this.packageCache.set(pkg.id, pkg);
                    
                    // Update offline storage
                    OfflineManager.storeOfflineData('packages', this.packages);
                    
                    // Refresh table
                    await this.populatePackagesTable();
                    
                    NotificationManager.showAlert('Paket oluşturuldu', 'success');
                    return pkg;
                }
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'create_package',
                    data: newPackage
                });
                
                // Add to local cache with temporary ID
                newPackage.id = 'temp_' + Helpers.generateId();
                this.packages.unshift(newPackage);
                this.packageCache.set(newPackage.id, newPackage);
                
                await this.populatePackagesTable();
                NotificationManager.showAlert('Paket oluşturuldu (çevrimdışı)', 'info');
                return newPackage;
            }
        } catch (error) {
            console.error('Error creating package:', error);
            NotificationManager.showAlert('Paket oluşturulamadı: ' + error.message, 'error');
            throw error;
        }
    }

    // Update package
    async updatePackage(packageId, updates) {
        try {
            AuthManager.requirePermission('update_package');

            const pkg = this.packageCache.get(packageId);
            if (!pkg) {
                throw new Error('Paket bulunamadı');
            }

            if (DatabaseManager.isReady()) {
                await DatabaseManager.query('packages', 'update', {
                    data: { ...updates, updated_at: new Date().toISOString() },
                    filter: { id: packageId }
                });

                // Update local cache
                const updatedPackage = { ...pkg, ...updates };
                this.packageCache.set(packageId, updatedPackage);
                
                // Update packages array
                const index = this.packages.findIndex(p => p.id === packageId);
                if (index !== -1) {
                    this.packages[index] = updatedPackage;
                }

                // Update offline storage
                OfflineManager.storeOfflineData('packages', this.packages);
                
                // Refresh table
                await this.populatePackagesTable();
                
                NotificationManager.showAlert('Paket güncellendi', 'success');
                return updatedPackage;
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'update_package',
                    data: { id: packageId, ...updates }
                });
                
                NotificationManager.showAlert('Paket güncellendi (çevrimdışı)', 'info');
                return pkg;
            }
        } catch (error) {
            console.error('Error updating package:', error);
            NotificationManager.showAlert('Paket güncellenemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Delete package
    async deletePackage(packageId) {
        try {
            AuthManager.requirePermission('update_package');

            const pkg = this.packageCache.get(packageId);
            if (!pkg) {
                throw new Error('Paket bulunamadı');
            }

            // Show confirmation
            const confirmed = await new Promise(resolve => {
                NotificationManager.showConfirm(
                    `"${pkg.product_name}" paketini silmek istediğinizden emin misiniz?`,
                    () => resolve(true),
                    () => resolve(false)
                );
            });

            if (!confirmed) return false;

            if (DatabaseManager.isReady()) {
                await DatabaseManager.query('packages', 'delete', {
                    filter: { id: packageId }
                });

                // Remove from local cache
                this.packageCache.delete(packageId);
                this.packages = this.packages.filter(p => p.id !== packageId);
                this.selectedPackages.delete(packageId);

                // Update offline storage
                OfflineManager.storeOfflineData('packages', this.packages);
                
                // Refresh table
                await this.populatePackagesTable();
                
                // Clear details if this package was selected
                if (this.selectedPackage?.id === packageId) {
                    this.clearPackageSelection();
                }
                
                NotificationManager.showAlert('Paket silindi', 'success');
                return true;
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'delete_package',
                    data: { id: packageId }
                });
                
                NotificationManager.showAlert('Paket silindi (çevrimdışı)', 'info');
                return true;
            }
        } catch (error) {
            console.error('Error deleting package:', error);
            NotificationManager.showAlert('Paket silinemedi: ' + error.message, 'error');
            return false;
        }
    }

    // Clear package selection
    clearPackageSelection() {
        document.querySelectorAll('.package-table tr.selected').forEach(row => {
            row.classList.remove('selected');
        });

        const detailContent = document.getElementById('packageDetailContent');
        if (detailContent) {
            detailContent.innerHTML = '<p>Paket seçin...</p>';
        }

        this.selectedPackage = null;
        this.enablePackageActions(false);
    }

    // Edit package (show modal)
    editPackage(packageId) {
        const pkg = this.packageCache.get(packageId);
        if (!pkg) {
            NotificationManager.showAlert('Paket bulunamadı', 'error');
            return;
        }

        // Show edit modal (to be implemented in modals.js)
        ModalManager.showPackageEditModal(pkg);
    }

    // Get package by barcode
    getPackageByBarcode(barcode) {
        return this.packages.find(pkg => pkg.barcode === barcode);
    }

    // Update package count display
    updatePackageCount() {
        const totalElement = document.getElementById('totalPackages');
        if (totalElement) {
            const pendingCount = this.packages.filter(pkg => pkg.status === 'beklemede').length;
            totalElement.textContent = pendingCount;
        }
    }

    // Get selected packages
    getSelectedPackages() {
        return Array.from(this.selectedPackages).map(id => this.packageCache.get(id)).filter(Boolean);
    }

    // Mark packages as shipped
    async markAsShipped(packageIds = null) {
        try {
            AuthManager.requirePermission('update_package');

            const ids = packageIds || Array.from(this.selectedPackages);
            if (ids.length === 0) {
                NotificationManager.showAlert('Lütfen paket seçin', 'warning');
                return;
            }

            const updates = {
                status: 'sevk-edildi',
                shipped_at: new Date().toISOString(),
                shipped_by: AuthManager.getCurrentUser()?.uid
            };

            for (const packageId of ids) {
                await this.updatePackage(packageId, updates);
            }

            // Clear selection
            this.selectedPackages.clear();
            
            NotificationManager.showAlert(`${ids.length} paket sevk edildi olarak işaretlendi`, 'success');
            await this.populatePackagesTable();
            
        } catch (error) {
            console.error('Error marking packages as shipped:', error);
            NotificationManager.showAlert('Paketler güncellenemedi', 'error');
        }
    }

    // Search packages
    searchPackages(query) {
        if (!query) return this.packages;

        const searchTerm = query.toLowerCase();
        return this.packages.filter(pkg => 
            pkg.product_name.toLowerCase().includes(searchTerm) ||
            pkg.barcode.toLowerCase().includes(searchTerm) ||
            (pkg.customers?.name && pkg.customers.name.toLowerCase().includes(searchTerm)) ||
            (pkg.customers?.code && pkg.customers.code.toLowerCase().includes(searchTerm))
        );
    }

    // Get package statistics
    getPackageStats() {
        const total = this.packages.length;
        const pending = this.packages.filter(p => p.status === 'beklemede').length;
        const shipped = this.packages.filter(p => p.status === 'sevk-edildi').length;
        
        return { total, pending, shipped };
    }

    // Export packages to CSV
    exportPackagesCSV() {
        const csvData = this.packages.map(pkg => ({
            'Barkod': pkg.barcode,
            'Müşteri': pkg.customers?.name || 'Bilinmeyen',
            'Müşteri Kodu': pkg.customers?.code || '-',
            'Ürün Adı': pkg.product_name,
            'Adet': pkg.quantity,
            'Durum': pkg.status,
            'Oluşturma Tarihi': Helpers.formatDateTime(pkg.created_at),
            'Konteyner': pkg.container_id || '-'
        }));

        Helpers.downloadCSV(csvData, `paketler_${Helpers.formatDate(new Date())}.csv`);
    }

    // Get all packages (for external use)
    getAllPackages() {
        return [...this.packages];
    }
}

// Create global instance
window.PackageManager = new PackageManager();
