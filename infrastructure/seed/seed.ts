import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  connectDatabase,
  UserModel,
  CategoryModel,
  ProductModel,
  StoreModel,
  InventoryModel,
  OrderModel,
  DeliveryModel,
  OrderEventModel,
} from '@quickcommerce/database';
import { hashPassword } from '@quickcommerce/shared-utils';

dotenv.config();

export async function seedAll() {
  console.log('--- Starting QuickCommerce Database Seeder ---');
  await connectDatabase();

  // 1. Clear existing demonstration data
  console.log('Clearing existing records...');
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    ProductModel.deleteMany({}),
    StoreModel.deleteMany({}),
    InventoryModel.deleteMany({}),
    OrderModel.deleteMany({}),
    DeliveryModel.deleteMany({}),
    OrderEventModel.deleteMany({}),
  ]);

  // 2. Seed Users
  console.log('Seeding Users...');
  const adminPassword = await hashPassword('Admin@123');
  const customerPassword = await hashPassword('Customer@123');
  const partnerPassword = await hashPassword('Partner@123');

  const admin = await UserModel.create({
    name: 'QuickCommerce Ops Admin',
    email: 'admin@quickcommerce.com',
    passwordHash: adminPassword,
    phone: '+91 99001 12233',
    role: 'ADMIN',
  });

  const customer1 = await UserModel.create({
    name: 'Aarav Sharma',
    email: 'customer@quickcommerce.com',
    passwordHash: customerPassword,
    phone: '+91 98765 43210',
    role: 'CUSTOMER',
  });

  const customer2 = await UserModel.create({
    name: 'Priya Patel',
    email: 'priya@example.com',
    passwordHash: customerPassword,
    phone: '+91 98111 22334',
    role: 'CUSTOMER',
  });

  const partner1 = await UserModel.create({
    name: 'Vikram Singh (Rider #101)',
    email: 'partner@quickcommerce.com',
    passwordHash: partnerPassword,
    phone: '+91 98450 11223',
    role: 'DELIVERY_PARTNER',
  });

  const partner2 = await UserModel.create({
    name: 'Karthik Raja (Rider #102)',
    email: 'rider2@quickcommerce.com',
    passwordHash: partnerPassword,
    phone: '+91 98450 99887',
    role: 'DELIVERY_PARTNER',
  });

  console.log(`Seeded 5 Users (Admin, 2 Customers, 2 Delivery Partners).`);

  // 3. Seed 10 Categories
  console.log('Seeding 10 Grocery Categories...');
  const categoryDefs = [
    { name: 'Fruits', slug: 'fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80' },
    { name: 'Vegetables', slug: 'vegetables', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80' },
    { name: 'Dairy', slug: 'dairy', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80' },
    { name: 'Bakery', slug: 'bakery', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80' },
    { name: 'Snacks', slug: 'snacks', image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=400&q=80' },
    { name: 'Beverages', slug: 'beverages', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80' },
    { name: 'Rice and Grains', slug: 'rice-grains', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80' },
    { name: 'Personal Care', slug: 'personal-care', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80' },
    { name: 'Household Essentials', slug: 'household', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80' },
    { name: 'Frozen Foods', slug: 'frozen', image: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80' },
  ];

  const categories = await CategoryModel.insertMany(categoryDefs);
  const catMap = new Map(categories.map((c) => [c.slug, c._id]));
  console.log(`Seeded ${categories.length} Categories.`);

  // 4. Seed Stores (with geospatial demonstration coordinates)
  console.log('Seeding 3 Dark Stores...');
  const storeDefs = [
    {
      name: 'Indiranagar Quick Hub #1',
      address: '100 Feet Rd, Indiranagar, Bengaluru, 560038',
      latitude: 12.9716,
      longitude: 77.6412,
      location: { type: 'Point', coordinates: [77.6412, 12.9716] },
      active: true,
    },
    {
      name: 'Koramangala Express Dark Store',
      address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, 560034',
      latitude: 12.9352,
      longitude: 77.6245,
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      active: true,
    },
    {
      name: 'HSR Layout Super Store',
      address: 'Sector 2, HSR Layout, Bengaluru, 560102',
      latitude: 12.9121,
      longitude: 77.6446,
      location: { type: 'Point', coordinates: [77.6446, 12.9121] },
      active: true,
    },
  ];

  const stores = await StoreModel.insertMany(storeDefs);
  console.log(`Seeded ${stores.length} Stores.`);

  // 5. Seed 32 Grocery Products
  console.log('Seeding 32 Products...');
  const productDefs = [
    // Fruits
    {
      name: 'Fresh Kashmiri Apples',
      description: 'Crisp, sweet, handpicked Royal Delicious apples from Kashmir valleys.',
      categoryId: catMap.get('fruits'),
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=500&q=80',
      price: 180,
      discount: 10,
      unit: '1 kg',
      active: true,
    },
    {
      name: 'Robusta Bananas',
      description: 'Farm-fresh natural ripe yellow bananas packed with potassium.',
      categoryId: catMap.get('fruits'),
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
      price: 45,
      discount: 0,
      unit: '500 g',
      active: true,
    },
    {
      name: 'Nagpur Sweet Oranges',
      description: 'Juicy, rich in Vitamin C, farm-fresh citrus oranges.',
      categoryId: catMap.get('fruits'),
      image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=500&q=80',
      price: 90,
      discount: 15,
      unit: '1 kg',
      active: true,
    },
    {
      name: 'Alphonso Mangoes',
      description: 'Naturally ripened Ratnagiri King of Mangoes with rich pulp.',
      categoryId: catMap.get('fruits'),
      image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=500&q=80',
      price: 450,
      discount: 10,
      unit: '6 pcs (1 box)',
      active: true,
    },

    // Vegetables
    {
      name: 'Fresh Hybrid Tomatoes',
      description: 'Firm, juicy red farm tomatoes ideal for curries, salads and sauces.',
      categoryId: catMap.get('vegetables'),
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80',
      price: 35,
      discount: 0,
      unit: '1 kg',
      active: true,
    },
    {
      name: 'Mountain Potatoes',
      description: 'Fresh earthen potatoes with high starch, suitable for roasting & boiling.',
      categoryId: catMap.get('vegetables'),
      image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=80',
      price: 40,
      discount: 5,
      unit: '1 kg',
      active: true,
    },
    {
      name: 'Nashik Red Onions',
      description: 'Crisp, pungent red onions, a staple kitchen essential.',
      categoryId: catMap.get('vegetables'),
      image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=500&q=80',
      price: 55,
      discount: 10,
      unit: '1 kg',
      active: true,
    },
    {
      name: 'Tender Baby Spinach (Palak)',
      description: 'Hydroponic crisp green spinach leaves rich in iron and dietary fiber.',
      categoryId: catMap.get('vegetables'),
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=500&q=80',
      price: 30,
      discount: 0,
      unit: '250 g bunch',
      active: true,
    },

    // Dairy
    {
      name: 'Amul Taaza Toned Milk',
      description: 'Pasteurized homogenized toned milk with 3.0% fat, fresh every morning.',
      categoryId: catMap.get('dairy'),
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
      price: 28,
      discount: 0,
      unit: '500 ml pouch',
      active: true,
    },
    {
      name: 'Amul Salted Butter',
      description: 'Delicious creamy butter made from pure fresh cow & buffalo cream.',
      categoryId: catMap.get('dairy'),
      image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',
      price: 58,
      discount: 5,
      unit: '100 g',
      active: true,
    },
    {
      name: 'Fresh Malai Paneer',
      description: 'Soft, melt-in-the-mouth cottage cheese crafted from pure whole milk.',
      categoryId: catMap.get('dairy'),
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
      price: 110,
      discount: 8,
      unit: '200 g pack',
      active: true,
    },
    {
      name: 'Epigamia Greek Yogurt (Wild Blueberry)',
      description: 'Thick, creamy strained Greek yogurt with real blueberry puree.',
      categoryId: catMap.get('dairy'),
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=500&q=80',
      price: 60,
      discount: 0,
      unit: '90 g cup',
      active: true,
    },

    // Bakery
    {
      name: 'Artisan Whole Wheat Bread',
      description: 'Stone-ground 100% whole wheat sliced loaf with zero added maida.',
      categoryId: catMap.get('bakery'),
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
      price: 55,
      discount: 5,
      unit: '400 g loaf',
      active: true,
    },
    {
      name: 'French Butter Croissants',
      description: 'Flaky, buttery layered baked French pastries made with pure butter.',
      categoryId: catMap.get('bakery'),
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80',
      price: 120,
      discount: 10,
      unit: '2 pcs pack',
      active: true,
    },
    {
      name: 'Multigrain Burger Buns',
      description: 'Soft toasted sesame crowned burger buns with oat flakes & flax seeds.',
      categoryId: catMap.get('bakery'),
      image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80',
      price: 45,
      discount: 0,
      unit: '2 pcs pack',
      active: true,
    },

    // Snacks
    {
      name: 'Lay’s Magic Masala Potato Chips',
      description: 'Crispy fried potato chips infused with hot blend of Indian spices.',
      categoryId: catMap.get('snacks'),
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
      price: 20,
      discount: 0,
      unit: '50 g pack',
      active: true,
    },
    {
      name: 'Haldiram’s Bhujia Sev',
      description: 'Authentic crispy moth bean and chickpea flour spiced crunchy snack.',
      categoryId: catMap.get('snacks'),
      image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=500&q=80',
      price: 95,
      discount: 12,
      unit: '400 g pack',
      active: true,
    },
    {
      name: 'Nutty Gritties Roasted Almonds',
      description: 'Lightly Himalayan-salted premium California dry roasted almonds.',
      categoryId: catMap.get('snacks'),
      image: 'https://images.unsplash.com/photo-1508061252224-40375f46d305?auto=format&fit=crop&w=500&q=80',
      price: 240,
      discount: 15,
      unit: '200 g pouch',
      active: true,
    },

    // Beverages
    {
      name: 'Coca-Cola Zero Sugar',
      description: 'Crisp, refreshing iconic taste of Coca-Cola with zero sugar and calories.',
      categoryId: catMap.get('beverages'),
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80',
      price: 40,
      discount: 0,
      unit: '300 ml can',
      active: true,
    },
    {
      name: 'Raw Pressery Tender Coconut Water',
      description: '100% natural, pure coconut water with no added sugar or preservatives.',
      categoryId: catMap.get('beverages'),
      image: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=500&q=80',
      price: 75,
      discount: 10,
      unit: '200 ml bottle',
      active: true,
    },
    {
      name: 'Tata Tea Gold Premium Tea',
      description: 'Unique blend of CTC tea with gently rolled long aromatic leaves.',
      categoryId: catMap.get('beverages'),
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
      price: 165,
      discount: 8,
      unit: '250 g pack',
      active: true,
    },
    {
      name: 'Nescafe Classic Instant Coffee',
      description: 'Rich and aromatic 100% pure instant coffee crafted from Robusta beans.',
      categoryId: catMap.get('beverages'),
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80',
      price: 195,
      discount: 10,
      unit: '100 g jar',
      active: true,
    },

    // Rice and Grains
    {
      name: 'Daawat Rozana Super Basmati Rice',
      description: 'Aromatic, slender long grains of Himalayan aged Basmati rice.',
      categoryId: catMap.get('rice-grains'),
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
      price: 360,
      discount: 15,
      unit: '5 kg bag',
      active: true,
    },
    {
      name: 'Aashirvaad Shudh Chakki Atta',
      description: '100% whole wheat flour ground to perfection retaining 0% maida.',
      categoryId: catMap.get('rice-grains'),
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=500&q=80',
      price: 265,
      discount: 5,
      unit: '5 kg bag',
      active: true,
    },
    {
      name: 'Tata Sampann Unpolished Toor Dal',
      description: 'Wholesome unpolished pigeon pea lentils rich in natural protein.',
      categoryId: catMap.get('rice-grains'),
      image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=500&q=80',
      price: 175,
      discount: 10,
      unit: '1 kg pack',
      active: true,
    },
    {
      name: 'Fortune Sunlite Refined Sunflower Oil',
      description: 'Enriched with Vitamins A, D & E, heart-healthy refined cooking oil.',
      categoryId: catMap.get('rice-grains'),
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
      price: 145,
      discount: 12,
      unit: '1 L pouch',
      active: true,
    },

    // Personal Care
    {
      name: 'Dove Deep Moisture Body Wash',
      description: 'NutriumMoisture rich hydrating body cleanser for softer smoother skin.',
      categoryId: catMap.get('personal-care'),
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80',
      price: 230,
      discount: 20,
      unit: '250 ml bottle',
      active: true,
    },
    {
      name: 'Colgate Total Dental Cavity Toothpaste',
      description: '12-hour antibacterial whole mouth shield protecting gums & enamel.',
      categoryId: catMap.get('personal-care'),
      image: 'https://images.unsplash.com/photo-1559650656-5d1d42e77166?auto=format&fit=crop&w=500&q=80',
      price: 125,
      discount: 10,
      unit: '150 g tube',
      active: true,
    },

    // Household Essentials
    {
      name: 'Surf Excel Matic Front Load Detergent',
      description: 'Powerful stain removing liquid formulated specifically for front loaders.',
      categoryId: catMap.get('household'),
      image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80',
      price: 245,
      discount: 15,
      unit: '1 L bottle',
      active: true,
    },
    {
      name: 'Vim Lemon Dishwash Gel',
      description: 'Concentrated power of 100 lemons tackling tough burnt grease easily.',
      categoryId: catMap.get('household'),
      image: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=500&q=80',
      price: 110,
      discount: 5,
      unit: '750 ml bottle',
      active: true,
    },

    // Frozen Foods
    {
      name: 'McCain French Fries',
      description: 'Crispy, golden potato french fries ready to air-fry or deep fry in 3 mins.',
      categoryId: catMap.get('frozen'),
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=500&q=80',
      price: 135,
      discount: 10,
      unit: '420 g pack',
      active: true,
    },
    {
      name: 'Sumeru Green Peas (Frozen)',
      description: 'Individual quick-frozen farm green garden peas retaining sweetness.',
      categoryId: catMap.get('frozen'),
      image: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=500&q=80',
      price: 85,
      discount: 5,
      unit: '500 g pack',
      active: true,
    },
  ];

  const products = await ProductModel.insertMany(productDefs);
  console.log(`Seeded ${products.length} Products.`);

  // 6. Seed Inventory across all 3 stores
  console.log('Seeding Inventory for each store...');
  const inventoryRecords = [];

  for (const store of stores) {
    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      // Seed a couple of low-stock items for testing concurrency and out-of-stock flows!
      let available = 25 + Math.floor(Math.random() * 50);
      if (i === 8) {
        // Amul Taaza Milk in Store 1: exactly 1 unit left to test simultaneous purchase contention!
        available = store.name.includes('#1') ? 1 : 15;
      }

      inventoryRecords.push({
        storeId: store._id,
        productId: prod._id,
        availableQuantity: available,
        reservedQuantity: 0,
      });
    }
  }

  await InventoryModel.insertMany(inventoryRecords);
  console.log(`Seeded ${inventoryRecords.length} Inventory records.`);

  // 7. Seed Sample Historical Orders & Events
  console.log('Seeding Sample Completed and In-Flight Orders...');
  const sampleOrder1 = await OrderModel.create({
    userId: customer1._id,
    storeId: stores[0]._id,
    items: [
      {
        productId: products[0]._id,
        name: products[0].name,
        image: products[0].image,
        unit: products[0].unit,
        quantity: 2,
        price: 180,
        discountPrice: 162,
      },
      {
        productId: products[8]._id,
        name: products[8].name,
        image: products[8].image,
        unit: products[8].unit,
        quantity: 2,
        price: 28,
        discountPrice: 28,
      },
    ],
    subtotal: 416,
    discount: 36,
    deliveryFee: 25,
    tax: 19,
    total: 424,
    paymentMethod: 'COD',
    paymentStatus: 'PAID',
    orderStatus: 'DELIVERED',
    idempotencyKey: 'seed_order_historical_001',
    deliveryAddress: {
      street: '12th Main Road, HAL 2nd Stage',
      city: 'Bengaluru',
      pincode: '560008',
      latitude: 12.9719,
      longitude: 77.6415,
    },
    timeline: [
      { status: 'ORDER_PLACED', timestamp: new Date(Date.now() - 3600000), description: 'Order placed by customer' },
      { status: 'INVENTORY_RESERVED', timestamp: new Date(Date.now() - 3500000), description: 'Inventory reserved from Indiranagar Hub' },
      { status: 'DELIVERY_PARTNER_ASSIGNED', timestamp: new Date(Date.now() - 3300000), description: 'Assigned to Vikram Singh' },
      { status: 'PICKED_UP', timestamp: new Date(Date.now() - 3000000), description: 'Picked up from dark store' },
      { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 2500000), description: 'Rider is on the way' },
      { status: 'DELIVERED', timestamp: new Date(Date.now() - 1500000), description: 'Delivered in 11 minutes' },
    ],
    deliveryPartnerId: partner1._id,
    deliveryPartnerName: partner1.name,
    estimatedDeliveryMinutes: 12,
  });

  await DeliveryModel.create({
    orderId: sampleOrder1._id,
    partnerId: partner1._id,
    partnerName: partner1.name,
    partnerPhone: partner1.phone,
    status: 'DELIVERED',
    estimatedDeliveryMinutes: 12,
    assignedAt: new Date(Date.now() - 3300000),
    deliveredAt: new Date(Date.now() - 1500000),
  });

  await OrderEventModel.create({
    orderId: sampleOrder1._id,
    eventType: 'order.confirmed',
    eventData: { total: 424, itemsCount: 2 },
    service: 'OrderService',
  });

  console.log('--- QuickCommerce Database Seeding Complete ---');
  console.log('Default Accounts:');
  console.log('Admin:    admin@quickcommerce.com    / Admin@123');
  console.log('Customer: customer@quickcommerce.com / Customer@123');
  console.log('Partner:  partner@quickcommerce.com  / Partner@123');
}

if (process.env.RUN_SEED !== 'false') {
  seedAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
