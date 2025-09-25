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
    // Create completely invisible window
    const printWindow = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      x: -10000, // Far off-screen
      y: -10000,
      skipTaskbar: true, // Don't show in taskbar
      minimizable: false,
      maximizable: false,
      resizable: false,
      frame: false, // Remove window frame
      transparent: true, // Make transparent
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        offscreen: true, // Render off-screen
        backgroundThrottling: false
      }
    });

    // Ensure window is completely hidden
    printWindow.setVisibleOnAllWorkspaces(false);
    printWindow.setSkipTaskbar(true);
    
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    
    printWindow.loadURL(dataUrl)
      .then(() => {
        printWindow.webContents.once('did-finish-load', () => {
          // Wait longer for content to fully render
          setTimeout(() => {
            // Get available printers first
            printWindow.webContents.getPrintersAsync().then((printers) => {
              const defaultPrinter = printers.find(p => p.isDefault) || printers[0];
              
              if (defaultPrinter) {
                // Print with more specific options
                printWindow.webContents.print({
                  silent: true,
                  printBackground: true,
                  color: false, // Black and white for labels
                  margins: {
                    marginType: 'none'
                  },
                  pageSize: 'A4',
                  scaleFactor: 100,
                  deviceName: defaultPrinter.name // Specify printer
                }, (success, errorType) => {
                  console.log(success ? 'Print successful' : `Print failed: ${errorType}`);
                  
                  // Immediate cleanup
                  setImmediate(() => {
                    if (!printWindow.isDestroyed()) {
                      printWindow.destroy();
                    }
                  });
                  
                  resolve(success);
                });
              } else {
                console.error('No printers available');
                if (!printWindow.isDestroyed()) {
                  printWindow.destroy();
                }
                resolve(false);
              }
            }).catch(error => {
              console.error('Printer detection failed:', error);
              // Fallback to basic print
              printWindow.webContents.print({ silent: true }, (success) => {
                if (!printWindow.isDestroyed()) {
                  printWindow.destroy();
                }
                resolve(success);
              });
            });
          }, 1000); // Increased wait time
        });
        
        // Timeout fallback
        setTimeout(() => {
          if (!printWindow.isDestroyed()) {
            console.error('Print timeout - destroying window');
            printWindow.destroy();
            resolve(false);
          }
        }, 10000);
      })
      .catch(error => {
        console.error('Load error:', error);
        if (!printWindow.isDestroyed()) {
          printWindow.destroy();
        }
        resolve(false);
      });
  });
});

// Alternative: Print using main window (no second window)
ipcMain.handle('print-barcode-main', async (event, htmlContent) => {
  return new Promise((resolve) => {
    // Use the main window's webContents
    const originalContent = mainWindow.webContents.getURL();
    
    // Temporarily load print content
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    
    mainWindow.webContents.loadURL(dataUrl).then(() => {
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          mainWindow.webContents.print({
            silent: true,
            printBackground: true
          }, (success, errorType) => {
            // Restore original content
            if (originalContent.startsWith('file://')) {
              mainWindow.loadFile('index.html');
            } else {
              mainWindow.webContents.loadURL(originalContent);
            }
            
            resolve(success);
          });
        }, 500);
      });
    });
  });
});
