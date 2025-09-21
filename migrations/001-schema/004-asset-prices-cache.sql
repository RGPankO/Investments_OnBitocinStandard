-- Migration: asset-prices-cache
-- Date: 2025-09-21T00:00:00.000Z
-- Description: Create asset price caching table for better performance

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Create asset prices cache table
CREATE TABLE IF NOT EXISTS asset_prices_cache (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    price_usd DECIMAL(20,8) NOT NULL,
    price_btc DECIMAL(20,10),
    source VARCHAR(50) DEFAULT 'coingecko',
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    UNIQUE(symbol, source, fetched_at)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_asset_prices_symbol ON asset_prices_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_asset_prices_fetched ON asset_prices_cache(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_prices_valid ON asset_prices_cache(valid_until);

-- Add last_valid_price column to assets table if it doesn't exist
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS last_valid_price DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS last_price_source VARCHAR(50) DEFAULT 'api';