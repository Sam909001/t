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
    console.log('🖨️ Print request received in main process');
    
    return new Promise((resolve) => {
        // Create a completely hidden window
        const printWindow = new BrowserWindow({
            show: false,
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: false,
                webSecurity: false
            }
        });

        // Ensure window stays completely hidden
        printWindow.hide();
        printWindow.setAlwaysOnTop(false);

        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        
        console.log('Loading print content...');
        
        printWindow.loadURL(dataUrl).then(() => {
            console.log('Content loaded, waiting for rendering...');
            
            // Wait for content to render completely
            setTimeout(() => {
                console.log('Starting print...');
                
                // Print with silent mode (true one-click printing)
                printWindow.webContents.print({
                    silent: true, // no dialog
                    printBackground: true,
                    margins: { marginType: 'none' },
                    // 👇 Change this to the exact name of your printer
                    deviceName: "Argox OS-214EX PPLA"
                }, (success, errorType) => {
                    console.log('Print completed:', success, errorType);
                    
                    // Immediately destroy the window
                    setTimeout(() => {
                        if (!printWindow.isDestroyed()) {
                            printWindow.destroy();
                        }
                    }, 100);
                    
                    resolve(success);
                });
            }, 1000); // wait to ensure render
        }).catch(error => {
            console.error('❌ Load error:', error);
            if (!printWindow.isDestroyed()) {
                printWindow.destroy();
            }
            resolve(false);
        });
    });
});
