// Stok şablonu indirme
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




        
        // Stokları dışa aktarma
        function exportStock() {
            try {
                const stockData = [];
                const rows = elements.stockTableBody.querySelectorAll('tr');
                
                rows.forEach(row => {
                    if (row.style.display !== 'none') {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 6) {
                            stockData.push({
                                'Stok Kodu': cells[0].textContent,
                                'Ürün Adı': cells[1].textContent,
                                'Mevcut Adet': cells[2].textContent,
                                'Birim': cells[3].textContent,
                                'Durum': cells[4].textContent,
                                'Son Güncelleme': cells[5].textContent
                            });
                        }
                    }
                });
                
                if (stockData.length === 0) {
                    showAlert('Dışa aktarılacak stok verisi yok', 'warning');
                    return;
                }
                
                // Create worksheet
                const ws = XLSX.utils.json_to_sheet(stockData);
                
                // Create workbook
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Stok Listesi');
                
                // Download
                const date = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(wb, `stok_listesi_${date}.xlsx`);
                showAlert('Stok listesi dışa aktarıldı', 'success');
                
            } catch (error) {
                console.error('Error exporting stock:', error);
                showAlert('Stok listesi dışa aktarılırken hata oluştu', 'error');
            }
        }



        
        async function uploadStockFile() {
            const fileInput = document.getElementById('stockFileUpload');
            const file = fileInput.files[0];
            if (!file) {
                showAlert('Lütfen bir dosya seçin', 'error');
                return;
            }

            // Dosya tipi doğrulama
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
                document.getElementById('fileError').textContent = 'Sadece Excel v CSV dosyaları yükleyebilirsiniz';
                document.getElementById('fileError').style.display = 'block';
                return;
            }

            showAlert('Dosya yükleniyor...', 'warning');

            try {
                let stockData = [];
                
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
                
                for (const item of stockData) {
                    const code = item['Stok Kodu'] || item['code'] || item['StokKodu'] || '';
                    const name = item['Ürün Adı'] || item['name'] || item['ÜrünAdı'] || item['product'] || '';
                    const quantity = parseInt(item['Mevcut Adet'] || item['quantity'] || item['MevcutAdet'] || 0);
                    const unit = item['Birim'] || item['unit'] || 'Adet';
                    
                    if (!code || !name) {
                        errorCount++;
                        continue;
                    }

                    try {
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
                            errorCount++;
                        } else {
                            successCount++;
                        }
                    } catch (e) {
                        errorCount++;
                    }
                }

                showAlert(`${successCount} stok öğesi güncellendi, ${errorCount} hata`, successCount > 0 ? 'success' : 'error');
                document.getElementById('selectedFileName').textContent = '';
                fileInput.value = '';
                
                await populateStockTable();
                
            } catch (error) {
                console.error('Error uploading stock file:', error);
                showAlert('Dosya yüklenirken hata oluştu', 'error');
            }
        }




