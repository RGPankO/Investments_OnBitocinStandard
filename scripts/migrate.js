#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');


async function runMigrations() {
    try {
        // Create migrations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Find all SQL files in migrations directories
        const migrationsPath = path.join(__dirname, '../migrations');
        const dirs = ['001-schema', '002-functions', '003-seed-data'];
        const migrations = [];

        for (const dir of dirs) {
            const dirPath = path.join(migrationsPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                continue;
            }

            const files = fs.readdirSync(dirPath)
                .filter(f => f.endsWith('.sql'))
                .sort();

            for (const file of files) {
                migrations.push({
                    name: `${dir}/${file}`,
                    path: path.join(dirPath, file)
                });
            }
        }

        // Check which migrations have been run
        const result = await pool.query('SELECT name FROM migrations');
        const executed = new Set(result.rows.map(r => r.name));

        // Run pending migrations
        let count = 0;
        for (const migration of migrations) {
            if (!executed.has(migration.name)) {
                const sql = fs.readFileSync(migration.path, 'utf8');
                await pool.query(sql);
                await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
                console.log(`✓ Applied: ${migration.name}`);
                count++;
            }
        }

        if (count === 0) {
            console.log('✓ Database is up to date');
        } else {
            console.log(`✓ Applied ${count} migration(s)`);
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();