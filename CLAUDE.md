# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bitcoin Investment Game - A gamified investment platform where users start with 1 virtual Bitcoin and attempt to outperform holding BTC by trading it for stocks and commodities. All values are measured in satoshis instead of fiat currency, providing a Bitcoin-centric perspective on investing.

## Database Migrations

Migrations auto-run on `npm run dev` to prevent drift between developers. Place SQL files in `migrations/001-schema`, `002-functions`, or `003-seed-data` directories.

## Technical Commands for AI Development

```bash
# Database management scripts (for troubleshooting)
node scripts/wipe-database.js        # Clear all data
node scripts/rebuild-from-trades.js  # Rebuild portfolio from trade history
node scripts/rebuild-holdings.js     # Recalculate holdings
node scripts/fix-portfolio.js        # Fix portfolio inconsistencies
node scripts/debug-portfolio.js      # Debug portfolio data
```

## Architecture

### Backend Structure

**Express API Server** (`server.js`)
- Main routes mounted at `/api/*`:
  - `/api/auth` - Magic link authentication and JWT management
  - `/api/portfolio` - Portfolio tracking and valuation
  - `/api/trades` - Trade execution and history
  - `/api/assets` - Asset prices and market data
- Static frontend served from `/public`
- PostgreSQL connection pooling via `config/database.js`

### Database Schema

Key tables created in `scripts/setup-database.js`:
- **users**: User accounts with email-based auth
- **holdings**: Current asset positions per user
- **trades**: Complete trade history with BTC costs
- **magic_links**: Temporary auth tokens
- **purchases**: Asset purchase tracking with 24-hour lock

### Trading Logic

The core trading system (`routes/trades.js`) implements:
1. **24-hour Lock**: Assets cannot be sold back to BTC for 24 hours after purchase
2. **Cost Basis Tracking**: FIFO (First In, First Out) for tax-like calculations
3. **Real-time Pricing**: Integration with CoinGecko API for live BTC and asset prices
4. **Portfolio Valuation**: All values calculated in satoshis (100M sats = 1 BTC)

### Frontend Architecture

Single-page application (`public/app.js`) with:
- Vanilla JavaScript with no framework dependencies
- State management via global `window.app` object
- Real-time price updates every 30 seconds
- Tailwind CSS for styling
- Custom notification system for user feedback

## Key Implementation Details

### Authentication Flow
1. User requests magic link via email
2. Server generates JWT and stores in `magic_links` table
3. Email contains verification link with token
4. Frontend stores JWT in localStorage for session persistence

### Trade Execution Process
1. Validate user has sufficient BTC balance
2. Fetch current prices from CoinGecko
3. Calculate satoshi amounts based on USD prices
4. Create trade record and update holdings
5. Enforce 24-hour lock on new purchases

### Portfolio Calculation
- Holdings value = sum of (quantity � current_price_in_sats)
- P&L = current_value - cost_basis
- Cost basis tracked per trade for accurate calculations
- All calculations done in satoshis to avoid floating point issues

## External Dependencies

### Critical APIs
- **CoinGecko API**: Real-time price data for BTC and assets
  - No API key required for basic usage
  - Rate limits apply (50 calls/minute)
  - Fallback to cached prices if API fails

### Environment Variables
Required in `.env`:
- `DB_*`: PostgreSQL connection details
- `JWT_SECRET`: Token signing key
- `PORT`: Server port (default 3000)
- `EMAIL_*`: SMTP settings for magic links (optional in dev)

## Development Workflow

### Adding New Assets
1. Update asset list in `routes/assets.js`
2. Add CoinGecko ID mapping for price fetching
3. Update frontend UI to display new asset

### Database Migrations
- Manual SQL scripts in `scripts/` directory
- Run setup script to create initial schema
- Use rebuild scripts to fix data inconsistencies

### Testing Price Calculations
- All monetary values stored as BIGINT satoshis
- Use `Math.floor()` to avoid decimal satoshi amounts
- Test with extreme values (0.01 sats to 100M sats)

## Common Issues & Solutions

### Portfolio Discrepancies
Run `node scripts/rebuild-from-trades.js` to recalculate from trade history

### Database Connection Issues
Check PostgreSQL is running and `.env` credentials are correct

### Price Fetching Failures
- Check CoinGecko API status
- Implement fallback to last known prices
- Consider caching strategy for resilience

## Recent Features (Sep 2025)

