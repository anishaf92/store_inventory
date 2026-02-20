const db = require('../src/utils/db');

async function seed() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to DB...');

        // Plain text password - let the User model hook handle hashing!
        const password = 'password123';

        const users = [
            { name: 'Alice Owner', email: 'owner@arthaq.com', role: 'OWNER' },
            { name: 'Bob Manager', email: 'manager@arthaq.com', role: 'STORE_MANAGER' },
            { name: 'Charlie Keeper', email: 'keeper@arthaq.com', role: 'STORE_KEEPER' },
            { name: 'Dave PM', email: 'pm@arthaq.com', role: 'PROJECT_MANAGER' },
        ];

        for (const u of users) {
            const [user, created] = await db.User.findOrCreate({
                where: { email: u.email },
                defaults: { ...u, password_hash: password }
            });

            if (created) {
                console.log(`Created user: ${u.name}`);
            } else {
                console.log(`User exists: ${u.name}. Updating password...`);
                // Force update password to ensure it's correctly hashed (fixing any double-hash issues)
                user.password_hash = password;
                await user.save();
                console.log(`Updated password for ${u.name}`);
            }
        }

        // Create Categories
        const categories = ['Construction', 'Electrical', 'Plumbing', 'Safety Gear'];
        for (const c of categories) {
            await db.Category.findOrCreate({
                where: { name: c },
                defaults: { description: `${c} Materials` }
            });
        }

        console.log('Seeding complete.');
        process.exit(0);

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
