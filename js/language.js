// language.js - Complete Isolated Language System
class LanguageManager {
    constructor() {
        this.currentLanguage = 'tr';
        this.translations = {
            'tr': this.getTurkishTranslations(),
            'en': this.getEnglishTranslations()
        };
        this.initialized = false;
    }

    // Turkish translations
    getTurkishTranslations() {
        return {
            // General
            'app.title': 'ProClean - Profesyonel Çamaşırhane Yönetim Sistemi',
            'general.save': 'Kaydet',
            'general.cancel': 'İptal',
            'general.delete': 'Sil',
            'general.edit': 'Düzenle',
            'general.loading': 'Yükleniyor...',
            'general.success': 'Başarılı',
            'general.error': 'Hata',
            'general.warning': 'Uyarı',
            'general.confirm': 'Onayla',
            'general.close': 'Kapat',
            'general.yes': 'Evet',
            'general.no': 'Hayır',
            'general.online': 'Çevrimiçi',
            'general.offline': 'Çevrimdışı',
            
            // Login
            'login.title': 'ProClean - Oturum Aç',
            'login.email': 'E-posta',
            'login.password': 'Şifre',
            'login.placeholder.email': 'E-posta adresinizi girin',
            'login.placeholder.password': 'Şifrenizi girin',
            'login.button': 'Giriş Yap',
            'login.apiKey': 'API Anahtarını Yönet',
            'login.error.email': 'Geçerli bir e-posta adresi girin',
            'login.error.password': 'Şifre gereklidir',
            
            // Tabs
            'tabs.packaging': 'Paketleme',
            'tabs.shipping': 'Sevkiyat',
            'tabs.stock': 'Stok Sorgu',
            'tabs.reports': 'Raporlar',
            
            // Packaging
            'packaging.customer.select': 'Müşteri Seçimi',
            'packaging.customer.placeholder': 'Müşteri seçin...',
            'packaging.personnel': 'Personel',
            'packaging.personnel.placeholder': 'Personel seçin...',
            'packaging.date': 'Tarih',
            'packaging.customer.management': 'Müşteri Yönetimi',
            'packaging.daily.report': 'İş Sonu Raporu',
            'packaging.add.to.container': 'Konteynere Ekle',
            'packaging.pending.packages': 'Bekleyen Paketler',
            'packaging.package.no': 'Paket No',
            'packaging.customer': 'Müşteri',
            'packaging.product': 'Ürün',
            'packaging.quantity': 'Adet',
            'packaging.status': 'Durum',
            'packaging.barcode.reading': 'Barkod Okuma',
            'packaging.barcode.placeholder': 'Barkod okutun veya girin',
            'packaging.package.details': 'Paket Detayları',
            'packaging.complete.package': 'Paketle',
            'packaging.print.label': 'Etiket Yazdır',
            'packaging.delete': 'Sil',
            'packaging.open.scanner': 'Barkod Tarayıcıyı Aç',
            'packaging.close.scanner': 'Barkod Tarayıcıyı Kapat',
            'packaging.scanner.active': 'Barkod tarayıcı modu aktif',
            'packaging.scanner.inactive': 'Barkod tarayıcı modu kapatıldı',
            
            // Products
            'products.large.sheet': 'Büyük Çarşaf',
            'products.sheet': 'Çarşaf',
            'products.large.quilt': 'Büyük Nevresim',
            'products.quilt': 'Nevresim',
            'products.large.towel': 'Büyük Havlu',
            'products.towel': 'Havlu',
            'products.pillow': 'Yastık',
            'products.pillowcase': 'Yastık Kılıfı',
            'products.alez': 'Alez',
            'products.manual.entry': 'Manuel Giriş',
            'products.extra': 'Extra',
            
            // Status
            'status.stained': 'Lekeli',
            'status.torn': 'Yırtık',
            'status.not.removed': 'Çıkmayan',
            'status.discard': 'Discard',
            'status.pending': 'Beklemede',
            'status.shipped': 'Sevk Edildi',
            'status.in.stock': 'Stokta',
            'status.low.stock': 'Az Stok',
            'status.out.of.stock': 'Tükendi',
            
            // Shipping
            'shipping.status.filter': 'Durum Filtresi',
            'shipping.filter.all': 'Tümü',
            'shipping.filter.pending': 'Beklemede',
            'shipping.filter.shipped': 'Sevk Edildi',
            'shipping.container.search': 'Konteyner Ara',
            'shipping.container.placeholder': 'Konteyner no...',
            'shipping.new.container': 'Yeni Konteyner',
            'shipping.current.container': 'Mevcut Konteyner',
            'shipping.delete.container': 'Konteyner Sil',
            'shipping.container.details': 'Konteyner Detayları',
            'shipping.ship.container': 'Sevk Et',
            
            // Stock
            'stock.search': 'Stok ara...',
            'stock.clear': 'Temizle',
            'stock.export': 'Stokları Dışa Aktar',
            'stock.code': 'Stok Kodu',
            'stock.name': 'Ürün Adı',
            'stock.quantity': 'Mevcut Adet',
            'stock.unit': 'Birim',
            'stock.last.update': 'Son Güncelleme',
            'stock.actions': 'İşlemler',
            'stock.upload.file': 'Stok Dosyası Yükle',
            'stock.upload.description': 'Excel (.xlsx, .xls) veya CSV (.csv) dosyası seçin',
            'stock.upload.button': 'Dosya Yükle',
            'stock.download.template': 'Şablon İndir',
            
            // Reports
            'reports.title': 'Raporlar',
            'reports.custom': 'Özel Rapor',
            'reports.export': 'Raporları Dışa Aktar',
            'reports.type': 'Rapor Türü',
            'reports.daily': 'Günlük Rapor',
            'reports.weekly': 'Haftalık Rapor',
            'reports.monthly': 'Aylık Rapor',
            'reports.custom': 'Özel Rapor',
            'reports.start.date': 'Başlangıç Tarihi',
            'reports.end.date': 'Bitiş Tarihi',
            'reports.load': 'Raporları Yükle',
            'reports.date': 'Rapor Tarihi',
            'reports.package.count': 'Paket Sayısı',
            'reports.total.quantity': 'Toplam Adet',
            'reports.creator': 'Oluşturan',
            
            // Settings
            'settings.title': 'Ayarlar',
            'settings.general': 'Genel Ayarlar',
            'settings.theme': 'Tema Modu',
            'settings.theme.light': 'Açık',
            'settings.theme.dark': 'Koyu',
            'settings.language': 'Dil',
            'settings.auto.save': 'Otomatik Kaydet',
            'settings.printer': 'Yazıcı Ayarları',
            'settings.printer.scaling': 'Etiket Boyutu',
            'settings.printer.copies': 'Kopya Sayısı',
            'settings.printer.font': 'Font',
            'settings.printer.font.size': 'Font Boyutu',
            'settings.printer.orientation': 'Yönlendirme',
            'settings.printer.portrait': 'Dikey',
            'settings.printer.landscape': 'Yatay',
            'settings.printer.margin.top': 'Üst Margin (mm)',
            'settings.printer.margin.bottom': 'Alt Margin (mm)',
            'settings.printer.test': 'Yazıcı Testi',
            'settings.data.management': 'Veri Yönetimi',
            'settings.change.api': 'API Anahtarını Değiştir',
            'settings.export.json': 'JSON İndir',
            'settings.export.excel': 'Excel İndir',
            'settings.preview.excel': 'Excel Önizleme',
            'settings.clear.data': 'Yerel Verileri Temizle',
            'settings.system.info': 'Sistem Bilgileri',
            'settings.app.version': 'Uygulama Versiyonu',
            'settings.last.update': 'Son Güncelleme',
            'settings.db.connection': 'Veritabanı Bağlantısı',
            'settings.printer.connection': 'Yazıcı Durumu',
            'settings.developer.options': 'Geliştirici Seçenekleri',
            'settings.debug.mode': 'Hata Ayıklama Modu',
            'settings.console.logs': 'Konsol Logları',
            'settings.performance.test': 'Performans Testi',
            'settings.save.all': 'Tüm Ayarları Kaydet',
            
            // API Key
            'api.title': 'Supabase API Anahtarı Gerekli',
            'api.description': 'Uygulamayı kullanabilmek için geçerli bir Supabase API anahtarı girmeniz gerekiyor.',
            'api.placeholder': 'Supabase API Anahtarınızı girin',
            'api.help': 'Yardım',
            'api.help.description': 'API anahtarını nasıl alacağınızı bilmiyorsanız "Yardım" butonuna tıklayın.',
            
            // Customer Management
            'customer.management': 'Müşteri Yönetimi',
            'customer.code': 'Müşteri Kodu',
            'customer.name': 'Müşteri Adı',
            'customer.email': 'E-posta',
            'customer.add': 'Müşteri Ekle',
            'customer.existing': 'Mevcut Müşteriler',
            'customer.select': 'Müşteri Seç',
            'customer.placeholder.code': 'Örn: P0005',
            'customer.placeholder.name': 'Müşteri adını girin',
            'customer.placeholder.email': 'E-posta adresini girin',
            
            // Email Reports
            'email.report': 'İş Sonu Raporu Gönder',
            'email.placeholder': 'Rapor gönderilecek e-posta',
            'email.send': 'Rapor Gönder',
            'email.preview': 'Önizleme',
            
            // Quantity Modal
            'quantity.title': 'Adet Girin',
            'quantity.placeholder': 'Adet',
            'quantity.error': 'Geçerli bir adet girin',
            
            // Manual Entry
            'manual.title': 'Manuel Ürün Girişi',
            'manual.product': 'Ürün Adı',
            'manual.quantity': 'Adet',
            'manual.placeholder.product': 'Ürün adını girin',
            'manual.placeholder.quantity': 'Adet girin',
            'manual.add': 'Ekle',
            
            // Extra Products
            'extra.title': 'Extra Ürünler',
            'extra.mat.towel': 'Paspas Havlu',
            'extra.small.towel': 'Minik Havlu',
            'extra.pestemal': 'Peştemal',
            'extra.bathrobe': 'Pornoz',
            'extra.pique': 'Pike',
            'extra.blanket': 'Battaniye',
            'extra.bedspread': 'Yatak Örtüsü',
            'extra.sheer.curtain': 'Tül Perde',
            'extra.fabric.curtain': 'Kumaş Perde',
            'extra.satin.curtain': 'Saten Perde',
            
            // Alerts and Messages
            'alert.customer.selected': 'Müşteri seçildi: {customer}',
            'alert.product.added': '{product}: {quantity} adet eklendi',
            'alert.package.completed': 'Paket başarıyla oluşturuldu!',
            'alert.package.deleted': 'Paket silindi',
            'alert.container.created': 'Konteyner oluşturuldu',
            'alert.container.shipped': 'Konteyner sevk edildi',
            'alert.stock.updated': 'Stok güncellendi: {code} - {quantity} adet',
            'alert.settings.saved': 'Ayarlar kaydedildi',
            'alert.data.exported': 'Veriler dışa aktarıldı',
            'alert.data.cleared': 'Tüm frontend veriler temizlendi',
            'alert.sync.completed': 'Senkronizasyon başarıyla tamamlandı!',
            
            // Footer
            'footer.active.container': 'Aktif Konteyner',
            'footer.total.packages': 'Toplam Paket',
            'footer.copyright': 'ProClean © 2025'
        };
    }

