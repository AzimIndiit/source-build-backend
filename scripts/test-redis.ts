import { Redis } from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

async function testRedisConnection() {
  console.log('Testing Redis connection...\n');
  
  const redisUrl = process.env.REDIS_URL || 'redis://:redis123@localhost:6379';
  console.log(`Redis URL: ${redisUrl.replace(/:([^@]+)@/, ':****@')}`); // Hide password in logs
  
  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });

    // Test connection
    await redis.ping();
    console.log('✅ Redis connection successful!');
    
    // Test basic operations
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    console.log(`✅ Set/Get test successful: ${value}`);
    
    // Clean up
    await redis.del('test_key');
    
    // Get Redis info
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`✅ Redis version: ${versionMatch[1]}`);
    }
    
    await redis.quit();
    console.log('\n✅ All Redis tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure Redis is running: docker-compose up redis');
    console.log('2. Check if Redis password is correct in .env file');
    console.log('3. Verify Redis is accessible on localhost:6379');
    process.exit(1);
  }
}

testRedisConnection();