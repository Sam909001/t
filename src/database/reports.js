// Reports and analytics management
class ReportsManager {
    constructor() {
        this.reportData = null;
        this.chartInstances = new Map();
    }

    // Generate comprehensive report
    async generateReport(startDate, endDate) {
        try {
            AuthManager.requirePermission('view_reports');

            const loading = NotificationManager.showLoading('Rapor oluşturuluyor...');

            // Fetch data from all relevant tables
            const [packages, customers, stock] = await Promise.all([
                this.getPackageData(startDate, endDate),
                this.getCustomerData(),
                this.getStockData()
            ]);

            // Process and analyze data
            this.reportData = {
                period: { startDate, endDate },
                packages: this.analyzePackageData(packages),
                customers: this.analyzeCustomerData(customers),
                stock: this.analyzeStockData(stock),
                summary: this.generateSummary(packages, customers, stock),
                generatedAt: new Date().toISOString()
            };

            // Display report
            await this.displayReport();

            NotificationManager.hideLoading();
            NotificationManager.showAlert('Rapor oluşturuldu', 'success');

            return this.reportData;
        } catch (error) {
            NotificationManager.hideLoading();
            console.error('Error generating report:', error);
            NotificationManager.showAlert('Rapor oluşturulamadı: ' + error.message, 'error');
            throw error;
        }
    }

    // Get package data for reporting
    async getPackageData(startDate, endDate) {
        try {
            let query = {
                columns: `
                    id, customer_id, product_name, quantity, status, 
                    created_at, updated_at, container_id,
                    customers(name, code)
                `,
                order: { column: 'created_at', ascending: false }
            };

            // Add date filter if provided
            if (startDate && endDate) {
                // For now, we'll filter in memory since Supabase date filtering requires specific syntax
                const allPackages = await DatabaseManager.query('packages', 'select', query);
                return allPackages.filter(pkg => {
                    const createdDate = new Date(pkg.created_at);
                    return createdDate >= new Date(startDate) && createdDate <= new Date(endDate);
                });
            } else {
                return await DatabaseManager.query('packages', 'select', query);
            }
        } catch (error) {
            console.error('Error fetching package data:', error);
            return [];
        }
    }

    // Get customer data for reporting
    async getCustomerData() {
        try {
            return await DatabaseManager.query('customers', 'select', {
                order: { column: 'created_at', ascending: false }
            });
        } catch (error) {
            console.error('Error fetching customer data:', error);
            return [];
        }
    }

    // Get stock data for reporting
    async getStockData() {
        try {
            return await DatabaseManager.query('stock', 'select', {
                order: { column: 'product_name', ascending: true }
            });
        } catch (error) {
            console.error('Error fetching stock data:', error);
            return [];
        }
    }

    // Analyze package data
    analyzePackageData(packages) {
        const total = packages.length;
        const byStatus = Helpers.groupBy(packages, 'status');
        const byCustomer = Helpers.groupBy(packages, 'customer_id');
        const byProduct = Helpers.groupBy(packages, 'product_name');
        
        // Daily statistics
        const dailyStats = this.getDailyStats(packages);
        
        // Top customers by package count
        const topCustomers = Object.entries(byCustomer)
            .map(([customerId, customerPackages]) => ({
                customer: customerPackages[0]?.customers?.name || 'Bilinmeyen',
                packageCount: customerPackages.length,
                totalQuantity: customerPackages.reduce((sum, pkg) => sum + pkg.quantity, 0)
            }))
            .sort((a, b) => b.packageCount - a.packageCount)
            .slice(0, 10);

        // Top products
        const topProducts = Object.entries(byProduct)
            .map(([productName, productPackages]) => ({
                product: productName,
                packageCount: productPackages.length,
                totalQuantity: productPackages.reduce((sum, pkg) => sum + pkg.quantity, 0)
            }))
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);

