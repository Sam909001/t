const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ------------------- SQLite Connection -------------------
const dbPath = path.join(__dirname, 'mydatabase.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ SQLite DB Error:', err);
    else console.log('✅ SQLite DB connected at', dbPath);
});

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
    windows.push({ window: win, monitorId: monitorIndex });
}

app.whenReady().then(() => {
    // Create a window for each monitor (adjust number as needed)
    createMonitorWindow(0);
    createMonitorWindow(1);
    createMonitorWindow(2);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMonitorWindow(0);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ------------------- IPC Handlers -------------------

// 1️⃣ Silent One-Click Printing
ipcMain.handle('print-barcode', async (event, htmlContent) => {
    console.log('🖨️ Print request received in main process');

    return new Promise((resolve) => {
        const printWindow = new BrowserWindow({
            show: false,
            width: 800,
            height: 600,
            webPreferences: { nodeIntegration: false, contextIsolation: false, webSecurity: false }
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
                    console.log('Print completed:', success, errorType);
                    resolve(success);
                });
            }, 1000); // Wait for rendering
        }).catch(err => {
            console.error('❌ Load error:', err);
            if (!printWindow.isDestroyed()) printWindow.destroy();
            resolve(false);
        });
    });
});

// 2️⃣ Fetch Containers (per monitor)
ipcMain.handle('fetchContainers', async (event, { monitorId, filter = 'all', page = 0, pageSize = 20 }) => {
    const offset = page * pageSize;
    let query = 'SELECT * FROM containers';
    const params = [];

    if (filter !== 'all') {
        query += ' WHERE status = ?';
        params.push(filter);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else {
                // Optional: filter per monitor if container has monitor_id column
                const filtered = rows.filter(r => r.monitor_id === monitorId || r.monitor_id === null || r.monitor_id === undefined);
                resolve(filtered);
            }
        });
    });
});

// 3️⃣ Fetch Packages for Containers (per monitor)
ipcMain.handle('fetchPackagesForContainers', async (event, { containerIds, monitorId }) => {
    if (!containerIds || containerIds.length === 0) return [];
    const query = `
        SELECT p.id, p.package_no, p.total_quantity, p.container_id,
               c.name AS customer_name, c.code AS customer_code
        FROM packages p
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.container_id IN (${containerIds.map(() => '?').join(',')})
        AND (p.monitor_id = ? OR p.monitor_id IS NULL)
    `;
    const params = [...containerIds, monitorId];

    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

// 4️⃣ Count Containers (for pagination)
ipcMain.handle('getContainersCount', async (event, { monitorId, filter = 'all' }) => {
    let query = 'SELECT COUNT(*) as total FROM containers';
    const params = [];
    if (filter !== 'all') {
        query += ' WHERE status = ?';
        params.push(filter);
    }

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row.total);
        });
    });
});
