const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
  // Fallback to individual credentials if no connection string
  ...((!process.env.POSTGRES_URL && !process.env.PRISMA_DATABASE_URL) && {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })
});

async function addSuggestionsTable() {
  try {
    console.log('Checking if suggestions table exists...');

    // Check if table already exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'suggestions'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Suggestions table already exists, skipping creation');
      return;
    }

    console.log('Creating suggestions table...');

    // Create suggestions table
    await pool.query(`
      CREATE TABLE suggestions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(20) NOT NULL CHECK (type IN ('suggestion', 'bug')),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        admin_reply TEXT,
        replied_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Suggestions table created successfully');

    // Create index for better performance
    await pool.query(`
      CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
    `);

    await pool.query(`
      CREATE INDEX idx_suggestions_status ON suggestions(status);
    `);

    console.log('✅ Indexes created successfully');

    // Add admin column to users table
    console.log('Checking if admin column exists in users table...');

    const adminColumnExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_admin'
      );
    `);

    if (!adminColumnExists.rows[0].exists) {
      console.log('Adding is_admin column to users table...');

      await pool.query(`
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
      `);

      await pool.query(`
        CREATE INDEX idx_users_is_admin ON users(is_admin);
      `);

      console.log('✅ Admin column and index added successfully');
    } else {
      console.log('✅ Admin column already exists, skipping creation');
    }

    // Verify table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'suggestions'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Suggestions table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    // Verify users table structure
    const usersTableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n👤 Users table structure:');
    usersTableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error adding suggestions table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

console.log('🚀 Starting database migration for suggestions table...');
addSuggestionsTable();