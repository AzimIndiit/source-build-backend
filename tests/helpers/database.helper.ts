import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export class DatabaseTestHelper {
  private static mongoServer: MongoMemoryServer | null = null;

  /**
   * Connect to in-memory MongoDB
   */
  static async connect(): Promise<void> {
    if (this.mongoServer) {
      await this.disconnect();
    }

    this.mongoServer = await MongoMemoryServer.create();
    const mongoUri = this.mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      autoIndex: true
    });
  }

  /**
   * Disconnect from MongoDB and stop server
   */
  static async disconnect(): Promise<void> {
    await mongoose.disconnect();
    
    if (this.mongoServer) {
      await this.mongoServer.stop();
      this.mongoServer = null;
    }
  }

  /**
   * Clear all collections in database
   */
  static async clearDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }

  /**
   * Drop all collections in database
   */
  static async dropDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      await collections[key].drop();
    }
  }

  /**
   * Create indexes for all models
   */
  static async createIndexes(): Promise<void> {
    const models = mongoose.modelNames();
    
    for (const modelName of models) {
      await mongoose.model(modelName).createIndexes();
    }
  }

  /**
   * Seed database with test data
   */
  static async seedDatabase(data: {
    users?: any[];
    products?: any[];
    orders?: any[];
    [key: string]: any[];
  }): Promise<void> {
    for (const [modelName, documents] of Object.entries(data)) {
      if (documents && documents.length > 0) {
        const Model = mongoose.model(modelName.charAt(0).toUpperCase() + modelName.slice(1, -1));
        await Model.insertMany(documents);
      }
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<any> {
    const stats: any = {};
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      stats[key] = await collections[key].countDocuments();
    }
    
    return stats;
  }

  /**
   * Wait for database connection
   */
  static async waitForConnection(timeout = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Database connection timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Create a test transaction
   */
  static async withTransaction<T>(
    callback: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reset auto-increment counters (if using any)
   */
  static async resetCounters(): Promise<void> {
    const counterCollection = mongoose.connection.collection('counters');
    await counterCollection.deleteMany({});
  }
}