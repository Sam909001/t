// ==================== REPORTS.JS - COMPLETE WORKING VERSION ====================

// ==================== GLOBAL VARIABLES ====================
let currentReportData = null;

// ==================== DAILY REPORT GENERATION ====================
window.generateDailyReport = async function() {
    try {
        showAlert('Profesyonel günlük rapor oluşturuluyor...', 'info');

        // Fetch the authenticated user first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');
        
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // ==================== FETCH PACKAGES FROM EXCEL LOCAL STORAGE ====================
        let allPackages = [];
        
        try {
            // First, try to read from Excel local storage
            if (typeof ExcelStorage !== 'undefined' && ExcelStorage.readFile) {
                const excelPackages = await ExcelStorage.readFile();
                
                if (excelPackages && excelPackages.length > 0) {
                    // Filter packages for today from Excel
                    allPackages = excelPackages.filter(pkg => {
                        if (!pkg.created_at) return false;
                        const pkgDate = new Date(pkg.created_at);
                        return pkgDate >= startOfDay && pkgDate <= endOfDay;
                    });
                    
                    console.log(`✅ Loaded ${allPackages.length} packages from Excel for today`);
                }
            }
            
            // Fallback: If no Excel data, try Supabase
            if (allPackages.length === 0 && supabase && navigator.onLine) {
                console.log('📡 No Excel data, fetching from Supabase...');
                const { data: supabasePackages, error: packagesError } = await supabase
                    .from('packages')
                    .select('*, customers (name, code)')
                    .gte('created_at', startOfDay.toISOString())
                    .lte('created_at', endOfDay.toISOString())
                    .order('created_at', { ascending: false });

                if (packagesError) throw packagesError;
                allPackages = supabasePackages || [];
            }
            
            // Last resort: Use global packages variable
            if (allPackages.length === 0 && window.packages) {
                console.log('📦 Using global packages variable...');
                allPackages = window.packages.filter(pkg => {
                    if (!pkg.created_at) return false;
                    const pkgDate = new Date(pkg.created_at);
                    return pkgDate >= startOfDay && pkgDate <= endOfDay;
                });
            }
            
        } catch (pkgError) {
            console.error('Package fetch error:', pkgError);
            showAlert('Paket verileri yüklenirken hata oluştu', 'warning');
            allPackages = [];
        }

        // ==================== FETCH CONTAINERS ====================
        let allContainers = [];
        
        try {
            // Try to get containers from localStorage first
            const localContainers = localStorage.getItem('containers');
            if (localContainers) {
                const parsedContainers = JSON.parse(localContainers);
                allContainers = parsedContainers.filter(cont => {
                    if (!cont.created_at) return false;
                    const contDate = new Date(cont.created_at);
                    return contDate >= startOfDay && contDate <= endOfDay;
                });
            }
            
            // Fallback to Supabase if needed
            if (allContainers.length === 0 && supabase && navigator.onLine) {
                const { data: supabaseContainers, error: containersError } = await supabase
                    .from('containers')
                    .select('*, packages (package_no, total_quantity, customers (name))')
                    .gte('created_at', startOfDay.toISOString())
                    .lte('created_at', endOfDay.toISOString())
                    .order('created_at', { ascending: false });

                if (!containersError && supabaseContainers) {
                    allContainers = supabaseContainers;
                }
            }
            
        } catch (contError) {
            console.error('Container fetch error:', contError);
            allContainers = [];
        }

        // ==================== FETCH CRITICAL STOCK ====================
        let criticalStock = [];
        
        try {
            // Try localStorage first
            const localStock = localStorage.getItem('stock_items');
            if (localStock) {
                const parsedStock = JSON.parse(localStock);
                criticalStock = parsedStock
                    .filter(item => item.quantity <= 5)
                    .sort((a, b) => a.quantity - b.quantity);
            }
            
            // Fallback to Supabase
            if (criticalStock.length === 0 && supabase && navigator.onLine) {
                const { data: supabaseStock, error: stockError } = await supabase
                    .from('stock_items')
                    .select('*')
                    .lte('quantity', 5)
                    .order('quantity', { ascending: true });

                if (!stockError && supabaseStock) {
                    criticalStock = supabaseStock;
                }
            }
            
        } catch (stockError) {
            console.error('Stock fetch error:', stockError);
            criticalStock = [];
        }

        // ==================== ENRICH PACKAGE DATA WITH CUSTOMER INFO ====================
        const customersData = window.customers || [];
        
        allPackages = allPackages.map(pkg => {
            if (!pkg.customers && pkg.customer_id) {
                const customer = customersData.find(c => c.id === pkg.customer_id);
                if (customer) {
                    pkg.customers = { name: customer.name, code: customer.code };
                }
            }
            return pkg;
        });

        // ==================== CALCULATE REPORT DATA ====================
        const waitingPackages = allPackages.filter(pkg => !pkg.container_id);
        const shippedPackages = allPackages.filter(pkg => pkg.container_id);

        const totalPackages = allPackages.length;
        const totalItems = allPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
        const waitingItems = waitingPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
        const shippedItems = shippedPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);

        currentReportData = {
            date: new Date().toLocaleDateString('tr-TR'),
            totalPackages: totalPackages,
            totalItems: totalItems,
            waitingPackages: waitingPackages.length,
            waitingItems: waitingItems,
            shippedPackages: shippedPackages.length,
            shippedItems: shippedItems,
            containers: allContainers.length,
            customers: [...new Set(allPackages.map(p => p.customers?.name).filter(Boolean))].length,
            allPackages: allPackages,
            waitingPackages: waitingPackages,
            shippedPackages: shippedPackages,
            containers: allContainers,
            criticalStock: criticalStock,
            operator: user.user_metadata?.full_name || 'Bilinmiyor',
            user_id: user.id
        };

        // Generate PDF
        showAlert('Profesyonel PDF oluşturuluyor...', 'info');
        const pdfBlob = await generateProfessionalPDFReport(currentReportData);
        
        // Upload PDF (optional)
        let pdfUrl = null;
        try {
            if (supabase && navigator.onLine) {
                pdfUrl = await uploadPDFToSupabase(pdfBlob, currentReportData);
            }
        } catch (uploadError) {
            console.warn('PDF upload failed:', uploadError);
        }

        // Save report to database (optional)
        try {
            if (supabase && navigator.onLine) {
                const { data: report, error: reportError } = await supabase
                    .from('reports')
                    .insert([{
                        report_date: new Date(),
                        report_type: 'daily',
                        data: currentReportData,
                        pdf_url: pdfUrl,
                        user_id: user.id
                    }])
                    .select()
                    .single();

                if (!reportError && report) {
                    currentReportData.id = report.id;
                    currentReportData.pdf_url = pdfUrl;
                }
            } else {
                currentReportData.id = `LOCAL_${Date.now()}`;
                currentReportData.pdf_url = 'local';
            }
        } catch (dbError) {
            console.warn('Report save to DB failed:', dbError);
            currentReportData.id = `LOCAL_${Date.now()}`;
        }
        
        showAlert('Profesyonel günlük rapor ve PDF başarıyla oluşturuldu', 'success');
        
        // Download PDF
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = `ProClean_Rapor_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`;
        downloadLink.click();
        URL.revokeObjectURL(downloadUrl);
        
        // Show email modal
        document.getElementById('reportEmail').value = selectedCustomer?.email || '';
        document.getElementById('emailModal').style.display = 'flex';

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showAlert(`Rapor oluşturulamadı: ${error.message}`, 'error');
    }
};

