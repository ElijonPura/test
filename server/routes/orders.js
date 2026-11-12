const express = require('express');
const router = express.Router();
const { query, get, run, transaction } = require('../db');
const { requireAuth } = require('../auth');

function formatOrderRecord(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    date: new Date(row.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    fullDate: new Date(row.created_at).toLocaleString(),
    itemsList: items.map(i => ({
      id: i.product_id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      selectedSize: i.selected_size || null,
      selectedExtras: JSON.parse(i.selected_extras || '[]'),
      removedIngredients: JSON.parse(i.removed_ingredients || '[]'),
      itemComment: i.item_comment || ''
    })),
    itemsText: row.items_text,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount),
    tip: Number(row.tip),
    total: Number(row.total),
    status: row.status,
    step: Number(row.step),
    type: row.order_type,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    paymentMethod: row.payment_method,
    generalNote: row.general_note,
    createdAt: row.created_at
  };
}

/**
 * GET /api/orders
 * List orders for the authenticated user (or all if admin with all=true)
 */
router.get('/', (req, res) => {
  try {
    if (!req.user) {
      return res.json([]);
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    let orderRows = [];

    if (req.user.role === 'admin' && req.query.all === 'true') {
      orderRows = query('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [limit]);
    } else {
      orderRows = query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [req.user.id, limit]);
    }

    const result = orderRows.map(order => {
      const itemRows = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      return formatOrderRecord(order, itemRows);
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve orders', details: err.message });
  }
});

/**
 * GET /api/orders/:id
 * Retrieve a specific order by ID
 */
router.get('/:id', (req, res) => {
  try {
    const orderId = req.params.id.startsWith('#') ? req.params.id : `#${req.params.id}`;
    const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Permission check if user logged in
    if (req.user && req.user.role !== 'admin' && order.user_id && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }

    const items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    res.json(formatOrderRecord(order, items));
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve order', details: err.message });
  }
});

/**
 * POST /api/orders
 * Create a new order with line items in SQLite (Requires authenticated account)
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      orderType = 'delivery',
      customerName,
      customerPhone,
      customerAddress = '',
      paymentMethod = 'Contactless Card',
      generalNote = '',
      items = [],
      promoCode = null,
      riderTip = 0.00
    } = req.body;

    const finalName = (customerName && customerName.trim()) || req.user.name;
    const finalPhone = (customerPhone && customerPhone.trim()) || req.user.phone;

    if (!finalName) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!finalPhone) {
      return res.status(400).json({ error: 'Customer phone is required' });
    }
    if (orderType === 'delivery' && (!customerAddress || !customerAddress.trim())) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order cart cannot be empty' });
    }

    // Calculate financials
    const subtotal = Number(items.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (price * qty);
    }, 0).toFixed(2));

    let deliveryFee = orderType === 'delivery' ? 2.50 : 0.00;
    let discount = 0.00;
    let freeDeliveryFromPromo = false;

    // Validate and apply promo code if provided
    if (promoCode) {
      const coupon = get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [String(promoCode).toUpperCase()]);
      if (coupon && subtotal >= coupon.min_order) {
        if (coupon.type === 'percent') {
          discount = Number((subtotal * (coupon.value / 100)).toFixed(2));
        } else if (coupon.type === 'flat') {
          discount = Number(Math.min(subtotal, coupon.value).toFixed(2));
        } else if (coupon.type === 'free_delivery') {
          freeDeliveryFromPromo = true;
        }
      }
    }

    if (subtotal >= 25.00 || freeDeliveryFromPromo) {
      deliveryFee = 0.00;
    }

    const tip = Math.max(0, Number(riderTip) || 0);
    const total = Number((Math.max(0, subtotal - discount) + deliveryFee + tip).toFixed(2));

    const orderId = '#BD-' + Math.floor(10000 + Math.random() * 90000);
    const itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    // Persist order in a single database transaction with user_id
    transaction(() => {
      run(`
        INSERT INTO orders (
          id, user_id, order_type, customer_name, customer_phone, customer_address,
          payment_method, general_note, subtotal, delivery_fee, discount,
          tip, total, status, step, items_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        req.user.id,
        orderType.charAt(0).toUpperCase() + orderType.slice(1).toLowerCase(),
        finalName,
        finalPhone,
        customerAddress.trim(),
        paymentMethod,
        generalNote.trim(),
        subtotal,
        deliveryFee,
        discount,
        tip,
        total,
        'Cooking',
        2,
        itemsText
      ]);

      const itemStmt = require('../db').db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, name, quantity, unit_price,
          selected_size, selected_extras, removed_ingredients, item_comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        itemStmt.run(
          orderId,
          item.id || null,
          item.name,
          Number(item.quantity) || 1,
          Number(item.unitPrice) || 0,
          item.selectedSize || null,
          JSON.stringify(item.selectedExtras || []),
          JSON.stringify(item.removedIngredients || []),
          item.itemComment || ''
        );
      }

      // Upsert customer profile
      run(`
        INSERT INTO customer_profiles (name, phone, address, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(phone) DO UPDATE SET
          name = excluded.name,
          address = excluded.address,
          updated_at = CURRENT_TIMESTAMP
      `, [finalName, finalPhone, customerAddress.trim()]);
    });

    const createdOrder = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const createdItems = query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    res.status(201).json(formatOrderRecord(createdOrder, createdItems));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order tracking step and status
 */
router.patch('/:id/status', (req, res) => {
  try {
    const orderId = req.params.id.startsWith('#') ? req.params.id : `#${req.params.id}`;
    const { status, step } = req.body;

    const existing = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const newStatus = status || existing.status;
    const newStep = step !== undefined ? Number(step) : existing.step;

    run('UPDATE orders SET status = ?, step = ? WHERE id = ?', [newStatus, newStep, orderId]);

    const updated = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const items = query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    res.json(formatOrderRecord(updated, items));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status', details: err.message });
  }
});

module.exports = router;
