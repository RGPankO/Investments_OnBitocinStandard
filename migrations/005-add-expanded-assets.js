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

async function addExpandedAssets() {
  try {
    console.log('Adding expanded asset universe...');

    // New assets to add based on requirements
    const newAssets = [
      // Bond ETFs
      ['TLT', 'iShares 20+ Year Treasury Bond ETF', 'bond'],
      ['HYG', 'iShares iBoxx $ High Yield Corporate Bond ETF', 'bond'],

      // International Market Indices
      ['^FTSE', 'FTSE 100 Index', 'international'],
      ['^GDAXI', 'DAX Index (Germany)', 'international'],
      ['^N225', 'Nikkei 225 Index (Japan)', 'international'],

      // Additional REITs (International and sector-specific)
      ['VXUS', 'Vanguard Total International Stock ETF', 'international'],
      ['EFA', 'iShares MSCI EAFE ETF', 'international'],
      ['VNO', 'Vornado Realty Trust', 'reit'],
      ['PLD', 'Prologis Inc', 'reit'],
      ['EQIX', 'Equinix Inc', 'reit'],

      // Additional Commodities
      ['HG=F', 'Copper Futures', 'commodity'],
      ['ZW=F', 'Wheat Futures', 'commodity'],
      ['NG=F', 'Natural Gas Futures', 'commodity'],
      ['URA', 'Global X Uranium ETF', 'commodity'],
      ['DBA', 'Invesco DB Agriculture Fund', 'commodity'],

      // Additional Popular Stocks
      ['META', 'Meta Platforms Inc', 'stock'],
      ['BRK-B', 'Berkshire Hathaway Inc Class B', 'stock'],
      ['JNJ', 'Johnson & Johnson', 'stock'],
      ['V', 'Visa Inc', 'stock'],
      ['WMT', 'Walmart Inc', 'stock']
    ];

    // Check which assets already exist
    const existingAssetsResult = await pool.query('SELECT symbol FROM assets');
    const existingSymbols = new Set(existingAssetsResult.rows.map(row => row.symbol));

    // Filter out assets that already exist
    const assetsToAdd = newAssets.filter(([symbol]) => !existingSymbols.has(symbol));

    if (assetsToAdd.length === 0) {
      console.log('All expanded assets already exist in the database.');
      return;
    }

    console.log(`Adding ${assetsToAdd.length} new assets...`);

    // Insert new assets
    for (const [symbol, name, type] of assetsToAdd) {
      try {
        await pool.query(
          'INSERT INTO assets (symbol, name, asset_type) VALUES ($1, $2, $3)',
          [symbol, name, type]
        );
        console.log(`✓ Added: ${name} (${symbol}) - ${type}`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`○ Skipped: ${name} (${symbol}) - already exists`);
        } else {
          console.error(`✗ Failed to add ${symbol}:`, error.message);
        }
      }
    }

    // Display summary of all assets by category
    console.log('\n=== Asset Universe Summary ===');
    const allAssetsResult = await pool.query(
      'SELECT asset_type, COUNT(*) as count FROM assets GROUP BY asset_type ORDER BY asset_type'
    );

    allAssetsResult.rows.forEach(row => {
      console.log(`${row.asset_type}: ${row.count} assets`);
    });

    const totalResult = await pool.query('SELECT COUNT(*) as total FROM assets');
    console.log(`\nTotal assets: ${totalResult.rows[0].total}`);

    console.log('\n✅ Expanded asset universe setup complete!');

  } catch (error) {
    console.error('❌ Error adding expanded assets:', error);
  } finally {
    await pool.end();
  }
}

addExpandedAssets();