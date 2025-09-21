const { Pool } = require('pg');
require('dotenv').config();

// Use connection string if available (Vercel Postgres), otherwise fall back to individual credentials
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

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create holdings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS holdings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        asset_symbol VARCHAR(10) NOT NULL,
        amount BIGINT NOT NULL,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create trades table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        from_asset VARCHAR(10) NOT NULL,
        to_asset VARCHAR(10) NOT NULL,
        from_amount BIGINT NOT NULL,
        to_amount BIGINT NOT NULL,
        btc_price_usd DECIMAL(15,2),
        asset_price_usd DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create assets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        symbol VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        asset_type VARCHAR(20) NOT NULL,
        current_price_usd DECIMAL(15,8),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create magic_links table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create purchases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        asset_symbol VARCHAR(10) NOT NULL,
        amount BIGINT NOT NULL,
        btc_spent BIGINT NOT NULL,
        purchase_price_usd DECIMAL(15,8),
        btc_price_usd DECIMAL(15,2),
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('All tables created successfully');

    // Insert initial assets
    const initialAssets = [
      ['BTC', 'Bitcoin', 'crypto'],
      ['AAPL', 'Apple Inc.', 'stock'],
      ['TSLA', 'Tesla Inc.', 'stock'],
      ['MSFT', 'Microsoft Corp.', 'stock'],
      ['GOOGL', 'Alphabet Inc.', 'stock'],
      ['AMZN', 'Amazon.com Inc.', 'stock'],
      ['NVDA', 'NVIDIA Corp.', 'stock'],
      ['XAU', 'Gold', 'commodity'],
      ['XAG', 'Silver', 'commodity'],
      ['WTI', 'Crude Oil WTI', 'commodity']
    ];

    for (const [symbol, name, type] of initialAssets) {
      await pool.query(
        'INSERT INTO assets (symbol, name, asset_type) VALUES ($1, $2, $3) ON CONFLICT (symbol) DO NOTHING',
        [symbol, name, type]
      );
    }

    console.log('Initial assets inserted successfully');
    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });