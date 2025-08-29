import mongoose from 'mongoose';
import chalk from 'chalk';
import config from './index.js';

// MongoDB connection options
const mongoOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  retryWrites: true,
  retryReads: true,
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 1000,
  },
};

/**
 * Connect to MongoDB database
 */
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, mongoOptions);
    
    console.log(`  ${chalk.green('✅ MongoDB Connected:')} ${chalk.cyan(config.MONGODB_URI)}`);
    console.log(`  ${chalk.green('📊 Database Name:')} ${chalk.cyan(conn.connection.name)}\n`);
    
    // Connection event listeners (silent in production)
    if (config.NODE_ENV === 'development') {
      mongoose.connection.on('connected', () => {
        console.log(chalk.dim('  📡 Mongoose connected to MongoDB'));
      });

      mongoose.connection.on('error', (err) => {
        console.error(chalk.red('  ❌ MongoDB connection error:'), err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log(chalk.yellow('  📴 Mongoose disconnected from MongoDB'));
      });
    }

    // Remove SIGINT handler here as it's handled in server.ts
    // to avoid duplicate handlers
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Check if database connection is ready
 */
export const isDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection status
 */
export const getDBConnectionStatus = (): string => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

/**
 * Get database statistics
 */
export const getDBStats = async (): Promise<any> => {
  try {
    if (!isDBConnected()) {
      throw new Error('Database not connected');
    }
    
    const admin = mongoose.connection.db.admin();
    const stats = await admin.serverStatus();
    
    return {
      version: stats.version,
      uptime: stats.uptime,
      connections: stats.connections,
      network: stats.network,
      memory: stats.mem,
    };
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    throw error;
  }
};

// Export mongoose instance for direct access if needed
export { mongoose };

export default {
  connectDB,
  disconnectDB,
  isDBConnected,
  getDBConnectionStatus,
  getDBStats,
  mongoose,
};