const db = require('../src/utils/db');

async function clearData() {
    try {
        console.log('Starting database cleanup...');

        // Disable foreign key checks if possible or just delete in order
        // Order: dependants first

        console.log('- Clearing Audit Logs...');
        await db.AuditLog.destroy({ where: {}, truncate: false });

        console.log('- Clearing Inventory Transactions...');
        await db.InventoryTransaction.destroy({ where: {}, truncate: false });

        console.log('- Clearing Request Items...');
        await db.RequestItem.destroy({ where: {}, truncate: false });

        console.log('- Clearing Requests...');
        await db.Request.destroy({ where: {}, truncate: false });

        console.log('- Clearing Items...');
        await db.Item.destroy({ where: {}, truncate: false });

        console.log('Cleanup complete! Items and Requests have been removed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

clearData();
