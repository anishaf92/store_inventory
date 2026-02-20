require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('./backend/src/config/database');

const env = process.env.NODE_ENV || 'development';
const conf = config[env];

const sequelize = new Sequelize(conf.database, conf.username, conf.password, {
    host: conf.host,
    dialect: conf.dialect,
});

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

test();
