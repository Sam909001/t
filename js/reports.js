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
            waitingPackagesList: waitingPackages,
            shippedPackagesList: shippedPackages,
            containersList: allContainers,
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
            
            // Create PDF with proper encoding for Turkish characters
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let currentY = margin;

            // Helper function to encode Turkish text
            function encodeTurkishText(text) {
                if (typeof text !== 'string') return String(text);
                
                // Turkish character mappings
                const turkishMap = {
                    'ğ': 'g', 'Ğ': 'G',
                    'ü': 'u', 'Ü': 'U',
                    'ş': 's', 'Ş': 'S',
                    'ı': 'i', 'İ': 'I',
                    'ö': 'o', 'Ö': 'O',
                    'ç': 'c', 'Ç': 'C'
                };
                
                // Replace Turkish characters with ASCII equivalents
                return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, char => turkishMap[char] || char);
            }

            // Use built-in fonts
            const currentFont = 'helvetica';
            
            doc.setFont(currentFont);
            doc.setFontSize(10);

            // ==================== COVER PAGE ====================
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, pageWidth, 80, 'F');

            // Title with Turkish character fix
            doc.setFontSize(20);
            doc.setFont(currentFont, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(encodeTurkishText('PROCLEAN ÇAMAŞIRHANE'), pageWidth / 2, 35, { align: 'center' });

            doc.setFontSize(14);
            doc.text(encodeTurkishText('Günlük Detaylı İş Raporu'), pageWidth / 2, 50, { align: 'center' });

            doc.setFontSize(10);
            doc.text(encodeTurkishText(reportData.date), pageWidth / 2, 65, { align: 'center' });

            currentY = 100;
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 50, 3, 3, 'F');

            doc.setFontSize(12);
            doc.setFont(currentFont, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(encodeTurkishText('RAPOR DETAYLARI'), margin + 10, currentY + 15);

            doc.setFontSize(10);
            doc.setFont(currentFont, 'normal');
            doc.text(encodeTurkishText(`Rapor Tarihi: ${reportData.date}`), margin + 10, currentY + 25);
            doc.text(encodeTurkishText(`Rapor No: ${reportData.id || 'Yerel Kayıt'}`), margin + 10, currentY + 35);
            doc.text(encodeTurkishText(`Operatör: ${reportData.operator}`), pageWidth - margin - 10, currentY + 25, { align: 'right' });
            doc.text(encodeTurkishText(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`), pageWidth - margin - 10, currentY + 35, { align: 'right' });

            currentY += 70;

            // ==================== EXECUTIVE SUMMARY ====================
            doc.setFontSize(16);
            doc.setFont(currentFont, 'bold');
            doc.setTextColor(41, 128, 185);
            doc.text(encodeTurkishText('GÜNLÜK ÖZET'), margin, currentY);
            currentY += 15;

            const summaryBoxes = [
                { title: 'Toplam Paket', value: reportData.totalPackages, color: [52, 152, 219], icon: '📦' },
                { title: 'Bekleyen Paket', value: reportData.waitingPackages, color: [241, 196, 15], icon: '⏳' },
                { title: 'Sevk Edilen Paket', value: reportData.shippedPackages, color: [46, 204, 113], icon: '🚚' },
                { title: 'Konteyner', value: reportData.containers, color: [155, 89, 182], icon: '📊' }
            ];

            const boxWidth = (pageWidth - 2 * margin - 15) / 4;
            summaryBoxes.forEach((box, index) => {
                const x = margin + index * (boxWidth + 5);

                doc.setFillColor(...box.color);
                doc.roundedRect(x, currentY, boxWidth, 35, 3, 3, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont(currentFont, 'bold');
                doc.text(box.icon, x + boxWidth / 2, currentY + 10, { align: 'center' });
                doc.text(encodeTurkishText(box.title), x + boxWidth / 2, currentY + 18, { align: 'center' });

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
            doc.setFont(currentFont, 'bold');
            doc.setTextColor(41, 128, 185);
            doc.text(encodeTurkishText('DETAYLI İSTATİSTİKLER'), margin, currentY);
            currentY += 15;

            const stats = [
                `Toplam işlenen paket: ${reportData.totalPackages} adet`,
                `Bekleyen paketler: ${reportData.waitingPackages} adet`,
                `Sevk edilen paketler: ${reportData.shippedPackages} adet`,
                `Toplam ürün miktarı: ${reportData.totalItems} adet`,
                `Bekleyen ürünler: ${reportData.waitingItems} adet`,
                `Sevk edilen ürünler: ${reportData.shippedItems} adet`,
                `Hazırlanan konteyner: ${reportData.containers} adet`,
                `Hizmet verilen müşteri: ${reportData.customers} firma`
            ];

            doc.setFontSize(10);
            doc.setFont(currentFont, 'normal');
            doc.setTextColor(0, 0, 0);

            stats.forEach(stat => {
                if (currentY > pageHeight - 20) {
                    doc.addPage();
                    currentY = margin;
                }
                doc.text(`• ${encodeTurkishText(stat)}`, margin + 5, currentY);
                currentY += 6;
            });

            currentY += 15;

            // ==================== PACKAGE DETAILS ====================
            if (reportData.allPackages && reportData.allPackages.length > 0) {
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(12);
                doc.setFont(currentFont, 'bold');
                doc.setTextColor(41, 128, 185);
                doc.text(encodeTurkishText('TÜM PAKET DETAYLARI'), margin, currentY);
                currentY += 10;

                // Simple table without autoTable
                doc.setFontSize(8);
                doc.setFont(currentFont, 'bold');
                doc.text(encodeTurkishText('Paket No'), margin, currentY);
                doc.text(encodeTurkishText('Müşteri'), margin + 40, currentY);
                doc.text(encodeTurkishText('Adet'), margin + 80, currentY);
                doc.text(encodeTurkishText('Durum'), margin + 100, currentY);
                doc.text(encodeTurkishText('Tarih'), margin + 130, currentY);
                
                currentY += 5;
                doc.line(margin, currentY, pageWidth - margin, currentY);
                currentY += 5;

                doc.setFont(currentFont, 'normal');
                
                reportData.allPackages.forEach((pkg, index) => {
                    if (currentY > pageHeight - 20) {
                        doc.addPage();
                        currentY = margin + 20;
                    }
                    
                    doc.text(pkg.package_no || 'N/A', margin, currentY);
                    doc.text(encodeTurkishText(pkg.customers?.name || 'N/A'), margin + 40, currentY);
                    doc.text((pkg.total_quantity || 0).toString(), margin + 80, currentY);
                    doc.text(pkg.container_id ? 'Sevk Edildi' : 'Bekliyor', margin + 100, currentY);
                    doc.text(pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A', margin + 130, currentY);
                    
                    currentY += 5;
                });

                currentY += 15;
            }

            // ==================== CONTAINER DETAILS ====================
            if (reportData.containersList && reportData.containersList.length > 0) {
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(12);
                doc.setFont(currentFont, 'bold');
                doc.setTextColor(155, 89, 182);
                doc.text(encodeTurkishText('KONTEYNER DETAYLARI'), margin, currentY);
                currentY += 10;

                // Simple container table
                doc.setFontSize(8);
                doc.setFont(currentFont, 'bold');
                doc.text(encodeTurkishText('Konteyner No'), margin, currentY);
                doc.text(encodeTurkishText('Paket Sayısı'), margin + 40, currentY);
                doc.text(encodeTurkishText('Toplam Adet'), margin + 70, currentY);
                doc.text(encodeTurkishText('Durum'), margin + 100, currentY);
                doc.text(encodeTurkishText('Tarih'), margin + 130, currentY);
                
                currentY += 5;
                doc.line(margin, currentY, pageWidth - margin, currentY);
                currentY += 5;

                doc.setFont(currentFont, 'normal');
                
                reportData.containersList.forEach((container) => {
                    if (currentY > pageHeight - 20) {
                        doc.addPage();
                        currentY = margin + 20;
                    }
                    
                    doc.text(container.container_no || 'N/A', margin, currentY);
                    doc.text((container.package_count || 0).toString(), margin + 40, currentY);
                    doc.text((container.total_quantity || 0).toString(), margin + 70, currentY);
                    doc.text(container.status === 'sevk-edildi' ? 'Sevk Edildi' : 'Hazırlanıyor', margin + 100, currentY);
                    doc.text(container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A', margin + 130, currentY);
                    
                    currentY += 5;
                });

                currentY += 15;
            }

            // ==================== CRITICAL STOCK ====================
            if (reportData.criticalStock && reportData.criticalStock.length > 0) {
                if (currentY > pageHeight - 80) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(12);
                doc.setFont(currentFont, 'bold');
                doc.setTextColor(231, 76, 60);
                doc.text(encodeTurkishText('KRİTİK STOK UYARILARI'), margin, currentY);
                currentY += 10;

                // Simple stock table
                doc.setFontSize(8);
                doc.setFont(currentFont, 'bold');
                doc.text(encodeTurkishText('Stok Kodu'), margin, currentY);
                doc.text(encodeTurkishText('Ürün Adı'), margin + 30, currentY);
                doc.text(encodeTurkishText('Mevcut Adet'), margin + 80, currentY);
                doc.text(encodeTurkishText('Durum'), margin + 110, currentY);
                
                currentY += 5;
                doc.line(margin, currentY, pageWidth - margin, currentY);
                currentY += 5;

                doc.setFont(currentFont, 'normal');
                
                reportData.criticalStock.forEach((item) => {
                    if (currentY > pageHeight - 20) {
                        doc.addPage();
                        currentY = margin + 20;
                    }
                    
                    doc.text(item.code || 'N/A', margin, currentY);
                    doc.text(encodeTurkishText(item.name || 'N/A'), margin + 30, currentY);
                    doc.text((item.quantity || 0).toString(), margin + 80, currentY);
                    doc.text(item.quantity <= 0 ? 'STOK TÜKENDİ' : 'AZ STOK', margin + 110, currentY);
                    
                    currentY += 5;
                });
            }

            // ==================== FOOTER ====================
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont(currentFont, 'italic');
                doc.setTextColor(100, 100, 100);

                doc.setDrawColor(200, 200, 200);
                doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

                doc.text(encodeTurkishText(`Sayfa ${i} / ${pageCount}`), pageWidth / 2, pageHeight - 15, { align: 'center' });
                doc.text(encodeTurkishText('ProClean Rapor Sistemi'), margin, pageHeight - 15);
                doc.text(encodeTurkishText(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`), pageWidth - margin, pageHeight - 15, { align: 'right' });
            }

            const pdfBlob = doc.output('blob');
            resolve(pdfBlob);

        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            reject(new Error(`PDF oluşturulamadı: ${error.message}`));
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
            .from('reports')
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

        // Send email using EmailJS
        try {
            const response = await emailjs.send(
                'service_4rt2w5g',
                'template_2jf8cvh',
                templateParams,
                'jH-KlJ2ffs_lGwfsp'
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
        // Check if supabase is initialized
        if (!supabase) {
            console.warn('Supabase not initialized for storage check');
            return false;
        }
        
        const { data, error } = await supabase.storage.getBucket('reports');
        if (error) {
            console.log('Reports bucket does not exist or cannot be accessed:', error.message);
            return false;
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
            doc.setFont("helvetica", "normal");
            
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
                
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                
                reportData.criticalStock.forEach((item, index) => {
                    if (currentY < 280) {
                        doc.text(`${item.code} - ${item.name}: ${item.quantity} adet`, 25, currentY);
                        currentY += 7;
                    }
                });
                currentY += 10;
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
        emailjs.init("jH-KlJ2ffs_lGwfsp");
        console.log('EmailJS initialized');
    } else {
        console.warn('EmailJS not loaded');
    }
}

// Call initialization when script loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for jsPDF to load
    setTimeout(() => {
        if (typeof window.jspdf !== 'undefined') {
            initializeEmailJS();
            initializeStorage();
        } else {
            console.warn('jsPDF not loaded yet, retrying...');
            setTimeout(() => {
                initializeEmailJS();
                initializeStorage();
            }, 1000);
        }
    }, 500);
});
