const { db, transaction } = require('./db');

const CATEGORIES = [
  { id: "Burgers", name: "Burgers", icon: "fa-burger", sort_order: 1 },
  { id: "Pizza", name: "Pizza", icon: "fa-pizza-slice", sort_order: 2 },
  { id: "Fries", name: "Fries", icon: "fa-fire", sort_order: 3 },
  { id: "Chicken", name: "Chicken", icon: "fa-drumstick-bite", sort_order: 4 },
  { id: "Wraps", name: "Wraps", icon: "fa-bread-slice", sort_order: 5 },
  { id: "Drinks", name: "Drinks", icon: "fa-glass-water", sort_order: 6 },
  { id: "Desserts", name: "Desserts", icon: "fa-ice-cream", sort_order: 7 }
];

const FOOD_PRODUCTS = [
  {
    id: "prod-1",
    name: "Classic Smash Burger",
    category: "Burgers",
    price: 4.50,
    calories: "520 kcal",
    description: "Pure flame-grilled beef patty, crisp lettuce, ripe tomato & signature house burger glaze.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
    tags: ["Bestseller", "Smash Beef"],
    hasSizes: true,
    sizes: [
      { name: "Single Patty", priceDiff: 0.00 },
      { name: "Double Patty (+€2.00)", priceDiff: 2.00 },
      { name: "Triple Monster (+€3.50)", priceDiff: 3.50 }
    ],
    ingredients: ["Beef patty", "Sesame bun", "Lettuce", "Tomato", "Onion", "Pickles", "Ketchup", "Mayonnaise"],
    extras: [
      { id: "ext-cheese", name: "Melted Cheddar", price: 0.50 },
      { id: "ext-patty", name: "Extra Beef Patty", price: 2.00 },
      { id: "ext-bacon", name: "Crispy Bacon", price: 1.00 },
      { id: "ext-sauce", name: "Secret Dash Sauce", price: 0.30 }
    ]
  },
  {
    id: "prod-2",
    name: "Aged Cheddar Cheeseburger",
    category: "Burgers",
    price: 5.00,
    calories: "580 kcal",
    description: "Melted aged cheddar over grilled prime beef with crunchy pickles and mustard relish.",
    image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=400&q=80",
    tags: ["Cheesy", "Popular"],
    hasSizes: true,
    sizes: [
      { name: "Regular Single", priceDiff: 0.00 },
      { name: "Double Cheese (+€1.50)", priceDiff: 1.50 }
    ],
    ingredients: ["Beef patty", "Aged cheddar", "Brioche bun", "Pickles", "Onion", "Mustard", "Ketchup"],
    extras: [
      { id: "ext-cheese", name: "Double Cheddar", price: 0.50 },
      { id: "ext-bacon", name: "Smoked Bacon", price: 1.00 },
      { id: "ext-patty", name: "Extra Beef Patty", price: 2.00 }
    ]
  },
  {
    id: "prod-3",
    name: "Double Smokehouse Burger",
    category: "Burgers",
    price: 6.50,
    calories: "740 kcal",
    description: "Two seasoned beef patties stacked high with double cheddar and caramelized onions.",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=400&q=80",
    tags: ["Smoky", "Chef's Choice"],
    hasSizes: false,
    ingredients: ["2x Beef patties", "Double cheddar", "Caramelized onion", "Lettuce", "Smoky mayo"],
    extras: [
      { id: "ext-bacon", name: "Crispy Bacon", price: 1.00 },
      { id: "ext-jalapenos", name: "Pickled Jalapeños", price: 0.60 },
      { id: "ext-sauce", name: "Truffle Mayo", price: 0.50 }
    ]
  },
  {
    id: "prod-4",
    name: "Crispy Volcano Chicken Burger",
    category: "Chicken",
    price: 5.50,
    calories: "610 kcal",
    description: "Crispy golden fried chicken breast fillet with crunchy Asian slaw and spicy garlic mayo.",
    image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=400&q=80",
    tags: ["Spicy 🌶️", "Crispy"],
    hasSizes: true,
    sizes: [
      { name: "Mild Spice", priceDiff: 0.00 },
      { name: "Volcano Hot (+€0.50)", priceDiff: 0.50 }
    ],
    ingredients: ["Fried chicken fillet", "Crunchy slaw", "Pickles", "Garlic chili mayo", "Brioche bun"],
    extras: [
      { id: "ext-cheese", name: "Cheddar Slice", price: 0.50 },
      { id: "ext-bacon", name: "Crispy Bacon", price: 1.00 },
      { id: "ext-sauce", name: "Sweet Chili Dip", price: 0.30 }
    ]
  },
  {
    id: "prod-5",
    name: "Golden Sea-Salt French Fries",
    category: "Fries",
    price: 2.00,
    calories: "320 kcal",
    description: "Crispy skin-on golden potato fries, seasoned with aromatic Mediterranean sea salt.",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80",
    tags: ["Vegan 🥬", "Crispy"],
    hasSizes: true,
    sizes: [
      { name: "Medium Box", priceDiff: 0.00 },
      { name: "Large Box (+€1.00)", priceDiff: 1.00 }
    ],
    ingredients: ["Potato fries", "Sea salt", "Rosemary hint"],
    extras: [
      { id: "ext-ketchup", name: "Extra Ketchup Dip", price: 0.30 },
      { id: "ext-mayo", name: "Garlic Mayo Dip", price: 0.30 },
      { id: "ext-cheesesauce", name: "Warm Cheese Dip", price: 0.80 }
    ]
  },
  {
    id: "prod-6",
    name: "Loaded Bacon Cheddar Fries",
    category: "Fries",
    price: 3.50,
    calories: "540 kcal",
    description: "Fries smothered in warm cheddar cheese sauce, crisp bacon bits, and chopped spring onions.",
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=400&q=80",
    tags: ["Loaded", "Savory"],
    hasSizes: false,
    ingredients: ["Potato fries", "Warm cheddar sauce", "Crisp bacon bits", "Spring onions"],
    extras: [
      { id: "ext-jalapenos", name: "Pickled Jalapeños", price: 0.50 },
      { id: "ext-patty", name: "Pulled Beef Topper", price: 1.80 }
    ]
  },
  {
    id: "prod-7",
    name: "Crunchy Chicken Nuggets",
    category: "Chicken",
    price: 4.00,
    calories: "380 kcal",
    description: "Tender 100% chicken breast coated in an ultra-crunchy seasoned tempura batter.",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80",
    tags: ["Kids Fav", "100% Breast"],
    hasSizes: true,
    sizes: [
      { name: "6 Pieces Box", priceDiff: 0.00 },
      { name: "9 Pieces Box (+€1.80)", priceDiff: 1.80 },
      { name: "20 Pieces Party (+€5.00)", priceDiff: 5.00 }
    ],
    ingredients: ["Chicken breast bites", "BBQ sauce pot"],
    extras: [
      { id: "ext-sweet-sour", name: "Sweet & Sour Dip", price: 0.40 },
      { id: "ext-garlic", name: "Creamy Garlic Dip", price: 0.40 }
    ]
  },
  {
    id: "prod-8",
    name: "Mediterranean Chicken Wrap",
    category: "Wraps",
    price: 4.50,
    calories: "450 kcal",
    description: "Warm toasted tortilla rolled with grilled chicken tenders, salad and mint yoghurt dressing.",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=400&q=80",
    tags: ["Grilled", "Fresh"],
    hasSizes: false,
    ingredients: ["Flour tortilla", "Grilled chicken", "Shredded romaine", "Vine tomatoes", "Yoghurt herbs"],
    extras: [
      { id: "ext-cheese", name: "Grated Mozzarella", price: 0.50 },
      { id: "ext-bacon", name: "Crispy Bacon Strips", price: 1.00 }
    ]
  },
  {
    id: "prod-9",
    name: "Classic Margherita Pizza",
    category: "Pizza",
    price: 6.00,
    calories: "680 kcal",
    description: "Stone-baked Italian crust with sweet San Marzano tomato sauce and fior di latte mozzarella.",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80",
    tags: ["Vegetarian 🥬", "Stone Baked"],
    hasSizes: true,
    sizes: [
      { name: "Medium 28cm", priceDiff: 0.00 },
      { name: "Large 32cm (+€2.50)", priceDiff: 2.50 }
    ],
    ingredients: ["Italian pizza dough", "Tomato sauce", "Mozzarella fior di latte", "Fresh basil", "Extra virgin olive oil"],
    extras: [
      { id: "ext-cheese", name: "Extra Mozzarella", price: 1.00 },
      { id: "ext-mushrooms", name: "Fresh Sliced Mushrooms", price: 0.80 }
    ]
  },
  {
    id: "prod-10",
    name: "Spicy Beef Pepperoni Pizza",
    category: "Pizza",
    price: 7.50,
    calories: "790 kcal",
    description: "Crispy bubbly crust topped with generous spicy beef pepperoni and molten mozzarella.",
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80",
    tags: ["Spicy 🌶️", "Top Rated"],
    hasSizes: true,
    sizes: [
      { name: "Medium 28cm", priceDiff: 0.00 },
      { name: "Large 32cm (+€2.50)", priceDiff: 2.50 }
    ],
    ingredients: ["Pizza dough", "Tomato sauce", "Mozzarella", "Beef pepperoni slices", "Dried oregano"],
    extras: [
      { id: "ext-cheese", name: "Stuffed Cheese Crust", price: 1.50 },
      { id: "ext-jalapenos", name: "Hot Pickled Jalapeños", price: 0.70 }
    ]
  },
  {
    id: "prod-11",
    name: "Coca-Cola Original Taste",
    category: "Drinks",
    price: 1.50,
    calories: "139 kcal",
    description: "Chilled 330ml ice-cold can of classic refreshing Coca-Cola.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80",
    tags: ["Chilled", "Classic"],
    hasSizes: true,
    sizes: [
      { name: "Can 330ml", priceDiff: 0.00 },
      { name: "Bottle 500ml (+€0.70)", priceDiff: 0.70 }
    ],
    ingredients: ["Carbonated cola", "Served ice-cold"],
    extras: [
      { id: "ext-lemon", name: "Ice cup & Lemon wedge", price: 0.20 }
    ]
  },
  {
    id: "prod-12",
    name: "Fresh Squeezed Orange Juice",
    category: "Drinks",
    price: 2.00,
    calories: "115 kcal",
    description: "100% freshly pressed Valencia oranges with natural sweet pulp and Vitamin C.",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80",
    tags: ["100% Natural", "Vitamin C"],
    hasSizes: false,
    ingredients: ["Pure pressed Valencia orange juice"],
    extras: [
      { id: "ext-ice", name: "Extra Crushed Ice Cup", price: 0.20 }
    ]
  },
  {
    id: "prod-13",
    name: "Belgian Chocolate Glazed Donut",
    category: "Desserts",
    price: 1.80,
    calories: "280 kcal",
    description: "Fluffy yeast donut glazed with rich Belgian milk chocolate and colorful sprinkles.",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=400&q=80",
    tags: ["Sweet", "Bakery"],
    hasSizes: false,
    ingredients: ["Fluffy yeast dough", "Belgian chocolate frosting", "Sprinkles"],
    extras: [
      { id: "ext-nuts", name: "Roasted Hazelnut Crunch", price: 0.40 }
    ]
  },
  {
    id: "prod-14",
    name: "Artisanal Vanilla Ice Cream",
    category: "Desserts",
    price: 2.50,
    calories: "210 kcal",
    description: "Creamy Madagascar vanilla soft-serve in a crunchy waffle cone with chocolate fudge.",
    image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=400&q=80",
    tags: ["Cold Treat", "Artisanal"],
    hasSizes: true,
    sizes: [
      { name: "Single Scoop Cone", priceDiff: 0.00 },
      { name: "Double Scoop Tub (+€1.20)", priceDiff: 1.20 }
    ],
    ingredients: ["Madagascar vanilla cream", "Crispy waffle cone", "Dark chocolate drizzle"],
    extras: [
      { id: "ext-cherry", name: "Maraschino Cherry & Nuts", price: 0.50 }
    ]
  }
];

