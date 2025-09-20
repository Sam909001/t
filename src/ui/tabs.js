// src/ui/tabs.js
// Tab navigation management
class TabManager {
    constructor() {
        this.activeTab = 'packaging';
        this.tabs = new Map();
        this.tabHistory = [];
    }

    // Initialize tab manager
    init() {
        this.setupTabs();
        this.setupTabEventHandlers();
        console.log('TabManager initialized');
    }

    // Setup tabs
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
            const tabId = btn.dataset.tab;
            if (tabId) {
                this.tabs.set(tabId, {
                    button: btn,
                    content: document.getElementById(tabId)
                });
            }
        });

        // Show initial tab
        this.showTab(this.activeTab);
    }

    // Setup tab event handlers
    setupTabEventHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabId = e.target.dataset.tab;
                if (tabId) {
                    this.showTab(tabId);
                }
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabIds = Array.from(this.tabs.keys());
                if (tabIds[tabIndex]) {
                    this.showTab(tabIds[tabIndex]);
                }
            }
        });
    }

    // Show specific tab
    showTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.error(`Tab ${tabId} not found`);
            return;
        }

        // Hide all tabs
        this.tabs.forEach((tabData, id) => {
            tabData.button.classList.remove('active');
            if (tabData.content) {
                tabData.content.style.display = 'none';
            }
        });

        // Show selected tab
        tab.button.classList.add('active');
        if (tab.content) {
            tab.content.style.display = 'block';
        }

        // Update active tab
        const previousTab = this.activeTab;
        this.activeTab = tabId;

        // Add to history
        if (previousTab !== tabId) {
            this.tabHistory.push(previousTab);
            if (this.tabHistory.length > 10) {
                this.tabHistory.shift();
            }
        }

        // Trigger tab change event
        this.onTabChange(tabId, previousTab);

        console.log(`Switched to tab: ${tabId}`);
    }

    // Handle tab change
    onTabChange(newTab, previousTab) {
        // Refresh data when switching to certain tabs
        switch (newTab) {
            case 'customers':
                if (typeof CustomerManager !== 'undefined') {
                    CustomerManager.populateAllCustomersList();
                }
                break;
            case 'stock':
                if (typeof StockManager !== 'undefined') {
                    StockManager.populateStockTable();
                }
                break;
            case 'reports':
                if (typeof ReportsManager !== 'undefined') {
                    ReportsManager.setupReportInputs();
                }
                break;
        }
    }

    // Get active tab
    getActiveTab() {
        return this.activeTab;
    }

    // Go back to previous tab
    goBack() {
        if (this.tabHistory.length > 0) {
            const previousTab = this.tabHistory.pop();
            this.showTab(previousTab);
        }
    }
}

// Create global instance
window.TabManager = new TabManager();
