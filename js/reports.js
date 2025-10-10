async function generateDailyReport() {
    try {
        showAlert('Profesyonel günlük rapor oluşturuluyor...', 'info');

        // Fetch the authenticated user first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');
        
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch ALL packages (both waiting and shipped) for the day
        const { data: allPackages, error: packagesError } = await supabase
            .from('packages')
            .select('*, customers (name, code)')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: false });

        // Fetch ALL containers for the day
        const { data: allContainers, error: containersError } = await supabase
            .from('containers')
            .select('*, packages (package_no, total_quantity, customers (name))')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: false });

        // Fetch critical stock
        const { data: criticalStock, error: stockError } = await supabase
            .from('stock_items')
            .select('*')
            .lte('quantity', 5)
            .order('quantity', { ascending: true });

        // Handle errors
        if (packagesError) throw new Error(`Paket verileri alınamadı: ${packagesError.message}`);
        if (containersError) throw new Error(`Konteyner verileri alınamadı: ${containersError.message}`);
        if (stockError) throw new Error(`Stok verileri alınamadı: ${stockError.message}`);

        // Separate packages by status
        const waitingPackages = allPackages.filter(pkg => !pkg.container_id);
        const shippedPackages = allPackages.filter(pkg => pkg.container_id);

        // Calculate totals
        const totalPackages = allPackages.length;
        const totalItems = allPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
        const waitingItems = waitingPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
        const shippedItems = shippedPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);

        // Prepare comprehensive report data
        currentReportData = {
            date: new Date().toLocaleDateString('tr-TR'),
            totalPackages: totalPackages,
            totalItems: totalItems,
            waitingPackages: waitingPackages.length,
            waitingItems: waitingItems,
            shippedPackages: shippedPackages.length,
            shippedItems: shippedItems,
            containers: allContainers.length,
            customers: [...new Set(allPackages.map(p => p.customers?.name))].length,
            allPackages: allPackages,
            waitingPackages: waitingPackages,
            shippedPackages: shippedPackages,
            containers: allContainers,
            criticalStock: criticalStock,
            operator: user.user_metadata?.full_name || 'Bilinmiyor',
            user_id: user.id
        };

        // Generate PDF with professional template
        showAlert('Profesyonel PDF oluşturuluyor...', 'info');
        const pdfBlob = await generateProfessionalPDFReport(currentReportData);
        const pdfUrl = await uploadPDFToSupabase(pdfBlob, currentReportData);

        // Save report to database with PDF URL
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

        if (reportError) throw new Error(`Rapor kaydedilemedi: ${reportError.message}`);

        currentReportData.id = report.id;
        currentReportData.pdf_url = pdfUrl;
        
        showAlert('Profesyonel günlük rapor ve PDF başarıyla oluşturuldu', 'success');
        
        // Show email modal with customer email if available
        document.getElementById('reportEmail').value = selectedCustomer?.email || '';
        document.getElementById('emailModal').style.display = 'flex';

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showAlert(`Rapor oluşturulamadı: ${error.message}`, 'error');
    }
}

