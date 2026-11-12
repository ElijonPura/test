const express = require('express');
const router = express.Router();
const { query, get, run } = require('../db');

/**
 * GET /api/profile
 * Get saved customer profile
 */
router.get('/', (req, res) => {
  try {
    const { phone } = req.query;
    let profile = null;
    if (phone) {
      profile = get('SELECT name, phone, address FROM customer_profiles WHERE phone = ?', [phone.trim()]);
    } else {
      profile = get('SELECT name, phone, address FROM customer_profiles ORDER BY updated_at DESC LIMIT 1');
    }
    res.json(profile || { name: '', phone: '', address: '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer profile', details: err.message });
  }
});

/**
 * POST /api/profile
 * Upsert customer profile
 */
router.post('/', (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    run(`
      INSERT INTO customer_profiles (name, phone, address, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        address = excluded.address,
        updated_at = CURRENT_TIMESTAMP
    `, [name.trim(), phone.trim(), (address || '').trim()]);

    const updated = get('SELECT name, phone, address FROM customer_profiles WHERE phone = ?', [phone.trim()]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer profile', details: err.message });
  }
});

/**
 * GET /api/favorites
 * List favorited product IDs
 */
router.get('/favorites', (req, res) => {
  try {
    const rows = query('SELECT product_id FROM favorites ORDER BY created_at DESC');
    res.json(rows.map(r => r.product_id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorites', details: err.message });
  }
});

/**
 * POST /api/favorites/toggle
 * Toggle favorite state for a product
 */
router.post('/favorites/toggle', (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const existing = get('SELECT product_id FROM favorites WHERE product_id = ?', [productId]);
    let isFavorited = false;

    if (existing) {
      run('DELETE FROM favorites WHERE product_id = ?', [productId]);
      isFavorited = false;
    } else {
      run('INSERT INTO favorites (product_id) VALUES (?)', [productId]);
      isFavorited = true;
    }

    const allFavs = query('SELECT product_id FROM favorites').map(r => r.product_id);
    res.json({ productId, isFavorited, allFavorites: allFavs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite', details: err.message });
  }
});

module.exports = router;
