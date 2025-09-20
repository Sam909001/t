// Report operations
async function generateDailyReport() {
    try {
        showAlert('Günlük rapor oluşturuluyor...', 'info');

        // Fetch the authenticated user first
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError) throw new Error(`User fetch error: ${userError.message}`);
if (!user) throw new Error('User not authenticated');
        
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch data for the report
        const [
            { data: packages, error: packagesError },
            { data: containers, error: containersError },
            { data: criticalStock, error: stockError }
        ] = await Promise.all([
            supabase
                .from('packages')
                .select('*, customers (name, code)')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay),
            supabase
                .from('containers')
                .select('*')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay),
            supabase
                .from('stock_items')
                .select('*')
                .lte('quantity', 5)
                .order('quantity', { ascending: true })
        ]);

        // Handle errors
        if (packagesError) throw new Error(`Paket verileri alınamadı: ${packagesError.message}`);
        if (containersError) throw new Error(`Konteyner verileri alınamadı: ${containersError.message}`);
        if (stockError) throw new Error(`Stok verileri alınamadı: ${stockError.message}`);

        // Prepare report data
        currentReportData = {
            date: new Date().toLocaleDateString('tr-TR'),
            totalPackages: packages.length,
            totalItems: packages.reduce((sum, pkg) => sum + pkg.total_quantity, 0),
            containers: containers.length,
            customers: [...new Set(packages.map(p => p.customers?.name))].length,
            packages: packages,
            containers: containers,
            criticalStock: criticalStock,
            operator: user.user_metadata?.full_name || 'Bilinmiyor',
            user_id: user.id
            };

        // Save report to database
       const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert([{
        report_date: new Date(),
        report_type: 'daily',
        data: currentReportData,
        user_id: user.id
    }])
    .select()
    .single();


        if (reportError) throw new Error(`Rapor kaydedilemedi: ${reportError.message}`);

        currentReportData.id = report.id;
        
        showAlert('Günlük rapor başarıyla oluşturuldu', 'success');
        
        // Show email modal with customer email if available
        document.getElementById('reportEmail').value = selectedCustomer?.email || '';
        document.getElementById('emailModal').style.display = 'flex';

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showAlert(`Rapor oluşturulamadı: ${error.message}`, 'error');
    }
}




        
function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn('Email modal not found');
    }
}




        
// PDF Generation Function - Fixed version
async function generatePDFReport(reportData) {
    return new Promise((resolve, reject) => {
        try {
            // Use jsPDF with autotable plugin
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set default font
            doc.setFont("helvetica");
            
            // Title
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            const title = 'ProClean - Günlük İş Sonu Raporu';
            const pageWidth = doc.internal.pageSize.getWidth();
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, (pageWidth - titleWidth) / 2, 20);
            
            // Report details
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Tarih: ${reportData.date}`, 20, 35);
            doc.text(`Operatör: ${reportData.operator}`, 20, 42);
            doc.text(`Rapor ID: ${reportData.id || 'Yerel Kayıt'}`, 20, 49);
            
            // Summary section
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('ÖZET', 20, 65);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`• Toplam Paket Sayısı: ${reportData.totalPackages}`, 30, 75);
            doc.text(`• Toplam Ürün Adedi: ${reportData.totalItems}`, 30, 82);
            doc.text(`• Konteyner Sayısı: ${reportData.containers || 0}`, 30, 89);
            doc.text(`• Müşteri Sayısı: ${reportData.customers || 0}`, 30, 96);
            doc.text(`• Kritik Stok Sayısı: ${reportData.criticalStock?.length || 0}`, 30, 103);
            
            let currentY = 115;
            
            // Critical stock table if exists
            if (reportData.criticalStock && reportData.criticalStock.length > 0) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('KRİTİK STOKLAR', 20, currentY);
                currentY += 10;
                
                const criticalStockData = reportData.criticalStock.map(item => [
                    item.code || 'N/A',
                    item.name || 'N/A',
                    item.quantity?.toString() || '0'
                ]);
                
                doc.autoTable({
                    startY: currentY,
                    head: [['Stok Kodu', 'Ürün Adı', 'Mevcut Adet']],
                    body: criticalStockData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [231, 76, 60],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    styles: {
                        fontSize: 9,
                        cellPadding: 3
                    }
                });
                
                currentY = doc.lastAutoTable.finalY + 15;
            }
            
            // Package details table
            if (reportData.packages && reportData.packages.length > 0) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('PAKET DETAYLARI', 20, currentY);
                currentY += 10;
                
                const packageData = reportData.packages.map(pkg => [
                    pkg.package_no || 'N/A',
                    pkg.customers?.name || 'N/A',
                    pkg.total_quantity?.toString() || '0',
                    pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A',
                    pkg.packer || 'Bilinmiyor'
                ]);
                
                doc.autoTable({
                    startY: currentY,
                    head: [['Paket No', 'Müşteri', 'Adet', 'Tarih', 'Paketleyen']],
                    body: packageData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [52, 152, 219],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    margin: { top: 10 },
                    pageBreak: 'auto'
                });
                
                currentY = doc.lastAutoTable.finalY + 15;
            }
            
            // Container details table if exists
            if (reportData.containers && reportData.containers.length > 0) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('KONTEYNER DETAYLARI', 20, currentY);
                currentY += 10;
                
                const containerData = reportData.containers.map(container => [
                    container.container_no || 'N/A',
                    container.customer || 'N/A',
                    container.package_count?.toString() || '0',
                    container.total_quantity?.toString() || '0',
                    container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);
                
                doc.autoTable({
                    startY: currentY,
                    head: [['Konteyner No', 'Müşteri', 'Paket Sayısı', 'Toplam Adet', 'Oluşturulma Tarihi']],
                    body: containerData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [46, 204, 113],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    margin: { top: 10 }
                });
                
                currentY = doc.lastAutoTable.finalY + 15;
            }
            
            // Footer on each page
            const addFooter = (doc) => {
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'italic');
                    doc.text(`Sayfa ${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
                    doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
                }
            };
            
            // Add footer to all pages
            addFooter(doc);
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            resolve(pdfBlob);
            
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            reject(new Error(`PDF oluşturulamadı: ${error.message}`));
        }
    });
}



        

