// Excel export functionality using SheetJS
class ExcelExporter {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        console.log('Excel Exporter initialized');
        
        // Add export button to UI
        this.addExportButton();
        
        // Set up daily auto-save
        this.setupDailyAutoSave();
    }
    
    // Add export button to the UI
    addExportButton() {
        // Check if button already exists
        if (document.getElementById('exportExcelBtn')) {
            return;
        }
        
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportExcelBtn';
        exportBtn.className = 'btn btn-success excel-export-btn';
        exportBtn.innerHTML = '<i class="fas fa-file-excel"></i> Excel\'e Aktar';
        exportBtn.onclick = () => this.exportToExcel();
        
        // Try to add to settings section first
        const settingsSection = document.querySelector('.settings-section');
        if (settingsSection) {
            settingsSection.appendChild(exportBtn);
        } else {
            // Add to main UI as floating button
            document.body.appendChild(exportBtn);
            this.styleExportButton(exportBtn);
        }
        
        console.log('Excel export button added to UI');
    }
    
    // Style the floating export button
    styleExportButton(button) {
        button.style.position = 'fixed';
        button.style.bottom = '20px';
        button.style.right = '20px';
        button.style.zIndex = '10000';
        button.style.padding = '12px 20px';
        button.style.fontSize = '14px';
        button.style.fontWeight = 'bold';
        button.style.borderRadius = '25px';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        button.style.transition = 'all 0.3s ease';
        
        button.onmouseenter = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        };
        
        button.onmouseleave = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        };
    }
    
    // Main export function
    exportToExcel() {
        try {
            console.log('Starting Excel export...');
            
            // Get current date for filename
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            const timeString = today.toTimeString().split(' ')[0].replace(/:/g, '-');
            
            // Get all data
            const exportData = this.getExportData();
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Add worksheets for each data type
            this.addWorksheet(wb, 'Paketler', exportData.packages);
            this.addWorksheet(wb, 'Konteynerler', exportData.containers);
            this.addWorksheet(wb, 'Müşteriler', exportData.customers);
            this.addWorksheet(wb, 'Stok', exportData.stock);
            
            // Add summary sheet
            this.addSummarySheet(wb, exportData);
            
            // Generate filename with date and time
            const filename = `proclean_veri_${dateString}_${timeString}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, filename);
            
            console.log('Excel file created successfully:', filename);
            showAlert(`Excel dosyası oluşturuldu: ${filename}`, 'success');
            
            // Auto-backup to Supabase if available
            this.backupToSupabase();
            
        } catch (error) {
            console.error('Excel export error:', error);
            showAlert('Excel dosyası oluşturulurken hata oluştu: ' + error.message, 'error');
        }
    }
    
    // Get data for export
    getExportData() {
        const packages = JSON.parse(localStorage.getItem('packages') || '[]');
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const stock = JSON.parse(localStorage.getItem('stock') || '[]');
        
        // Transform packages data
        const transformedPackages = packages.map(pkg => ({
            'Paket ID': pkg.id,
            'Paket No': pkg.package_no,
            'Müşteri ID': pkg.customer_id,
            'Müşteri Adı': pkg.customer_name || this.getCustomerName(pkg.customer_id),
            'Ürün': pkg.product,
            'Miktar': pkg.quantity,
            'Durum': this.translateStatus(pkg.status),
            'Konteyner ID': pkg.container_id,
            'Konteyner No': pkg.container_no || this.getContainerNo(pkg.container_id),
            'Oluşturulma Tarihi': pkg.created_at ? this.formatDate(pkg.created_at) : '',
            'Güncellenme Tarihi': pkg.updated_at ? this.formatDate(pkg.updated_at) : '',
            'Personel': pkg.personnel_name || ''
        }));
        
        // Transform containers data
        const transformedContainers = containers.map(cont => ({
            'Konteyner ID': cont.id,
            'Konteyner No': cont.container_no,
            'Müşteri ID': cont.customer_id,
            'Müşteri Adı': cont.customer_name || this.getCustomerName(cont.customer_id),
            'Durum': this.translateStatus(cont.status),
            'Oluşturulma Tarihi': cont.created_at ? this.formatDate(cont.created_at) : '',
            'Paket Sayısı': packages.filter(pkg => pkg.container_id === cont.id).length
        }));
        
        // Transform customers data
        const transformedCustomers = customers.map(cust => ({
            'Müşteri ID': cust.id,
            'Müşteri Adı': cust.name,
            'Kod': cust.code,
            'İletişim': cust.contact,
            'Telefon': cust.phone,
            'Toplam Paket Sayısı': packages.filter(pkg => pkg.customer_id === cust.id).length,
            'Aktif Konteyner Sayısı': containers.filter(cont => cont.customer_id === cust.id && cont.status === 'active').length
        }));
        
        // Transform stock data
        const transformedStock = stock.map(item => ({
            'Stok Kodu': item.code,
            'Ürün Adı': item.name,
            'Miktar': item.quantity,
            'Son Güncelleme': item.last_updated ? this.formatDate(item.last_updated) : '',
            'Durum': item.quantity === 0 ? 'Tükendi' : item.quantity <= 5 ? 'Düşük Stok' : 'Stokta Var'
        }));
        
        return {
            packages: transformedPackages,
            containers: transformedContainers,
            customers: transformedCustomers,
            stock: transformedStock
        };
    }
    
    // Add worksheet to workbook
    addWorksheet(wb, sheetName, data) {
        if (data.length === 0) {
            console.warn(`No data available for sheet: ${sheetName}`);
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Auto-size columns
        const colWidths = [];
        const headers = Object.keys(data[0]);
        
        headers.forEach(header => {
            const maxLength = Math.max(
                header.length,
                ...data.map(row => String(row[header] || '').length)
            );
            colWidths.push({ wch: Math.min(Math.max(maxLength, 10), 50) });
        });
        
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        console.log(`Worksheet added: ${sheetName} with ${data.length} rows`);
    }
    
    // Add summary sheet
    addSummarySheet(wb, exportData) {
        const summaryData = [
            ['VERİ ÖZETİ', ''],
            ['Oluşturulma Tarihi', new Date().toLocaleString('tr-TR')],
            [''],
            ['VERİ TÜRÜ', 'KAYIT SAYISI'],
            ['Toplam Paket', exportData.packages.length],
            ['Toplam Konteyner', exportData.containers.length],
            ['Toplam Müşteri', exportData.customers.length],
            ['Toplam Stok Ürünü', exportData.stock.length],
            [''],
            ['PAKET DURUMLARI', ''],
            ...this.getStatusSummary(exportData.packages),
            [''],
            ['STOK DURUMU', ''],
            ...this.getStockSummary(exportData.stock)
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Style summary sheet
        if (!ws['!merges']) ws['!merges'] = [];
        
        // Merge title cells
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
        
        XLSX.utils.book_append_sheet(wb, ws, 'Özet');
    }
    
    // Get status summary for packages
    getStatusSummary(packages) {
        const statusCount = {};
        packages.forEach(pkg => {
            const status = pkg.Durum;
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        
        return Object.entries(statusCount).map(([status, count]) => [status, count]);
    }
    
    // Get stock summary
    getStockSummary(stock) {
        const totalItems = stock.length;
        const outOfStock = stock.filter(item => item.Miktar === 0).length;
        const lowStock = stock.filter(item => item.Miktar > 0 && item.Miktar <= 5).length;
        const inStock = stock.filter(item => item.Miktar > 5).length;
        
        return [
            ['Toplam Ürün Çeşidi', totalItems],
            ['Stokta Olan', inStock],
            ['Düşük Stok', lowStock],
            ['Tükenen', outOfStock]
        ];
    }
    
    // Helper functions
    getCustomerName(customerId) {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : 'Bilinmeyen Müşteri';
    }
    
    getContainerNo(containerId) {
        const containers = JSON.parse(localStorage.getItem('containers') || '[]');
        const container = containers.find(c => c.id === containerId);
        return container ? container.container_no : 'Bilinmeyen Konteyner';
    }
    
    translateStatus(status) {
        const statusMap = {
            'processed': 'İşlendi',
            'pending': 'Beklemede',
            'shipped': 'Gönderildi',
            'active': 'Aktif',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal Edildi'
        };
        
        return statusMap[status] || status;
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR');
    }
    
    // Backup to Supabase
    async backupToSupabase() {
        if (!window.supabase || !SUPABASE_ANON_KEY) {
            return;
        }
        
        try {
            // Create backup record
            const backupRecord = {
                backup_date: new Date().toISOString(),
                package_count: JSON.parse(localStorage.getItem('packages') || '[]').length,
                container_count: JSON.parse(localStorage.getItem('containers') || '[]').length,
                customer_count: JSON.parse(localStorage.getItem('customers') || '[]').length,
                stock_count: JSON.parse(localStorage.getItem('stock') || '[]').length,
                backup_type: 'excel_export'
            };
            
            const { error } = await window.supabase
                .from('backups')
                .insert([backupRecord]);
            
            if (error) throw error;
            
            console.log('Backup record created in Supabase');
        } catch (error) {
            console.error('Error creating backup record:', error);
        }
    }
    
    // Daily auto-save functionality
    setupDailyAutoSave() {
        // Check if we need to save today
        const lastSaveDate = localStorage.getItem('lastExcelSaveDate');
        const today = new Date().toDateString();
        
        if (lastSaveDate !== today) {
            // Wait 10 seconds after app load, then save
            setTimeout(() => {
                this.exportToExcel();
                localStorage.setItem('lastExcelSaveDate', today);
                console.log('Daily auto-save completed');
            }, 10000);
        }
        
        // Set up daily check (every 24 hours)
        setInterval(() => {
            const currentDate = new Date().toDateString();
            const lastSave = localStorage.getItem('lastExcelSaveDate');
            
            if (lastSave !== currentDate) {
                this.exportToExcel();
                localStorage.setItem('lastExcelSaveDate', currentDate);
            }
        }, 24 * 60 * 60 * 1000);
    }
    
    // Export specific date range
    exportDateRange(startDate, endDate) {
        try {
            const packages = JSON.parse(localStorage.getItem('packages') || '[]');
            
            // Filter packages by date range
            const filteredPackages = packages.filter(pkg => {
                const pkgDate = new Date(pkg.created_at);
                return pkgDate >= startDate && pkgDate <= endDate;
            });
            
            if (filteredPackages.length === 0) {
                showAlert('Seçilen tarih aralığında paket bulunamadı', 'warning');
                return;
            }
            
            // Create workbook with filtered data
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(
                filteredPackages.map(pkg => ({
                    'Paket ID': pkg.id,
                    'Paket No': pkg.package_no,
                    'Müşteri': pkg.customer_name,
                    'Ürün': pkg.product,
                    'Miktar': pkg.quantity,
                    'Durum': this.translateStatus(pkg.status),
                    'Konteyner': pkg.container_no,
                    'Tarih': this.formatDate(pkg.created_at)
                }))
            );
            
            XLSX.utils.book_append_sheet(wb, ws, 'Paketler');
            
            const filename = `proclean_paketler_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            showAlert(`Tarih aralığı raporu oluşturuldu: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Date range export error:', error);
            showAlert('Tarih aralığı raporu oluşturulurken hata oluştu', 'error');
        }
    }
}

// Initialize Excel exporter when DOM is ready
let excelExporter;

document.addEventListener('DOMContentLoaded', function() {
    excelExporter = new ExcelExporter();
    
    // Add global function for manual export
    window.exportToExcel = () => excelExporter.exportToExcel();
    window.exportDateRange = (start, end) => excelExporter.exportDateRange(start, end);
    
    console.log('Excel export system ready');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExcelExporter };
}
