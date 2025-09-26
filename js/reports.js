// ================== SUPABASE INITIALIZATION CHECK ==================
function getSupabaseClient() {
    if (window.supabase && window.supabase.storage) {
        return window.supabase;
    }
    
    // Fallback: try to initialize Supabase if not available
    if (typeof supabase !== 'undefined' && supabase) {
        window.supabase = supabase;
        return window.supabase;
    }
    
    // Last resort: check if Supabase is available globally
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not available');
        return null;
    }
    
    return window.supabase;
}

// Safe storage bucket check
async function checkStorageBucket() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn('Supabase client not available for storage check');
            return false;
        }
        
        // Check if storage is available
        if (!supabase.storage) {
            console.warn('Supabase storage not available');
            return false;
        }
        
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.warn('Storage bucket access error:', error);
            return false;
        }
        
        console.log('Storage buckets available:', data);
        return true;
    } catch (error) {
        console.warn('Storage bucket check failed:', error);
        return false;
    }
}

// Safe storage initialization
async function initializeStorage() {
    try {
        const isStorageAvailable = await checkStorageBucket();
        if (!isStorageAvailable) {
            console.warn('Storage bucket could not be initialized - running in limited mode');
            // Don't throw error, just continue without storage
            return false;
        }
        
        console.log('Storage initialized successfully');
        return true;
    } catch (error) {
        console.warn('Storage initialization failed:', error);
        return false;
    }
}

// ================== SAFE SUPABASE FUNCTIONS ==================
async function safeSupabaseAuth() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');
        
        return user;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

async function safeSupabaseQuery(queryFunction, errorMessage) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const result = await queryFunction(supabase);
        if (result.error) {
            throw new Error(`${errorMessage}: ${result.error.message}`);
        }
        
        return result.data;
    } catch (error) {
        console.error('Supabase query error:', error);
        throw error;
    }
}

