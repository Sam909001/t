// These should be in excel-storage.js
let excelPackages = [];
let excelSyncQueue = [];
let isUsingExcel = false;



// Enhanced Excel Storage with Proper Daily Files
const ExcelStorage = {
    // Get today's date string for file naming
    getTodayDateString: function() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    },
    
    // Get current file name
    getCurrentFileName: function() {
        return `packages_${this.getTodayDateString()}.json`;
    },
    
    // Get all available daily files (last 7 days)
    getAvailableDailyFiles: function() {
        const files = [];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const fileName = `packages_${dateStr}.json`;
            const fileData = localStorage.getItem(fileName);
            
            if (fileData) {
                const packages = JSON.parse(fileData);
                files.push({
                    fileName: fileName,
                    date: dateStr,
                    displayDate: date.toLocaleDateString('tr-TR'),
                    packageCount: packages.length,
                    totalQuantity: packages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                    data: packages
                });
            }
        }
        return files;
    },
    
    // Read from today's file
    readFile: async function() {
        try {
            const fileName = this.getCurrentFileName();
            const data = localStorage.getItem(fileName);
            
            if (data) {
                console.log(`📁 Loaded data from ${fileName}`);
                const packages = JSON.parse(data);
                return packages;
            } else {
                // Create empty file for today
                const emptyData = [];
                localStorage.setItem(fileName, JSON.stringify(emptyData));
                console.log(`📁 Created new daily file: ${fileName}`);
                return emptyData;
            }
        } catch (error) {
            console.error('Excel read error:', error);
            return [];
        }
    },
    
    // Write to today's file
    writeFile: async function(data) {
        try {
            const fileName = this.getCurrentFileName();
            const enhancedData = data.map(pkg => ({
                ...pkg,
                // Ensure all necessary fields are included
                customer_name: pkg.customer_name || 'Bilinmeyen Müşteri',
                customer_code: pkg.customer_code || '',
                items_display: pkg.items ? 
                    (Array.isArray(pkg.items) ? 
                        pkg.items.map(item => `${item.name}: ${item.qty} adet`).join(', ') :
                        Object.entries(pkg.items).map(([product, quantity]) => 
                            `${product}: ${quantity} adet`
                        ).join(', ')
                    ) : 'Ürün bilgisi yok',
                export_timestamp: new Date().toISOString()
            }));
            
            localStorage.setItem(fileName, JSON.stringify(enhancedData));
            
            // Also update the current active file reference
            localStorage.setItem('excelPackages_current', fileName);
            
            console.log(`💾 Saved ${enhancedData.length} records to ${fileName}`);
            return true;
        } catch (error) {
            console.error('Excel write error:', error);
            return false;
        }
    },
    
    // Export daily file to downloadable format
    exportDailyFile: function(dateString) {
        try {
            const fileName = `packages_${dateString}.json`;
            const fileData = localStorage.getItem(fileName);
            
            if (!fileData) {
                showAlert(`${dateString} tarihli dosya bulunamadı`, 'error');
                return;
            }
            
            const packages = JSON.parse(fileData);
            
            // Convert to CSV format for better Excel compatibility
            const csvContent = this.convertToCSV(packages);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `proclean_packages_${dateString}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showAlert(`${dateString} tarihli ${packages.length} paket CSV olarak indirildi`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            showAlert('Dosya dışa aktarılırken hata oluştu', 'error');
        }
    },
    
    // Convert to CSV format - Professional version
    convertToCSV: function(data) {
        if (!data || data.length === 0) {
            return 'PAKET NO,MÜŞTERİ ADI,MÜŞTERİ KODU,ÜRÜN TİPLERİ,ÜRÜN DETAYLARI,TOPLAM ADET,DURUM,KONTEYNER,PAKETLEYEN,OLUŞTURULMA TARİHİ,GÜNCELLENME TARİHİ,İSTASYON,BARCODE\n';
        }
        
        const excelData = ProfessionalExcelExport.convertToProfessionalExcel(data);
        const headers = Object.keys(excelData[0]);
        
        const csvContent = [
            headers.join(','), // Header row
            ...excelData.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escape commas and quotes in values
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        return csvContent;
    },
    
    // Clean up old files (keep only last 7 days)
    cleanupOldFiles: function() {
        const keepDays = 7;
        const today = new Date();
        const filesToKeep = [];
        
        // Determine which files to keep
        for (let i = 0; i < keepDays; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            filesToKeep.push(`packages_${dateStr}.json`);
        }
        
        // Remove files older than 7 days
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('packages_') && key.endsWith('.json')) {
                if (!filesToKeep.includes(key)) {
                    localStorage.removeItem(key);
                    console.log(`🧹 Removed old file: ${key}`);
                }
            }
        }
    }
};

// Excel.js library (simple implementation) - Enhanced with ExcelStorage functionality
const ExcelJS = {
    readFile: async function() {
        try {
            // Use the enhanced daily file system
            return await ExcelStorage.readFile();
        } catch (error) {
            console.error('Excel read error:', error);
            return [];
        }
    },
    
    writeFile: async function(data) {
        try {
            // Use the enhanced daily file system
            return await ExcelStorage.writeFile(data);
        } catch (error) {
            console.error('Excel write error:', error);
            return false;
        }
    },
    
    // Simple XLSX format simulation
    toExcelFormat: function(packages) {
        return packages.map(pkg => ({
            id: pkg.id, // Always use the existing ID, never generate new ones
            package_no: pkg.package_no,
            customer_id: pkg.customer_id,
            customer_name: pkg.customer_name,
            customer_code: pkg.customer_code,
            items: pkg.items,
            items_display: pkg.items_display,
            total_quantity: pkg.total_quantity,
            status: pkg.status,
            packer: pkg.packer,
            created_at: pkg.created_at,
            updated_at: pkg.updated_at || new Date().toISOString(),
            workspace_id: pkg.workspace_id,
            station_name: pkg.station_name,
            source: pkg.source || 'excel' // Preserve existing source
        }));
    },
    
    fromExcelFormat: function(excelData) {
        return excelData.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        }));
    },
    
    // Add the enhanced ExcelStorage methods to ExcelJS
    getTodayDateString: ExcelStorage.getTodayDateString,
    getCurrentFileName: ExcelStorage.getCurrentFileName,
    getAvailableDailyFiles: ExcelStorage.getAvailableDailyFiles,
    exportDailyFile: ExcelStorage.exportDailyFile,
    convertToCSV: ExcelStorage.convertToCSV,
    cleanupOldFiles: ExcelStorage.cleanupOldFiles
};

// ==================== PROFESSIONAL EXCEL EXPORT - SIMPLIFIED ====================
const ProfessionalExcelExport = {
    // Convert packages to Excel-friendly format with simplified headers
    convertToProfessionalExcel: function(packages) {
        if (!packages || packages.length === 0) {
            return [];
        }

        // Define simplified professional headers
        const excelData = packages.map(pkg => {
            // Extract items information professionally - SIMPLIFIED VERSION
            let itemsInfo = 'Ürün bilgisi yok';
            let totalQuantity = pkg.total_quantity || 0;
            
            // FIXED: Better product extraction - KEEP ONLY PRODUCT NAMES
            if (pkg.items) {
                if (Array.isArray(pkg.items)) {
                    // Array format: [{name: "Product", qty: 5}]
                    // KEEP ONLY PRODUCT NAMES, remove quantities from display
                    itemsInfo = pkg.items.map(item => item.name || 'Ürün').join(', ');
                    
                    // Calculate total quantity from items array
                    if (pkg.items.length > 0 && !totalQuantity) {
                        totalQuantity = pkg.items.reduce((sum, item) => sum + (item.qty || 0), 0);
                    }
                } else if (typeof pkg.items === 'object') {
                    // Object format: {"Product1": 5, "Product2": 3}
                    // KEEP ONLY PRODUCT NAMES, remove quantities from display
                    itemsInfo = Object.keys(pkg.items).join(', ');
                    
                    // Calculate total quantity from items object
                    const itemsArray = Object.entries(pkg.items);
                    if (itemsArray.length > 0 && !totalQuantity) {
                        totalQuantity = itemsArray.reduce((sum, [_, quantity]) => sum + quantity, 0);
                    }
                }
            } else if (pkg.items_display) {
                // Fallback to items_display but extract only product names
                const productMatches = pkg.items_display.match(/([^:,]+)(?=:)/g);
                if (productMatches) {
                    itemsInfo = productMatches.map(match => match.trim()).join(', ');
                } else {
                    itemsInfo = pkg.items_display;
                }
            } else if (pkg.product) {
                // Fallback to single product field
                itemsInfo = pkg.product;
            }

            // Get customer information - KEEP ONLY CUSTOMER NAME, REMOVE ID
            const customerName = pkg.customer_name || pkg.customers?.name || 'Bilinmeyen Müşteri';
            
            // Format dates properly
            const createdDate = pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A';
            const updatedDate = pkg.updated_at ? new Date(pkg.updated_at).toLocaleDateString('tr-TR') : 'N/A';

            // SIMPLIFIED COLUMNS - Only essential fields
            return {
                'PAKET NO': pkg.package_no || 'N/A',
                'MÜŞTERİ': customerName, // ONLY CUSTOMER NAME, NO ID
                'ÜRÜNLER': itemsInfo, // ONLY PRODUCT NAMES, NO DETAILS
                'TOPLAM ADET': totalQuantity,
                'DURUM': pkg.status === 'sevk-edildi' ? 'SEVK EDİLDİ' : 'BEKLEMEDE',
                'PAKETLEYEN': pkg.packer || 'Bilinmiyor',
                'OLUŞTURULMA TARİHİ': createdDate,
                'GÜNCELLENME TARİHİ': updatedDate,
                'İSTASYON': pkg.station_name || pkg.workspace_id || 'Default'
            };
        });

        return excelData;
    },

    // Create professional Excel file with WIDER columns and proper styling
    exportToProfessionalExcel: function(packages, filename = null) {
        try {
            if (!packages || packages.length === 0) {
                showAlert('Excel için paket verisi bulunamadı', 'warning');
                return false;
            }

            const excelData = this.convertToProfessionalExcel(packages);
            
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `ProClean_Paketler_${date}_${getCurrentWorkspaceName()}.xlsx`;
            }

            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Convert data to worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // SET WIDER COLUMN WIDTHS FOR BETTER VISIBILITY
            const colWidths = [
                { wch: 60 }, // PAKET NO - WIDER
                { wch: 40 }, // MÜŞTERİ - WIDER
                { wch: 35 }, // ÜRÜNLER - MUCH WIDER for product names
                { wch: 10 }, // TOPLAM ADET
                { wch: 40 }, // DURUM
                { wch: 40 }, // PAKETLEYEN - WIDER
                { wch: 40 }, // OLUŞTURULMA TARİHİ
                { wch: 40 }, // GÜNCELLENME TARİHİ
                { wch: 5 }  // İSTASYON
            ];
            ws['!cols'] = colWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Paketler');

            // Create header style
            if (ws['!ref']) {
                const range = XLSX.utils.decode_range(ws['!ref']);
                
                // Style header row (row 0)
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: 0 };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!ws[cell_ref]) continue;
                    
                    // Make header cells bold with professional styling
                    if (!ws[cell_ref].s) {
                        ws[cell_ref].s = {};
                    }
                    ws[cell_ref].s = {
                        font: { 
                            bold: true, 
                            color: { rgb: "FFFFFF" },
                            sz: 12 // Slightly larger font
                        },
                        fill: { 
                            fgColor: { rgb: "2F75B5" } 
                        },
                        alignment: { 
                            horizontal: "center", 
                            vertical: "center",
                            wrapText: true
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "1F5B95" } },
                            left: { style: "thin", color: { rgb: "1F5B95" } },
                            bottom: { style: "thin", color: { rgb: "1F5B95" } },
                            right: { style: "thin", color: { rgb: "1F5B95" } }
                        }
                    };
                }

                // Style data rows for better readability
                for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell_address = { c: C, r: R };
                        const cell_ref = XLSX.utils.encode_cell(cell_address);
                        if (!ws[cell_ref]) continue;
                        
                        if (!ws[cell_ref].s) {
                            ws[cell_ref].s = {};
                        }
                        
                        // Set text wrapping for better visibility
                        ws[cell_ref].s.alignment = {
                            wrapText: true,
                            vertical: "top"
                        };
                        
                        // Alternate row coloring for better readability
                        if (R % 2 === 0) {
                            ws[cell_ref].s.fill = { fgColor: { rgb: "F8F9FA" } };
                        }
                        
                        // Add borders to all cells
                        ws[cell_ref].s.border = {
                            top: { style: "thin", color: { rgb: "E0E0E0" } },
                            left: { style: "thin", color: { rgb: "E0E0E0" } },
                            bottom: { style: "thin", color: { rgb: "E0E0E0" } },
                            right: { style: "thin", color: { rgb: "E0E0E0" } }
                        };
                    }
                }

                // Add auto filters
                ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
                
                // Freeze header row
                ws['!freeze'] = { x: 0, y: 1 };
            }

            // Write and download file
            XLSX.writeFile(wb, filename);
            
            showAlert(`✅ ${packages.length} paket profesyonel Excel formatında dışa aktarıldı`, 'success');
            console.log('Professional Excel exported:', packages.length, 'packages');
            
            return true;

        } catch (error) {
            console.error('Professional Excel export error:', error);
            showAlert('Excel dışa aktarım hatası: ' + error.message, 'error');
            return false;
        }
    },

    // Enhanced CSV export with simplified columns and better formatting
    exportToProfessionalCSV: function(packages, filename = null) {
        try {
            if (!packages || packages.length === 0) {
                showAlert('CSV için paket verisi bulunamadı', 'warning');
                return false;
            }

            const excelData = this.convertToProfessionalExcel(packages);
            
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `ProClean_Paketler_${date}_${getCurrentWorkspaceName()}.csv`;
            }

            // Convert to CSV with proper formatting
            const headers = Object.keys(excelData[0]);
            const csvContent = [
                headers.join(','), // Header row
                ...excelData.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        // Escape commas and quotes in values
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            // Create and download CSV file
            const blob = new Blob(['\uFEFF' + csvContent], { 
                type: 'text/csv;charset=utf-8;' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showAlert(`✅ ${packages.length} paket CSV formatında dışa aktarıldı`, 'success');
            return true;

        } catch (error) {
            console.error('Professional CSV export error:', error);
            showAlert('CSV dışa aktarım hatası: ' + error.message, 'error');
            return false;
        }
    }
};


// Excel storage initialization
async function initializeExcelStorage() {
    try {
        // Initialize daily file system
        await ExcelStorage.cleanupOldFiles(); // Clean up old files first
        await ExcelStorage.readFile(); // Ensure today's file exists
        
        // Load from current workspace using daily file system
        const packages = await ExcelJS.readFile();
        excelPackages = packages;
        
        console.log(`Excel packages loaded from daily file:`, excelPackages.length);
        
        // Sync queue'yu yükle
        const savedQueue = localStorage.getItem('excelSyncQueue');
        excelSyncQueue = savedQueue ? JSON.parse(savedQueue) : [];
        
        return excelPackages;
    } catch (error) {
        console.error('Excel storage init error:', error);
        excelPackages = [];
        return [];
    }
}

// Save package to Excel
async function saveToExcel(packageData) {
    try {
        // Enhanced package data with customer and product info
        const enhancedPackageData = {
            ...packageData,
            // Ensure customer info is included
            customer_name: packageData.customer_name || selectedCustomer?.name || 'Bilinmeyen Müşteri',
            customer_code: selectedCustomer?.code || '',
            // Ensure product/items info is properly formatted
            items: packageData.items || currentPackage.items || {},
            // Add date info for daily file management
            excel_export_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            // Convert items to readable string for Excel
            items_display: packageData.items ? 
                Object.entries(packageData.items).map(([product, quantity]) => 
                    `${product}: ${quantity} adet`
                ).join(', ') : 'Ürün bilgisi yok',
            // Add workspace info
            workspace_id: window.workspaceManager?.currentWorkspace?.id || 'default',
            station_name: window.workspaceManager?.currentWorkspace?.name || 'Default'
        };
        
        // Read current daily file
        const currentPackages = await ExcelJS.readFile();
        
        // Yeni paketi ekle veya güncelle
        const existingIndex = currentPackages.findIndex(p => p.id === enhancedPackageData.id);
        if (existingIndex >= 0) {
            currentPackages[existingIndex] = enhancedPackageData;
        } else {
            currentPackages.push(enhancedPackageData);
        }
        
        // Save to daily file
        const success = await ExcelJS.writeFile(currentPackages);
        
        if (success) {
            // Global excelPackages değişkenini güncelle
            excelPackages = currentPackages;
            console.log(`Package saved to daily file:`, enhancedPackageData.package_no);
            return true;
        }
        return false;
        
    } catch (error) {
        console.error('Save to Excel error:', error);
        return false;
    }
}

// Delete package from Excel
async function deleteFromExcel(packageId) {
    try {
        const currentPackages = await ExcelJS.readFile();
        const filteredPackages = currentPackages.filter(p => p.id !== packageId);
        
        const success = await ExcelJS.writeFile(filteredPackages);
        
        if (success) {
            excelPackages = filteredPackages;
            console.log('Package deleted from Excel daily file');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Delete from Excel error:', error);
        return false;
    }
}
