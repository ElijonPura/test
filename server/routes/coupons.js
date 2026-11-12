const express = require('express');
const router = express.Router();
const { query, get } = require('../db');

/**
 * GET /api/coupons
 * List all active public coupons
 */
router.get('/', (req, res) => {
  try {
    const coupons = query('SELECT code, type, value, label, min_order FROM coupons WHERE is_active = 1');
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons', details: err.message });
  }
});

/**
 * POST /api/coupons/validate
 * Validate a promo code against current cart subtotal
 */
router.post('/validate', (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, error: 'Promo code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [cleanCode]);

    if (!coupon) {
      return res.status(404).json({ valid: false, error: 'Invalid or expired promo code' });
    }

    const numericSubtotal = Number(subtotal) || 0;
    if (numericSubtotal < coupon.min_order) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order value for this coupon is €${coupon.min_order.toFixed(2)}`
      });
    }

    let discount = 0;
    let freeDelivery = false;

    if (coupon.type === 'percent') {
      discount = Number((numericSubtotal * (coupon.value / 100)).toFixed(2));
    } else if (coupon.type === 'flat') {
      discount = Number(Math.min(numericSubtotal, coupon.value).toFixed(2));
    } else if (coupon.type === 'free_delivery') {
      freeDelivery = true;
    }

    res.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      label: coupon.label,
      discount,
      freeDelivery
    });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Failed to validate promo code', details: err.message });
  }
});

module.exports = router;
