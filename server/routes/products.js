const express = require('express');
const router = express.Router();
const { query, get, run } = require('../db');
const { requireAdmin } = require('../auth');

function formatProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    calories: row.calories,
    description: row.description,
    image: row.image,
    tags: JSON.parse(row.tags || '[]'),
    hasSizes: Boolean(row.has_sizes),
    sizes: JSON.parse(row.sizes || '[]'),
    ingredients: JSON.parse(row.ingredients || '[]'),
    extras: JSON.parse(row.extras || '[]'),
    isAvailable: Boolean(row.is_available)
  };
}

/**
 * GET /api/categories
 * List all categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = query('SELECT id, name, icon, sort_order FROM categories ORDER BY sort_order ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
  }
});

/**
 * GET /api/products
 * List products with optional category and search filters
 */
router.get('/products', (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM products WHERE is_available = 1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY rowid ASC';
    const rows = query(sql, params);
    res.json(rows.map(formatProduct));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/products/:id', (req, res) => {
  try {
    const row = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(formatProduct(row));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product', details: err.message });
  }
});

/**
 * POST /api/products
 * Add product (Admin only)
 */
router.post('/products', requireAdmin, (req, res) => {
  try {
    const {
      name,
      category,
      price,
      calories = '',
      description = '',
      image = '',
      tags = []
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Product name is required' });
    if (!category || !category.trim()) return res.status(400).json({ error: 'Category is required' });
    if (price === undefined || isNaN(Number(price))) return res.status(400).json({ error: 'Valid price is required' });

    const productId = 'prod-' + Date.now();
    const finalImage = (image && image.trim()) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

    run(`
      INSERT INTO products (
        id, name, category, price, calories, description, image,
        tags, has_sizes, sizes, ingredients, extras, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '[]', '[]', '[]', 1)
    `, [
      productId,
      name.trim(),
      category.trim(),
      Number(price),
      calories.trim(),
      description.trim(),
      finalImage,
      JSON.stringify(Array.isArray(tags) ? tags : [tags].filter(Boolean))
    ]);

    const created = get('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json(formatProduct(created));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Remove product (Admin only)
 */
router.delete('/products/:id', requireAdmin, (req, res) => {
  try {
    const existing = get('SELECT id, name FROM products WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    run('DELETE FROM favorites WHERE product_id = ?', [req.params.id]);
    run('DELETE FROM products WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: `Product "${existing.name}" removed.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove product', details: err.message });
  }
});

module.exports = router;
