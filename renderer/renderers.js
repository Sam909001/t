const db = require('./db'); /// your local database module

// =========================
// Electron Direct Printing
// =========================

// Grab the print button and barcode input
// renderer.js

const barcodeInput = document.getElementById('barcodeInput');
const barcodeSearchBtn = document.getElementById('barcodeSearchBtn');
const printBtn = document.getElementById('printBarcodeBtn');
const barcodeArea = document.getElementById('barcode-area');

// ---------------- Process Barcode ----------------
function processBarcode() {
    const value = barcodeInput.value.trim();
    if (!value) return;

    // Clear previous content
    barcodeArea.innerHTML = '';

    // Generate barcode using JsBarcode
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, { format: "CODE128", width: 2, height: 50 });
    barcodeArea.appendChild(svg);

    // Optional: auto-print on scan
    window.electronAPI.printBarcode(`
        <html>
            <head><title>Barcode</title></head>
            <body>${barcodeArea.outerHTML}</body>
        </html>
    `);

    // Clear input
    barcodeInput.value = '';
}

// ---------------- Event listeners ----------------
barcodeSearchBtn.addEventListener('click', processBarcode);

barcodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processBarcode();
});

printBtn.addEventListener('click', async () => {
    if (!barcodeArea.innerHTML) {
        alert('Barkod yok!');
        return;
    }

    // Show loading state
    const originalText = printBtn.innerHTML;
    printBtn.disabled = true;
    printBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yazdırılıyor...';

    try {
        // Create a clean HTML for printing
        const printHTML = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Barkod Etiketi</title>
                    <style>
                        @media print {
                            body { 
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            svg { 
                                display: block !important;
                                margin: 0 auto !important;
                                max-width: 100% !important;
                                height: auto !important;
                            }
                        }
                        body { 
                            margin: 0;
                            padding: 10mm;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                        }
                    </style>
                </head>
                <body>
                    ${barcodeArea.innerHTML}
                </body>
            </html>
        `;

        console.log('Starting print process...');
        const success = await window.electronAPI.printBarcode(printHTML);
        
        if (success) {
            console.log('Print completed successfully');
        } else {
            alert('Yazdırma başarısız oldu! Yazıcıyı kontrol edin.');
        }
        
    } catch (error) {
        console.error('Print error:', error);
        alert('Yazdırma hatası: ' + error.message);
    } finally {
        // Reset button state
        printBtn.disabled = false;
        printBtn.innerHTML = originalText;
    }
});





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






let isStockTableLoading = false;
let lastStockFetchTime = 0;

async function populateStockTable() {
    if (isStockTableLoading) return;

    const now = Date.now();
    if (now - lastStockFetchTime < 500) {
        setTimeout(populateStockTable, 500);
        return;
    }
    isStockTableLoading = true;
    lastStockFetchTime = now;

    const monitorId = window.monitorId;

    try {
        elements.stockTableBody.innerHTML = '';
        const stockItems = await window.api.fetchStockItems(monitorId);

        if (!stockItems || stockItems.length === 0) {
            elements.stockTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">Stok verisi yok</td></tr>';
            return;
        }

        const uniqueStockItems = [];
        const seenCodes = new Set();

        stockItems.forEach(item => {
            if (!seenCodes.has(item.code)) {
                seenCodes.add(item.code);
                uniqueStockItems.push(item);

                const row = document.createElement('tr');

                let statusClass = 'status-stokta';
                let statusText = 'Stokta';
                if (item.quantity <= 0) { statusClass = 'status-kritik'; statusText = 'Kritik'; }
                else if (item.quantity < 10) { statusClass = 'status-az-stok'; statusText = 'Az Stok'; }

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
            }
        });

    } catch (err) {
        console.error('populateStockTable error:', err);
        showAlert('Stok tablosu yükleme hatası', 'error');
    } finally {
        isStockTableLoading = false;
    }
}







