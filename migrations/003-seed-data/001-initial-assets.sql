-- Migration: initial-assets
-- Date: 2025-09-21T00:00:00.000Z
-- Description: Seed initial assets data

-- ============================================
-- IMPORTANT: This migration is immutable once applied!
-- Do not modify this file after it has been run in any environment.
-- ============================================

-- Insert core cryptocurrency
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('BTC', 'Bitcoin', 'crypto')
ON CONFLICT (symbol) DO NOTHING;

-- Insert major tech stocks
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('AAPL', 'Apple Inc.', 'stock'),
    ('TSLA', 'Tesla Inc.', 'stock'),
    ('MSFT', 'Microsoft Corp.', 'stock'),
    ('GOOGL', 'Alphabet Inc.', 'stock'),
    ('AMZN', 'Amazon.com Inc.', 'stock'),
    ('NVDA', 'NVIDIA Corp.', 'stock'),
    ('META', 'Meta Platforms', 'stock')
ON CONFLICT (symbol) DO NOTHING;

-- Insert traditional stocks
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('BRK-B', 'Berkshire Hathaway', 'stock'),
    ('JNJ', 'Johnson & Johnson', 'stock'),
    ('V', 'Visa Inc.', 'stock'),
    ('WMT', 'Walmart Inc.', 'stock'),
    ('SPY', 'S&P 500 ETF', 'etf')
ON CONFLICT (symbol) DO NOTHING;

-- Insert commodities
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('XAU', 'Gold', 'commodity'),
    ('XAG', 'Silver', 'commodity'),
    ('WTI', 'Crude Oil WTI', 'commodity')
ON CONFLICT (symbol) DO NOTHING;

-- Insert bonds ETFs
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('TLT', '20+ Year Treasury', 'bond'),
    ('HYG', 'High Yield Corporate', 'bond')
ON CONFLICT (symbol) DO NOTHING;

-- Insert real estate
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('VNQ', 'Vanguard REIT', 'reit'),
    ('VNO', 'Vornado Realty', 'reit'),
    ('PLD', 'Prologis', 'reit'),
    ('EQIX', 'Equinix', 'reit')
ON CONFLICT (symbol) DO NOTHING;

-- Insert commodity ETFs
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('CPER', 'Copper ETF', 'commodity'),
    ('WEAT', 'Wheat ETF', 'commodity'),
    ('UNG', 'Natural Gas ETF', 'commodity'),
    ('URA', 'Uranium ETF', 'commodity'),
    ('DBA', 'Agriculture ETF', 'commodity')
ON CONFLICT (symbol) DO NOTHING;

-- Insert international markets
INSERT INTO assets (symbol, name, asset_type) VALUES
    ('EWU', 'UK Market ETF', 'international'),
    ('EWG', 'Germany ETF', 'international'),
    ('EWJ', 'Japan ETF', 'international'),
    ('VXUS', 'International Stocks', 'international'),
    ('EFA', 'Developed Markets', 'international')
ON CONFLICT (symbol) DO NOTHING;