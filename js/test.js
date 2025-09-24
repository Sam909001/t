const db = require('./database');

// Insert a user
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insert.run('Sam', 'sam@example.com');

console.log('User added!');
