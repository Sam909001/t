// Assume monitorId is assigned dynamically per window
const monitorId = window.monitorId || 0;
const pageSize = 20;
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
        elements.shippingFolders.innerHTML = '';

        const filter = elements.shippingFilter?.value || 'all';

        // Fetch containers for this monitor via IPC
        const containers = await window.api.fetchContainers(monitorId, filter, page, pageSize);

        if (!containers || containers.length === 0) {
            elements.shippingFolders.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Sevkiyat verisi yok</p>';
            return;
        }

        // Fetch packages for these containers
        const containerIds = containers.map(c => c.id);
        const packagesData = await window.api.fetchPackagesForContainers(containerIds);

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

        // Optional: render pagination
        const totalCount = await window.api.getContainersCount(monitorId, filter);
        renderPagination(totalCount, page);

    } catch (err) {
        console.error('Error populating shipping table:', err);
        showAlert('Sevkiyat tablosu yükleme hatası', 'error');
    } finally {
        isShippingTableLoading = false;
    }
}




const pageSize = 20; // Example, adjust if needed
let currentPage = 0;

// ---------------- 1️⃣ Pagination ----------------
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









async function populateCustomers() {
    const monitorId = window.monitorId; // assign per window
    try {
        const customers = await window.api.fetchCustomers(monitorId);

        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) return;

        customerSelect.innerHTML = '<option value="">Müşteri Seç</option>';

        // Deduplicate by customer code
        const uniqueCustomers = {};
        customers.forEach(cust => {
            if (!uniqueCustomers[cust.code]) uniqueCustomers[cust.code] = cust;
        });

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





let personnelLoaded = false;

async function populatePersonnel() {
    if (personnelLoaded) return;
    personnelLoaded = true;

    const monitorId = window.monitorId;
    const personnelSelect = document.getElementById('personnelSelect');
    if (!personnelSelect) return;

    personnelSelect.innerHTML = '<option value="">Personel seçin...</option>';

    try {
        const personnel = await window.api.fetchPersonnel(monitorId);

        personnel.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            personnelSelect.appendChild(option);
        });

    } catch (err) {
        console.error('populatePersonnel error:', err);
        showAlert('Personel dropdown yükleme hatası', 'error');
    }
}








let packagesTableLoading = false;

