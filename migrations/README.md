# Blockchain Database Migration System

## Overview
This directory contains immutable database migrations that are executed sequentially like a blockchain. Each migration builds upon the previous ones and cannot be modified once applied.

## Structure
```
migrations/
├── 001-schema/           # Database schema changes
├── 002-functions/        # Stored procedures and functions
├── 003-seed-data/        # Initial data seeding
└── README.md
```

## Principles
1. **Immutability**: Once a migration is applied, it cannot be changed
2. **Sequential Execution**: Migrations run in strict numerical order
3. **Hash Verification**: Each migration's content is hashed and verified
4. **No Rollbacks**: Following blockchain principles, we only move forward
5. **Audit Trail**: Complete history of all database changes

## Usage
```bash
# Run all pending migrations
npm run migrate

# Create a new migration
npm run migrate:create -- --name "add-user-table" --type schema

# Verify migration integrity
npm run migrate:verify

# Check migration status
npm run migrate:status

# Reset development database (NEVER in production)
npm run db:reset-dev
```

## Migration Naming Convention
Format: `XXX-description.sql`
- XXX: Three-digit sequential number (001, 002, etc.)
- description: Kebab-case description of the change

Example: `001-initial-schema.sql`

## Safety Features
- Production environment checks prevent destructive operations
- Hash verification ensures migrations haven't been tampered with
- Failed migrations stop the chain to maintain consistency
- Detailed logging of all migration operations

## For Developers
- Always create migrations for database changes
- Never modify existing migrations
- Test migrations locally before pushing
- Migrations auto-run on server start in development