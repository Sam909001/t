// src/database/index.js
// Main database entry point - exports DatabaseManager
class DatabaseManager {
    constructor() {
        this.isOnline = false;
        this.apiKey = '';
        this.cache = new Map();
        this.tables = {
            customers: [],
            packages: [],
            stock: [],
            containers: []
        };
    }

    // Initialize database
    init() {
        this.loadFromLocalStorage();
        console.log('DatabaseManager initialized');
        return Promise.resolve();
    }

    // Check if database is ready
    isReady() {
        return true; // Always ready with local storage
    }

    // Load data from localStorage
    loadFromLocalStorage() {
        try {
            Object.keys(this.tables).forEach(table => {
                const data = localStorage.getItem(`proclean_${table}`);
                if (data) {
                    this.tables[table] = JSON.parse(data);
                }
            });
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    // Save data to localStorage
    saveToLocalStorage(table) {
        try {
            localStorage.setItem(`proclean_${table}`, JSON.stringify(this.tables[table]));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Generic query method
    async query(table, operation, options = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    switch (operation) {
                        case 'select':
                            resolve(this.select(table, options));
                            break;
                        case 'insert':
                            resolve(this.insert(table, options));
                            break;
                        case 'update':
                            resolve(this.update(table, options));
                            break;
                        case 'delete':
                            resolve(this.delete(table, options));
                            break;
                        default:
                            resolve([]);
                    }
                } catch (error) {
                    console.error('Database query error:', error);
                    resolve([]);
                }
            }, 50); // Simulate async operation
        });
    }

    // Select operation
    select(table, options = {}) {
        let data = [...(this.tables[table] || [])];
        
        if (options.filter) {
            data = data.filter(item => {
                return Object.entries(options.filter).every(([key, value]) => {
                    return item[key] === value;
                });
            });
        }
        
        if (options.order) {
            const { column, ascending = true } = options.order;
            data.sort((a, b) => {
                const aVal = a[column];
                const bVal = b[column];
                return ascending ? 
                    (aVal > bVal ? 1 : -1) : 
                    (aVal < bVal ? 1 : -1);
            });
        }
        
        return data;
    }

    // Insert operation
    insert(table, options = {}) {
        const newItem = {
            id: this.generateId(),
            ...options.data,
            created_at: new Date().toISOString()
        };
        
        this.tables[table].push(newItem);
        this.saveToLocalStorage(table);
        
        return [newItem];
    }

    // Update operation
    update(table, options = {}) {
        const { data, filter } = options;
        let updated = [];
        
        this.tables[table] = this.tables[table].map(item => {
            const matches = Object.entries(filter).every(([key, value]) => {
                return item[key] === value;
            });
            
            if (matches) {
                const updatedItem = {
                    ...item,
                    ...data,
                    updated_at: new Date().toISOString()
                };
                updated.push(updatedItem);
                return updatedItem;
            }
            return item;
        });
        
        this.saveToLocalStorage(table);
        return updated;
    }

    // Delete operation
    delete(table, options = {}) {
        const { filter } = options;
        const originalLength = this.tables[table].length;
        
        this.tables[table] = this.tables[table].filter(item => {
            return !Object.entries(filter).every(([key, value]) => {
                return item[key] === value;
            });
        });
        
        this.saveToLocalStorage(table);
        return { deleted: originalLength - this.tables[table].length };
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Create global instance
window.DatabaseManager = new DatabaseManager();
