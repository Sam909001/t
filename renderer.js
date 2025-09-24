const db = require('./db');

// Example: add user on button click
document.getElementById('addBtn').onclick = () => {
    const name = document.getElementById('nameInput').value;
    db.addUser(name, (err) => {
        if (err) alert(err);
        else alert(`Added user: ${name}`);
    });
};


// Send barcode HTML to Electron for direct print
const barcodeHTML = `<html><body><h1>Barcode Example</h1></body></html>`;
await window.electronAPI.printBarcode(barcodeHTML);
