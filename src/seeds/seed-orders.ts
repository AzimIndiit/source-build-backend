import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OrderModal from '../models/order/index.js';
import UserModal from '../models/user/user.model.js';
import ProductModal from '../models/product/product.model.js';
import { OrderStatus } from '../models/order/order.types.js';
import logger from '../config/logger.js';
import readline from 'readline';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Seed data for orders
const orderSeedData = [
  {
    orderNumber: 'ORD-2024-001',
    customer: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 5,
        review: 'Excellent service! The product was delivered on time and in perfect condition.',
        reviewedAt: new Date('2024-12-11')
      }
    },
    driver: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 5,
        review: 'Professional driver, handled the delivery with care.',
        reviewedAt: new Date('2024-12-11')
      }
    },
    date: 'Dec 10, 2024',
    amount: 517,
    status: OrderStatus.DELIVERED,
    products: [
      {
        id: 'PROD-001',
        title: '(NEW) Westinghouse Chandelier Fixture Zaro 6 Light Iron',
        quantity: 2,
        price: 215,
        deliveryDate: '12 December 2024',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=128&h=96&fit=crop',
      },
    ],
    orderSummary: {
      shippingAddress: {
        name: 'Ethan Popa',
        phone: '+91 972 234 5678',
        address: 'SCO 50-51, Sub. City Center, 2nd Floor Sector 34A',
        city: 'Jakarta',
        state: 'Jakarta',
        country: 'India',
        zip: '160022',
      },
      proofOfDelivery: 'https://placehold.co/600x400',
      paymentMethod: {
        type: 'Credit Card',
        cardType: 'VISA',
        cardNumber: 'XXXX XXXX XXXX 8456',
        status: 'completed',
      },
      subTotal: 430,
      shippingFee: 10,
      marketplaceFee: 43,
      taxes: 34,
      total: 517,
    },
    actualDeliveryDate: new Date('2024-12-10'),
  },
  {
    orderNumber: 'ORD-2024-002',
    customer: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 4,
        review: 'Good experience overall. The product quality was excellent.',
        reviewedAt: new Date('2024-02-15')
      }
    },
    driver: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 4,
        review: 'Driver was professional and courteous.',
        reviewedAt: new Date('2024-02-15')
      }
    },
    date: 'Feb 13, 2024',
    amount: 636,
    status: OrderStatus.PROCESSING,
    products: [
      {
        id: 'PROD-002',
        title: 'Modern Floor Lamp with Adjustable Head',
        quantity: 1,
        price: 189,
        deliveryDate: '15 February 2024',
        image: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=128&h=96&fit=crop',
      },
      {
        id: 'PROD-003',
        title: 'LED Desk Lamp with USB Charging',
        quantity: 2,
        price: 169,
        deliveryDate: '15 February 2024',
        image: 'https://images.unsplash.com/photo-1507494924047-60b8ee826ca9?w=128&h=96&fit=crop',
      },
    ],
    orderSummary: {
      shippingAddress: {
        name: 'Ashley Jackson',
        phone: '+1 555 123 4567',
        address: '123 Main Street, Apt 4B',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zip: '10001',
      },
      paymentMethod: {
        type: 'Credit Card',
        cardType: 'MASTERCARD',
        cardNumber: 'XXXX XXXX XXXX 1234',
        status: 'pending',
      },
      subTotal: 527,
      shippingFee: 15,
      marketplaceFee: 52,
      taxes: 42,
      total: 636,
    },
    estimatedDeliveryDate: new Date('2024-02-20'),
  },
  {
    orderNumber: 'ORD-2024-003',
    customer: {
      // userRef will be added dynamically
    },
    date: 'Jul 28, 2024',
    amount: 700,
    status: OrderStatus.PENDING,
    products: [
      {
        id: 'PROD-004',
        title: 'Vintage Table Lamp Set (2 pieces)',
        quantity: 1,
        price: 577,
        deliveryDate: '30 July 2024',
        image: 'https://images.unsplash.com/photo-1565636572781-62e93e8c5c7e?w=128&h=96&fit=crop',
      },
    ],
    orderSummary: {
      shippingAddress: {
        name: 'Aya Rossi',
        phone: '+39 333 456 7890',
        address: 'Via Roma 123',
        city: 'Milan',
        state: 'Lombardy',
        country: 'Italy',
        zip: '20121',
      },
      paymentMethod: {
        type: 'PayPal',
        cardNumber: 'aya.rossi@gmail.com',
        status: 'pending',
      },
      subTotal: 577,
      shippingFee: 20,
      marketplaceFee: 57,
      taxes: 46,
      total: 700,
    },
    estimatedDeliveryDate: new Date('2024-08-05'),
  },
  {
    orderNumber: 'ORD-2024-004',
    customer: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 5,
        review: 'Outstanding service! Everything was perfect from order to delivery.',
        reviewedAt: new Date('2024-05-05')
      }
    },
    driver: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 5,
        review: 'Very friendly and professional. Highly recommended!',
        reviewedAt: new Date('2024-05-05')
      }
    },
    date: 'May 2, 2024',
    amount: 992,
    status: OrderStatus.OUT_FOR_DELIVERY,
    products: [
      {
        id: 'PROD-005',
        title: 'Industrial Style Pendant Light',
        quantity: 3,
        price: 245,
        deliveryDate: '5 May 2024',
        image: 'https://images.unsplash.com/photo-1565636572781-62e93e8c5c7e?w=128&h=96&fit=crop',
      },
      {
        id: 'PROD-006',
        title: 'Smart LED Bulb Set (4 pack)',
        quantity: 2,
        price: 42.5,
        deliveryDate: '5 May 2024',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=128&h=96&fit=crop',
      },
    ],
    orderSummary: {
      shippingAddress: {
        name: 'Mehdi Keita',
        phone: '+33 6 12 34 56 78',
        address: '45 Rue de la République',
        city: 'Paris',
        state: 'Île-de-France',
        country: 'France',
        zip: '75001',
      },
      paymentMethod: {
        type: 'Credit Card',
        cardType: 'AMEX',
        cardNumber: 'XXXX XXXX XXXX 9876',
        status: 'completed',
      },
      subTotal: 820,
      shippingFee: 25,
      marketplaceFee: 82,
      taxes: 65,
      total: 992,
    },
    estimatedDeliveryDate: new Date('2024-05-03'),
  },
  {
    orderNumber: 'ORD-2024-005',
    customer: {
      // userRef will be added dynamically
      reviewRef: {
        rating: 3,
        review: 'Delivery was slightly delayed but product quality was good.',
        reviewedAt: new Date('2024-04-30')
      }
    },
    date: 'Apr 27, 2024',
    amount: 251,
    status: OrderStatus.CANCELLED,
    cancelReason: 'Customer requested cancellation due to change of plans',
    products: [
      {
        id: 'PROD-007',
        title: 'Minimalist Table Lamp',
        quantity: 1,
        price: 207,
        deliveryDate: '30 April 2024',
        image: 'https://images.unsplash.com/photo-1507494924047-60b8ee826ca9?w=128&h=96&fit=crop',
      },
    ],
    orderSummary: {
      shippingAddress: {
        name: 'Luis González',
        phone: '+34 612 345 678',
        address: 'Calle Mayor 15, 3º B',
        city: 'Madrid',
        state: 'Madrid',
        country: 'Spain',
        zip: '28013',
      },
      paymentMethod: {
        type: 'Debit Card',
        cardType: 'VISA',
        cardNumber: 'XXXX XXXX XXXX 5555',
        status: 'refunded',
      },
      subTotal: 207,
      shippingFee: 8,
      marketplaceFee: 20,
      taxes: 16,
      total: 251,
    },
  },
];

