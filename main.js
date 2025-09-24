const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,  // safe
            nodeIntegration: false
        }
    });

    win.loadFile('index.html'); // load your web app HTML
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ----------------- PRINT HANDLER -----------------
ipcMain.handle('print-barcode', async (event, htmlContent) => {
    const printWin = new BrowserWindow({ show: false });
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    printWin.webContents.on('did-finish-load', () => {
        printWin.webContents.print(
            { silent: true, printBackground: true },
            (success, errorType) => {
                if (!success) console.error('Print failed:', errorType);
                printWin.close();
            }
        );
    });
});
