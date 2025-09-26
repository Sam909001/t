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
