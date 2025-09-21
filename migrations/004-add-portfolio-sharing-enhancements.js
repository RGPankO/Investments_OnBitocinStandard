#!/usr/bin/env node

/**
 * Database Update Script: Portfolio Sharing System Enhancements
 *
 * This script adds the necessary database changes for the portfolio sharing system
 * including image generation tracking.
 *
 * Run with: npm run update-db:portfolio-sharing
 * Or directly: node scripts/add-portfolio-sharing-enhancements.js
 */

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

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Portfolio Sharing System database migration...');

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'set_forget_portfolios'
      AND column_name = 'last_image_generated'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('📊 Adding last_image_generated column to set_forget_portfolios table...');

      await client.query(`
        ALTER TABLE set_forget_portfolios
        ADD COLUMN last_image_generated TIMESTAMP;
      `);

      console.log('✅ Column last_image_generated added successfully');
    } else {
      console.log('ℹ️  Column last_image_generated already exists, skipping...');
    }

    // Clear any existing image generation timestamps to force regeneration
    console.log('🔄 Clearing existing image generation timestamps...');
    const updateResult = await client.query(`
      UPDATE set_forget_portfolios
      SET last_image_generated = NULL;
    `);

    console.log(`✅ Cleared ${updateResult.rowCount} image generation timestamps`);

    console.log('🎉 Portfolio Sharing System migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- Added image generation tracking column');
    console.log('- Cleared existing timestamps for fresh image generation');
    console.log('- Portfolio images will now regenerate with latest enhancements');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✨ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };