const db = require('../src/utils/db');

async function fixPasswords() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to DB...');

        const users = [
            'owner@arthaq.com',
            'manager@arthaq.com',
            'keeper@arthaq.com',
            'pm@arthaq.com'
        ];

        for (const email of users) {
            const user = await db.User.findOne({ where: { email } });
            if (user) {
                console.log(`Found ${email}. Updating password...`);
                user.password_hash = 'password123'; // Plain text
                await user.save(); // Triggers beforeUpdate hook -> hashes password
                console.log(`✅ Password fixed for ${email}`);
            } else {
                console.log(`❌ User ${email} not found. Running seed might be needed.`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error fixing passwords:', err);
        process.exit(1);
    }
}

fixPasswords();
