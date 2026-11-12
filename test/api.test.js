const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Set test database path before loading modules
process.env.DB_PATH = require('node:path').join(__dirname, 'test_bitedash.db');

const app = require('../server');
let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    if (options.token) {
      reqOptions.headers['Authorization'] = `Bearer ${options.token}`;
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
  try {
    const fs = require('node:fs');
    if (fs.existsSync(process.env.DB_PATH)) {
      fs.unlinkSync(process.env.DB_PATH);
    }
  } catch (e) {}
});

test('GET /api/health returns healthy status', async () => {
  const res = await request('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
});

test('User registration and login workflow', async () => {
  // Use a unique email each run to avoid duplicate-user failures on a persistent test DB
  const uniqueEmail = `bob+${Date.now()}@example.com`;
  // Register new customer
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Bob Builder',
      email: uniqueEmail,
      phone: '+1 555 123 4567',
      password: 'password123'
    }
  });
  assert.equal(regRes.status, 201);
  assert.ok(regRes.body.token);
  assert.equal(regRes.body.user.email, uniqueEmail);
  assert.equal(regRes.body.user.role, 'user');

  // Login with credentials
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: uniqueEmail,
      password: 'password123'
    }
  });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  assert.equal(loginRes.body.user.name, 'Bob Builder');

  // Verify current user profile
  const meRes = await request('/api/auth/me', { token: loginRes.body.token });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, uniqueEmail);
});

test('Order creation requires authenticated user account', async () => {
  // Unauthenticated order creation should fail with 401
  const unauthRes = await request('/api/orders', {
    method: 'POST',
    body: {
      orderType: 'delivery',
      customerName: 'Anonymous Guest',
      customerPhone: '+1234567890',
      customerAddress: '123 Fake Street',
      items: [{ id: 'prod-1', name: 'Burger', quantity: 1, unitPrice: 5.0 }]
    }
  });
  assert.equal(unauthRes.status, 401);
  assert.equal(unauthRes.body.requiresAuth, true);

  // Authenticated order creation succeeds
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'bob@example.com', password: 'password123' }
  });
  const token = loginRes.body.token;

  const authOrderRes = await request('/api/orders', {
    method: 'POST',
    token,
    body: {
      orderType: 'delivery',
      customerName: 'Bob Builder',
      customerPhone: '+1 555 123 4567',
      customerAddress: '789 Construction Ave',
      items: [{ id: 'prod-1', name: 'Classic Smash Burger', quantity: 1, unitPrice: 4.50 }]
    }
  });
  assert.equal(authOrderRes.status, 201);
  assert.ok(authOrderRes.body.id.startsWith('#BD-'));
  assert.equal(authOrderRes.body.userId, loginRes.body.user.id);

  // User can view their own orders
  const myOrdersRes = await request('/api/orders', { token });
  assert.equal(myOrdersRes.status, 200);
  assert.ok(Array.isArray(myOrdersRes.body));
  assert.ok(myOrdersRes.body.some(o => o.id === authOrderRes.body.id));
});

test('Admin can view order statistics and customer identity', async () => {
  // Login as admin
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@bitedash.com', password: 'admin123' }
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, 'admin');
  const adminToken = adminLogin.body.token;

  // View stats
  const statsRes = await request('/api/admin/stats', { token: adminToken });
  assert.equal(statsRes.status, 200);
  assert.ok(statsRes.body.totalOrders >= 1);
  assert.ok(statsRes.body.totalRevenue > 0);

  // View who placed each order
  const ordersRes = await request('/api/admin/orders', { token: adminToken });
  assert.equal(ordersRes.status, 200);
  assert.ok(Array.isArray(ordersRes.body));
  const bobOrder = ordersRes.body.find(o => o.customerEmail === 'bob@example.com');
  assert.ok(bobOrder);
  assert.equal(bobOrder.registeredUserName, 'Bob Builder');
});

test('Admin can add and remove products in SQLite', async () => {
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@bitedash.com', password: 'admin123' }
  });
  const adminToken = adminLogin.body.token;

  // 1. Add new product
  const addRes = await request('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Super Deluxe Truffle Burger',
      category: 'Burgers',
      price: 8.90,
      calories: '720 kcal',
      description: 'Double Angus beef patty with fresh black truffle cream and smoked gouda.',
      tags: ['Chef Special', 'Gourmet']
    }
  });
  assert.equal(addRes.status, 201);
  const newProdId = addRes.body.id;
  assert.ok(newProdId);

  // Verify product is in public catalog
  const prodsRes = await request('/api/products');
  assert.ok(prodsRes.body.some(p => p.id === newProdId));

  // 2. Remove product
  const deleteRes = await request(`/api/admin/products/${newProdId}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);

  // Verify removed from public catalog
  const afterProdsRes = await request('/api/products');
  assert.ok(!afterProdsRes.body.some(p => p.id === newProdId));
});
