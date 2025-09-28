// ==================== ENHANCED REPORTS SYSTEM ====================

// Global variable to store current report data
let currentReportData = null;

// Fixed Storage Bucket Check Function
async function checkStorageBucket() {
    try {
        // Check if supabase is properly initialized
        if (!supabase || typeof supabase.storage === 'undefined') {
            console.warn('Supabase storage not available - running in Excel mode');
            return false;
        }
        
        // Wait for supabase to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data, error } = await supabase.storage.getBucket('reports');
        if (error) {
            console.log('Reports bucket not accessible:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.warn('Storage bucket check warning:', error.message);
        return false;
    }
}

// Fixed Storage Initialization
async function initializeStorage() {
    try {
        console.log('🔄 Initializing storage system...');
        
        // Wait for supabase to initialize
        let retries = 0;
        const maxRetries = 5;
        
        while (retries < maxRetries) {
            if (window.supabase && typeof window.supabase.storage !== 'undefined') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        if (!window.supabase) {
            console.log('📝 Running in Excel mode - Supabase not available');
            return false;
        }
        
        const bucketExists = await checkStorageBucket();
        if (!bucketExists) {
            console.log('📝 Running in Excel mode - Storage bucket not available');
            return false;
        }
        
        console.log('✅ Storage system initialized successfully');
        return true;
        
    } catch (error) {
        console.warn('⚠️ Storage initialization completed with warnings:', error.message);
        return false;
    }
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

// Generate Report from Excel Data
async function generateReportFromExcel(startOfDay, endOfDay) {
    try {
        console.log('📊 Generating report from Excel data...');
        
        // Check if ExcelJS is available
        if (typeof ExcelJS === 'undefined' || !ExcelJS.getCurrentFileName) {
            throw new Error('ExcelJS sistemi kullanılamıyor');
        }
        
        // Get today's Excel file
        const todayFile = ExcelJS.getCurrentFileName();
        const dailyData = await ExcelJS.readFile();
        
        // Filter today's packages
        const todayPackages = dailyData.filter(pkg => {
            if (!pkg.created_at) return false;
            const pkgDate = new Date(pkg.created_at);
            const start = new Date(startOfDay);
            const end = new Date(endOfDay);
            return pkgDate >= start && pkgDate <= end;
        });

        console.log(`📦 Found ${todayPackages.length} packages for today`);

        // Calculate statistics
        const waitingPackages = todayPackages.filter(pkg => !pkg.container_id);
        const shippedPackages = todayPackages.filter(pkg => pkg.container_id);
        
        // Get containers from packages
        const containerIds = [...new Set(todayPackages.map(pkg => pkg.container_id).filter(Boolean))];
        const containers = containerIds.map(id => {
            const containerPackages = todayPackages.filter(pkg => pkg.container_id === id);
            return {
                container_no: id,
                package_count: containerPackages.length,
                total_quantity: containerPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
                status: 'sevk-edildi',
                created_at: containerPackages[0]?.created_at
            };
        });

        // Mock critical stock for Excel mode
        const criticalStock = [
            { code: 'STK001', name: 'Büyük Çarşaf', quantity: 2, unit: 'Adet' },
            { code: 'STK005', name: 'Havlu', quantity: 5, unit: 'Adet' }
        ];

        return {
            date: new Date().toLocaleDateString('tr-TR'),
            totalPackages: todayPackages.length,
            totalItems: todayPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
            waitingPackages: waitingPackages.length,
            waitingItems: waitingPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
            shippedPackages: shippedPackages.length,
            shippedItems: shippedPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0),
            containers: containers.length,
            customers: [...new Set(todayPackages.map(p => p.customer_name).filter(Boolean))].length,
            allPackages: todayPackages,
            waitingPackagesList: waitingPackages,
            shippedPackagesList: shippedPackages,
            containersList: containers,
            criticalStock: criticalStock,
            operator: currentUser?.name || 'Excel Kullanıcı',
            user_id: 'excel-user',
            data_source: 'excel_daily',
            daily_file: todayFile
        };

    } catch (error) {
        console.error('Excel report generation error:', error);
        throw new Error(`Excel verilerinden rapor oluşturulamadı: ${error.message}`);
    }
}

// Generate Report from Supabase Data
async function generateReportFromSupabase(startOfDay, endOfDay) {
    try {
        // Fetch the authenticated user first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');
        
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
        if (stockError) console.warn('Stok verileri alınamadı:', stockError.message);

        // Separate packages by status
        const waitingPackages = allPackages ? allPackages.filter(pkg => !pkg.container_id) : [];
        const shippedPackages = allPackages ? allPackages.filter(pkg => pkg.container_id) : [];

        // Calculate totals
        const totalPackages = allPackages ? allPackages.length : 0;
        const totalItems = allPackages ? allPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0) : 0;
        const waitingItems = waitingPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);
        const shippedItems = shippedPackages.reduce((sum, pkg) => sum + (pkg.total_quantity || 0), 0);

        return {
            date: new Date().toLocaleDateString('tr-TR'),
            totalPackages: totalPackages,
            totalItems: totalItems,
            waitingPackages: waitingPackages.length,
            waitingItems: waitingItems,
            shippedPackages: shippedPackages.length,
            shippedItems: shippedItems,
            containers: allContainers ? allContainers.length : 0,
            customers: allPackages ? [...new Set(allPackages.map(p => p.customers?.name).filter(Boolean))].length : 0,
            allPackages: allPackages || [],
            waitingPackagesList: waitingPackages,
            shippedPackagesList: shippedPackages,
            containersList: allContainers || [],
            criticalStock: criticalStock || [],
            operator: user.user_metadata?.full_name || user.email || 'Bilinmiyor',
            user_id: user.id,
            data_source: 'supabase'
        };

    } catch (error) {
        console.error('Supabase report generation error:', error);
        throw error;
    }
}

// Enhanced Daily Report Generator (Works with both Supabase and Excel)
async function generateDailyReport() {
    try {
        showAlert('Profesyonel günlük rapor oluşturuluyor...', 'info');

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        let reportData = {};
        const isExcelMode = !supabase || !navigator.onLine;

        if (isExcelMode) {
            // Excel Mode - Generate report from daily Excel files
            reportData = await generateReportFromExcel(startOfDay, endOfDay);
        } else {
            // Supabase Mode - Generate report from database
            reportData = await generateReportFromSupabase(startOfDay, endOfDay);
        }

        // Generate PDF report
        showAlert('Profesyonel PDF oluşturuluyor...', 'info');
        const pdfBlob = await generateProfessionalPDFReport(reportData);

        // Upload to storage if available
        let pdfUrl = null;
        const storageAvailable = await initializeStorage();
        
        if (storageAvailable) {
            pdfUrl = await uploadPDFToSupabase(pdfBlob, reportData);
        } else {
            // Create local download URL for Excel mode
            pdfUrl = URL.createObjectURL(pdfBlob);
            console.log('📝 PDF created locally for Excel mode');
        }

        // Save report data
        currentReportData = {
            ...reportData,
            pdf_url: pdfUrl,
            storage_mode: storageAvailable ? 'supabase' : 'local'
        };

        showAlert('Profesyonel günlük rapor ve PDF başarıyla oluşturuldu', 'success');
        
        // Show email modal
        const reportEmailInput = document.getElementById('reportEmail');
        if (reportEmailInput) {
            reportEmailInput.value = selectedCustomer?.email || '';
        }
        
        const emailModal = document.getElementById('emailModal');
        if (emailModal) {
            emailModal.style.display = 'flex';
        }

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showAlert(`Rapor oluşturulamadı: ${error.message}`, 'error');
    }
}

// Send email with PDF link (Supabase mode)
async function sendEmailWithLink(templateParams, email) {
    try {
        const response = await emailjs.send(
            'service_4rt2w5g',
            'template_2jf8cvh',
            templateParams,
            'jH-KlJ2ffs_lGwfsp'
        );

        if (response.status === 200) {
            // Save email record to database if available
            if (supabase && currentReportData.id) {
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
            }
            
            showAlert(`Rapor ${email} adresine başarıyla gönderildi (Link)`, 'success');
            setTimeout(() => closeEmailModal(), 2000);
        } else {
            throw new Error(`E-posta gönderilemedi: ${response.text}`);
        }
    } catch (emailError) {
        console.error('EmailJS hatası:', emailError);
        await handleEmailFallback(email);
    }
}

// Handle Excel mode email (local PDF)
async function handleExcelModeEmail(templateParams, email) {
    try {
        // Generate PDF for email
        const pdfBlob = await generateProfessionalPDFReport(currentReportData);
        
        // For Excel mode, we'll create a download link
        const pdfUrl = URL.createObjectURL(pdfBlob);
        templateParams.pdf_url = pdfUrl;
        templateParams.download_instruction = 'PDF raporu aşağıdaki linkten indirebilirsiniz:';

        // Send email with download instructions
        const response = await emailjs.send(
            'service_4rt2w5g',
            'template_2jf8cvh',
            templateParams,
            'jH-KlJ2ffs_lGwfsp'
        );

        if (response.status === 200) {
            showAlert(`Rapor ${email} adresine gönderildi (İndirme Linki)`, 'success');
            
            // Also show local download option
            showAlert('PDF ayrıca yerel olarak da indirilebilir', 'info');
            
            setTimeout(() => closeEmailModal(), 3000);
        }
    } catch (error) {
        console.error('Excel mode email error:', error);
        await handleEmailFallback(email);
    }
}

// Fallback for email errors
async function handleEmailFallback(email) {
    const pdfLink = currentReportData.pdf_url;
    if (pdfLink) {
        const fallbackMessage = `E-posta gönderilemedi. PDF linki: ${pdfLink}`;
        showAlert(fallbackMessage, 'warning');
        
        // Copy link to clipboard
        try {
            await navigator.clipboard.writeText(pdfLink);
            showAlert('PDF linki panoya kopyalandı', 'info');
        } catch (copyError) {
            console.error('Clipboard error:', copyError);
        }
    } else {
        showAlert('E-posta gönderilemedi ve PDF linki oluşturulamadı', 'error');
    }
}

// Enhanced Email Sending Function for Both Modes
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

        showAlert('E-posta gönderiliyor...', 'info');

        // Prepare email parameters
        const templateParams = {
            to_email: email,
            to_name: selectedCustomer?.name || 'Müşteri',
            report_date: currentReportData.date,
            total_packages: currentReportData.totalPackages.toString(),
            total_items: currentReportData.totalItems.toString(),
            operator_name: currentReportData.operator,
            critical_stock_count: (currentReportData.criticalStock ? currentReportData.criticalStock.length : 0).toString(),
            report_id: currentReportData.id || 'Excel-Rapor',
            company_name: 'ProClean Çamaşırhane',
            data_source: currentReportData.data_source || 'excel',
            storage_mode: currentReportData.storage_mode || 'local'
        };

        console.log('E-posta parametreleri:', templateParams);

        // Handle PDF attachment based on mode
        if (currentReportData.storage_mode === 'supabase' && currentReportData.pdf_url) {
            // Supabase mode - send link
            templateParams.pdf_url = currentReportData.pdf_url;
            await sendEmailWithLink(templateParams, email);
        } else {
            // Excel mode - offer download
            await handleExcelModeEmail(templateParams, email);
        }

    } catch (error) {
        console.error('Rapor gönderme hatası:', error);
        showAlert(`Rapor gönderilemedi: ${error.message}`, 'error');
    }
}

