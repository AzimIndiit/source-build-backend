import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OrderModal from '../models/order/index.js';
import UserModal from '../models/user/user.model.js';
import ProductModal from '../models/product/product.model.js';
import { OrderStatus } from '../models/order/order.types.js';
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
    "orderNumber": "ORD-2025-000123",
    "customer": {
    "userRef": "68b049fca8b97d6908f3730a",
    "reviewRef": {
    "rating": 5,
    "review": "Great service, fast delivery!",
    "reviewedAt": "2025-01-15T14:30:00Z"
    }
    },
    "driver": {
    "userRef": "68b04541d6c5decc192ca07e",
    "reviewRef": {
    "rating": 4,
    "review": "Professional driver",
    "reviewedAt": "2025-01-15T16:45:00Z"
    }
    },
    "products": [
    {
    "id": "prod-001",
    "title": "Wireless Bluetooth Headphones",
    "price": 79.99,
    "quantity": 2,
    "image": "https://example.com/headphones.jpg",
    "deliveryDate": "Jan 20, 2025",
    "productRef": "68b52e350d6cd821b01eac34",
    "seller": "68b194070447bcc0f74d5a37"
    },
    {
    "id": "prod-002",
    "title": "USB-C Charging Cable",
    "price": 15.99,
    "quantity": 3,
    "image": "https://example.com/cable.jpg",
    "deliveryDate": "Jan 20, 2025",
    "productRef": "68b52e350d6cd821b01eac34",
    "seller": "68b194070447bcc0f74d5a37"
    }
    ],
    "date": "Jan 15, 2025",
    "amount": 207.95,
    "orderSummary": {
    "shippingAddress": {
    "name": "John Doe",
    "phone": "+1234567890",
    "address": "123 Main Street, Apt 4B",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zip": "10001",
    "isDefault": true
    },
    "proofOfDelivery": "https://example.com/pod/ORD-2025-000123.jpg",
    "paymentMethod": {
    "type": "card",
    "cardType": "VISA",
    "cardNumber": "****4242",
    "method": "credit_card",
    "status": "completed",
    "transactionId": "txn_1a2b3c4d5e6f",
    "paidAt": "2025-01-15T10:30:00Z"
    },
    "subTotal": 207.95,
    "shippingFee": 9.99,
    "marketplaceFee": 2.08,
    "taxes": 18.72,
    "total": 238.74
    },
    "status": "Out for Delivery",
    "trackingHistory": [
    {
    "status": "Pending",
    "timestamp": "2025-01-15T10:00:00Z",
    "description": "Order placed"
    },
    {
    "status": "Processing",
    "timestamp": "2025-01-15T10:30:00Z",
    "description": "Payment confirmed, preparing order",
    "updatedBy": "507f1f77bcf86cd799439016"
    },
    {
    "status": "Out for Delivery",
    "timestamp": "2025-01-15T14:00:00Z",
    "location": "New York Distribution Center",
    "description": "Package picked up by driver",
    "updatedBy": "507f1f77bcf86cd799439012"
    }
    ],
    "deliveryInstructions": "Please leave package at front desk if not home",
    "estimatedDeliveryDate": "2025-01-20T17:00:00Z",
    "actualDeliveryDate": null,
    "cancelReason": null,
    "refundReason": null,
    "notes": "Customer requested gift wrapping",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
    }
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