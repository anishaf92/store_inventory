require('dotenv').config();

// normalize URL: add sslmode=require when SSL is requested, and strip
// deprecated aliases only when SSL is not being managed via config.
function sanitizeUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        const u = new URL(rawUrl);

        // always strip any existing channel_binding param (not needed)
        u.searchParams.delete('channel_binding');

        // default to requiring SSL for all connections; override by setting
        // DB_USE_SSL=false if you really need an insecure link (not recommended).
        if (process.env.DB_USE_SSL !== 'false') {
            u.searchParams.set('sslmode', 'require');
        } else {
            u.searchParams.delete('sslmode');
        }

        return u.toString();
    } catch (e) {
        return rawUrl;
    }
}

const config = {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    url: sanitizeUrl(process.env.DATABASE_URL),
    dialect: 'postgres',
    logging: false,
    // ensure SSL params for environments that require them
    dialectOptions: {
        // default to ssl unless explicitly disabled, matching sanitizeUrl behaviour
        ssl: process.env.DB_USE_SSL === 'false' ? undefined : { require: true, rejectUnauthorized: false },
        // additional pg-specific query params can be appended to the URL below if needed
    }
};

module.exports = {
    development: {
        ...config,
    },
    test: {
        ...config,
        database: 'store_inventory_test',
    },
    production: {
        ...config,
        pool: {
            max: 5,
            min: 0,
            acquire: 300000,
            idle: 10000
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
};
