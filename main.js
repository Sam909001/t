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
  // Create hidden window
  const printWindow = new BrowserWindow({ show: false });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  printWindow.webContents.print({}, (success, errorType) => {
    if (!success) console.error('Print failed:', errorType);
    printWindow.close();
  });

  return true;
});
