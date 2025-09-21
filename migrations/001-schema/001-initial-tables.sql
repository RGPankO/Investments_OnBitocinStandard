-- Migration: initial-tables
-- Date: 2025-09-21T00:00:00.000Z
-- Description: Create initial database schema for Bitcoin Investment Game

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create holdings table
CREATE TABLE IF NOT EXISTS holdings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(10) NOT NULL,
    amount BIGINT NOT NULL,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    from_asset VARCHAR(10) NOT NULL,
    to_asset VARCHAR(10) NOT NULL,
    from_amount BIGINT NOT NULL,
    to_amount BIGINT NOT NULL,
    btc_price_usd DECIMAL(15,2),
    asset_price_usd DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amounts CHECK (from_amount > 0 AND to_amount > 0)
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
    current_price_usd DECIMAL(15,8),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create magic_links table for authentication
CREATE TABLE IF NOT EXISTS magic_links (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchases table for tracking cost basis
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(10) NOT NULL,
    amount BIGINT NOT NULL,
    btc_spent BIGINT NOT NULL,
    purchase_price_usd DECIMAL(15,8),
    btc_price_usd DECIMAL(15,2),
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_purchase_amounts CHECK (amount > 0 AND btc_spent > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_asset ON holdings(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_asset ON purchases(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);