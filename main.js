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
ipcMain.handle('print-barcode', async (event, htmlContent) => {
  console.log('Print request received');
  
  // Create a completely hidden window
  const printWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  try {
    // Use data URL to load content
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    console.log('Loading print content...');
    
    await printWindow.loadURL(dataUrl);
    console.log('Content loaded, starting print...');

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Print with silent option to avoid dialog (if desired)
    const options = {
      silent: true, // Set to true if you want to print without dialog
      printBackground: true,
      margins: {
        marginType: 'custom',
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    };

    printWindow.webContents.print(options, (success, errorType) => {
      console.log('Print callback:', success, errorType);
      
      if (!success) {
        console.error('Print failed:', errorType);
        event.sender.send('print-error', errorType);
      } else {
        console.log('Print successful');
      }
      
      // Close the window after printing
      setTimeout(() => {
        if (!printWindow.isDestroyed()) {
          printWindow.destroy();
        }
      }, 1000);
    });

    return true;

  } catch (error) {
    console.error('Error in print process:', error);
    if (!printWindow.isDestroyed()) {
      printWindow.destroy();
    }
    return false;
  }
});
