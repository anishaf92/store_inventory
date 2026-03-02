require('dotenv').config();
const { Sequelize } = require('sequelize');

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

const sequelize = new Sequelize(sanitizeUrl(process.env.DATABASE_URL), {
    dialect: 'postgres',
    logging: false,
    ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function run() {
    try {
        await sequelize.query("ALTER TYPE enum_requests_status ADD VALUE IF NOT EXISTS 'REQUESTED'");
        console.log("Added: REQUESTED");
        await sequelize.query("ALTER TYPE enum_requests_status ADD VALUE IF NOT EXISTS 'PARTIALLY_FULFILLED'");
        console.log("Added: PARTIALLY_FULFILLED");
        console.log("Done!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await sequelize.close();
    }
}

run();