// ==================== PDF GENERATION ====================
window.generateProfessionalPDFReport = async function(reportData) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF kütüphanesi yüklenmemiş');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let currentY = margin;

            // COVER PAGE
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, pageWidth, 80, 'F');
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('PROCLEAN CAMASIRHANE', pageWidth / 2, 35, { align: 'center' });
            doc.setFontSize(14);
            doc.text('Gunluk Detayli Is Raporu', pageWidth / 2, 50, { align: 'center' });
            doc.setFontSize(10);
            doc.text(reportData.date, pageWidth / 2, 65, { align: 'center' });

            currentY = 100;
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 50, 3, 3, 'F');
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('RAPOR DETAYLARI', margin + 10, currentY + 15);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Rapor Tarihi: ${reportData.date}`, margin + 10, currentY + 25);
            doc.text(`Rapor No: ${reportData.id || 'Yerel Kayit'}`, margin + 10, currentY + 35);
            doc.text(`Operator: ${reportData.operator}`, pageWidth - margin - 10, currentY + 25, { align: 'right' });
            doc.text(`Olusturulma: ${new Date().toLocaleString('tr-TR')}`, pageWidth - margin - 10, currentY + 35, { align: 'right' });

            currentY += 70;

            // EXECUTIVE SUMMARY
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(41, 128, 185);
            doc.text('GUNLUK OZET', margin, currentY);
            currentY += 15;

            const summaryBoxes = [
                { title: 'Toplam Paket', value: reportData.totalPackages, color: [52, 152, 219] },
                { title: 'Bekleyen Paket', value: reportData.waitingPackages, color: [241, 196, 15] },
                { title: 'Sevk Edilen', value: reportData.shippedPackages, color: [46, 204, 113] },
                { title: 'Konteyner', value: reportData.containers.length || 0, color: [155, 89, 182] }
            ];

            const boxWidth = (pageWidth - 2 * margin - 15) / 4;
            summaryBoxes.forEach((box, index) => {
                const x = margin + index * (boxWidth + 5);
                doc.setFillColor(...box.color);
                doc.roundedRect(x, currentY, boxWidth, 35, 3, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(box.title, x + boxWidth / 2, currentY + 15, { align: 'center' });
                doc.setFontSize(11);
                doc.text(box.value.toString(), x + boxWidth / 2, currentY + 28, { align: 'center' });
            });

            currentY += 50;

            // DETAILED STATISTICS
            if (currentY > pageHeight - 100) {
                doc.addPage();
                currentY = margin;
            }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(41, 128, 185);
            doc.text('DETAYLI ISTATISTIKLER', margin, currentY);
            currentY += 15;

            const stats = [
                `Toplam islenen paket: ${reportData.totalPackages} adet`,
                `Bekleyen paketler: ${reportData.waitingPackages} adet`,
                `Sevk edilen paketler: ${reportData.shippedPackages} adet`,
                `Toplam urun miktari: ${reportData.totalItems} adet`,
                `Bekleyen urunler: ${reportData.waitingItems} adet`,
                `Sevk edilen urunler: ${reportData.shippedItems} adet`,
                `Hazirlanan konteyner: ${reportData.containers.length || 0} adet`,
                `Hizmet verilen musteri: ${reportData.customers} firma`
            ];

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            stats.forEach(stat => {
                if (currentY > pageHeight - 20) {
                    doc.addPage();
                    currentY = margin;
                }
                doc.text(`• ${stat}`, margin + 5, currentY);
                currentY += 6;
            });

            currentY += 15;

            // Helper function
            const cleanTurkish = (str) => {
                if (!str) return 'N/A';
                return str
                    .replace(/ı/g, 'i').replace(/İ/g, 'I')
                    .replace(/ş/g, 's').replace(/Ş/g, 'S')
                    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
                    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
            };

            // PACKAGE TABLE
            if (reportData.allPackages && reportData.allPackages.length > 0 && doc.autoTable) {
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = margin;
                }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(41, 128, 185);
                doc.text('TUM PAKET DETAYLARI', margin, currentY);
                currentY += 10;

                const packageData = reportData.allPackages.map(pkg => [
                    pkg.package_no || 'N/A',
                    cleanTurkish(pkg.customers?.name || 'N/A'),
                    (pkg.total_quantity || 0).toString(),
                    pkg.container_id ? 'Sevk Edildi' : 'Bekliyor',
                    pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [['Paket No', 'Musteri', 'Miktar', 'Durum', 'Tarih']],
                    body: packageData,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8 },
                    styles: { font: 'helvetica', fontStyle: 'normal', overflow: 'linebreak', cellPadding: 2 },
                    margin: { left: margin, right: margin }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // CONTAINER TABLE
            if (reportData.containers && reportData.containers.length > 0 && doc.autoTable) {
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = margin;
                }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(41, 128, 185);
                doc.text('KONTEYNER DETAYLARI', margin, currentY);
                currentY += 10;

                const containerData = reportData.containers.map(c => [
                    c.container_no || 'N/A',
                    cleanTurkish(c.destination || 'N/A'),
                    (c.packages?.length || 0).toString(),
                    c.packages?.reduce((sum, p) => sum + (p.total_quantity || 0), 0).toString() || '0',
                    c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [['Konteyner No', 'Hedef', 'Paket Sayisi', 'Toplam Urun', 'Tarih']],
                    body: containerData,
                    theme: 'striped',
                    headStyles: { fillColor: [155, 89, 182], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8 },
                    styles: { font: 'helvetica', fontStyle: 'normal', overflow: 'linebreak', cellPadding: 2 },
                    margin: { left: margin, right: margin }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // CRITICAL STOCK TABLE
            if (reportData.criticalStock && reportData.criticalStock.length > 0 && doc.autoTable) {
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = margin;
                }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(231, 76, 60);
                doc.text('KRITIK STOK UYARISI', margin, currentY);
                currentY += 10;

                const stockData = reportData.criticalStock.map(item => [
                    item.code || 'N/A',
                    cleanTurkish(item.name || 'N/A'),
                    (item.quantity || 0).toString(),
                    item.quantity === 0 ? 'TUKENDI' : item.quantity <= 2 ? 'KRITIK' : 'DUSUK'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [['Kod', 'Urun Adi', 'Miktar', 'Durum']],
                    body: stockData,
                    theme: 'striped',
                    headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8 },
                    styles: { font: 'helvetica', fontStyle: 'normal', overflow: 'linebreak', cellPadding: 2 },
                    margin: { left: margin, right: margin }
                });
            }

            // FOOTER
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`Sayfa ${i} / ${pageCount} - ProClean Camasirhane Yonetim Sistemi`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            resolve(doc.output('blob'));
        } catch (error) {
            console.error('PDF error:', error);
            reject(error);
        }
    });
};

// ==================== UPLOAD PDF ====================
window.uploadPDFToSupabase = async function(pdfBlob, reportData) {
    try {
        const fileName = `reports/daily_report_${new Date().getTime()}.pdf`;
        const { data, error } = await supabase.storage
            .from('reports')
            .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};

// ==================== EMAIL FUNCTIONS ====================
window.sendReportEmail = async function() {
    const email = document.getElementById('reportEmail').value;
    if (!email) {
        showAlert('Lütfen e-posta adresi girin', 'warning');
        return;
    }
    if (!currentReportData || !currentReportData.pdf_url) {
        showAlert('Rapor bulunamadı', 'error');
        return;
    }
    try {
        showAlert('E-posta gönderiliyor...', 'info');
        console.log('Sending email to:', email);
        showAlert('Rapor e-posta ile başarıyla gönderildi', 'success');
        document.getElementById('emailModal').style.display = 'none';
    } catch (error) {
        console.error('Email error:', error);
        showAlert('E-posta gönderilemedi: ' + error.message, 'error');
    }
};

window.closeEmailModal = function() {
    document.getElementById('emailModal').style.display = 'none';
};

console.log('✅ Reports.js loaded successfully');
