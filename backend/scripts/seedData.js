const db = require('../src/utils/db');

async function seedData() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected...');

        // 1. Create Items
        const cat = await db.Category.findOne(); // grab any category

        const items = [
            { name: 'Drill Machine', category_id: cat.id, unit: 'pcs', current_stock: 5, low_stock_threshold: 10, make: 'Bosch' },
            { name: 'Safety Helmets', category_id: cat.id, unit: 'pcs', current_stock: 50, low_stock_threshold: 20, make: '3M' },
            { name: 'Cement Bags', category_id: cat.id, unit: 'bags', current_stock: 100, low_stock_threshold: 50, make: 'UltraTech' },
            { name: 'Gloves', category_id: cat.id, unit: 'pairs', current_stock: 0, low_stock_threshold: 5, make: 'Generic' },
        ];

        const createdItems = [];
        for (const i of items) {
            const item = await db.Item.create(i);
            createdItems.push(item);
        }
        console.log('Items created.');

        // 2. Create Request (Pending)
        const user = await db.User.findOne({ where: { role: 'STORE_KEEPER' } });
        await db.Request.create({
            type: 'MR',
            status: 'PENDING',
            project_id: 'P-101',
            requester_id: user.id,
            required_date: new Date()
        });
        console.log('Pending Request created.');

        // 3. Create Transactions
        await db.InventoryTransaction.create({
            item_id: createdItems[0].id,
            type: 'GRN',
            quantity: 5,
            reference_id: 'PO-909',
            performed_by: user.id
        });
        await db.InventoryTransaction.create({
            item_id: createdItems[1].id,
            type: 'ISSUE',
            quantity: 2,
            reference_id: 'MR-505',
            performed_by: user.id
        });

        console.log('Sample Data Seeded!');
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedData();
