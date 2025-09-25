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
// ----------------- DIRECT ONE-CLICK PRINT -----------------
ipcMain.handle('print-barcode', async (event, htmlContent) => {
  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,                // hidden window
      webPreferences: {
        offscreen: true,          // offscreen = never visible
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    printWindow.loadURL(dataUrl);

    printWindow.webContents.on('did-finish-load', () => {
      console.log('Loaded print content, starting silent print...');

      // Choose your printer (use console.log in app to see available names)
      const options = {
        silent: true,
        printBackground: true,
        deviceName: "Argox OS-214 plus series PPLA",  // change to your exact printer name
        margins: { marginType: 'none' }
      };

      printWindow.webContents.print(options, (success, errorType) => {
        if (!printWindow.isDestroyed()) {
          printWindow.destroy();
        }

        if (success) {
          console.log("✅ Silent print successful");
          resolve(true);
        } else {
          console.error("❌ Silent print failed:", errorType);
          reject(new Error(errorType || "Print failed"));
        }
      });
    });

    printWindow.webContents.on('did-fail-load', (e, code, desc) => {
      console.error("❌ Failed to load print content:", desc);
      if (!printWindow.isDestroyed()) {
        printWindow.destroy();
      }
      reject(new Error("Failed to load content for printing."));
    });
  });
});
