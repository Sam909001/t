// Report operations - Fixed version with PDF upload to Supabase
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

        // Generate PDF first
        showAlert('PDF oluşturuluyor...', 'info');
        const pdfBlob = await generatePDFReport(currentReportData);
        const pdfUrl = await uploadPDFToSupabase(pdfBlob, currentReportData);

        // Save report to database with PDF URL
        const { data: report, error: reportError } = await supabase
            .from('reports')
            .insert([{
                report_date: new Date(),
                report_type: 'daily',
                data: currentReportData,
                pdf_url: pdfUrl, // Add PDF URL to the report
                user_id: user.id
            }])
            .select()
            .single();

        if (reportError) throw new Error(`Rapor kaydedilemedi: ${reportError.message}`);

        currentReportData.id = report.id;
        currentReportData.pdf_url = pdfUrl; // Store PDF URL in current data
        
        showAlert('Günlük rapor ve PDF başarıyla oluşturuldu', 'success');
        
        // Show email modal with customer email if available
        document.getElementById('reportEmail').value = selectedCustomer?.email || '';
        document.getElementById('emailModal').style.display = 'flex';

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showAlert(`Rapor oluşturulamadı: ${error.message}`, 'error');
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
            pdf_url: currentReportData.pdf_url, // Add the PDF URL to the email
            download_link: `${currentReportData.pdf_url}?download=1` // Download link
        };

        console.log('E-posta parametreleri:', templateParams);

        // Send email using EmailJS
        try {
            const response = await emailjs.send(
                'service_4rt2w5g',  // Your service ID
                'template_2jf8cvh', // Your template ID
                templateParams
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
            throw new Error(`E-posta gönderilemedi: ${emailError.message}`);
        }
        
    } catch (error) {
        console.error('Rapor gönderme hatası:', error);
        showAlert(`Rapor gönderilemedi: ${error.message}`, 'error');
    }
}

// Updated EmailJS Template Content:
/*
ProClean Günlük Rapor

Merhaba {{to_name}},

{{report_date}} tarihli günlük raporunuz aşağıda yer almaktadır:

Toplam Paket: {{total_packages}}
Toplam Ürün: {{total_items}}
Kritik Stok Sayısı: {{critical_stock_count}}
Rapor ID: {{report_id}}
Operatör: {{operator_name}}

PDF Raporu: {{pdf_url}}

Raporu indirmek için: {{download_link}}

Teşekkürler,
{{company_name}}
*/

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

// Update your EmailJS template to include the PDF link:
/*
ProClean Günlük Rapor - {{report_date}}

Merhaba {{to_name}},

{{report_date}} tarihli günlük raporunuz hazırdır:

📊 Rapor Özeti:
• Toplam Paket: {{total_packages}}
• Toplam Ürün: {{total_items}}
• Kritik Stok: {{critical_stock_count}}
• Operatör: {{operator_name}}

📎 PDF Raporu: {{pdf_url}}

Raporu görüntülemek için yukarıdaki linke tıklayın veya indirmek için sağ tıklayıp "Farklı Kaydet" seçeneğini kullanın.

Teşekkürler,
{{company_name}}
*/

// Initialize storage bucket on app start
async function initializeStorage() {
    const bucketExists = await checkStorageBucket();
    if (!bucketExists) {
        console.warn('Storage bucket could not be initialized');
    }
}

// Call this when your app starts
initializeStorage();