async function generateProfessionalPDFReport(reportData) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF kütüphanesi yüklenmemiş');
            }

            const { jsPDF } = window.jspdf;
            
            // ==================== TURKISH CHARACTER FIX ====================
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

            // ==================== COVER PAGE ====================
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, pageWidth, 80, 'F');

            // Title with proper encoding
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

            // ==================== EXECUTIVE SUMMARY ====================
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(41, 128, 185);
            doc.text('GUNLUK OZET', margin, currentY);
            currentY += 15;

          const summaryBoxes = [
    { title: 'Toplam Paket', value: reportData.totalPackages, color: [52, 152, 219] },
    { title: 'Bekleyen Paket', value: reportData.waitingPackages, color: [241, 196, 15] },
    { title: 'Sevk Edilen Paket', value: reportData.shippedPackages, color: [46, 204, 113] },
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
                doc.text(box.icon, x + boxWidth / 2, currentY + 10, { align: 'center' });
                doc.text(box.title, x + boxWidth / 2, currentY + 18, { align: 'center' });

                doc.setFontSize(11);
                doc.text(box.value.toString(), x + boxWidth / 2, currentY + 28, { align: 'center' });
            });

            currentY += 50;

            // ==================== DETAILED STATISTICS ====================
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

            // ==================== PACKAGE DETAILS TABLE ====================
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

                // Clean Turkish characters for PDF compatibility
                const cleanTurkish = (str) => {
                    if (!str) return 'N/A';
                    return str
                        .replace(/ı/g, 'i')
                        .replace(/İ/g, 'I')
                        .replace(/ş/g, 's')
                        .replace(/Ş/g, 'S')
                        .replace(/ğ/g, 'g')
                        .replace(/Ğ/g, 'G')
                        .replace(/ü/g, 'u')
                        .replace(/Ü/g, 'U')
                        .replace(/ö/g, 'o')
                        .replace(/Ö/g, 'O')
                        .replace(/ç/g, 'c')
                        .replace(/Ç/g, 'C');
                };

                const packageData = reportData.allPackages.map(pkg => [
                    pkg.package_no || 'N/A',
                    cleanTurkish(pkg.customers?.name || 'N/A'),
                    (pkg.total_quantity || 0).toString(),
                    pkg.container_id ? 'Sevk Edildi' : 'Bekliyor',
                    pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [[
                        'Paket No', 
                        'Musteri', 
                        'Miktar', 
                        'Durum', 
                        'Tarih'
                    ]],
                    body: packageData,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [41, 128, 185],
                        textColor: [255, 255, 255],
                        fontSize: 9,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 8
                    },
                    styles: {
                        font: 'helvetica',
                        fontStyle: 'normal',
                        overflow: 'linebreak',
                        cellPadding: 2
                    },
                    margin: { left: margin, right: margin }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // ==================== CONTAINER DETAILS ====================
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

                const cleanTurkish = (str) => {
                    if (!str) return 'N/A';
                    return str
                        .replace(/ı/g, 'i')
                        .replace(/İ/g, 'I')
                        .replace(/ş/g, 's')
                        .replace(/Ş/g, 'S')
                        .replace(/ğ/g, 'g')
                        .replace(/Ğ/g, 'G')
                        .replace(/ü/g, 'u')
                        .replace(/Ü/g, 'U')
                        .replace(/ö/g, 'o')
                        .replace(/Ö/g, 'O')
                        .replace(/ç/g, 'c')
                        .replace(/Ç/g, 'C');
                };

                const containerData = reportData.containers.map(container => [
                    container.container_no || 'N/A',
                    cleanTurkish(container.destination || 'N/A'),
                    (container.packages?.length || 0).toString(),
                    container.packages?.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0).toString() || '0',
                    container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [[
                        'Konteyner No',
                        'Hedef',
                        'Paket Sayisi',
                        'Toplam Urun',
                        'Tarih'
                    ]],
                    body: containerData,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [155, 89, 182],
                        textColor: [255, 255, 255],
                        fontSize: 9,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 8
                    },
                    styles: {
                        font: 'helvetica',
                        fontStyle: 'normal',
                        overflow: 'linebreak',
                        cellPadding: 2
                    },
                    margin: { left: margin, right: margin }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // ==================== CRITICAL STOCK ====================
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

                const cleanTurkish = (str) => {
                    if (!str) return 'N/A';
                    return str
                        .replace(/ı/g, 'i')
                        .replace(/İ/g, 'I')
                        .replace(/ş/g, 's')
                        .replace(/Ş/g, 'S')
                        .replace(/ğ/g, 'g')
                        .replace(/Ğ/g, 'G')
                        .replace(/ü/g, 'u')
                        .replace(/Ü/g, 'U')
                        .replace(/ö/g, 'o')
                        .replace(/Ö/g, 'O')
                        .replace(/ç/g, 'c')
                        .replace(/Ç/g, 'C');
                };

                const stockData = reportData.criticalStock.map(item => [
                    item.code || 'N/A',
                    cleanTurkish(item.name || 'N/A'),
                    (item.quantity || 0).toString(),
                    item.quantity === 0 ? 'TUKENDI' : item.quantity <= 2 ? 'KRITIK' : 'DUSUK'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [[
                        'Kod',
                        'Urun Adi',
                        'Miktar',
                        'Durum'
                    ]],
                    body: stockData,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [231, 76, 60],
                        textColor: [255, 255, 255],
                        fontSize: 9,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 8
                    },
                    styles: {
                        font: 'helvetica',
                        fontStyle: 'normal',
                        overflow: 'linebreak',
                        cellPadding: 2
                    },
                    margin: { left: margin, right: margin }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // ==================== FOOTER ====================
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(
                    `Sayfa ${i} / ${pageCount} - ProClean Camasirhane Yonetim Sistemi`, 
                    pageWidth / 2, 
                    pageHeight - 10, 
                    { align: 'center' }
                );
            }

            // Convert to blob
            const pdfBlob = doc.output('blob');
            resolve(pdfBlob);

        } catch (error) {
            console.error('PDF generation error:', error);
            reject(error);
        }
    });
}


