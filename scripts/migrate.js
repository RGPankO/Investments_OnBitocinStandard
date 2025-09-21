#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

class BlockchainMigration {
    constructor() {
        this.migrationsPath = path.join(__dirname, '../migrations');
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    async initialize() {
        // Create migrations tracking table if it doesn't exist
        const tableQuery = `
            CREATE TABLE IF NOT EXISTS blockchain_migrations (
                id SERIAL PRIMARY KEY,
                migration_number INTEGER NOT NULL UNIQUE,
                filename VARCHAR(255) NOT NULL,
                hash VARCHAR(64) NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                status VARCHAR(20) DEFAULT 'pending',
                error_message TEXT,
                CONSTRAINT unique_migration_number UNIQUE (migration_number)
            );

            -- Create index for faster lookups
            CREATE INDEX IF NOT EXISTS idx_migration_status ON blockchain_migrations(status);
            CREATE INDEX IF NOT EXISTS idx_migration_number ON blockchain_migrations(migration_number);
        `;

        try {
            await pool.query(tableQuery);
            console.log(`${colors.cyan}✓ Migration tracking table ready${colors.reset}`);
        } catch (error) {
            console.error(`${colors.red}✗ Failed to create migration table:${colors.reset}`, error);
            process.exit(1);
        }
    }

    calculateHash(content) {
        return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }

    async getAppliedMigrations() {
        const result = await pool.query(
            'SELECT migration_number, filename, hash FROM blockchain_migrations WHERE status = $1 ORDER BY migration_number',
            ['completed']
        );
        return result.rows;
    }

    async verifyMigrationIntegrity() {
        console.log(`\n${colors.bright}Verifying blockchain integrity...${colors.reset}`);

        const applied = await this.getAppliedMigrations();
        let integrityValid = true;

        for (const migration of applied) {
            const filePath = this.findMigrationFile(migration.filename);
            if (!filePath) {
                console.error(`${colors.red}✗ Missing migration file: ${migration.filename}${colors.reset}`);
                integrityValid = false;
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const currentHash = this.calculateHash(content);

            if (currentHash !== migration.hash) {
                console.error(`${colors.red}✗ Hash mismatch for ${migration.filename}${colors.reset}`);
                console.error(`  Expected: ${migration.hash}`);
                console.error(`  Current:  ${currentHash}`);
                integrityValid = false;
            } else {
                console.log(`${colors.dim}  ✓ ${migration.filename} (${migration.hash.substring(0, 8)}...)${colors.reset}`);
            }
        }

        if (!integrityValid) {
            throw new Error('Migration blockchain integrity check failed! Migrations have been tampered with.');
        }

        console.log(`${colors.green}✓ Blockchain integrity verified${colors.reset}`);
        return true;
    }

    findMigrationFile(filename) {
        const dirs = ['001-schema', '002-functions', '003-seed-data'];

        for (const dir of dirs) {
            const filePath = path.join(this.migrationsPath, dir, filename);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
        return null;
    }

    async discoverMigrations() {
        const migrations = [];
        const dirs = [
            { name: '001-schema', priority: 1 },
            { name: '002-functions', priority: 2 },
            { name: '003-seed-data', priority: 3 }
        ];

        for (const dir of dirs) {
            const dirPath = path.join(this.migrationsPath, dir.name);

            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`${colors.dim}Created directory: ${dir.name}${colors.reset}`);
                continue;
            }

            const files = fs.readdirSync(dirPath)
                .filter(f => f.endsWith('.sql'))
                .sort();

            for (const file of files) {
                const match = file.match(/^(\d{3})-(.+)\.sql$/);
                if (!match) {
                    console.warn(`${colors.yellow}⚠ Skipping invalid filename: ${file}${colors.reset}`);
                    continue;
                }

                const migrationNumber = dir.priority * 1000 + parseInt(match[1]);
                const filePath = path.join(dirPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const hash = this.calculateHash(content);

                migrations.push({
                    number: migrationNumber,
                    filename: file,
                    filepath: filePath,
                    category: dir.name,
                    content,
                    hash
                });
            }
        }

        return migrations.sort((a, b) => a.number - b.number);
    }

    async applyMigration(migration) {
        const startTime = Date.now();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if migration already applied
            const existing = await client.query(
                'SELECT id FROM blockchain_migrations WHERE migration_number = $1',
                [migration.number]
            );

            if (existing.rows.length > 0) {
                await client.query('ROLLBACK');
                return { status: 'skipped', reason: 'already applied' };
            }

            // Record migration attempt
            await client.query(
                `INSERT INTO blockchain_migrations (migration_number, filename, hash, status)
                 VALUES ($1, $2, $3, $4)`,
                [migration.number, migration.filename, migration.hash, 'running']
            );

            // Execute migration
            await client.query(migration.content);

            // Update migration record
            const executionTime = Date.now() - startTime;
            await client.query(
                `UPDATE blockchain_migrations
                 SET status = $1, execution_time_ms = $2, executed_at = CURRENT_TIMESTAMP
                 WHERE migration_number = $3`,
                ['completed', executionTime, migration.number]
            );

            await client.query('COMMIT');

            return { status: 'success', executionTime };

        } catch (error) {
            await client.query('ROLLBACK');

            // Record failure
            try {
                await client.query(
                    `INSERT INTO blockchain_migrations (migration_number, filename, hash, status, error_message)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (migration_number)
                     DO UPDATE SET status = $4, error_message = $5`,
                    [migration.number, migration.filename, migration.hash, 'failed', error.message]
                );
            } catch (recordError) {
                console.error('Failed to record migration error:', recordError);
            }

            throw error;

        } finally {
            client.release();
        }
    }

    async run() {
        console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}║  Blockchain Migration System v1.0  ║${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════╝${colors.reset}\n`);

        try {
            await this.initialize();
            await this.verifyMigrationIntegrity();

            const migrations = await this.discoverMigrations();
            const applied = await this.getAppliedMigrations();
            const appliedNumbers = new Set(applied.map(m => m.migration_number));

            const pending = migrations.filter(m => !appliedNumbers.has(m.number));

            if (pending.length === 0) {
                console.log(`\n${colors.green}✓ All migrations are up to date${colors.reset}`);
                return;
            }

            console.log(`\n${colors.bright}Found ${pending.length} pending migration(s)${colors.reset}`);

            for (const migration of pending) {
                console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
                console.log(`${colors.bright}Migration #${migration.number}: ${migration.filename}${colors.reset}`);
                console.log(`Category: ${migration.category}`);
                console.log(`Hash: ${migration.hash.substring(0, 16)}...`);

                const result = await this.applyMigration(migration);

                if (result.status === 'success') {
                    console.log(`${colors.green}✓ Applied successfully (${result.executionTime}ms)${colors.reset}`);
                } else if (result.status === 'skipped') {
                    console.log(`${colors.yellow}⊝ Skipped: ${result.reason}${colors.reset}`);
                }
            }

            console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════${colors.reset}`);
            console.log(`${colors.bright}${colors.green}✓ Migration chain complete${colors.reset}`);
            console.log(`${colors.bright}${colors.green}═══════════════════════════════════${colors.reset}\n`);

        } catch (error) {
            console.error(`\n${colors.red}${colors.bright}✗ Migration failed:${colors.reset}`, error.message);
            console.error(`${colors.dim}The blockchain has been halted to maintain consistency.${colors.reset}`);
            process.exit(1);
        } finally {
            await pool.end();
        }
    }

    async status() {
        await this.initialize();

        const migrations = await this.discoverMigrations();
        const result = await pool.query(
            'SELECT * FROM blockchain_migrations ORDER BY migration_number'
        );

        console.log(`\n${colors.bright}Migration Status${colors.reset}`);
        console.log('─'.repeat(80));

        const appliedMap = new Map(result.rows.map(r => [r.migration_number, r]));

        for (const migration of migrations) {
            const applied = appliedMap.get(migration.number);

            if (applied) {
                const statusColor = applied.status === 'completed' ? colors.green : colors.red;
                const statusSymbol = applied.status === 'completed' ? '✓' : '✗';
                console.log(
                    `${statusColor}${statusSymbol}${colors.reset} #${migration.number.toString().padStart(4, '0')} ` +
                    `${migration.filename.padEnd(40)} ` +
                    `${colors.dim}${applied.executed_at ? new Date(applied.executed_at).toISOString() : 'pending'}${colors.reset}`
                );
            } else {
                console.log(
                    `${colors.yellow}○${colors.reset} #${migration.number.toString().padStart(4, '0')} ` +
                    `${migration.filename.padEnd(40)} ` +
                    `${colors.dim}pending${colors.reset}`
                );
            }
        }

        await pool.end();
    }
}

// Parse command line arguments
const command = process.argv[2] || 'run';

const migrator = new BlockchainMigration();

switch (command) {
    case 'status':
        migrator.status();
        break;
    case 'verify':
        migrator.initialize()
            .then(() => migrator.verifyMigrationIntegrity())
            .then(() => {
                console.log(`\n${colors.green}✓ All migrations verified${colors.reset}`);
                process.exit(0);
            })
            .catch(error => {
                console.error(`${colors.red}Verification failed:${colors.reset}`, error.message);
                process.exit(1);
            });
        break;
    default:
        migrator.run();
}