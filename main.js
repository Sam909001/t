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

// Enhanced one-click print handler
ipcMain.handle('print-barcode', async (event, htmlContent) => {
  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      x: -2000,
      y: -2000,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false,
        webSecurity: false
      }
    });

    printWindow.hide();
    
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    
    printWindow.loadURL(dataUrl).then(() => {
      printWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          printWindow.webContents.print({
            silent: true, // Change to false if you want to see print dialog
            printBackground: true
          }, (success) => {
            setTimeout(() => {
              if (!printWindow.isDestroyed()) {
                printWindow.destroy();
              }
            }, 100);
            resolve(success);
          });
        }, 1000);
      });
    }).catch(error => {
      console.error('Print error:', error);
      if (!printWindow.isDestroyed()) {
        printWindow.destroy();
      }
      resolve(false);
    });
  });
});
