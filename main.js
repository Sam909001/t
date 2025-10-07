const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

let mainWindow;

// Simple storage using JSON file (built-in, no extra packages)
const storePath = path.join(app.getPath('userData'), 'proclean-config.json');

async function getStore() {
    try {
        const data = await fs.readFile(storePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function saveStore(data) {
    await fs.writeFile(storePath, JSON.stringify(data, null, 2));
}

// ------------------- Printing -------------------
function doSilentPrint(htmlContent, printerName) {
    return new Promise((resolve, reject) => {
        const printWindow = new BrowserWindow({ 
            show: false,
            webPreferences: { 
                contextIsolation: false, 
                nodeIntegration: false,
                webSecurity: false
            }
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        printWindow.webContents.on('did-finish-load', () => {
            printWindow.webContents.print({ silent: true, deviceName: printerName || '', printBackground: true }, (success, failureReason) => {
                printWindow.close();
                success ? resolve(true) : reject(new Error(failureReason || 'Printing failed'));
            });
        });

        printWindow.webContents.on('did-fail-load', () => {
            printWindow.close();
            reject(new Error('Failed to load print content'));
        });
    });
}

// ------------------- IPC Handlers -------------------
function registerIpcHandlers() {

    // --- Simple Storage (using JSON file) ---
    ipcMain.handle('store-set', async (event, key, value) => {
        try {
            const store = await getStore();
            store[key] = value;
            await saveStore(store);
            return true;
        } catch (err) {
            console.error('Store set error:', err);
            return false;
        }
    });

    ipcMain.handle('store-get', async (event, key) => {
        try {
            const store = await getStore();
            return store[key];
        } catch (err) {
            console.error('Store get error:', err);
            return null;
        }
    });

    ipcMain.handle('store-delete', async (event, key) => {
        try {
            const store = await getStore();
            delete store[key];
            await saveStore(store);
            return true;
        } catch (err) {
            console.error('Store delete error:', err);
            return false;
        }
    });

    // --- Printing ---
    ipcMain.handle('get-printers', async () => mainWindow ? await mainWindow.webContents.getPrinters() : []);
    ipcMain.handle('print-to-specific-printer', (e, htmlContent, printerName) => doSilentPrint(htmlContent, printerName));
    ipcMain.handle('print-barcode', (e, htmlContent) => doSilentPrint(htmlContent, ''));
    ipcMain.handle('test-print', (e, htmlContent, printerName) => doSilentPrint(htmlContent, printerName));
    ipcMain.handle('debug-printers', async () => {
        if (!mainWindow) return [];
        const printers = await mainWindow.webContents.getPrinters();
        printers.forEach(p => console.log(`🖨️ ${p.name} (${p.status})`));
        return printers;
    });

    // --- Network connection test ---
    ipcMain.handle('test-network-connection', async () => {
        const networkPath = '\\\\MAIN-PC\\SharedReports';
        try {
            await fs.access(networkPath);
            return { success: true, message: 'Network share is accessible', path: networkPath };
        } catch (err) {
            return { success: false, message: 'Network share not accessible', error: err.message, path: networkPath };
        }
    });

    // --- Open file location ---
    ipcMain.handle('open-file-location', async (e, filePath) => {
        try { await shell.showItemInFolder(filePath); return true; }
        catch { return false; }
    });

    // --- Save Excel to network share with fallback ---
    ipcMain.handle('save-excel-to-network', async (e, excelData, filename) => {
        let excelBuffer;
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Rapor');
            if (excelData?.length) {
                const headers = Object.keys(excelData[0]);
                worksheet.addRow(headers);
                excelData.forEach(row => worksheet.addRow(headers.map(h => row[h] || '')));
            } else worksheet.addRow(['No data available']);

            excelBuffer = await workbook.xlsx.writeBuffer();

            // Network drive mapping
            const networkPath = '\\\\MAIN-PC\\SharedReports';
            const driveLetter = 'Z:';
            const username = process.env.NETWORK_USER || 'ProcleanReports';
            const password = process.env.NETWORK_PASS || '8823';
            const fullPath = path.join(driveLetter, filename);

            await execAsync(`net use ${driveLetter} ${networkPath} /user:${username} ${password} /persistent:no`);
            await fs.writeFile(fullPath, excelBuffer);
            await execAsync(`net use ${driveLetter} /delete /y`);

            return { success: true, path: fullPath };
        } catch (err) {
            console.error('❌ Network save failed:', err);
            try {
                const downloadsPath = app.getPath('downloads');
                const fallbackPath = path.join(downloadsPath, filename);
                await fs.writeFile(fallbackPath, excelBuffer);
                return { success: false, manualTransferRequired: true, localPath: fallbackPath, networkPath: '\\\\MAIN-PC\\SharedReports', error: err.message };
            } catch (fallbackErr) {
                return { success: false, manualTransferRequired: true, error: `${err.message} / ${fallbackErr.message}` };
            }
        }
    });

    // --- Save Excel locally only ---
    ipcMain.handle('save-excel-locally', async (e, excelData, filename) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Rapor');
            if (excelData?.length) {
                const headers = Object.keys(excelData[0]);
                worksheet.addRow(headers);
                excelData.forEach(row => worksheet.addRow(headers.map(h => row[h] || '')));
            } else worksheet.addRow(['No data available']);
            const localPath = path.join(app.getPath('downloads'), filename);
            await fs.writeFile(localPath, await workbook.xlsx.writeBuffer());
            return { success: true, path: localPath, manualTransferRequired: true, networkPath: '\\\\MAIN-PC\\SharedReports' };
        } catch (err) {
            return { success: false, error: err.message, manualTransferRequired: true };
        }
    });
}

// ------------------- Window -------------------
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // Changed to true for security
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // Added to prevent security restrictions
            allowRunningInsecureContent: true // Added for development
        },
        show: false, // Don't show until ready
        titleBarStyle: 'default'
    });
    
    // Load the app
    mainWindow.loadFile('index.html');
    
    // Show window when ready to prevent visual glitches
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });
    
    registerIpcHandlers();
    
    // Development tools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });
}

// ------------------- App events -------------------
app.whenReady().then(() => {
    // Add GPU and performance flags to prevent freezing
    app.commandLine.appendSwitch('--enable-gpu-rasterization');
    app.commandLine.appendSwitch('--enable-zero-copy');
    app.commandLine.appendSwitch('--disable-background-timer-throttling');
    app.commandLine.appendSwitch('--disable-renderer-backgrounding');
    
    createWindow();
});

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow(); 
});

app.on('before-quit', () => console.log('🔄 Application shutting down...'));

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
        }
    });
});