async function seedOrders() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/source-build', {
      // No need for useNewUrlParser and useUnifiedTopology in Mongoose 6+
    });
    console.log('✅ Connected to MongoDB successfully');

    // Check if we should clear existing orders
    const existingOrders = await OrderModal.countDocuments();
    if (existingOrders > 0) {
      console.log(`\n⚠️  Found ${existingOrders} existing orders in the database.`);
      
      const shouldContinue = await new Promise<boolean>((resolve) => {
        rl.question('Do you want to delete existing orders and insert new ones? (yes/no): ', (answer) => {
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
      });

      if (!shouldContinue) {
        console.log('❌ Seeding cancelled by user');
        rl.close();
        process.exit(0);
      }

      console.log('🗑️  Deleting existing orders...');
      await OrderModal.deleteMany({});
      console.log('✅ Existing orders deleted');
    }

    // Get some users and products from the database to use as references
    console.log('\n📦 Fetching existing users and products...');
    const [users, products] = await Promise.all([
      UserModal.find().limit(10),
      ProductModal.find().limit(10),
    ]);

    if (users.length === 0) {
      console.log('⚠️  No users found in database. Creating default user references...');
      // Create dummy users if none exist
      const dummyUsers = [];
      for (let i = 0; i < 5; i++) {
        const user = await UserModal.create({
          firstName: `User${i + 1}`,
          lastName: `Test`,
          email: `user${i + 1}@test.com`,
          password: 'password123',
          role: i === 0 ? 'seller' : i === 1 ? 'driver' : 'buyer',
        });
        dummyUsers.push(user);
      }
      users.push(...dummyUsers);
      console.log('✅ Created dummy users for testing');
    }

    // Insert seed orders
    console.log('\n🌱 Seeding orders...');
    const seededOrders = [];

    for (let i = 0; i < orderSeedData.length; i++) {
      const orderData: any = { ...orderSeedData[i] };
      
      // Add userRef to customer
      const customerUser = users[i % users.length];
      if (customerUser) {
        orderData.customer.userRef = customerUser._id;
      } else {
        orderData.customer.userRef = new mongoose.Types.ObjectId();
      }
      
      // Add userRef to driver if driver exists
      if (orderData.driver) {
        const driverUser = users[(i + 1) % users.length];
        if (driverUser) {
          orderData.driver.userRef = driverUser._id;
        } else {
          orderData.driver.userRef = new mongoose.Types.ObjectId();
        }
      }

      // If we have products, add productRef to products
      if (products.length > 0) {
        orderData.products = orderData.products.map((product: any, idx: number) => {
          const randomProduct = products[(i + idx) % products.length];
          if (randomProduct) {
            return {
              ...product,
              productRef: randomProduct._id,
              seller: randomProduct.seller,
            };
          }
          return product;
        });
      }

      const order = await OrderModal.create(orderData);
      seededOrders.push(order);
      console.log(`  ✅ Order ${i + 1}: ${order.orderNumber} - Status: ${order.status}`);
    }

    console.log(`\n🎉 Successfully seeded ${seededOrders.length} orders!`);
    
    // Display summary
    const summary = await OrderModal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    console.log('\n📊 Order Summary:');
    console.log('================');
    summary.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} orders - Total: $${stat.totalAmount.toFixed(2)}`);
    });

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    rl.close();
    process.exit(1);
  }
}

// Ask for confirmation before running
console.log('🚀 Order Seeding Script');
console.log('======================');
console.log('This script will seed order data into your MongoDB database.');
console.log(`Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/source-build'}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

rl.question('Do you want to proceed with seeding orders? (yes/no): ', async (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    await seedOrders();
  } else {
    console.log('❌ Seeding cancelled by user');
    rl.close();
    process.exit(0);
  }
});