// ================== REPORT GENERATION FUNCTIONS ==================
async function generateDailyReport() {
    try {
        showAlert('Profesyonel günlük rapor oluşturuluyor...', 'info');

        // Fetch the authenticated user first
        const user = await safeSupabaseAuth();
        
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch ALL packages (both waiting and shipped) for the day
        const allPackages = await safeSupabaseQuery(
            (supabase) => supabase
                .from('packages')
                .select('*, customers (name, code)')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay)
                .order('created_at', { ascending: false }),
            'Paket verileri alınamadı'
        );

        // Fetch ALL containers for the day
        const allContainers = await safeSupabaseQuery(
            (supabase) => supabase
                .from('containers')
                .select('*, packages (package_no, total_quantity, customers (name))')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay)
                .order('created_at', { ascending: false }),
            'Konteyner verileri alınamadı'
        );

        // Fetch critical stock
        const criticalStock = await safeSupabaseQuery(
            (supabase) => supabase
                .from('stock_items')
                .select('*')
                .lte('quantity', 5)
                .order('quantity', { ascending: true }),
            'Stok verileri alınamadı'
        );

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
        
        // Try to upload PDF to Supabase, but continue even if it fails
        let pdfUrl = '';
        try {
            pdfUrl = await uploadPDFToSupabase(pdfBlob, currentReportData);
        } catch (uploadError) {
            console.warn('PDF upload failed, continuing without storage:', uploadError);
            // Create a local URL for the PDF
            pdfUrl = URL.createObjectURL(pdfBlob);
        }

        // Save report to database with PDF URL
        const report = await safeSupabaseQuery(
            (supabase) => supabase
                .from('reports')
                .insert([{
                    report_date: new Date(),
                    report_type: 'daily',
                    data: currentReportData,
                    pdf_url: pdfUrl,
                    user_id: user.id
                }])
                .select()
                .single(),
            'Rapor kaydedilemedi'
        );

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
            if (reportData.allPackages && reportData.allPackages.length > 0 && doc.autoTable) {
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(12);
                doc.setFont(currentFont, 'bold');
                doc.setTextColor(41, 128, 185);
                doc.text(encodeTurkishText('TÜM PAKET DETAYLARI'), margin, currentY);
                currentY += 10;

                // Encode Turkish text in package data
                const packageData = reportData.allPackages.map(pkg => [
                    pkg.package_no || 'N/A',
                    encodeTurkishText(pkg.customers?.name || 'N/A'),
                    (pkg.total_quantity || 0).toString(),
                    pkg.container_id ? 'Sevk Edildi' : 'Bekliyor',
                    pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [[
                        encodeTurkishText('Paket No'), 
                        encodeTurkishText('Müşteri'), 
                        encodeTurkishText('Adet'), 
                        encodeTurkishText('Durum'), 
                        encodeTurkishText('Tarih')
                    ]],
                    body: packageData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [41, 128, 185],
                        textColor: [255, 255, 255],
                        font: currentFont,
                        fontStyle: 'bold'
                    },
                    styles: {
                        font: currentFont,
                        fontStyle: 'normal',
                        fontSize: 8,
                        cellPadding: 3
                    },
                    margin: { top: 10 },
                    pageBreak: 'auto',
                    didDrawCell: (data) => {
                        if (data.column.index === 3 && data.cell.raw === 'Sevk Edildi') {
                            doc.setFillColor(46, 204, 113);
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            doc.setTextColor(255, 255, 255);
                        } else if (data.column.index === 3 && data.cell.raw === 'Bekliyor') {
                            doc.setFillColor(241, 196, 15);
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            doc.setTextColor(0, 0, 0);
                        }
                    }
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
                doc.setFont(currentFont, 'bold');
                doc.setTextColor(155, 89, 182);
                doc.text(encodeTurkishText('KONTEYNER DETAYLARI'), margin, currentY);
                currentY += 10;

                const containerData = reportData.containers.map(container => [
                    container.container_no || 'N/A',
                    (container.package_count || 0).toString(),
                    (container.total_quantity || 0).toString(),
                    container.status === 'sevk-edildi' ? 'Sevk Edildi' : 'Hazırlanıyor',
                    container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [[
                        encodeTurkishText('Konteyner No'), 
                        encodeTurkishText('Paket Sayısı'), 
                        encodeTurkishText('Toplam Adet'), 
                        encodeTurkishText('Durum'), 
                        encodeTurkishText('Tarih')
                    ]],
                    body: containerData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [155, 89, 182],
                        textColor: [255, 255, 255],
                        font: currentFont,
                        fontStyle: 'bold'
                    },
                    styles: {
                        font: currentFont,
                        fontStyle: 'normal',
                        fontSize: 8,
                        cellPadding: 3
                    },
                    margin: { top: 10 },
                    pageBreak: 'auto'
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // ==================== CRITICAL STOCK ====================
            if (reportData.criticalStock && reportData.criticalStock.length > 0 && doc.autoTable) {
                if (currentY > pageHeight - 80) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(12);
                doc.setFont(currentFont, 'bold');
                doc.setTextColor(231, 76, 60);
                doc.text(encodeTurkishText('KRİTİK STOK UYARILARI'), margin, currentY);
                currentY += 10;

                const stockData = reportData.criticalStock.map(item => [
                    item.code || 'N/A',
                    encodeTurkishText(item.name || 'N/A'),
                    (item.quantity || 0).toString(),
                    item.quantity <= 0 ? 'STOK TÜKENDİ' : 'AZ STOK'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [[
                        encodeTurkishText('Stok Kodu'), 
                        encodeTurkishText('Ürün Adı'), 
                        encodeTurkishText('Mevcut Adet'), 
                        encodeTurkishText('Durum')
                    ]],
                    body: stockData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [231, 76, 60],
                        textColor: [255, 255, 255],
                        font: currentFont,
                        fontStyle: 'bold'
                    },
                    styles: {
                        font: currentFont,
                        fontStyle: 'normal',
                        fontSize: 8,
                        cellPadding: 3
                    },
                    margin: { top: 10 }
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
        const supabase = getSupabaseClient();
        if (!supabase || !supabase.storage) {
            throw new Error('Supabase storage not available');
        }

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

        // Send email using EmailJS
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
                    const supabase = getSupabaseClient();
                    if (supabase) {
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
                    }
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
        const pdfBlob = await generateProfessionalPDFReport(currentReportData);
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

// ================== GLOBAL VARIABLES ==================
let currentReportData = null;
let selectedCustomer = null;

// ================== MAIN INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Reports module initializing...');
    
    // Initialize EmailJS
    initializeEmailJS();
    
    // Initialize storage (non-blocking)
    initializeStorage().catch(error => {
        console.warn('Storage initialization warning:', error);
    });
    
    console.log('✅ Reports module initialized');
});

// ================== HELPER FUNCTIONS ==================
function showAlert(message, type = 'info') {
    // Use your existing alert system or fallback to console
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message);
    }
}