// Enhanced PDF Download Function
async function downloadReportPDF() {
    if (!currentReportData) {
        showAlert('Önce rapor oluşturmalısınız', 'error');
        return;
    }

    try {
        let pdfUrl;

        if (currentReportData.storage_mode === 'supabase' && currentReportData.pdf_url) {
            // Supabase mode - use existing URL
            pdfUrl = currentReportData.pdf_url;
        } else {
            // Excel mode - generate new PDF
            const pdfBlob = await generateProfessionalPDFReport(currentReportData);
            pdfUrl = URL.createObjectURL(pdfBlob);
        }

        // Create download link
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `proclean-rapor-${currentReportData.date}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up local URL after some time
        if (currentReportData.storage_mode !== 'supabase') {
            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 10000);
        }
        
        showAlert('PDF indiriliyor...', 'success');
    } catch (error) {
        console.error('PDF indirme hatası:', error);
        showAlert('PDF indirilemedi', 'error');
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

// Wait for required dependencies
async function waitForDependencies() {
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        // Check if jsPDF is loaded
        if (typeof window.jspdf !== 'undefined') {
            console.log('✅ jsPDF loaded');
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (typeof window.jspdf === 'undefined') {
        console.warn('⚠️ jsPDF not loaded after waiting');
    }
}

// Enhanced Initialization
async function initializeReportsSystem() {
    try {
        console.log('🔄 Initializing reports system...');
        
        // Wait for dependencies to load
        await waitForDependencies();
        
        // Initialize storage system
        await initializeStorage();
        
        // Initialize EmailJS
        initializeEmailJS();
        
        console.log('✅ Reports system initialized successfully');
        
    } catch (error) {
        console.warn('⚠️ Reports system initialization completed with warnings:', error.message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeReportsSystem();
    }, 1000);
});
