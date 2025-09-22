// ===============================
// REPORT MODULE - ProClean
// ===============================

let currentReportData = null;

// -------------------------------
// 1️⃣ GENERATE DAILY REPORT
// -------------------------------
async function generateDailyReport() {
    try {
        showAlert('Günlük rapor oluşturuluyor...', 'info');

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch report data concurrently
        const [packagesResult, containersResult, stockResult] = await Promise.all([
            supabase.from('packages')
                .select('*, customers (name, code)')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay),
            supabase.from('containers')
                .select('*')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay),
            supabase.from('stock_items')
                .select('*')
                .lte('quantity', 5)
                .order('quantity', { ascending: true })
        ]);

        if (packagesResult.error) throw packagesResult.error;
        if (containersResult.error) throw containersResult.error;
        if (stockResult.error) throw stockResult.error;

        // Build report data object
        currentReportData = {
            date: new Date().toLocaleDateString('tr-TR'),
            totalPackages: packagesResult.data.length,
            totalItems: packagesResult.data.reduce((sum, pkg) => sum + pkg.total_quantity, 0),
            containers: containersResult.data.length,
            customers: [...new Set(packagesResult.data.map(p => p.customers?.name))].length,
            packages: packagesResult.data,
            containers: containersResult.data,
            criticalStock: stockResult.data,
            operator: user.user_metadata?.full_name || 'Bilinmiyor',
            user_id: user.id
        };

        // Save report to Supabase
        const { data: report, error: reportError } = await supabase.from('reports')
            .insert([{
                report_date: new Date(),
                report_type: 'daily',
                data: currentReportData,
                user_id: user.id
            }])
            .select()
            .single();

        if (reportError) throw reportError;
        currentReportData.id = report.id;

        showAlert('Günlük rapor başarıyla oluşturuldu', 'success');

        // Show email modal
        document.getElementById('reportEmail').value = selectedCustomer?.email || '';
        document.getElementById('emailModal').style.display = 'flex';

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showAlert(`Rapor oluşturulamadı: ${error.message}`, 'error');
    }
}

// -------------------------------
// 2️⃣ CLOSE EMAIL MODAL
// -------------------------------
function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) modal.style.display = 'none';
}

// -------------------------------
// 3️⃣ PDF GENERATION
// -------------------------------
async function generatePDFReport(reportData) {
    return new Promise((resolve, reject) => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            const title = 'ProClean - Günlük İş Sonu Raporu';
            doc.text(title, (pageWidth - doc.getTextWidth(title)) / 2, 20);

            // Header info
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Tarih: ${reportData.date}`, 20, 35);
            doc.text(`Operatör: ${reportData.operator}`, 20, 42);
            doc.text(`Rapor ID: ${reportData.id || 'Yerel Kayıt'}`, 20, 49);

            // Summary
            doc.setFont(undefined, "bold");
            doc.setFontSize(12);
            doc.text('ÖZET', 20, 65);
            doc.setFont(undefined, "normal");
            doc.setFontSize(10);
            doc.text(`• Toplam Paket Sayısı: ${reportData.totalPackages}`, 30, 75);
            doc.text(`• Toplam Ürün Adedi: ${reportData.totalItems}`, 30, 82);
            doc.text(`• Konteyner Sayısı: ${reportData.containers}`, 30, 89);
            doc.text(`• Müşteri Sayısı: ${reportData.customers}`, 30, 96);
            doc.text(`• Kritik Stok Sayısı: ${reportData.criticalStock?.length || 0}`, 30, 103);

            let currentY = 115;

            // Critical stock table
            if (reportData.criticalStock?.length) {
                doc.setFont(undefined, "bold");
                doc.setFontSize(12);
                doc.text('KRİTİK STOKLAR', 20, currentY);
                currentY += 10;

                doc.autoTable({
                    startY: currentY,
                    head: [['Stok Kodu', 'Ürün Adı', 'Mevcut Adet']],
                    body: reportData.criticalStock.map(item => [
                        item.code || 'N/A',
                        item.name || 'N/A',
                        item.quantity?.toString() || '0'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3 }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Package table
            if (reportData.packages?.length) {
                doc.setFont(undefined, "bold");
                doc.setFontSize(12);
                doc.text('PAKET DETAYLARI', 20, currentY);
                currentY += 10;

                doc.autoTable({
                    startY: currentY,
                    head: [['Paket No', 'Müşteri', 'Adet', 'Tarih', 'Paketleyen']],
                    body: reportData.packages.map(pkg => [
                        pkg.package_no || 'N/A',
                        pkg.customers?.name || 'N/A',
                        pkg.total_quantity?.toString() || '0',
                        pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : 'N/A',
                        pkg.packer || 'Bilinmiyor'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    pageBreak: 'auto'
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Containers table
            if (reportData.containers?.length) {
                doc.setFont(undefined, "bold");
                doc.setFontSize(12);
                doc.text('KONTEYNER DETAYLARI', 20, currentY);
                currentY += 10;

                doc.autoTable({
                    startY: currentY,
                    head: [['Konteyner No', 'Müşteri', 'Paket Sayısı', 'Toplam Adet', 'Oluşturulma Tarihi']],
                    body: reportData.containers.map(container => [
                        container.container_no || 'N/A',
                        container.customer || 'N/A',
                        container.package_count?.toString() || '0',
                        container.total_quantity?.toString() || '0',
                        container.created_at ? new Date(container.created_at).toLocaleDateString('tr-TR') : 'N/A'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFont(undefined, 'italic');
                doc.setFontSize(8);
                doc.text(`Sayfa ${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
                doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
            }

            resolve(doc.output('blob'));
        } catch (error) {
            reject(error);
        }
    });
}

