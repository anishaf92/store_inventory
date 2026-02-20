require('dotenv').config();

const config = {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: false,
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
            acquire: 30000,
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
