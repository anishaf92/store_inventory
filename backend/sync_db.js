const db = require('./src/utils/db');

async function syncDB() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to Supabase...');

        // Sync all models
        await db.sequelize.sync({ force: false }); // Change to true if you want to drop and recreation
        console.log('Database synchronized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to sync database:', err);
        process.exit(1);
    }
}

syncDB();
