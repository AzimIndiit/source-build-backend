// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user/user.model.js';
import { UserRole } from '../models/user/user.types.js';

dotenv.config();

async function updateUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Find the first user (or specific user by email)
    const users = await User.find({}).limit(5);
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }

    console.log('\n📋 Found users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Role: ${user.role}`);
    });

    // Find a user to update or use existing seller
    const existingSeller = users.find(u => u.role === UserRole.SELLER);
    if (existingSeller) {
      console.log(`\n✅ Found existing seller: ${existingSeller.email}`);
      console.log('You can login with this account to access seller features.');
      process.exit(0);
    }

    // Update the first user to SELLER role
    const userToUpdate = users[0];
    userToUpdate.role = UserRole.SELLER;
    userToUpdate.businessName = 'Test Business'; // Required for sellers
    await userToUpdate.save();

    console.log(`\n✅ Updated user ${userToUpdate.email} to role: ${UserRole.SELLER}`);

    // Verify the update
    const updatedUser = await User.findById(userToUpdate._id);
    console.log(`📊 Verified - User role is now: ${updatedUser?.role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateUserRole();