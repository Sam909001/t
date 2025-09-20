// Modal management
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalStack = [];
    }

    // Initialize modal manager
    init() {
        this.setupModalEventHandlers();
        console.log('ModalManager initialized');
    }

    // Setup global modal event handlers
    setupModalEventHandlers() {
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });

        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Setup existing modal close buttons
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // Show API key modal
    showApiKeyModal() {
        const modal = document.getElementById('apiKeyModal');
        if (!modal) {
            console.error('API key modal not found');
            return;
        }

        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput) {
            apiKeyInput.value = DatabaseManager.apiKey || '';
        }

        this.showModal('apiKeyModal');
    }

    // Show settings modal
    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) {
            console.error('Settings modal not found');
            return;
        }

        // Load current settings
        this.loadSettingsInModal();
        this.showModal('settingsModal');
    }

    // Load settings in modal
    loadSettingsInModal() {
        const settings = JSON.parse(localStorage.getItem('procleanSettings') || '{}');
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = settings.theme === 'dark';
        }
        
        // Printer settings
        const printerScaling = document.getElementById('printerScaling');
        if (printerScaling && settings.printerScaling) {
            printerScaling.value = settings.printerScaling;
        }
        
        const copiesNumber = document.getElementById('copiesNumber');
        if (copiesNumber && settings.copies) {
            copiesNumber.value = settings.copies;
        }
        
        // Auto-save toggle
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            autoSaveToggle.checked = settings.autoSave !== false;
        }

        // Update system status
        this.updateSystemStatus();
    }

    // Update system status indicators
    updateSystemStatus() {
        // Database connection status
        const dbStatus = document.getElementById('dbConnectionStatus');
        if (dbStatus) {
            if (DatabaseManager.isReady()) {
                dbStatus.textContent = 'Bağlı';
                dbStatus.className = 'status-indicator connected';
            } else {
                dbStatus.textContent = 'Bağlantı Yok';
                dbStatus.className = 'status-indicator disconnected';
            }
        }

        // Printer status
        const printerStatus = document.getElementById('printerConnectionStatus');
        if (printerStatus) {
            if (PrinterManager.isConnected) {
                printerStatus.textContent = 'Bağlı';
                printerStatus.className = 'status-indicator connected';
            } else {
                printerStatus.textContent = 'Bağlantı Yok';
                printerStatus.className = 'status-indicator disconnected';
            }
        }
    }

    // Show quantity modal
    showQuantityModal(title, onConfirm, defaultValue = 1) {
        const modal = document.getElementById('quantityModal');
        if (!modal) {
            console.error('Quantity modal not found');
            return;
        }

        const titleElement = document.getElementById('quantityModalTitle');
        const input = document.getElementById('quantityInput');
        const confirmBtn = document.getElementById('confirmQuantity');
        const cancelBtn = document.getElementById('cancelQuantity');

        if (titleElement) titleElement.textContent = title;
        if (input) {
            input.value = defaultValue;
            input.focus();
            input.select();
        }

        // Remove existing event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Add new event listeners
        newConfirmBtn.addEventListener('click', () => {
            const quantity = parseInt(input.value);
            if (isNaN(quantity) || quantity < 1) {
                NotificationManager.showAlert('Geçerli bir adet girin', 'error');
                return;
            }
            this.closeModal('quantityModal');
            if (onConfirm) onConfirm(quantity);
        });

        newCancelBtn.addEventListener('click', () => {
            this.closeModal('quantityModal');
        });

        // Handle enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                newConfirmBtn.click();
            }
        });

        this.showModal('quantityModal');
    }

    // Show customer edit modal
    showCustomerEditModal(customer) {
        const modalHTML = `
            <div id="customerEditModal" class="modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Müşteri Düzenle</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="customerEditForm">
                        <div class="form-group">
                            <label for="editCustomerName">Müşteri Adı *</label>
                            <input type="text" id="editCustomerName" value="${customer.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editCustomerCode">Müşteri Kodu *</label>
                            <input type="text" id="editCustomerCode" value="${customer.code}" required>
                        </div>
                        <div class="form-group">
                            <label for="editCustomerEmail">E-posta</label>
                            <input type="email" id="editCustomerEmail" value="${customer.email || ''}">
                        </div>
                        <div class="form-group">
                            <label for="editCustomerPhone">Telefon</label>
                            <input type="tel" id="editCustomerPhone" value="${customer.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label for="editCustomerAddress">Adres</label>
                            <textarea id="editCustomerAddress" rows="3">${customer.address || ''}</textarea>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" class="btn btn-secondary" onclick="ModalManager.closeModal('customerEditModal')">İptal</button>
                            <button type="submit" class="btn btn-primary">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('customerEditModal');
        if (existingModal) existingModal.remove();

        // Add to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form handler
        const form = document.getElementById('customerEditForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updates = {
                name: document.getElementById('editCustomerName').value.trim(),
                code: document.getElementById('editCustomerCode').value.trim(),
                email: document.getElementById('editCustomerEmail').value.trim(),
                phone: document.getElementById('editCustomerPhone').value.trim(),
                address: document.getElementById('editCustomerAddress').value.trim()
            };

            try {
                await CustomerManager.updateCustomer(customer.id, updates);
                this.closeModal('customerEditModal');
                
                // Refresh customer lists
                await CustomerManager.populateCustomerSelect();
                await CustomerManager.populateAllCustomersList();
            } catch (error) {
                console.error('Error updating customer:', error);
            }
        });

        this.showModal('customerEditModal');
    }

    // Show package edit modal
    showPackageEditModal(pkg) {
        const modalHTML = `
            <div id="packageEditModal" class="modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Paket Düzenle</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="packageEditForm">
                        <div class="form-group">
                            <label for="editPackageProduct">Ürün Adı *</label>
                            <input type="text" id="editPackageProduct" value="${pkg.product_name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editPackageQuantity">Adet *</label>
                            <input type="number" id="editPackageQuantity" value="${pkg.quantity}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="editPackageBarcode">Barkod</label>
                            <input type="text" id="editPackageBarcode" value="${pkg.barcode}" readonly>
                        </div>
                        <div class="form-group">
                            <label for="editPackageStatus">Durum</label>
                            <select id="editPackageStatus">
                                <option value="beklemede" ${pkg.status === 'beklemede' ? 'selected' : ''}>Beklemede</option>
                                <option value="sevk-edildi" ${pkg.status === 'sevk-edildi' ? 'selected' : ''}>Sevk Edildi</option>
                            </select>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" class="btn btn-secondary" onclick="ModalManager.closeModal('packageEditModal')">İptal</button>
                            <button type="submit" class="btn btn-primary">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('packageEditModal');
        if (existingModal) existingModal.remove();

        // Add to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form handler
        const form = document.getElementById('packageEditForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updates = {
                product_name: document.getElementById('editPackageProduct').value.trim(),
                quantity: parseInt(document.getElementById('editPackageQuantity').value),
                status: document.getElementById('editPackageStatus').value
            };

            try {
                await PackageManager.updatePackage(pkg.id, updates);
                this.closeModal('packageEditModal');
            } catch (error) {
                console.error('Error updating package:', error);
            }
        });

        this.showModal('packageEditModal');
    }

    // Show stock edit modal
    showStockEditModal(item) {
        const modalHTML = `
            <div id="stockEditModal" class="modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Stok Düzenle</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="stockEditForm">
                        <div class="form-group">
                            <label for="editStockProductCode">Ürün Kodu</label>
                            <input type="text" id="editStockProductCode" value="${item.product_code || ''}">
                        </div>
                        <div class="form-group">
                            <label for="editStockProductName">Ürün Adı *</label>
                            <input type="text" id="editStockProductName" value="${item.product_name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editStockQuantity">Miktar *</label>
                            <input type="number" id="editStockQuantity" value="${item.quantity}" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="editStockMinQuantity">Minimum Miktar</label>
                            <input type="number" id="editStockMinQuantity" value="${item.min_quantity || ''}" min="0">
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" class="btn btn-secondary" onclick="ModalManager.closeModal('stockEditModal')">İptal</button>
                            <button type="submit" class="btn btn-primary">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('stockEditModal');
        if (existingModal) existingModal.remove();

        // Add to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form handler
        const form = document.getElementById('stockEditForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updates = {
                product_code: document.getElementById('editStockProductCode').value.trim(),
                product_name: document.getElementById('editStockProductName').value.trim(),
                quantity: parseInt(document.getElementById('editStockQuantity').value),
                min_quantity: parseInt(document.getElementById('editStockMinQuantity').value) || null
            };

            try {
                await StockManager.updateStock(item.id, updates);
                this.closeModal('stockEditModal');
            } catch (error) {
                console.error('Error updating stock:', error);
            }
        });

        this.showModal('stockEditModal');
    }

    // Generic show modal function
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }

        // Add to active modals
        this.activeModals.set(modalId, modal);
        this.modalStack.push(modalId);

        // Show modal
        modal.style.display = 'flex';
        
        // Add animation class if available
        if (modal.classList.contains('modal')) {
            modal.classList.add('modal-show');
        }

        // Focus first input if available
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);

        console.log(`Modal ${modalId} shown`);
    }

    // Generic close modal function
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }

        // Remove from active modals
        this.activeModals.delete(modalId);
        const stackIndex = this.modalStack.indexOf(modalId);
        if (stackIndex > -1) {
            this.modalStack.splice(stackIndex, 1);
        }

        // Hide modal
        modal.style.display = 'none';
        
        // Remove animation class
        modal.classList.remove('modal-show');

        // Remove temporary modals
        if (modalId.includes('Edit') || modalId.includes('Add')) {
            modal.remove();
        }

        console.log(`Modal ${modalId} closed`);
    }

    // Close top modal in stack
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModalId = this.modalStack[this.modalStack.length - 1];
            this.closeModal(topModalId);
        }
    }

    // Close all modals
    closeAllModals() {
        this.modalStack.forEach(modalId => {
            this.closeModal(modalId);
        });
    }

    // Check if any modal is open
    isAnyModalOpen() {
        return this.modalStack.length > 0;
    }

    // Get active modals
    getActiveModals() {
        return [...this.modalStack];
    }
}

// Create global instance
window.ModalManager = new ModalManager();
