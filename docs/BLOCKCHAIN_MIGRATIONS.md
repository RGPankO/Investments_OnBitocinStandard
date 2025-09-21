# Blockchain Database Migration System

## Overview

This project implements a **blockchain-inspired database migration system** that ensures database consistency across all development environments and prevents the database drift issues that previously plagued the team.

## The Problem It Solves

Previously, developers were creating update scripts but not running them, leading to:
- ❌ Database drift between team members
- ❌ Production database out of sync with development
- ❌ Failed deployments due to missing schema changes
- ❌ No audit trail of database changes
- ❌ Manual coordination required for database updates

## The Blockchain Solution

Our migration system treats database changes like blocks in a blockchain:
- ✅ **Immutable**: Once applied, migrations cannot be changed
- ✅ **Sequential**: Strict ordering ensures consistency
- ✅ **Verifiable**: SHA-256 hashes detect any tampering
- ✅ **Auditable**: Complete history of all changes
- ✅ **Automatic**: Migrations run on server start in development

## How It Works

### 1. Migration Structure
```
migrations/
├── 001-schema/          # Database structure changes
│   ├── 001-initial-tables.sql
│   ├── 002-suggestions-system.sql
│   └── 003-set-forget-portfolios.sql
├── 002-functions/       # Stored procedures and triggers
│   └── (future functions)
└── 003-seed-data/       # Initial data
    └── 001-initial-assets.sql
```

### 2. The Blockchain Table
Each migration is recorded in `blockchain_migrations`:
```sql
CREATE TABLE blockchain_migrations (
    id SERIAL PRIMARY KEY,
    migration_number INTEGER UNIQUE,    -- Sequential block number
    filename VARCHAR(255),               -- Migration file
    hash VARCHAR(64),                   -- SHA-256 hash of content
    executed_at TIMESTAMP,              -- When it was applied
    execution_time_ms INTEGER,          -- Performance tracking
    status VARCHAR(20),                 -- pending/completed/failed
    error_message TEXT                  -- Error details if failed
);
```

### 3. Hash Verification
Before running migrations, the system verifies:
1. All previously applied migrations still have matching hashes
2. No one has tampered with existing migration files
3. The blockchain integrity is maintained

If any hash mismatches are detected, the system halts to prevent corruption.

## Usage Guide

### For Developers

#### Running Migrations
```bash
# Automatic (runs on dev server start)
npm run dev

# Manual
npm run migrate

# Check status
npm run migrate:status

# Verify integrity
npm run migrate:verify
```

#### Creating New Migrations
```bash
# Create a schema migration
npm run migrate:create -- --name "add-user-preferences" --type schema

# Create a function migration
npm run migrate:create -- --name "calculate-portfolio-value" --type functions

# Create seed data migration
npm run migrate:create -- --name "add-new-assets" --type seed-data
```

This generates a numbered migration file with a template:
```sql
-- Migration: add-user-preferences
-- Date: 2025-09-21T00:00:00.000Z
-- Description: Add your migration description here

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Your SQL here
```

#### Development Reset (NEVER in production)
```bash
# Reset development database completely
npm run db:reset-dev
# Then rerun migrations
npm run migrate
```

### For DevOps

#### Production Deployment
1. Migrations are automatically applied on deployment
2. Failed migrations stop the deployment
3. Hash verification ensures consistency
4. No manual intervention required

#### Monitoring
```bash
# Check migration status
npm run migrate:status

# Output:
✓ #1001 001-initial-tables.sql              2025-09-21T10:00:00.000Z
✓ #1002 002-suggestions-system.sql          2025-09-21T10:00:01.000Z
✓ #1003 003-set-forget-portfolios.sql       2025-09-21T10:00:02.000Z
○ #1004 004-asset-prices-cache.sql          pending
```

## Safety Features

### Production Protection
- ❌ Cannot run `db:reset-dev` in production
- ❌ Cannot modify existing migrations after applied
- ✅ Automatic rollback on migration failure
- ✅ Detailed error logging

### Development Features
- ✅ Auto-run migrations on `npm run dev`
- ✅ Safe reset for clean slate testing
- ✅ Migration creation helpers
- ✅ Integrity verification

## Technical Details

### Migration Numbering
- Format: `XXX-description.sql`
- Schema: 1000-1999
- Functions: 2000-2999
- Seed Data: 3000-3999

Example: `001-initial-tables.sql` becomes migration #1001

### Hash Algorithm
- SHA-256 hash of file contents
- Stored as 64-character hex string
- Verified before each migration run

### Execution Order
1. Schema migrations (1000-series)
2. Function migrations (2000-series)
3. Seed data migrations (3000-series)

Within each category, migrations run in numerical order.

## Benefits

### For Developers
- **No More Conflicts**: Everyone's database stays in sync
- **Easy Onboarding**: New developers get up-to-date schema automatically
- **Version Control**: Database changes tracked with code
- **Confidence**: Know your changes won't break production

### For Operations
- **Reliable Deployments**: No surprise schema issues
- **Audit Trail**: Complete history of database evolution
- **Rollback Safety**: While we don't rollback (blockchain principle), we can trace issues
- **Zero Manual Steps**: Fully automated migration process

## Migration Examples

### Adding a New Table
```sql
-- migrations/001-schema/005-user-settings.sql
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Adding an Index
```sql
-- migrations/001-schema/006-performance-indexes.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_created
ON trades(user_id, created_at DESC);
```

### Adding Seed Data
```sql
-- migrations/003-seed-data/002-achievements.sql
INSERT INTO achievements (code, name, description, criteria, icon)
VALUES
    ('first_trade', 'First Trade', 'Complete your first trade', '{"trades": 1}', '🎯'),
    ('hodler', 'Diamond Hands', 'Hold for 30 days', '{"days": 30}', '💎')
ON CONFLICT (code) DO NOTHING;
```

## Troubleshooting

### Hash Mismatch Error
```
✗ Hash mismatch for 001-initial-tables.sql
Expected: a1b2c3d4...
Current:  e5f6g7h8...
```
**Solution**: Someone modified an applied migration. Restore from git.

### Migration Failed
```
✗ Migration failed: relation "users" already exists
```
**Solution**: Use `IF NOT EXISTS` clauses in all CREATE statements.

### Can't Connect to Database
```
✗ Failed to create migration table: role "root" does not exist
```
**Solution**: Check `.env` database credentials.

## Best Practices

1. **Never Modify Applied Migrations**: Create new migrations for changes
2. **Use IF NOT EXISTS**: Make migrations idempotent
3. **Test Locally First**: Run migrations in development before pushing
4. **Descriptive Names**: Use clear migration names that explain the change
5. **Add Comments**: Document WHY, not just WHAT
6. **Keep Migrations Small**: One logical change per migration
7. **Consider Performance**: Use CONCURRENTLY for index creation in production

## Future Enhancements

- [ ] Migration rollback scripts (down migrations)
- [ ] Dry-run mode to preview changes
- [ ] Migration dependencies and prerequisites
- [ ] Automatic backup before migrations
- [ ] Migration performance analytics
- [ ] Schema diff visualization

## Conclusion

This blockchain-inspired migration system ensures database consistency across all environments while maintaining a complete, immutable audit trail of all changes. By treating database changes as blockchain blocks, we've eliminated database drift and made deployments reliable and automatic.