    // English translations
    getEnglishTranslations() {
        return {
            // General
            'app.title': 'ProClean - Professional Laundry Management System',
            'general.save': 'Save',
            'general.cancel': 'Cancel',
            'general.delete': 'Delete',
            'general.edit': 'Edit',
            'general.loading': 'Loading...',
            'general.success': 'Success',
            'general.error': 'Error',
            'general.warning': 'Warning',
            'general.confirm': 'Confirm',
            'general.close': 'Close',
            'general.yes': 'Yes',
            'general.no': 'No',
            'general.online': 'Online',
            'general.offline': 'Offline',
            
            // Login
            'login.title': 'ProClean - Sign In',
            'login.email': 'Email',
            'login.password': 'Password',
            'login.placeholder.email': 'Enter your email address',
            'login.placeholder.password': 'Enter your password',
            'login.button': 'Sign In',
            'login.apiKey': 'Manage API Key',
            'login.error.email': 'Please enter a valid email address',
            'login.error.password': 'Password is required',
            
            // Tabs
            'tabs.packaging': 'Packaging',
            'tabs.shipping': 'Shipping',
            'tabs.stock': 'Stock Query',
            'tabs.reports': 'Reports',
            
            // Packaging
            'packaging.customer.select': 'Customer Selection',
            'packaging.customer.placeholder': 'Select customer...',
            'packaging.personnel': 'Personnel',
            'packaging.personnel.placeholder': 'Select personnel...',
            'packaging.date': 'Date',
            'packaging.customer.management': 'Customer Management',
            'packaging.daily.report': 'End of Day Report',
            'packaging.add.to.container': 'Add to Container',
            'packaging.pending.packages': 'Pending Packages',
            'packaging.package.no': 'Package No',
            'packaging.customer': 'Customer',
            'packaging.product': 'Product',
            'packaging.quantity': 'Quantity',
            'packaging.status': 'Status',
            'packaging.barcode.reading': 'Barcode Reading',
            'packaging.barcode.placeholder': 'Scan or enter barcode',
            'packaging.package.details': 'Package Details',
            'packaging.complete.package': 'Complete Package',
            'packaging.print.label': 'Print Label',
            'packaging.delete': 'Delete',
            'packaging.open.scanner': 'Open Barcode Scanner',
            'packaging.close.scanner': 'Close Barcode Scanner',
            'packaging.scanner.active': 'Barcode scanner mode active',
            'packaging.scanner.inactive': 'Barcode scanner mode closed',
            
            // Products
            'products.large.sheet': 'Large Sheet',
            'products.sheet': 'Sheet',
            'products.large.quilt': 'Large Quilt Cover',
            'products.quilt': 'Quilt Cover',
            'products.large.towel': 'Large Towel',
            'products.towel': 'Towel',
            'products.pillow': 'Pillow',
            'products.pillowcase': 'Pillowcase',
            'products.alez': 'Alees',
            'products.manual.entry': 'Manual Entry',
            'products.extra': 'Extra',
            
            // Status
            'status.stained': 'Stained',
            'status.torn': 'Torn',
            'status.not.removed': 'Not Removed',
            'status.discard': 'Discard',
            'status.pending': 'Pending',
            'status.shipped': 'Shipped',
            'status.in.stock': 'In Stock',
            'status.low.stock': 'Low Stock',
            'status.out.of.stock': 'Out of Stock',
            
            // Shipping
            'shipping.status.filter': 'Status Filter',
            'shipping.filter.all': 'All',
            'shipping.filter.pending': 'Pending',
            'shipping.filter.shipped': 'Shipped',
            'shipping.container.search': 'Search Container',
            'shipping.container.placeholder': 'Container no...',
            'shipping.new.container': 'New Container',
            'shipping.current.container': 'Current Container',
            'shipping.delete.container': 'Delete Container',
            'shipping.container.details': 'Container Details',
            'shipping.ship.container': 'Ship',
            
            // Stock
            'stock.search': 'Search stock...',
            'stock.clear': 'Clear',
            'stock.export': 'Export Stock',
            'stock.code': 'Stock Code',
            'stock.name': 'Product Name',
            'stock.quantity': 'Current Quantity',
            'stock.unit': 'Unit',
            'stock.last.update': 'Last Update',
            'stock.actions': 'Actions',
            'stock.upload.file': 'Upload Stock File',
            'stock.upload.description': 'Select Excel (.xlsx, .xls) or CSV (.csv) file',
            'stock.upload.button': 'Upload File',
            'stock.download.template': 'Download Template',
            
            // Reports
            'reports.title': 'Reports',
            'reports.custom': 'Custom Report',
            'reports.export': 'Export Reports',
            'reports.type': 'Report Type',
            'reports.daily': 'Daily Report',
            'reports.weekly': 'Weekly Report',
            'reports.monthly': 'Monthly Report',
            'reports.custom': 'Custom Report',
            'reports.start.date': 'Start Date',
            'reports.end.date': 'End Date',
            'reports.load': 'Load Reports',
            'reports.date': 'Report Date',
            'reports.package.count': 'Package Count',
            'reports.total.quantity': 'Total Quantity',
            'reports.creator': 'Created By',
            
            // Settings
            'settings.title': 'Settings',
            'settings.general': 'General Settings',
            'settings.theme': 'Theme Mode',
            'settings.theme.light': 'Light',
            'settings.theme.dark': 'Dark',
            'settings.language': 'Language',
            'settings.auto.save': 'Auto Save',
            'settings.printer': 'Printer Settings',
            'settings.printer.scaling': 'Label Size',
            'settings.printer.copies': 'Number of Copies',
            'settings.printer.font': 'Font',
            'settings.printer.font.size': 'Font Size',
            'settings.printer.orientation': 'Orientation',
            'settings.printer.portrait': 'Portrait',
            'settings.printer.landscape': 'Landscape',
            'settings.printer.margin.top': 'Top Margin (mm)',
            'settings.printer.margin.bottom': 'Bottom Margin (mm)',
            'settings.printer.test': 'Printer Test',
            'settings.data.management': 'Data Management',
            'settings.change.api': 'Change API Key',
            'settings.export.json': 'Download JSON',
            'settings.export.excel': 'Download Excel',
            'settings.preview.excel': 'Excel Preview',
            'settings.clear.data': 'Clear Local Data',
            'settings.system.info': 'System Information',
            'settings.app.version': 'App Version',
            'settings.last.update': 'Last Update',
            'settings.db.connection': 'Database Connection',
            'settings.printer.connection': 'Printer Status',
            'settings.developer.options': 'Developer Options',
            'settings.debug.mode': 'Debug Mode',
            'settings.console.logs': 'Console Logs',
            'settings.performance.test': 'Performance Test',
            'settings.save.all': 'Save All Settings',
            
            // API Key
            'api.title': 'Supabase API Key Required',
            'api.description': 'You need to enter a valid Supabase API key to use the application.',
            'api.placeholder': 'Enter your Supabase API Key',
            'api.help': 'Help',
            'api.help.description': 'Click the "Help" button if you don\'t know how to get the API key.',
            
            // Customer Management
            'customer.management': 'Customer Management',
            'customer.code': 'Customer Code',
            'customer.name': 'Customer Name',
            'customer.email': 'Email',
            'customer.add': 'Add Customer',
            'customer.existing': 'Existing Customers',
            'customer.select': 'Select Customer',
            'customer.placeholder.code': 'e.g., P0005',
            'customer.placeholder.name': 'Enter customer name',
            'customer.placeholder.email': 'Enter email address',
            
            // Email Reports
            'email.report': 'Send End of Day Report',
            'email.placeholder': 'Email to send report to',
            'email.send': 'Send Report',
            'email.preview': 'Preview',
            
            // Quantity Modal
            'quantity.title': 'Enter Quantity',
            'quantity.placeholder': 'Quantity',
            'quantity.error': 'Please enter a valid quantity',
            
            // Manual Entry
            'manual.title': 'Manual Product Entry',
            'manual.product': 'Product Name',
            'manual.quantity': 'Quantity',
            'manual.placeholder.product': 'Enter product name',
            'manual.placeholder.quantity': 'Enter quantity',
            'manual.add': 'Add',
            
            // Extra Products
            'extra.title': 'Extra Products',
            'extra.mat.towel': 'Mat Towel',
            'extra.small.towel': 'Small Towel',
            'extra.pestemal': 'Pestemal',
            'extra.bathrobe': 'Bathrobe',
            'extra.pique': 'Pique',
            'extra.blanket': 'Blanket',
            'extra.bedspread': 'Bedspread',
            'extra.sheer.curtain': 'Sheer Curtain',
            'extra.fabric.curtain': 'Fabric Curtain',
            'extra.satin.curtain': 'Satin Curtain',
            
            // Alerts and Messages
            'alert.customer.selected': 'Customer selected: {customer}',
            'alert.product.added': '{product}: {quantity} items added',
            'alert.package.completed': 'Package created successfully!',
            'alert.package.deleted': 'Package deleted',
            'alert.container.created': 'Container created',
            'alert.container.shipped': 'Container shipped',
            'alert.stock.updated': 'Stock updated: {code} - {quantity} items',
            'alert.settings.saved': 'Settings saved',
            'alert.data.exported': 'Data exported',
            'alert.data.cleared': 'All frontend data cleared',
            'alert.sync.completed': 'Sync completed successfully!',
            
            // Footer
            'footer.active.container': 'Active Container',
            'footer.total.packages': 'Total Packages',
            'footer.copyright': 'ProClean © 2025'
        };
    }

