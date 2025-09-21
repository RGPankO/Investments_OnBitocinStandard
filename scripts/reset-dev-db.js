#!/usr/bin/env node
const pool = require('../config/database');
const readline = require('readline');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

// Check if production environment
if (process.env.NODE_ENV === 'production') {
    console.error(`${colors.red}${colors.bright}✗ FATAL: Cannot reset database in production!${colors.reset}`);
    console.error(`${colors.red}This operation would destroy all data.${colors.reset}`);
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetDatabase() {
    console.log(`${colors.yellow}${colors.bright}⚠️  WARNING: Development Database Reset${colors.reset}`);
    console.log(`${colors.yellow}This will:${colors.reset}`);
    console.log(`  • Drop ALL tables`);
    console.log(`  • Delete ALL data`);
    console.log(`  • Remove migration history`);
    console.log(`  • Reset to a clean state`);
    console.log();

    rl.question(`${colors.yellow}Type "RESET" to confirm: ${colors.reset}`, async (answer) => {
        if (answer !== 'RESET') {
            console.log(`${colors.cyan}Reset cancelled.${colors.reset}`);
            rl.close();
            process.exit(0);
        }

        try {
            console.log(`\n${colors.cyan}Resetting database...${colors.reset}`);

            // Get all table names
            const tablesResult = await pool.query(`
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            `);

            // Drop all tables
            for (const row of tablesResult.rows) {
                console.log(`  Dropping table: ${row.tablename}`);
                await pool.query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`);
            }

            console.log(`\n${colors.green}✓ Database reset complete!${colors.reset}`);
            console.log(`\nNext steps:`);
            console.log(`1. Run ${colors.bright}npm run migrate${colors.reset} to apply all migrations`);
            console.log(`2. Your database will be rebuilt from scratch`);

        } catch (error) {
            console.error(`${colors.red}✗ Reset failed:${colors.reset}`, error);
            process.exit(1);
        } finally {
            await pool.end();
            rl.close();
        }
    });
}

resetDatabase();