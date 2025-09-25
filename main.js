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
  // Create a truly hidden window with better configuration
  const printWindow = new BrowserWindow({
    show: false,
    width: 1,
    height: 1,
    x: -1000,
    y: -1000,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true // This prevents any visual rendering
    }
  });

  try {
    // Use a data URL to load the content
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    
    // Wait for content to load completely
    await printWindow.loadURL(dataUrl);
    
    // Wait a bit more to ensure content is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Print with error handling
    printWindow.webContents.print({}, (success, errorType) => {
      if (!success) {
        console.error('Print failed:', errorType);
        // Send error back to renderer
        event.sender.send('print-error', errorType);
      } else {
        console.log('Print successful');
      }
      // Always close the window
      setTimeout(() => {
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
      }, 100);
    });
    
  } catch (error) {
    console.error('Error in print process:', error);
    printWindow.close();
    event.sender.send('print-error', error.message);
  }

  return true;
});