async function populatePackagesTable() {
    if (packagesTableLoading) return;
    packagesTableLoading = true;

    const monitorId = window.monitorId;

    try {
        const tableBody = elements.packagesTableBody || document.getElementById('packagesTableBody');
        const totalPackagesElement = elements.totalPackages || document.getElementById('totalPackages');
        if (!tableBody) throw new Error('Package table body not found');

        tableBody.innerHTML = '';
        if (totalPackagesElement) totalPackagesElement.textContent = '0';

        const packages = await window.api.fetchPackages(monitorId);

        if (!packages || packages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            tableBody.appendChild(row);
            return;
        }

        const uniquePackages = [];
        const seenIds = new Set();
        packages.forEach(pkg => {
            if (!seenIds.has(pkg.id)) {
                seenIds.add(pkg.id);
                uniquePackages.push(pkg);
            }
        });

        uniquePackages.forEach(pkg => {
            const row = document.createElement('tr');

            // Items array handling
            let itemsArray = [];
            if (pkg.items && typeof pkg.items === 'object') {
                if (Array.isArray(pkg.items)) {
                    itemsArray = pkg.items.map(it => ({ name: it.name || it, qty: it.qty || 1 }));
                } else {
                    itemsArray = Object.entries(pkg.items).map(([name, qty]) => ({ name, qty }));
                }
            } else {
                itemsArray = [{ name: pkg.product || 'Bilinmeyen Ürün', qty: 1 }];
            }
            pkg.items = itemsArray;

            const productInfo = itemsArray.map(it => `${it.name}: ${it.qty}`).join(', ');
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

        if (totalPackagesElement) totalPackagesElement.textContent = uniquePackages.length.toString();

    } catch (err) {
        console.error('populatePackagesTable error:', err);
        showAlert('Paket tablosu yükleme hatası', 'error');
    } finally {
        packagesTableLoading = false;
    }
}






async function calculateTotalQuantity(packageIds) {
    if (!packageIds || packageIds.length === 0) return 0;
    try {
        const total = await window.api.calculateTotalQuantity(packageIds);
        return total || 0;
    } catch (err) {
        console.error('calculateTotalQuantity error:', err);
        return packageIds.length; // fallback
    }
}







let currentContainerDetails = null;

async function viewContainerDetails(containerId) {
    const monitorId = window.monitorId;
    try {
        const container = await window.api.fetchContainerDetails(containerId, monitorId);
        if (!container) return showAlert('Konteyner bulunamadı', 'error');

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
                                <td>${pkg.customer_name || 'N/A'}</td>
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

    } catch (err) {
        console.error('viewContainerDetails error:', err);
        showAlert('Konteyner detayları yüklenirken hata oluştu', 'error');
    }
}





async function shipContainerFromModal() {
    if (currentContainerDetails) {
        const monitorId = window.monitorId;
        try {
            await window.electronAPI.shipContainer(currentContainerDetails.container_no, monitorId);
            closeContainerDetailModal();
        } catch (err) {
            console.error('Ship container error:', err);
            showAlert('Konteyner sevki başarısız', 'error');
        }
    }
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
        const monitorId = window.monitorId;
        await window.electronAPI.updateStockItem(code, newQuantity, monitorId);

        quantitySpan.textContent = newQuantity;
        quantitySpan.style.display = 'block';
        quantityInput.style.display = 'none';
        editButton.style.display = 'block';
        editButtons.style.display = 'none';

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
    } catch (err) {
        console.error('Stock update error:', err);
        showAlert('Stok güncellenirken hata oluştu', 'error');
    }
}

// ---------------- 5️⃣ Process barcode ----------------
async function processBarcode() {
    const barcode = elements.barcodeInput?.value.trim();
    if (!barcode) return showAlert('Barkod girin', 'error');
    if (!selectedCustomer) return showAlert('Önce müşteri seçin', 'error');

    const barcodeData = {
        barcode,
        customer_id: selectedCustomer.id,
        scanned_at: new Date().toISOString(),
        processed: false
    };

    try {
        const monitorId = window.monitorId;
        await window.electronAPI.insertBarcode(barcodeData, monitorId);

        scannedBarcodes.push({ ...barcodeData, id: Date.now() });
        showAlert(`Barkod kaydedildi: ${barcode}`, 'success');
        elements.barcodeInput.value = '';
        elements.barcodeInput.focus();
        displayScannedBarcodes();
    } catch (err) {
        console.error('Barcode process error:', err);
        showAlert('Barkod işlenirken hata oluştu', 'error');
    }
}

// ---------------- 6️⃣ Show customers ----------------
async function showCustomers() {
    try {
        const monitorId = window.monitorId;
        const customers = await window.electronAPI.fetchCustomers(monitorId);

        elements.customerList.innerHTML = '';
        customers.forEach(c => {
            const div = document.createElement('div');
            div.className = 'customer-item';
            div.innerHTML = `<div><strong>${c.name}</strong><br><small>${c.code}</small></div>`;
            div.onclick = () => selectCustomerFromModal(c);
            elements.customerList.appendChild(div);
        });

        document.getElementById('customerModal').style.display = 'flex';
    } catch (err) {
        console.error('Show customers error:', err);
        showAlert('Müşteri listesi yüklenemedi', 'error');
    }
}

// ---------------- 7️⃣ Show all customers ----------------
async function showAllCustomers() {
    try {
        const monitorId = window.monitorId;
        const customers = await window.electronAPI.fetchCustomers(monitorId);

        elements.allCustomersList.innerHTML = '';
        customers.forEach(c => {
            const div = document.createElement('div');
            div.className = 'customer-item';
            div.innerHTML = `
                <div><strong>${c.name}</strong> (${c.code})<br><small>${c.email || 'E-posta yok'}</small></div>
                <button onclick="deleteCustomer('${c.id}')" class="btn btn-danger btn-sm">Sil</button>
            `;
            elements.allCustomersList.appendChild(div);
        });

        document.getElementById('allCustomersModal').style.display = 'flex';
    } catch (err) {
        console.error('Show all customers error:', err);
        showAlert('Müşteri yönetimi yüklenemedi', 'error');
    }
}

// ---------------- 8️⃣ Add new customer ----------------
async function addNewCustomer() {
    const code = document.getElementById('newCustomerCode').value.trim();
    const name = document.getElementById('newCustomerName').value.trim();
    const email = document.getElementById('newCustomerEmail').value.trim();

    if (!validateForm([
        { id: 'newCustomerCode', required: true },
        { id: 'newCustomerName', required: true }
    ])) return;

    try {
        const monitorId = window.monitorId;
        await window.electronAPI.insertCustomer({ code, name, email }, monitorId);

        showAlert('Müşteri başarıyla eklendi', 'success');
        document.getElementById('newCustomerCode').value = '';
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerEmail').value = '';

        await populateCustomers();
        await showAllCustomers();
    } catch (err) {
        console.error('Add customer error:', err);
        showAlert('Müşteri ekleme hatası', 'error');
    }
}

// ---------------- 9️⃣ Delete customer ----------------
async function deleteCustomer(customerId) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    try {
        const monitorId = window.monitorId;
        await window.electronAPI.deleteCustomer(customerId, monitorId);

        showAlert('Müşteri başarıyla silindi', 'success');
        await populateCustomers();
        await showAllCustomers();
    } catch (err) {
        console.error('Delete customer error:', err);
        showAlert('Müşteri silme hatası', 'error');
    }
}

