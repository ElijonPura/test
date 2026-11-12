const path = require('node:path');
const express = require('express');
const cors = require('cors');

// Initialize database schema and auto-seed if needed
const { initSchema } = require('./server/db');
const { seedDatabase } = require('./server/seed');
const { authMiddleware } = require('./server/auth');

initSchema();
seedDatabase(false);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach authentication context (req.user & req.token) to all requests
app.use(authMiddleware);

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      const authInfo = req.user ? ` (${req.user.role}:${req.user.email})` : ' (Guest)';
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}${authInfo} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'BiteDash Food Ordering API'
  });
});

// Mount API routers
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api', require('./server/routes/products'));
app.use('/api/orders', require('./server/routes/orders'));
app.use('/api/coupons', require('./server/routes/coupons'));
app.use('/api/profile', require('./server/routes/profile'));

// Serve static frontend files from project root
app.use(express.static(__dirname));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start listening if run directly
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 BiteDash Restaurant Server is live!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📦 Database: SQLite (WAL mode)`);
    console.log(`📁 Static files served from: ${__dirname}`);
    console.log(`🔑 Admin Login: admin@bitedash.com / admin123`);
    console.log(`👤 Customer Login: user@example.com / user123`);
    console.log(`======================================================\n`);
  });

  const shutdown = () => {
    console.log('\nGracefully shutting down BiteDash server...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
