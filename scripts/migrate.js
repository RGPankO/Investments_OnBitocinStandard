#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pool = require('../config/database');

async function runMigrations() {
    try {
        // Create migrations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get all migration files
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.js'))
            .sort();

        // Check which have been run
        const result = await pool.query('SELECT filename FROM migrations');
        const executed = new Set(result.rows.map(r => r.filename));

        // Run pending migrations
        let count = 0;
        for (const file of files) {
            if (!executed.has(file)) {
                console.log(`Running: ${file}`);
                execSync(`node migrations/${file}`, { stdio: 'inherit' });
                await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
                count++;
            }
        }

        console.log(count > 0 ? `✓ Applied ${count} migration(s)` : '✓ Database up to date');

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();