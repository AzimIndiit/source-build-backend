// MongoDB initialization script for Docker container
// This script runs when the MongoDB container starts for the first time

// Switch to the sourcebuild database
db = db.getSiblingDB('sourcebuild');

// Create application user with read/write permissions
db.createUser({
  user: 'appuser',
  pwd: 'apppassword',
  roles: [
    {
      role: 'readWrite',
      db: 'sourcebuild'
    }
  ]
});

// Create indexes for better performance
print('Creating indexes...');

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ 'profile.socialAccounts.provider': 1, 'profile.socialAccounts.providerId': 1 });

// Products collection indexes (future use)
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ category: 1 });
db.products.createIndex({ seller: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ createdAt: -1 });
db.products.createIndex({ status: 1 });

// Orders collection indexes (future use)
db.orders.createIndex({ buyer: 1 });
db.orders.createIndex({ seller: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

// Sessions collection for session management
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('Database initialization completed successfully!');
print('Application user created with credentials:');
print('  Username: appuser');
print('  Password: apppassword');
print('  Database: sourcebuild');
print('Indexes created for optimal performance.');