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

// One-click print handler
ipcMain.handle('print-barcode', async (event, htmlContent) => {
  return new Promise((resolve) => {
    // Create a completely hidden window
    const printWindow = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      x: -2000, // Position far off-screen
      y: -2000,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false
      }
    });

    // Ensure window stays hidden
    printWindow.setAlwaysOnTop(false);
    printWindow.hide();

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    
    printWindow.loadURL(dataUrl).then(() => {
      // Wait for content to load completely
      printWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          // Print with silent: true to avoid print dialog (one-click printing)
          // Change to silent: false if you want to see the print dialog
          printWindow.webContents.print({
            silent: true, // Set to true for automatic printing without dialog
            printBackground: true,
            margins: {
              marginType: 'none'
            }
          }, (success, errorType) => {
            if (success) {
              console.log('Print successful');
              resolve(true);
            } else {
              console.error('Print failed:', errorType);
              resolve(false);
            }
            
            // Close the window immediately
            setTimeout(() => {
              if (!printWindow.isDestroyed()) {
                printWindow.destroy();
              }
            }, 100);
          });
        }, 500);
      });
    }).catch(error => {
      console.error('Load error:', error);
      if (!printWindow.isDestroyed()) {
        printWindow.destroy();
      }
      resolve(false);
    });
  });
});
