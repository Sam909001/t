// Customer management
class CustomerManager {
    constructor() {
        this.customers = [];
        this.customerCache = new Map();
    }

    // Load customers from database
    async loadCustomers() {
        try {
            const customers = await DatabaseManager.query('customers', 'select', {
                order: { column: 'name', ascending: true }
            });

            if (customers) {
                this.customers = customers;
                this.updateCustomerCache();
                console.log(`${customers.length} customers loaded`);
                return customers;
            }
            return [];
        } catch (error) {
            console.error('Error loading customers:', error);
            
            // Try to use offline data
            if (OfflineManager.hasOfflineData('customers')) {
                this.customers = OfflineManager.getOfflineData('customers');
                console.log('Using offline customer data');
                return this.customers;
            }
            
            NotificationManager.showAlert('Müşteriler yüklenemedi', 'error');
            return [];
        }
    }

    // Update customer cache for quick access
    updateCustomerCache() {
        this.customerCache.clear();
        this.customers.forEach(customer => {
            this.customerCache.set(customer.id, customer);
        });
    }

    // Populate customer select dropdown
    async populateCustomerSelect() {
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) return;

        try {
            await this.loadCustomers();
            
            customerSelect.innerHTML = '<option value="">Müşteri Seçin</option>';
            
            this.customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.code})`;
                customerSelect.appendChild(option);
            });

            console.log('Customer select populated');
        } catch (error) {
            console.error('Error populating customer select:', error);
            NotificationManager.showAlert('Müşteri listesi yüklenemedi', 'error');
        }
    }

    // Get customer by ID
    async getCustomer(customerId) {
        // Check cache first
        if (this.customerCache.has(customerId)) {
            return this.customerCache.get(customerId);
        }

        try {
            const customers = await DatabaseManager.query('customers', 'select', {
                filter: { id: customerId }
            });

            if (customers && customers.length > 0) {
                const customer = customers[0];
                this.customerCache.set(customerId, customer);
                return customer;
            }
            return null;
        } catch (error) {
            console.error('Error getting customer:', error);
            return null;
        }
    }

    // Create new customer
    async createCustomer(customerData) {
        try {
            // Validate required fields
            if (!customerData.name || !customerData.code) {
                throw new Error('Müşteri adı ve kodu zorunludur');
            }

            // Check permission
            AuthManager.requirePermission('manage_customers');

            // Check if code already exists
            const existingCustomer = await this.getCustomerByCode(customerData.code);
            if (existingCustomer) {
                throw new Error('Bu müşteri kodu zaten kullanılıyor');
            }

            const newCustomer = {
                ...customerData,
                created_at: new Date().toISOString(),
                created_by: AuthManager.getCurrentUser()?.uid
            };

            if (DatabaseManager.isReady()) {
                const result = await DatabaseManager.query('customers', 'insert', {
                    data: newCustomer
                });

                if (result && result.length > 0) {
                    const customer = result[0];
                    this.customers.push(customer);
                    this.customerCache.set(customer.id, customer);
                    
                    // Update offline storage
                    OfflineManager.storeOfflineData('customers', this.customers);
                    
                    NotificationManager.showAlert('Müşteri eklendi', 'success');
                    return customer;
                }
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'create_customer',
                    data: newCustomer
                });
                
                // Add to local cache with temporary ID
                newCustomer.id = 'temp_' + Helpers.generateId();
                this.customers.push(newCustomer);
                this.customerCache.set(newCustomer.id, newCustomer);
                
                NotificationManager.showAlert('Müşteri eklendi (çevrimdışı)', 'info');
                return newCustomer;
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            NotificationManager.showAlert('Müşteri eklenemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Update customer
    async updateCustomer(customerId, updates) {
        try {
            AuthManager.requirePermission('manage_customers');

            const customer = await this.getCustomer(customerId);
            if (!customer) {
                throw new Error('Müşteri bulunamadı');
            }

            if (DatabaseManager.isReady()) {
                const result = await DatabaseManager.query('customers', 'update', {
                    data: { ...updates, updated_at: new Date().toISOString() },
                    filter: { id: customerId }
                });

                // Update local cache
                const updatedCustomer = { ...customer, ...updates };
                this.customerCache.set(customerId, updatedCustomer);
                
                // Update customers array
                const index = this.customers.findIndex(c => c.id === customerId);
                if (index !== -1) {
                    this.customers[index] = updatedCustomer;
                }

                // Update offline storage
                OfflineManager.storeOfflineData('customers', this.customers);
                
                NotificationManager.showAlert('Müşteri güncellendi', 'success');
                return updatedCustomer;
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'update_customer',
                    data: { id: customerId, ...updates }
                });
                
                NotificationManager.showAlert('Müşteri güncellendi (çevrimdışı)', 'info');
                return customer;
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            NotificationManager.showAlert('Müşteri güncellenemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Delete customer
    async deleteCustomer(customerId) {
        try {
            AuthManager.requirePermission('manage_customers');

            const customer = await this.getCustomer(customerId);
            if (!customer) {
                throw new Error('Müşteri bulunamadı');
            }

            // Check if customer has packages
            const hasPackages = await this.customerHasPackages(customerId);
            if (hasPackages) {
                throw new Error('Bu müşteriye ait paketler bulunuyor. Önce paketleri silin.');
            }

            if (DatabaseManager.isReady()) {
                await DatabaseManager.query('customers', 'delete', {
                    filter: { id: customerId }
                });

                // Remove from local cache
                this.customerCache.delete(customerId);
                this.customers = this.customers.filter(c => c.id !== customerId);

                // Update offline storage
                OfflineManager.storeOfflineData('customers', this.customers);
                
                NotificationManager.showAlert('Müşteri silindi', 'success');
                return true;
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'delete_customer',
                    data: { id: customerId }
                });
                
                NotificationManager.showAlert('Müşteri silindi (çevrimdışı)', 'info');
                return true;
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            NotificationManager.showAlert('Müşteri silinemedi: ' + error.message, 'error');
            throw error;
        }
    }

    // Get customer by code
    async getCustomerByCode(code) {
        try {
            const customers = await DatabaseManager.query('customers', 'select', {
                filter: { code: code }
            });

            return customers && customers.length > 0 ? customers[0] : null;
        } catch (error) {
            console.error('Error getting customer by code:', error);
            return null;
        }
    }

    // Check if customer has packages
    async customerHasPackages(customerId) {
        try {
            const packages = await DatabaseManager.query('packages', 'select', {
                columns: 'id',
                filter: { customer_id: customerId },
                limit: 1
            });

            return packages && packages.length > 0;
        } catch (error) {
            console.error('Error checking customer packages:', error);
            return false;
        }
    }

    // Search customers
    searchCustomers(query) {
        if (!query) return this.customers;

        const searchTerm = query.toLowerCase();
        return this.customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.code.toLowerCase().includes(searchTerm) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
            (customer.phone && customer.phone.includes(searchTerm))
        );
    }

    // Populate all customers list (for admin panel)
    async populateAllCustomersList() {
        const customersList = document.getElementById('allCustomersList');
        if (!customersList) return;

        try {
            await this.loadCustomers();
            
            customersList.innerHTML = '';
            
            this.customers.forEach(customer => {
                const customerCard = document.createElement('div');
                customerCard.className = 'customer-card';
                customerCard.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h4>${customer.name}</h4>
                            <p style="color: #666; margin: 0.2rem 0;">Kod: ${customer.code}</p>
                            ${customer.email ? `<p style="color: #666; margin: 0.2rem 0;">E-posta: ${customer.email}</p>` : ''}
                            ${customer.phone ? `<p style="color: #666; margin: 0.2rem 0;">Telefon: ${customer.phone}</p>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-warning btn-sm" onclick="CustomerManager.editCustomer('${customer.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="CustomerManager.confirmDeleteCustomer('${customer.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${customer.address ? `<p style="color: #666; font-size: 0.9rem;">${customer.address}</p>` : ''}
                `;
                customersList.appendChild(customerCard);
            });

        } catch (error) {
            console.error('Error populating customers list:', error);
            customersList.innerHTML = '<p style="text-align: center; color: #666;">Müşteriler yüklenemedi</p>';
        }
    }

    // Edit customer (show modal)
    editCustomer(customerId) {
        const customer = this.customerCache.get(customerId);
        if (!customer) {
            NotificationManager.showAlert('Müşteri bulunamadı', 'error');
            return;
        }

        // Show edit modal (to be implemented in modals.js)
        ModalManager.showCustomerEditModal(customer);
    }

    // Confirm delete customer
    confirmDeleteCustomer(customerId) {
        const customer = this.customerCache.get(customerId);
        if (!customer) {
            NotificationManager.showAlert('Müşteri bulunamadı', 'error');
            return;
        }

        NotificationManager.showConfirm(
            `"${customer.name}" müşterisini silmek istediğinizden emin misiniz?`,
            () => this.deleteCustomer(customerId),
            () => console.log('Delete cancelled')
        );
    }

    // Get customer statistics
    getCustomerStats() {
        return {
            total: this.customers.length,
            withEmail: this.customers.filter(c => c.email).length,
            withPhone: this.customers.filter(c => c.phone).length,
            recentlyAdded: this.customers.filter(c => {
                const createdDate = new Date(c.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return createdDate > weekAgo;
            }).length
        };
    }

    // Export customers to CSV
    exportCustomersCSV() {
        const csvData = this.customers.map(customer => ({
            'Müşteri Kodu': customer.code,
            'Müşteri Adı': customer.name,
            'E-posta': customer.email || '',
            'Telefon': customer.phone || '',
            'Adres': customer.address || '',
            'Oluşturma Tarihi': Helpers.formatDate(customer.created_at)
        }));

        Helpers.downloadCSV(csvData, `musteriler_${Helpers.formatDate(new Date())}.csv`);
    }

    // Get all customers (for external use)
    getAllCustomers() {
        return [...this.customers];
    }
}

// Create global instance
window.CustomerManager = new CustomerManager();
