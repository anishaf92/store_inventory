const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const db = require('../src/utils/db');

async function resetAdmin() {
    // credentials requested by user
    const email = 'admin@arthaq.com';
    const password = 'password123';

    try {
        await db.sequelize.authenticate();
        console.log('DB connection OK. Resetting admin user...');

        // Remove any existing user with this email (admin or otherwise)
        const deleted = await db.User.destroy({ where: { email } });
        console.log(`Deleted ${deleted} existing user(s) with email ${email}.`);

        // Recreate as ADMIN with the desired credentials
        const user = await db.User.create({
            name: 'System Admin',
            email,
            password_hash: password, // Model hook will hash this
            role: 'ADMIN'
        });

        console.log('New admin created:', {
            id: user.id,
            email: user.email,
            role: user.role
        });

        await db.sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('Failed to reset admin user:', err);
        process.exit(1);
    }
}

resetAdmin();

