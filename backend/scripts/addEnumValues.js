require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'postgres',
        logging: false,
    }
);

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