// Upload PDF to Supabase Storage
async function uploadPDFToSupabase(pdfBlob, reportData) {
    try {
        // Create a unique file name
        const fileName = `reports/daily-report-${reportData.date.replace(/\./g, '-')}-${Date.now()}.pdf`;
        
        // Convert blob to File object
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('reports') // Make sure you have a 'reports' bucket in Supabase
            .upload(fileName, pdfFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('PDF upload error:', error);
            throw new Error(`PDF yüklenemedi: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('reports')
            .getPublicUrl(fileName);

        console.log('PDF başarıyla yüklendi:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('PDF yükleme hatası:', error);
        throw error;
    }
}

// Fixed Email Sending Function with PDF Link
async function sendDailyReport() {
    const emailInput = document.getElementById('reportEmail');
    if (!emailInput) {
        showAlert('E-posta alanı bulunamadı', 'error');
        return;
    }
    
    const email = emailInput.value.trim();
    
    // Basic email validation
    if (!email) {
        showAlert('Lütfen geçerli bir e-posta adresi girin', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Lütfen geçerli bir e-posta adresi girin', 'error');
        return;
    }

    try {
        if (!currentReportData) {
            showAlert('Önce rapor oluşturmalısınız', 'error');
            return;
        }

        // Check if PDF URL exists
        if (!currentReportData.pdf_url) {
            showAlert('PDF bulunamadı. Lütfen raporu tekrar oluşturun.', 'error');
            return;
        }

        showAlert('E-posta gönderiliyor...', 'info');

        // Prepare email parameters with PDF link
        const templateParams = {
            to_email: email,
            to_name: selectedCustomer?.name || 'Müşteri',
            report_date: currentReportData.date,
            total_packages: currentReportData.totalPackages.toString(),
            total_items: currentReportData.totalItems.toString(),
            operator_name: currentReportData.operator,
            critical_stock_count: (currentReportData.criticalStock ? currentReportData.criticalStock.length : 0).toString(),
            report_id: currentReportData.id || 'N/A',
            company_name: 'ProClean Çamaşırhane',
            pdf_url: currentReportData.pdf_url
        };

        console.log('E-posta parametreleri:', templateParams);

        // Send email using EmailJS - USE YOUR ACTUAL CREDENTIALS!
        try {
            const response = await emailjs.send(
                'service_4rt2w5g',  // REPLACE WITH YOUR REAL SERVICE ID
                'template_2jf8cvh', // REPLACE WITH YOUR REAL TEMPLATE ID
                templateParams,
                'jH-KlJ2ffs_lGwfsp'  // REPLACE WITH YOUR REAL PUBLIC KEY
            );

            console.log('EmailJS response:', response);

            if (response.status === 200) {
                // Save email record to database
                try {
                    await supabase
                        .from('report_emails')
                        .insert([{
                            report_id: currentReportData.id,
                            sent_to: email,
                            sent_at: new Date().toISOString(),
                            status: 'sent',
                            delivery_method: 'link',
                            pdf_url: currentReportData.pdf_url
                        }]);
                } catch (dbError) {
                    console.warn('E-posta kaydı veritabanına eklenemedi:', dbError);
                }
                
                showAlert(`Rapor ${email} adresine başarıyla gönderildi`, 'success');
                
                // Close modal after successful send
                setTimeout(() => {
                    closeEmailModal();
                }, 2000);
                
            } else {
                throw new Error(`E-posta gönderilemedi: ${response.text}`);
            }
            
        } catch (emailError) {
            console.error('EmailJS hatası:', emailError);
            
            // Fallback: Show PDF link to user
            const pdfLink = currentReportData.pdf_url;
            const fallbackMessage = `E-posta gönderilemedi ancak PDF hazır. Linki kopyalayın: ${pdfLink}`;
            showAlert(fallbackMessage, 'warning');
            
            // Copy link to clipboard
            try {
                await navigator.clipboard.writeText(pdfLink);
                showAlert('PDF linki panoya kopyalandı', 'info');
            } catch (copyError) {
                console.error('Clipboard error:', copyError);
            }
        }
        
    } catch (error) {
        console.error('Rapor gönderme hatası:', error);
        showAlert(`Rapor gönderilemedi: ${error.message}`, 'error');
    }
}

// Function to download PDF directly
async function downloadReportPDF() {
    if (!currentReportData || !currentReportData.pdf_url) {
        showAlert('PDF bulunamadı', 'error');
        return;
    }

    try {
        // Create a temporary link to download the PDF
        const a = document.createElement('a');
        a.href = currentReportData.pdf_url;
        a.download = `proclean-rapor-${currentReportData.date}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showAlert('PDF indiriliyor...', 'success');
    } catch (error) {
        console.error('PDF indirme hatası:', error);
        showAlert('PDF indirilemedi', 'error');
    }
}

// Function to check if Supabase Storage bucket exists
async function checkStorageBucket() {
    try {
        const { data, error } = await supabase.storage.getBucket('reports');
        if (error) {
            console.log('Reports bucket does not exist, creating...');
            // Create the bucket if it doesn't exist
            const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('reports', {
                public: true, // Make files publicly accessible
                fileSizeLimit: 52428800, // 50MB limit
            });
            
            if (bucketError) {
                console.error('Bucket creation error:', bucketError);
                return false;
            }
            console.log('Reports bucket created successfully');
        }
        return true;
    } catch (error) {
        console.error('Storage bucket check error:', error);
        return false;
    }
}

// Initialize storage bucket on app start
async function initializeStorage() {
    const bucketExists = await checkStorageBucket();
    if (!bucketExists) {
        console.warn('Storage bucket could not be initialized');
    }
}

// PDF Generation Function
async function generatePDFReport(reportData) {
    return new Promise((resolve, reject) => {
        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF kütüphanesi yüklenmemiş');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set default font
           doc.setFont("Roboto", "normal");
           doc.setFont("Roboto", "bold");
            
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
                
                // Use autoTable if available, otherwise create simple table
                if (doc.autoTable) {
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
                } else {
                    // Simple table without autoTable
                    criticalStockData.forEach((row, index) => {
                        if (currentY < 280) {
                            doc.text(row.join(' | '), 20, currentY);
                            currentY += 7;
                        }
                    });
                    currentY += 10;
                }
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
                
                if (doc.autoTable) {
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
                } else {
                    packageData.forEach((row, index) => {
                        if (currentY < 280) {
                            doc.text(row.join(' | '), 20, currentY);
                            currentY += 7;
                        }
                    });
                    currentY += 10;
                }
            }
            
            // Footer
            doc.setFontSize(8);
            doc.setFont(undefined, 'italic');
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(`Sayfa ${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
                doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
            }
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            resolve(pdfBlob);
            
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            reject(new Error(`PDF oluşturulamadı: ${error.message}`));
        }
    });
}

// Simple PDF generation fallback
async function generateSimplePDFReport(reportData) {
    return new Promise((resolve, reject) => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Simple content
            doc.setFontSize(16);
            doc.text('ProClean - Günlük Rapor', 20, 20);
            
            doc.setFontSize(12);
            doc.text(`Tarih: ${reportData.date}`, 20, 35);
            doc.text(`Operatör: ${reportData.operator}`, 20, 45);
            doc.text(`Toplam Paket: ${reportData.totalPackages}`, 20, 55);
            doc.text(`Toplam Ürün: ${reportData.totalItems}`, 20, 65);
            
            const pdfBlob = doc.output('blob');
            resolve(pdfBlob);
            
        } catch (error) {
            reject(new Error('Basit PDF oluşturulamadı'));
        }
    });
}

// Preview function
async function previewReport() {
    if (!currentReportData) {
        showAlert('Önce rapor oluşturmalısınız', 'error');
        return;
    }
    
    try {
        const pdfBlob = await generatePDFReport(currentReportData);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Open in new window
        window.open(pdfUrl, '_blank');
        
        // Clean up after some time
        setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
        }, 10000);
        
    } catch (error) {
        console.error('Rapor önizleme hatası:', error);
        showAlert('Rapor önizlenemedi', 'error');
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

// Initialize EmailJS
function initializeEmailJS() {
    if (typeof emailjs !== 'undefined') {
        // Initialize with your EmailJS public key
        emailjs.init("jH-KlJ2ffs_lGwfsp"); // Your EmailJS public key
        console.log('EmailJS initialized');
    } else {
        console.warn('EmailJS not loaded');
    }
}

// Call initialization when script loads
document.addEventListener('DOMContentLoaded', function() {
    initializeEmailJS();
    initializeStorage(); // Initialize storage bucket
});