### 1. Suggestions & Bug Report System
Implemented comprehensive user feedback system
- **Floating action button** with glow animations (bottom-right corner)
- **Two-tab modal**: "Submit New" and "My Suggestions"
- **Rate limiting**: 1-hour cooldown between submissions
- **Authentication required**: Login check with redirect
- **Real-time countdown**: Shows remaining time for rate limit
- **Admin replies**: Support for admin responses to suggestions
- **Database**: New `suggestions` table with status tracking

#### Team Migration Instructions:
```bash
git pull
npm run update-db  # Creates suggestions table and indexes
```

#### Admin Setup:
To grant admin access to users, add their emails to the `ADMIN_EMAILS` environment variable in your local `.env` file:
```bash
# In your .env file (local only, not committed)
ADMIN_EMAILS=your@email.com,colleague@email.com
```

Alternatively, promote users via database:
```sql
UPDATE users SET is_admin = true WHERE email = 'user@email.com';
```

#### API Endpoints:
- `POST /api/suggestions` - Submit suggestion/bug report (auth required)
- `GET /api/suggestions` - Get user's suggestions (auth required)
- `GET /api/suggestions/all` - Get all suggestions (public for now)
- `PUT /api/suggestions/:id` - Update status/reply (public for now)
- `GET /api/suggestions/rate-limit` - Check rate limit status (auth required)

### 2. Performance Calculation Bug
Fixed missing performance calculation in frontend (`public/app.js` lines 234-252)
- Calculates: `(current_value - initial_1BTC) / initial_1BTC * 100`
- Updates color based on positive/negative performance

### 3. 30-Second Auto-Refresh
Implemented automatic price updates every 30 seconds
- Added `startPriceAutoRefresh()` and `stopPriceAutoRefresh()` methods
- Auto-starts on login, stops on logout
- Refreshes both prices and portfolio values

### 4. API Rate Limiting & Error Handling
Added fallback handling for CoinGecko API rate limits
- Falls back to last known database price when API fails
- Default fallback price of $115,000 for BTC

### 5. Gold Price Unit Conversion
Fixed Gold (XAU) price conversion from per-gram to per-troy-ounce
- CoinGecko returns gold price per gram
- Multiply by 31.1035 to convert to troy ounces
- Corrected stored amounts in database

# Kiro - tasks list
I might have created for you a task list in @.kiro/specs/bitcoin-game-enhancements/ - there are 3 files - design.md, which explains the design, requirements.md - how its going to work and tasks.md - a trackable list of where are we at - completed tasks are market with [x], not completed as [ ] - do not change this syntax, do not add to it or amend it in anyway, just mark as done what is done and only if you are marking something as done and want to add additional comments to it then you can amend slightly this point with the most important data, but unless asked for it do not amend any of these documents in this directory. When you are asked to complete a task and you have

# Updating database with scripts
Other developers are developing this project, so when we do database updates we need to have updates with update-db scripts, as if we run directly the sql commands we will have database mismatch.

# DRY and KISS
Keep It Simple Stupid - dont overcomplicate the code and architecture
Dont Repeat Yourself - use templates, modules, reuse CSS, reuse the html and classes, etc, reuse function and more - we want small code base, not bloated with lots of repetitions

# Don't introduce unexpected changes when asked to fix something
When asked to fix something specific dont introduce new unexpected results.
Be proactive only when developing or when asked, but not when asked to fix one specific issue that we want to commit after that, we dont want to have other changes that are unplanned, as we are working on a fix.

# Meaningfull commits
When asked to commit also commit with meaningful messages and useful descriptions, and if there's a need for the other devs to do something on git pull stay so on the description and if tis crucial a keyword in the git commit meain message. When creating commits we must separate files in different commits if they are not related to the same task. Claude.md updates or else changes need to be in different commits as they are instruction for AI, not project amendments visible to the users. Also we dont mention bugfixes that we introduced while working on a feature, we just mention the features.
additionally when committin we can check if task was completed so we cross it off the Kiro task list.

# Don;'t assume - check
Don't assume function names, database names, etc - always check.
Check that database name, check that function name, if you assume even if it makes sense you could make a mistake.
Maybe its called in a weird way, that API endpoint or that function name.
Don't assume you need a new list or variable or whatever, check if it exists first so you use it if possible.

# Dont try to commit things from .gitignore-d directories
They are git ignored for a reason, no version control there.

# Alert for problems
If while browsing the codebase while working on something if you see a problem alert the user so he knows what you have noticed that could be a problem - duplicated code, even if not related to your current task, raise awareness of bad code structure, ways to improve, logical bugs and more. Dont jump on fixing whe noticing, just alert the user, fix after confirmation as something might be intended or decided upon.