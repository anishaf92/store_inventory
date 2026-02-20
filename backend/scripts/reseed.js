require('dotenv').config();
const db = require('../src/utils/db');

async function reseed() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to DB...');

        // 1. Wipe Everything
        await db.Item.destroy({ where: {}, truncate: true, cascade: true });
        await db.Category.destroy({ where: {}, truncate: true, cascade: true });
        await db.User.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Wiped existing data.');

        // 2. Create Users (Plain text password -> Model Hook Hashes it)
        const password = 'password123';

        const users = [
            { name: 'Alice Owner', email: 'owner@arthaq.com', role: 'OWNER', password_hash: password },
            { name: 'Bob Manager', email: 'manager@arthaq.com', role: 'STORE_MANAGER', password_hash: password },
            { name: 'Charlie Keeper', email: 'keeper@arthaq.com', role: 'STORE_KEEPER', password_hash: password },
            { name: 'Dave PM', email: 'pm@arthaq.com', role: 'PROJECT_MANAGER', password_hash: password },
        ];

        for (const u of users) {
            await db.User.create(u);
            console.log(`Created user: ${u.name}`);
        }

        // 3. Categories & Items
        const seedData = [
            {
                name: 'Construction',
                items: [
                    { name: 'Cement Bag', make: 'UltraTech', grade: 'OPC 53', unit: 'bags', stock: 100 },
                    { name: 'Steel Rod 12mm', make: 'TATA Tiscon', grade: 'Fe500', unit: 'pcs', stock: 50 },
                ]
            },
            {
                name: 'Electrical',
                items: [
                    { name: 'Copper Wire 1.5mm', make: 'Finolex', grade: 'FR', unit: 'coils', stock: 20 },
                    { name: 'LED Bulb 9W', make: 'Philips', grade: 'Standard', unit: 'pcs', stock: 200 },
                ]
            },
            {
                name: 'Safety Gear',
                items: [
                    { name: 'Safety Helmet', make: '3M', grade: 'Class E', unit: 'pcs', stock: 30 },
                    { name: 'Reflective Vest', make: 'Safari', grade: 'High-Vis', unit: 'pcs', stock: 50 },
                ]
            }
        ];

        for (const catData of seedData) {
            const [category] = await db.Category.findOrCreate({
                where: { name: catData.name },
                defaults: { description: `${catData.name} Materials` }
            });

            for (const itemData of catData.items) {
                const item = await db.Item.create({
                    name: itemData.name,
                    make: itemData.make,
                    grade: itemData.grade,
                    unit: itemData.unit,
                    category_id: category.id,
                    current_stock: itemData.stock, // Initial seed stock
                    low_stock_threshold: 10
                });
                console.log(`Created item: ${item.name} with stock ${itemData.stock}`);
            }
        }

        console.log('Reseeding complete. Login with "password123".');
        process.exit(0);

    } catch (err) {
        console.error('Reseeding failed:', err);
        process.exit(1);
    }
}

reseed();