const COUPONS = [
  { code: "BITEDASH25", type: "percent", value: 25.0, label: "25% Off Food", min_order: 0.0, is_active: 1 },
  { code: "FREESHIP", type: "free_delivery", value: 0.0, label: "Free Delivery", min_order: 0.0, is_active: 1 },
  { code: "HOTBURGER", type: "flat", value: 3.0, label: "€3.00 Off", min_order: 10.0, is_active: 1 }
];

const { hashPassword } = require('./auth');

const INITIAL_USERS = [
  {
    id: "user-admin-1",
    name: "Admin Manager",
    email: "admin@bitedash.com",
    phone: "+1 800 555 0199",
    password: "admin123",
    role: "admin"
  },
  {
    id: "user-customer-1",
    name: "Alex Miller",
    email: "user@example.com",
    phone: "+49 170 1234567",
    password: "user123",
    role: "user"
  }
];

/**
 * Seed database with initial categories, products, coupons, and users
 */
function seedDatabase(force = false) {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  if (existingCount > 0 && userCount > 0 && !force) {
    console.log(`Database already seeded with ${existingCount} products and ${userCount} users.`);
    return;
  }

  transaction(() => {
    // 1. Seed categories
    const catStmt = db.prepare(`
      INSERT OR REPLACE INTO categories (id, name, icon, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    for (const cat of CATEGORIES) {
      catStmt.run(cat.id, cat.name, cat.icon, cat.sort_order);
    }

    // 2. Seed products
    const prodStmt = db.prepare(`
      INSERT OR REPLACE INTO products (
        id, name, category, price, calories, description, image,
        tags, has_sizes, sizes, ingredients, extras, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of FOOD_PRODUCTS) {
      prodStmt.run(
        p.id,
        p.name,
        p.category,
        p.price,
        p.calories || '',
        p.description || '',
        p.image || '',
        JSON.stringify(p.tags || []),
        p.hasSizes ? 1 : 0,
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.ingredients || []),
        JSON.stringify(p.extras || []),
        1
      );
    }

    // 3. Seed coupons
    const coupStmt = db.prepare(`
      INSERT OR REPLACE INTO coupons (code, type, value, label, min_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const c of COUPONS) {
      coupStmt.run(c.code, c.type, c.value, c.label, c.min_order, c.is_active);
    }

    // 4. Seed default accounts
    const userStmt = db.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const u of INITIAL_USERS) {
      const passHash = hashPassword(u.password);
      userStmt.run(u.id, u.name, u.email.toLowerCase(), u.phone, passHash, u.role);
    }

    // Link any orphan orders to the default test customer
    db.prepare('UPDATE orders SET user_id = ? WHERE user_id IS NULL').run('user-customer-1');
  });

  console.log(`Successfully seeded categories, products, coupons, and default users.`);
}

if (require.main === module) {
  seedDatabase(true);
}

module.exports = { seedDatabase, CATEGORIES, FOOD_PRODUCTS, COUPONS, INITIAL_USERS };
