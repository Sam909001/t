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
      show: false,               // don’t show window
      autoHideMenuBar: true,     // no menu bar
      frame: false,              // frameless
      webPreferences: {
        sandbox: true,
        contextIsolation: true
      }
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    printWindow.loadURL(dataUrl);

    printWindow.webContents.on('did-finish-load', () => {
      console.log('Barcode content loaded, sending to printer...');

      const options = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'none' },
        deviceName: "Argox OS-214EX PPLA" // must exactly match your printer name
      };

      printWindow.webContents.print(options).then(success => {
        if (success) {
          console.log("✅ Print job sent silently");
          resolve(true);
        } else {
          reject(new Error("❌ Print job failed"));
        }

        if (!printWindow.isDestroyed()) {
          printWindow.close();  // close instead of destroy to avoid flicker
        }
      }).catch(err => {
        console.error("❌ Print error:", err);
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
        reject(err);
      });
    });

    printWindow.on('ready-to-show', e => {
      // Force it to stay hidden
      e.preventDefault();
    });
  });
});
