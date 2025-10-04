/**
 * Universal Storage Wrapper
 * Works in both browser (localStorage) and Electron (electronAPI)
 * Automatically detects environment and uses appropriate storage method
 */

const StorageManager = {
  // Check if running in Electron
  isElectron() {
    return typeof window !== 'undefined' && window.electronAPI;
  },

  // Set item
  async setItem(key, value) {
    try {
      const stringValue = JSON.stringify(value);
      
      if (this.isElectron()) {
        // Use Electron secure storage
        await window.electronAPI.storeSet(key, stringValue);
      } else {
        // Use browser localStorage
        localStorage.setItem(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Storage setItem error:', error);
      return false;
    }
  },

  // Get item
  async getItem(key) {
    try {
      let stringValue;
      
      if (this.isElectron()) {
        // Use Electron secure storage
        stringValue = await window.electronAPI.storeGet(key);
      } else {
        // Use browser localStorage
        stringValue = localStorage.getItem(key);
      }
      
      return stringValue ? JSON.parse(stringValue) : null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  // Remove item
  async removeItem(key) {
    try {
      if (this.isElectron()) {
        // Use Electron secure storage
        await window.electronAPI.storeDelete(key);
      } else {
        // Use browser localStorage
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error('Storage removeItem error:', error);
      return false;
    }
  },

  // Clear all storage
  async clear() {
    try {
      if (this.isElectron()) {
        // Clear Electron storage (implement if needed)
        // You may need to add a clearAll handler in main.js
        console.warn('Clear all not implemented for Electron storage');
      } else {
        // Clear browser localStorage
        localStorage.clear();
      }
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
};

// Workstation-specific storage helpers
const WorkstationStorage = {
  // Save workstation name
  async saveWorkstation(name) {
    return await StorageManager.setItem('workstation_name', name);
  },

  // Get workstation name
  async getWorkstation() {
    return await StorageManager.getItem('workstation_name');
  },

  // Save authentication data
  async saveAuth(authData) {
    return await StorageManager.setItem('auth_data', authData);
  },

  // Get authentication data
  async getAuth() {
    return await StorageManager.getItem('auth_data');
  },

  // Clear authentication (logout)
  async clearAuth() {
    return await StorageManager.removeItem('auth_data');
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const authData = await this.getAuth();
    return authData !== null && authData !== undefined;
  }
};

// Export for use in your app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, WorkstationStorage };
}