// Alternatif basit PDF oluşturma fonksiyonu (yedek)
async function generateSimplePDFReport(reportData) {
    return new Promise((resolve, reject) => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Basit başlık
            doc.setFontSize(16);
            doc.text('ProClean - Günlük Rapor', 20, 20);
            
            // Tarih ve operatör
            doc.setFontSize(12);
            doc.text(`Tarih: ${reportData.date}`, 20, 35);
            doc.text(`Operatör: ${reportData.operator}`, 20, 45);
            
            // Özet bilgiler
            doc.text('ÖZET:', 20, 60);
            doc.text(`• Toplam Paket: ${reportData.totalPackages}`, 30, 70);
            doc.text(`• Toplam Ürün: ${reportData.totalItems}`, 30, 80);
            doc.text(`• Müşteri Sayısı: ${reportData.customers || 0}`, 30, 90);
            
            // PDF'i blob olarak döndür
            const pdfBlob = doc.output('blob');
            resolve(pdfBlob);
            
        } catch (error) {
            reject(new Error('Basit PDF oluşturulamadı'));
        }
    });
}



        
// Yardımcı fonksiyon: jsPDF versiyon kontrolü
function checkJsPdfVersion() {
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF kütüphanesi yüklenmemiş');
        showAlert('PDF oluşturma kütüphanesi yüklenmemiş', 'error');
        return false;
    }
    
    // jsPDF versiyon bilgisini kontrol et
    console.log('jsPDF versiyonu:', window.jspdf.jsPDF?.version || 'Bilinmiyor');
    return true;
}




        
// PDF oluşturmadan önce versiyon kontrolü yap
async function generatePDFReportSafe(reportData) {
    if (!checkJsPdfVersion()) {
        throw new Error('PDF kütüphanesi yüklenmemiş');
    }
    
    return await generatePDFReport(reportData);
}

