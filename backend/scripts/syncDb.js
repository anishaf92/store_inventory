const dns = require('dns');
if (dns.setDefaultResultOrder) { dns.setDefaultResultOrder('ipv4first'); }
const db = require('../src/utils/db');

async function syncDatabase() {
    try {
        await db.sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Sync all models
        await db.sequelize.sync({ alter: true });
        console.log('Database synced successfully');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

syncDatabase();
