const express = require('express');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

// Check if user exists
router.post('/check-user', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ exists: user.rows.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request magic link
router.post('/request-link', async (req, res) => {
  const { email, username } = req.body;

  try {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Check if user exists
    let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0 && username) {
      // Create new user
      const newUser = await pool.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
        [username, email]
      );

      // Give them 1 BTC (100,000,000 satoshis)
      await pool.query(
        'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
        [newUser.rows[0].id, 'BTC', 100000000]
      );

      user = newUser;
    }

    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'User not found. Please provide username for registration.' });
    }

    // Store magic link
    await pool.query(
      'INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, expiresAt]
    );

    // Generate magic link URL based on environment
    const baseUrl = process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    // Try /auth/verify first, fallback to API route if needed
    const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;
    const fallbackUrl = `${baseUrl}/api/auth/verify-redirect?token=${token}`;
    console.log(`Magic link for ${email}: ${magicLinkUrl}`);
    console.log(`Fallback URL: ${fallbackUrl}`);

    res.json({
      message: 'Magic link sent! Check console for now.',
      magicLink: magicLinkUrl // Include the link in response for dev mode
    });
  } catch (error) {
    console.error(error);

    // Handle duplicate username error
    if (error.code === '23505' && error.constraint === 'users_username_key') {
      return res.status(400).json({ error: 'This username is already taken. Please choose a different username.' });
    }

    // Handle duplicate email error
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    res.status(500).json({ error: 'Server error' });
  }
});

// Verify magic link
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    const link = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW() AND used = false',
      [token]
    );

    if (link.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Mark token as used
    await pool.query('UPDATE magic_links SET used = true WHERE token = $1', [token]);

    // Get user
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [link.rows[0].email]);

    // Check admin status for JWT token
    const { isUserAdminByData } = require('../utils/adminCheck');
    const isAdmin = await isUserAdminByData(user.rows[0]);

    // Generate JWT with admin status
    const jwtToken = jwt.sign(
      {
        userId: user.rows[0].id,
        email: user.rows[0].email,
        isAdmin: isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Include admin status in user object for frontend
    const userWithAdmin = {
      ...user.rows[0],
      isAdmin: isAdmin
    };

    res.json({ token: jwtToken, user: userWithAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;