// -------------------------------
// 4️⃣ SIMPLE PDF (backup)
// -------------------------------
async function generateSimplePDFReport(reportData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('ProClean - Günlük Rapor', 20, 20);
    doc.setFontSize(12);
    doc.text(`Tarih: ${reportData.date}`, 20, 35);
    doc.text(`Operatör: ${reportData.operator}`, 20, 45);
    doc.text(`• Toplam Paket: ${reportData.totalPackages}`, 30, 60);
    doc.text(`• Toplam Ürün: ${reportData.totalItems}`, 30, 70);
    doc.text(`• Müşteri Sayısı: ${reportData.customers || 0}`, 30, 80);
    return doc.output('blob');
}

// -------------------------------
// 5️⃣ PREVIEW REPORT
// -------------------------------
async function previewReport() {
    if (!currentReportData) {
        showAlert('Önce rapor oluşturmalısınız', 'error');
        return;
    }

    try {
        const pdfBlob = await generatePDFReport(currentReportData);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const reportWindow = window.open(pdfUrl, '_blank');
        if (reportWindow) reportWindow.onbeforeunload = () => URL.revokeObjectURL(pdfUrl);
    } catch (error) {
        console.error('Rapor önizleme hatası:', error);
        showAlert('Rapor önizlenemedi', 'error');
    }
}

// -------------------------------
// 6️⃣ CONVERT BLOB TO BASE64
// -------------------------------
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}





// -------------------------------
// Upload report PDF to Supabase Storage
// -------------------------------
async function uploadReportToStorage(pdfBlob, reportData) {
    if (!supabase.storage) throw new Error('Supabase Storage yüklenmemiş');

    try {
        const fileName = `reports/proclean-rapor-${reportData.date.replace(/\//g, '-')}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Upload or overwrite
        const { data, error } = await supabase.storage
            .from('reports') // Your bucket name
            .upload(fileName, file, { upsert: true });

        if (error) throw error;

        // Generate public URL
        const { publicUrl, error: urlError } = supabase.storage
            .from('reports')
            .getPublicUrl(fileName);

        if (urlError) throw urlError;

        return publicUrl;
    } catch (err) {
        console.warn('PDF storage upload failed:', err);
        throw err;
    }
}



// -------------------------------
// Form validation helper
// fields: [{id, errorId, type, required}]
// -------------------------------
function validateForm(fields) {
    let isValid = true;

    fields.forEach(field => {
        const input = document.getElementById(field.id);
        const errorEl = document.getElementById(field.errorId);

        if (!input || !errorEl) return;

        errorEl.textContent = '';
        input.classList.remove('invalid');

        if (field.required && !input.value.trim()) {
            errorEl.textContent = 'Bu alan zorunludur';
            input.classList.add('invalid');
            isValid = false;
            return;
        }

        if (field.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                errorEl.textContent = 'Geçerli bir e-posta giriniz';
                input.classList.add('invalid');
                isValid = false;
            }
        }
    });

    return isValid;
}





// -------------------------------
// 7️⃣ SEND DAILY REPORT (EMAILJS)
// -------------------------------
async function sendDailyReport() {
    try {
        const emailInput = document.getElementById('reportEmail');
        if (!emailInput) throw new Error('E-posta alanı bulunamadı');
        const email = emailInput.value;

        if (!validateForm([{ id: 'reportEmail', errorId: 'reportEmailError', type: 'email', required: true }])) return;
        if (!currentReportData) throw new Error('Önce rapor oluşturmalısınız');

        showAlert('Rapor hazırlanıyor...', 'info');

        // Generate PDF
        const pdfBlob = await generatePDFReport(currentReportData);
        let pdfUrl = null;
        let attachment = null;

        // Upload to storage (if exists)
        try { pdfUrl = await uploadReportToStorage(pdfBlob, currentReportData); } 
        catch { attachment = [{ name: `proclean-rapor-${currentReportData.date}.pdf`, data: await blobToBase64(pdfBlob), type: 'application/pdf' }]; }

        // EmailJS
        if (typeof emailjs === 'undefined') throw new Error('EmailJS kütüphanesi yüklenmemiş');
        emailjs.init(document.getElementById('emailjsPublicKey')?.value || 'YOUR_DEFAULT_PUBLIC_KEY');

        const templateParams = {
            to_email: email,
            to_name: selectedCustomer?.name || 'Müşteri',
            report_date: currentReportData.date,
            total_packages: currentReportData.totalPackages,
            total_items: currentReportData.totalItems,
            operator_name: currentReportData.operator,
            critical_stock_count: currentReportData.criticalStock?.length || 0,
            report_id: currentReportData.id || 'N/A',
            report_url: pdfUrl || 'PDF eklenti olarak gönderildi',
            company_name: 'ProClean Çamaşırhane',
            attachment
        };

        const serviceId = document.getElementById('emailjsServiceId')?.value;
        const templateId = document.getElementById('emailjsTemplateId')?.value;
        if (!serviceId || !templateId) throw new Error('EmailJS Service veya Template ID eksik');

        const result = await emailjs.send(serviceId, templateId, templateParams);
        if (result.status === 200) {
            await supabase.from('report_emails').insert([{
                report_id: currentReportData.id,
                sent_to: email,
                sent_at: new Date().toISOString(),
                status: 'sent',
                pdf_url: pdfUrl,
                delivery_method: pdfUrl ? 'link' : 'attachment'
            }]);
            showAlert(`Rapor ${email} adresine başarıyla gönderildi`, 'success');
            setTimeout(closeEmailModal, 2000);
        } else throw new Error('E-posta gönderilemedi');
    } catch (error) {
        console.error('Rapor gönderme hatası:', error);
        showAlert(`Rapor gönderilemedi: ${error.message}`, 'error');
    }
}
