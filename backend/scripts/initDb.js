const { Client } = require('pg');
require('dotenv').config();

// prefer URL connection string if supplied, otherwise fall back to individual vars
let config;

// sanitize URL to enforce SSL by default and remove unnecessary params
function sanitizeUrl(raw) {
    if (!raw) return raw;
    try {
        const u = new URL(raw);
        u.searchParams.delete('channel_binding');
        if (process.env.DB_USE_SSL !== 'false') {
            u.searchParams.set('sslmode', 'require');
        } else {
            u.searchParams.delete('sslmode');
        }
        return u.toString();
    } catch (e) {
        return raw;
    }
}

if (process.env.DATABASE_URL) {
    config = {
        connectionString: sanitizeUrl(process.env.DATABASE_URL),
        ssl: process.env.DB_USE_SSL !== 'false' ? { rejectUnauthorized: false } : undefined
    };
} else {
    config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        host: process.env.DB_HOST,
        port: 5432,
        database: 'postgres',
        ssl: process.env.DB_USE_SSL !== 'false' ? { rejectUnauthorized: false } : undefined
    };
}

async function createDatabase() {
    const client = new Client(config);
    const dbName = process.env.DB_NAME || 'store_inventory';

    try {
        await client.connect();
        console.log(`Connected to 'postgres' database.`);

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rowCount === 0) {
            console.log(`Database '${dbName}' not found. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database '${dbName}' created successfully.`);
        } else {
            console.log(`Database '${dbName}' already exists.`);
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
}

createDatabase();
