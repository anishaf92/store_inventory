// This script is no longer used; all utilities now rely on a single
// DATABASE_URL environment variable. If you really need to discover
// credentials, run the previous version manually. For now we simply
// echo the current URL.
const fs = require('fs');
const path = require('path');

console.log('DATABASE_URL is:', process.env.DATABASE_URL || '(not set)');
console.log('Please set DATABASE_URL instead of individual DB_* variables.');

// exit immediately since there’s nothing else to do
process.exit(0);

async function testConfig(config) {
    // Connect to default 'postgres' db just to check auth
    const sequelize = new Sequelize('postgres', config.username, config.password, {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    });

    try {
        await sequelize.authenticate();
        await sequelize.close();
        return true;
    } catch (err) {
        await sequelize.close();
        return false;
    }
}

async function findAndSave() {
    console.log('Testing common database credentials...');

    for (const conf of commonConfigs) {
        process.stdout.write(`Testing User: ${conf.username}, Pass: ${conf.password || '(empty)'} ... `);
        const isValid = await testConfig(conf);

        if (isValid) {
            console.log('SUCCESS! ✅');

            // Update .env file
            const envPath = path.join(__dirname, '../.env');
            let envContent = fs.readFileSync(envPath, 'utf8');

            // Regex replace to preserve other formatting
            envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${conf.username}`);
            envContent = envContent.replace(/DB_PASS=.*/, `DB_PASS=${conf.password}`);

            fs.writeFileSync(envPath, envContent);
            console.log(`Updated .env with found credentials.`);
            return;
        } else {
            console.log('Failed ❌');
        }
    }

    console.log('\nCould not find valid credentials automatically.');
    console.log('Please check your PostgreSQL installation for the correct username and password.');
}

findAndSave();
