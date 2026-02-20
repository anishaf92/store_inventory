const db = require('../src/utils/db');
const bcrypt = require('bcryptjs');

async function checkUser() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to DB.');

        const email = 'keeper@arthaq.com';
        const password = 'password123';

        const user = await db.User.findOne({ where: { email } });

        if (!user) {
            console.log(`❌ User ${email} NOT FOUND in database.`);
            console.log('Please run: node scripts/seed.js');
        } else {
            console.log(`✅ User ${email} found.`);
            console.log(`Stored Hash: ${user.password_hash}`);

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (isMatch) {
                console.log('✅ Password "password123" matches the stored hash.');
            } else {
                console.log('❌ Password "password123" DOES NOT MATCH stored hash.');
                console.log('Re-hashing and updating password...');

                const salt = await bcrypt.genSalt(10);
                const newHash = await bcrypt.hash(password, salt);
                await user.update({ password_hash: newHash });
                console.log('✅ Password reset to "password123". Try logging in again.');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUser();
