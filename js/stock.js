// ==================== STOCK MANAGEMENT (SIMPLIFIED) ====================

// Stok şablonu indirme - KEEP THIS
function downloadTemplate() {
    // Create sample data for template
    const templateData = [
        { 'Stok Kodu': 'ÖRN001', 'Ürün Adı': 'Örnek Ürün', 'Mevcut Adet': 10, 'Birim': 'Adet' }
    ];
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Şablonu');
    
    // Download
    XLSX.writeFile(wb, 'stok_sablonu.xlsx');
    showAlert('Stok şablonu indirildi', 'success');
}

// Stokları dışa aktarma - SIMPLIFIED
async function exportStock() {
    try {
        // Use the existing getAllStock function from ui.js
        const stockData = await getAllStock();
        
        if (stockData.length === 0) {
            showAlert('Dışa aktarılacak stok verisi yok', 'warning');
            return;
        }
        
        // Format for Excel export
        const exportData = stockData.map(item => ({
            'Stok Kodu': item.code || '',
            'Ürün Adı': item.name || '',
            'Mevcut Adet': item.quantity || 0,
            'Birim': item.unit || 'Adet',
            'Durum': getStockStatus(item.quantity),
            'Son Güncelleme': new Date().toLocaleDateString('tr-TR')
        }));
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stok Listesi');
        
        // Download
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `stok_listesi_${date}.xlsx`);
        showAlert(`Stok listesi dışa aktarıldı (${stockData.length} ürün)`, 'success');
        
    } catch (error) {
        console.error('Error exporting stock:', error);
        showAlert('Stok listesi dışa aktarılırken hata oluştu', 'error');
    }
}

// Helper function for stock status
function getStockStatus(quantity) {
    if (quantity === 0) return 'Tükendi';
    if (quantity < 5) return 'Az Stok';
    if (quantity < 20) return 'Orta Stok';
    return 'Yeterli Stok';
}

// Basitleştirilmiş stok dosyası yükleme - SIMPLIFIED
async function uploadStockFile() {
    const fileInput = document.getElementById('stockFileUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Lütfen bir dosya seçin', 'error');
        return;
    }

    // Basic file validation
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
        showAlert('Sadece Excel (.xlsx, .xls) veya CSV dosyaları yükleyebilirsiniz', 'error');
        return;
    }

    showAlert('Stok dosyası işleniyor...', 'info');

    try {
        let stockData = [];
        
        // Read file based on type
        if (fileExtension === 'csv') {
            const text = await file.text();
            stockData = Papa.parse(text, { header: true }).data;
        } else {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            stockData = XLSX.utils.sheet_to_json(worksheet);
        }

        let successCount = 0;
        let errorCount = 0;
        
        // Process each stock item
        for (const item of stockData) {
            try {
                const code = item['Stok Kodu'] || item['code'] || item['StokKodu'] || '';
                const name = item['Ürün Adı'] || item['name'] || item['ÜrünAdı'] || item['product'] || '';
                const quantity = parseInt(item['Mevcut Adet'] || item['quantity'] || item['MevcutAdet'] || 0);
                const unit = item['Birim'] || item['unit'] || 'Adet';
                
                if (!code || !name) {
                    errorCount++;
                    continue;
                }

                // Save to Supabase if available
                if (supabase && navigator.onLine) {
                    const { error } = await supabase
                        .from('stock_items')
                        .upsert({
                            code: code,
                            name: name,
                            quantity: quantity,
                            unit: unit,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'code' });

                    if (error) {
                        console.error('Supabase error:', error);
                        errorCount++;
                    } else {
                        successCount++;
                    }
                } else {
                    // Save to localStorage for offline
                    const stockItems = JSON.parse(localStorage.getItem('proclean_stock') || '[]');
                    const existingIndex = stockItems.findIndex(si => si.code === code);
                    
                    if (existingIndex >= 0) {
                        stockItems[existingIndex] = { code, name, quantity, unit };
                    } else {
                        stockItems.push({ code, name, quantity, unit });
                    }
                    
                    localStorage.setItem('proclean_stock', JSON.stringify(stockItems));
                    successCount++;
                }
                
            } catch (itemError) {
                console.error('Error processing stock item:', itemError);
                errorCount++;
            }
        }

        // Show results
        if (successCount > 0) {
            showAlert(`${successCount} stok öğesi işlendi${errorCount > 0 ? `, ${errorCount} hata` : ''}`, 'success');
            
            // Refresh stock table
            if (typeof populateStockTable === 'function') {
                await populateStockTable();
            }
        } else {
            showAlert('Hiçbir stok öğesi işlenemedi', 'error');
        }
        
        // Reset file input
        fileInput.value = '';
        if (document.getElementById('selectedFileName')) {
            document.getElementById('selectedFileName').textContent = '';
        }
        
    } catch (error) {
        console.error('Error uploading stock file:', error);
        showAlert('Dosya işlenirken hata oluştu: ' + error.message, 'error');
    }
}

// Quick stock export using existing Excel preview data
function quickExportStock() {
    // Just call the existing export function
    exportStock();
}

// Check if stock functions are needed
function isStockManagementNeeded() {
    // Stock management is useful for:
    // 1. Bulk imports/exports
    // 2. Template downloads for new users
    // 3. Backup/restore functionality
    return true; // Keep these functions for utility purposes
}
