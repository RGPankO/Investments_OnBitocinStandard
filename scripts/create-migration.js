#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

// Parse arguments
const args = process.argv.slice(2);
const nameIndex = args.findIndex(arg => arg === '--name' || arg === '-n');
const typeIndex = args.findIndex(arg => arg === '--type' || arg === '-t');

if (nameIndex === -1 || !args[nameIndex + 1]) {
    console.error(`${colors.red}Error: Migration name is required${colors.reset}`);
    console.log(`\nUsage: npm run migrate:create -- --name "migration-name" --type [schema|functions|seed-data]`);
    console.log(`\nExample: npm run migrate:create -- --name "add-user-table" --type schema`);
    process.exit(1);
}

const migrationName = args[nameIndex + 1]
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const type = args[typeIndex + 1] || 'schema';

// Map type to directory
const typeMap = {
    'schema': '001-schema',
    'functions': '002-functions',
    'seed-data': '003-seed-data',
    'seed': '003-seed-data',
    'data': '003-seed-data'
};

const directory = typeMap[type.toLowerCase()];

if (!directory) {
    console.error(`${colors.red}Error: Invalid migration type. Must be one of: schema, functions, seed-data${colors.reset}`);
    process.exit(1);
}

// Find the next migration number
const migrationDir = path.join(__dirname, '../migrations', directory);
fs.mkdirSync(migrationDir, { recursive: true });

const existingFiles = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .map(f => {
        const match = f.match(/^(\d{3})-/);
        return match ? parseInt(match[1]) : 0;
    });

const nextNumber = existingFiles.length > 0
    ? Math.max(...existingFiles) + 1
    : 1;

const fileName = `${String(nextNumber).padStart(3, '0')}-${migrationName}.sql`;
const filePath = path.join(migrationDir, fileName);

// Generate migration template based on type
let template = '';

switch (type) {
    case 'schema':
        template = `-- Migration: ${migrationName}
-- Date: ${new Date().toISOString()}
-- Description: Add your migration description here

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Your schema changes here
-- Example:
-- CREATE TABLE IF NOT EXISTS your_table (
--     id SERIAL PRIMARY KEY,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

`;
        break;

    case 'functions':
        template = `-- Migration: ${migrationName}
-- Date: ${new Date().toISOString()}
-- Description: Add your migration description here

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Your function definitions here
-- Example:
-- CREATE OR REPLACE FUNCTION your_function()
-- RETURNS void AS $$
-- BEGIN
--     -- Function logic
-- END;
-- $$ LANGUAGE plpgsql;

`;
        break;

    case 'seed-data':
    case 'seed':
    case 'data':
        template = `-- Migration: ${migrationName}
-- Date: ${new Date().toISOString()}
-- Description: Add your migration description here

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Your seed data here
-- Example:
-- INSERT INTO your_table (column1, column2)
-- VALUES ('value1', 'value2')
-- ON CONFLICT DO NOTHING;

`;
        break;
}

// Write the migration file
fs.writeFileSync(filePath, template);

console.log(`${colors.bright}${colors.green}✓ Migration created successfully!${colors.reset}\n`);
console.log(`Type:     ${colors.cyan}${type}${colors.reset}`);
console.log(`File:     ${colors.cyan}${directory}/${fileName}${colors.reset}`);
console.log(`Path:     ${colors.dim}${filePath}${colors.reset}\n`);
console.log(`Next steps:`);
console.log(`1. Edit the migration file to add your SQL`);
console.log(`2. Run ${colors.bright}npm run migrate${colors.reset} to apply it`);
console.log(`3. Commit both the migration file and any related code changes`);