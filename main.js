const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile('index.html');
});

/// One-click print handler
ipcMain.handle('print-barcode', (event, htmlContent) => {
  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        webSecurity: false // Necessary for data URLs in some contexts
      }
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    printWindow.loadURL(dataUrl);

    printWindow.webContents.on('did-finish-load', () => {
      console.log('Content finished loading, initiating print.');

      const options = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'none' }, // No margins for labels
        deviceName: "Argox OS-214EX PPLA" // ⚠️ must match your Windows printer name EXACTLY
      };

      printWindow.webContents.print(options, (success, errorType) => {
        console.log(`Print callback - Success: ${success}, Error: ${errorType}`);

        if (!printWindow.isDestroyed()) {
          printWindow.destroy();
        }

        if (success) {
          resolve(true);
        } else {
          console.error('Print failed:', errorType);
          reject(new Error(errorType || 'Print failed for an unknown reason.'));
        }
      });
    });

    printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load print content:', errorDescription);
      if (!printWindow.isDestroyed()) {
        printWindow.destroy();
      }
      reject(new Error('Failed to load content for printing.'));
    });
  });
});