// ---------------- 🔟 Complete package ----------------
async function completePackage() {
    if (!selectedCustomer) return showAlert('Önce müşteri seçin', 'error');
    if (!currentPackage.items || Object.keys(currentPackage.items).length === 0)
        return showAlert('Pakete ürün ekleyin', 'error');

    try {
        const monitorId = window.monitorId;
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

        await window.electronAPI.insertPackage(packageData, monitorId);

        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => badge.textContent = '0');
        scannedBarcodes = [];
        displayScannedBarcodes();
        await populatePackagesTable();
    } catch (err) {
        console.error('Complete package error:', err);
        showAlert('Paket oluşturma hatası', 'error');
    }
}




// ==============================
// Package & Shipping - SQLite & Monitor Isolated
// ==============================

// ---------------- 1️⃣ Delete selected packages ----------------
async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
        return;
    }

    if (!confirm(`${checkboxes.length} paketi silmek istediğinize emin misiniz?`)) return;

    try {
        const packageIds = Array.from(checkboxes).map(cb => cb.value);
        const monitorId = window.monitorId;

        await window.electronAPI.deletePackages(packageIds, monitorId);

        showAlert(`${packageIds.length} paket silindi`, 'success');
        await populatePackagesTable();
    } catch (err) {
        console.error('Delete selected packages error:', err);
        showAlert('Paket silme hatası', 'error');
    }
}

// ---------------- 2️⃣ Send selected packages to ramp / ship ----------------
async function sendToRamp(containerNo = null) {
    try {
        const selectedPackages = Array.from(document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        if (selectedPackages.length === 0) {
            showAlert('Sevk etmek için paket seçin', 'error');
            return;
        }

        const monitorId = window.monitorId;
        let containerId;

        if (containerNo && currentContainer) {
            containerId = currentContainer;
        } else {
            containerNo = `CONT-${Date.now().toString().slice(-6)}`;
            
            containerId = await window.electronAPI.createContainer({
                container_no: containerNo,
                customer: selectedCustomer?.name || '',
                package_count: selectedPackages.length,
                total_quantity: await window.electronAPI.calculateTotalQuantity(selectedPackages),
                status: 'sevk-edildi',
                created_at: new Date().toISOString()
            }, monitorId);

            currentContainer = containerNo;
            elements.containerNumber.textContent = containerNo;
            saveAppState();
        }

        // Update packages to sevk-edildi
        await window.electronAPI.updatePackagesStatus(selectedPackages, containerId, 'sevk-edildi', monitorId);

        showAlert(`${selectedPackages.length} paket doğrudan sevk edildi (Konteyner: ${containerNo}) ✅`, 'success');
        await populatePackagesTable();
        await populateShippingTable();
    } catch (err) {
        console.error('Send to ramp error:', err);
        showAlert('Paketler sevk edilirken hata oluştu: ' + err.message, 'error');
    }
}

// ---------------- 3️⃣ Ship container ----------------
async function shipContainer(containerNo) {
    try {
        const monitorId = window.monitorId;

        const containerId = await window.electronAPI.getContainerIdByNo(containerNo, monitorId);

        await window.electronAPI.updateContainerStatus(containerId, 'sevk-edildi', monitorId);

        showAlert(`Konteyner ${containerNo} sevk edildi`, 'success');
        await populateShippingTable();
    } catch (err) {
        console.error('Ship container error:', err);
        showAlert('Konteyner sevk edilirken hata oluştu: ' + err.message, 'error');
    }
}

// ---------------- 4️⃣ Filter shipping (reload table) ----------------
function filterShipping() {
    populateShippingTable();
}





