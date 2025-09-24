const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'app.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);
});

function addUser(name, callback) {
    db.run(`INSERT INTO users(name) VALUES(?)`, [name], callback);
}

function getUsers(callback) {
    db.all(`SELECT * FROM users`, [], callback);
}

module.exports = { addUser, getUsers };
