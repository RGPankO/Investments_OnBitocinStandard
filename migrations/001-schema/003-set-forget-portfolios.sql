-- Migration: set-forget-portfolios
-- Date: 2025-09-21T00:00:00.000Z
-- Description: Add Set & Forget portfolio system with sharing capabilities

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Create set & forget portfolios table
CREATE TABLE IF NOT EXISTS set_forget_portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    initial_btc_amount BIGINT NOT NULL,
    share_token VARCHAR(255) UNIQUE,
    locked_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create allocations for set & forget portfolios
CREATE TABLE IF NOT EXISTS set_forget_allocations (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES set_forget_portfolios(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(10) NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    btc_amount BIGINT NOT NULL,
    asset_amount BIGINT NOT NULL,
    purchase_price_usd DECIMAL(15,8),
    btc_price_usd DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create achievements system
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    criteria JSONB NOT NULL,
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track user achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Create portfolio images tracking table
CREATE TABLE IF NOT EXISTS portfolio_images (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES set_forget_portfolios(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_set_forget_user ON set_forget_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_set_forget_token ON set_forget_portfolios(share_token);
CREATE INDEX IF NOT EXISTS idx_set_forget_allocations_portfolio ON set_forget_allocations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_portfolio ON portfolio_images(portfolio_id);