        return {
            total,
            byStatus: Object.keys(byStatus).map(status => ({
                status,
                count: byStatus[status].length,
                percentage: ((byStatus[status].length / total) * 100).toFixed(1)
            })),
            dailyStats,
            topCustomers,
            topProducts,
            totalQuantity: packages.reduce((sum, pkg) => sum + pkg.quantity, 0)
        };
    }

    // Get daily statistics
    getDailyStats(packages) {
        const dailyData = Helpers.groupBy(packages, pkg => 
            new Date(pkg.created_at).toDateString()
        );

        return Object.keys(dailyData)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                date,
                packageCount: dailyData[date].length,
                totalQuantity: dailyData[date].reduce((sum, pkg) => sum + pkg.quantity, 0)
            }));
    }

    // Analyze customer data
    analyzeCustomerData(customers) {
        const total = customers.length;
        const withEmail = customers.filter(c => c.email).length;
        const withPhone = customers.filter(c => c.phone).length;
        
        // Monthly registration stats
        const monthlyRegistrations = this.getMonthlyStats(customers, 'created_at');

        return {
            total,
            withEmail,
            withPhone,
            emailPercentage: ((withEmail / total) * 100).toFixed(1),
            phonePercentage: ((withPhone / total) * 100).toFixed(1),
            monthlyRegistrations
        };
    }

    // Analyze stock data
    analyzeStockData(stock) {
        const total = stock.length;
        const totalQuantity = stock.reduce((sum, item) => sum + item.quantity, 0);
        const lowStock = stock.filter(item => {
            const minQuantity = item.min_quantity || 10;
            return item.quantity <= minQuantity;
        }).length;
        const criticalStock = stock.filter(item => item.quantity <= 5).length;

        // Stock value (if unit prices were available)
        const stockCategories = this.categorizeStock(stock);

        return {
            total,
            totalQuantity,
            lowStock,
            criticalStock,
            lowStockPercentage: ((lowStock / total) * 100).toFixed(1),
            criticalStockPercentage: ((criticalStock / total) * 100).toFixed(1),
            categories: stockCategories
        };
    }

    // Categorize stock items
    categorizeStock(stock) {
        // Simple categorization based on product names
        const categories = {
            'Temizlik': stock.filter(item => 
                item.product_name.toLowerCase().includes('temizlik') ||
                item.product_name.toLowerCase().includes('deterjan')
            ).length,
            'Kumaş': stock.filter(item =>
                item.product_name.toLowerCase().includes('kumaş') ||
                item.product_name.toLowerCase().includes('bez')
            ).length,
            'Ekipman': stock.filter(item =>
                item.product_name.toLowerCase().includes('ekipman') ||
                item.product_name.toLowerCase().includes('makine')
            ).length,
            'Diğer': 0
        };

        // Calculate "Other" category
        const categorized = Object.values(categories).reduce((sum, count) => sum + count, 0);
        categories['Diğer'] = stock.length - categorized;

        return Object.entries(categories).map(([name, count]) => ({
            name,
            count,
            percentage: ((count / stock.length) * 100).toFixed(1)
        }));
    }

    // Get monthly statistics
    getMonthlyStats(data, dateField) {
        const monthlyData = Helpers.groupBy(data, item => {
            const date = new Date(item[dateField]);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        });

        return Object.keys(monthlyData)
            .sort()
            .map(month => ({
                month,
                count: monthlyData[month].length
            }));
    }

    // Generate summary
    generateSummary(packages, customers, stock) {
        return {
            totalPackages: packages.length,
            totalCustomers: customers.length,
            totalStockItems: stock.length,
            pendingPackages: packages.filter(p => p.status === 'beklemede').length,
            shippedPackages: packages.filter(p => p.status === 'sevk-edildi').length,
            lowStockItems: stock.filter(item => {
                const minQuantity = item.min_quantity || 10;
                return item.quantity <= minQuantity;
            }).length,
            busyDay: this.getBusiestDay(packages),
            topProduct: this.getTopProduct(packages)
        };
    }

    // Get busiest day
    getBusiestDay(packages) {
        const dailyData = Helpers.groupBy(packages, pkg => 
            new Date(pkg.created_at).toDateString()
        );

        const busiest = Object.entries(dailyData)
            .sort((a, b) => b[1].length - a[1].length)[0];

        return busiest ? {
            date: busiest[0],
            packageCount: busiest[1].length
        } : null;
    }

    // Get top product
    getTopProduct(packages) {
        const productData = Helpers.groupBy(packages, 'product_name');
        
        const top = Object.entries(productData)
            .sort((a, b) => b[1].length - a[1].length)[0];

        return top ? {
            name: top[0],
            packageCount: top[1].length
        } : null;
    }

    // Display report
    async displayReport() {
        const reportContainer = document.getElementById('reportContent');
        if (!reportContainer || !this.reportData) return;

        const { packages, customers, stock, summary, period } = this.reportData;

        reportContainer.innerHTML = `
            <div class="report-header" style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #ddd;">
                <h2><i class="fas fa-chart-bar"></i> Detaylı Rapor</h2>
                <p style="color: #666; margin: 0.5rem 0;">
                    Dönem: ${Helpers.formatDate(period.startDate)} - ${Helpers.formatDate(period.endDate)}
                </p>
                <p style="color: #666; font-size: 0.9rem;">
                    Oluşturulma: ${Helpers.formatDateTime(this.reportData.generatedAt)}
                </p>
            </div>

            <div class="report-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div class="summary-card" style="background: var(--primary); color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0; font-size: 2rem;">${summary.totalPackages}</h3>
                    <p style="margin: 0.5rem 0 0;">Toplam Paket</p>
                </div>
                <div class="summary-card" style="background: var(--success); color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0; font-size: 2rem;">${summary.totalCustomers}</h3>
                    <p style="margin: 0.5rem 0 0;">Toplam Müşteri</p>
                </div>
                <div class="summary-card" style="background: var(--secondary); color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0; font-size: 2rem;">${summary.totalStockItems}</h3>
                    <p style="margin: 0.5rem 0 0;">Stok Kalemi</p>
                </div>
                <div class="summary-card" style="background: var(--warning); color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0; font-size: 2rem;">${summary.lowStockItems}</h3>
                    <p style="margin: 0.5rem 0 0;">Az Stok</p>
                </div>
            </div>

            <div class="report-sections" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div class="section">
                    <h3>Paket İstatistikleri</h3>
                    <div id="packageStatusChart" style="height: 300px; margin: 1rem 0;"></div>
                    <div class="status-breakdown">
                        ${packages.byStatus.map(status => `
                            <div style="display: flex; justify-content: space-between; margin: 0.5rem 0;">
                                <span>${status.status}:</span>
                                <span><strong>${status.count}</strong> (%${status.percentage})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="section">
                    <h3>En Çok Paket Gönderen Müşteriler</h3>
                    <div class="top-customers">
                        ${packages.topCustomers.slice(0, 5).map((customer, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; margin: 0.3rem 0; background: #f8f9fa; border-radius: 4px;">
                                <span><strong>${index + 1}.</strong> ${customer.customer}</span>
                                <span><strong>${customer.packageCount}</strong> paket</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="section">
                    <h3>En Popüler Ürünler</h3>
                    <div class="top-products">
                        ${packages.topProducts.slice(0, 5).map((product, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; margin: 0.3rem 0; background: #f8f9fa; border-radius: 4px;">
                                <span><strong>${index + 1}.</strong> ${product.product}</span>
                                <span><strong>${product.totalQuantity}</strong> adet</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="section">
                    <h3>Stok Durumu</h3>
                    <div id="stockStatusChart" style="height: 300px; margin: 1rem 0;"></div>
                    <div class="stock-summary">
                        <p>Toplam Miktar: <strong>${stock.totalQuantity}</strong></p>
                        <p>Az Stok: <strong>${stock.lowStock}</strong> (%${stock.lowStockPercentage})</p>
                        <p>Kritik Stok: <strong>${stock.criticalStock}</strong> (%${stock.criticalStockPercentage})</p>
                    </div>
                </div>
            </div>

            <div class="report-actions" style="margin-top: 2rem; text-align: center; padding-top: 1rem; border-top: 1px solid #ddd;">
                <button onclick="ReportsManager.exportReportPDF()" class="btn btn-primary">
                    <i class="fas fa-file-pdf"></i> PDF İndir
                </button>
                <button onclick="ReportsManager.exportReportExcel()" class="btn btn-success">
                    <i class="fas fa-file-excel"></i> Excel İndir
                </button>
                <button onclick="ReportsManager.printReport()" class="btn btn-secondary">
                    <i class="fas fa-print"></i> Yazdır
                </button>
            </div>
        `;

        // Create charts if chart library is available
        this.createCharts();
    }

    // Create charts (simple implementation)
    createCharts() {
        if (!this.reportData) return;

        // Package status chart (simple bar chart with CSS)
        this.createPackageStatusChart();
        this.createStockStatusChart();
    }

    // Create package status chart
    createPackageStatusChart() {
        const chartContainer = document.getElementById('packageStatusChart');
        if (!chartContainer || !this.reportData) return;

        const { packages } = this.reportData;
        const maxCount = Math.max(...packages.byStatus.map(s => s.count));

        chartContainer.innerHTML = packages.byStatus.map(status => `
            <div style="display: flex; align-items: center; margin: 0.5rem 0;">
                <div style="width: 100px; font-size: 0.9rem;">${status.status}</div>
                <div style="flex: 1; background: #f0f0f0; height: 20px; margin: 0 1rem; border-radius: 10px; overflow: hidden;">
                    <div style="height: 100%; background: var(--secondary); width: ${(status.count / maxCount) * 100}%; transition: width 0.3s;"></div>
                </div>
                <div style="width: 60px; text-align: right; font-weight: bold;">${status.count}</div>
            </div>
        `).join('');
    }

    // Create stock status chart
    createStockStatusChart() {
        const chartContainer = document.getElementById('stockStatusChart');
        if (!chartContainer || !this.reportData) return;

        const { stock } = this.reportData;
        const categories = stock.categories;
        const maxCount = Math.max(...categories.map(c => c.count));

        chartContainer.innerHTML = categories.map(category => `
            <div style="display: flex; align-items: center; margin: 0.5rem 0;">
                <div style="width: 100px; font-size: 0.9rem;">${category.name}</div>
                <div style="flex: 1; background: #f0f0f0; height: 20px; margin: 0 1rem; border-radius: 10px; overflow: hidden;">
                    <div style="height: 100%; background: var(--success); width: ${(category.count / maxCount) * 100}%; transition: width 0.3s;"></div>
                </div>
                <div style="width: 60px; text-align: right; font-weight: bold;">${category.count}</div>
            </div>
        `).join('');
    }

    // Export report to PDF
    exportReportPDF() {
        try {
            if (typeof window.jsPDF === 'undefined') {
                NotificationManager.showAlert('PDF kütüphanesi yüklenmemiş', 'error');
                return;
            }

            // This would require jsPDF implementation
            NotificationManager.showAlert('PDF export özelliği geliştiriliyor', 'info');
        } catch (error) {
            console.error('PDF export error:', error);
            NotificationManager.showAlert('PDF oluşturulamadı', 'error');
        }
    }

    // Export report to Excel
    exportReportExcel() {
        try {
            if (!this.reportData) return;

            // Create summary data for CSV export
            const summaryData = [
                ['Rapor Özeti', ''],
                ['Toplam Paket', this.reportData.summary.totalPackages],
                ['Toplam Müşteri', this.reportData.summary.totalCustomers],
                ['Toplam Stok Kalemi', this.reportData.summary.totalStockItems],
                ['Bekleyen Paket', this.reportData.summary.pendingPackages],
                ['Sevk Edilen Paket', this.reportData.summary.shippedPackages],
                ['Az Stok Kalemi', this.reportData.summary.lowStockItems],
                [''],
                ['En Çok Paket Gönderen Müşteriler', ''],
                ...this.reportData.packages.topCustomers.map(c => [c.customer, c.packageCount]),
                [''],
                ['En Popüler Ürünler', ''],
                ...this.reportData.packages.topProducts.map(p => [p.product, p.totalQuantity])
            ];

            // Convert to CSV and download
            const csvContent = summaryData.map(row => row.join(',')).join('\n');
            Helpers.downloadFile(
                csvContent, 
                `rapor_${Helpers.formatDate(new Date())}.csv`,
                'text/csv'
            );

        } catch (error) {
            console.error('Excel export error:', error);
            NotificationManager.showAlert('Excel oluşturulamadı', 'error');
        }
    }

    // Print report
    printReport() {
        try {
            const reportContainer = document.getElementById('reportContent');
            if (!reportContainer) return;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>ProClean Raporu</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .report-header { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
                            .summary-card { background: #f5f5f5; padding: 15px; margin: 10px; border-radius: 5px; display: inline-block; }
                            .section { margin: 20px 0; }
                            .section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                            @media print { body { margin: 0; } }
                        </style>
                    </head>
                    <body>
                        ${reportContainer.innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            console.error('Print error:', error);
            NotificationManager.showAlert('Yazdırılamadı', 'error');
        }
    }

    // Setup report date inputs
    setupReportDateInputs() {
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');
        const generateBtn = document.getElementById('generateReportBtn');

        if (startDateInput && endDateInput) {
            // Set default dates (last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            startDateInput.value = startDate.toISOString().split('T')[0];
            endDateInput.value = endDate.toISOString().split('T')[0];
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const startDate = startDateInput?.value;
                const endDate = endDateInput?.value;

                if (!startDate || !endDate) {
                    NotificationManager.showAlert('Lütfen tarih aralığı seçin', 'warning');
                    return;
                }

                if (new Date(startDate) > new Date(endDate)) {
                    NotificationManager.showAlert('Başlangıç tarihi bitiş tarihinden büyük olamaz', 'error');
                    return;
                }

                this.generateReport(startDate, endDate);
            });
        }
    }

    // Initialize reports
    init() {
        this.setupReportDateInputs();
        console.log('ReportsManager initialized');
    }
}

// Create global instance
window.ReportsManager = new ReportsManager();
