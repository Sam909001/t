const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,  // allows require() in renderer.js
            contextIsolation: false
        }
    });

    win.loadFile('index.html'); // your web app's HTML
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


const { ipcMain } = require('electron');

// Handle direct printing request from frontend
ipcMain.handle('print-barcode', async (event, htmlContent) => {
  const { BrowserWindow } = require('electron');
  const win = new BrowserWindow({ show: false }); // hidden window
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  win.webContents.on('did-finish-load', () => {
    win.webContents.print({ silent: true, printBackground: true }, (success, errorType) => {
      if (!success) console.log('Print failed:', errorType);
      win.close();
    });
  });
});

