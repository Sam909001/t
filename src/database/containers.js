// Container management
class ContainerManager {
    constructor() {
        this.containers = [];
        this.currentContainer = null;
        this.containerCache = new Map();
    }

    // Load containers from database
    async loadContainers() {
        try {
            const containers = await DatabaseManager.query('containers', 'select', {
                order: { column: 'created_at', ascending: false }
            });

            if (containers) {
                this.containers = containers;
                this.updateContainerCache();
                console.log(`${containers.length} containers loaded`);
                return containers;
            }
            return [];
        } catch (error) {
            console.error('Error loading containers:', error);
            
            // Try to use offline data
            if (OfflineManager.hasOfflineData('containers')) {
                this.containers = OfflineManager.getOfflineData('containers');
                console.log('Using offline container data');
                return this.containers;
            }
            
            NotificationManager.showAlert('Konteyner verileri yüklenemedi', 'error');
            return [];
        }
    }

    // Update container cache
    updateContainerCache() {
        this.containerCache.clear();
        this.containers.forEach(container => {
            this.containerCache.set(container.id, container);
        });
    }

    // Create new container
    async createContainer() {
        try {
            AuthManager.requirePermission('create_package');

            const containerNumber = this.generateContainerNumber();
            const newContainer = {
                container_number: containerNumber,
                status: 'active',
                created_at: new Date().toISOString(),
                created_by: AuthManager.getCurrentUser()?.uid,
                package_count: 0
            };

            if (DatabaseManager.isReady()) {
                const result = await DatabaseManager.query('containers', 'insert', {
                    data: newContainer
                });

                if (result && result.length > 0) {
                    const container = result[0];
                    this.containers.unshift(container);
                    this.containerCache.set(container.id, container);
                    
                    // Update offline storage
                    OfflineManager.storeOfflineData('containers', this.containers);
                    
                    // Set as current container
                    this.setCurrentContainer(container);
                    
                    NotificationManager.showAlert('Yeni konteyner oluşturuldu: ' + containerNumber, 'success');
                    return container;
                }
            } else {
                // Queue for offline sync
                OfflineManager.queueForSync({
                    type: 'create_container',
                    data: newContainer
                });
                
                // Add to local cache with temporary ID
                newContainer.id = 'temp_' + Helpers.generateId();
                this.containers.unshift(newContainer);
                this.containerCache.set(newContainer.id, newContainer);
                
                // Set as current container
                this.setCurrentContainer(newContainer);
                
                NotificationManager.showAlert('Yeni konteyner oluşturuldu (çevrimdışı): ' + containerNumber, 'info');
                return newContainer;
            }
        } catch (error) {
            console.error('Error creating container:', error);
            NotificationManager.showAlert('Konteyner oluşturulamadı: ' + error.message, 'error');
            throw error;
        }
    }

    // Generate container number
    generateContainerNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
        
