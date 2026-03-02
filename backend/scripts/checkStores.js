const db = require('../src/utils/db');

async function checkStores() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected.');

        const stores = await db.StoreNode.findAll();
        console.log('Stores:', stores.map(s => s.toJSON()));

        const sites = await db.SiteLocation.findAll();
        console.log('Sites:', sites.map(s => s.toJSON()));

        const users = await db.User.findAll({ attributes: ['name', 'email', 'role', 'store_node_id'] });
        console.log('Users:', users.map(u => u.toJSON()));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkStores();
