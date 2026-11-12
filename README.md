# 🍔 BiteDash — Gourmet Fast Food Full-Stack Web Application

A full-stack online food ordering web application built with **Node.js**, **Express**, **SQLite**, and modern **Tailwind CSS**.

---

## 🌟 Features

- **Dynamic Food Menu & Categories**: 14 gourmet fast-food products across 7 categories (Burgers, Pizza, Fries, Chicken, Wraps, Drinks, Desserts) stored in SQLite.
- **Interactive Product Customization**: Real-time modal selection for sizes, extra toppings, ingredient removal, and special instructions.
- **Cart & Financial Calculation**: Automatic subtotal calculation, delivery fee rules (free delivery over €25 or with promo code), rider tip selection, and coupon discounts.
- **Coupon Verification Engine**: Database-backed promo code validation (`BITEDASH25` for 25% off, `FREESHIP` for free delivery, `HOTBURGER` for €3.00 off).
- **SQLite Database Persistence**: Relational database (`data/bitedash.db`) with tables for products, categories, coupons, customer profiles, orders, and line items.
- **Order Lifecycle & Tracking**: Real-time 4-step live order status tracking (Received ➔ Cooking ➔ On the Way ➔ Delivered) saved to the database.
- **Order History & Reordering**: Full past orders history loaded from SQLite with instant 1-click reorder capability.
- **Customer Profiles & Favorites**: Profile persistence and product favorites synced with SQLite.
- **Theme & Sound FX**: 6 vibrant UI themes (Yellow & Red, Red & White, Orange & Green, Yellow & Blue, Red & Black, Black & White) and Web Audio API synthesized sound effects.
- **Resilient Offline Fallback**: Client gracefully handles offline states without interruption.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│           Client Layer (Single-Page App)               │
│   index.html • Tailwind CSS • Confetti • Web Audio     │
└──────────────────────────┬─────────────────────────────┘
                           │ fetch() REST API
┌──────────────────────────▼─────────────────────────────┐
│             Node.js + Express Server (server.js)        │
│  - /api/products        (Catalog & Category Filtering) │
│  - /api/orders          (Order Creation & Tracking)    │
│  - /api/coupons         (Promo Code Validation)        │
│  - /api/profile         (Customer Profiles & Favorites)│
│  - Static Asset Serving (index.html)                   │
└──────────────────────────┬─────────────────────────────┘
                           │ node:sqlite / SQL Statements
┌──────────────────────────▼─────────────────────────────┐
│          SQLite Database (data/bitedash.db)            │
│  categories • products • coupons • orders • order_items│
│  customer_profiles • favorites                         │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
projekt/
├── data/
│   └── bitedash.db            # SQLite database file (auto-created & seeded)
├── server/
│   ├── routes/
│   │   ├── coupons.js         # Promo validation endpoints
│   │   ├── orders.js          # Order placement, history & tracking
│   │   ├── products.js        # Products & categories endpoints
│   │   └── profile.js         # Customer profiles & favorites
│   ├── db.js                  # SQLite database connection & schema
│   └── seed.js                # Database seeder with 14 products & coupons
├── test/
│   └── api.test.js            # Automated integration test suite
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore file
├── index.html                 # Complete single-page frontend application
├── package.json               # Project manifest & npm scripts
├── README.md                  # Project documentation
├── server.js                  # Main Express server entrypoint
└── start.bat                  # Windows one-click launcher
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v20+ or v24+ recommended, included user-level or system-wide)

### 2. Start the Server
Run using `npm`:
```powershell
npm start
```
Or double-click **`start.bat`** on Windows!

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running Automated Tests

Run the test suite using Node's native test runner:
```powershell
npm test
```

Tests verify:
- Server health check (`GET /api/health`)
- Category listing (`GET /api/categories`)
- Product catalog & category filtering (`GET /api/products?category=Pizza`)
- Coupon validation (`POST /api/coupons/validate`)
- Order creation & line-item persistence in SQLite (`POST /api/orders`)
- Order retrieval & status updates (`PATCH /api/orders/:id/status`)

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health and uptime status |
| `GET` | `/api/categories` | List all categories with icons |
| `GET` | `/api/products` | List all products (supports `?category=` & `?search=`) |
| `GET` | `/api/products/:id` | Get details for a specific product |
| `GET` | `/api/orders` | List customer order history (most recent first) |
| `GET` | `/api/orders/:id` | Get order status, items, and delivery info |
| `POST` | `/api/orders` | Place a new order and persist line items |
| `PATCH` | `/api/orders/:id/status` | Update order tracking step and status |
| `GET` | `/api/coupons` | List all active promo codes |
| `POST` | `/api/coupons/validate` | Validate code and compute discount for cart subtotal |
| `GET` | `/api/profile` | Retrieve saved customer profile |
| `POST` | `/api/profile` | Save or update customer profile |
| `GET` | `/api/profile/favorites` | Retrieve favorited product IDs |
| `POST` | `/api/profile/favorites/toggle` | Toggle favorite state for a product |

---

## 🗄️ Database Tables

- **`categories`**: Stores food categories (`id`, `name`, `icon`, `sort_order`).
- **`products`**: Stores food catalog (`id`, `name`, `category`, `price`, `calories`, `description`, `image`, `tags`, `has_sizes`, `sizes`, `ingredients`, `extras`, `is_available`).
- **`coupons`**: Stores promo codes (`code`, `type`, `value`, `label`, `min_order`, `is_active`).
- **`orders`**: Stores orders (`id`, `order_type`, `customer_name`, `customer_phone`, `customer_address`, `payment_method`, `general_note`, `subtotal`, `delivery_fee`, `discount`, `tip`, `total`, `status`, `step`, `items_text`, `created_at`).
- **`order_items`**: Line items linked to orders with sizes, extras, and comments.
- **`customer_profiles`**: Saved customer names, phones, and addresses.
- **`favorites`**: Saved favorite product IDs.
