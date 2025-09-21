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

async function addKiroEnhancements() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Kiro enhancements database migration...\n');

    // Begin transaction
    await client.query('BEGIN');

    // 1. Create set_forget_portfolios table
    console.log('1. Creating set_forget_portfolios table...');
    const setForgetPortfoliosExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'set_forget_portfolios'
      );
    `);

    if (!setForgetPortfoliosExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE set_forget_portfolios (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          initial_btc_amount BIGINT NOT NULL,
          share_token VARCHAR(255) UNIQUE,
          locked_until TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ set_forget_portfolios table created');
    } else {
      console.log('⏭️  set_forget_portfolios table already exists');
    }

    // 2. Create set_forget_allocations table
    console.log('2. Creating set_forget_allocations table...');
    const setForgetAllocationsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'set_forget_allocations'
      );
    `);

    if (!setForgetAllocationsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE set_forget_allocations (
          id SERIAL PRIMARY KEY,
          portfolio_id INTEGER REFERENCES set_forget_portfolios(id) ON DELETE CASCADE,
          asset_symbol VARCHAR(10) NOT NULL,
          allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
          btc_amount BIGINT NOT NULL,
          asset_amount BIGINT NOT NULL,
          purchase_price_usd DECIMAL(15,8),
          btc_price_usd DECIMAL(15,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ set_forget_allocations table created');
    } else {
      console.log('⏭️  set_forget_allocations table already exists');
    }

    // 3. Create achievements table
    console.log('3. Creating achievements table...');
    const achievementsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'achievements'
      );
    `);

    if (!achievementsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE achievements (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          criteria JSONB NOT NULL,
          icon VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ achievements table created');
    } else {
      console.log('⏭️  achievements table already exists');
    }

    // 4. Create user_achievements table
    console.log('4. Creating user_achievements table...');
    const userAchievementsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_achievements'
      );
    `);

    if (!userAchievementsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE user_achievements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, achievement_id)
        )
      `);
      console.log('✅ user_achievements table created');
    } else {
      console.log('⏭️  user_achievements table already exists');
    }

    // 5. Create email_preferences table
    console.log('5. Creating email_preferences table...');
    const emailPreferencesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'email_preferences'
      );
    `);

    if (!emailPreferencesExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE email_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          monthly_updates BOOLEAN DEFAULT false,
          achievement_notifications BOOLEAN DEFAULT true,
          portfolio_reminders BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ email_preferences table created');
    } else {
      console.log('⏭️  email_preferences table already exists');
    }

    // 6. Create educational_content table
    console.log('6. Creating educational_content table...');
    const educationalContentExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'educational_content'
      );
    `);

    if (!educationalContentExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE educational_content (
          id SERIAL PRIMARY KEY,
          page_key VARCHAR(50) NOT NULL,
          language VARCHAR(10) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(page_key, language)
        )
      `);
      console.log('✅ educational_content table created');
    } else {
      console.log('⏭️  educational_content table already exists');
    }

    // 7. Create database indexes for optimal performance
    console.log('\n7. Creating database indexes...');

    const indexes = [
      // Set & Forget Portfolios indexes
      { table: 'set_forget_portfolios', column: 'user_id', name: 'idx_set_forget_portfolios_user_id' },
      { table: 'set_forget_portfolios', column: 'share_token', name: 'idx_set_forget_portfolios_share_token' },
      { table: 'set_forget_portfolios', column: 'locked_until', name: 'idx_set_forget_portfolios_locked_until' },

      // Set & Forget Allocations indexes
      { table: 'set_forget_allocations', column: 'portfolio_id', name: 'idx_set_forget_allocations_portfolio_id' },
      { table: 'set_forget_allocations', column: 'asset_symbol', name: 'idx_set_forget_allocations_asset_symbol' },

      // Achievements indexes
      { table: 'achievements', column: 'code', name: 'idx_achievements_code' },

      // User Achievements indexes
      { table: 'user_achievements', column: 'user_id', name: 'idx_user_achievements_user_id' },
      { table: 'user_achievements', column: 'achievement_id', name: 'idx_user_achievements_achievement_id' },
      { table: 'user_achievements', column: 'earned_at', name: 'idx_user_achievements_earned_at' },

      // Email Preferences indexes
      { table: 'email_preferences', column: 'user_id', name: 'idx_email_preferences_user_id' },

      // Educational Content indexes
      { table: 'educational_content', column: 'page_key', name: 'idx_educational_content_page_key' },
      { table: 'educational_content', column: 'language', name: 'idx_educational_content_language' },
      { table: 'educational_content', columns: ['page_key', 'language'], name: 'idx_educational_content_page_key_language' }
    ];

    for (const index of indexes) {
      try {
        const indexExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes
            WHERE indexname = $1
          );
        `, [index.name]);

        if (!indexExists.rows[0].exists) {
          if (index.columns) {
            // Composite index
            await client.query(`CREATE INDEX ${index.name} ON ${index.table}(${index.columns.join(', ')})`);
          } else {
            // Single column index
            await client.query(`CREATE INDEX ${index.name} ON ${index.table}(${index.column})`);
          }
          console.log(`✅ Index ${index.name} created`);
        } else {
          console.log(`⏭️  Index ${index.name} already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Warning: Could not create index ${index.name}: ${error.message}`);
      }
    }

    // 8. Insert initial achievements
    console.log('\n8. Inserting initial achievements...');

    const initialAchievements = [
      {
        code: 'diamond_hands',
        name: 'Diamond Hands 💎',
        description: 'Hold assets for 1+ years without selling',
        criteria: { type: 'holding_duration', value: 365, unit: 'days' },
        icon: '💎'
      },
      {
        code: 'diversifier',
        name: 'Diversifier 🌐',
        description: 'Own 10+ different assets simultaneously',
        criteria: { type: 'asset_count', value: 10 },
        icon: '🌐'
      },
      {
        code: 'first_trade',
        name: 'First Trade 🎯',
        description: 'Complete your first asset trade',
        criteria: { type: 'trade_count', value: 1 },
        icon: '🎯'
      },
      {
        code: 'set_forget_creator',
        name: 'Set & Forget Creator 🔒',
        description: 'Create your first Set & Forget portfolio',
        criteria: { type: 'set_forget_count', value: 1 },
        icon: '🔒'
      },
      {
        code: 'portfolio_sharer',
        name: 'Portfolio Sharer 📤',
        description: 'Share a portfolio publicly',
        criteria: { type: 'portfolio_shares', value: 1 },
        icon: '📤'
      },
      {
        code: 'bitcoin_believer',
        name: 'Bitcoin Believer ⚡',
        description: 'Complete all educational content',
        criteria: { type: 'education_complete', value: true },
        icon: '⚡'
      }
    ];

    for (const achievement of initialAchievements) {
      try {
        const exists = await client.query(
          'SELECT id FROM achievements WHERE code = $1',
          [achievement.code]
        );

        if (exists.rows.length === 0) {
          await client.query(`
            INSERT INTO achievements (code, name, description, criteria, icon)
            VALUES ($1, $2, $3, $4, $5)
          `, [achievement.code, achievement.name, achievement.description, JSON.stringify(achievement.criteria), achievement.icon]);
          console.log(`✅ Achievement "${achievement.name}" inserted`);
        } else {
          console.log(`⏭️  Achievement "${achievement.name}" already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Warning: Could not insert achievement ${achievement.code}: ${error.message}`);
      }
    }

    // 9. Insert initial educational content
    console.log('\n9. Inserting initial educational content...');

    const initialEducationalContent = [
      // Why Bitcoin? - English
      {
        page_key: 'why_bitcoin',
        language: 'en',
        title: 'Why Bitcoin?',
        content: `# Why Bitcoin?

Bitcoin represents a paradigm shift in our understanding of money. It is the first truly neutral, apolitical form of money that humanity has ever created.

## Key Properties of Bitcoin

### 1. Decentralization
No single entity controls Bitcoin. It operates on a distributed network of thousands of nodes worldwide.

### 2. Fixed Supply
Only 21 million Bitcoin will ever exist. This scarcity makes it the hardest money ever created.

### 3. Permissionless
Anyone can use Bitcoin without asking for permission from banks or governments.

### 4. Censorship Resistant
Bitcoin transactions cannot be stopped or reversed by any authority.

### 5. Portable
Bitcoin can be sent anywhere in the world instantly, 24/7, without intermediaries.

## The Unit of Account Revolution

When we measure wealth in Bitcoin instead of fiat currency, we see the true performance of assets. Traditional assets consistently lose value when measured against Bitcoin, revealing the broken nature of fiat money as a measuring stick.

This platform demonstrates this principle by showing how various assets perform when Bitcoin is used as the unit of account.`,
        metadata: JSON.stringify({
          author: 'Bitcoin Standard Platform',
          lastUpdated: new Date().toISOString(),
          readingTime: '5 minutes'
        })
      },

      // Why Not Gold? - English
      {
        page_key: 'why_not_gold',
        language: 'en',
        title: 'Why Not Gold?',
        content: `# Why Not Gold?

Gold served as money for thousands of years, but its time has passed. Here's why gold cannot return as the global monetary standard.

## Historical Context

### The Gold Standard Era (1879-1971)
- Countries backed their currencies with gold
- International trade settled in gold
- Economic stability during the classical gold standard

### The End of Gold Money
- 1933: FDR banned private gold ownership in the US
- 1944: Bretton Woods system created gold-backed USD
- 1971: Nixon ended gold convertibility permanently

## Why Gold Cannot Return

### 1. Physical Limitations
Gold is heavy, difficult to transport, and expensive to store securely.

### 2. Government Control
Governments have repeatedly confiscated gold throughout history.

### 3. Verification Difficulty
Testing gold purity and authenticity is complex and time-consuming.

### 4. Inflation Issues
Gold supply increases unpredictably with new mining discoveries.

### 5. Central Bank Manipulation
Central banks still hold and trade gold, affecting its price.

## Bitcoin Solves Gold's Problems

Bitcoin maintains all of gold's monetary properties while solving its physical limitations:
- **Digital**: No storage or transport issues
- **Verifiable**: Cryptographic proof eliminates counterfeiting
- **Fixed Supply**: No inflation from new discoveries
- **Unseizable**: Properly stored Bitcoin cannot be confiscated

The future of money is digital, and Bitcoin is that future.`,
        metadata: JSON.stringify({
          author: 'Bitcoin Standard Platform',
          lastUpdated: new Date().toISOString(),
          readingTime: '7 minutes'
        })
      },

      // The Fiat Experiment - English
      {
        page_key: 'fiat_experiment',
        language: 'en',
        title: 'The Fiat Experiment',
        content: `# The Fiat Experiment

We are living through the greatest monetary experiment in human history. Since 1971, the entire world has operated on fiat currency - money backed by nothing but government promises.

## The Timeline of Monetary Debasement

### 1971: The Nixon Shock
- August 15, 1971: President Nixon ends gold convertibility
- "Temporary" suspension becomes permanent
- Global monetary system becomes purely fiat

### 1973-Present: The Fiat Era
- All major currencies become free-floating
- Central banks gain unlimited money printing power
- Inflation becomes a permanent feature of the economy

## The Consequences of Fiat Money

### 1. Purchasing Power Decline
The US dollar has lost over 95% of its purchasing power since 1971.

### 2. Asset Price Inflation
Real estate, stocks, and other assets inflate as people flee currency debasement.

### 3. Increased Inequality
Asset owners benefit while savers are punished.

### 4. Boom-Bust Cycles
Easy money creates artificial booms followed by inevitable busts.

### 5. Government Expansion
Unlimited money printing enables unlimited government growth.

## Measuring in Bitcoin Reveals the Truth

When we use Bitcoin as our unit of account instead of fiat currency, we see:
- Most assets lose value over time
- Only truly productive investments outperform
- The arbitrary nature of fiat price increases becomes clear

## The Return to Sound Money

Bitcoin offers a return to sound money principles:
- **Fixed Supply**: No arbitrary inflation
- **Neutral**: No government control
- **Global**: Works across all borders
- **Digital**: Fits our modern world

The fiat experiment is failing. Bitcoin is the solution.`,
        metadata: JSON.stringify({
          author: 'Bitcoin Standard Platform',
          lastUpdated: new Date().toISOString(),
          readingTime: '8 minutes'
        })
      }
    ];

    for (const content of initialEducationalContent) {
      try {
        const exists = await client.query(
          'SELECT id FROM educational_content WHERE page_key = $1 AND language = $2',
          [content.page_key, content.language]
        );

        if (exists.rows.length === 0) {
          await client.query(`
            INSERT INTO educational_content (page_key, language, title, content, metadata)
            VALUES ($1, $2, $3, $4, $5)
          `, [content.page_key, content.language, content.title, content.content, content.metadata]);
          console.log(`✅ Educational content "${content.title}" (${content.language}) inserted`);
        } else {
          console.log(`⏭️  Educational content "${content.title}" (${content.language}) already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Warning: Could not insert educational content ${content.page_key}: ${error.message}`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n🎉 Kiro enhancements migration completed successfully!');

    // Display summary
    console.log('\n📊 Migration Summary:');
    console.log('✅ set_forget_portfolios table');
    console.log('✅ set_forget_allocations table');
    console.log('✅ achievements table');
    console.log('✅ user_achievements table');
    console.log('✅ email_preferences table');
    console.log('✅ educational_content table');
    console.log('✅ Database indexes');
    console.log('✅ Initial achievements');
    console.log('✅ Initial educational content');

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addKiroEnhancements();
    console.log('\n🚀 Ready to proceed with Kiro enhancements implementation!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { addKiroEnhancements };