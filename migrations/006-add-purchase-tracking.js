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

async function addPurchaseTracking() {
  try {
    // Create purchases table to track individual buys
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

    console.log('Purchases table created successfully');

    // Migrate existing trades to purchases
    const existingTrades = await pool.query(`
      SELECT * FROM trades 
      WHERE from_asset = 'BTC' AND to_asset != 'BTC'
      ORDER BY created_at
    `);

    console.log(`Found ${existingTrades.rows.length} trades to migrate`);

    for (const trade of existingTrades.rows) {
      // Check if this purchase already exists
      const existing = await pool.query(
        'SELECT id FROM purchases WHERE user_id = $1 AND asset_symbol = $2 AND created_at = $3',
        [trade.user_id, trade.to_asset, trade.created_at]
      );

      if (existing.rows.length === 0) {
        // Calculate lock time (24 hours from trade time)
        const lockUntil = new Date(new Date(trade.created_at).getTime() + 24 * 60 * 60 * 1000);
        
        await pool.query(`
          INSERT INTO purchases (user_id, asset_symbol, amount, btc_spent, purchase_price_usd, btc_price_usd, locked_until, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          trade.user_id,
          trade.to_asset,
          trade.to_amount,
          trade.from_amount,
          trade.asset_price_usd,
          trade.btc_price_usd,
          lockUntil,
          trade.created_at
        ]);
        
        console.log(`Migrated trade: ${trade.to_amount / 100000000} ${trade.to_asset} for ${trade.from_amount / 100000000} BTC`);
      }
    }

    console.log('Existing holdings migrated to purchases table');
    
  } catch (error) {
    console.error('Error adding purchase tracking:', error);
  } finally {
    await pool.end();
  }
}

addPurchaseTracking();