    // Initialize language system
    init() {
        if (this.initialized) return;
        
        // Load saved language preference
        const savedLanguage = localStorage.getItem('proclean_language') || 'tr';
        this.setLanguage(savedLanguage);
        
        this.initialized = true;
        console.log('✅ Language system initialized:', this.currentLanguage);
    }

    // Set current language
    setLanguage(language) {
        if (!this.translations[language]) {
            console.warn('Language not supported:', language);
            return;
        }
        
        this.currentLanguage = language;
        localStorage.setItem('proclean_language', language);
        
        // Apply language to entire UI
        this.applyLanguageToUI();
        
        console.log('🌐 Language changed to:', language);
    }

    // Get translation
    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage][key] || 
                           this.translations['tr'][key] || 
                           key;
        
        // Replace parameters in translation
        return translation.replace(/{(\w+)}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    // Apply language to entire UI
    applyLanguageToUI() {
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
        
        // Update all translatable elements
        this.updateElementText('[data-i18n]');
        this.updateElementText('[data-translate]');
        this.updateElementPlaceholders();
        this.updateElementTitles();
        
        // Update specific elements by ID/class
        this.updateSpecificElements();
        
        console.log('🔄 UI language updated to:', this.currentLanguage);
    }

    // Update elements with data-i18n attribute
    updateElementText(selector) {
        document.querySelectorAll(selector).forEach(element => {
            const key = element.getAttribute('data-i18n') || element.getAttribute('data-translate');
            if (key) {
                const text = this.t(key);
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = text;
                } else {
                    element.textContent = text;
                }
            }
        });
    }

    // Update placeholder texts
    updateElementPlaceholders() {
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                element.placeholder = this.t(key);
            }
        });
    }

    // Update title attributes
    updateElementTitles() {
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (key) {
                element.title = this.t(key);
            }
        });
    }

    // Update specific hardcoded elements
    updateSpecificElements() {
        // App title
        const appTitle = document.querySelector('.app-title, [data-app-title]');
        if (appTitle) {
            appTitle.textContent = this.t('app.title');
        }

        // Tab texts
        const tabs = {
            'packaging': 'tabs.packaging',
            'shipping': 'tabs.shipping',
            'stock': 'tabs.stock',
            'reports': 'tabs.reports'
        };

        Object.entries(tabs).forEach(([tabName, translationKey]) => {
            const tab = document.querySelector(`[data-tab="${tabName}"]`);
            if (tab) {
                tab.textContent = this.t(translationKey);
            }
        });

        // Update button texts
        this.updateButtonTexts();
        
        // Update modal titles
        this.updateModalTitles();
    }

    // Update button texts
    updateButtonTexts() {
        const buttonSelectors = {
            '.btn-primary': {
                'loginBtn': 'login.button',
                'completePackage': 'packaging.complete.package',
                'printBarcodeBtn': 'packaging.print.label'
            }
        };

        // You can add more specific button updates here
    }

    // Update modal titles
    updateModalTitles() {
        const modalTitles = {
            'customerModal': 'customer.select',
            'allCustomersModal': 'customer.management',
            'emailModal': 'email.report',
            'settingsModal': 'settings.title'
        };

        Object.entries(modalTitles).forEach(([modalId, translationKey]) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const title = modal.querySelector('h2, h3');
                if (title) {
                    title.textContent = this.t(translationKey);
                }
            }
        });
    }

    // Get available languages
    getAvailableLanguages() {
        return [
            { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
            { code: 'en', name: 'English', flag: '🇺🇸' }
        ];
    }

    // Get current language info
    getCurrentLanguageInfo() {
        const languages = this.getAvailableLanguages();
        return languages.find(lang => lang.code === this.currentLanguage) || languages[0];
    }

    // Add dynamic translation (for runtime generated content)
    translateDynamicText(element, key, params = {}) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.textContent = this.t(key, params);
        }
    }

    // Translate alert messages
    translateAlert(message, params = {}) {
        // Check if message is a translation key
        if (this.translations[this.currentLanguage][message]) {
            return this.t(message, params);
        }
        return message; // Return original message if not found
    }
}

// Create global instance
const languageManager = new LanguageManager();

// Make it available globally
window.languageManager = languageManager;
window.t = (key, params) => languageManager.t(key, params);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    languageManager.init();
});

console.log('✅ Language manager loaded');
