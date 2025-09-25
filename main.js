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
  try {
    // Use the main window's webContents to print instead of creating a new window
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Execute JavaScript in the renderer to create a print-friendly version
      await mainWindow.webContents.executeJavaScript(`
        // Create a temporary hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.srcdoc = \`${htmlContent.replace(/`/g, '\\`')}\`;
        
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        };
      `);
      
      return true;
    }
  } catch (error) {
    console.error('Print error:', error);
    return false;
  }
});
