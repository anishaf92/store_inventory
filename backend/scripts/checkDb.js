const { Sequelize } = require('sequelize');
require('dotenv').config();

// Prefer a full URL; strip deprecated ssl params to avoid warnings
function sanitizeUrl(raw) {
    if (!raw) return raw;
    try {
        const u = new URL(raw);
        u.searchParams.delete('sslmode');
        u.searchParams.delete('channel_binding');
        return u.toString();
    } catch (e) {
        return raw;
    }
}

const connectionString = sanitizeUrl(process.env.DATABASE_URL);

console.log('Attempting to connect using DATABASE_URL:', connectionString);
const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function checkConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkConnection();
