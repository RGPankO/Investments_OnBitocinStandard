#!/usr/bin/env node
const { execSync } = require('child_process');
const pool = require('../config/database');

async function runMigrations() {
    try {
        // Create migrations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                script_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // List of data update scripts in order
        const scripts = [
            'setup-database.js',
            'add-suggestions-table.js',
            'add-kiro-enhancements.js',
            'add-portfolio-sharing-enhancements.js',
            'add-expanded-assets.js',
            'add-purchase-tracking.js'
        ];

        // Check which scripts have been run
        const result = await pool.query('SELECT script_name FROM migrations');
        const executed = new Set(result.rows.map(r => r.script_name));

        // Run pending scripts
        let count = 0;
        for (const script of scripts) {
            if (!executed.has(script)) {
                try {
                    execSync(`node scripts/${script}`, { stdio: 'inherit' });
                    await pool.query('INSERT INTO migrations (script_name) VALUES ($1)', [script]);
                    console.log(`✓ Applied: ${script}`);
                    count++;
                } catch (error) {
                    console.error(`Failed to run ${script}:`, error.message);
                    throw error;
                }
            }
        }

        if (count === 0) {
            console.log('✓ Database is up to date');
        } else {
            console.log(`✓ Applied ${count} script(s)`);
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();