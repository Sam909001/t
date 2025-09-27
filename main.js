const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// ------------------- Multi-Monitor Windows -------------------
let windows = []; // Keep references to windows

function createMonitorWindow(monitorIndex) {
    const displays = screen.getAllDisplays();
    const display = displays[monitorIndex] || displays[0];

    const win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');
    win.monitorId = monitorIndex;
    windows.push(win);
}

app.whenReady().then(() => {
    // Adjust number of monitors
    createMonitorWindow(0);
    createMonitorWindow(1);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMonitorWindow(0);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ------------------- Excel Helpers -------------------

function getExcelPath(monitorId) {
    const today = new Date().toISOString().split('T')[0]; // daily file
    return path.join(__dirname, `packages_monitor_${monitorId}_${today}.xlsx`);
}

function readExcel(monitorId) {
    const filePath = getExcelPath(monitorId);
    if (fs.existsSync(filePath)) {
        const workbook = XLSX.readFile(filePath);
        const ws = workbook.Sheets['Packages'];
        if (ws) return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
    return [];
}

function writeExcel(monitorId, data) {
    const filePath = getExcelPath(monitorId);
    const ws = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'Packages');
    XLSX.writeFile(workbook, filePath);
}

// ------------------- IPC Handlers -------------------

// 1️⃣ Add a new package
ipcMain.handle('add-package', async (event, packageData) => {
    const monitorId = packageData.monitorId;
    const existing = readExcel(monitorId);
    existing.push({
        Date: new Date().toLocaleString(),
        PackageNo: packageData.packageNo,
        Customer: packageData.customer,
        Status: packageData.status
    });
    writeExcel(monitorId, existing);
    return true;
});

// 2️⃣ Fetch packages for a monitor
ipcMain.handle('fetch-packages', async (event, monitorId) => {
    return readExcel(monitorId);
});

// 3️⃣ Print barcode (silent)
ipcMain.handle('print-barcode', async (event, htmlContent) => {
    return new Promise((resolve) => {
        const printWindow = new BrowserWindow({
            show: false,
            width: 800,
            height: 600,
            webPreferences: { nodeIntegration: false, contextIsolation: false }
        });

        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

        printWindow.loadURL(dataUrl).then(() => {
            setTimeout(() => {
                printWindow.webContents.print({
                    silent: true,
                    printBackground: true,
                    margins: { marginType: 'none' }
                }, (success, errorType) => {
                    setTimeout(() => { if (!printWindow.isDestroyed()) printWindow.destroy(); }, 100);
                    resolve(success);
                });
            }, 500);
        }).catch(err => {
            console.error('❌ Print load error:', err);
            if (!printWindow.isDestroyed()) printWindow.destroy();
            resolve(false);
        });
    });
});
