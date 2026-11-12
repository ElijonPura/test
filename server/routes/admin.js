const express = require('express');
const router = express.Router();
const { query, get, run } = require('../db');
const { requireAdmin } = require('../auth');

// Protect all admin routes
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Overview analytics for the admin dashboard
 */
router.get('/stats', (req, res) => {
  try {
    const orderStat = get(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total), 0) as totalRevenue
      FROM orders
    `);

    const userStat = get("SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'");
    const prodStat = get('SELECT COUNT(*) as totalProducts FROM products WHERE is_available = 1');

    const statusRows = query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);

    const statusBreakdown = {};
    for (const row of statusRows) {
      statusBreakdown[row.status] = row.count;
    }

    res.json({
      totalOrders: Number(orderStat.totalOrders || 0),
      totalRevenue: Number(Number(orderStat.totalRevenue || 0).toFixed(2)),
      totalUsers: Number(userStat.totalUsers || 0),
      totalProducts: Number(prodStat.totalProducts || 0),
      statusBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve stats', details: err.message });
  }
});

/**
 * GET /api/admin/orders
 * Retrieve all orders with customer profile details (who placed each order)
 */
router.get('/orders', (req, res) => {
  try {
    const orderRows = query(`
      SELECT 
        o.*,
        u.name as registeredUserName,
        u.email as registeredUserEmail,
        u.phone as registeredUserPhone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    const orders = orderRows.map(o => {
      const itemRows = query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      return {
        id: o.id,
        userId: o.user_id,
        customerName: o.customer_name,
        customerEmail: o.registeredUserEmail || 'Guest / Not Registered',
        registeredUserName: o.registeredUserName || o.customer_name,
        customerPhone: o.customer_phone,
        customerAddress: o.customer_address,
        orderType: o.order_type,
        paymentMethod: o.payment_method,
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.delivery_fee),
        discount: Number(o.discount),
        tip: Number(o.tip),
        total: Number(o.total),
        status: o.status,
        step: Number(o.step),
        itemsText: o.items_text,
        generalNote: o.general_note,
        createdAt: o.created_at,
        fullDate: new Date(o.created_at).toLocaleString(),
        items: itemRows.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          selectedSize: i.selected_size,
          selectedExtras: JSON.parse(i.selected_extras || '[]'),
          itemComment: i.item_comment
        }))
      };
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve admin orders', details: err.message });
  }
});

/**
 * POST /api/admin/products
 * Add a new product to the database
 */
router.post('/products', (req, res) => {
  try {
    const {
      name,
      category,
      price,
      calories = '',
      description = '',
      image = '',
      tags = [],
      hasSizes = false,
      sizes = [],
      ingredients = [],
      extras = []
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Product category is required' });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'Valid product price is required' });
    }

    const productId = 'prod-' + Date.now();
    const finalImage = image.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

    run(`
      INSERT INTO products (
        id, name, category, price, calories, description, image,
        tags, has_sizes, sizes, ingredients, extras, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      productId,
      name.trim(),
      category.trim(),
      Number(price),
      calories.trim(),
      description.trim(),
      finalImage,
      JSON.stringify(Array.isArray(tags) ? tags : [tags].filter(Boolean)),
      hasSizes ? 1 : 0,
      JSON.stringify(sizes || []),
      JSON.stringify(ingredients || []),
      JSON.stringify(extras || [])
    ]);

    const created = get('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json({
      id: created.id,
      name: created.name,
      category: created.category,
      price: Number(created.price),
      calories: created.calories,
      description: created.description,
      image: created.image,
      tags: JSON.parse(created.tags || '[]'),
      hasSizes: Boolean(created.has_sizes),
      sizes: JSON.parse(created.sizes || '[]'),
      ingredients: JSON.parse(created.ingredients || '[]'),
      extras: JSON.parse(created.extras || '[]'),
      isAvailable: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Remove a product from the database
 */
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = get('SELECT id, name FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    run('DELETE FROM favorites WHERE product_id = ?', [id]);
    run('DELETE FROM products WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Product "${existing.name}" was successfully removed.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove product', details: err.message });
  }
});

module.exports = router;