        return `CNT${year}${month}${day}-${time}`;
    }

    // Set current container
    setCurrentContainer(container) {
        this.currentContainer = container;
        
        // Update UI
        const containerNumberElement = document.getElementById('containerNumber');
        if (containerNumberElement) {
            containerNumberElement.textContent = container.container_number;
        }

        // Save to app state
        if (typeof app !== 'undefined' && app.saveAppState) {
            app.currentContainer = container.container_number;
            app.saveAppState();
        }

        console.log('Current container set:', container.container_number);
    }

    // Get container by number
    async getContainerByNumber(containerNumber) {
        // Check cache first
        const cached = Array.from(this.containerCache.values())
            .find(c => c.container_number === containerNumber);
        if (cached) return cached;

        try {
            const containers = await DatabaseManager.query('containers', 'select', {
                filter: { container_number: containerNumber }
            });

            if (containers && containers.length > 0) {
                const container = containers[0];
                this.containerCache.set(container.id, container);
                return container;
            }
            return null;
        } catch (error) {
            console.error('Error getting container by number:', error);
            return null;
        }
    }

    // Add package to container
    async addPackageToContainer(packageId, containerId = null) {
        try {
            const targetContainerId = containerId || this.currentContainer?.id;
            if (!targetContainerId) {
                throw new Error('Aktif konteyner bulunamadı');
            }

            // Update package with container ID
            await PackageManager.updatePackage(packageId, {
                container_id: targetContainerId
            });

            // Update container package count
            await this.updateContainerPackageCount(targetContainerId);

            console.log(`Package ${packageId} added to container ${targetContainerId}`);
            return true;
        } catch (error) {
            console.error('Error adding package to container:', error);
            return false;
        }
    }

    // Update container package count
    async updateContainerPackageCount(containerId) {
        try {
            // Count packages in container
            const packages = await DatabaseManager.query('packages', 'select', {
                columns: 'id',
                filter: { container_id: containerId }
            });

            const packageCount = packages ? packages.length : 0;

            // Update container
            await DatabaseManager.query('containers', 'update', {
                data: { 
                    package_count: packageCount,
                    updated_at: new Date().toISOString()
                },
                filter: { id: containerId }
            });

            // Update local cache
            const container = this.containerCache.get(containerId);
            if (container) {
                container.package_count = packageCount;
                container.updated_at = new Date().toISOString();
            }

            // Update current container display
            if (this.currentContainer?.id === containerId) {
                const totalElement = document.getElementById('totalPackages');
                if (totalElement) {
                    totalElement.textContent = packageCount;
                }
            }

            return packageCount;
        } catch (error) {
            console.error('Error updating container package count:', error);
            return 0;
        }
    }

    // Close container (mark as completed)
    async closeContainer(containerId) {
        try {
            AuthManager.requirePermission('create_package');

            const container = this.containerCache.get(containerId);
            if (!container) {
                throw new Error('Konteyner bulunamadı');
            }

            // Update container status
            await DatabaseManager.query('containers', 'update', {
                data: {
                    status: 'completed',
                    closed_at: new Date().toISOString(),
                    closed_by: AuthManager.getCurrentUser()?.uid
                },
                filter: { id: containerId }
            });

            // Update local cache
            container.status = 'completed';
            container.closed_at = new Date().toISOString();

            // Clear current container if this was the active one
            if (this.currentContainer?.id === containerId) {
                this.currentContainer = null;
                const containerNumberElement = document.getElementById('containerNumber');
                if (containerNumberElement) {
                    containerNumberElement.textContent = '-';
                }
            }

            NotificationManager.showAlert(
                `Konteyner ${container.container_number} kapatıldı`,
                'success'
            );

            return true;
        } catch (error) {
            console.error('Error closing container:', error);
            NotificationManager.showAlert('Konteyner kapatılamadı: ' + error.message, 'error');
            return false;
        }
    }

    // Get packages in container
    async getContainerPackages(containerId) {
        try {
            const packages = await DatabaseManager.query('packages', 'select', {
                columns: `
                    id, customer_id, product_name, quantity, barcode, 
                    status, created_at,
                    customers(name, code)
                `,
                filter: { container_id: containerId },
                order: { column: 'created_at', ascending: false }
            });

            return packages || [];
        } catch (error) {
            console.error('Error getting container packages:', error);
            return [];
        }
    }

    // Search containers
    searchContainers(query) {
        if (!query) return this.containers;

        const searchTerm = query.toLowerCase();
        return this.containers.filter(container => 
            container.container_number.toLowerCase().includes(searchTerm) ||
            container.status.toLowerCase().includes(searchTerm)
        );
    }

    // Setup container search
    setupContainerSearch() {
        const searchInput = document.getElementById('containerSearch');
        if (!searchInput) return;

        const debouncedSearch = Helpers.debounce(async (query) => {
            const filteredContainers = this.searchContainers(query);
            await this.displayFilteredContainers(filteredContainers);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    // Display filtered containers
    async displayFilteredContainers(filteredContainers) {
        // This would be implemented based on where containers are displayed
        console.log('Filtered containers:', filteredContainers);
    }

    // Get container statistics
    getContainerStats() {
        const total = this.containers.length;
        const active = this.containers.filter(c => c.status === 'active').length;
        const completed = this.containers.filter(c => c.status === 'completed').length;
        const totalPackages = this.containers.reduce((sum, c) => sum + (c.package_count || 0), 0);

        return {
            total,
            active,
            completed,
            totalPackages,
            averagePackagesPerContainer: total > 0 ? (totalPackages / total).toFixed(1) : 0
        };
    }

    // Get containers for dropdown/selection
    getActiveContainers() {
        return this.containers.filter(c => c.status === 'active');
    }

    // Populate container select dropdown
    populateContainerSelect(selectElementId) {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;

        const activeContainers = this.getActiveContainers();
        
        selectElement.innerHTML = '<option value="">Konteyner Seçin</option>';
        
        activeContainers.forEach(container => {
            const option = document.createElement('option');
            option.value = container.id;
            option.textContent = `${container.container_number} (${container.package_count || 0} paket)`;
            selectElement.appendChild(option);
        });
    }

    // Export container data
    exportContainersCSV() {
        const csvData = this.containers.map(container => ({
            'Konteyner No': container.container_number,
            'Durum': container.status,
            'Paket Sayısı': container.package_count || 0,
            'Oluşturma Tarihi': Helpers.formatDateTime(container.created_at),
            'Kapanma Tarihi': container.closed_at ? Helpers.formatDateTime(container.closed_at) : '-'
        }));

        Helpers.downloadCSV(csvData, `konteynerler_${Helpers.formatDate(new Date())}.csv`);
    }

    // Get current container info
    getCurrentContainerInfo() {
        return this.currentContainer ? {
            id: this.currentContainer.id,
            number: this.currentContainer.container_number,
            packageCount: this.currentContainer.package_count || 0,
            status: this.currentContainer.status,
            createdAt: this.currentContainer.created_at
        } : null;
    }

    // Load container by number (for app state restoration)
    async loadContainerByNumber(containerNumber) {
        if (!containerNumber) return null;

        try {
            const container = await this.getContainerByNumber(containerNumber);
            if (container && container.status === 'active') {
                this.setCurrentContainer(container);
                return container;
            }
            return null;
        } catch (error) {
            console.error('Error loading container by number:', error);
            return null;
        }
    }

    // Initialize container management
    init() {
        this.setupContainerSearch();
        console.log('ContainerManager initialized');
    }

    // Get all containers (for external use)
    getAllContainers() {
        return [...this.containers];
    }
}

// Create global instance
window.ContainerManager = new ContainerManager();
