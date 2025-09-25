const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

ipcMain.handle('print-barcode-system', async (event, htmlContent) => {
  const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.html`);
  
  try {
    fs.writeFileSync(tempFile, htmlContent);
    
    return new Promise((resolve) => {
      let printCommand;
      
      if (process.platform === 'win32') {
        // Windows: Use default browser to print
        printCommand = `start /min "" "${tempFile}"`;
      } else if (process.platform === 'darwin') {
        // macOS
        printCommand = `lpr "${tempFile}"`;
      } else {
        // Linux
        printCommand = `lp "${tempFile}"`;
      }
      
      exec(printCommand, (error) => {
        // Clean up temp file
        fs.unlinkSync(tempFile);
        resolve(!error);
      });
    });
  } catch (error) {
    console.error('System print error:', error);
    return false;
  }
});
