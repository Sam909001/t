const db = require('./db');

// Example: add user on button click
document.getElementById('addBtn').onclick = () => {
    const name = document.getElementById('nameInput').value;
    db.addUser(name, (err) => {
        if (err) alert(err);
        else alert(`Added user: ${name}`);
    });
};
