// Package operations
function openQuantityModal(product) {
    selectedProduct = product;
    elements.quantityModalTitle.textContent = `${product} - Adet Girin`;
    elements.quantityInput.value = '';
    document.getElementById('quantityError').style.display = 'none';
    elements.quantityModal.style.display = 'flex';
    elements.quantityInput.focus();
}

function confirmQuantity() {
    const quantity = parseInt(elements.quantityInput.value);
    
    // Doğrulama
    if (!quantity || quantity <= 0) {
        document.getElementById('quantityError').style.display = 'block';
        return;
    }

    // Update quantity badge
    const badge = document.getElementById(`${selectedProduct}-quantity`);
    if (badge) {
        const currentQuantity = parseInt(badge.textContent) || 0;
        badge.textContent = currentQuantity + quantity;
    }

    // Add to current package
    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[selectedProduct] = (currentPackage.items[selectedProduct] || 0) + quantity;

    showAlert(`${selectedProduct}: ${quantity} adet eklendi`, 'success');
    closeQuantityModal();
}

function openManualEntry() {
    document.getElementById('manualModal').style.display = 'flex';
    document.getElementById('manualProduct').focus();
}

function addManualProduct() {
    const product = document.getElementById('manualProduct').value.trim();
    const quantity = parseInt(document.getElementById('manualQuantity').value);

    // Form doğrulama
    if (!validateForm([
        { id: 'manualProduct', errorId: 'manualProductError', type: 'text', required: true },
        { id: 'manualQuantity', errorId: 'manualQuantityError', type: 'number', required: true }
    ])) {
        return;
    }

    // Add to current package
    if (!currentPackage.items) currentPackage.items = {};
    currentPackage.items[product] = (currentPackage.items[product] || 0) + quantity;

    showAlert(`${product}: ${quantity} adet eklendi`, 'success');
    
    // Clear form
    document.getElementById('manualProduct').value = '';
    document.getElementById('manualQuantity').value = '';
    closeManualModal();
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
            package_no: packageNo,
            customer_id: selectedCustomer.id,
            items: currentPackage.items,
            total_quantity: totalQuantity,
            status: 'beklemede',
            packer: selectedPersonnel || currentUser?.name || 'Bilinmeyen',
            created_at: new Date().toISOString()
        };

        if (!navigator.onLine) {
            // Çevrimdışı mod
            saveOfflineData('packages', packageData);
            showAlert(`Paket çevrimdışı oluşturuldu: ${packageNo}`, 'warning');
        } else {
            // Çevrimiçi mod
            const { data, error } = await supabase
                .from('packages')
                .insert([packageData])
                .select();

            if (error) {
                console.error('Error creating package:', error);
                showAlert('Paket oluşturulurken hata: ' + error.message, 'error');
                return;
            }

            showAlert(`Paket oluşturuldu: ${packageNo}`, 'success');
        }

        // Reset current package and quantities
        currentPackage = {};
        document.querySelectorAll('.quantity-badge').forEach(badge => {
            badge.textContent = '0';
        });
        
        // Taranan barkodları işlendi olarak işaretle
        if (scannedBarcodes.length > 0 && navigator.onLine) {
            const barcodeIds = scannedBarcodes.filter(b => b.id && !b.id.startsWith('offline-')).map(b => b.id);
            if (barcodeIds.length > 0) {
                await supabase
                    .from('barcodes')
                    .update({ processed: true })
                    .in('id', barcodeIds);
            }
            scannedBarcodes = [];
            displayScannedBarcodes();
        }
        
        // Refresh packages table
        await populatePackagesTable();
        
    } catch (error) {
        console.error('Error in completePackage:', error);
        showAlert('Paket oluşturma hatası', 'error');
    }
}

async function populatePackagesTable() {
    try {
        elements.packagesTableBody.innerHTML = '';
        
        const { data: packages, error } = await supabase
            .from('packages')
            .select(`
                *,
                customers (name, code)
            `)
            .is('container_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading packages:', error);
            showAlert('Paket verileri yüklenemedi', 'error');
            return;
        }

        if (packages && packages.length > 0) {
            packages.forEach(pkg => {
                const row = document.createElement('tr');
                
                // Format product information
                let productInfo = '';
                if (pkg.items && typeof pkg.items === 'object') {
                    productInfo = Object.entries(pkg.items)
                        .map(([product, quantity]) => `${product}: ${quantity}`)
                        .join(', ');
                }
                
                // Paket verilerini data attribute olarak sakla
                row.innerHTML = `
                    <td><input type="checkbox" value="${pkg.id}" data-package='${JSON.stringify(pkg).replace(/'/g, "&apos;")}' onchange="updatePackageSelection()"></td>
                    <td>${pkg.package_no}</td>
                    <td>${pkg.customers?.name || 'N/A'}</td>
                    <td>${productInfo || 'N/A'}</td>
                    <td>${new Date(pkg.created_at).toLocaleDateString('tr-TR')}</td>
                    <td><span class="status-${pkg.status}">${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</span></td>
                `;
                row.onclick = (e) => {
                    if (e.target.type !== 'checkbox') {
                        selectPackage(pkg);
                    }
                };
                elements.packagesTableBody.appendChild(row);
            });
            
            elements.totalPackages.textContent = packages.length;
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align:center; color:#666;">Henüz paket yok</td>';
            elements.packagesTableBody.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error in populatePackagesTable:', error);
        showAlert('Paket tablosu yükleme hatası', 'error');
    }
}

function selectPackage(pkg) {
    // Remove selected class from all rows
    document.querySelectorAll('#packagesTableBody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
    // Add selected class to the clicked row
    const rows = document.querySelectorAll('#packagesTableBody tr');
    for (let i = 0; i < rows.length; i++) {
        const checkbox = rows[i].querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.value === pkg.id) {
            rows[i].classList.add('selected'); // FIXED: removed extra "class."
            break;
        }
    }
    
    const detailContent = document.getElementById('packageDetailContent');
    if (detailContent) {
        detailContent.innerHTML = `
            <h4>Paket: ${pkg.package_no}</h4>
            <p><strong>Müşteri:</strong> ${pkg.customers?.name || 'N/A'}</p>
            <p><strong>Toplam Adet:</strong> ${pkg.total_quantity}</p>
            <p><strong>Tarih:</strong> ${new Date(pkg.created_at).toLocaleDateString('tr-TR')}</p>
            <p><strong>Durum:</strong> ${pkg.status === 'beklemede' ? 'Beklemede' : 'Sevk Edildi'}</p>
            ${pkg.items ? `
                <h5>Ürünler:</h5>
                <ul>
                    ${Object.entries(pkg.items).map(([product, quantity]) => 
                        `<li>${escapeHtml(product)}: ${quantity} adet</li>`
                    ).join('')}
                </ul>
            ` : ''}
        `;
    }
}

function getSelectedPackage() {
    const selectedRow = document.querySelector('#packagesTableBody tr.selected');
    if (!selectedRow) return null;
    
    const packageId = selectedRow.querySelector('input[type="checkbox"]').value;
    
    return {
        id: packageId,
        package_no: selectedRow.cells[1].textContent,
        customers: { name: selectedRow.cells[2].textContent },
        total_quantity: selectedRow.cells[3].textContent.trim(), // now as text
        created_at: selectedRow.cells[4].textContent
    };
}

async function deleteSelectedPackages() {
    const checkboxes = document.querySelectorAll('#packagesTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showAlert('Silinecek paket seçin', 'error');
    }
}
